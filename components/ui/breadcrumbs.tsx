"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { ChevronRight, Home } from "lucide-react"

export function Breadcrumbs() {
    const pathname = usePathname()
    const pathSegments = pathname.split("/").filter(segment => segment !== "")
    console.log("Breadcrumbs - Pathname:", pathname)
    console.log("Breadcrumbs - Segments:", pathSegments)

    // Map strict segment names to readable labels
    const segmentLabels: Record<string, string> = {
        dashboard: "Dashboard",
        campouts: "Campouts",
        scouts: "Scouts",
        users: "Users",
        transactions: "Transactions",
        settings: "Settings",
        login: "Logging In...", // Should not see this for long
    }

    return (
        <nav aria-label="Breadcrumb" className="mb-4 flex items-center text-sm text-gray-500 dark:text-gray-400">
            <ol className="flex items-center gap-1">
                {/* Home / Dashboard Root */}
                <li className="flex items-center">
                    <Link
                        href="/dashboard"
                        className="flex items-center gap-1 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                    >
                        <Home className="w-4 h-4" />
                        <span className="hidden md:block">Dashboard</span>
                    </Link>
                </li>

                {pathSegments.map((segment, index) => {
                    // Skip "dashboard" as it's handled by Home icon often, or we can keep it.
                    // If pathname is /dashboard, segments is ['dashboard'].
                    // We already have Home icon pointing to /dashboard.
                    // So we can skip the first segment if it is 'dashboard'.
                    if (segment === "dashboard") return null

                    const href = "/" + pathSegments.slice(0, index + 1).join("/")
                    const isLast = index === pathSegments.length - 1

                    // Try to make label readable
                    // If it looks like a CUID/UUID, shorten it or show generic "Details"?
                    // Or keep it as is if we can't fetch the name easily client-side without layout data.
                    // For now, let's check strict map, otherwise capitalize or show segment.
                    let label = segmentLabels[segment]
                    if (!label) {
                        // Check if it looks like an ID (long alphanumeric)
                        if (segment.length > 20 && /\d/.test(segment)) {
                            label = "Details"
                        } else {
                            // Capitalize
                            label = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " ")
                        }
                    }

                    return (
                        <li key={href} className="flex items-center gap-1">
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                            {isLast ? (
                                <span className="font-medium text-gray-900 dark:text-gray-100 px-1 border-b border-transparent">
                                    {label}
                                </span>
                            ) : (
                                <Link
                                    href={href}
                                    className="hover:text-gray-900 dark:hover:text-gray-100 transition-colors px-1"
                                >
                                    {label}
                                </Link>
                            )}
                        </li>
                    )
                })}
            </ol>
        </nav>
    )
}
