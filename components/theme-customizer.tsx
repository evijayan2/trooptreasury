"use client"

import * as React from "react"
import { Monitor, Palette } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { updateUserAppearance } from "@/app/actions"
import { toast } from "sonner"

interface ThemeCustomizerProps {
    initialColor?: string
    initialTheme?: string
}

export function ThemeCustomizer({ initialColor = "orange", initialTheme }: ThemeCustomizerProps) {
    const { theme, setTheme } = useTheme()

    // Initialize state with prop or default
    const [color, setColor] = React.useState<string>(initialColor)
    const [mounted, setMounted] = React.useState(false)

    React.useEffect(() => {
        setMounted(true)
        // Check localStorage first if available, otherwise use initialColor
        const savedColor = localStorage.getItem("theme-color")
        if (savedColor) {
            setColor(savedColor)
        } else {
            // Apply initial color if not in storage
            localStorage.setItem("theme-color", initialColor)
            document.documentElement.setAttribute("data-color", initialColor)
        }
    }, [initialColor])

    const handleThemeChange = async (newTheme: string) => {
        setTheme(newTheme)
        await updateUserAppearance(newTheme, color)
    }

    const setAppColor = async (c: string) => {
        setColor(c)
        localStorage.setItem("theme-color", c)
        document.documentElement.setAttribute("data-color", c)

        // Sync with DB
        const currentTheme = theme === 'system' ? 'system' : theme === 'dark' ? 'dark' : 'light'
        await updateUserAppearance(currentTheme, c)
        toast.success("Theme updated")
    }

    // Apply color attribute
    React.useEffect(() => {
        if (mounted) {
            document.documentElement.setAttribute("data-color", color)
        }
    }, [color, mounted])

    // Prevent hydration mismatch
    if (!mounted) {
        return (
            <Button variant="ghost" size="icon" className="w-full justify-start md:justify-center">
                <Palette className="h-[1.2rem] w-[1.2rem]" />
                <span className="ml-2 md:hidden">Theme</span>
            </Button>
        )
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" id="theme-trigger" className="w-full justify-start md:justify-center">
                    <Palette className="h-[1.2rem] w-[1.2rem]" />
                    <span className="ml-2 md:hidden">Theme</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuLabel>Mode</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => handleThemeChange("light")}>Light</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleThemeChange("dark")}>Dark</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleThemeChange("system")}>System</DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuLabel>Color</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => setAppColor("orange")}>
                    <div className="w-4 h-4 rounded-full bg-[#e48b2c] mr-2" />
                    Orange (Default)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setAppColor("blue")}>
                    <div className="w-4 h-4 rounded-full bg-blue-600 mr-2" />
                    Blue
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setAppColor("green")}>
                    <div className="w-4 h-4 rounded-full bg-green-600 mr-2" />
                    Green
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
