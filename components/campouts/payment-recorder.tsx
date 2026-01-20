"use client"

import { useState } from "react"
import { recordAdultPayment, recordScoutPayment } from "@/app/actions"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DollarSign } from "lucide-react"
import { toast } from "sonner"

export function PaymentRecorder({
    campoutId,
    adultId,
    adultName = "Adult",
    defaultAmount = 0,
    label = "Record Pay",
    className = "ml-2",
    variant = "outline",
    scoutId
}: {
    campoutId: string,
    adultId?: string,
    scoutId?: string,
    adultName?: string,
    defaultAmount?: number,
    label?: string,
    className?: string,
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
}) {
    const [open, setOpen] = useState(false)
    const [amount, setAmount] = useState(defaultAmount > 0 ? defaultAmount.toFixed(2) : "")

    const handleRecord = async () => {
        if (!amount) return

        let result
        if (scoutId) {
            result = await recordScoutPayment(campoutId, scoutId, amount)
        } else if (adultId) {
            result = await recordAdultPayment(campoutId, adultId, amount)
        } else {
            return
        }

        if (result.success) {
            setOpen(false)
            setAmount("")
            toast.success("Payment recorded successfully")
        } else {
            toast.error(result.error)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant={variant} size="sm" className={className}>
                    <DollarSign className="w-3 h-3 mr-1" /> {label}
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Record Payment for {adultName}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                        <Label>Amount</Label>
                        <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                        />
                    </div>
                    <Button onClick={handleRecord} className="w-full">
                        Record Payment
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
