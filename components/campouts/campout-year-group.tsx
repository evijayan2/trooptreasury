"use client"

import { useState } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CampoutList } from "./campout-list"
import { cn } from "@/lib/utils"

interface CampoutYearGroupProps {
    year: number
    campouts: any[] // Using any[] to match CampoutList props, ideally should be typed shared interface
    defaultOpen?: boolean
}

export function CampoutYearGroup({ year, campouts, defaultOpen = false }: CampoutYearGroupProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen)

    return (
        <div className="space-y-4">
            <div
                className="flex items-center gap-2 cursor-pointer group select-none"
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 group-hover:bg-gray-200 transition-colors">
                    {isOpen ? (
                        <ChevronDown className="w-4 h-4 text-gray-600" />
                    ) : (
                        <ChevronRight className="w-4 h-4 text-gray-600" />
                    )}
                </div>
                <h2 className="text-xl font-semibold text-gray-800">{year}</h2>
                <div className="h-px flex-1 bg-gray-200" />
            </div>

            <div className={cn(
                "grid transition-all duration-300 ease-in-out",
                isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
            )}>
                <div className="overflow-hidden">
                    <CampoutList campouts={campouts} />
                </div>
            </div>
        </div>
    )
}
