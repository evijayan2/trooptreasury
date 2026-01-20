import { prisma } from "@/lib/prisma"
import { formatCurrency } from "@/lib/utils"

import { AlertCircle, ArrowRight } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip"

export async function PaymentsDueList({ userId }: { userId: string }) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { scout: true }
    })
    if (!user) return null

    // 1. Get Scouts to check
    let scoutIdsToCheck: string[] = []
    let parentLinks: any[] = []

    if (user.role === 'PARENT') {
        parentLinks = await prisma.parentScout.findMany({
            where: { parentId: userId },
            include: { scout: true }
        })
        scoutIdsToCheck = parentLinks.map(l => l.scoutId)
    } else if (user.role === 'SCOUT' && user.scout) {
        scoutIdsToCheck = [user.scout.id]
        // Mock a parent link object structure for the loop below
        parentLinks = [{ scout: user.scout }]
    } else if (["ADMIN", "FINANCIER", "LEADER"].includes(user.role)) {
        // For admins/leaders, we might want to show their own attendance if any
        // but the prompt focused on parents paying for scouts or scouts paying for self.
        // Let's at least handle them as an optional "Parent" if they have links
        parentLinks = await prisma.parentScout.findMany({
            where: { parentId: userId },
            include: { scout: true }
        })
        scoutIdsToCheck = parentLinks.map(l => l.scoutId)
    }

    // 2. Get Campouts that are Ready for Payment
    // We care about campouts where scouts OR parent is attending
    const campouts = await prisma.campout.findMany({
        where: {
            status: "READY_FOR_PAYMENT",
            OR: [
                { scouts: { some: { scoutId: { in: scoutIdsToCheck } } } },
                { adults: { some: { adultId: userId, role: "ATTENDEE" } } }
            ]
        },
        include: {
            scouts: true,
            adults: true, // Fetch adults
            transactions: true,
            expenses: true
        }
    })

    if (campouts.length === 0) return <p className="text-gray-500">No outstanding payments found.</p>

    const dueItems: any[] = []

    for (const campout of campouts) {
        // Calc Cost logic (duplicated from page.tsx, should be refactored to shared util eventually)
        const directExpenses = campout.transactions.filter(t => t.type === "EXPENSE")
        const transactionsCost = directExpenses.reduce((sum, t) => sum + Number(t.amount), 0)
        const adultExpensesCost = campout.expenses.reduce((sum, e) => sum + Number(e.amount), 0)
        const totalCampoutCost = transactionsCost + adultExpensesCost

        const scoutCount = campout.scouts.length
        const adultsCount = campout.adults.filter((a: any) => a.role === "ATTENDEE").length

        const totalPeople = scoutCount + adultsCount
        const rawCost = totalPeople > 0 ? totalCampoutCost / totalPeople : 0
        const costPerPerson = Math.round(rawCost * 100) / 100

        // Check Linked Scouts
        for (const link of parentLinks) {
            const isAttending = campout.scouts.some(s => s.scoutId === link.scout.id)
            if (isAttending) {
                const paidAmount = campout.transactions
                    .filter(t =>
                        ["CAMP_TRANSFER", "EVENT_PAYMENT"].includes(t.type) &&
                        t.scoutId === link.scout.id &&
                        t.status === "APPROVED"
                    )
                    .reduce((sum, t) => sum + Number(t.amount), 0)

                if (paidAmount < costPerPerson) {
                    dueItems.push({
                        campout,
                        name: link.scout.name,
                        cost: costPerPerson,
                        paid: paidAmount,
                        type: 'SCOUT'
                    })
                }
            }
        }


        // Check Parent (Adult)
        const userAttendee = campout.adults.find(a => a.adultId === userId && a.role === "ATTENDEE")
        if (userAttendee) {
            const paidAmount = campout.transactions
                .filter(t =>
                    ["REGISTRATION_INCOME", "CAMP_TRANSFER", "EVENT_PAYMENT"].includes(t.type) &&
                    t.userId === userId &&
                    t.status === "APPROVED"
                )
                .reduce((sum, t) => sum + Number(t.amount), 0)

            if (paidAmount < costPerPerson) {
                dueItems.push({
                    campout,
                    name: "You (Adult)",
                    cost: costPerPerson,
                    paid: paidAmount,
                    type: 'ADULT'
                })
            }
        }
    }

    if (dueItems.length === 0) return <div className="text-gray-500 bg-green-50 p-4 rounded border border-green-200">All caught up! No payments due.</div>

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {dueItems.map((item, idx) => (
                <div key={`${item.campout.id}-${idx}`} className="bg-red-50 border border-red-200 rounded-lg p-4 flex flex-col gap-3">
                    <div className="flex items-start justify-between">
                        <div>
                            <h3 className="font-bold text-gray-900">{item.campout.name}</h3>
                            <p className="text-sm text-red-600 font-medium">Due for {item.name}</p>
                        </div>
                        <AlertCircle className="text-red-500 w-5 h-5" />
                    </div>

                    <div className="mt-auto pt-2 border-t border-red-100 flex items-center justify-between">
                        <span className="font-bold text-red-700">{formatCurrency(item.cost)}</span>

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Link href={`/dashboard/campouts/${item.campout.id}`}>
                                    <Button size="sm" variant="destructive" className="bg-red-600 hover:bg-red-700">
                                        Pay Now <ArrowRight className="w-4 h-4 ml-1" />
                                    </Button>
                                </Link>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Proceed to payment for {item.campout.name}</p>
                            </TooltipContent>
                        </Tooltip>
                    </div>
                </div>
            ))}
        </div>
    )
}
