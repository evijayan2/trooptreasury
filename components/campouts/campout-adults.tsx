"use client"

import { useState } from "react"
import { assignAdultToCampout } from "@/app/actions"
import { Button } from "@/components/ui/button"
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
import { Plus } from "lucide-react"
import { toast } from "sonner"

export function CampoutAdults({ campoutId, adults, allAdults }: { campoutId: string, adults: any[], allAdults: any[] }) {
    const [selectedAdult, setSelectedAdult] = useState<string>("")
    const [role, setRole] = useState<"ORGANIZER" | "ATTENDEE">("ORGANIZER")
    const [open, setOpen] = useState(false)

    // Show all adults - backend will handle duplicate assignment errors
    const available = allAdults

    const handleAssign = async () => {
        if (!selectedAdult) return
        const result = await assignAdultToCampout(campoutId, selectedAdult, role)
        if (result.success) {
            setOpen(false)
            setSelectedAdult("")
            setRole("ORGANIZER")
            toast.success("Adult assigned successfully")
        } else {
            toast.error(result.error)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm"><Plus className="w-4 h-4 mr-2" /> Add Adult</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Assign Adult</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Adult</label>
                        <Select onValueChange={setSelectedAdult} value={selectedAdult}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select an adult" />
                            </SelectTrigger>
                            <SelectContent>
                                {available.map(u => (
                                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Role</label>
                        <Select onValueChange={(val) => setRole(val as "ORGANIZER" | "ATTENDEE")} value={role}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select Role" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ORGANIZER">Organizer (Logs Expenses)</SelectItem>
                                <SelectItem value="ATTENDEE">Attendee (Pays Fee)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <Button onClick={handleAssign} disabled={!selectedAdult} className="w-full">
                        Assign
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
