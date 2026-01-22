import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { formatCurrency } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TransactionTable } from "@/components/transactions/transaction-table"
import { ArrowLeft, Mail, UserPlus } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { inviteUserForScout, updateScoutEmail } from "@/app/actions"
import { ScoutEmailForm } from "@/components/scouts/ScoutEmailForm"

export default async function ScoutPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const session = await auth()

    if (!session) redirect("/login")

    // Fetch Scout
    const scout = await prisma.scout.findUnique({
        where: { id },
        include: {
            transactions: {
                orderBy: { createdAt: 'desc' }
            }
        }
    })

    if (!scout) {
        return <div>Scout not found</div>
    }

    // Access Control
    // Admin/Financier: OK
    // Parent: OK if linked
    // Scout: OK if self

    let isAuthorized = false
    if (["ADMIN", "FINANCIER", "LEADER"].includes(session.user.role)) {
        isAuthorized = true
    } else if (session.user.role === 'PARENT') {
        const link = await prisma.parentScout.findUnique({
            where: {
                parentId_scoutId: {
                    parentId: session.user.id,
                    scoutId: id
                }
            }
        })
        if (link) isAuthorized = true
    } else if (session.user.role === 'SCOUT') {
        // Check if this scout is the user
        if (scout.userId === session.user.id) isAuthorized = true
    }

    if (!isAuthorized) {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-4">
                <h2 className="text-xl font-bold text-red-600">Unauthorized Access</h2>
                <p>You do not have permission to view this scout's records.</p>
                <Link href="/dashboard" className="text-blue-500 hover:underline">Return to Dashboard</Link>
            </div>
        )
    }

    const formattedTransactions = scout.transactions.map(tx => ({
        ...tx,
        amount: Number(tx.amount)
    }))

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/dashboard/scouts" className="p-2 hover:bg-gray-100 rounded-full">
                    <ArrowLeft size={20} />
                </Link>
                <h1 className="text-2xl font-bold">{scout.name}</h1>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">
                            Current IBA Balance
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">
                            {formatCurrency(Number(scout.ibaBalance))}
                        </div>
                    </CardContent>
                </Card>

                {session.user.role !== 'SCOUT' && (
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-gray-500">
                                User Account
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ScoutEmailForm
                                scoutId={scout.id}
                                // @ts-ignore
                                initialEmail={scout.email}
                                hasUser={!!scout.userId}
                            />
                        </CardContent>
                    </Card>
                )}
            </div>

            <div className="space-y-4">
                <h2 className="text-xl font-semibold">Transaction History</h2>
                <div className="border rounded-md">
                    <TransactionTable transactions={formattedTransactions} />
                </div>
            </div>
        </div >
    )
}
