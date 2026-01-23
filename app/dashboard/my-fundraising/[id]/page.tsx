import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { notFound, redirect } from "next/navigation"
import { OrderManager } from "@/components/fundraising/OrderManager"

export default async function ScoutCampaignPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const session = await auth()
    if (!session?.user) return <div>Unauthorized</div>

    let scout = await prisma.scout.findUnique({
        where: { userId: session.user.id }
    })

    if (!scout) {
        // If not a scout, check if they are a parent of a scout
        const parentLink = await prisma.parentScout.findFirst({
            where: { parentId: session.user.id },
            include: { scout: true }
        })

        if (parentLink) {
            scout = parentLink.scout
        }
    }

    if (!scout) {
        return <div className="p-6">You must be logged in as a connected Scout or Parent to manage orders.</div>
    }

    const campaign = await prisma.fundraisingCampaign.findUnique({
        where: { id }
    })

    if (!campaign) notFound()

    const orders = await prisma.fundraisingOrder.findMany({
        where: {
            campaignId: id,
            scoutId: scout.id
        },
        orderBy: { createdAt: 'desc' }
    })

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">{campaign.productName} Sales</h2>
                <p className="text-muted-foreground">Campaign: {campaign.name}</p>
            </div>

            <OrderManager
                campaign={campaign}
                orders={orders}
                scoutId={scout.id}
            />
        </div>
    )
}
