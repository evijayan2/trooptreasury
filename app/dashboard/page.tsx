import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"
import Link from "next/link"
import { Users, CreditCard } from "lucide-react"
import { PaymentsDueList } from "@/components/dashboard/payments-due-list"

export const dynamic = 'force-dynamic'

export default async function Page() {
    const session = await auth()
    const role = session?.user?.role

    let cards: { title: string, value: string, desc: string, link: string }[] = []

    if (role === 'ADMIN' || role === 'FINANCIER' || role === 'LEADER') {
        const incomeTypes = ["REGISTRATION_INCOME", "FUNDRAISING_INCOME", "DONATION_IN", "DUES", "EVENT_PAYMENT", "IBA_DEPOSIT"]
        const expenseTypes = ["EXPENSE", "REIMBURSEMENT", "IBA_RECLAIM"]

        const transactions = await prisma.transaction.findMany({
            where: { status: 'APPROVED' },
            select: { amount: true, type: true }
        })

        const balance = transactions.reduce((acc, t) => {
            if (incomeTypes.includes(t.type)) return acc + Number(t.amount)
            if (expenseTypes.includes(t.type)) return acc - Number(t.amount)
            return acc
        }, 0)

        const activeScouts = await prisma.scout.count({ where: { status: 'ACTIVE' } })

        cards.push({
            title: "Troop Balance",
            value: formatCurrency(balance),
            desc: "Total funds available",
            link: "/dashboard/finance"
        })
        cards.push({
            title: "Active Scouts",
            value: activeScouts.toString(),
            desc: "Currently registered",
            link: "/dashboard/scouts"
        })
    }

    // Fetch linked scouts for anyone (except maybe single-role scouts, but harmless to check)
    // This allows Leaders/Admins who are also Parents to see their children
    const parentLinks = await prisma.parentScout.findMany({
        where: { parentId: session?.user?.id },
        include: { scout: true }
    })

    const scoutCards = parentLinks.map(link => ({
        title: link.scout.name,
        value: formatCurrency(Number(link.scout.ibaBalance)),
        desc: "Current Balance",
        link: `/dashboard/scouts/${link.scout.id}`
    }))
    cards.push(...scoutCards)

    if (role === 'SCOUT') {
        const scout = await prisma.scout.findUnique({
            where: { userId: session?.user?.id },
            include: { transactions: { where: { type: 'DUES' } } }
        })
        if (scout) {
            cards.push({
                title: "My Balance",
                value: formatCurrency(Number(scout.ibaBalance)),
                desc: "Current I.B.A.",
                link: `/dashboard/scouts/${scout.id}`
            })

            // Add Dues Card if needed
            const troopSettings = await prisma.troopSettings.findFirst()
            const targetDues = Number(troopSettings?.annualDuesAmount || 150)
            const paidDues = scout.transactions.reduce((sum, t) => sum + Number(t.amount), 0)
            if (paidDues < targetDues) {
                cards.push({
                    title: "My Dues",
                    value: formatCurrency(targetDues - paidDues),
                    desc: "Annual Dues Remaining",
                    link: "/dashboard/finance/dues"
                })
            }
        }
    }

    return (
        <main>
            <h1 className="mb-4 text-xl md:text-2xl font-bold">
                Dashboard
            </h1>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {cards.map((card, idx) => (
                    <Link href={card.link} key={idx}>
                        <Card className="hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors cursor-pointer">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">
                                    {card.title}
                                </CardTitle>
                                <CreditCard className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{card.value}</div>
                                <p className="text-xs text-muted-foreground">
                                    {card.desc}
                                </p>
                            </CardContent>
                        </Card>
                    </Link>
                ))}
            </div>

            {/* Payments Due Section (For Scouts, Parents, Leaders, Admins) */}
            {session?.user?.id && (
                <div className="mt-8">
                    <h2 className="text-xl font-bold mb-4">Outstanding Payments</h2>
                    <PaymentsDueList userId={session.user.id} />
                </div>
            )}

            {/* 
            <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-4 lg:grid-cols-8">
                <RecentTransactions /> 
            </div> 
            */}
        </main>
    )
}
