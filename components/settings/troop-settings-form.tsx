"use client"

import { useActionState, useState } from "react"
import { updateTroopSettings } from "@/app/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

import { cn } from "@/lib/utils"

export function TroopSettingsForm({ initialData, className }: { initialData?: any, className?: string }) {
    const [state, dispatch, isPending] = useActionState(updateTroopSettings, undefined)
    const [logoPreview, setLogoPreview] = useState<string | null>(initialData?.logoBase64 || null)

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            const reader = new FileReader()
            reader.onloadend = () => {
                setLogoPreview(reader.result as string)
            }
            reader.readAsDataURL(file)
        }
    }

    return (
        <Card className={cn(className)}>
            <CardHeader>
                <CardTitle>Troop Configuration</CardTitle>
                <CardDescription>Tell us about your troop.</CardDescription>
            </CardHeader>
            <form action={dispatch}>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Troop Name</Label>
                        <Input
                            id="name"
                            name="name"
                            defaultValue={initialData?.name || "Troop 123"}
                            required
                            placeholder="e.g. Troop 123"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="council">Council</Label>
                        <Input
                            id="council"
                            name="council"
                            defaultValue={initialData?.council || ""}
                            placeholder="e.g. Great Sky Council"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="district">District</Label>
                        <Input
                            id="district"
                            name="district"
                            defaultValue={initialData?.district || ""}
                            placeholder="e.g. North District"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="sessionTimeoutMinutes">Session Timeout (minutes)</Label>
                        <Input
                            id="sessionTimeoutMinutes"
                            name="sessionTimeoutMinutes"
                            type="number"
                            min="5"
                            max="1440"
                            defaultValue={initialData?.sessionTimeoutMinutes || 15}
                            required
                            placeholder="15"
                        />
                        <p className="text-xs text-muted-foreground">
                            Users will be automatically logged out after this many minutes of inactivity (5-1440 minutes)
                        </p>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="logo">Logo</Label>
                        <Input
                            id="logo"
                            type="file"
                            accept="image/*"
                            onChange={handleLogoChange}
                        />
                        <input type="hidden" name="logoBase64" value={logoPreview || ""} />
                        {logoPreview && (
                            <div className="mt-2">
                                <img src={logoPreview} alt="Logo Preview" className="h-20 object-contain" />
                            </div>
                        )}
                    </div>
                    {state?.error && <p className="text-red-500 text-sm">{state.error}</p>}

                </CardContent>
                <CardFooter>
                    <Button type="submit" disabled={isPending} className="w-full">
                        {isPending ? "Saving..." : "Save & Continue"}
                    </Button>
                </CardFooter>
            </form>
        </Card>
    )
}
