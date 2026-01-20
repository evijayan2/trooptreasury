import { prisma } from "@/lib/prisma"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Check, X, Ban, Activity } from "lucide-react"
import { auth } from "@/auth"
import { FundraisingForm } from "@/components/finance/FundraisingForm"
import { Progress } from "@/components/ui/progress"
import { DeleteCampaignButton } from "@/components/finance/DeleteCampaignButton"
import { ToggleCampaignStatusButton } from "@/components/finance/ToggleCampaignStatusButton"

export default async function FundraisingPage() {
    const session = await auth()
    const isAdmin = ["ADMIN", "FINANCIER"].includes(session?.user?.role || "")

    // Fetch active campaigns (or all for now)
    const campaigns = await prisma.fundraisingCampaign.findMany({
        orderBy: [
            { status: 'asc' }, // ACTIVE (A) comes before CLOSED (C)? No, Enum order: ACTIVE, CLOSED. Order depends on DB. Usually Active=0, Closed=1.
            { startDate: 'desc' }
        ],
        include: { transactions: true } // to calc actual raised
    })

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Fundraising Campaigns</h2>
                {isAdmin && (
                    <FundraisingForm
                        triggerButton={<Button><Plus className="w-4 h-4 mr-2" /> New Campaign</Button>}
                    />
                )}
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {campaigns.map(camp => {
                    const raised = camp.transactions
                        .filter(t => t.type === 'FUNDRAISING_INCOME')
                        .reduce((acc, t) => acc + Number(t.amount), 0)

                    const goal = Number(camp.goal)
                    const percent = goal > 0 ? (raised / goal) * 100 : 0
                    const isClosed = camp.status === 'CLOSED'

                    return (
                        <Card key={camp.id} className={`relative ${isClosed ? 'opacity-70 bg-gray-50' : ''}`}>
                            <CardHeader>
                                <div className="flex justify-between items-start gap-4">
                                    <div className="space-y-1">
                                        <CardTitle className="leading-tight flex items-center gap-2">
                                            {camp.name}
                                            {isClosed && <span className="bg-gray-200 text-gray-600 text-[10px] px-2 py-0.5 rounded-full uppercase font-bold">Closed</span>}
                                        </CardTitle>
                                        <CardDescription>
                                            {new Date(camp.startDate).toLocaleDateString()}
                                            {camp.endDate && ` - ${new Date(camp.endDate).toLocaleDateString()}`}
                                        </CardDescription>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        {/* Compliance Status */}
                                        {camp.isComplianceApproved ? (
                                            <div title="Compliance Approved" className="text-green-600">
                                                <Check className="w-5 h-5" />
                                            </div>
                                        ) : (
                                            <div title="Compliance Pending" className="text-amber-500">
                                                <Activity className="w-5 h-5" />
                                            </div>
                                        )}

                                        {isAdmin && (
                                            <>
                                                <ToggleCampaignStatusButton id={camp.id} currentStatus={camp.status} name={camp.name} />
                                                <DeleteCampaignButton id={camp.id} name={camp.name} />
                                            </>
                                        )}
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span>Raised: ${raised.toFixed(2)}</span>
                                        <span>Goal: ${goal.toFixed(0)}</span>
                                    </div>
                                    <Progress value={Math.min(percent, 100)} className={isClosed ? "grayscale" : ""} />
                                    user
                                </div>

                                <div className="text-sm text-muted-foreground pt-2 border-t flex justify-between">
                                    <span>IBA Allocation: {camp.ibaPercentage}%</span>
                                    <span>{camp.transactions.length} Contributions</span>
                                </div>
                            </CardContent>
                        </Card>
                    )
                })}
            </div>
        </div>
    )
}
