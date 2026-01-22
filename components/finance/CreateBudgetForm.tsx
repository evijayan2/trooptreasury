"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useState } from "react"
import { upsertBudget } from "@/app/actions/finance"
import { toast } from "sonner"

const schema = z.object({
    year: z.string().min(1, "Budget Name/Year is required"),
    isActive: z.boolean(),
    annualDuesAmount: z.string().min(1, "Amount is required"),
})

type FormData = z.infer<typeof schema>

export function CreateBudgetForm() {
    const [open, setOpen] = useState(false)

    const { register, handleSubmit, formState: { errors }, setValue, watch, reset } = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: {
            year: new Date().getFullYear().toString() + "-" + (new Date().getFullYear() + 1).toString(),
            isActive: true,
            annualDuesAmount: "150.00"
        }
    })

    const isActive = watch("isActive")

    const onSubmit = async (data: FormData) => {
        const formData = new FormData()
        formData.append("year", data.year)
        formData.append("annualDuesAmount", data.annualDuesAmount)
        if (data.isActive) formData.append("isActive", "on")

        const result = await upsertBudget(null, formData)

        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success("Budget created successfully")
            setOpen(false)
            reset()
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>Create New Budget</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create Annual Budget</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div>
                        <Label htmlFor="year">Budget Name / Year</Label>
                        <Input id="year" {...register("year")} placeholder="e.g. 2026-2027" />
                        <p className="text-xs text-muted-foreground mt-1">
                            Use a descriptive name like "2025-2026" or "Summer 2025".
                        </p>
                        {errors.year && <p className="text-red-500 text-sm">{errors.year.message}</p>}
                    </div>

                    <div>
                        <Label htmlFor="annualDuesAmount">Annual Dues Amount ($)</Label>
                        <Input id="annualDuesAmount" type="number" step="0.01" {...register("annualDuesAmount")} placeholder="150.00" />
                        {errors.annualDuesAmount && <p className="text-red-500 text-sm">{errors.annualDuesAmount.message}</p>}
                    </div>

                    <div className="flex items-center space-x-2 border p-3 rounded-md">
                        <Checkbox
                            id="isActive"
                            checked={isActive}
                            onCheckedChange={(c) => setValue("isActive", c === true)}
                        />
                        <div className="grid gap-1.5 leading-none">
                            <Label htmlFor="isActive">
                                Set as Active Budget
                            </Label>
                            <p className="text-sm text-muted-foreground">
                                Only one budget can be active at a time.
                            </p>
                        </div>
                    </div>

                    <div className="flex justify-end pt-4">
                        <Button type="submit">Create Budget</Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
