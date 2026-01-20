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

import { PaymentRecorder } from "./payment-recorder"
import { formatCurrency } from "@/lib/utils"
import { toast } from "sonner"

export function CampoutRoster({ campoutId, registeredScouts, allScouts, canEdit = false, costPerPerson = 0 }: { campoutId: string, registeredScouts: any[], allScouts: any[], canEdit?: boolean, costPerPerson?: number }) {
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

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Scouts ({registeredScouts.length})</h3>
                {canEdit && (
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
                    {registeredScouts.map(({ scout, isPaid }) => (
                        <li key={scout.id} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-muted rounded-md text-sm">
                            <div className="flex items-center gap-2">
                                <span>{scout.name}</span>
                                {isPaid ? (
                                    <span className="px-2 py-0.5 bg-green-200 text-green-800 rounded text-xs font-bold">PAID</span>
                                ) : (
                                    <span className="text-xs text-red-500 font-semibold">{formatCurrency(costPerPerson)} Due</span>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                {canEdit && !isPaid && (
                                    <PaymentRecorder
                                        campoutId={campoutId}
                                        scoutId={scout.id}
                                        adultName={scout.name}
                                        defaultAmount={costPerPerson}
                                        label="Record Pay"
                                        className="h-7 px-2"
                                        variant="outline"
                                    />
                                )}
                                {canEdit && <RemoveParticipantButton campoutId={campoutId} id={scout.id} type="SCOUT" />}
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}
