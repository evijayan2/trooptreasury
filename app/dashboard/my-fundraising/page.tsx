import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"

export default async function MyFundraisingPage() {
    const session = await auth()
    if (!session?.user) return <div>Unauthorized</div>

    // Find the scout linked to this user
    const scout = await prisma.scout.findUnique({
        where: { userId: session.user.id }
    })

    // If parent, maybe find linked scouts? For now, assume single scout mapping or direct scout login.
    // Ideally, if parent, we show all kids. But let's start with simple direct mapping.

    const campaigns = await prisma.fundraisingCampaign.findMany({
        where: { status: 'ACTIVE', type: 'PRODUCT_SALE' },
        orderBy: { startDate: 'desc' }
    })

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold tracking-tight">My Fundraising</h2>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {campaigns.map(campaign => (
                    <Link href={`/dashboard/my-fundraising/${campaign.id}`} key={campaign.id}>
                        <Card className="hover:bg-slate-50 transition-colors cursor-pointer h-full">
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <CardTitle>{campaign.name}</CardTitle>
                                    <Badge>{campaign.status}</Badge>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="text-sm text-muted-foreground">
                                    <p>Product: {campaign.productName}</p>
                                    <p>Price: ${Number(campaign.productPrice).toFixed(2)}</p>
                                    <p className="mt-2 text-xs">
                                        Click to manage orders
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                ))}
            </div>
            {campaigns.length === 0 && (
                <p className="text-muted-foreground">No active product sales at the moment.</p>
            )}
        </div>
    )
}
