import type { NextAuthConfig } from "next-auth"

export const authConfig = {
    pages: {
        signIn: "/login",
    },
    session: {
        strategy: "jwt",
        maxAge: 15 * 60, // 15 minutes
    },
    callbacks: {
        authorized({ auth, request }) {
            const { nextUrl } = request
            const isLoggedIn = !!auth?.user
            // Be very robust in role extraction
            const userRole = (auth?.user as any)?.role || (auth as any)?.token?.role

            const isValidUser = isLoggedIn && !!userRole

            if (nextUrl.pathname.includes('.') && !nextUrl.pathname.endsWith('.html')) {
                // Ignore static-like assets if they leak through matcher
                return true
            }

            console.log(`[AUTH-TRACE] path=${nextUrl.pathname} loggedIn=${isLoggedIn} role=${userRole} valid=${isValidUser} user=${auth?.user?.name || 'none'}`);

            if (request.method === "OPTIONS") return true

            const isOnDashboard = nextUrl.pathname.startsWith("/dashboard")

            if (isOnDashboard) {
                if (isValidUser) {
                    const role = userRole as string
                    const path = nextUrl.pathname

                    // RBAC Logic
                    if (path.startsWith("/dashboard/users") && role !== "ADMIN") return false
                    if (path.startsWith("/dashboard/settings") && !["ADMIN", "FINANCIER"].includes(role)) return false
                    if (path.startsWith("/dashboard/transactions") && !["ADMIN", "FINANCIER"].includes(role)) return false
                    // Reports: Admin, Financier, Leader
                    if (path.startsWith("/dashboard/reports") && !["ADMIN", "FINANCIER", "LEADER"].includes(role)) return false

                    return true
                }
                console.log(`[AUTH-TRACE] Dashboard access DENIED: validUser=${isValidUser}. Redirecting to login.`);
                return false // Redirect unauthenticated or role-less users to login
            } else if (isLoggedIn && isValidUser) {
                // Only redirect to dashboard if on login or home page AND we have a valid role
                if (nextUrl.pathname === "/login" || nextUrl.pathname === "/") {
                    console.log(`[AUTH-TRACE] Already logged in at ${nextUrl.pathname}, redirecting to /dashboard`);
                    return Response.redirect(new URL('/dashboard', nextUrl))
                }
            }
            return true
        },
        async jwt({ token, user }) {
            if (user) {
                token.role = (user as any).role
                token.id = user.id
            }
            return token
        },
        async session({ session, token }) {
            if (token && session.user) {
                (session.user as any).role = token.role
                session.user.id = token.id as string
            }
            return session
        },
    },
    providers: [], // Configured in auth.ts
} satisfies NextAuthConfig
