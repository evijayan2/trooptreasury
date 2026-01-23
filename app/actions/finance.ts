"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { z } from "zod"
import { revalidatePath } from "next/cache"
import { Decimal } from "decimal.js"
import { BudgetCategoryType, TransactionType, FundraisingStatus } from "@prisma/client"

// --- Budget Management ---

const budgetSchema = z.object({
    year: z.string().min(1, "Year is required (e.g. 2025-2026)"),
    status: z.enum(["DRAFT", "ACTIVE", "CLOSED"]).optional(),
    annualDuesAmount: z.string().refine(val => !isNaN(Number(val)), "Invalid amount"),
})

export async function upsertBudget(prevState: any, formData: FormData) {
    const session = await auth()
    if (!session || !["ADMIN", "FINANCIER"].includes(session.user.role)) {
        return { error: "Unauthorized" }
    }

    const rawData = {
        year: formData.get("year"),
        status: formData.get("isActive") === "on" ? "ACTIVE" : "DRAFT",
        annualDuesAmount: formData.get("annualDuesAmount") || "150.00"
    }

    // If updating, we might need ID. For now, let's assume creating new or finding by Year?
    // Actually, usually we edit an existing one by ID. Let's support ID if provided.
    const id = formData.get("id") as string | null

    const validatedFields = budgetSchema.safeParse(rawData)
    if (!validatedFields.success) {
        return { error: "Invalid fields", issues: validatedFields.error.flatten() }
    }

    const { year, status, annualDuesAmount } = validatedFields.data

    try {
        if (id) {
            await prisma.budget.update({
                where: { id },
                data: { year, status: status as any, annualDuesAmount: new Decimal(annualDuesAmount) }
            })
        } else {
            // If setting active, deactivate others? -> Set them to CLOSED or keep as previously active?
            // "every year one budget should be active". So if we make this one ACTIVE, others become CLOSED (or just not Active).
            // Let's set other ACTIVE budgets to CLOSED for simplicity, or just leave them?
            // "once the budget is active... we must have option to delete, active and closed we should not delete"
            // Let's assume strict single ACTIVE.
            if (status === 'ACTIVE') {
                // Deactivate currently active budget to CLOSED? Or DRAFT? 
                // Usually previous year -> CLOSED.
                await prisma.budget.updateMany({
                    where: { status: 'ACTIVE' },
                    data: { status: 'CLOSED' }
                })
            }
            await prisma.budget.create({
                data: { year, status: status as any, annualDuesAmount: new Decimal(annualDuesAmount) }
            })
        }
        revalidatePath("/dashboard/finance/budget")
        return { success: true, message: "Budget saved successfully" }
    } catch (error) {
        console.error("Budget Error:", error)
        return { error: "Failed to save budget" }
    }
}

const budgetCategorySchema = z.object({
    budgetId: z.string().min(1),
    name: z.string().min(1, "Name is required"),
    type: z.nativeEnum(BudgetCategoryType),
    plannedIncome: z.string().refine(val => !isNaN(Number(val)), "Invalid amount"),
    plannedExpense: z.string().refine(val => !isNaN(Number(val)), "Invalid amount"),
})

export async function upsertBudgetCategory(prevState: any, formData: FormData) {
    const session = await auth()
    if (!session || !["ADMIN", "FINANCIER"].includes(session.user.role)) {
        return { error: "Unauthorized" }
    }

    const rawData = {
        budgetId: formData.get("budgetId"),
        name: formData.get("name"),
        type: formData.get("type"),
        plannedIncome: formData.get("plannedIncome") || "0",
        plannedExpense: formData.get("plannedExpense") || "0",
    }

    const id = formData.get("id") as string | null
    const validatedFields = budgetCategorySchema.safeParse(rawData)

    if (!validatedFields.success) {
        return { error: "Invalid fields", issues: validatedFields.error.flatten() }
    }

    const { budgetId, name, type, plannedIncome, plannedExpense } = validatedFields.data

    try {
        const data = {
            budgetId,
            name,
            type,
            plannedIncome: new Decimal(plannedIncome),
            plannedExpense: new Decimal(plannedExpense)
        }

        if (id) {
            await prisma.budgetCategory.update({
                where: { id },
                data
            })
        } else {
            await prisma.budgetCategory.create({ data })
        }
        revalidatePath("/dashboard/finance/budget")
        return { success: true, message: "Category saved" }
    } catch (error) {
        console.error("Category Error:", error)
        return { error: "Failed to save category" }
    }
}

// --- Fundraising ---

const fundraisingSchema = z.object({
    name: z.string().min(1),
    startDate: z.string(),
    endDate: z.string().optional(),
    goal: z.string().refine(val => !isNaN(Number(val)), "Invalid goal"),
    isComplianceApproved: z.boolean().optional(),
    type: z.enum(["GENERAL", "PRODUCT_SALE"]).optional(), // Default to GENERAL
    productName: z.string().optional(),
    productPrice: z.string().optional(),
    productCost: z.string().optional(),
    productIba: z.string().optional(),
    ibaPercentage: z.string().refine(val => {
        const num = Number(val)
        return !isNaN(num) && num >= 0 && num <= 100
    }, "Percentage must be 0-100"),
}).refine(data => {
    if (data.type === 'PRODUCT_SALE') {
        return !!data.productName && !!data.productPrice && !!data.productIba
    }
    return true
}, {
    message: "Product details are required for Product Sale",
    path: ["productName"], // Highlight name field
})

export async function createFundraiser(prevState: any, formData: FormData) {
    const session = await auth()
    if (!session || !["ADMIN", "FINANCIER"].includes(session.user.role)) {
        return { error: "Unauthorized" }
    }

    const rawData = {
        name: formData.get("name"),
        startDate: formData.get("startDate"),
        endDate: formData.get("endDate"),
        goal: formData.get("goal"),
        isComplianceApproved: formData.get("isComplianceApproved") === "on",
        ibaPercentage: formData.get("ibaPercentage") || "0",
        type: formData.get("type") || "GENERAL",
        productName: formData.get("productName"),
        productPrice: formData.get("productPrice"),
        productCost: formData.get("productCost"),
        productIba: formData.get("productIba"),
    }

    const validatedFields = fundraisingSchema.safeParse(rawData)
    if (!validatedFields.success) {
        return { error: "Invalid fields", issues: validatedFields.error.flatten() }
    }

    if (!validatedFields.success) {
        return { error: "Invalid fields", issues: validatedFields.error.flatten() }
    }

    const { name, startDate, endDate, goal, isComplianceApproved, ibaPercentage, type, productName, productPrice, productCost, productIba } = validatedFields.data

    // Warning check for IBA > 30%
    if (Number(ibaPercentage) > 30) {
        // We can just log or maybe return a warning in the message?
        // For now, allow it but maybe the UI should have warned them.
        console.warn(`High IBA percentage detected: ${ibaPercentage}%`)
    }

    try {
        await prisma.fundraisingCampaign.create({
            data: {
                name,
                startDate: new Date(startDate),
                endDate: endDate ? new Date(endDate) : null,
                goal: new Decimal(goal),
                isComplianceApproved,
                ibaPercentage: parseInt(ibaPercentage),
                type: type as any,
                productName,
                productPrice: productPrice ? new Decimal(productPrice) : null,
                productCost: productCost ? new Decimal(productCost) : null,
                productIba: productIba ? new Decimal(productIba) : null,
            }
        })
        revalidatePath("/dashboard/finance/fundraising")
        return { success: true, message: "Campaign created" }
    } catch (error) {
        console.error("Fundraising Error:", error)
        return { error: "Failed to create campaign" }
    }
}

// --- Extended Transaction Logic ---

// We need a more flexible transaction create that handles the new optional links
// We can export a new function or update the existing one. 
// Since the existing one is simple, let's create a dedicated robust one here.

const fullTransactionSchema = z.object({
    amount: z.string().refine(val => !isNaN(Number(val)) && Number(val) > 0, "Positive amount required"),
    type: z.nativeEnum(TransactionType),
    description: z.string().min(1),
    date: z.string(),
    scoutId: z.string().optional(),
    campoutId: z.string().optional(),
    budgetCategoryId: z.string().optional(),
    fundraisingCampaignId: z.string().optional(),
})

export async function recordTransaction(prevState: any, formData: FormData) {
    const session = await auth()
    if (!session || !["ADMIN", "FINANCIER", "LEADER", "PARENT"].includes(session.user.role)) {
        return { error: "Unauthorized" }
    }

    // Role checks similar to original...
    // Parents can only record specific things? Or requests?
    // For now assume this is mostly Admin/Financier for the full module.
    // If PARENT, maybe only "Payment" or "Reimbursement Request"?
    // Let's stick to Admin/Financier for full power, restrict Parent later if needed or rely on base action.

    const rawData = {
        amount: formData.get("amount"),
        type: formData.get("type"),
        description: formData.get("description"),
        date: formData.get("date"),
        scoutId: formData.get("scoutId") || undefined,
        campoutId: formData.get("campoutId") || undefined,
        budgetCategoryId: formData.get("budgetCategoryId") || undefined,
        fundraisingCampaignId: formData.get("fundraisingCampaignId") || undefined,
    }

    const validatedFields = fullTransactionSchema.safeParse(rawData)
    if (!validatedFields.success) {
        return { error: "Invalid fields", issues: validatedFields.error.flatten() }
    }

    const { amount, type, description, date, scoutId, campoutId, budgetCategoryId, fundraisingCampaignId } = validatedFields.data

    try {
        if (fundraisingCampaignId) {
            const campaign = await prisma.fundraisingCampaign.findUnique({
                where: { id: fundraisingCampaignId }
            })
            if (!campaign) {
                return { error: "Campaign not found" }
            }
            if (campaign.status === FundraisingStatus.CLOSED) {
                return { error: "This fundraising campaign is closed." }
            }
        }

        await prisma.$transaction(async (tx) => {
            const transaction = await tx.transaction.create({
                data: {
                    amount: new Decimal(amount),
                    type,
                    description,
                    createdAt: (() => {
                        const today = new Date().toISOString().split('T')[0]
                        return date === today ? new Date() : new Date(date)
                    })(),
                    scoutId: scoutId || null,
                    campoutId: campoutId || null,
                    budgetCategoryId: budgetCategoryId || null,
                    fundraisingCampaignId: fundraisingCampaignId || null,
                    approvedBy: ["ADMIN", "FINANCIER"].includes(session.user.role) ? session.user.id : null,
                    status: ["ADMIN", "FINANCIER"].includes(session.user.role) ? "APPROVED" : "PENDING",
                    userId: session.user.id, // Recorded by
                    fromAccount: 'MANUAL'
                }
            })

            // IBA Logic: If Fundraising Income & Linked to Scout & Campaign has split
            if (type === 'FUNDRAISING_INCOME' && scoutId && fundraisingCampaignId) {
                const campaign = await tx.fundraisingCampaign.findUnique({ where: { id: fundraisingCampaignId } })
                if (campaign && campaign.ibaPercentage > 0) {
                    const ibaAmount = new Decimal(amount).mul(campaign.ibaPercentage).div(100)
                    // Update Scout Balance
                    await tx.scout.update({
                        where: { id: scoutId },
                        data: { ibaBalance: { increment: ibaAmount } }
                    })
                    // Log internal IBA credit transaction? Or just implied? 
                    // Maybe good to have a trace. But the balance update is key.
                }
            }

            // If paying from IBA?
            // This usually is a specific "IBA_RECLAIM" or "EXPENSE" covered by IBA.
            // If we mark it as 'PAID_FROM_IBA' (not a real type yet, but logic wise):
            // We'll handle IBA transfers in a separate explicit action to avoid confusion.
        })

        revalidatePath("/dashboard/finance")
        return { success: true, message: "Transaction recorded" }
    } catch (error) {
        console.error("Transaction Error:", error)
        return { error: "Failed to record transaction" }
    }
}

// --- Delete Actions ---

export async function deleteBudgetCategory(id: string) {
    const session = await auth()
    if (!session || !["ADMIN", "FINANCIER"].includes(session.user.role)) {
        return { error: "Unauthorized" }
    }

    try {
        const linkedTransactions = await prisma.transaction.count({
            where: { budgetCategoryId: id }
        })

        if (linkedTransactions > 0) {
            return { error: `Cannot delete: ${linkedTransactions} transactions are linked to this category.` }
        }

        await prisma.budgetCategory.delete({
            where: { id }
        })

        revalidatePath("/dashboard/finance/budget")
        return { success: true, message: "Category deleted" }
    } catch (error) {
        console.error("Delete Category Error:", error)
        return { error: "Failed to delete category" }
    }
}

export async function deleteFundraisingCampaign(id: string) {
    const session = await auth()
    if (!session || !["ADMIN", "FINANCIER"].includes(session.user.role)) {
        return { error: "Unauthorized" }
    }

    try {
        const linkedTransactions = await prisma.transaction.count({
            where: { fundraisingCampaignId: id }
        })

        if (linkedTransactions > 0) {
            return { error: `Cannot delete: ${linkedTransactions} transactions are linked to this campaign.` }
        }

        await prisma.fundraisingCampaign.delete({
            where: { id }
        })

        revalidatePath("/dashboard")
        revalidatePath("/dashboard/finance")
        revalidatePath("/dashboard/finance/fundraising")
        return { success: true, message: "Campaign deleted" }
    } catch (error) {
        console.error("Delete Campaign Error:", error)
        return { error: "An unexpected error occurred" }
    }
}

export async function toggleFundraisingStatus(id: string) {
    const session = await auth()
    if (!session || !["ADMIN", "FINANCIER"].includes(session.user.role)) {
        return { error: "Unauthorized" }
    }

    try {
        const campaign = await prisma.fundraisingCampaign.findUnique({
            where: { id }
        })

        if (!campaign) {
            return { error: "Campaign not found" }
        }

        const newStatus = campaign.status === FundraisingStatus.ACTIVE
            ? FundraisingStatus.CLOSED
            : FundraisingStatus.ACTIVE

        await prisma.fundraisingCampaign.update({
            where: { id },
            data: { status: newStatus }
        })

        revalidatePath("/dashboard/finance/fundraising")
        return { success: true, message: `Campaign ${newStatus === FundraisingStatus.ACTIVE ? 'activated' : 'closed'}` }
    } catch (error) {
        console.error("Toggle Campaign Status Error:", error)
        return { error: "Failed to update campaign status" }
    }
}

export async function deleteBudget(id: string) {
    const session = await auth()
    if (!session || !["ADMIN", "FINANCIER"].includes(session.user.role)) {
        return { error: "Unauthorized" }
    }

    try {
        const budget = await prisma.budget.findUnique({ where: { id } })
        if (!budget) return { error: "Budget not found" }
        if (budget.status !== 'DRAFT') {
            return { error: "Cannot delete Active or Closed budgets." }
        }
        // Check if any categories in this budget have linked transactions
        const linkedTransactions = await prisma.transaction.count({
            where: {
                budgetCategory: {
                    budgetId: id
                }
            }
        })

        if (linkedTransactions > 0) {
            return { error: `Cannot delete: ${linkedTransactions} transactions are linked to categories in this budget.` }
        }

        // Transactions are protected. We can now delete the budget and its categories.
        // Prisma will handle category deletion if onDelete: Cascade is set, or we do it manually.
        // Looking at schema.prisma, BudgetCategory has budget relation but no explicit cascade?
        // Actually, let's delete categories first to be safe if no cascade.
        await prisma.$transaction([
            prisma.budgetCategory.deleteMany({ where: { budgetId: id } }),
            prisma.budget.delete({ where: { id } })
        ])

        revalidatePath("/dashboard")
        revalidatePath("/dashboard/finance")
        revalidatePath("/dashboard/finance/budget")
        return { success: true, message: "Budget deleted" }
    } catch (error) {
        console.error("Delete Budget Error:", error)
        return { error: "An unexpected error occurred while deleting the budget" }
    }
}

export async function updateBudgetStatus(id: string, status: string) {
    const session = await auth()
    if (!session || !["ADMIN", "FINANCIER"].includes(session.user.role)) {
        return { error: "Unauthorized" }
    }

    try {
        if (status === 'ACTIVE') {
            // Deactivate others
            await prisma.budget.updateMany({
                where: { status: 'ACTIVE' },
                data: { status: 'CLOSED' }
            })
        }

        await prisma.budget.update({
            where: { id },
            data: { status: status as any }
        })

        revalidatePath("/dashboard/finance/budget")
        return { success: true, message: `Budget marked as ${status}` }
    } catch (error) {
        console.error("Update Budget Status Error:", error)
        return { error: "Failed to update status" }
    }
}

export async function deleteTransaction(id: string) {
    const session = await auth()
    if (!session || !["ADMIN", "FINANCIER"].includes(session.user.role)) {
        return { error: "Unauthorized" }
    }

    try {
        await prisma.transaction.delete({
            where: { id }
        })

        revalidatePath("/dashboard")
        revalidatePath("/dashboard/finance")
        revalidatePath("/dashboard/finance/expenses")
        return { success: true, message: "Transaction deleted" }
    } catch (error) {
        console.error("Delete Transaction Error:", error)
        return { error: "An unexpected error occurred while deleting the transaction" }
    }
}

const bulkIBADepositSchema = z.object({
    deposits: z.array(z.object({
        scoutId: z.string().min(1),
        amount: z.string().refine(val => !isNaN(Number(val)) && Number(val) > 0, "Amount must be positive"),
    })).min(1, "At least one deposit is required"),
    description: z.string().min(1, "Description is required"),
    date: z.string(),
})

export async function bulkRecordIBADeposits(prevState: any, formData: FormData) {
    const session = await auth()
    if (!session || !["ADMIN", "FINANCIER"].includes(session.user.role)) {
        return { error: "Unauthorized" }
    }

    // Parse deposits from JSON string in formData
    const depositsJson = formData.get("deposits") as string
    const description = formData.get("description") as string
    const date = formData.get("date") as string

    console.log("bulkRecordIBADeposits started", { depositsJson, description, date })

    try {
        const deposits = JSON.parse(depositsJson)
        console.log("Parsed deposits:", deposits)
        const validatedFields = bulkIBADepositSchema.safeParse({ deposits, description, date })

        if (!validatedFields.success) {
            console.error("Validation failed:", validatedFields.error.flatten())
            return { error: "Invalid fields", issues: validatedFields.error.flatten() }
        }

        const { deposits: validatedDeposits, description: validatedDescription, date: validatedDate } = validatedFields.data

        for (const deposit of validatedDeposits) {
            const amount = new Decimal(deposit.amount)
            console.log(`Processing deposit for ${deposit.scoutId}: ${amount}`)

            // Create Transaction
            await prisma.transaction.create({
                data: {
                    amount,
                    type: TransactionType.IBA_DEPOSIT,
                    description: validatedDescription,
                    createdAt: new Date(validatedDate),
                    scoutId: deposit.scoutId,
                    approvedBy: session.user.id,
                    status: 'APPROVED',
                    userId: session.user.id
                },
                select: { id: true }
            })

            // Update Scout Balance
            await prisma.scout.update({
                where: { id: deposit.scoutId },
                data: { ibaBalance: { increment: amount } }
            })
        }

        console.log("Bulk IBA Deposit success")
        revalidatePath("/dashboard")
        revalidatePath("/dashboard/finance")
        revalidatePath("/dashboard/scouts")
        return { success: true, message: `Successfully processed ${validatedDeposits.length} deposits.` }
    } catch (error) {
        console.error("Bulk IBA Deposit Error:", error)
        return { error: "Failed to process bulk deposits" }
    }
}

const productSaleSchema = z.object({
    campaignId: z.string().min(1),
    sales: z.array(z.object({
        scoutId: z.string().min(1),
        quantity: z.number().int().min(0)
    }))
})

export async function recordProductSale(prevState: any, formData: FormData) {
    const session = await auth()
    if (!session || !["ADMIN", "FINANCIER"].includes(session.user.role)) {
        return { error: "Unauthorized" }
    }

    const rawData = {
        campaignId: formData.get("campaignId"),
        sales: JSON.parse(formData.get("sales") as string)
    }

    console.log("Recording product sales for", rawData.campaignId)

    const validatedFields = productSaleSchema.safeParse(rawData)

    if (!validatedFields.success) {
        return { error: "Invalid fields", issues: validatedFields.error.flatten() }
    }

    const { campaignId, sales } = validatedFields.data

    try {
        await prisma.$transaction(async (tx) => {
            // For each sale, upsert
            for (const sale of sales) {
                if (sale.quantity > 0) {
                    await tx.fundraisingSale.upsert({
                        where: {
                            campaignId_scoutId: {
                                campaignId,
                                scoutId: sale.scoutId
                            }
                        },
                        create: {
                            campaignId,
                            scoutId: sale.scoutId,
                            quantity: sale.quantity
                        },
                        update: {
                            quantity: sale.quantity
                        }
                    })
                } else {
                    // If quantity 0, delete
                    await tx.fundraisingSale.deleteMany({
                        where: {
                            campaignId,
                            scoutId: sale.scoutId
                        }
                    })
                }
            }
        })

        revalidatePath(`/dashboard/finance/fundraising/${campaignId}`)
        return { success: true, message: "Sales recorded successfully" }
    } catch (error) {
        console.error("Record Sales Error:", error)
        return { error: "Failed to record sales" }
    }
}

const fundraisingOrderSchema = z.object({
    campaignId: z.string().min(1),
    customerName: z.string().min(1, "Customer name is required"),
    quantity: z.coerce.number().int().min(1, "Quantity must be at least 1"),
    amountPaid: z.coerce.number().min(0, "Amount paid cannot be negative"),
    delivered: z.boolean().optional(),
    scoutId: z.string().optional()
})

export async function addOrder(prevState: any, formData: FormData) {
    const session = await auth()
    if (!session) return { error: "Unauthorized" }

    const rawData = {
        campaignId: formData.get("campaignId"),
        customerName: formData.get("customerName"),
        quantity: formData.get("quantity"),
        amountPaid: formData.get("amountPaid"),
        delivered: formData.get("delivered") === "on",
        scoutId: formData.get("scoutId")
    }

    const validatedFields = fundraisingOrderSchema.safeParse(rawData)

    if (!validatedFields.success) {
        return { error: "Invalid fields", issues: validatedFields.error.flatten() }
    }

    const { campaignId, customerName, quantity, amountPaid, delivered, scoutId } = validatedFields.data

    let finalScoutId = scoutId
    if (!finalScoutId) {
        const scout = await prisma.scout.findUnique({ where: { userId: session.user.id } })
        if (scout) {
            finalScoutId = scout.id
        }
    }

    if (!finalScoutId) {
        return { error: "Could not determine Scout ID" }
    }

    try {
        await prisma.fundraisingOrder.create({
            data: {
                campaignId,
                scoutId: finalScoutId,
                customerName,
                quantity,
                amountPaid: new Decimal(amountPaid),
                delivered: delivered || false
            }
        })
        revalidatePath(`/dashboard/my-fundraising/${campaignId}`)
        return { success: true, message: "Order added" }
    } catch (error) {
        console.error("Add Order Error:", error)
        return { error: "Failed to add order" }
    }
}

export async function deleteOrder(orderId: string, campaignId: string) {
    const session = await auth()
    if (!session) return { error: "Unauthorized" }

    try {
        await prisma.fundraisingOrder.delete({ where: { id: orderId } })
        revalidatePath(`/dashboard/my-fundraising/${campaignId}`)
        return { success: true, message: "Order deleted" }
    } catch (error) {
        return { error: "Failed to delete order" }
    }
}

export async function toggleOrderDelivered(orderId: string, campaignId: string, currentStatus: boolean) {
    const session = await auth()
    if (!session) return { error: "Unauthorized" }

    try {
        await prisma.fundraisingOrder.update({
            where: { id: orderId },
            data: { delivered: !currentStatus }
        })
        revalidatePath(`/dashboard/my-fundraising/${campaignId}`)
        return { success: true }
    } catch (error) {
        return { error: "Failed to update order" }
    }
}
