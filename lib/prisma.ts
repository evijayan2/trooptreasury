import { PrismaClient } from "./generated/client"

import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }


const getConnectionString = () => {
    // Prioritize VERCEL_ENV as it distinguishes between 'production' and 'preview' deployments
    if (process.env.VERCEL_ENV === "production") {
        return (
            process.env.PROD_DATABASE_URL ||
            process.env.PROD_POSTGRES_PRISMA_URL ||
            process.env.DATABASE_URL
        )
    }

    if (
        process.env.VERCEL_ENV === "preview" ||
        process.env.VERCEL_ENV === "development"
    ) {
        return (
            process.env.PREVIEW_DATABASE_URL ||
            process.env.PREVIEW_POSTGRES_PRISMA_URL ||
            process.env.DATABASE_URL
        )
    }

    // Fallback for local development or non-Vercel environments
    return process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL
}

const connectionString = getConnectionString()
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)


console.log("Initializing Prisma Client... adapter-pg")
// Triggering client reload
export const prisma = globalForPrisma.prisma || new PrismaClient({ adapter })

if (process.env.NODE_ENV !== "production") {
    console.log("Saving prisma to globalThis")
    globalForPrisma.prisma = prisma
}
