import { prisma } from "@/lib/prisma"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, XCircle, AlertCircle } from "lucide-react"
import { auth } from "@/auth"
import { redirect } from "next/navigation"

export default async function DuesPage() {
    const session = await auth()
    if (!session) redirect("/login")

    const isAdmin = ["ADMIN", "FINANCIER", "LEADER"].includes(session.user.role)

    // 1. Get Dues Category from Active Budget to know the target amount (Optional comparison)
    // We now use TroopSettings for the authoritative Dues Amount
    const troopSettings = await prisma.troopSettings.findFirst()
    const targetDues = Number(troopSettings?.annualDuesAmount || 150)

    // 2. Fetch Scouts
    let scouts: any[] = []
    if (isAdmin) {
        scouts = await prisma.scout.findMany({
            where: { status: 'ACTIVE' },
            include: {
                transactions: {
                    where: { type: 'DUES' } // Filter by budget year too? Ideally.
                }
            }
        })
    } else if (session.user.role === 'PARENT') {
        const links = await prisma.parentScout.findMany({
            where: { parentId: session.user.id },
            select: { scoutId: true }
        })
        const scoutIds = links.map(l => l.scoutId)
        scouts = await prisma.scout.findMany({
            where: { id: { in: scoutIds } },
            include: { transactions: { where: { type: 'DUES' } } }
        })
    } else if (session.user.role === 'SCOUT') {
        scouts = await prisma.scout.findMany({
            where: { userId: session.user.id },
            include: { transactions: { where: { type: 'DUES' } } }
        })
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Annual Dues</h2>
                <div className="text-sm bg-muted px-3 py-1 rounded">
                    Target: <strong>${targetDues.toFixed(2)}</strong> / scout
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Scout Status</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4">
                        {scouts.length === 0 && <p className="text-muted-foreground text-center py-4">No scouts found.</p>}

                        {scouts.map(scout => {
                            const paid = scout.transactions.reduce((sum: number, t: any) => sum + Number(t.amount), 0)
                            const remaining = Math.max(0, targetDues - paid)
                            const status = remaining <= 0 ? "PAID" : paid > 0 ? "PARTIAL" : "UNPAID"

                            return (
                                <div key={scout.id} className="flex flex-col sm:flex-row justify-between items-center p-4 border rounded-lg hover:bg-muted/10">
                                    <div className="flex items-center gap-4 mb-2 sm:mb-0">
                                        <div className={`p-2 rounded-full ${status === 'PAID' ? 'bg-green-100 text-green-600' :
                                            status === 'PARTIAL' ? 'bg-yellow-100 text-yellow-600' :
                                                'bg-red-100 text-red-600'
                                            }`}>
                                            {status === 'PAID' ? <CheckCircle className="w-5 h-5" /> :
                                                status === 'PARTIAL' ? <AlertCircle className="w-5 h-5" /> :
                                                    <XCircle className="w-5 h-5" />}
                                        </div>
                                        <div>
                                            <h3 className="font-semibold">{scout.name}</h3>
                                            <p className="text-sm text-muted-foreground">
                                                Paid: ${paid.toFixed(2)} <span className="text-xs">•</span> Due: ${remaining.toFixed(2)}
                                            </p>
                                        </div>
                                    </div>

                                    <div>
                                        {status !== 'PAID' && (
                                            <Button size="sm" variant={isAdmin ? "default" : "outline"}>
                                                {isAdmin ? "Record Payment" : "Make Payment"}
                                            </Button>
                                        )}
                                        {status === 'PAID' && <span className="text-sm font-medium text-green-600">Complete</span>}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
