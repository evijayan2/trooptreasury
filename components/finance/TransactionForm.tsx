"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useState } from "react"
import { recordTransaction } from "@/app/actions/finance"
import { toast } from "sonner"
import { TransactionType } from "@prisma/client"

const schema = z.object({
    amount: z.string().min(1, "Amount is required"),
    type: z.nativeEnum(TransactionType),
    description: z.string().min(1, "Description is required"),
    date: z.string().min(1, "Date is required"),
    scoutId: z.string().optional(),
    campoutId: z.string().optional(),
    budgetCategoryId: z.string().optional(),
    fundraisingCampaignId: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface Props {
    triggerButton: React.ReactNode
    scouts: { id: string, name: string }[]
    campouts: { id: string, name: string }[]
    categories: { id: string, name: string }[]
    campaigns: { id: string, name: string }[]
}

export function TransactionForm({ triggerButton, scouts, campouts, categories, campaigns }: Props) {
    const [open, setOpen] = useState(false)

    const { register, handleSubmit, formState: { errors }, setValue, watch, reset } = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: {
            date: new Date().toISOString().split('T')[0],
            type: "EXPENSE"
        }
    })

    const type = watch("type")

    const onSubmit = async (data: FormData) => {
        const formData = new FormData()
        formData.append("amount", data.amount)
        formData.append("type", data.type)
        formData.append("description", data.description)
        formData.append("date", data.date)
        if (data.scoutId && data.scoutId !== "none") formData.append("scoutId", data.scoutId)
        if (data.campoutId && data.campoutId !== "none") formData.append("campoutId", data.campoutId)
        if (data.budgetCategoryId && data.budgetCategoryId !== "none") formData.append("budgetCategoryId", data.budgetCategoryId)
        if (data.fundraisingCampaignId && data.fundraisingCampaignId !== "none") formData.append("fundraisingCampaignId", data.fundraisingCampaignId)

        const result = await recordTransaction(null, formData)

        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success("Transaction recorded")
            setOpen(false)
            reset()
        }
    }

    // Dynamic field filtering based on type
    const showBudget = ["EXPENSE", "REGISTRATION_INCOME", "CAMP_TRANSFER", "REIMBURSEMENT"].includes(type)
    const showCampaign = ["FUNDRAISING_INCOME"].includes(type)
    const showScout = ["DUES", "FUNDRAISING_INCOME", "EVENT_PAYMENT", "IBA_RECLAIM"].includes(type)
    const showCampout = ["EVENT_PAYMENT", "EXPENSE", "REGISTRATION_INCOME", "CAMP_TRANSFER"].includes(type)

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {triggerButton}
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Record Transaction</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="type">Type</Label>
                            <Select onValueChange={(val: any) => setValue("type", val)} defaultValue="EXPENSE">
                                <SelectTrigger>
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="EXPENSE">Expense</SelectItem>
                                    <SelectItem value="REGISTRATION_INCOME">Income (General)</SelectItem>
                                    <SelectItem value="FUNDRAISING_INCOME">Fundraising Income</SelectItem>
                                    <SelectItem value="DONATION_IN">Donation</SelectItem>
                                    <SelectItem value="DUES">Dues Payment</SelectItem>
                                    <SelectItem value="EVENT_PAYMENT">Event Payment</SelectItem>
                                    <SelectItem value="REIMBURSEMENT">Reimbursement</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label htmlFor="date">Date</Label>
                            <Input id="date" type="date" {...register("date")} />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="amount">Amount ($)</Label>
                            <Input id="amount" type="number" step="0.01" {...register("amount")} />
                            {errors.amount && <p className="text-red-500 text-sm">{errors.amount.message}</p>}
                        </div>

                        <div>
                            <Label htmlFor="description">Description</Label>
                            <Input id="description" {...register("description")} placeholder="Payee or Details" />
                            {errors.description && <p className="text-red-500 text-sm">{errors.description.message}</p>}
                        </div>
                    </div>

                    <div className="border-t pt-4 grid grid-cols-2 gap-4">
                        {/* Conditional Fields */}
                        {showBudget && (
                            <div>
                                <Label htmlFor="category">Budget Category</Label>
                                <Select onValueChange={(val) => setValue("budgetCategoryId", val)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">-- None --</SelectItem>
                                        {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {showCampaign && (
                            <div>
                                <Label htmlFor="campaign">Fundraising Campaign</Label>
                                <Select onValueChange={(val) => setValue("fundraisingCampaignId", val)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Campaign" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">-- None --</SelectItem>
                                        {campaigns.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {showScout && (
                            <div>
                                <Label htmlFor="scout">Scout</Label>
                                <Select onValueChange={(val) => setValue("scoutId", val)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Scout" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">-- None --</SelectItem>
                                        {scouts.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {showCampout && (
                            <div>
                                <Label htmlFor="campout">Event/Campout</Label>
                                <Select onValueChange={(val) => setValue("campoutId", val)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Event" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">-- None --</SelectItem>
                                        {campouts.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end pt-4">
                        <Button type="submit">Record</Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
