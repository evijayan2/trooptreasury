import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { TroopSettingsForm } from "@/components/settings/troop-settings-form"
import { redirect } from "next/navigation"

export default async function Page() {
    const session = await auth()
    if (!session || session.user.role !== "ADMIN") {
        redirect("/login")
    }

    const settings = await prisma.troopSettings.findFirst()

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-6">
            <div className="w-full max-w-xl">
                <h1 className="text-3xl font-bold mb-6 text-center">Setup Troop Configuration</h1>
                <TroopSettingsForm initialData={settings} className="bg-white p-6 rounded-lg shadow-md" />
            </div>
        </div>
    )
}
