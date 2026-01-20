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
import { createFundraiser } from "@/app/actions/finance"
import { toast } from "sonner"

const schema = z.object({
    name: z.string().min(1, "Name is required"),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().optional(),
    goal: z.string().min(1, "Goal is required"),
    isComplianceApproved: z.boolean().default(false),
    ibaPercentage: z.string().default("0"),
})

type FormData = z.infer<typeof schema>

export function FundraisingForm({ triggerButton }: { triggerButton: React.ReactNode }) {
    const [open, setOpen] = useState(false)

    const { register, handleSubmit, formState: { errors }, setValue, watch, reset } = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: {
            isComplianceApproved: false,
            ibaPercentage: "0"
        }
    })

    const isComplianceApproved = watch("isComplianceApproved")
    const ibaPercentage = watch("ibaPercentage")

    const onSubmit = async (data: FormData) => {
        const formData = new FormData()
        formData.append("name", data.name)
        formData.append("startDate", data.startDate)
        if (data.endDate) formData.append("endDate", data.endDate)
        formData.append("goal", data.goal)
        if (data.isComplianceApproved) formData.append("isComplianceApproved", "on")
        formData.append("ibaPercentage", data.ibaPercentage)

        const result = await createFundraiser(null, formData)

        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success("Campaign created")
            setOpen(false)
            reset()
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {triggerButton}
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>New Fundraising Campaign</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div>
                        <Label htmlFor="name">Campaign Name</Label>
                        <Input id="name" {...register("name")} placeholder="e.g. Fall Popcorn Sale" />
                        {errors.name && <p className="text-red-500 text-sm">{errors.name.message}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="startDate">Start Date</Label>
                            <Input id="startDate" type="date" {...register("startDate")} />
                            {errors.startDate && <p className="text-red-500 text-sm">{errors.startDate.message}</p>}
                        </div>
                        <div>
                            <Label htmlFor="endDate">End Date</Label>
                            <Input id="endDate" type="date" {...register("endDate")} />
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="goal">Goal Amount ($)</Label>
                        <Input id="goal" type="number" step="100" {...register("goal")} />
                    </div>

                    <div className="flex items-center space-x-2 border p-3 rounded-md">
                        <Checkbox
                            id="isComplianceApproved"
                            checked={isComplianceApproved}
                            onCheckedChange={(c) => setValue("isComplianceApproved", c === true)}
                        />
                        <div className="grid gap-1.5 leading-none">
                            <Label htmlFor="isComplianceApproved">
                                Council Approved?
                            </Label>
                            <p className="text-sm text-muted-foreground">
                                Unit Money-Earning Application (#34427) submitted/approved.
                            </p>
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="ibaPercentage">Scout Allocation (%)</Label>
                        <Input id="ibaPercentage" type="number" min="0" max="100" {...register("ibaPercentage")} />
                        <p className="text-xs text-muted-foreground mt-1">
                            Percentage of proceeds credited to Scout IBAs.
                            {Number(ibaPercentage) > 30 && <span className="text-amber-500 block font-semibold">Warning: Allocation &gt; 30% may risk compliance.</span>}
                        </p>
                    </div>

                    <div className="flex justify-end pt-4">
                        <Button type="submit">Create Campaign</Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
