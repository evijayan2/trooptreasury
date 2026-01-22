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
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"

export function FinalizeCampoutButton({ campoutId }: { campoutId: string }) {
    const [loading, setLoading] = useState(false)

    const handleFinalize = async () => {
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
        <AlertDialog>
            <Tooltip>
                <TooltipTrigger asChild>
                    <AlertDialogTrigger asChild>
                        <Button disabled={loading} variant="default" className="bg-primary hover:bg-primary/90">
                            <CheckCircle className="w-4 h-4 mr-2" />
                            {loading ? "Finalizing..." : "Finalize & Open Payments"}
                        </Button>
                    </AlertDialogTrigger>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Lock expenses and enable payments for this campout</p>
                </TooltipContent>
            </Tooltip>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Finalize Campout Costs?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action will lock all expense logging and roster modifications. It will calculate the final cost per person and open the campout for payment collection. This cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleFinalize}>Finalize & Open Payments</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}
