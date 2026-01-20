import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { formatCurrency } from "@/lib/utils"
import { CalendarDays, MapPin } from "lucide-react"
import { CampoutRoster } from "@/components/campouts/campout-roster"
import { TransactionTable } from "@/components/transactions/transaction-table"
import { CampoutAdults } from "@/components/campouts/campout-adults"
import { ExpenseLogger } from "@/components/campouts/expense-logger"
import { PendingReimbursements } from "@/components/campouts/pending-reimbursements"
import { IBAPayment } from "@/components/campouts/iba-payment"
import { PaymentRecorder } from "@/components/campouts/payment-recorder"
import { FinancialReport } from "@/components/campouts/financial-report"
import { RoleSwitcher } from "@/components/campouts/role-switcher"
import { RemoveParticipantButton } from "@/components/campouts/remove-participant-button"
import { FinalizeCampoutButton } from "@/components/campouts/finalize-button"
import { Button } from "@/components/ui/button"
import { PayCashButton } from "@/components/campouts/pay-cash-button"
import { PayoutControls } from "@/components/campouts/payout-controls"

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
    // ... existing setup
    const { id } = await params
    const session = await auth()
    const role = session?.user?.role || "SCOUT"

    const campout: any = await prisma.campout.findUnique({
        where: { id },
        include: {
            scouts: { include: { scout: true } },
            transactions: {
                include: {
                    scout: true,
                    user: true
                }
            },
            expenses: { include: { adult: true } },
            adults: { include: { adult: true } }
        }
    })

    if (campout?.transactions) {
        console.log("DEBUG TRANSACTIONS:", campout.transactions.map((t: any) => ({
            id: t.id,
            type: t.type,
            amount: t.amount,
            userId: t.userId,
            scoutId: t.scoutId
        })))
    }

    if (!campout) notFound()

    const allScouts = await prisma.scout.findMany({ where: { status: "ACTIVE" } })
    const allAdults = await prisma.user.findMany({
        where: { role: { in: ["ADMIN", "LEADER", "FINANCIER", "PARENT"] } }
    })

    // Data for Financials Table (Transactions)
    const expenses = campout.transactions.filter((t: any) => t.type === "EXPENSE" || t.type === "REIMBURSEMENT")

    // Calculate Total Cost (Direct Expenses + All Adult Expenses)
    // We exclude REIMBURSEMENT transactions from cost calc because they are covered by AdultExpenses
    const directExpenses = campout.transactions.filter((t: any) => t.type === "EXPENSE")
    const transactionsCost = directExpenses.reduce((sum: number, t: any) => sum + Number(t.amount), 0)
    const adultExpensesCost = campout.expenses.reduce((sum: number, e: any) => sum + Number(e.amount), 0)

    const totalCampoutCost = transactionsCost + adultExpensesCost

    // Group adults by ID to handle dual roles
    const adultRoleMap = new Map<string, { adult: any, roles: Set<string> }>()
    campout.adults.forEach((a: any) => {
        if (!adultRoleMap.has(a.adultId)) {
            adultRoleMap.set(a.adultId, { adult: a.adult, roles: new Set() })
        }
        adultRoleMap.get(a.adultId)!.roles.add(a.role)
    })

    // Split Adults based on their roles
    const paidLinkIds = new Set(campout.expenses.map((e: any) => e.adultId))
    const organizers = Array.from(adultRoleMap.values())
        .filter(({ roles, adult }) => roles.has("ORGANIZER") || paidLinkIds.has(adult.id))
        .map(({ adult, roles }) => ({ adult, roles: Array.from(roles), adultId: adult.id }))

    const attendees = Array.from(adultRoleMap.values())
        .filter(({ roles }) => roles.has("ATTENDEE"))
        .map(({ adult, roles }) => ({ adult, roles: Array.from(roles), adultId: adult.id }))

    // Calculate Roster Counts (Scouts + Attendees)
    // Organizers are NOT included in cost splitting unless they are Attendees
    const scoutCount = campout.scouts.length
    const totalPeople = scoutCount + attendees.length
    const rawCost = totalPeople > 0 ? totalCampoutCost / totalPeople : 0
    const costPerPerson = Math.round(rawCost * 100) / 100

    // Check Payments for Attendees
    const attendeePayments = campout.transactions.filter((t: any) => t.type === "REGISTRATION_INCOME" && t.userId)
    const paidAdultMap = new Map()
    attendeePayments.forEach((t: any) => {
        const current = paidAdultMap.get(t.userId!) || 0
        paidAdultMap.set(t.userId!, current + Number(t.amount))
    })


    // Prepare data for Parent/Scout payment
    let linkedScouts: any[] = []
    const links = await prisma.parentScout.findMany({
        where: { parentId: session?.user?.id },
        include: { scout: true }
    })
    linkedScouts = links.map(l => l.scout).filter(s => campout.scouts.some((cs: any) => cs.scoutId === s.id))

    if (role === 'SCOUT') {
        const scout = await prisma.scout.findUnique({ where: { userId: session?.user?.id } })
        if (scout && campout.scouts.some((cs: any) => cs.scoutId === scout.id)) {
            if (!linkedScouts.find(ls => ls.id === scout.id)) {
                linkedScouts.push(scout)
            }
        }
    }

    // Filter pending expenses
    const pendingExpenses = campout.expenses.filter((e: any) => !e.isReimbursed)
    const canApprove = ["ADMIN", "FINANCIER"].includes(role)

    // Serialization
    const serializedPendingExpenses = pendingExpenses.map((e: any) => ({
        ...e,
        amount: Number(e.amount)
    }))

    const serializedExpenses = [
        ...expenses.map((t: any) => ({
            ...t,
            amount: Number(t.amount),
            scout: t.scout ? { ...t.scout, ibaBalance: Number(t.scout.ibaBalance) } : null,
            entryType: 'TRANSACTION'
        })),
        ...campout.expenses.map((e: any) => ({
            id: e.id,
            createdAt: e.createdAt,
            type: 'EXPENSE',
            description: `${e.description} (${e.adult.name})`,
            amount: Number(e.amount),
            status: e.isReimbursed ? 'APPROVED' : 'PENDING',
            entryType: 'ADULT_EXPENSE'
        }))
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    const organizersWithExpenses = organizers.map(org => {
        const pending = campout.expenses
            .filter((e: any) => e.adultId === org.adultId && !e.isReimbursed)
            .reduce((sum: number, e: any) => sum + Number(e.amount), 0)
        return {
            adultId: org.adultId,
            adultName: org.adult.name,
            pendingExpense: pending
        }
    })

    const serializedLinkedScouts = linkedScouts.map(s => ({
        ...s,
        ibaBalance: Number(s.ibaBalance)
    }))

    // Debug logging
    console.log("Calc Stats:", {
        id,
        directExp: transactionsCost,
        adultExp: adultExpensesCost,
        total: totalCampoutCost,
        people: totalPeople,
        perPerson: costPerPerson
    })

    // Calculate Total Collected
    const totalCollected = campout.transactions
        .filter((t: any) => ["CAMP_TRANSFER", "REGISTRATION_INCOME", "EVENT_PAYMENT"].includes(t.type) && t.status === "APPROVED")
        .reduce((sum: number, t: any) => sum + Number(t.amount), 0)

    // Prepare My Scouts Payment Data
    const myScoutsData = serializedLinkedScouts.map(scout => {
        const amountPaid = campout.transactions
            .filter((t: any) =>
                ["CAMP_TRANSFER", "EVENT_PAYMENT"].includes(t.type) &&
                t.scoutId === scout.id &&
                !t.userId && // Ensure it's not a payment for an Adult
                t.status === "APPROVED"
            )
            .reduce((sum: number, t: any) => sum + Number(t.amount), 0)
        const isPaid = amountPaid >= costPerPerson && costPerPerson > 0

        return {
            ...scout,
            amountPaid,
            isPaid
        }
    })



    // Check Current User Status
    // A user might have multiple entries (e.g. Organizer AND Attendee), so we check all matches.
    const myAdultRecords = campout.adults.filter((a: any) => a.adultId === session?.user?.id)
    const isOrganizer = myAdultRecords.some((a: any) => a.role === "ORGANIZER")
    // Consider them a participant if they have any record in the campout
    const isParticipatingAdult = myAdultRecords.length > 0

    // Check if they are listed specifically as an attendee for payment purposes
    const isAttendee = attendees.some((a: any) => a.adult.id === session?.user?.id)

    let myAdultPaymentData = null
    if (isAttendee) {
        const amountPaid = campout.transactions
            .filter((t: any) =>
                ["REGISTRATION_INCOME", "CAMP_TRANSFER", "EVENT_PAYMENT"].includes(t.type) &&
                t.userId === session?.user?.id &&
                t.status === "APPROVED"
            )
            .reduce((sum: number, t: any) => sum + Number(t.amount), 0)
        const isPaid = amountPaid >= costPerPerson
        myAdultPaymentData = { amountPaid, isPaid }
    }

    const canViewFinances = ["ADMIN", "FINANCIER"].includes(role) || isOrganizer
    const canViewRoster = ["ADMIN", "FINANCIER", "LEADER"].includes(role) || isOrganizer

    return (
        <div className="space-y-6">
            {/* ... Header ... */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">{campout.name}</h1>
                    <div className="flex items-center gap-4 text-gray-500 mt-2">
                        <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {campout.location}</span>
                        <span className="flex items-center gap-1"><CalendarDays className="w-4 h-4" /> {new Date(campout.startDate).toLocaleDateString()} - {campout.endDate ? new Date(campout.endDate).toLocaleDateString() : 'TBD'}</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${campout.status === 'OPEN' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                            campout.status === 'READY_FOR_PAYMENT' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                            }`}>
                            {campout.status.replace(/_/g, " ")}
                        </span>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-2xl font-bold">{campout.estimatedCost ? formatCurrency(Number(campout.estimatedCost)) : 'N/A'}</div>
                    <div className="text-xs text-gray-400">Est. Total Cost</div>

                    {totalPeople > 0 && (
                        <div className="mt-2 text-sm">
                            <span className="font-semibold text-gray-700">Share per Person:</span>
                            <div className="text-xl font-bold text-primary">{formatCurrency(costPerPerson)}</div>
                            <div className="text-xs text-gray-500 mt-1">
                                Collected: <span className="text-green-600 font-bold">{formatCurrency(totalCollected)}</span>
                            </div>
                        </div>
                    )}

                    {/* Admin Actions */}
                    {["ADMIN", "FINANCIER"].includes(role) && (
                        <div className="mt-2">
                            {campout.status === 'OPEN' ? (
                                <FinalizeCampoutButton campoutId={campout.id} />
                            ) : (
                                <PayoutControls
                                    campoutId={campout.id}
                                    status={campout.status}
                                    organizers={organizersWithExpenses}
                                />
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Parent/Scout Action Section */}
            {(myScoutsData.length > 0 || myAdultPaymentData) && (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {/* My Participation (Adult) */}
                    {myAdultPaymentData && (
                        <div className="bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/50 rounded-lg p-4 flex flex-col gap-3">
                            <div>
                                <h3 className="font-bold text-lg">My Participation</h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {isOrganizer && isAttendee ? "Organizer & Attendee" : isOrganizer ? "Organizer" : "Adult Attendee"}
                                </p>
                            </div>
                            <div className="flex items-center justify-between mt-auto">
                                <div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">Share Due</div>
                                    <div className="font-bold text-gray-900 dark:text-gray-100">{formatCurrency(costPerPerson)}</div>
                                </div>
                                {myAdultPaymentData.isPaid ? (
                                    <span className="px-3 py-1 bg-green-200 text-green-800 rounded-full text-xs font-bold">PAID</span>
                                ) : (
                                    <>
                                        {campout.status === 'READY_FOR_PAYMENT' ? (
                                            <div className="flex flex-col items-end gap-2 mt-2 w-full max-w-[140px]">
                                                {(() => {
                                                    const hasFunds = serializedLinkedScouts.some((s: any) => Number(s.ibaBalance) >= costPerPerson)
                                                    const isDisabled = serializedLinkedScouts.length === 0 || !hasFunds
                                                    return (
                                                        <IBAPayment
                                                            campoutId={campout.id}
                                                            linkedScouts={serializedLinkedScouts}
                                                            defaultAmount={costPerPerson}
                                                            beneficiaryId={session?.user?.id}
                                                            disabled={isDisabled}
                                                            label="Pay with IBA"
                                                        />
                                                    )
                                                })()}
                                                <PayCashButton message={`Please pay ${formatCurrency(costPerPerson)} cash to the organizer.`} />
                                            </div>
                                        ) : (
                                            <span className="text-xs text-gray-500 italic">Waiting for finalization</span>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    {/* My Scouts */}
                    {myScoutsData.map(scout => (
                        <div key={scout.id} className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 rounded-lg p-4 flex flex-col gap-3">
                            <div>
                                <h3 className="font-bold text-lg">{scout.name}</h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400">IBA Balance: {formatCurrency(scout.ibaBalance)}</p>
                            </div>

                            <div className="flex items-center justify-between mt-auto">
                                <div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">Share Due</div>
                                    <div className="font-bold text-gray-900 dark:text-gray-100">{formatCurrency(costPerPerson)}</div>
                                </div>

                                {scout.isPaid ? (
                                    <span className="px-3 py-1 bg-green-200 text-green-800 rounded-full text-xs font-bold">
                                        PAID
                                    </span>
                                ) : (
                                    <>
                                        {campout.status === 'READY_FOR_PAYMENT' ? (
                                            <div className="flex flex-col gap-2 w-full sm:w-auto min-w-[140px]">
                                                <IBAPayment
                                                    campoutId={campout.id}
                                                    linkedScouts={[scout]} // Pass only this scout
                                                    defaultAmount={costPerPerson}
                                                    disabled={Number(scout.ibaBalance) < costPerPerson}
                                                    label={Number(scout.ibaBalance) < costPerPerson ? "Insuff. Funds" : "Pay with IBA"}
                                                />
                                                <PayCashButton message={`Please pay ${formatCurrency(costPerPerson)} cash to the organizer.`} />

                                                {["ADMIN", "FINANCIER", "LEADER"].includes(role) && (
                                                    <PaymentRecorder
                                                        campoutId={campout.id}
                                                        scoutId={scout.id}
                                                        adultName={scout.name}
                                                        defaultAmount={costPerPerson}
                                                        label="Record Pay"
                                                        className="w-full"
                                                        variant="outline"
                                                    />
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-xs text-gray-500 italic">Waiting for finalization</span>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="grid gap-6 md:grid-cols-2">
                {/* ... Financials Column ... */}
                {canViewFinances && (
                    <div className="space-y-6">
                        <div className="p-6 bg-white dark:bg-card dark:text-card-foreground rounded-lg border shadow-sm space-y-4">
                            <div className="flex justify-between items-center">
                                <h2 className="text-xl font-semibold">Financials</h2>
                                <ExpenseLogger
                                    campoutId={campout.id}
                                    adults={campout.adults}
                                    allAdults={allAdults}
                                    currentUserId={session?.user?.id}
                                    userRole={role}
                                />
                            </div>
                            <p className="text-sm text-gray-500">Total Exp: {formatCurrency(totalCampoutCost)}</p>

                            {canApprove && serializedPendingExpenses.length > 0 && (
                                <PendingReimbursements expenses={serializedPendingExpenses} />
                            )}

                            {serializedExpenses.length > 0 ? (
                                <TransactionTable transactions={serializedExpenses} />
                            ) : (
                                <p className="text-gray-500 text-sm">No expenses recorded.</p>
                            )}
                        </div>
                    </div>
                )}
                {/* ... Roster Column ... */}
                {canViewRoster && (
                    <div className="space-y-6">
                        <div className="p-6 bg-white dark:bg-card dark:text-card-foreground rounded-lg border shadow-sm">
                            <CampoutRoster
                                campoutId={campout.id}
                                registeredScouts={campout.scouts.map((cs: any) => {
                                    const paidAmount = campout.transactions
                                        .filter((t: any) =>
                                            ["CAMP_TRANSFER", "EVENT_PAYMENT"].includes(t.type) &&
                                            t.scoutId === cs.scout.id &&
                                            !t.userId && // Ensure it's not a payment for an Adult
                                            t.status === "APPROVED"
                                        )
                                        .reduce((sum: number, t: any) => sum + Number(t.amount), 0)
                                    const isPaid = paidAmount >= costPerPerson
                                    return {
                                        ...cs,
                                        scout: { ...cs.scout, ibaBalance: Number(cs.scout.ibaBalance) },
                                        isPaid
                                    }
                                })}
                                allScouts={allScouts.map(s => ({ ...s, ibaBalance: Number(s.ibaBalance) }))}
                                canEdit={["ADMIN", "LEADER", "FINANCIER"].includes(role)}
                                costPerPerson={costPerPerson}
                            />
                        </div>




                        <div className="p-6 bg-white dark:bg-card dark:text-card-foreground rounded-lg border shadow-sm space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="text-lg font-semibold">Adults</h3>
                                {/* Assign Adult Button could go here or inside CampoutAdults component */}
                                { /* For now, relying on CampoutAdults but modifying it to handle roles? 
                                  Actually, CampoutAdults logic is complex. 
                                  Let's replace CampoutAdults usage with inline rendering or update the component.
                                  The user wants separation.
                                  I will keep CampoutAdults for "Adding" adults but maybe display is custom here?
                                  No, let's update CampoutAdults component to Handle roles?
                                  Or just render two lists here.
                             */ }
                                <CampoutAdults
                                    campoutId={campout.id}
                                    adults={campout.adults} // Passing all adults, component needs update to handle roles or we just list them here.
                                    allAdults={allAdults}
                                />
                            </div>

                            {/* Custom Rendering for Roles Display if CampoutAdults doesn't do it */}
                            <div className="bg-white dark:bg-card dark:text-card-foreground p-6 rounded-lg shadow">
                                <h2 className="text-xl font-semibold mb-4">Organizers</h2>
                                <ul className="space-y-2">
                                    {organizers.map(o => {
                                        const isMe = o.adultId === session?.user?.id
                                        const canEdit = ["ADMIN", "LEADER", "FINANCIER"].includes(role)
                                        return (
                                            <li key={o.adult.id} className="flex justify-between items-center bg-gray-50 dark:bg-muted p-3 rounded">
                                                <div className="flex flex-col">
                                                    <span>{o.adult.name}</span>
                                                </div>
                                                {canEdit && (
                                                    <RemoveParticipantButton campoutId={campout.id} id={o.adult.id} type="ADULT" />
                                                )}
                                            </li>
                                        )
                                    })}
                                    {organizers.length === 0 && <li className="text-gray-400 text-sm italic">None</li>}
                                </ul>
                            </div>

                            <div className="bg-white dark:bg-card p-6 rounded-lg shadow mt-6">
                                <h2 className="text-xl font-semibold mb-4">Attendees ({attendees.length})</h2>
                                <ul className="space-y-2">
                                    {attendees.map((a: any) => {
                                        // Check payment status for this adult
                                        const paidAmount = campout.transactions
                                            .filter((t: any) => t.userId === a.adultId && ["REGISTRATION_INCOME", "CAMP_TRANSFER", "EVENT_PAYMENT"].includes(t.type) && t.status === "APPROVED")
                                            .reduce((sum: number, t: any) => sum + Number(t.amount), 0)

                                        const isPaid = paidAmount >= costPerPerson
                                        const isMe = a.adultId === session?.user?.id

                                        const canEdit = ["ADMIN", "LEADER", "FINANCIER"].includes(role)
                                        return (
                                            <li key={a.adult.id} className="flex justify-between items-center bg-gray-50 dark:bg-muted p-3 rounded">
                                                <div className="flex items-center gap-2">
                                                    <span>{a.adult.name}</span>
                                                    {canEdit && (
                                                        <RemoveParticipantButton campoutId={campout.id} id={a.adult.id} type="ADULT" />
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {isPaid ? (
                                                        <span className="px-2 py-0.5 bg-green-200 text-green-800 rounded text-xs font-bold">PAID</span>
                                                    ) : (
                                                        <>
                                                            <span className="text-xs text-red-500 font-semibold">{formatCurrency(costPerPerson)} Due</span>
                                                            {/* Admin Record Payment (For Others) */}
                                                            {!isMe && (role === "ADMIN" || role === "FINANCIER" || role === "LEADER") && (
                                                                <PaymentRecorder
                                                                    campoutId={campout.id}
                                                                    adultId={a.adult.id}
                                                                    defaultAmount={costPerPerson}
                                                                    label="Record Pay"
                                                                />
                                                            )}

                                                            {/* Self Pay with IBA or Cash */}
                                                            {isMe && campout.status === 'READY_FOR_PAYMENT' && !isPaid && (
                                                                <div className="flex flex-col items-end gap-2 mt-2 w-full max-w-[140px]">
                                                                    {(() => {
                                                                        const hasFunds = serializedLinkedScouts.some((s: any) => Number(s.ibaBalance) >= costPerPerson)
                                                                        const isDisabled = serializedLinkedScouts.length === 0 || !hasFunds
                                                                        return (
                                                                            <IBAPayment
                                                                                campoutId={campout.id}
                                                                                linkedScouts={serializedLinkedScouts}
                                                                                defaultAmount={costPerPerson}
                                                                                beneficiaryId={a.adult.id}
                                                                                disabled={isDisabled}
                                                                                label="Pay with IBA"
                                                                            />
                                                                        )
                                                                    })()}

                                                                    {(role === "ADMIN" || role === "FINANCIER" || role === "LEADER") ? (
                                                                        <PaymentRecorder
                                                                            campoutId={campout.id}
                                                                            adultId={a.adult.id}
                                                                            defaultAmount={costPerPerson}
                                                                            label="Pay Cash"
                                                                            className="w-full"
                                                                            variant="outline"
                                                                        />
                                                                    ) : (
                                                                        <PayCashButton message={`Please pay ${formatCurrency(costPerPerson)} cash to the organizer.`} />
                                                                    )}
                                                                </div>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </li>
                                        )
                                    })}
                                    {attendees.length === 0 && <li className="text-gray-400 text-sm italic">None</li>}
                                </ul>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            {/* Financial Report (Admin/Organizer Only) - Full Width at Bottom */}
            {canViewFinances && (
                <div className="p-6 bg-white dark:bg-card dark:text-card-foreground rounded-lg border shadow-sm mt-6">
                    <FinancialReport
                        transactions={campout.transactions.map((t: any) => ({
                            ...t,
                            amount: Number(t.amount),
                            scout: t.scout ? { ...t.scout, ibaBalance: Number(t.scout.ibaBalance) } : null
                        }))}
                        expenses={campout.expenses.map((e: any) => ({ ...e, amount: Number(e.amount) }))}
                    />
                </div>
            )}

        </div>
    )
}
