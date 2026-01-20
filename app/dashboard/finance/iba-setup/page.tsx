import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { BulkIBADepositForm } from "@/components/finance/BulkIBADepositForm"
import { Button } from "@/components/ui/button"
import { PlusCircle } from "lucide-react"

export default async function IBASetupPage() {
    const session = await auth()
    if (!session || !["ADMIN", "FINANCIER"].includes(session.user.role)) {
        redirect("/dashboard/finance")
    }

    const scouts = await prisma.scout.findMany({
        where: { status: 'ACTIVE' },
        orderBy: { name: 'asc' },
        select: {
            id: true,
            name: true,
            ibaBalance: true
        }
    })

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Initial IBA Setup</CardTitle>
                    <CardDescription>
                        Use this tool to record initial balances for scouts from paper records or old spreadsheets.
                        This will create "IBA_DEPOSIT" transactions for each scout.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-lg bg-muted/30">
                        <p className="text-muted-foreground mb-4">
                            Ready to process batch deposits for {scouts.length} active scouts?
                        </p>
                        <BulkIBADepositForm
                            triggerButton={
                                <Button size="lg" className="gap-2">
                                    <PlusCircle className="h-5 w-5" />
                                    Launch Bulk Deposit Tool
                                </Button>
                            }
                            scouts={scouts.map(s => ({
                                id: s.id,
                                name: s.name,
                                ibaBalance: Number(s.ibaBalance)
                            }))}
                        />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Important Notes</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2 text-muted-foreground">
                    <p>• Deposits will be logged with the "IBA_DEPOSIT" type.</p>
                    <p>• This action is atomic; all deposits in a batch are processed together.</p>
                    <p>• Each deposit will immediately increment the scout's current IBA balance.</p>
                    <p>• You can review these in the "Expenses" or "Overview" ledger after submitting.</p>
                </CardContent>
            </Card>
        </div>
    )
}
