"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import clsx from "clsx"
import { Users, Home, TrendingUp, Tent, FileText, Settings, DollarSign } from "lucide-react"
import { Permission } from "@/lib/rbac"
import { Role } from "@prisma/client"

interface NavLinksProps {
    role?: Role
    permissions: Permission[]
    scoutId?: string
}

export function NavLinks({ role, permissions, scoutId }: NavLinksProps) {
    const pathname = usePathname()

    const allLinks: { name: string, href: string, icon: any, permission?: Permission }[] = [
        { name: 'Dashboard', href: '/dashboard', icon: Home, permission: 'VIEW_DASHBOARD' },
        { name: 'Scouts', href: '/dashboard/scouts', icon: Users, permission: 'VIEW_SCOUTS' },
        {
            name: role === 'SCOUT' ? 'Transactions' : 'Financials',
            href: role === 'SCOUT' && scoutId ? `/dashboard/scouts/${scoutId}` : '/dashboard/finance',
            icon: DollarSign,
            permission: 'VIEW_TRANSACTIONS'
        },
        { name: 'Campouts', href: '/dashboard/campouts', icon: Tent, permission: 'VIEW_CAMPOUTS' },
        { name: 'Reports', href: '/dashboard/reports', icon: FileText, permission: 'VIEW_REPORTS' },
        { name: 'Users', href: '/dashboard/users', icon: Users, permission: 'VIEW_USERS' },
        { name: 'Settings', href: '/dashboard/settings', icon: Settings, permission: 'VIEW_SETTINGS' },
    ]

    const filteredLinks = allLinks.filter(link => {
        if (role === 'ADMIN') return true
        if (role === 'SCOUT' && link.name === 'Scouts') return false
        if (link.permission) {
            return permissions.includes(link.permission)
        }
        return true
    })

    return (
        <>
            {filteredLinks.map((link) => {
                const LinkIcon = link.icon
                return (
                    <Link
                        key={link.name}
                        href={link.href}
                        className={clsx(
                            "flex h-[48px] grow items-center justify-start gap-2 rounded-md bg-gray-50 p-3 text-sm font-medium hover:bg-sky-100 hover:text-blue-600 dark:bg-gray-800 dark:text-gray-50 dark:hover:bg-gray-700 dark:hover:text-blue-600 md:flex-none md:justify-start md:p-2 md:px-3",
                            {
                                'bg-sky-100 text-blue-600 dark:bg-gray-700': pathname === link.href,
                            },
                        )}
                    >
                        <LinkIcon className="w-6" />
                        <p className="block">{link.name}</p>
                    </Link>
                )
            })}
        </>
    )
}
