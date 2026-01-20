"use client"

import { useState } from "react"
import { finalizeCampoutCosts } from "@/app/actions"
import { Button } from "@/components/ui/button"
import { CheckCircle } from "lucide-react"
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { toast } from "sonner"

export function FinalizeCampoutButton({ campoutId }: { campoutId: string }) {
    const [loading, setLoading] = useState(false)

    const handleFinalize = async () => {
        if (!confirm("Are you sure you want to finalize costs? This will lock expenses and open payment collection.")) return

        setLoading(true)
        const result = await finalizeCampoutCosts(campoutId)
        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success("Campout finalized and payments opened")
        }
        setLoading(false)
    }

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Button onClick={handleFinalize} disabled={loading} variant="default" className="bg-primary hover:bg-primary/90">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    {loading ? "Finalizing..." : "Finalize & Open Payments"}
                </Button>
            </TooltipTrigger>
            <TooltipContent>
                <p>Lock expenses and enable payments for this campout</p>
            </TooltipContent>
        </Tooltip>
    )
}
