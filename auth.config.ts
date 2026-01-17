import type { NextAuthConfig } from "next-auth"

export const authConfig = {
    pages: {
        signIn: "/login",
    },
    callbacks: {
        authorized({ auth, request }) {
            const { nextUrl } = request
            const isLoggedIn = !!auth?.user
            const isValidUser = isLoggedIn && (auth?.user?.role || false)
            if (request.method === "OPTIONS") return true

            const isOnDashboard = nextUrl.pathname.startsWith("/dashboard")

            if (isOnDashboard) {
                if (isValidUser) {
                    const role = auth?.user?.role as string
                    const path = nextUrl.pathname

                    // RBAC Logic
                    if (path.startsWith("/dashboard/users") && role !== "ADMIN") return false
                    if (path.startsWith("/dashboard/settings") && !["ADMIN", "FINANCIER"].includes(role)) return false
                    if (path.startsWith("/dashboard/transactions") && !["ADMIN", "FINANCIER"].includes(role)) return false
                    // Reports: Admin, Financier, Leader
                    if (path.startsWith("/dashboard/reports") && !["ADMIN", "FINANCIER", "LEADER"].includes(role)) return false

                    return true
                }
                return false // Redirect unauthenticated users to login page
            } else if (isLoggedIn) {
                // If logged in and on login page (or root), redirect to dashboard
                return Response.redirect(new URL('/dashboard', nextUrl))
            }
            return true
        },
        async jwt({ token, user }) {
            if (user) {
                token.role = user.role
                token.id = user.id
            }
            return token
        },
        async session({ session, token }) {
            if (token && session.user) {
                session.user.role = token.role as any
                session.user.id = token.id as string
            }
            return session
        },
    },
    providers: [], // Configured in auth.ts
} satisfies NextAuthConfig
