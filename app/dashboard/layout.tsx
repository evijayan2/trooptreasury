import SideNav from "@/app/ui/dashboard/sidenav";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Footer } from "@/components/footer";
import { Suspense } from "react";

export default async function Layout({ children }: { children: React.ReactNode }) {
    // Check auth
    const session = await auth()

    // Check if we need onboarding
    // We only check this for ADMINs, theoretically? Or everyone?
    // If settings are missing, the system is broken, so everyone should wait?
    // But only Admin can fix it.

    if (session?.user?.role === 'ADMIN') {
        const settings = await prisma.troopSettings.findFirst()

        // If settings are missing, redirect to onboarding.
        // But we must NOT redirect if we are already on the onboarding page.
        // Since we can't easily check pathname in server component layout without headers,
        // we'll use a workaround: The Onboarding page should effectively "escape" this check?
        // Actually, layout wraps everything.
        // We can just let the redirect happen, but we need to know if we are on /dashboard/onboarding.
        // headers().get("x-url")? No.

        // Better approach:
        // Use middleware? Or just check if settings exists.
        // If not exists, we redirect. 
        // But if we redirect to /dashboard/onboarding, this layout runs again.
        // Infinite loop.

        // Solution: Move Onboarding page OUT of /dashboard layout?
        // OR: Just accept that we can't do it in this layout easily without middleware.
        // Let's rely on the user navigating there?
        // No, user requirement is "Enforce setup".

        // Let's modify the check:
        // If settings exist, do nothing.
        // If settings missing, we want to redirect.
        // But we can't solve the loop here easily.

        // ALTERNATIVE: Don't use this layout for onboarding.
        // But onboarding is in /dashboard/onboarding.
        // Next.js allows (authenticated)/layout.tsx groups.

        // For now, I will comment out the redirect to prevent the crash loop, 
        // and we will move the Onboarding page to `/onboarding` (root level, protected) 
        // or `/setup/troop` to avoid this layout entirely.

        if (!settings) {
            redirect("/onboarding")
        }
    }

    return (
        <div className="flex h-screen flex-col md:flex-row md:overflow-hidden">
            <div className="w-full flex-none md:w-64">
                <Suspense fallback={<div className="w-full h-full bg-gray-100 dark:bg-gray-800 animate-pulse" />}>
                    <SideNav />
                </Suspense>
            </div>
            <div className="flex-grow flex flex-col md:overflow-y-auto">
                <div className="flex-grow p-6 md:p-12">
                    <Breadcrumbs />
                    {children}
                </div>
                <Footer />
            </div>
        </div>
    );
}
