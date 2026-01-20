import { prisma } from "@/lib/prisma"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Edit } from "lucide-react"
import { BudgetCategoryForm } from "@/components/finance/BudgetCategoryForm"
import { auth } from "@/auth"
import { upsertBudget } from "@/app/actions/finance"
import { Progress } from "@/components/ui/progress"
import { CreateBudgetForm } from "@/components/finance/CreateBudgetForm"
import { DeleteBudgetButton } from "@/components/finance/DeleteBudgetButton"
import { DeleteBudgetCategoryButton } from "@/components/finance/DeleteBudgetCategoryButton"
import { Trash2 } from "lucide-react"
import { toast } from "sonner"

export default async function BudgetPage() {
    const session = await auth()
    const isAdmin = ["ADMIN", "FINANCIER"].includes(session?.user?.role || "")

    // Find active budget
    const budget = await prisma.budget.findFirst({
        where: { isActive: true },
        include: { categories: true } // We need to also fetch actuals... later
    })

    // For Actuals, we need to sum transactions by category
    const transactions = await prisma.transaction.findMany({
        where: { budgetCategoryId: { not: null } }
    })

    // Map usage
    const actuals = new Map<string, { income: number, expense: number }>()
    transactions.forEach(t => {
        if (!t.budgetCategoryId) return
        const current = actuals.get(t.budgetCategoryId) || { income: 0, expense: 0 }
        const amt = Number(t.amount)
        if (["EXPENSE", "REIMBURSEMENT"].includes(t.type)) {
            current.expense += amt
        } else {
            current.income += amt
        }
        actuals.set(t.budgetCategoryId, current)
    })

    if (!budget) {
        // Show create budget button
        return (
            <div className="flex flex-col items-center justify-center p-12 space-y-4">
                <h2 className="text-xl font-semibold">No Active Budget Found</h2>
                {isAdmin && (
                    <CreateBudgetForm />
                )}
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-start">
                <div>
                    <div className="flex items-center gap-2">
                        <h2 className="text-2xl font-bold">Annual Budget: {budget.year}</h2>
                        {isAdmin && <DeleteBudgetButton id={budget.id} year={budget.year} />}
                    </div>
                    <p className="text-muted-foreground text-sm mt-1">Manage budget categories and track spending.</p>
                </div>
                {isAdmin && (
                    <BudgetCategoryForm
                        budgetId={budget.id}
                        triggerButton={<Button><Plus className="w-4 h-4 mr-2" /> Add Category</Button>}
                    />
                )}
            </div>

            <div className="space-y-4">
                {budget.categories.length === 0 && (
                    <p className="text-muted-foreground">No categories yet. Add one to start planning.</p>
                )}

                {budget.categories.map(cat => {
                    const acts = actuals.get(cat.id) || { income: 0, expense: 0 }
                    const planExp = Number(cat.plannedExpense)
                    const planInc = Number(cat.plannedIncome)

                    const expPercent = planExp > 0 ? (acts.expense / planExp) * 100 : 0
                    const incPercent = planInc > 0 ? (acts.income / planInc) * 100 : 0

                    // Determine colors
                    const expColor = expPercent > 100 ? "bg-red-500" : expPercent > 90 ? "bg-yellow-500" : "bg-green-500"

                    return (
                        <Card key={cat.id}>
                            <CardContent className="pt-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="font-semibold text-lg">{cat.name}</h3>
                                        <span className="text-xs px-2 py-1 bg-muted rounded-full uppercase space-x-2">{cat.type}</span>
                                    </div>
                                    {isAdmin && (
                                        <div className="flex gap-1">
                                            <BudgetCategoryForm
                                                budgetId={budget.id}
                                                category={{
                                                    id: cat.id,
                                                    name: cat.name,
                                                    type: cat.type,
                                                    plannedIncome: cat.plannedIncome.toString(),
                                                    plannedExpense: cat.plannedExpense.toString()
                                                }}
                                                triggerButton={<Button variant="ghost" size="sm" title="Edit Category"><Edit className="w-4 h-4" /></Button>}
                                            />
                                            {/* Delete Category Button */}
                                            <DeleteBudgetCategoryButton id={cat.id} name={cat.name} />
                                        </div>
                                    )}
                                </div>

                                <div className="grid md:grid-cols-2 gap-8">
                                    {(cat.type !== 'EXPENSE') && (
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-sm">
                                                <span>Income: ${acts.income.toFixed(2)} / ${planInc.toFixed(2)}</span>
                                                <span>{incPercent.toFixed(0)}%</span>
                                            </div>
                                            <Progress value={Math.min(incPercent, 100)} className="h-2" />
                                        </div>
                                    )}

                                    {(cat.type !== 'INCOME') && (
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-sm">
                                                <span>Expense: ${acts.expense.toFixed(2)} / ${planExp.toFixed(2)}</span>
                                                <span className={expPercent > 100 ? "text-red-500 font-bold" : ""}>{expPercent.toFixed(0)}%</span>
                                            </div>
                                            {/* Custom progress color needed directly */}
                                            <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full ${expColor}`}
                                                    style={{ width: `${Math.min(expPercent, 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )
                })}
            </div>
        </div>
    )
}
