"use client"

import { useActionState, useState, useEffect } from "react"
import { createUser } from "@/app/actions"
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
import { Plus, X } from "lucide-react"

export function UserForm() {
    const [open, setOpen] = useState(false)

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Add User
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Add New User</DialogTitle>
                    <DialogDescription>
                        Create a new user account. They will receive an email with login details.
                    </DialogDescription>
                </DialogHeader>
                {/* Conditionally render form to reset state when closed */}
                {open && <UserCreationForm onSuccess={() => setOpen(false)} />}
            </DialogContent>
        </Dialog>
    )
}

function UserCreationForm({ onSuccess }: { onSuccess: () => void }) {
    const [state, dispatch, isPending] = useActionState(createUser, undefined)
    const [role, setRole] = useState("LEADER")
    const [childScouts, setChildScouts] = useState<string[]>([""])

    const addScoutField = () => setChildScouts([...childScouts, ""])
    const removeScout = (index: number) => setChildScouts(childScouts.filter((_, i) => i !== index))
    const updateScoutName = (index: number, value: string) => {
        const newScouts = [...childScouts]
        newScouts[index] = value
        setChildScouts(newScouts)
    }

    useEffect(() => {
        if (state?.success) {
            onSuccess()
        }
    }, [state, onSuccess])

    return (
        <form action={dispatch} className="space-y-4 py-4">
            <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" placeholder="John Doe" required />
                {state?.issues?.fieldErrors?.name && (
                    <p className="text-red-500 text-xs">{state.issues.fieldErrors.name[0]}</p>
                )}
            </div>
            <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" placeholder="john@example.com" required />
                {state?.issues?.fieldErrors?.email && (
                    <p className="text-red-500 text-xs">{state.issues.fieldErrors.email[0]}</p>
                )}
            </div>
            <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select name="role" required defaultValue="LEADER" onValueChange={setRole}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ADMIN">Admin</SelectItem>
                        <SelectItem value="FINANCIER">Financier</SelectItem>
                        <SelectItem value="LEADER">Leader (Assistant)</SelectItem>
                        <SelectItem value="SCOUT">Scout</SelectItem>
                        <SelectItem value="PARENT">Parent</SelectItem>
                    </SelectContent>
                </Select>
                {state?.issues?.fieldErrors?.role && (
                    <p className="text-red-500 text-xs">{state.issues.fieldErrors.role[0]}</p>
                )}
            </div>

            {role === 'PARENT' && (
                <div className="space-y-2 p-4 border rounded-md bg-gray-50">
                    <Label>Scouts associated with this Parent</Label>
                    <div className="space-y-2">
                        {childScouts.map((scout, index) => (
                            <div key={index} className="flex items-center gap-2">
                                <Input
                                    name="childScouts"
                                    value={scout}
                                    onChange={(e) => updateScoutName(index, e.target.value)}
                                    placeholder="Scout Name"
                                    required
                                />
                                {childScouts.length > 1 && (
                                    <Button type="button" variant="ghost" size="icon" onClick={() => removeScout(index)}>
                                        <X className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        ))}
                        <Button type="button" variant="outline" size="sm" onClick={addScoutField}>
                            <Plus className="mr-2 h-4 w-4" /> Add Scout
                        </Button>
                    </div>
                </div>
            )}

            {state?.error && <p className="text-red-500 text-sm">{state.error}</p>}

            <DialogFooter>
                <Button type="submit" disabled={isPending}>
                    {isPending ? "Creating..." : "Create User"}
                </Button>
            </DialogFooter>
        </form>
    )
}
