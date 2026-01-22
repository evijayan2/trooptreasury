import Link from "next/link"
import Image from "next/image"
import { ThemeCustomizer } from "@/components/theme-customizer"

import { auth } from "@/auth"
import { getRolePermissions, Permission } from "@/lib/rbac"
import { Role } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { NavLinks } from "./nav-links"
import { MobileNav } from "./mobile-nav"

export default async function SideNav() {
    const session = await auth()
    const role = session?.user?.role as Role

    // Fetch permissions map
    const allPermissions = await getRolePermissions()

    let userPermissions: Permission[] = []
    let scoutId: string | undefined

    if (role === 'ADMIN') {
        const { DEFAULT_PERMISSIONS } = await import("@/lib/rbac")
        userPermissions = DEFAULT_PERMISSIONS.ADMIN
    } else if (role) {
        userPermissions = allPermissions[role] || []
    }

    if (role === 'SCOUT' && session?.user?.id) {
        const scout = await prisma.scout.findUnique({
            where: { userId: session.user.id }
        })
        scoutId = scout?.id
    }


    // Fetch user preferences
    let initialColor = "orange"
    let initialTheme = "system"
    let userDetails = { name: session?.user?.name, email: session?.user?.email }


    if (session?.user?.id) {
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { preferredColor: true, preferredTheme: true }
        })
        if (user) {
            initialColor = user.preferredColor || "orange"
            initialTheme = user.preferredTheme || "system"
        }
    }

    return (
        <div className="flex h-full flex-col bg-gray-100/40 dark:bg-gray-800/40">
            {/* Mobile Header */}
            <div className="flex h-16 items-center justify-between border-b px-4 md:hidden bg-background">
                <MobileNav
                    role={role}
                    permissions={userPermissions}
                    scoutId={scoutId}
                    initialColor={initialColor}
                    initialTheme={initialTheme}
                    user={userDetails}
                />
                <Link href="/" className="flex items-center gap-2">
                    <div className="relative h-10 w-10">
                        <Image
                            src="/trooptreasury-logo-main.png"
                            alt="TroopTreasury Logo"
                            fill
                            className="object-contain"
                        />
                    </div>
                    <span className="font-semibold text-lg">TroopTreasury</span>
                </Link>
            </div>

            {/* Desktop Sidebar */}
            <div className="hidden h-full flex-col border-r px-3 py-4 md:flex md:w-full">
                <Link
                    className="mb-2 flex h-20 items-end justify-start rounded-md bg-primary p-4 md:h-40"
                    href="/"
                >
                    <div className="flex w-full items-center justify-start">
                        <Image
                            src="/trooptreasury-logo-main.png"
                            alt="TroopTreasury Logo"
                            width={160}
                            height={160}
                            className="w-full h-auto object-contain"
                            priority
                        />
                    </div>
                </Link>
                <div className="flex grow flex-col justify-between space-y-2">
                    <div className="flex flex-col space-y-1">
                        <NavLinks role={role} permissions={userPermissions} scoutId={scoutId} />
                    </div>

                    <div className="flex flex-col space-y-2 mt-auto">
                        <div className="flex items-center justify-center">
                            <ThemeCustomizer initialColor={initialColor} initialTheme={initialTheme} />
                        </div>

                        <div className="w-full flex-col rounded-md bg-sidebar-accent p-3 flex">
                            <p className="text-sm font-semibold text-sidebar-foreground truncate">
                                {session?.user?.name || "Troop User"}
                            </p>
                            <p className="text-xs font-bold text-primary uppercase tracking-wider">
                                {role}
                            </p>
                        </div>

                        <form action={async () => {
                            'use server';
                            const { signOut } = await import('@/auth');
                            await signOut();
                        }}>
                            <button className="flex h-[40px] w-full grow items-center gap-2 rounded-md bg-gray-50 p-3 text-sm font-medium hover:bg-sidebar-accent hover:text-primary dark:bg-gray-800 dark:text-gray-50 justify-start px-3">
                                <div>Sign Out</div>
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    )
}

