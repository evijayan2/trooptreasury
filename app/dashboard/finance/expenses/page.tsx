import { prisma } from "@/lib/prisma"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { auth } from "@/auth"
import { TransactionForm } from "@/components/finance/TransactionForm"
import { Badge } from "@/components/ui/badge"
import { DeleteTransactionButton } from "@/components/finance/DeleteTransactionButton"
import { DataTableExport } from "@/components/ui/data-table-export"
import { formatCurrency } from "@/lib/utils"

export const dynamic = 'force-dynamic'

export default async function ExpensesPage() {
    const session = await auth()
    const isAdmin = ["ADMIN", "FINANCIER"].includes(session?.user?.role || "")

    // Fetch options for the form
    const scouts = await prisma.scout.findMany({ select: { id: true, name: true } })
    const campouts = await prisma.campout.findMany({ where: { status: { not: "CLOSED" } }, select: { id: true, name: true } })
    const campaigns = await prisma.fundraisingCampaign.findMany({ select: { id: true, name: true } })
    const activeBudget = await prisma.budget.findFirst({ where: { isActive: true }, include: { categories: true } })
    const categories = activeBudget ? activeBudget.categories : []
    const troopSettings = await prisma.troopSettings.findFirst()
    const headerInfo = {
        troopName: troopSettings?.name || "Troop Treasury",
        council: troopSettings?.council || "",
        district: troopSettings?.district || "",
        address: troopSettings?.address || ""
    }

    // Build where clause based on role
    const whereClause: any = {}
    if (session?.user?.role === 'PARENT' && session?.user?.id) {
        whereClause.scout = {
            parentLinks: {
                some: {
                    parentId: session.user.id
                }
            }
        }
    } else if (["SCOUT"].includes(session?.user?.role || "")) {
        // Scouts shouldn't see expenses unless maybe linked to them? 
        // For now let's strict limit or show nothing.
        whereClause.id = "nothing" // effectively return nothing or could filter by scoutId if we had it
    }

    // Fetch recent transactions
    const transactions = await prisma.transaction.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
            scout: true,
            user: true,
            budgetCategory: true,
            fundraisingCampaign: true
        }
    })

    // Prepare Export Data
    const exportData = transactions.map(t => ({
        date: new Date(t.createdAt).toLocaleDateString(),
        description: t.description,
        type: t.type,
        amount: Number(t.amount),
        formattedAmount: formatCurrency(Number(t.amount)),
        status: t.status,
        category: t.budgetCategory?.name || 'N/A',
        scout: t.scout?.name || 'N/A',
        campaign: t.fundraisingCampaign?.name || 'N/A'
    }))

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Expenses & Income</h2>
                {isAdmin && (
                    <TransactionForm
                        triggerButton={<Button><Plus className="w-4 h-4 mr-2" /> Record Transaction</Button>}
                        scouts={scouts}
                        campouts={campouts}
                        campaigns={campaigns}
                        categories={categories.map(c => ({ id: c.id, name: c.name }))}
                    />
                )}
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Recent Transactions</CardTitle>
                    <DataTableExport
                        data={exportData}
                        columns={[
                            { header: "Date", accessorKey: "date" },
                            { header: "Description", accessorKey: "description" },
                            { header: "Type", accessorKey: "type" },
                            { header: "Amount", accessorKey: "formattedAmount" },
                            { header: "Status", accessorKey: "status" },
                            { header: "Category", accessorKey: "category" },
                            { header: "Scout", accessorKey: "scout" },
                            { header: "Campaign", accessorKey: "campaign" }
                        ]}
                        filename={`TroopTreasury_Expenses_${new Date().toISOString().split('T')[0]}`}
                        title="Expenses & Income Report"
                        headerInfo={headerInfo}
                    />
                </CardHeader>
                <CardContent>
                    <div className="space-y-0">
                        {transactions.length === 0 && <p className="text-muted-foreground p-4 text-center">No transactions found</p>}
                        {transactions.map(t => (
                            <div key={t.id} className="flex flex-col md:flex-row justify-between items-start md:items-center py-4 border-b last:border-0 hover:bg-muted/30 px-2 rounded">
                                <div className="space-y-1">
                                    <div className="font-medium">{t.description}</div>
                                    <div className="text-xs text-muted-foreground flex gap-2">
                                        <span>{new Date(t.createdAt).toLocaleDateString()}</span>
                                        <span>•</span>
                                        <span>{t.type.replace(/_/g, " ")}</span>
                                        {t.budgetCategory && <span>• {t.budgetCategory.name}</span>}
                                        {t.scout && <span>• {t.scout.name}</span>}
                                        {t.user && t.type === 'REIMBURSEMENT' && <span className="text-indigo-600 font-medium">• {t.user.name}</span>}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 md:gap-4 mt-2 md:mt-0">
                                    {isAdmin && (t.fromAccount === 'MANUAL' || !['CAMP_TRANSFER', 'REIMBURSEMENT', 'IBA_DEPOSIT', 'IBA_RECLAIM'].includes(t.type)) && !t.description?.includes('Automated') && !t.description?.includes('Organizer Payout') && (
                                        <DeleteTransactionButton id={t.id} description={t.description} />
                                    )}
                                    <Badge variant={['APPROVED', 'PENDING'].includes(t.status) ? "outline" : "destructive"}>
                                        {t.status}
                                    </Badge>
                                    <span className={`font-bold ${['EXPENSE', 'REIMBURSEMENT', 'CAMP_TRANSFER'].includes(t.type)
                                        ? "text-red-600"
                                        : "text-green-600"
                                        }`}>
                                        {['EXPENSE', 'REIMBURSEMENT', 'CAMP_TRANSFER'].includes(t.type) ? "-" : "+"}${Number(t.amount).toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
