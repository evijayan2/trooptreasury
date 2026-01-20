import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { formatCurrency, formatDateTimeEST } from "@/lib/utils"
// import { Transaction } from "@prisma/client" // We'll verify type usage
import { ExpenseEntryActions } from "./expense-entry-actions"

export function TransactionTable({ transactions }: { transactions: any[] }) {
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {transactions.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={6} className="text-center">No transactions found</TableCell>
                    </TableRow>
                ) : (
                    transactions.map((tx) => (
                        <TableRow key={tx.id}>
                            <TableCell>{formatDateTimeEST(tx.createdAt)}</TableCell>
                            <TableCell className="text-xs font-mono">{tx.type.replace(/_/g, ' ')}</TableCell>
                            <TableCell>{tx.description}</TableCell>
                            <TableCell className={`text-right ${["EXPENSE", "REIMBURSEMENT", "CAMP_TRANSFER"].includes(tx.type) ? "text-red-500" : "text-green-500"}`}>
                                {["EXPENSE", "REIMBURSEMENT", "CAMP_TRANSFER"].includes(tx.type) ? "-" : "+"}{formatCurrency(Number(tx.amount))}
                            </TableCell>
                            <TableCell>{tx.status}</TableCell>
                            <TableCell>
                                {(tx.type === 'EXPENSE' || tx.entryType === 'ADULT_EXPENSE') && (
                                    <ExpenseEntryActions
                                        id={tx.id}
                                        type={tx.entryType === 'ADULT_EXPENSE' ? 'ADULT_EXPENSE' : 'TRANSACTION'}
                                        initialDescription={tx.description}
                                        initialAmount={Number(tx.amount)}
                                    />
                                )}
                            </TableCell>
                        </TableRow>
                    ))
                )}
            </TableBody>
        </Table>
    )
}
