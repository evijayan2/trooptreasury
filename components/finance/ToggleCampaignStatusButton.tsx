"use client"

import { Button } from "@/components/ui/button"
import { StopCircle } from "lucide-react"
import { toggleFundraisingStatus } from "@/app/actions/finance"
import { toast } from "sonner"
import { FundraisingStatus } from "@prisma/client"
// Prisma Enums are usually available if exported from client. 
// But safely we can accept props as string or use the Enum if supported.
// Let's use string checks to avoid client-side bundling issues if any.

interface ToggleCampaignStatusButtonProps {
    id: string
    currentStatus: 'ACTIVE' | 'CLOSED' | string
    name: string
}

export function ToggleCampaignStatusButton({ id, currentStatus, name }: ToggleCampaignStatusButtonProps) {
    const isClosed = currentStatus === 'CLOSED'
    if (isClosed) return null

    const actionLabel = "Close"

    const handleToggle = async () => {
        const res = await toggleFundraisingStatus(id)
        if (res.error) {
            toast.error(res.error)
        } else {
            toast.success(res.message)
        }
    }

    return (
        <Button
            variant="ghost"
            size="sm"
            className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
            onClick={handleToggle}
            title={`${actionLabel} Campaign`}
        >
            <StopCircle className="w-4 h-4 mr-1" />
            {actionLabel}
        </Button>
    )
}
