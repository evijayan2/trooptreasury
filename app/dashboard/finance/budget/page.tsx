import { prisma } from "@/lib/prisma"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Edit } from "lucide-react"
import { BudgetCategoryForm } from "@/components/finance/BudgetCategoryForm"
import { auth } from "@/auth"
import { upsertBudget, updateBudgetStatus } from "@/app/actions/finance"
import { Progress } from "@/components/ui/progress"
import { CreateBudgetForm } from "@/components/finance/CreateBudgetForm"
import { DeleteBudgetButton } from "@/components/finance/DeleteBudgetButton"
import { DeleteBudgetCategoryButton } from "@/components/finance/DeleteBudgetCategoryButton"
import { Trash2 } from "lucide-react"
import { toast } from "sonner"

export default async function BudgetPage() {
    const session = await auth()
    const isAdmin = ["ADMIN", "FINANCIER"].includes(session?.user?.role || "")

    // Find all budgets, ordered by year descending
    const budgets = await prisma.budget.findMany({
        include: { categories: true },
        orderBy: { year: 'desc' }
    })

    // For Actuals, we need to sum transactions by category
    const transactions = await prisma.transaction.findMany({
        where: { budgetCategoryId: { not: null } }
    })

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Budgets</h2>
                {isAdmin && <CreateBudgetForm />}
            </div>

            {budgets.length === 0 && (
                <div className="flex flex-col items-center justify-center p-12 space-y-4">
                    <h2 className="text-xl font-semibold">No Budgets Found</h2>
                    {isAdmin && (
                        <CreateBudgetForm />
                    )}
                </div>
            )}

            <div className="space-y-4">
                {budgets.map(budget => (
                    <BudgetAccordionItem key={budget.id} budget={budget} isAdmin={isAdmin} transactions={transactions} />
                ))}
            </div>
        </div>
    )
}

function BudgetAccordionItem({ budget, isAdmin, transactions }: { budget: any, isAdmin: boolean, transactions: any[] }) {
    // Calculate actuals
    const actuals = new Map<string, { income: number, expense: number }>()

    const budgetCategoryIds = new Set(budget.categories.map((c: any) => c.id))
    transactions.forEach(t => {
        if (!t.budgetCategoryId || !budgetCategoryIds.has(t.budgetCategoryId)) return
        const current = actuals.get(t.budgetCategoryId) || { income: 0, expense: 0 }
        const amt = Number(t.amount)
        if (["EXPENSE", "REIMBURSEMENT"].includes(t.type)) {
            current.expense += amt
        } else {
            current.income += amt
        }
        actuals.set(t.budgetCategoryId, current)
    })

    return (
        <Card className={`overflow-hidden border-l-4 ${budget.status === 'ACTIVE' ? 'border-l-green-500' : budget.status === 'CLOSED' ? 'border-l-gray-400' : 'border-l-yellow-400'}`}>
            <CardContent className="p-0">
                <details className="group" open={budget.status === 'ACTIVE'}>
                    <summary className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50">
                        <div className="flex items-center gap-4">
                            <span className="font-bold text-lg">{budget.year}</span>
                            <span className={`text-xs px-2 py-1 rounded-full uppercase font-medium ${budget.status === 'ACTIVE' ? "bg-green-100 text-green-700" :
                                budget.status === 'CLOSED' ? "bg-gray-100 text-gray-600" :
                                    "bg-yellow-100 text-yellow-700"
                                }`}>
                                {budget.status}
                            </span>
                            <span className="text-sm text-muted-foreground hidden sm:inline">
                                Dues: ${Number(budget.annualDuesAmount).toFixed(2)}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="group-open:rotate-180 transition-transform">▼</span>
                        </div>
                    </summary>
                    <div className="p-4 pt-0 border-t">
                        <div className="flex justify-between items-center py-4">
                            <div>
                                <p className="text-sm text-muted-foreground">Budget Management</p>
                            </div>
                            <div className="flex gap-2">
                                {isAdmin && budget.status === 'DRAFT' && <DeleteBudgetButton id={budget.id} year={budget.year} />}
                                {isAdmin && budget.status === 'DRAFT' && (
                                    <form action={async () => {
                                        "use server"
                                        await updateBudgetStatus(budget.id, 'ACTIVE')
                                    }}>
                                        <Button size="sm" variant="outline" className="text-green-600 border-green-200 hover:bg-green-50">Activate</Button>
                                    </form>
                                )}
                                {isAdmin && budget.status === 'ACTIVE' && (
                                    <form action={async () => {
                                        "use server"
                                        await updateBudgetStatus(budget.id, 'CLOSED')
                                    }}>
                                        <Button size="sm" variant="outline" className="text-gray-600 border-gray-200 hover:bg-gray-50">Close Budget</Button>
                                    </form>
                                )}
                            </div>
                        </div>

                        <div className="flex justify-end mb-4">
                            {isAdmin && (
                                <BudgetCategoryForm
                                    budgetId={budget.id}
                                    triggerButton={<Button size="sm" variant="outline"><Plus className="w-4 h-4 mr-2" /> Add Category</Button>}
                                />
                            )}
                        </div>

                        <div className="space-y-4">
                            {budget.categories.length === 0 && <p className="text-gray-500 text-sm italic">No categories.</p>}
                            {budget.categories.map((cat: any) => {
                                const acts = actuals.get(cat.id) || { income: 0, expense: 0 }
                                const planExp = Number(cat.plannedExpense)
                                const planInc = Number(cat.plannedIncome)
                                const expPercent = planExp > 0 ? (acts.expense / planExp) * 100 : 0
                                const incPercent = planInc > 0 ? (acts.income / planInc) * 100 : 0
                                const expColor = expPercent > 100 ? "bg-red-500" : expPercent > 90 ? "bg-yellow-500" : "bg-green-500"

                                return (
                                    <div key={cat.id} className="border rounded p-4 bg-card">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <div className="font-semibold">{cat.name}</div>
                                                <div className="text-xs text-muted-foreground uppercase">{cat.type}</div>
                                            </div>
                                            {isAdmin && (
                                                <div className="flex gap-1">
                                                    <BudgetCategoryForm
                                                        budgetId={budget.id}
                                                        category={{ ...cat, plannedIncome: cat.plannedIncome.toString(), plannedExpense: cat.plannedExpense.toString() }}
                                                        triggerButton={<Button variant="ghost" size="icon" className="h-6 w-6"><Edit className="w-3 h-3" /></Button>}
                                                    />
                                                    {budget.status === 'DRAFT' && <DeleteBudgetCategoryButton id={cat.id} name={cat.name} />}
                                                </div>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            {cat.type !== 'EXPENSE' && (
                                                <div>
                                                    <div className="flex justify-between mb-1">
                                                        <span>Inc: ${acts.income.toFixed(0)} / ${planInc.toFixed(0)}</span>
                                                        <span>{incPercent.toFixed(0)}%</span>
                                                    </div>
                                                    <Progress value={Math.min(incPercent, 100)} className="h-1.5" />
                                                </div>
                                            )}
                                            {cat.type !== 'INCOME' && (
                                                <div>
                                                    <div className="flex justify-between mb-1">
                                                        <span>Exp: ${acts.expense.toFixed(0)} / ${planExp.toFixed(0)}</span>
                                                        <span className={expPercent > 100 ? "text-red-500 font-bold" : ""}>{expPercent.toFixed(0)}%</span>
                                                    </div>
                                                    <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                                                        <div className={`h-full ${expColor}`} style={{ width: `${Math.min(expPercent, 100)}%` }} />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </details>
            </CardContent>
        </Card>
    )
}
