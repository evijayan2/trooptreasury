"use client"

import { useState } from "react"
import { transferIBAToCampout } from "@/app/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Wallet } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"

export function IBAPayment({
    campoutId,
    linkedScouts,
    defaultAmount = 0,
    beneficiaryId,
    disabled = false,
    label = "Pay with IBA",
    className
}: {
    campoutId: string,
    linkedScouts: any[],
    defaultAmount?: number,
    beneficiaryId?: string,
    disabled?: boolean,
    label?: string,
    className?: string
}) {
    const [open, setOpen] = useState(false)
    const [selectedScout, setSelectedScout] = useState(linkedScouts[0]?.id || "")
    const [amount, setAmount] = useState(defaultAmount > 0 ? defaultAmount.toFixed(2) : "")
    const router = useRouter()

    const handlePay = async () => {
        if (!selectedScout || !amount) return
        const result = await transferIBAToCampout(campoutId, selectedScout, amount, beneficiaryId)
        if (result.success) {
            setOpen(false)
            setAmount("")
            toast.success("Payment Successful")
            router.refresh()
        } else {
            toast.error(result.error)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className={cn("w-full", className)} disabled={disabled}>
                    <Wallet className="w-4 h-4 mr-2" /> {label}
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Pay Camp Fees from IBA</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                    <div>
                        <label className="text-sm font-medium">Scout</label>
                        <Select value={selectedScout} onValueChange={setSelectedScout}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a scout" />
                            </SelectTrigger>
                            <SelectContent>
                                {linkedScouts.map(s => (
                                    <SelectItem key={s.id} value={s.id}>
                                        {s.name} (Bal: ${Number(s.ibaBalance).toFixed(2)})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <label className="text-sm font-medium">Amount ($)</label>
                        <Input
                            type="number"
                            step="0.01"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0.00"
                        />
                    </div>
                    <Button onClick={handlePay} className="w-full">
                        Transfer Funds
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
