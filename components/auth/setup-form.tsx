"use client"

import { useActionState } from "react"
import { setupInitialAdmin } from "@/app/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export function SetupForm() {
    const [state, dispatch, isPending] = useActionState(setupInitialAdmin, undefined)
    const router = useRouter()

    useEffect(() => {
        if (state?.success) {
            // Short delay to show success message before redirect
            const timer = setTimeout(() => {
                router.push("/login")
            }, 1500)
            return () => clearTimeout(timer)
        }
    }, [state?.success, router])

    return (
        <Card className="w-full max-w-md mx-auto">
            <CardHeader>
                <CardTitle>Welcome to TroopTreasury</CardTitle>
                <CardDescription>Create your administrator account to get started.</CardDescription>
            </CardHeader>
            <CardContent>
                <form action={dispatch} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" name="email" type="email" placeholder="admin@example.com" required />
                        {state?.issues?.fieldErrors?.email && (
                            <p className="text-red-500 text-xs">{state.issues.fieldErrors.email[0]}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="name">Full Name</Label>
                        <Input id="name" name="name" placeholder="Troop Leader" required />
                        {state?.issues?.fieldErrors?.name && (
                            <p className="text-red-500 text-xs">{state.issues.fieldErrors.name[0]}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <Input id="password" name="password" type="password" required />
                        {state?.issues?.fieldErrors?.password && (
                            <div className="text-red-500 text-xs mt-2">
                                <p className="font-semibold">Password must be at least 12 characters. Current Password Requirements:</p>
                                <ul className="list-disc list-inside mt-1 space-y-1 text-xs">
                                    <li>At least 12 characters long</li>
                                    <li>At least one uppercase letter</li>
                                    <li>At least one lowercase letter</li>
                                    <li>At least one number</li>
                                    <li>At least one special character (e.g., !@#$%^&*)</li>
                                </ul>
                            </div>
                        )}
                    </div>

                    {state?.error && state.error !== "Invalid fields" && <p className="text-red-500 text-sm">{state.error}</p>}
                    {state?.success && <p className="text-green-500 text-sm">{state.message}. Redirecting...</p>}

                    <Button type="submit" className="w-full" disabled={isPending}>
                        {isPending ? "Creating Admin..." : "Create Admin Account"}
                    </Button>
                </form>
            </CardContent>
        </Card>
    )
}
