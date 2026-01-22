"use client"

import { useActionState, useState, useEffect } from "react"
import { createScout } from "@/app/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Plus } from "lucide-react"

export function AddScoutDialog({ parents }: { parents: { id: string, name: string | null }[] }) {
    const [open, setOpen] = useState(false)

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Scout
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Add New Scout</DialogTitle>
                    <DialogDescription>
                        Manually add a scout to the roster. You can optionally link them to a parent immediately.
                    </DialogDescription>
                </DialogHeader>
                {open && <ScoutCreationForm parents={parents} onSuccess={() => setOpen(false)} />}
            </DialogContent>
        </Dialog>
    )
}

function ScoutCreationForm({ parents, onSuccess }: { parents: { id: string, name: string | null }[], onSuccess: () => void }) {
    const [state, dispatch, isPending] = useActionState(createScout, undefined)

    useEffect(() => {
        if (state?.success) {
            onSuccess()
        }
    }, [state, onSuccess])

    return (
        <form action={dispatch} className="space-y-4 py-4">
            <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" placeholder="Scout Name" required />
                {state?.issues?.fieldErrors?.name && (
                    <p className="text-red-500 text-xs">{state.issues.fieldErrors.name[0]}</p>
                )}
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="age">Age (Optional)</Label>
                    <Input id="age" name="age" type="number" placeholder="12" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="initialBalance">Initial Balance</Label>
                    <Input id="initialBalance" name="initialBalance" type="number" step="0.01" defaultValue="0" />
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select name="status" defaultValue="ACTIVE">
                    <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ACTIVE">Active</SelectItem>
                        <SelectItem value="INACTIVE">Inactive</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <Label htmlFor="email">Email (Optional)</Label>
                <Input id="email" name="email" type="email" placeholder="scout@example.com" />
                <p className="text-xs text-gray-500">Adding an email allows future user account creation.</p>
            </div>

            <div className="space-y-2">
                <Label htmlFor="parentId">Link to Parent (Optional)</Label>
                <Select name="parentId">
                    <SelectTrigger>
                        <SelectValue placeholder="Select a parent..." />
                    </SelectTrigger>
                    <SelectContent>
                        {parents.map(p => (
                            <SelectItem key={p.id} value={p.id}>{p.name || "Unknown"}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">Select a parent to immediately link them.</p>
            </div>

            {state?.error && <p className="text-red-500 text-sm">{state.error}</p>}

            <DialogFooter>
                <Button type="submit" disabled={isPending}>
                    {isPending ? "Adding..." : "Add Scout"}
                </Button>
            </DialogFooter>
        </form>
    )
}
