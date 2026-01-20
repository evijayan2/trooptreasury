"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { batchIBAPayout, payoutOrganizers, closeCampout } from "@/app/actions"
import { toast } from "sonner"
import { Loader2, Zap, CircleDollarSign, Lock } from "lucide-react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type PayoutAction = "iba" | "payout" | "close"

interface OrganizerPayout {
    adultId: string
    adultName: string
    pendingExpense: number
}

export function PayoutControls({
    campoutId,
    status,
    organizers = []
}: {
    campoutId: string,
    status: string,
    organizers?: OrganizerPayout[]
}) {
    const [loading, setLoading] = useState<string | null>(null)
    const [confirmAction, setConfirmAction] = useState<PayoutAction | null>(null)
    const [payoutAmounts, setPayoutAmounts] = useState<Record<string, number>>({})

    // Initialize payout amounts when dialog opens
    const handleOpenPayout = () => {
        const initialMap: Record<string, number> = {}
        organizers.forEach(org => {
            initialMap[org.adultId] = org.pendingExpense
        })
        setPayoutAmounts(initialMap)
        setConfirmAction("payout")
    }

    const executeAction = async (action: PayoutAction) => {
        setConfirmAction(null)
        setLoading(action)
        try {
            let res: any
            if (action === "iba") res = await batchIBAPayout(campoutId)
            else if (action === "payout") res = await payoutOrganizers(campoutId, payoutAmounts)
            else if (action === "close") res = await closeCampout(campoutId)

            if (res.success) {
                toast.success(res.message || "Action completed successfully")
            } else {
                toast.error(res.error || "An error occurred")
            }
        } catch (err: any) {
            toast.error(err.message || "Execution failed")
        } finally {
            setLoading(null)
        }
    }

    if (status === "CLOSED") {
        return (
            <div className="flex items-center gap-2 text-gray-500 font-medium">
                <Lock className="w-4 h-4" /> Campout Closed
            </div>
        )
    }

    const actionData = {
        iba: {
            title: "Batch Collect IBA",
            description: "Are you sure you want to collect IBA payments for all participants with outstanding balances?",
            buttonClass: "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200"
        },
        payout: {
            title: "Payout Organizers",
            description: "Distribute collected funds to organizers. You can adjust the amounts below.",
            buttonClass: "bg-green-50 text-green-700 hover:bg-green-100 border-green-200"
        },
        close: {
            title: "Close Campout",
            description: "Are you sure you want to close this campout? This will prevent further financial changes.",
            buttonClass: "bg-red-50 text-red-700 hover:bg-red-100 border-red-200"
        }
    }

    return (
        <>
            <div className="flex flex-wrap gap-2">
                <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setConfirmAction("iba")}
                    disabled={loading !== null}
                    className={actionData.iba.buttonClass}
                >
                    {loading === "iba" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
                    Batch Collect IBA
                </Button>

                <Button
                    size="sm"
                    variant="outline"
                    onClick={handleOpenPayout}
                    disabled={loading !== null}
                    className={actionData.payout.buttonClass}
                >
                    {loading === "payout" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CircleDollarSign className="w-4 h-4 mr-2" />}
                    Payout Organizers
                </Button>

                <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setConfirmAction("close")}
                    disabled={loading !== null}
                >
                    {loading === "close" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Lock className="w-4 h-4 mr-2" />}
                    Close Campout
                </Button>
            </div>

            <Dialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{confirmAction && actionData[confirmAction].title}</DialogTitle>
                        <DialogDescription>
                            {confirmAction && actionData[confirmAction].description}
                        </DialogDescription>
                    </DialogHeader>

                    {confirmAction === "payout" && (
                        <div className="space-y-4 py-4 max-h-[400px] overflow-y-auto px-1">
                            {organizers.length === 0 ? (
                                <p className="text-sm text-gray-500 text-center">No organizers found with pending expenses.</p>
                            ) : (
                                organizers.map(org => (
                                    <div key={org.adultId} className="flex items-center justify-between gap-4 border-b pb-4 last:border-0 last:pb-0">
                                        <div className="flex-1 min-w-0">
                                            <Label className="text-sm font-medium truncate block">{org.adultName}</Label>
                                            <span className="text-xs text-gray-500">Log: ${org.pendingExpense.toFixed(2)}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm text-gray-400">$</span>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                className="w-24 h-8 text-right"
                                                value={payoutAmounts[org.adultId] ?? ""}
                                                onChange={(e) => {
                                                    const val = parseFloat(e.target.value) || 0
                                                    setPayoutAmounts(prev => ({ ...prev, [org.adultId]: val }))
                                                }}
                                            />
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setConfirmAction(null)}>Cancel</Button>
                        <Button
                            variant={confirmAction === "close" ? "destructive" : "default"}
                            onClick={() => confirmAction && executeAction(confirmAction)}
                            disabled={confirmAction === "payout" && organizers.length === 0}
                        >
                            Confirm
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
