"use client"

import { useActionState, useState } from "react"
import { registerScoutForCampout } from "@/app/actions"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
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
import { Plus } from "lucide-react"
import { RemoveParticipantButton } from "./remove-participant-button"
import { IBAPayment } from "./iba-payment"
import { PaymentRecorder } from "./payment-recorder"
import { formatCurrency } from "@/lib/utils"
import { toast } from "sonner"

export function CampoutRoster({
    campoutId,
    registeredScouts,
    allScouts,
    canEdit = false,
    costPerPerson = 0,
    campoutStatus = "OPEN"
}: {
    campoutId: string,
    registeredScouts: any[],
    allScouts: any[],
    canEdit?: boolean,
    costPerPerson?: number,
    campoutStatus?: string
}) {
    const [selectedScout, setSelectedScout] = useState<string>("")
    const [open, setOpen] = useState(false)

    // Filter out scouts already registered
    const availableScouts = allScouts.filter(s => !registeredScouts.some(rs => rs.scoutId === s.id))

    const handleRegister = async () => {
        if (!selectedScout) return
        const result = await registerScoutForCampout(campoutId, selectedScout)
        if (result.success) {
            setOpen(false)
            setSelectedScout("")
            toast.success("Scout registered successfully")
        } else {
            toast.error(result.error)
        }
    }

    const canModifyRoster = canEdit && campoutStatus === "OPEN"

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Scouts ({registeredScouts.length})</h3>
                {canModifyRoster && (
                    <Dialog open={open} onOpenChange={setOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="sm"><Plus className="w-4 h-4 mr-2" /> Add Scout</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Register Scout</DialogTitle>
                                <DialogDescription>
                                    Add a scout to this campout roster.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 pt-4">
                                <Select onValueChange={setSelectedScout} value={selectedScout}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a scout" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableScouts.map(scout => (
                                            <SelectItem key={scout.id} value={scout.id}>{scout.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Button onClick={handleRegister} disabled={!selectedScout} className="w-full">
                                    Register
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                )}
            </div>

            {registeredScouts.length === 0 ? (
                <p className="text-sm text-gray-500">No scouts registered yet.</p>
            ) : (
                <ul className="space-y-2">
                    {registeredScouts.map(({ scout, isPaid, remainingDue = costPerPerson }) => (
                        <li key={scout.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-muted rounded text-sm">
                            <div className="flex items-center gap-2">
                                <span>{scout.name}</span>
                                {canModifyRoster && <RemoveParticipantButton campoutId={campoutId} id={scout.id} type="SCOUT" />}
                            </div>
                            <div className="flex items-center gap-2">
                                {isPaid ? (
                                    <span className="px-2 py-0.5 bg-green-200 text-green-800 rounded text-xs font-bold">PAID</span>
                                ) : (
                                    <span className="text-xs text-red-500 font-semibold">{formatCurrency(remainingDue)} Due</span>
                                )}
                                {canEdit && !isPaid && campoutStatus !== "OPEN" && (
                                    <>
                                        <IBAPayment
                                            campoutId={campoutId}
                                            linkedScouts={[scout]}
                                            defaultAmount={remainingDue}
                                            disabled={Number(scout.ibaBalance) <= 0}
                                            label="Pay IBA"
                                            className="w-auto h-7 px-2 text-xs"
                                        />
                                        <PaymentRecorder
                                            campoutId={campoutId}
                                            scoutId={scout.id}
                                            adultName={scout.name}
                                            defaultAmount={remainingDue}
                                            label="Record Pay"
                                            className="h-7 px-2 text-xs"
                                            variant="outline"
                                        />
                                    </>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}
