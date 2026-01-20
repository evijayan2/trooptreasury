"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { bulkRecordIBADeposits } from "@/app/actions/finance"
import { toast } from "sonner"
import { Search } from "lucide-react"

interface Scout {
    id: string
    name: string
    ibaBalance: any // Decimal comes as string/number depending on fetch
}

interface Props {
    triggerButton: React.ReactNode
    scouts: Scout[]
}

export function BulkIBADepositForm({ triggerButton, scouts }: Props) {
    const [open, setOpen] = useState(false)
    const [searchTerm, setSearchTerm] = useState("")
    const [description, setDescription] = useState("Initial IBA Deposit")
    const [notes, setNotes] = useState("")
    const [date, setDate] = useState(new Date().toISOString().split('T')[0])
    const [deposits, setDeposits] = useState<Record<string, string>>({})
    const [isSubmitting, setIsSubmitting] = useState(false)

    const filteredScouts = scouts.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const handleAmountChange = (scoutId: string, amount: string) => {
        setDeposits(prev => ({
            ...prev,
            [scoutId]: amount
        }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        const depositArray = Object.entries(deposits)
            .filter(([_, amount]) => amount && Number(amount) > 0)
            .map(([scoutId, amount]) => ({ scoutId, amount }))

        if (depositArray.length === 0) {
            toast.error("Please enter at least one deposit amount.")
            return
        }

        if (!description) {
            toast.error("Please enter a description.")
            return
        }

        setIsSubmitting(true)
        const formData = new FormData()
        formData.append("deposits", JSON.stringify(depositArray))

        // Append notes to description if present
        const fullDescription = notes ? `${description} | Notes: ${notes}` : description
        formData.append("description", fullDescription)

        formData.append("date", date)

        const result = await bulkRecordIBADeposits(null, formData)

        setIsSubmitting(false)
        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success(result.message)
            setOpen(false)
            setDeposits({})
            setNotes("")
            setSearchTerm("")
        }
    }

    const activeDepositCount = Object.values(deposits).filter(v => v && Number(v) > 0).length

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {triggerButton}
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Bulk IBA Setup</DialogTitle>
                </DialogHeader>

                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="bulk-desc">Description</Label>
                            <Input
                                id="bulk-desc"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="e.g., Initial Deposit from Paper Records"
                            />
                        </div>
                        <div>
                            <Label htmlFor="bulk-notes">Notes (Optional)</Label>
                            <Textarea
                                id="bulk-notes"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Additional details..."
                                className="resize-none h-20"
                            />
                        </div>
                    </div>
                    <div>
                        <Label htmlFor="bulk-date">Date</Label>
                        <Input
                            id="bulk-date"
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                        />
                    </div>
                </div>

                <div className="relative mb-4">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search scouts..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8"
                    />
                </div>

                <div className="flex-1 overflow-auto border rounded-md">
                    <table className="w-full text-sm">
                        <thead className="bg-muted sticky top-0">
                            <tr>
                                <th className="text-left p-2 font-medium">Scout Name</th>
                                <th className="text-right p-2 font-medium">Current Balance</th>
                                <th className="text-right p-2 font-medium w-32">Deposit Amount ($)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {filteredScouts.map(scout => (
                                <tr key={scout.id} className="hover:bg-muted/50">
                                    <td className="p-2">{scout.name}</td>
                                    <td className="p-2 text-right text-muted-foreground">
                                        ${Number(scout.ibaBalance).toFixed(2)}
                                    </td>
                                    <td className="p-2">
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={deposits[scout.id] || ""}
                                            onChange={(e) => handleAmountChange(scout.id, e.target.value)}
                                            placeholder="0.00"
                                            className="text-right"
                                        />
                                    </td>
                                </tr>
                            ))}
                            {filteredScouts.length === 0 && (
                                <tr>
                                    <td colSpan={3} className="p-8 text-center text-muted-foreground">
                                        No scouts found matching "{searchTerm}"
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="flex justify-between items-center pt-4">
                    <div className="text-sm text-muted-foreground">
                        {activeDepositCount} scouts selected for deposit
                    </div>
                    <div className="space-x-2">
                        <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                        <Button onClick={handleSubmit} disabled={isSubmitting || activeDepositCount === 0}>
                            {isSubmitting ? "Processing..." : "Confirm & Deposit"}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
