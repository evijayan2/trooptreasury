import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"
import { auth } from "@/auth"
import { redirect } from "next/navigation"

export default async function FinanceLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const session = await auth()
    // Basic role check, though middleware might handle it.
    if (!session) redirect("/login")

    // Simple check: Parents/Scouts might see limited view, but let's allow access to layout
    // and handle sub-page permissions or content hiding inside.

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Financial Management</h1>
                <p className="text-muted-foreground">
                    Track budget, fundraising, expenses, and scout accounts.
                </p>
            </div>

            <div className="border-b pb-4 overflow-x-auto">
                <nav className="flex space-x-4">
                    <NavLink href="/dashboard/finance">Overview</NavLink>
                    <NavLink href="/dashboard/finance/budget">Budget</NavLink>
                    <NavLink href="/dashboard/finance/fundraising">Fundraising</NavLink>
                    <NavLink href="/dashboard/finance/expenses">Expenses</NavLink>
                    <NavLink href="/dashboard/finance/dues">Dues</NavLink>
                    {session.user.role === 'ADMIN' || session.user.role === 'FINANCIER' ? (
                        <NavLink href="/dashboard/finance/iba-setup">IBA Setup</NavLink>
                    ) : null}
                </nav>
            </div>

            {children}
        </div>
    )
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
    return (
        <Link
            href={href}
            className="px-3 py-2 text-sm font-medium hover:bg-muted rounded-md transition-colors"
        >
            {children}
        </Link>
    )
}
