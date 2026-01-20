import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { formatCurrency } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { ReportFilters } from "@/components/reports/ReportFilters"
import { DataTableExport } from "@/components/ui/data-table-export"

export const dynamic = 'force-dynamic'

interface ReportsPageProps {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function Page({ searchParams }: ReportsPageProps) {
    const session = await auth()
    const params = await searchParams
    const from = typeof params.from === 'string' ? params.from : undefined
    const to = typeof params.to === 'string' ? params.to : undefined

    // Date Filtering Logic
    const dateFilter: any = {}
    if (from || to) {
        dateFilter.createdAt = {}
        if (from) {
            // Start of day
            dateFilter.createdAt.gte = new Date(from)
        }
        if (to) {
            // End of day
            const toDate = new Date(to)
            toDate.setHours(23, 59, 59, 999)
            dateFilter.createdAt.lte = toDate
        }
    }

    // Fetch transactions with filter
    const transactions = await prisma.transaction.findMany({
        where: dateFilter,
        include: { fundraisingCampaign: true }
    })

    // Fetch scouts (always fetch all to show balances)
    const scouts = await prisma.scout.findMany({
        orderBy: { name: 'asc' }
    })

    // Calculate Totals per Troop perspective
    let totalTroopIncome = 0
    let totalExpense = 0
    let totalScoutFundraisingShare = 0
    const breakdown: Record<string, number> = {}

    transactions.forEach(t => {
        const val = Number(t.amount)
        breakdown[t.type] = (breakdown[t.type] || 0) + val

        switch (t.type) {
            case 'REGISTRATION_INCOME':
            case 'DONATION_IN':
            case 'EVENT_PAYMENT':
            case 'DUES':
            case 'CAMP_TRANSFER':
            case 'IBA_RECLAIM':
                totalTroopIncome += val
                break
            case 'FUNDRAISING_INCOME':
                const ibaPercent = t.fundraisingCampaign?.ibaPercentage || 0
                const scoutPortion = val * (ibaPercent / 100)
                if (t.fundraisingCampaign?.status === 'CLOSED') {
                    totalTroopIncome += (val - scoutPortion)
                    totalScoutFundraisingShare += scoutPortion
                } else {
                    // Campaign is ACTIVE, everything is troop income for now
                    totalTroopIncome += val
                }
                break
            case 'EXPENSE':
            case 'REIMBURSEMENT':
                totalExpense += val
                break
        }
    })

    const netTroopPeriod = totalTroopIncome - totalExpense
    const incomeTypes = ["REGISTRATION_INCOME", "FUNDRAISING_INCOME", "DONATION_IN", "DUES", "EVENT_PAYMENT", "CAMP_TRANSFER", "IBA_RECLAIM"]
    const expenseTypes = ["EXPENSE", "REIMBURSEMENT"]

    // Helper to format type
    const formatType = (t: string) => t.replace(/_/g, " ")

    // Prepare Export Data for Breakdowns
    const incomeData = incomeTypes
        .map(type => {
            let amount = breakdown[type] || 0
            if (type === 'FUNDRAISING_INCOME') {
                // Adjust for the portion diverted to IBA records ONLY for CLOSED campaigns
                amount = transactions
                    .filter(t => t.type === 'FUNDRAISING_INCOME')
                    .reduce((sum, t) => {
                        const val = Number(t.amount)
                        if (t.fundraisingCampaign?.status === 'CLOSED') {
                            return sum + val * (1 - (t.fundraisingCampaign?.ibaPercentage || 0) / 100)
                        }
                        return sum + val
                    }, 0)
            }
            return {
                category: formatType(type) + (type === 'FUNDRAISING_INCOME' ? ' (Troop Available)' : ''),
                amount,
                formattedAmount: formatCurrency(amount)
            }
        })
        .filter(d => d.amount > 0)

    const expenseData = expenseTypes
        .map(type => ({
            category: formatType(type),
            amount: breakdown[type] || 0,
            formattedAmount: formatCurrency(breakdown[type] || 0)
        }))
        .filter(d => d.amount > 0)

    // Prepare Scout Data - Note: logic duplicated from Render below, should have unified it but fine for now.
    // Actually we can map it once.
    const scoutData = scouts.map(scout => {
        const scoutTx = transactions.filter(t => t.scoutId === scout.id)

        const credits = scoutTx.reduce((sum, t) => {
            const val = Number(t.amount)
            if (t.type === 'IBA_DEPOSIT') return sum + val
            if (t.type === 'FUNDRAISING_INCOME' && t.fundraisingCampaign && t.fundraisingCampaign.ibaPercentage > 0) {
                return sum + (val * (t.fundraisingCampaign.ibaPercentage / 100))
            }
            return sum
        }, 0)

        const debits = scoutTx.reduce((sum, t) => {
            if (['IBA_RECLAIM', 'CAMP_TRANSFER'].includes(t.type)) return sum + Number(t.amount)
            return sum
        }, 0)

        return {
            name: scout.name,
            credits,
            debits,
            balance: Number(scout.ibaBalance),
            formattedCredits: formatCurrency(credits),
            formattedDebits: formatCurrency(debits),
            formattedBalance: formatCurrency(Number(scout.ibaBalance))
        }
    })

    // Helper for date string
    const today = new Date().toISOString().split('T')[0]
    const fromStr = from ? new Date(from).toISOString().split('T')[0] : 'Start'
    const toStr = to ? new Date(to).toISOString().split('T')[0] : today

    // Fetch Troop Settings for Export Header
    const troopSettings = await prisma.troopSettings.findFirst()
    const headerInfo = {
        troopName: troopSettings?.name || "Troop Treasury",
        council: troopSettings?.council || "",
        district: troopSettings?.district || "",
        address: troopSettings?.address || ""
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Reports & Analytics</h1>
            </div>

            <ReportFilters />

            {(from || to) && (
                <div className="text-sm text-gray-500">
                    Showing results for: <strong>{from || 'Start'}</strong> to <strong>{to || 'Now'}</strong>
                </div>
            )}

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Period Income</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{formatCurrency(totalTroopIncome)}</div>
                        <p className="text-xs text-muted-foreground">{transactions.length} total transactions found</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Period Expenses</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{formatCurrency(totalExpense)}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Period Net</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${netTroopPeriod >= 0 ? 'text-black' : 'text-red-500'}`}>
                            {formatCurrency(netTroopPeriod)}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Fundraising Reserves</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-indigo-600">{formatCurrency(totalScoutFundraisingShare)}</div>
                        <p className="text-xs text-muted-foreground">Portion reserved for Scouts</p>
                    </CardContent>
                </Card>
            </div>

            {/* Breakdown Section */}
            <div className="grid gap-6 md:grid-cols-2">
                {/* Income Breakdown */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Income Breakdown</CardTitle>
                            <CardDescription>Revenue by category</CardDescription>
                        </div>
                        <DataTableExport
                            data={incomeData}
                            columns={[
                                { header: "Category", accessorKey: "category" },
                                { header: "Amount", accessorKey: "formattedAmount" }
                            ]}
                            filename={`TroopTreasury_Income_${fromStr}_to_${toStr}`}
                            title="Income Breakdown"
                            headerInfo={headerInfo}
                        />
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Category</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {incomeData.map(d => (
                                    <TableRow key={d.category}>
                                        <TableCell className="font-medium text-xs md:text-sm">{d.category}</TableCell>
                                        <TableCell className="text-right">{d.formattedAmount}</TableCell>
                                    </TableRow>
                                ))}
                                {incomeData.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={2} className="text-center text-muted-foreground p-4">No income recorded in this period.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Expense Breakdown */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Expense Breakdown</CardTitle>
                            <CardDescription>Expenses by category</CardDescription>
                        </div>
                        <DataTableExport
                            data={expenseData}
                            columns={[
                                { header: "Category", accessorKey: "category" },
                                { header: "Amount", accessorKey: "formattedAmount" }
                            ]}
                            filename={`TroopTreasury_Expenses_${fromStr}_to_${toStr}`}
                            title="Expense Breakdown"
                            headerInfo={headerInfo}
                        />
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Category</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {expenseData.map(d => (
                                    <TableRow key={d.category}>
                                        <TableCell className="font-medium text-xs md:text-sm">{d.category}</TableCell>
                                        <TableCell className="text-right">{d.formattedAmount}</TableCell>
                                    </TableRow>
                                ))}
                                {expenseData.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={2} className="text-center text-muted-foreground p-4">No expenses recorded in this period.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            {/* Scout Balances - Always Current Snapshot */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <CardTitle>Current Scout Balances</CardTitle>
                            <span className="text-xs text-muted-foreground bg-gray-100 px-2 py-1 rounded">Live Snapshot</span>
                        </div>
                        <CardDescription>Total credits, debits, and current net balance per scout (All Time).</CardDescription>
                    </div>
                    <DataTableExport
                        data={scoutData}
                        columns={[
                            { header: "Scout Name", accessorKey: "name" },
                            { header: "Credits", accessorKey: "formattedCredits" },
                            { header: "Debits", accessorKey: "formattedDebits" },
                            { header: "Net Balance", accessorKey: "formattedBalance" }
                        ]}
                        filename={`TroopTreasury_ScoutBalances_${today}`}
                        title="Scout Balances"
                        headerInfo={headerInfo}
                    />
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Scout Name</TableHead>
                                <TableHead className="text-right">Credits {from || to ? '(Period)' : '(All Time)'}</TableHead>
                                <TableHead className="text-right">Debits {from || to ? '(Period)' : '(All Time)'}</TableHead>
                                <TableHead className="text-right">Current Net Balance</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {scoutData.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center">No scouts found.</TableCell>
                                </TableRow>
                            ) : (
                                scoutData.map(scout => (
                                    <TableRow key={scout.name}>
                                        <TableCell className="font-medium">{scout.name}</TableCell>
                                        <TableCell className="text-right text-gray-500">{scout.formattedCredits}</TableCell>
                                        <TableCell className="text-right text-gray-500">{scout.formattedDebits}</TableCell>
                                        <TableCell className={`text-right font-bold ${scout.balance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                            {scout.formattedBalance}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
