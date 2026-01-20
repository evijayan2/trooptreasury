"use client"

import { useActionState } from "react"
import { authenticate } from "@/app/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"


export default function LoginPage() {
    const [errorMessage, dispatch, isPending] = useActionState(authenticate, undefined)

    return (
        <div className="w-full lg:grid lg:grid-cols-2 min-h-screen">
            <div className="flex items-center justify-center p-6 lg:p-10 order-first lg:order-last">
                <div className="mx-auto grid w-full max-w-[350px] gap-6">
                    <div className="grid gap-2 text-center">
                        <h1 className="text-3xl font-bold">Login</h1>
                        <p className="text-balance text-muted-foreground">
                            Enter your email below to login to your account
                        </p>
                    </div>
                    <form action={dispatch} className="grid gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                name="email"
                                placeholder="m@example.com"
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <div className="flex items-center">
                                <Label htmlFor="password">Password</Label>
                            </div>
                            <Input id="password" type="password" name="password" required />
                        </div>
                        {errorMessage && (
                            <div className="text-red-500 text-sm bg-red-50 dark:bg-red-950/30 p-3 rounded-md border border-red-200 dark:border-red-900">
                                {errorMessage}
                            </div>
                        )}
                        <Button type="submit" className="w-full" disabled={isPending}>
                            {isPending ? "Logging in..." : "Login"}
                        </Button>
                    </form>
                </div>
            </div>
            <div className="hidden lg:flex flex-col items-center justify-center p-10 dark:border-r h-full relative overflow-hidden order-last lg:order-first bg-muted">
                <div className="relative z-20 flex items-center text-lg font-medium mb-10">
                    <img
                        src="/trooptreasury-logo-transparent.png"
                        alt="TroopTreasury Logo"
                        className="w-auto h-32 lg:h-72 object-contain"
                    />
                </div>
                {/* Optional decorative background elements or patterns can go here if needed, 
                    but sticking to a clean look as requested. 
                    The bg-muted handles the background color. */}
            </div>
        </div>
    )
}
