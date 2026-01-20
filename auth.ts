import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import Credentials from "next-auth/providers/credentials"
import { z } from "zod"
import bcrypt from "bcryptjs"
import { authConfig } from "./auth.config"


export const { handlers, auth, signIn, signOut } = NextAuth({
    ...authConfig,
    adapter: PrismaAdapter(prisma as any) as any,
    providers: [
        Credentials({
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            authorize: async (credentials) => {
                try {

                    const parsedCredentials = z
                        .object({ email: z.string().email(), password: z.string().min(1) })
                        .safeParse(credentials)

                    if (!parsedCredentials.success) {

                        return null
                    }

                    const { email, password } = parsedCredentials.data
                    const lowercaseEmail = email.toLowerCase()




                    const user = await prisma.user.findUnique({ where: { email: lowercaseEmail } })


                    if (!user) {
                        console.log(`[AUTH-DEBUG] User not found in DB for email: "${lowercaseEmail}"`)
                        return null
                    }


                    // Check if account is locked
                    if (user.lockedUntil && user.lockedUntil > new Date()) {
                        const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000)

                        return null
                    }

                    // Reset lock if expired
                    if (user.lockedUntil && user.lockedUntil <= new Date()) {
                        console.log(`[AUTH-DEBUG] Lock expired, resetting...`);
                        await prisma.user.update({
                            where: { id: user.id },
                            data: {
                                lockedUntil: null,
                                failedLoginAttempts: 0
                            }
                        })
                    }

                    if (!user.passwordHash) {
                        console.log(`[AUTH-DEBUG] No password hash found for user`);
                        return null
                    }


                    const passwordsMatch = await bcrypt.compare(password, user.passwordHash)



                    if (passwordsMatch) {

                        await prisma.user.update({
                            where: { id: user.id },
                            data: {
                                failedLoginAttempts: 0,
                                lastFailedLogin: null,
                                lockedUntil: null
                            }
                        })
                        return user
                    } else {

                        const newAttempts = (user.failedLoginAttempts || 0) + 1
                        const shouldLock = newAttempts >= 5

                        await prisma.user.update({
                            where: { id: user.id },
                            data: {
                                failedLoginAttempts: newAttempts,
                                lastFailedLogin: new Date(),
                                lockedUntil: shouldLock ? new Date(Date.now() + 15 * 60 * 1000) : null
                            }
                        })

                        if (shouldLock) {

                        }
                        return null
                    }
                } catch (error: any) {
                    console.error("CRITICAL ERROR in authorize function:")
                    console.error("Message:", error.message)
                    if (error.code) console.error("Code:", error.code)
                    if (error.clientVersion) console.error("Client Version:", error.clientVersion)
                    return null
                } finally {

                }
            },
        }),
    ],
})
