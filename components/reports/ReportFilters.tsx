"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CalendarIcon, FilterX } from "lucide-react"

export function ReportFilters() {
    const router = useRouter()
    const searchParams = useSearchParams()

    const [from, setFrom] = useState(searchParams.get("from") || "")
    const [to, setTo] = useState(searchParams.get("to") || "")

    const handleGenerate = () => {
        const params = new URLSearchParams()
        if (from) params.set("from", from)
        if (to) params.set("to", to)

        router.push(`/dashboard/reports?${params.toString()}`)
    }

    const handleClear = () => {
        setFrom("")
        setTo("")
        router.push("/dashboard/reports")
    }

    return (
        <div className="flex flex-col md:flex-row gap-4 items-end bg-gray-50 dark:bg-gray-900 p-4 rounded-lg border">
            <div className="grid gap-2 w-full md:w-auto">
                <Label htmlFor="from-date" className="flex items-center gap-2">
                    Start Date
                </Label>
                <Input
                    id="from-date"
                    type="date"
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                    className="w-full md:w-[180px]"
                />
            </div>

            <div className="grid gap-2 w-full md:w-auto">
                <Label htmlFor="to-date" className="flex items-center gap-2">
                    End Date
                </Label>
                <Input
                    id="to-date"
                    type="date"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    className="w-full md:w-[180px]"
                />
            </div>

            <div className="flex gap-2 w-full md:w-auto mt-2 md:mt-0">
                <Button onClick={handleGenerate} className="flex-1 md:flex-none">
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    Generate Report
                </Button>
                {(from || to) && (
                    <Button variant="outline" onClick={handleClear} title="Clear Filters">
                        <FilterX className="w-4 h-4" />
                    </Button>
                )}
            </div>
        </div>
    )
}
