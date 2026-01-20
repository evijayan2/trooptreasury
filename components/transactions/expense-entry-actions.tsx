"use client"

import { useState } from "react"
import { deleteTransaction, deleteAdultExpense, updateTransaction, updateAdultExpense } from "@/app/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"

interface expenseEntryActionsProps {
    id: string
    type: "TRANSACTION" | "ADULT_EXPENSE"
    initialDescription: string
    initialAmount: number
    canEdit?: boolean
}

export function ExpenseEntryActions({ id, type, initialDescription, initialAmount, canEdit = true }: expenseEntryActionsProps) {
    const [open, setOpen] = useState(false)
    const [description, setDescription] = useState(initialDescription)
    const [amount, setAmount] = useState(initialAmount)

    if (!canEdit) return null

    const handleDelete = async () => {
        if (!confirm("Are you sure you want to delete this entry?")) return

        let result
        if (type === "TRANSACTION") {
            result = await deleteTransaction(id)
        } else {
            result = await deleteAdultExpense(id)
        }

        if (result?.success) {
            toast.success("Entry deleted")
        } else if (result?.error) {
            toast.error(result.error)
        }
    }

    const handleUpdate = async (formData: FormData) => {
        let result
        if (type === "TRANSACTION") {
            result = await updateTransaction(id, formData)
        } else {
            result = await updateAdultExpense(id, formData)
        }

        if (result.success) {
            setOpen(false)
            toast.success("Entry updated")
        } else {
            toast.error(result.error)
        }
    }

    return (
        <div className="flex items-center gap-2">
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-primary">
                        <Pencil className="w-4 h-4" />
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Expense</DialogTitle>
                    </DialogHeader>
                    <form action={handleUpdate} className="space-y-4 pt-4">
                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Input
                                id="description"
                                name="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="amount">Amount ($)</Label>
                            <Input
                                id="amount"
                                name="amount"
                                type="number"
                                step="0.01"
                                value={amount}
                                onChange={(e) => setAmount(Number(e.target.value))}
                                required
                            />
                        </div>
                        <Button type="submit" className="w-full">Update</Button>
                    </form>
                </DialogContent>
            </Dialog>

            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-red-600" onClick={handleDelete}>
                <Trash2 className="w-4 h-4" />
            </Button>
        </div>
    )
}
