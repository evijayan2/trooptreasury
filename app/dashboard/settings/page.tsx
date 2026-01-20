import { auth } from "@/auth"
import { ChangePasswordForm } from "@/components/auth/change-password-form"
import { TroopSettingsForm } from "@/components/settings/troop-settings-form"
import { prisma } from "@/lib/prisma"
import { RolePermissionEditor } from "@/components/admin/role-permission-editor"
import { ResetDatabaseCard } from "@/components/settings/reset-database-card"
import { ExportDbButton } from "@/components/settings/export-db-button"

export default async function Page() {
    const session = await auth()

    const settings = await prisma.troopSettings.findFirst()
    const serializedSettings = settings ? {
        ...settings,
        annualDuesAmount: settings.annualDuesAmount.toString()
    } : undefined

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">Settings</h1>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-6">
                    <ChangePasswordForm />
                </div>

                {session?.user?.role === 'ADMIN' && (
                    <div className="md:col-span-1 lg:col-span-2 space-y-6">
                        <TroopSettingsForm initialData={serializedSettings} className="h-fit" />
                    </div>
                )}
            </div>

            {session?.user?.role === 'ADMIN' && (
                <div className="space-y-6">
                    <RolePermissionEditor initialPermissions={settings?.rolePermissions as any} />
                    <ResetDatabaseCard />
                    <ExportDbButton />
                </div>
            )}
        </div>
    )
}
