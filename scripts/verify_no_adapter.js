const { PrismaClient, TransactionType } = require('../lib/generated/client')
require('dotenv').config({ path: '.env.local' })

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: process.env.DATABASE_URL
        }
    }
})

async function main() {
    console.log('Fetching all transactions (Standard Engine)...')
    try {
        const transactions = await prisma.transaction.findMany({ take: 1 })
        console.log(`Success! Found ${transactions.length} transactions.`)
        console.log(transactions[0])

        // Now verify we can filter by IBA_DEPOSIT (just to be sure enum works)
        const iba = await prisma.transaction.findMany({
            where: { type: TransactionType.IBA_DEPOSIT }
        })
        console.log(`Found ${iba.length} IBA_DEPOSIT transactions.`)

    } catch (err) {
        console.error('Error with standard client:', err)
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
