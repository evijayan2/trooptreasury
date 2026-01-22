"use server"

import { prisma } from "@/lib/prisma"
import { Decimal } from "decimal.js"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const scoutImportSchema = z.object({
    name: z.string().min(1),
    balance: z.number().optional(),
    email: z.string().email().optional().or(z.literal("")),
})

export async function importScouts(prevState: any, formData: FormData) {
    const file = formData.get("file") as File
    if (!file) {
        return { error: "No file provided" }
    }

    const text = await file.text()
    const lines = text.split(/\r?\n/)

    // Basic CSV parsing
    // Check if first line is likely a header
    const firstLineLower = lines[0].toLowerCase().trim()
    const headerKeywords = ["name", "scout", "scout name", "full name"]
    // It's a header if it strictly equals one of the keywords OR starts with "keyword," (indicating multiple columns)
    const isHeader = headerKeywords.some(k => firstLineLower === k || firstLineLower.startsWith(k + ","))
    const startIndex = isHeader ? 1 : 0

    let createdCount = 0
    let updatedCount = 0
    let errors: string[] = []

    for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) continue

        const parts = line.split(",")
        if (parts.length < 1) continue

        const name = parts[0].trim()
        const balanceStr = parts[1]?.trim()
        const email = parts[2]?.trim()

        // Validate
        const dataToValidate = {
            name,
            balance: balanceStr ? parseFloat(balanceStr) : 0,
            email: email || "",
        }

        const validation = scoutImportSchema.safeParse(dataToValidate)

        if (!validation.success) {
            errors.push(`Row ${i + 1}: Invalid data for ${name || "Unknown"}`)
            continue
        }

        try {
            const { name, balance, email } = validation.data
            const ibaBalance = new Decimal(balance || 0)

            // 1. Check if Scout exists
            let existingScout = null

            // Check by Email first if provided
            if (email) {
                existingScout = await prisma.scout.findUnique({
                    where: { email }
                })
            }

            // If not found by email, check by Name (case-insensitive attempt?)
            // Prisma doesn't do case-insensitive findUnique easily, so use findFirst with mode sensitive or just exact match
            // Let's rely on exact name match for now to be safe, or just `name` if email is missing.
            if (!existingScout) {
                existingScout = await prisma.scout.findFirst({
                    where: {
                        name: {
                            equals: name,
                            mode: 'insensitive' // Postgres only
                        }
                    }
                })
            }

            if (existingScout) {
                // UPDATE
                await prisma.scout.update({
                    where: { id: existingScout.id },
                    data: {
                        // Update balance? Maybe we should ADD to balance or SET it?
                        // "Import" usually implies setting initial state or syncing.
                        // Given "ibaBalance", let's assume we are syncing the current balance.
                        ibaBalance: ibaBalance,
                        // Update email if we have one and they don't?
                        email: (email && !existingScout.email) ? email : undefined,
                        status: 'ACTIVE' // Reactivate if inactive?
                    }
                })
                updatedCount++
            } else {
                // CREATE
                await prisma.scout.create({
                    data: {
                        name: name,
                        status: 'ACTIVE',
                        ibaBalance: ibaBalance,
                        // @ts-ignore
                        email: email || null
                    }
                })
                createdCount++
            }

        } catch (e: any) {
            console.error(`Import Error Row ${i + 1}:`, e)
            errors.push(`Row ${i + 1}: Failed to save ${name} - ${e.message}`)
        }
    }

    revalidatePath("/dashboard/scouts")

    const messages = []
    if (createdCount > 0) messages.push(`${createdCount} newly added`)
    if (updatedCount > 0) messages.push(`${updatedCount} already exists`)

    if (messages.length === 0) {
        return {
            success: true,
            count: 0,
            errors: errors.length > 0 ? errors : undefined,
            message: `No scouts imported.${errors.length > 0 ? ` ${errors.length} failed.` : ""}`
        }
    }

    const successMessage = `Import complete: ${messages.join(", ")}.`

    return {
        success: true,
        count: createdCount + updatedCount,
        errors: errors.length > 0 ? errors : undefined,
        message: `${successMessage}${errors.length > 0 ? ` ${errors.length} failed.` : ""}`
    }
}
