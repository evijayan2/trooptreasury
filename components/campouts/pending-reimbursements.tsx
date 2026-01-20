"use client"

import { approveAdultExpense } from "@/app/actions"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/utils"
import { Check } from "lucide-react"
import { ExpenseEntryActions } from "@/components/transactions/expense-entry-actions"
import { toast } from "sonner"

export function PendingReimbursements({ expenses }: { expenses: any[] }) {
    if (expenses.length === 0) return null

    const handleApprove = async (id: string) => {
        if (!confirm("Approve this reimbursement?")) return
        const result = await approveAdultExpense(id)
        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success("Reimbursement approved")
        }
    }

    return (
        <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-900/50 rounded-lg p-4 mt-4">
            <h3 className="text-sm font-semibold text-yellow-800 dark:text-yellow-500 mb-2">Pending Reimbursements</h3>
            <div className="space-y-2">
                {expenses.map((expense) => (
                    <div key={expense.id} className="flex justify-between items-center bg-white dark:bg-card/50 p-2 rounded border border-yellow-100 dark:border-yellow-900/50">
                        <div>
                            <p className="font-medium text-sm">{expense.description}</p>
                            <p className="text-xs text-gray-500">{expense.adult?.name} • {formatCurrency(Number(expense.amount))}</p>
                        </div>
                        <div className="flex items-center gap-1">
                            <ExpenseEntryActions
                                id={expense.id}
                                type="ADULT_EXPENSE"
                                initialDescription={expense.description}
                                initialAmount={Number(expense.amount)}
                            />
                            <Button size="sm" variant="ghost" onClick={() => handleApprove(expense.id)} title="Approve">
                                <Check className="w-4 h-4 text-green-600" />
                            </Button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
