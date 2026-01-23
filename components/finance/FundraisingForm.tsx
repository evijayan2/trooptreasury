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
    isComplianceApproved: z.boolean(),
    ibaPercentage: z.string(),
    type: z.enum(["GENERAL", "PRODUCT_SALE"]),
    productName: z.string().optional(),
    productPrice: z.string().optional(),
    productCost: z.string().optional(),
    productIba: z.string().optional(),
}).refine(data => {
    if (data.type === 'PRODUCT_SALE') {
        return !!data.productName && !!data.productPrice && !!data.productIba
    }
    return true
}, {
    message: "Product details are required",
    path: ["productName"]
})

type FormData = z.infer<typeof schema>

export function FundraisingForm({ triggerButton }: { triggerButton: React.ReactNode }) {
    const [open, setOpen] = useState(false)

    const { register, handleSubmit, formState: { errors }, setValue, watch, reset } = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: {
            isComplianceApproved: false,
            ibaPercentage: "0",
            type: "GENERAL"
        }
    })

    const isComplianceApproved = watch("isComplianceApproved")
    const ibaPercentage = watch("ibaPercentage")
    const type = watch("type")

    const onSubmit = async (data: FormData) => {
        const formData = new FormData()
        formData.append("name", data.name)
        formData.append("startDate", data.startDate)
        if (data.endDate) formData.append("endDate", data.endDate)
        formData.append("goal", data.goal)
        if (data.isComplianceApproved) formData.append("isComplianceApproved", "on")
        formData.append("ibaPercentage", data.ibaPercentage)
        formData.append("type", data.type)
        if (data.type === 'PRODUCT_SALE') {
            formData.append("productName", data.productName || "")
            formData.append("productPrice", data.productPrice || "")
            formData.append("productCost", data.productCost || "")
            formData.append("productIba", data.productIba || "")
        }

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
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>New Fundraising Campaign</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div>
                        <Label htmlFor="name">Campaign Name</Label>
                        <Input id="name" {...register("name")} placeholder="e.g. Fall Popcorn Sale" />
                        {errors.name && <p className="text-red-500 text-sm">{errors.name.message}</p>}
                    </div>

                    <div>
                        <Label>Campaign Type</Label>
                        <div className="flex gap-4 mt-2">
                            <label className="flex items-center space-x-2 border p-3 rounded-md cursor-pointer has-[:checked]:bg-blue-50 has-[:checked]:border-blue-500">
                                <input type="radio" value="GENERAL" {...register("type")} className="text-blue-600 focus:ring-blue-500" />
                                <div>
                                    <span className="block font-medium">General / Donation</span>
                                    <span className="text-xs text-muted-foreground">% based allocation</span>
                                </div>
                            </label>
                            <label className="flex items-center space-x-2 border p-3 rounded-md cursor-pointer has-[:checked]:bg-blue-50 has-[:checked]:border-blue-500">
                                <input type="radio" value="PRODUCT_SALE" {...register("type")} className="text-blue-600 focus:ring-blue-500" />
                                <div>
                                    <span className="block font-medium">Product Sale</span>
                                    <span className="text-xs text-muted-foreground">Per-item allocation</span>
                                </div>
                            </label>
                        </div>
                    </div>

                    {type === 'PRODUCT_SALE' && (
                        <div className="space-y-4 p-4 bg-slate-50 rounded-lg border">
                            <h4 className="font-semibold text-sm text-slate-700">Product Details</h4>
                            <div>
                                <Label htmlFor="productName">Product Name</Label>
                                <Input id="productName" placeholder="e.g. Popcorn Box" {...register("productName")} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="productPrice">Cost per Item ($)</Label>
                                    <Input id="productPrice" type="number" step="0.01" {...register("productPrice")} />
                                    <p className="text-xs text-muted-foreground mt-1">Price scout sells for</p>
                                </div>
                                <div>
                                    <Label htmlFor="productCost">Vendor Cost ($)</Label>
                                    <Input id="productCost" type="number" step="0.01" {...register("productCost")} />
                                    <p className="text-xs text-muted-foreground mt-1">Cost to buy from vendor</p>
                                </div>
                                <div>
                                    <Label htmlFor="productIba">Scout Profit ($)</Label>
                                    <Input id="productIba" type="number" step="0.01" {...register("productIba")} />
                                    <p className="text-xs text-muted-foreground mt-1">Amount credited to scout per sale</p>
                                </div>
                            </div>
                            {errors.productName && <p className="text-red-500 text-sm">Product details are required</p>}
                        </div>
                    )}

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

                    {type === 'GENERAL' && (
                        <div>
                            <Label htmlFor="ibaPercentage">Scout Allocation (%)</Label>
                            <Input id="ibaPercentage" type="number" min="0" max="100" {...register("ibaPercentage")} />
                            <p className="text-xs text-muted-foreground mt-1">
                                Percentage of proceeds credited to Scout IBAs.
                                {Number(ibaPercentage) > 30 && <span className="text-amber-500 block font-semibold">Warning: Allocation &gt; 30% may risk compliance.</span>}
                            </p>
                        </div>
                    )}

                    <div className="flex justify-end pt-4">
                        <Button type="submit">Create Campaign</Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
