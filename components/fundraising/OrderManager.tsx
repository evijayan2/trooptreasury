"use client"

import { useState } from "react"
import { FundraisingCampaign, FundraisingOrder } from "@prisma/client"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { addOrder, deleteOrder, toggleOrderDelivered } from "@/app/actions/finance"
import { toast } from "sonner"
import { Trash2 } from "lucide-react"

type Props = {
    campaign: FundraisingCampaign
    orders: FundraisingOrder[]
    scoutId?: string
}

export function OrderManager({ campaign, orders, scoutId }: Props) {
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Form State
    const [customerName, setCustomerName] = useState("")
    const [quantity, setQuantity] = useState("1")
    const [amountPaid, setAmountPaid] = useState("0")
    const [delivered, setDelivered] = useState(false)

    // Calculate Payment for convenience
    const handleQtyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const qty = e.target.value
        setQuantity(qty)
        // Auto-calc amount paid as full amount by default for convenience
        const numQty = parseInt(qty)
        if (!isNaN(numQty)) {
            setAmountPaid((numQty * Number(campaign.productPrice)).toFixed(2))
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)

        const formData = new FormData()
        formData.append("campaignId", campaign.id)
        formData.append("customerName", customerName)
        formData.append("quantity", quantity)
        formData.append("amountPaid", amountPaid)
        if (delivered) formData.append("delivered", "on")
        if (scoutId) formData.append("scoutId", scoutId)

        const result = await addOrder(null, formData)

        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success("Order added")
            setCustomerName("")
            setQuantity("1")
            setAmountPaid("0")
            setDelivered(false)
        }
        setIsSubmitting(false)
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure?")) return
        const result = await deleteOrder(id, campaign.id)
        if (result.error) toast.error(result.error)
        else toast.success("Deleted")
    }

    const handleToggle = async (id: string, current: boolean) => {
        await toggleOrderDelivered(id, campaign.id, current)
    }

    // Stats
    const totalQty = orders.reduce((acc, o) => acc + o.quantity, 0)
    const totalPaid = orders.reduce((acc, o) => acc + Number(o.amountPaid), 0)
    const totalDue = totalQty * Number(campaign.productPrice)
    const outstanding = totalDue - totalPaid

    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">My Total Sales</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalQty} items</div>
                        <p className="text-xs text-muted-foreground">Total Value: ${totalDue.toFixed(2)}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Cash Collected</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">${totalPaid.toFixed(2)}</div>
                        {outstanding > 0 && (
                            <p className="text-xs text-amber-600 font-semibold">Outstanding: ${outstanding.toFixed(2)}</p>
                        )}
                    </CardContent>
                </Card>
            </div>

            <div className="grid md:grid-cols-[1fr_2fr] gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Add New Order</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <Label>Customer Name</Label>
                                <Input required value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="e.g. John Doe" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Quantity</Label>
                                    <Input type="number" min="1" required value={quantity} onChange={handleQtyChange} />
                                </div>
                                <div>
                                    <Label>Paid ($)</Label>
                                    <Input type="number" min="0" step="0.01" required value={amountPaid} onChange={e => setAmountPaid(e.target.value)} />
                                </div>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox id="delivered" checked={delivered} onCheckedChange={(c) => setDelivered(c === true)} />
                                <Label htmlFor="delivered">Delivered?</Label>
                            </div>
                            <Button type="submit" className="w-full" disabled={isSubmitting}>
                                {isSubmitting ? "Adding..." : "Add Order"}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>My Orders</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Customer</TableHead>
                                    <TableHead>Qty</TableHead>
                                    <TableHead>Paid</TableHead>
                                    <TableHead>Delivered</TableHead>
                                    <TableHead></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {orders.map(order => (
                                    <TableRow key={order.id}>
                                        <TableCell className="font-medium">{order.customerName}</TableCell>
                                        <TableCell>{order.quantity}</TableCell>
                                        <TableCell>${Number(order.amountPaid).toFixed(2)}</TableCell>
                                        <TableCell>
                                            <Checkbox
                                                checked={order.delivered}
                                                onCheckedChange={() => handleToggle(order.id, order.delivered)}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Button variant="ghost" size="icon" onClick={() => handleDelete(order.id)}>
                                                <Trash2 className="h-4 w-4 text-red-500" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {orders.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center text-muted-foreground">No orders recorded yet.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
