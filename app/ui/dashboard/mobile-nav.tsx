"use client"

import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Menu } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useState } from "react"
import { NavLinks } from "./nav-links"
import { ThemeCustomizer } from "@/components/theme-customizer"
import { Permission } from "@/lib/rbac"
import { Role } from "@prisma/client"

interface MobileNavProps {
    role?: Role
    permissions: Permission[]
    scoutId?: string
    initialColor: string
    initialTheme: string
    user?: {
        name?: string | null
        email?: string | null
    }
}

export function MobileNav({ role, permissions, scoutId, initialColor, initialTheme, user }: MobileNavProps) {
    const [open, setOpen] = useState(false)

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                    <Menu className="h-6 w-6" />
                    <span className="sr-only">Toggle menu</span>
                </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px] sm:w-[400px] p-0">
                <SheetHeader className="p-4 border-b">
                    <SheetTitle className="text-left flex items-center gap-2">
                        <div className="relative h-10 w-10">
                            <Image
                                src="/trooptreasury-logo-main.png"
                                alt="TroopTreasury Logo"
                                fill
                                className="object-contain"
                            />
                        </div>
                        TroopTreasury
                    </SheetTitle>
                </SheetHeader>
                <div className="flex flex-col h-full">
                    <div className="flex-1 overflow-y-auto p-4 space-y-2">
                        <NavLinks role={role} permissions={permissions} scoutId={scoutId} />
                    </div>
                    <div className="p-4 border-t space-y-4">
                        <div className="flex items-center justify-between">
                            <ThemeCustomizer initialColor={initialColor} initialTheme={initialTheme} />
                        </div>
                        {user && (
                            <div className="rounded-md bg-muted p-3">
                                <p className="text-sm font-semibold truncate">
                                    {user.name || "Troop User"}
                                </p>
                                <p className="text-xs font-bold text-primary uppercase tracking-wider">
                                    {role}
                                </p>
                            </div>
                        )}
                        <form action="/api/auth/signout" method="POST">
                            <Button variant="outline" className="w-full justify-start gap-2" type="submit">
                                Sign Out
                            </Button>
                        </form>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    )
}
