"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { formatCurrency } from "@/lib/utils"

interface FinancialReportProps {
    transactions: any[]
    expenses: any[]
}

export function FinancialReport({ transactions, expenses }: FinancialReportProps) {
    // 1. Calculate Income (Collection)
    const ibaIncome = transactions
        .filter(t => t.type === "CAMP_TRANSFER" && t.status === "APPROVED")
        .reduce((sum, t) => sum + Number(t.amount), 0)

    const cashIncome = transactions
        .filter(t => ["EVENT_PAYMENT", "REGISTRATION_INCOME"].includes(t.type) && t.status === "APPROVED")
        .reduce((sum, t) => sum + Number(t.amount), 0)

    const totalIncome = ibaIncome + cashIncome

    // 2. Calculate Expenses
    const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0)

    // 3. Organizer Distribution (Who spent what)
    // Map adultId -> { name, spent, reimbursed }
    const organizerStats = new Map<string, { name: string, spent: number, reimbursed: number }>()

    // Process Expenses
    expenses.forEach(e => {
        if (!e.adult) return
        const stat = organizerStats.get(e.adultId) || { name: e.adult.name, spent: 0, reimbursed: 0 }
        stat.spent += Number(e.amount)
        if (e.isReimbursed) {
            stat.reimbursed += Number(e.amount)
        }
        organizerStats.set(e.adultId, stat)
    })

    const organizerList = Array.from(organizerStats.values())

    // 4. Detailed Payment Log
    const paymentLog = transactions
        .filter(t => ["CAMP_TRANSFER", "EVENT_PAYMENT", "REGISTRATION_INCOME"].includes(t.type) && t.status === "APPROVED")
        .map(t => ({
            id: t.id,
            date: t.createdAt,
            // Try to find name: scout name OR user name
            // If it's an IBA transfer for an adult, show both
            name: t.user?.name && t.scout?.name && t.type === "CAMP_TRANSFER"
                ? `${t.user.name} (from ${t.scout.name} IBA)`
                : (t.scout?.name || t.user?.name || "Unknown"),
            amount: Number(t.amount),
            type: t.type === "CAMP_TRANSFER" ? "IBA Transfer" : "Cash/Direct"
        }))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-semibold">Financial Report</h2>

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">Total Collected</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{formatCurrency(totalIncome)}</div>
                        <div className="text-xs text-gray-500 mt-1 flex flex-col gap-1">
                            <span>IBA: {formatCurrency(ibaIncome)}</span>
                            <span>Cash: {formatCurrency(cashIncome)}</span>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">Total Expenses</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{formatCurrency(totalExpenses)}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">Net Balance</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${totalIncome - totalExpenses >= 0 ? 'text-foreground' : 'text-red-600'}`}>
                            {formatCurrency(totalIncome - totalExpenses)}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Organizer Distribution */}
                <Card className="h-fit">
                    <CardHeader>
                        <CardTitle className="text-base">Organizer Expenses & Reimbursement</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Organizer</TableHead>
                                    <TableHead className="text-right">Spent</TableHead>
                                    <TableHead className="text-right">Reimbursed</TableHead>
                                    <TableHead className="text-right">Pending</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {organizerList.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center text-gray-500">No expenses logged.</TableCell>
                                    </TableRow>
                                ) : (
                                    organizerList.map((org, idx) => (
                                        <TableRow key={idx}>
                                            <TableCell className="font-medium">{org.name}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(org.spent)}</TableCell>
                                            <TableCell className="text-right text-green-600">{formatCurrency(org.reimbursed)}</TableCell>
                                            <TableCell className="text-right font-bold text-red-600">
                                                {formatCurrency(org.spent - org.reimbursed)}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Payment Log */}
                <Card className="h-fit">
                    <CardHeader>
                        <CardTitle className="text-base">Payment Log</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="max-h-[300px] overflow-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Payer</TableHead>
                                        <TableHead>Method</TableHead>
                                        <TableHead className="text-right">Amount</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paymentLog.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={3} className="text-center text-gray-500">No payments received.</TableCell>
                                        </TableRow>
                                    ) : (
                                        paymentLog.map((p) => (
                                            <TableRow key={p.id}>
                                                <TableCell className="font-medium">{p.name}</TableCell>
                                                <TableCell className="text-xs text-gray-500">{p.type}</TableCell>
                                                <TableCell className="text-right">{formatCurrency(p.amount)}</TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
