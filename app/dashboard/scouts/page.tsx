import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { ScoutTable } from "@/components/scouts/scout-table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DataTableExport } from "@/components/ui/data-table-export"
import { formatCurrency } from "@/lib/utils"

export const dynamic = 'force-dynamic'

export default async function Page() {
    // Fetch Troop Settings
    const troopSettings = await prisma.troopSettings.findFirst()
    const headerInfo = {
        troopName: troopSettings?.name || "Troop Treasury",
        council: troopSettings?.council || "",
        district: troopSettings?.district || "",
        address: troopSettings?.address || ""
    }

    const session = await auth()
    const role = session?.user?.role || "SCOUT"

    if (role === 'SCOUT') {
        const scout = await prisma.scout.findUnique({
            where: { userId: session?.user?.id }
        })
        if (scout) {
            redirect(`/dashboard/scouts/${scout.id}`)
        }
        return (
            <div className="flex flex-col items-center justify-center p-12">
                <h2 className="text-xl font-bold text-red-600">Unauthorized</h2>
                <p>No associated scout profile found for your account.</p>
            </div>
        )
    }

    // Filter scouts for Parents
    let whereClause: any = {}
    if (role === 'PARENT') {
        const parentScouts = await prisma.parentScout.findMany({
            where: { parentId: session?.user?.id },
            select: { scoutId: true }
        })
        whereClause = { id: { in: parentScouts.map(ps => ps.scoutId) } }
    }

    const rawScouts = await prisma.scout.findMany({
        where: whereClause,
        orderBy: { name: 'asc' },
    })

    const scouts = rawScouts.map(scout => ({
        ...scout,
        ibaBalance: Number(scout.ibaBalance),
    }))

    const exportData = scouts.map(s => ({
        name: s.name,
        balance: s.ibaBalance,
        formattedBalance: formatCurrency(s.ibaBalance)
    }))

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Scouts</h1>
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Roster {role === 'PARENT' ? '(My Scouts)' : ''}</CardTitle>
                    <DataTableExport
                        data={exportData}
                        columns={[
                            { header: "Name", accessorKey: "name" },
                            { header: "IBA Balance", accessorKey: "formattedBalance" }
                        ]}
                        filename={`TroopTreasury_ScoutRoster_${new Date().toISOString().split('T')[0]}`}
                        title="Scout Roster"
                        headerInfo={headerInfo}
                    />
                </CardHeader>
                <CardContent>
                    <ScoutTable scouts={scouts} />
                </CardContent>
            </Card>
        </div>
    )
}
