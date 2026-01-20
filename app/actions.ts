"use server"

import { prisma } from "@/lib/prisma"
import { Role, TransactionType, CampoutStatus, ScoutStatus, CampoutAdultRole } from "@prisma/client"
import { z } from "zod"
import bcrypt from "bcryptjs"
import { auth, signIn } from "@/auth"
import { Resend } from "resend"
import { AuthError } from "next-auth"
import { Decimal } from "decimal.js"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

// Initialize Resend (requires env var RESEND_API_KEY)
const resendApiKey = process.env.RESEND_API_KEY
if (!resendApiKey) {
    console.error("CRITICAL: RESEND_API_KEY environment variable is not set")
}
const resend = resendApiKey ? new Resend(resendApiKey) : null

const createUserSchema = z.object({
    email: z.string().email(),
    name: z.string().min(1),
    role: z.nativeEnum(Role),
})

const acceptInvitationSchema = z.object({
    token: z.string().min(1, "Invalid token"),
    password: z.string()
        .min(12, "Password must be at least 12 characters")
        .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
        .regex(/[a-z]/, "Password must contain at least one lowercase letter")
        .regex(/[0-9]/, "Password must contain at least one number")
        .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
    confirmPassword: z.string().min(12, "Confirm password must be at least 12 characters"),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
})

export async function createUser(prevState: any, formData: FormData) {
    const session = await auth()

    // Check authorization (Admin only)
    if (!session || session.user.role !== "ADMIN") {
        return { error: "Unauthorized: Admins only" }
    }

    const email = formData.get("email") as string

    // Rate limiting
    const { rateLimiter, RATE_LIMITS } = await import("@/lib/rate-limiter")
    if (rateLimiter.isRateLimited(`user-creation-${session.user.id}`, RATE_LIMITS.USER_CREATION.maxAttempts, RATE_LIMITS.USER_CREATION.windowMs)) {
        return { error: "Too many user creation attempts. Please try again later." }
    }

    const validatedFields = createUserSchema.safeParse({
        email: formData.get("email"),
        name: formData.get("name"),
        role: formData.get("role"),
    })

    if (!validatedFields.success) {
        return { error: "Invalid fields", issues: validatedFields.error.flatten() }
    }

    const { name, role } = validatedFields.data

    try {
        // Check if user exists
        const existingUser = await prisma.user.findUnique({ where: { email } })
        if (existingUser) {
            return { error: "User already exists" }
        }

        // Generate Invitation Token (Expires in 48 hours)
        const invitationToken = crypto.randomUUID()
        const invitationExpires = new Date(Date.now() + 48 * 60 * 60 * 1000) // 48 hours

        const newUser = await prisma.user.create({
            data: {
                email,
                name,
                role,
                invitationToken,
                invitationExpires,
            }
        })

        // Auto-create Scout record if role is SCOUT
        if (role === 'SCOUT') {
            await prisma.scout.create({
                data: {
                    name,
                    status: 'ACTIVE',
                    userId: newUser.id // Link immediately
                }
            })
            revalidatePath("/dashboard/scouts")
        }

        // Fetch Troop Settings for Email
        const troopSettings = await prisma.troopSettings.findFirst()
        const troopName = troopSettings?.name || "TroopTreasury"

        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

        // Send email via Resend
        const inviteUrl = `${appUrl}/invite?token=${invitationToken}`

        console.log(`Sending invite to ${email} with url: ${inviteUrl}`)

        if (!resend) {
            console.error("Email service not configured - RESEND_API_KEY missing")
            // Still create user but warn that email wasn't sent
            revalidatePath("/dashboard/users")
            return { success: true, message: "User created but invitation email could not be sent (email service not configured)" }
        }

        const data = await resend.emails.send({
            from: 'TroopTreasury <onboarding@vpillai.online>', // Update this if user has domain
            to: email,
            subject: `Welcome to ${troopName} - Complete Setup`,
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                    <h1>${troopName}</h1>
                    <p>Hello ${name},</p>
                    <p>An account has been created for you on <strong>${troopName}</strong>.</p>
                    <p>Please click the link below to set your password and activate your account:</p>
                    <p style="margin: 20px 0;">
                        <a href="${inviteUrl}" style="background-color: #0070f3; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
                            Accept Invitation & Set Password
                        </a>
                    </p>
                    <p style="color: #666; font-size: 14px;">This link will expire in 48 hours.</p>
                </div>
            `
        })

        if (data.error) {
            console.error("Resend API Error:", data.error)
            // We don't fail the user creation, but we log it.
            // Maybe we should return a warning?
        } else {
            console.log("Email sent successfully:", data.data?.id)
        }

        revalidatePath("/dashboard/users")
        return { success: true, message: "Invitation sent successfully" }

    } catch (error) {
        console.error("Create User Error:", error)
        return { error: "Failed to create user" }
    }
}



export async function acceptInvitation(prevState: any, formData: FormData) {
    const rawData = {
        token: formData.get("token"),
        password: formData.get("password"),
        confirmPassword: formData.get("confirmPassword"),
    }

    const validatedFields = acceptInvitationSchema.safeParse(rawData)

    if (!validatedFields.success) {
        return { error: "Invalid fields", issues: validatedFields.error.flatten() }
    }

    const { token, password } = validatedFields.data
    console.log(`[AUTH-DEBUG] acceptInvitation called with token: ${token}`);

    try {
        const user = await prisma.user.findUnique({
            where: { invitationToken: token }
        })

        if (!user) {
            console.log(`[AUTH-DEBUG] User NOT found for token: ${token}`);
            return { error: "Invalid or expired invitation token" }
        }

        if (!user.invitationExpires || user.invitationExpires < new Date()) {
            console.log(`[AUTH-DEBUG] Token EXPIRED for user: ${user.email}, expires at: ${user.invitationExpires}`);
            return { error: "Invalid or expired invitation token" }
        }

        console.log(`[AUTH-DEBUG] Token Valid for user: ${user.email}`);

        const hashedPassword = await bcrypt.hash(password, 10)

        await prisma.user.update({
            where: { id: user.id },
            data: {
                passwordHash: hashedPassword,
                invitationToken: null,
                invitationExpires: null,
                isActive: true, // Ensure they are active upon acceptance
            }
        })

        return { success: true, message: "Password set successfully" }
    } catch (error) {
        console.error("Accept Invitation Error:", error)
        return { error: "Failed to set password" }
    }
}
export async function authenticate(
    prevState: string | undefined,
    formData: FormData
) {
    try {
        const email = formData.get("email") as string
        const password = formData.get("password") as string

        // Import rate limiter dynamically
        const { rateLimiter, RATE_LIMITS } = await import("@/lib/rate-limiter")

        // Check rate limit
        if (rateLimiter.isRateLimited(email, RATE_LIMITS.LOGIN.maxAttempts, RATE_LIMITS.LOGIN.windowMs)) {
            const resetTime = rateLimiter.getResetTime(email)
            return `Too many login attempts. Please try again in ${Math.ceil(resetTime / 60)} minutes.`
        }

        // Explicitly pass credentials and redirectTo
        await signIn("credentials", {
            email,
            password,
            redirectTo: "/dashboard"
        })

    } catch (error: any) {
        if (error instanceof AuthError) {
            switch (error.type) {
                case "CredentialsSignin":
                    return "Invalid credentials."
                default:
                    return "Something went wrong."
            }
        }
        // Very important: Next.js redirect() and signIn() work by throwing an error.
        // We MUST rethrow it so Next.js can handle the redirection.
        throw error
    }
}

const transactionSchema = z.object({
    amount: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, "Amount must be positive"),
    type: z.nativeEnum(TransactionType),
    description: z.string().min(1, "Description is required"),
    date: z.string(), // ISO string from date picker
    scoutId: z.string().optional(),
    campoutId: z.string().optional(),
})

export async function createTransaction(prevState: any, formData: FormData) {
    const session = await auth()
    if (!session || !["ADMIN", "FINANCIER", "PARENT"].includes(session.user.role)) {
        return { error: "Unauthorized" }
    }

    // Parent security check
    const scoutId = formData.get("scoutId") as string

    if (session.user.role === 'PARENT') {
        if (!scoutId) {
            return { error: "Parents must select a scout." }
        }
        // Verify ownership
        const isLinked = await prisma.parentScout.findUnique({
            where: {
                parentId_scoutId: {
                    parentId: session.user.id,
                    scoutId: scoutId
                }
            }
        })
        if (!isLinked) {
            return { error: "You are not authorized to manage this scout." }
        }
    }

    const rawData = {
        amount: formData.get("amount"),
        type: formData.get("type"),
        description: formData.get("description"),
        date: formData.get("date"),
        scoutId: scoutId || undefined,
        campoutId: formData.get("campoutId") || undefined,
    }

    const validatedFields = transactionSchema.safeParse(rawData)

    if (!validatedFields.success) {
        return { error: "Invalid fields", issues: validatedFields.error.flatten() }
    }

    const { amount, type, description: desc, date: txDate, scoutId: validatedScoutId, campoutId } = validatedFields.data

    try {
        await prisma.transaction.create({
            data: {
                amount: new Decimal(amount),
                type,
                description: desc,
                createdAt: new Date(txDate),
                scoutId: validatedScoutId || null,
                campoutId: campoutId || null,
                approvedBy: ["ADMIN", "FINANCIER"].includes(session.user.role) ? session.user.id : null,
                status: ["ADMIN", "FINANCIER"].includes(session.user.role) ? "APPROVED" : "PENDING",
            }
        })

        revalidatePath("/dashboard")
        revalidatePath("/dashboard/transactions")
        return { success: true, message: "Transaction recorded" }
    } catch (error) {
        console.error("Transaction Create Error:", error)
        return { error: "Failed to create transaction" }
    }
}

const campoutSchema = z.object({
    name: z.string().min(1, "Name is required"),
    location: z.string().min(1, "Location is required"),
    startDate: z.string(),
    endDate: z.string(),
    costEstimate: z.string().refine((val) => !isNaN(Number(val)) && Number(val) >= 0, "Cost must be a positive number"),
})

export async function createCampout(prevState: any, formData: FormData) {
    const session = await auth()
    if (!session || !["ADMIN", "FINANCIER", "LEADER"].includes(session.user.role)) {
        return { error: "Unauthorized" }
    }

    const rawData = {
        name: formData.get("name"),
        location: formData.get("location"),
        startDate: formData.get("startDate"),
        endDate: formData.get("endDate"),
        costEstimate: formData.get("costEstimate"),
    }

    const validatedFields = campoutSchema.safeParse(rawData)

    if (!validatedFields.success) {
        return { error: "Invalid fields", issues: validatedFields.error.flatten() }
    }

    const { name, location, startDate, endDate, costEstimate } = validatedFields.data

    try {
        await prisma.campout.create({
            data: {
                name,
                location,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                estimatedCost: new Decimal(costEstimate),
                status: CampoutStatus.OPEN,
            }
        })

        revalidatePath("/dashboard/campouts")
        return { success: true, message: "Campout created successfully" }
    } catch (error) {
        console.error("Campout Create Error:", error)
        return { error: "Failed to create campout" }
    }
}

const scoutSchema = z.object({
    name: z.string().min(1, "Name is required"),
    age: z.string().optional(),
    status: z.nativeEnum(ScoutStatus),
})

export async function createScout(prevState: any, formData: FormData) {
    const session = await auth()
    if (!session || !["ADMIN", "FINANCIER", "LEADER"].includes(session.user.role)) {
        return { error: "Unauthorized" }
    }

    const rawData = {
        name: formData.get("name"),
        age: formData.get("age"),
        status: formData.get("status"),
    }

    const validatedFields = scoutSchema.safeParse(rawData)

    if (!validatedFields.success) {
        console.error("Scout Validation Error:", validatedFields.error.flatten())
        return { error: "Invalid fields", issues: validatedFields.error.flatten() }
    }

    const { name, age, status } = validatedFields.data

    try {
        await prisma.scout.create({
            data: {
                name,
                age: age ? parseInt(age) : null,
                status,
                ibaBalance: new Decimal(0),
            }
        })

        revalidatePath("/dashboard/scouts")
        return { success: true, message: "Scout added successfully" }
    } catch (error) {
        console.error("Scout Create Error:", error)
        return { error: "Failed to create scout" }
    }
}

export async function registerScoutForCampout(campoutId: string, scoutId: string) {
    const session = await auth()
    if (!session) return { error: "Unauthorized" }

    // If Parent, verify ownership
    if (session.user.role === 'PARENT') {
        const isLinked = await prisma.parentScout.findUnique({
            where: {
                parentId_scoutId: {
                    parentId: session.user.id,
                    scoutId: scoutId
                }
            }
        })
        if (!isLinked) return { error: "Unauthorized: You can only register your own scouts." }
    } else if (!["ADMIN", "FINANCIER", "LEADER"].includes(session.user.role)) {
        return { error: "Unauthorized" }
    }

    try {
        await prisma.campoutScout.create({
            data: {
                campoutId,
                scoutId,
            }
        })
        revalidatePath(`/dashboard/campouts/${campoutId}`)
        return { success: true, message: "Scout registered" }
    } catch (error) {
        console.error("Registration Error:", error)
        return { error: "Failed to register scout (may already be registered)" }
    }
}

const changePasswordSchema = z.object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string()
        .min(12, "Password must be at least 12 characters")
        .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
        .regex(/[a-z]/, "Password must contain at least one lowercase letter")
        .regex(/[0-9]/, "Password must contain at least one number")
        .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
    confirmPassword: z.string().min(12, "Confirm password must be at least 12 characters"),
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
})

export async function changePassword(prevState: any, formData: FormData) {
    const session = await auth()
    if (!session || !session.user?.email) {
        return { error: "Unauthorized" }
    }

    const rawData = {
        currentPassword: formData.get("currentPassword"),
        newPassword: formData.get("newPassword"),
        confirmPassword: formData.get("confirmPassword"),
    }

    const validatedFields = changePasswordSchema.safeParse(rawData)

    if (!validatedFields.success) {
        return { error: "Invalid fields", issues: validatedFields.error.flatten() }
    }

    const { currentPassword, newPassword } = validatedFields.data

    try {
        const user = await prisma.user.findUnique({
            where: { email: session.user.email }
        })

        if (!user || !user.passwordHash) {
            return { error: "User not found or invalid state" }
        }

        const passwordsMatch = await bcrypt.compare(currentPassword, user.passwordHash)

        if (!passwordsMatch) {
            return { error: "Incorrect current password" }
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10)

        await prisma.user.update({
            where: { email: session.user.email },
            data: { passwordHash: hashedPassword }
        })

        return { success: true, message: "Password updated successfully" }
    } catch (error) {
        console.error("Change Password Error:", error)
        return { error: "Failed to update password" }
    }
}

const setupAdminSchema = z.object({
    email: z.string().email(),
    name: z.string().min(1, "Name is required"),
    password: z.string()
        .min(12, "Password must be at least 12 characters")
        .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
        .regex(/[a-z]/, "Password must contain at least one lowercase letter")
        .regex(/[0-9]/, "Password must contain at least one number")
        .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
})

export async function setupInitialAdmin(prevState: any, formData: FormData) {
    try {
        const userCount = await prisma.user.count()
        if (userCount > 0) {
            return { error: "Setup already completed. Please login." }
        }

        const rawData = {
            email: formData.get("email"),
            name: formData.get("name"),
            password: formData.get("password"),
        }

        const validatedFields = setupAdminSchema.safeParse(rawData)

        if (!validatedFields.success) {
            return { error: "Invalid fields", issues: validatedFields.error.flatten() }
        }

        const { email, name, password } = validatedFields.data
        const hashedPassword = await bcrypt.hash(password, 10)

        await prisma.user.create({
            data: {
                email,
                name,
                passwordHash: hashedPassword,
                role: "ADMIN",
            }
        })

        return { success: true, message: "Admin created successfully" }
    } catch (error) {
        console.error("Setup Error:", error)
        return { error: `Failed to create admin user: ${error instanceof Error ? error.message : "Unknown error"}` }
    }
}

const updateUserSchema = z.object({
    userId: z.string().min(1, "User ID is required"),
    name: z.string().min(1, "Name is required"),
    role: z.nativeEnum(Role),
    scoutId: z.string().optional(), // For manual linking
})

export async function updateUser(prevState: any, formData: FormData) {
    const session = await auth()
    if (!session || session.user.role !== "ADMIN") {
        return { error: "Unauthorized" }
    }

    const rawData = {
        userId: formData.get("userId"),
        name: formData.get("name"),
        role: formData.get("role"),
        scoutId: formData.get("scoutId") || undefined,
    }

    const validatedFields = updateUserSchema.safeParse(rawData)

    if (!validatedFields.success) {
        return { error: "Invalid fields", issues: validatedFields.error.flatten() }
    }

    const { userId, name, role, scoutId } = validatedFields.data

    try {
        // Fetch existing user to check for linking
        const existingUser = await prisma.user.findUnique({
            where: { id: userId },
            include: { scout: true }
        })

        if (!existingUser) return { error: "User not found" }

        await prisma.$transaction(async (tx) => {
            // Update User
            await tx.user.update({
                where: { id: userId },
                data: { name, role }
            })

            // Sync or Link Scout
            if (role === 'SCOUT') {
                if (scoutId) {
                    // Manual Link Requested
                    const targetScout = await tx.scout.findUnique({ where: { id: scoutId } })
                    if (targetScout) {
                        // Unlink previous scout if any?
                        if (existingUser.scout && existingUser.scout.id !== scoutId) {
                            await tx.scout.update({
                                where: { id: existingUser.scout.id },
                                data: { userId: null }
                            })
                        }
                        // Link new scout
                        await tx.scout.update({
                            where: { id: scoutId },
                            data: { userId: userId, name: name } // Force name sync
                        })
                    }
                } else if (existingUser.scout) {
                    // Already linked, maintain link and update name
                    await tx.scout.update({
                        where: { id: existingUser.scout.id },
                        data: { name }
                    })
                } else {
                    // Not linked. Try auto-link by name (Legacy fallback)
                    const potentialScout = await tx.scout.findFirst({
                        where: { name: existingUser.name || "", userId: null }
                    })

                    if (potentialScout) {
                        await tx.scout.update({
                            where: { id: potentialScout.id },
                            data: { userId: userId, name: name }
                        })
                    }
                }
            } else {
                // If role changed FROM Scout, unlink?
                if (existingUser.scout) {
                    await tx.scout.update({
                        where: { id: existingUser.scout.id },
                        data: { userId: null }
                    })
                }
            }
        })

        revalidatePath("/dashboard/users")
        revalidatePath("/dashboard/scouts") // Refresh roster too
        return { success: true, message: "User updated successfully" }
    } catch (error) {
        console.error("User Update Error:", error)
        return { error: "Failed to update user" }
    }
}

export async function linkParentToScout(parentId: string, scoutId: string) {
    const session = await auth()
    if (!session || session.user.role !== "ADMIN") {
        return { error: "Unauthorized" }
    }

    try {
        await prisma.parentScout.create({
            data: {
                parentId,
                scoutId,
            }
        })
        revalidatePath("/dashboard/users")
        return { success: true, message: "Parent linked to scout" }
    } catch (error) {
        console.error("Link Error:", error)
        return { error: "Failed to link (may already be linked)" }
    }
}

export async function unlinkParentFromScout(parentId: string, scoutId: string) {
    const session = await auth()
    if (!session || session.user.role !== "ADMIN") {
        return { error: "Unauthorized" }
    }

    try {
        await prisma.parentScout.delete({
            where: {
                parentId_scoutId: {
                    parentId,
                    scoutId,
                }
            }
        })
        revalidatePath("/dashboard/users")
        return { success: true, message: "Parent unlinked from scout" }
    } catch (error) {
        console.error("Unlink Error:", error)
        return { error: "Failed to unlink" }
    }
}

export async function toggleUserStatus(userId: string, shouldDeactivate: boolean) {
    const session = await auth()
    if (!session || session.user.role !== "ADMIN") {
        return { error: "Unauthorized" }
    }

    try {
        await prisma.user.update({
            where: { id: userId },
            data: {
                isActive: !shouldDeactivate,
                deactivatedAt: shouldDeactivate ? new Date() : null
            }
        })
        revalidatePath("/dashboard/users")
        return { success: true, message: `User ${shouldDeactivate ? 'deactivated' : 'activated'}` }
    } catch (error) {
        console.error("Toggle Status Error:", error)
        return { error: "Failed to update status" }
    }
}

const troopSettingsSchema = z.object({
    name: z.string().min(1, "Troop name is required"),
    council: z.string().optional(),
    district: z.string().optional(),
    address: z.string().optional(),
    sessionTimeoutMinutes: z.string().refine((val) => {
        const num = Number(val)
        return !isNaN(num) && num >= 5 && num <= 1440
    }, "Session timeout must be between 5 and 1440 minutes"),
    annualDuesAmount: z.string().refine(val => !isNaN(Number(val)), "Invalid amount"),
})

export async function updateTroopSettings(prevState: any, formData: FormData) {
    const session = await auth()
    if (!session || session.user.role !== "ADMIN") {
        return { error: "Unauthorized" }
    }

    const rawData = {
        name: formData.get("name"),
        council: formData.get("council"),
        district: formData.get("district"),
        address: formData.get("address"),
        sessionTimeoutMinutes: formData.get("sessionTimeoutMinutes"),
        annualDuesAmount: formData.get("annualDuesAmount") !== null ? formData.get("annualDuesAmount") : "150",
    }

    console.log("Saving Troop Settings. Raw Dues:", rawData.annualDuesAmount)

    const validatedFields = troopSettingsSchema.safeParse(rawData)

    if (!validatedFields.success) {
        return { error: "Invalid fields", issues: validatedFields.error.flatten() }
    }

    const { name, council, district, address, sessionTimeoutMinutes, annualDuesAmount } = validatedFields.data

    try {
        // Upsert: Create if not exists, update if exists. We assume only one row.
        // But since we don't have a singleton ID, we findFirst.
        const existing = await prisma.troopSettings.findFirst()

        if (existing) {
            await prisma.troopSettings.update({
                where: { id: existing.id },
                data: {
                    name,
                    council,
                    district,
                    address,
                    sessionTimeoutMinutes: parseInt(sessionTimeoutMinutes),
                    annualDuesAmount: new Decimal(annualDuesAmount)
                }
            })
        } else {
            await prisma.troopSettings.create({
                data: {
                    name,
                    council,
                    district,
                    address,
                    sessionTimeoutMinutes: parseInt(sessionTimeoutMinutes),
                    annualDuesAmount: new Decimal(annualDuesAmount)
                }
            })
        }

        revalidatePath("/dashboard")
        revalidatePath("/dashboard/settings")
        revalidatePath("/dashboard/finance/dues")
    } catch (error) {
        console.error("Troop Settings Error:", error)
        return { error: "Failed to save settings" }
    }

    redirect("/dashboard/settings")
}

export async function updateRolePermissions(prevState: any, formData: FormData) {
    const session = await auth()
    if (!session || session.user.role !== "ADMIN") {
        return { error: "Unauthorized" }
    }

    try {
        const permissionsJson = formData.get("permissions") as string
        const permissions = JSON.parse(permissionsJson)

        // Validate structure? assume valid for now from trusted UI.

        const existing = await prisma.troopSettings.findFirst()
        if (existing) {
            await prisma.troopSettings.update({
                where: { id: existing.id },
                data: { rolePermissions: permissions }
            })
        }

        revalidatePath("/dashboard", "layout")
        return { success: true, message: "Permissions updated" }

    } catch (error) {
        console.error("RBAC Update Error:", error)
        return { error: "Failed to update permissions" }
    }
}


export async function assignAdultToCampout(campoutId: string, adultId: string, role: "ORGANIZER" | "ATTENDEE" = "ORGANIZER") {
    const session = await auth()
    if (!session || !["ADMIN", "FINANCIER", "LEADER"].includes(session.user.role)) {
        return { error: "Unauthorized" }
    }

    try {
        await prisma.campoutAdult.upsert({
            where: {
                campoutId_adultId_role: {
                    campoutId,
                    adultId,
                    role: role as CampoutAdultRole
                }
            },
            update: {},
            create: {
                campoutId,
                adultId,
                role: role as CampoutAdultRole
            }
        })
        revalidatePath(`/dashboard/campouts/${campoutId}`)
        return { success: true, message: "Adult assigned" }
    } catch (error: any) {
        console.error("Assign Adult Error:", error)
        return { error: error.message || "Failed to assign adult" }
    }
}

export async function recordAdultPayment(campoutId: string, adultId: string, amount: string) {
    const session = await auth()
    if (!session || !["ADMIN", "FINANCIER", "LEADER"].includes(session.user.role)) {
        return { error: "Unauthorized" }
    }

    try {
        const paymentAmount = new Decimal(amount)
        if (paymentAmount.lte(0)) throw new Error("Invalid amount")

        await prisma.transaction.create({
            data: {
                type: "EVENT_PAYMENT", // Or generic INCOME? Using REGISTRATION_INCOME for camp fees.
                amount: paymentAmount,
                description: "Adult Campout Fee Payment (Manual/Cash)",
                campoutId: campoutId,
                userId: adultId, // Track who paid
                approvedBy: session.user.id,
                status: "APPROVED"
            }
        })

        revalidatePath(`/dashboard/campouts/${campoutId}`)
        return { success: true, message: "Payment recorded" }
    } catch (error) {
        console.error("Record Payment Error:", error)
        return { error: "Failed to record payment" }
    }
}

export async function recordScoutPayment(campoutId: string, scoutId: string, amount: string) {
    const session = await auth()
    if (!session || !["ADMIN", "FINANCIER", "LEADER"].includes(session.user.role)) {
        return { error: "Unauthorized" }
    }

    try {
        const paymentAmount = new Decimal(amount)
        if (paymentAmount.lte(0)) throw new Error("Invalid amount")

        await prisma.transaction.create({
            data: {
                type: "EVENT_PAYMENT",
                amount: paymentAmount,
                description: "Scout Campout Fee Payment (Manual/Cash)",
                campoutId: campoutId,
                scoutId: scoutId,
                approvedBy: session.user.id,
                status: "APPROVED"
            }
        })

        revalidatePath(`/dashboard/campouts/${campoutId}`)
        return { success: true, message: "Payment recorded" }
    } catch (error) {
        console.error("Record Payment Error:", error)
        return { error: "Failed to record payment" }
    }
}

export async function finalizeCampoutCosts(campoutId: string) {
    const session = await auth()
    if (!session || !["ADMIN", "FINANCIER", "LEADER"].includes(session.user.role)) {
        return { error: "Unauthorized" }
    }

    try {
        await prisma.campout.update({
            where: { id: campoutId },
            data: { status: "READY_FOR_PAYMENT" }
        })
        revalidatePath(`/dashboard/campouts/${campoutId}`)
        return { success: true, message: "Campout finalized and ready for payments" }
    } catch (error) {
        console.error("Finalize Error:", error)
        return { error: "Failed to finalize campout" }
    }
}

export async function logAdultExpense(prevState: any, formData: FormData) {
    const session = await auth()
    if (!session) return { error: "Unauthorized" }

    // Check if user is assigned to this campout? Or just allow any adult to log?
    // Ideally check CampoutAdult.

    const campoutId = formData.get("campoutId") as string
    const description = formData.get("description") as string
    const amount = formData.get("amount") as string

    if (!campoutId || !description || !amount) {
        return { error: "Missing fields" }
    }

    try {
        // Create AdultExpense record (for tracking reimbursement)
        // AND maybe create a Transaction?
        // Proposal: Create AdultExpense.
        // Admin later "Approves" it which creates the Transaction (Reimbursement).
        // OR: Just create Transaction directly with status PENDING?
        // The requirement says: "Adults log upfront expenses... Admin approve."
        // Let's use Transaction with type EXPENSE or REIMBURSEMENT (Pending).
        // If they paid for supplies, it's an EXPENSE for the Troop (that the adult paid).
        // So we record it as EXPENSE?
        // But we owe them money.
        // Let's use a specific type or just use EXPENSE and mark it "Paid by X".
        // Schema has `AdultExpense` model (Step 11). Let's use that.

        await prisma.adultExpense.create({
            data: {
                campoutId,
                adultId: session.user.id,
                amount: new Decimal(amount),
                description,
            }
        })

        revalidatePath(`/dashboard/campouts/${campoutId}`)
        return { success: true, message: "Expense logged" }

    } catch (error) {
        console.error("Log Expense Error:", error)
        return { error: "Failed to log expense" }
    }
}

const fundraisingSchema = z.object({
    campaignName: z.string().min(1),
    totalRaised: z.string().refine(val => !isNaN(Number(val)) && Number(val) > 0),
    allocations: z.string() // JSON string validation in logic
})

export async function distributeFundraising(prevState: any, formData: FormData) {
    const session = await auth()
    if (!session || !["ADMIN", "FINANCIER"].includes(session.user.role)) {
        return { error: "Unauthorized" }
    }

    const rawData = {
        campaignName: formData.get("campaignName"),
        totalRaised: formData.get("totalRaised"),
        allocations: formData.get("allocations"),
    }

    const validatedFields = fundraisingSchema.safeParse(rawData)
    if (!validatedFields.success) {
        return { error: "Invalid fields", issues: validatedFields.error.flatten() }
    }

    const { campaignName, totalRaised, allocations } = validatedFields.data
    const total = new Decimal(totalRaised)
    let parsedAllocations: any[] = []

    try {
        parsedAllocations = JSON.parse(allocations as string)
    } catch (e) {
        return { error: "Invalid allocations data" }
    }

    try {
        await prisma.$transaction(async (tx) => {
            // 1. Record Total Income for Troop
            await tx.transaction.create({
                data: {
                    type: "FUNDRAISING_INCOME",
                    amount: total,
                    description: `${campaignName} - Total Raised`,
                    approvedBy: session.user.id,
                    status: "APPROVED",
                    createdAt: new Date(), // Same timestamp for all?
                }
            })

            // 2. Process Allocations
            let totalDistributedToScouts = new Decimal(0)

            for (const alloc of parsedAllocations) {
                const amount = new Decimal(alloc.amount)

                if (alloc.category === 'EXTERNAL') {
                    // Donation/Gift OUT
                    await tx.transaction.create({
                        data: {
                            type: "EXPENSE",
                            amount: amount,
                            description: `${campaignName} - ${alloc.description}`,
                            approvedBy: session.user.id,
                            status: "APPROVED"
                        }
                    })
                } else if (alloc.category === 'SCOUT') {
                    // Credit to Scout
                    await tx.transaction.create({
                        data: {
                            type: "FUNDRAISING_INCOME",
                            amount: amount,
                            description: `${campaignName} - Share`,
                            scoutId: alloc.scoutId,
                            approvedBy: session.user.id,
                            status: "APPROVED"
                        }
                    })
                    // Add to batch sum for single withdrawal
                    totalDistributedToScouts = totalDistributedToScouts.plus(amount)
                }
                // Maintenance/Troop Fund = Do nothing (it stays in the pot from step 1)
            }

            // 3. Deduct Total Scout Distribution from Troop Pot
            if (totalDistributedToScouts.greaterThan(0)) {
                await tx.transaction.create({
                    data: {
                        type: "EXPENSE",
                        amount: totalDistributedToScouts,
                        description: `${campaignName} - Distribution to Scouts`,
                        approvedBy: session.user.id,
                        status: "APPROVED"
                    }
                })
            }

            // Update individual scout balances? 
            // We don't store balance explicitly in some designs, but schema has `ibaBalance`.
            // We should update it.
            // Wait, schema has `ibaBalance` on Scout model.
            // DO WE NEED TO MANUALLY UPDATE IT?
            // Yes, Prisma doesn't have triggers.
            // We need to iterate again or do it in the loop.

            for (const alloc of parsedAllocations) {
                if (alloc.category === 'SCOUT' && alloc.scoutId) {
                    await tx.scout.update({
                        where: { id: alloc.scoutId },
                        data: { ibaBalance: { increment: new Decimal(alloc.amount) } }
                    })
                }
            }
        })

        revalidatePath("/dashboard")
        return { success: true, message: "Fundraising distributed successfully" }
    } catch (error) {
        console.error("Fundraising Error:", error)
        return { error: "Failed to distribute fundraising" }
    }
}

export async function transferIBAToCampout(campoutId: string, scoutId: string, amount: string, beneficiaryUserId?: string) {
    const session = await auth()
    if (!session) return { error: "Unauthorized" }

    // Parent check
    if (session.user.role === 'PARENT') {
        const link = await prisma.parentScout.findUnique({
            where: {
                parentId_scoutId: {
                    parentId: session.user.id,
                    scoutId: scoutId
                }
            }
        })
        if (!link) return { error: "Unauthorized" }
    } else if (session.user.role === 'SCOUT') {
        const scout = await prisma.scout.findUnique({ where: { id: scoutId } })
        if (!scout || scout.userId !== session.user.id) return { error: "Unauthorized" }
    } else if (!["ADMIN", "FINANCIER", "LEADER"].includes(session.user.role)) {
        return { error: "Unauthorized" }
    }

    const campout = await prisma.campout.findUnique({ where: { id: campoutId } })
    if (campout?.status === 'CLOSED') return { error: "Campout is closed and cannot accept new transactions." }

    const transferAmount = new Decimal(amount)

    try {
        await prisma.$transaction(async (tx) => {
            // Check Balance
            const scout = await tx.scout.findUnique({ where: { id: scoutId } })
            if (!scout || scout.ibaBalance.lessThan(transferAmount)) {
                throw new Error("Insufficient funds")
            }

            // Debit Scout, Credit Campout (Internal Transfer)
            // We use CAMP_TRANSFER type.
            // If beneficiaryUserId is set, it means the scout is paying for that Adult.
            // Otherwise, it implicitly pays for the scout (since scoutId is on record).

            await tx.transaction.create({
                data: {
                    type: "CAMP_TRANSFER",
                    amount: transferAmount,
                    description: beneficiaryUserId ? "Payment for Adult from IBA" : "Payment from IBA",
                    scoutId: scoutId,
                    userId: beneficiaryUserId, // Link to Adult if applicable
                    campoutId: campoutId,
                    approvedBy: session.user.id, // Auto-approved? Yes if sufficient funds.
                    status: "APPROVED"
                }
            })

            await tx.scout.update({
                where: { id: scoutId },
                data: { ibaBalance: { decrement: transferAmount } }
            })
        })

        revalidatePath(`/dashboard/campouts/${campoutId}`)
        revalidatePath(`/dashboard/scouts/${scoutId}`)
        return { success: true, message: "Transfer successful" }
    } catch (error: any) {
        console.error("Transfer Error:", error)
        return { error: error.message || "Transfer failed" }
    }
}

export async function approveAdultExpense(expenseId: string) {
    const session = await auth()
    if (!session || !["ADMIN", "FINANCIER"].includes(session.user.role)) {
        return { error: "Unauthorized" }
    }

    try {
        await prisma.$transaction(async (tx) => {
            const expense = await tx.adultExpense.findUnique({ where: { id: expenseId } })
            if (!expense) throw new Error("Expense not found")
            if (expense.isReimbursed) return // Already paid

            // Create Reimbursement Transaction
            await tx.transaction.create({
                data: {
                    type: "REIMBURSEMENT",
                    amount: expense.amount,
                    description: `Reimbursement: ${expense.description}`,
                    campoutId: expense.campoutId,
                    approvedBy: session.user.id,
                    status: "APPROVED"
                }
            })

            // Mark as Paid
            await tx.adultExpense.update({
                where: { id: expenseId },
                data: { isReimbursed: true }
            })
        })

        revalidatePath("/dashboard/campouts")
        return { success: true, message: "Reimbursement approved" }
    } catch (error) {
        console.error("Approval Error:", error)
        return { error: "Failed to approve" }
    }
}

export async function switchAdultRole(campoutId: string, adultId: string, currentRole: CampoutAdultRole, newRole: CampoutAdultRole) {
    const session = await auth()
    if (!session) return { error: "Unauthorized" }

    // Allow self-switch or Admin switch
    if (session.user.id !== adultId && !["ADMIN", "FINANCIER", "LEADER"].includes(session.user.role)) {
        return { error: "Unauthorized" }
    }

    try {
        // Since we can have multiple roles, we need to handle this carefully.
        // If we are switching FROM ORGANIZER TO ATTENDEE, we update the ORG record or part of it?
        // Actually, with the new ID, we can't just "update" the role because role is part of the ID.
        // We have to delete the old role and create the new one, OR check if the new one exists.

        await prisma.$transaction(async (tx) => {
            // Delete the old role
            await tx.campoutAdult.delete({
                where: {
                    campoutId_adultId_role: {
                        campoutId,
                        adultId,
                        role: currentRole as CampoutAdultRole
                    }
                }
            })

            // Upsert the new role
            await tx.campoutAdult.upsert({
                where: {
                    campoutId_adultId_role: {
                        campoutId,
                        adultId,
                        role: newRole as CampoutAdultRole
                    }
                },
                update: {},
                create: {
                    campoutId,
                    adultId,
                    role: newRole as CampoutAdultRole
                }
            })
        })
        revalidatePath(`/dashboard/campouts/${campoutId}`)
        return { success: true }
    } catch (e: any) {
        return { error: e.message }
    }
}

export async function removeAdultFromCampout(campoutId: string, adultId: string) {
    const session = await auth()
    if (!session || !["ADMIN", "FINANCIER", "LEADER"].includes(session.user.role)) {
        return { error: "Unauthorized" }
    }

    try {
        await prisma.campoutAdult.deleteMany({
            where: {
                campoutId,
                adultId
            }
        })
        revalidatePath(`/dashboard/campouts/${campoutId}`)
        return { success: true }
    } catch (e: any) {
        return { error: e.message }
    }
}

export async function removeScoutFromCampout(campoutId: string, scoutId: string) {
    const session = await auth()
    if (!session || !["ADMIN", "FINANCIER", "LEADER"].includes(session.user.role)) {
        return { error: "Unauthorized" }
    }

    try {
        await prisma.campoutScout.delete({
            where: {
                campoutId_scoutId: {
                    campoutId,
                    scoutId
                }
            }
        })
        revalidatePath(`/dashboard/campouts/${campoutId}`)
        return { success: true }
    } catch (e: any) {
        return { error: e.message }
    }
}

export async function logCampoutExpense(prevState: any, formData: FormData) {
    const session = await auth()
    if (!session) return { error: "Unauthorized" }

    const campoutId = formData.get("campoutId") as string
    const description = formData.get("description") as string
    const amount = Number(formData.get("amount"))
    const paidBy = formData.get("paidBy") as string

    if (!campoutId || !description || !amount || !paidBy) {
        return { error: "Missing required fields" }
    }

    const campout = await prisma.campout.findUnique({ where: { id: campoutId } })
    if (campout?.status === 'CLOSED') return { error: "Campout is closed and cannot accept new transactions." }

    try {
        // Auto-add the payer as an organizer if they're not already registered
        // (Skip if paidBy is "TROOP")
        if (paidBy !== "TROOP") {
            await prisma.campoutAdult.upsert({
                where: {
                    campoutId_adultId_role: {
                        campoutId,
                        adultId: paidBy,
                        role: "ORGANIZER"
                    }
                },
                update: {}, // Already an organizer, do nothing
                create: {
                    campoutId,
                    adultId: paidBy,
                    role: "ORGANIZER"
                }
            })
        }

        if (paidBy === "TROOP") {
            if (!["ADMIN", "FINANCIER", "LEADER"].includes(session.user.role)) {
                return { error: "Unauthorized: Only Leaders/Financiers can log Troop expenses." }
            }

            await prisma.transaction.create({
                data: {
                    type: "EXPENSE",
                    amount,
                    description: `${description} (Paid by Troop)`,
                    campoutId,
                    status: "APPROVED",
                    approvedBy: session.user.id
                }
            })
        } else {
            // Logging for an adult (Reimbursable)
            if (paidBy !== session.user.id && !["ADMIN", "FINANCIER", "LEADER"].includes(session.user.role)) {
                return { error: "Unauthorized: You can only log expenses for yourself." }
            }

            await prisma.adultExpense.create({
                data: {
                    campoutId,
                    adultId: paidBy,
                    amount,
                    description,
                    isReimbursed: false
                }
            })
        }

        revalidatePath(`/dashboard/campouts/${campoutId}`)
        return { success: true }
    } catch (e: any) {
        return { error: e.message }
    }
}

export async function deleteTransaction(id: string) {
    const session = await auth()
    if (!session || !["ADMIN", "FINANCIER", "LEADER"].includes(session.user.role)) {
        return { error: "Unauthorized" }
    }

    try {
        const tx = await prisma.transaction.delete({ where: { id } })
        if (tx.campoutId) revalidatePath(`/dashboard/campouts/${tx.campoutId}`)
        return { success: true }
    } catch (e: any) {
        return { error: e.message }
    }
}

export async function deleteAdultExpense(id: string) {
    const session = await auth()
    if (!session) return { error: "Unauthorized" }

    const expense = await prisma.adultExpense.findUnique({ where: { id } })
    if (!expense) return { error: "Not found" }

    if (session.user.id !== expense.adultId && !["ADMIN", "FINANCIER", "LEADER"].includes(session.user.role)) {
        return { error: "Unauthorized" }
    }

    if (expense.isReimbursed) {
        return { error: "Cannot delete an already reimbursed expense." }
    }

    try {
        await prisma.adultExpense.delete({ where: { id } })
        revalidatePath(`/dashboard/campouts/${expense.campoutId}`)
        return { success: true }
    } catch (e: any) {
        return { error: e.message }
    }
}

export async function updateTransaction(id: string, formData: FormData) {
    const session = await auth()
    if (!session || !["ADMIN", "FINANCIER", "LEADER"].includes(session.user.role)) {
        return { error: "Unauthorized" }
    }

    const description = formData.get("description") as string
    const amount = Number(formData.get("amount"))

    try {
        const tx = await prisma.transaction.update({
            where: { id },
            data: { description, amount }
        })
        if (tx.campoutId) revalidatePath(`/dashboard/campouts/${tx.campoutId}`)
        return { success: true }
    } catch (e: any) {
        return { error: e.message }
    }
}

export async function updateAdultExpense(id: string, formData: FormData) {
    const session = await auth()
    if (!session) return { error: "Unauthorized" }

    const description = formData.get("description") as string
    const amount = Number(formData.get("amount"))

    const expense = await prisma.adultExpense.findUnique({ where: { id } })
    if (!expense) return { error: "Not found" }

    if (session.user.id !== expense.adultId && !["ADMIN", "FINANCIER", "LEADER"].includes(session.user.role)) {
        return { error: "Unauthorized" }
    }

    if (expense.isReimbursed) {
        return { error: "Cannot update a reimbursed expense." }
    }


    try {
        await prisma.adultExpense.update({
            where: { id },
            data: { description, amount }
        })
        revalidatePath(`/dashboard/campouts/${expense.campoutId}`)
        return { success: true }
    } catch (e: any) {
        return { error: e.message }
    }
}

export async function clearAllData() {
    const session = await auth()
    if (!session || session.user.role !== "ADMIN") {
        return { error: "Unauthorized" }
    }

    try {
        await prisma.$transaction(async (tx) => {
            // Delete in dependency order to avoid foreign key constraints
            // 1. Transactions and Expenses (Leaf nodes mostly)
            await tx.transaction.deleteMany({})
            await tx.adultExpense.deleteMany({})

            // 2. Join tables
            await tx.campoutAdult.deleteMany({})
            await tx.campoutScout.deleteMany({})
            await tx.parentScout.deleteMany({})

            // 3. Core Entities
            await tx.campout.deleteMany({})
            await tx.scout.deleteMany({})

            // 4. Users (Except Admin)
            await tx.user.deleteMany({
                where: {
                    role: {
                        not: "ADMIN"
                    }
                }
            })
        })

        revalidatePath("/dashboard")
        return { success: true, message: "System reset successful. All non-admin data cleared." }
    } catch (error) {
        console.error("System Reset Error:", error)
        return { error: "Failed to reset system data" }
    }
}

export async function batchIBAPayout(campoutId: string) {
    const session = await auth()
    if (!session || !["ADMIN", "FINANCIER"].includes(session.user.role)) {
        return { error: "Unauthorized" }
    }

    const campout = await prisma.campout.findUnique({
        where: { id: campoutId },
        include: {
            scouts: { include: { scout: true } },
            adults: { include: { adult: true } },
            transactions: {
                where: {
                    status: "APPROVED",
                }
            },
            expenses: true
        }
    })

    if (!campout) return { error: "Campout not found" }
    if (campout.status === "CLOSED") return { error: "Campout is already closed" }

    // Calculate cost per person
    const directExpenses = campout.transactions.filter((t: any) => t.type === "EXPENSE")
    const transactionsCost = directExpenses.reduce((sum: number, t: any) => sum + Number(t.amount), 0)
    const adultExpensesCost = campout.expenses.reduce((sum: number, e: any) => sum + Number(e.amount), 0)
    const totalCampoutCost = transactionsCost + adultExpensesCost

    const attendees = campout.adults.filter((a: any) => a.role === "ATTENDEE")
    const totalPeople = campout.scouts.length + attendees.length
    if (totalPeople === 0) return { error: "No participants to collect from" }

    const costPerPerson = new Decimal(totalCampoutCost).dividedBy(totalPeople).toDecimalPlaces(2)

    try {
        const results = await prisma.$transaction(async (tx) => {
            const updates = []

            // Scouts
            for (const cs of campout.scouts) {
                const paidAmount = campout.transactions
                    .filter(t => t.scoutId === cs.scoutId && !t.userId && ["CAMP_TRANSFER", "REGISTRATION_INCOME", "EVENT_PAYMENT"].includes(t.type))
                    .reduce((sum, t) => sum.plus(new Decimal(t.amount)), new Decimal(0))

                const due = costPerPerson.minus(paidAmount)
                if (due.greaterThan(0)) {
                    if (cs.scout.ibaBalance.lessThan(due)) {
                        throw new Error(`Scout ${cs.scout.name} has insufficient IBA funds.`)
                    }

                    // Collect from IBA
                    await tx.transaction.create({
                        data: {
                            type: "CAMP_TRANSFER",
                            amount: due,
                            description: "Automated IBA Collection",
                            scoutId: cs.scoutId,
                            campoutId: campoutId,
                            status: "APPROVED",
                            approvedBy: session.user.id
                        }
                    })

                    await tx.scout.update({
                        where: { id: cs.scoutId },
                        data: { ibaBalance: { decrement: due } }
                    })
                    updates.push(`${cs.scout.name}: collected $${due}`)
                }
            }

            // Attendee Adults
            for (const ca of attendees) {
                const paidAmount = campout.transactions
                    .filter(t => t.userId === ca.adultId && ["CAMP_TRANSFER", "REGISTRATION_INCOME", "EVENT_PAYMENT"].includes(t.type))
                    .reduce((sum, t) => sum.plus(new Decimal(t.amount)), new Decimal(0))

                const due = costPerPerson.minus(paidAmount)
                if (due.greaterThan(0)) {
                    // find a scout linked to this parent that has funds
                    const parentScoutLinks = await tx.parentScout.findMany({
                        where: { parentId: ca.adultId },
                        include: { scout: true }
                    })
                    const fundingScout = parentScoutLinks.find(ps => ps.scout.ibaBalance.greaterThanOrEqualTo(due))

                    if (!fundingScout) {
                        throw new Error(`Adult ${ca.adult.name} has no linked scout with sufficient IBA funds.`)
                    }

                    await tx.transaction.create({
                        data: {
                            type: "CAMP_TRANSFER",
                            amount: due,
                            description: `Automated Payout for Adult (${ca.adult.name})`,
                            scoutId: fundingScout.scoutId,
                            userId: ca.adultId,
                            campoutId: campoutId,
                            status: "APPROVED",
                            approvedBy: session.user.id
                        }
                    })

                    await tx.scout.update({
                        where: { id: fundingScout.scoutId },
                        data: { ibaBalance: { decrement: due } }
                    })
                    updates.push(`${ca.adult.name}: collected $${due} from ${fundingScout.scout.name}`)
                }
            }
            return updates
        })

        revalidatePath(`/dashboard/campouts/${campoutId}`)
        return { success: true, message: "Batch IBA Collection Successful", details: results }
    } catch (e: any) {
        return { error: e.message }
    }
}

export async function payoutOrganizers(campoutId: string, payouts: Record<string, number>) {
    const session = await auth()
    if (!session || !["ADMIN", "FINANCIER"].includes(session.user.role)) {
        return { error: "Unauthorized" }
    }

    try {
        const result = await prisma.$transaction(async (tx) => {
            const entries = Object.entries(payouts)
            if (entries.length === 0) return { message: "No payouts specified" }

            for (const [adultId, amount] of entries) {
                if (amount <= 0) continue

                const adult = await tx.user.findUnique({ where: { id: adultId } })
                const adultName = adult?.name || "Unknown Organizer"

                // Create Reimbursement Transaction
                await tx.transaction.create({
                    data: {
                        type: "REIMBURSEMENT",
                        amount: new Decimal(amount),
                        description: `Organizer Payout: ${adultName}`,
                        campoutId: campoutId,
                        userId: adultId,
                        approvedBy: session.user.id,
                        status: "APPROVED"
                    }
                })

                // Mark all pending expenses for this adult as reimbursed
                // Even if the payout amount differs, we consider their campout liability cleared
                await tx.adultExpense.updateMany({
                    where: {
                        campoutId,
                        adultId,
                        isReimbursed: false
                    },
                    data: { isReimbursed: true }
                })
            }
            return { message: `Processed ${entries.length} payouts` }
        })

        revalidatePath(`/dashboard/campouts/${campoutId}`)
        return { success: true, message: result.message }
    } catch (e: any) {
        return { error: e.message }
    }
}

export async function closeCampout(campoutId: string) {
    const session = await auth()
    if (!session || !["ADMIN", "FINANCIER"].includes(session.user.role)) {
        return { error: "Unauthorized" }
    }

    try {
        await prisma.campout.update({
            where: { id: campoutId },
            data: { status: "CLOSED" }
        })
        revalidatePath(`/dashboard/campouts/${campoutId}`)
        return { success: true, message: "Campout closed" }
    } catch (e: any) {
        return { error: e.message }
    }
}

export async function updateUserAppearance(theme: string, color: string) {
    const session = await auth()
    if (!session || !session.user?.email) {
        return { error: "Unauthorized" }
    }

    try {
        await prisma.user.update({
            where: { email: session.user.email },
            data: {
                preferredTheme: theme,
                preferredColor: color
            }
        })
        revalidatePath("/dashboard")
        return { success: true }
    } catch (error) {
        console.error("Update Appearance Error:", error)
        return { error: "Failed to update appearance" }
    }
}
