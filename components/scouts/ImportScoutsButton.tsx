"use client"

import { useActionState, useState, useEffect } from "react"
import { importScouts } from "@/app/actions/import-scouts"
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
import { Upload } from "lucide-react"

export function ImportScoutsButton() {
    const [open, setOpen] = useState(false)

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline">
                    <Upload className="mr-2 h-4 w-4" />
                    Import CSV
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Import Scouts from CSV</DialogTitle>
                    <DialogDescription>
                        Upload a CSV file with columns: <code>Name, Balance, Email</code>.
                    </DialogDescription>
                </DialogHeader>
                {open && <ImportForm onSuccess={() => setOpen(false)} />}
            </DialogContent>
        </Dialog>
    )
}

function ImportForm({ onSuccess }: { onSuccess: () => void }) {
    const [state, dispatch, isPending] = useActionState(importScouts, undefined)

    useEffect(() => {
        if (state?.success) {
            // We keep it open to show success message or close it?
            // Let's rely on the user closing it or show a success alert inside.
            // onSuccess() // Auto close on success? Maybe better to show the result.
        }
    }, [state, onSuccess])

    return (
        <form action={dispatch} className="space-y-4 py-4">
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <Label htmlFor="file">CSV File</Label>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            const csvContent = "Name,Balance,Email\nAlice Scout,0,alice@example.com\nBob Scout,0,"
                            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
                            const link = document.createElement("a")
                            const url = URL.createObjectURL(blob)
                            link.setAttribute("href", url)
                            link.setAttribute("download", "scouts_template.csv")
                            document.body.appendChild(link)
                            link.click()
                            document.body.removeChild(link)
                        }}
                    >
                        Download Template
                    </Button>
                </div>
                <Input id="file" name="file" type="file" accept=".csv" required />
            </div>

            {state?.success && (
                <div className="bg-green-50 p-3 rounded text-green-700 text-sm">
                    {state.message}
                </div>
            )}

            {state?.errors && (
                <div className="bg-red-50 p-3 rounded text-red-700 text-sm max-h-32 overflow-y-auto">
                    <p className="font-bold">Errors:</p>
                    <ul className="list-disc ml-4">
                        {state.errors.map((e, i) => <li key={i}>{e}</li>)}
                    </ul>
                </div>
            )}

            {state?.error && <p className="text-red-500 text-sm">{state.error}</p>}

            <DialogFooter>
                <Button type="submit" disabled={isPending}>
                    {isPending ? "Importing..." : "Upload & Import"}
                </Button>
            </DialogFooter>
        </form>
    )
}
