const { PrismaClient, TransactionType } = require('../lib/generated/client')
const { Pool } = require('pg')
const { PrismaPg } = require('@prisma/adapter-pg')
const { Decimal } = require('decimal.js')
require('dotenv').config({ path: '.env.development.local' })

const connectionString = process.env.DATABASE_URL
console.log("Using DB URL:", connectionString)

const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
    console.log('Attempting to create IBA_DEPOSIT with select: { id: true } ...')

    // Find a scout first
    const scout = await prisma.scout.findFirst()
    if (!scout) {
        console.log('No scout found, cannot test.')
        return
    }

    try {
        const result = await prisma.transaction.create({
            data: {
                amount: new Decimal(10.00),
                type: TransactionType.IBA_DEPOSIT,
                description: "Verification Script Deposit",
                scoutId: scout.id,
                status: 'APPROVED'
            },
            select: { id: true } // THE FIX
        })
        console.log(`Success! Created transaction with ID: ${result.id}`)

        // Verify it exists in DB
        const verification = await prisma.transaction.findUnique({
            where: { id: result.id },
            select: { id: true, amount: true, type: true } // Select safe columns
        })
        console.log('Verification fetch result:', verification)

    } catch (err) {
        console.error('Error during create:', err)
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
