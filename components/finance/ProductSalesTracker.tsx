"use client"

import { useState } from "react"
import { Scout, FundraisingCampaign, FundraisingSale } from "@prisma/client"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { recordProductSale } from "@/app/actions/finance"
import { toast } from "sonner"

type Props = {
    campaign: FundraisingCampaign & { sales: FundraisingSale[] }
    scouts: Scout[]
    initialSales: FundraisingSale[]
    liveOrderStats?: Record<string, number> // scoutId -> total quantity from orders
}

import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

export function ProductSalesTracker({ campaign, scouts, initialSales, liveOrderStats = {} }: Props) {
    // Map scoutId -> quantity
    const [sales, setSales] = useState<Record<string, number>>(() => {
        const acc: Record<string, number> = {}
        scouts.forEach(s => acc[s.id] = 0)
        initialSales.forEach(s => acc[s.scoutId] = s.quantity)
        return acc
    })

    const [isSaving, setIsSaving] = useState(false)
    const [searchTerm, setSearchTerm] = useState("")
    const [showActiveOnly, setShowActiveOnly] = useState(true)

    const handleQuantityChange = (scoutId: string, quantity: string) => {
        const val = parseInt(quantity) || 0
        setSales(prev => ({ ...prev, [scoutId]: val }))
    }

    const handleSave = async () => {
        setIsSaving(true)
        const salesData = Object.entries(sales).map(([scoutId, quantity]) => ({
            scoutId,
            quantity
        }))

        const formData = new FormData()
        formData.append("campaignId", campaign.id)
        formData.append("sales", JSON.stringify(salesData))

        const result = await recordProductSale(null, formData)

        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success("Sales saved successfully")
        }
        setIsSaving(false)
    }

    const filteredScouts = scouts.filter(s => {
        const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase())
        if (!matchesSearch) return false

        if (showActiveOnly) {
            const hasLiveOrders = (liveOrderStats[s.id] || 0) > 0
            const hasRecordedSales = (sales[s.id] || 0) > 0
            return hasLiveOrders || hasRecordedSales
        }
        return true
    })

    // Totals
    const totalItemsSold = Object.values(sales).reduce((a, b) => a + b, 0)
    const totalCollected = totalItemsSold * Number(campaign.productPrice || 0)
    const totalCost = totalItemsSold * Number(campaign.productCost || 0)
    const totalScoutEarnings = totalItemsSold * Number(campaign.productIba || 0)
    const totalTroopEarnings = totalCollected - totalCost - totalScoutEarnings

    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Pricing</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">${Number(campaign.productPrice).toFixed(2)}</div>
                        <p className="text-xs text-muted-foreground">Price per Item</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Profit</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">${Number(campaign.productIba).toFixed(2)}</div>
                        <p className="text-xs text-muted-foreground">Scout Share per Item</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Total Raised</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">${totalCollected.toFixed(2)}</div>
                        <div className="text-xs text-muted-foreground space-y-1 mt-1">
                            <div className="flex justify-between">
                                <span>Scouts Earned:</span>
                                <span className="text-green-600 font-semibold">${totalScoutEarnings.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Troop Fund:</span>
                                <span className="text-blue-600 font-semibold">${totalTroopEarnings.toFixed(2)}</span>
                            </div>
                            {Number(campaign.productCost) > 0 && (
                                <div className="flex justify-between text-gray-400">
                                    <span>Vendor Cost:</span>
                                    <span>${totalCost.toFixed(2)}</span>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Sales Record</CardTitle>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center space-x-2">
                            <Switch id="active-mode" checked={showActiveOnly} onCheckedChange={setShowActiveOnly} />
                            <Label htmlFor="active-mode">Active Only</Label>
                        </div>
                        <Input
                            placeholder="Search Scout..."
                            className="w-[200px]"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <Button onClick={handleSave} disabled={isSaving}>
                            {isSaving ? "Saving..." : "Save Changes"}
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Scout Name</TableHead>
                                <TableHead className="w-[100px] text-center">Live Orders (Qty)</TableHead>
                                <TableHead className="w-[150px]">Recorded Sales</TableHead>
                                <TableHead className="text-right">Collected ($)</TableHead>
                                <TableHead className="text-right">Scout Earned ($)</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredScouts.map(scout => {
                                const qty = sales[scout.id] || 0
                                const collected = qty * Number(campaign.productPrice || 0)
                                const earned = qty * Number(campaign.productIba || 0)
                                const hasActivity = qty > 0

                                return (
                                    <TableRow key={scout.id} className={hasActivity ? "bg-slate-50/50" : ""}>
                                        <TableCell className="font-medium">{scout.name}</TableCell>
                                        <TableCell className="text-center">
                                            {liveOrderStats[scout.id] ? (
                                                <span className="inline-flex items-center justify-center bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-semibold">
                                                    {liveOrderStats[scout.id]}
                                                </span>
                                            ) : "-"}
                                        </TableCell>
                                        <TableCell>
                                            <Input
                                                type="number"
                                                min="0"
                                                className="w-24 text-right"
                                                value={qty}
                                                onChange={(e) => handleQuantityChange(scout.id, e.target.value)}
                                            />
                                        </TableCell>
                                        <TableCell className="text-right">${collected.toFixed(2)}</TableCell>
                                        <TableCell className="text-right text-green-600 font-medium">${earned.toFixed(2)}</TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
