"use client"

import { useActionState, useState, useEffect } from "react"
import { inviteUserForScout, updateScoutEmail } from "@/app/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Mail, UserPlus, Check } from "lucide-react"
import { TooltipProvider } from "@/components/ui/tooltip"

export function ScoutEmailForm({ scoutId, initialEmail, hasUser }: { scoutId: string, initialEmail?: string | null, hasUser: boolean }) {
    const [email, setEmail] = useState(initialEmail || "")
    const [isEditing, setIsEditing] = useState(!initialEmail)
    const [isInvitePending, setIsInvitePending] = useState(false)
    const [isUpdatePending, setIsUpdatePending] = useState(false)
    const [inviteResult, setInviteResult] = useState<{ success?: boolean, error?: string, message?: string } | null>(null)
    const [updateResult, setUpdateResult] = useState<{ success?: boolean, error?: string } | null>(null)

    if (hasUser) {
        return (
            <div className="flex items-center gap-2 text-green-600">
                <Check className="h-4 w-4" />
                <span className="text-sm">User account active ({email})</span>
            </div>
        )
    }

    const handleUpdate = async () => {
        setUpdateResult(null)
        setIsUpdatePending(true)
        const res = await updateScoutEmail(scoutId, email)
        setIsUpdatePending(false)
        if (res.success) {
            setIsEditing(false)
        } else {
            setUpdateResult(res)
        }
    }

    const handleInvite = async () => {
        setIsInvitePending(true)
        const res = await inviteUserForScout(scoutId)
        setIsInvitePending(false)
        setInviteResult(res)
    }

    return (
        <TooltipProvider>
            <div className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <div className="flex flex-col gap-2">
                        <Input
                            id="email"
                            className="w-full"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="scout@example.com"
                            disabled={!isEditing}
                        />
                        {isEditing ? (
                            <Button size="sm" className="w-full" onClick={handleUpdate} disabled={!email || isUpdatePending}>
                                {isUpdatePending ? "Saving..." : "Save & Continue"}
                            </Button>
                        ) : (
                            <Button size="sm" variant="ghost" className="w-full" onClick={() => setIsEditing(true)}>
                                Edit
                            </Button>
                        )}
                    </div>
                    {updateResult?.error && (
                        <p className="text-red-500 text-xs mt-1">{updateResult.error}</p>
                    )}
                    {isEditing && !initialEmail && (
                        <p className="text-xs text-muted-foreground">
                            Enter an email to enable user account creation.
                        </p>
                    )}
                </div>

                {!isEditing && email && (
                    <div>
                        <Button
                            onClick={handleInvite}
                            className="w-full"
                            disabled={isInvitePending}
                        >
                            <UserPlus className="mr-2 h-4 w-4" />
                            {isInvitePending ? "Inviting..." : "Create User & Invite"}
                        </Button>
                        {inviteResult?.error && <p className="text-red-500 text-xs mt-1">{inviteResult.error}</p>}
                        {inviteResult?.success && <p className="text-green-600 text-xs mt-1">{inviteResult.message}</p>}
                    </div>
                )}
            </div>
        </TooltipProvider>
    )
}
