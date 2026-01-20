"use client"

import { Button } from "@/components/ui/button"
import { PlayCircle, StopCircle } from "lucide-react"
import { toggleFundraisingStatus } from "@/app/actions/finance"
import { toast } from "sonner"
import { FundraisingStatus } from "@/lib/generated/client"
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
    const actionLabel = isClosed ? "Activate" : "Close"

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
            className={isClosed ? "text-green-600 hover:text-green-700 hover:bg-green-50" : "text-amber-600 hover:text-amber-700 hover:bg-amber-50"}
            onClick={handleToggle}
            title={`${actionLabel} Campaign`}
        >
            {isClosed ? <PlayCircle className="w-4 h-4 mr-1" /> : <StopCircle className="w-4 h-4 mr-1" />}
            {actionLabel}
        </Button>
    )
}
