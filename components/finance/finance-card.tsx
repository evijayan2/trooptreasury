'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { formatCurrency } from "@/lib/utils"
import * as React from "react"

import { DataTableExport } from "@/components/ui/data-table-export"

export interface TransactionItem {
    description: string
    amount: number
    date?: string
}

interface FinanceCardProps {
    title: string
    value: number
    description: string
    icon: React.ReactNode
    items: TransactionItem[]
    valueClassName?: string
    headerInfo?: {
        troopName?: string
        council?: string
        district?: string
        address?: string
    }
}

export function FinanceCard({ title, value, description, icon, items, valueClassName, headerInfo }: FinanceCardProps) {
    const [dateStr, setDateStr] = React.useState("")

    React.useEffect(() => {
        setDateStr(new Date().toISOString().split('T')[0])
    }, [])

    const columns = [
        { header: "Description", accessorKey: "description" as keyof TransactionItem },
        { header: "Date", accessorKey: "date" as keyof TransactionItem },
        { header: "Amount", accessorKey: "amount" as keyof TransactionItem },
    ]

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{title}</CardTitle>
                        {icon}
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${valueClassName}`}>
                            {formatCurrency(value)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {description}
                        </p>
                    </CardContent>
                </Card>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
                <DialogHeader className="flex flex-row items-center justify-between pr-8">
                    <DialogTitle>{title} - Breakdown</DialogTitle>
                    <DataTableExport
                        data={items}
                        columns={columns}
                        filename={`TroopTreasury_${title.replace(/\s+/g, '_')}_${dateStr}`}
                        title={`${title} Breakdown`}
                        headerInfo={headerInfo}
                    />
                </DialogHeader>
                <div className="max-h-[60vh] overflow-y-auto pr-2 mt-4">
                    <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-background border-b z-10">
                            <tr>
                                <th className="text-left py-2 font-medium text-muted-foreground">Description</th>
                                <th className="text-right py-2 font-medium text-muted-foreground">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {items.length > 0 ? (
                                items.map((item, idx) => (
                                    <tr key={idx}>
                                        <td className="py-2">
                                            <div>{item.description}</div>
                                            {item.date && <div className="text-[10px] text-muted-foreground">{item.date}</div>}
                                        </td>
                                        <td className={`py-2 text-right font-mono ${item.amount < 0 ? 'text-red-500' : 'text-green-600'}`}>
                                            {formatCurrency(item.amount)}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={2} className="py-8 text-center text-muted-foreground italic">No transactions found</td>
                                </tr>
                            )}
                        </tbody>
                        {items.length > 0 && (
                            <tfoot className="border-t font-bold">
                                <tr>
                                    <td className="py-3">Total</td>
                                    <td className={`py-3 text-right ${value < 0 ? 'text-red-500' : 'text-green-600'}`}>
                                        {formatCurrency(value)}
                                    </td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </DialogContent>
        </Dialog>
    )
}
