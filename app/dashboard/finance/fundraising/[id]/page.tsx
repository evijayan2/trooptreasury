import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { ProductSalesTracker } from "@/components/finance/ProductSalesTracker"
import { Badge } from "@/components/ui/badge"

export default async function CampaignDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const campaign = await prisma.fundraisingCampaign.findUnique({
        where: { id: id },
        include: {
            sales: {
                include: { scout: true }
            },
            transactions: true
        }
    })

    if (!campaign) {
        notFound()
    }

    // Fetch aggregated order stats
    const orderStats = await prisma.fundraisingOrder.groupBy({
        by: ['scoutId'],
        where: { campaignId: campaign.id },
        _sum: { quantity: true }
    })

    // Convert to map for easier lookup
    const statsMap: Record<string, number> = {}
    orderStats.forEach(stat => {
        if (stat.scoutId) statsMap[stat.scoutId] = stat._sum.quantity || 0
    })

    const scouts = await prisma.scout.findMany({
        where: { status: 'ACTIVE' },
        orderBy: { name: 'asc' }
    })

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">{campaign.name}</h2>
                    <p className="text-muted-foreground">
                        {new Date(campaign.startDate).toLocaleDateString()}
                        {campaign.endDate && ` - ${new Date(campaign.endDate).toLocaleDateString()}`}
                    </p>
                </div>
                <div className="flex gap-2">
                    <Badge variant={campaign.status === 'ACTIVE' ? "default" : "secondary"}>
                        {campaign.status}
                    </Badge>
                    <Badge variant="outline">{campaign.type}</Badge>
                </div>
            </div>

            {campaign.type === 'PRODUCT_SALE' ? (
                <ProductSalesTracker
                    campaign={JSON.parse(JSON.stringify(campaign))}
                    scouts={JSON.parse(JSON.stringify(scouts))}
                    initialSales={JSON.parse(JSON.stringify(campaign.sales))}
                    liveOrderStats={statsMap}
                />
            ) : (
                <Card>
                    <CardHeader>
                        <CardTitle>Transactions</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">Standard fundraising campaign transactions list will go here.</p>
                        {/* Placeholder for standard campaign view */}
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
