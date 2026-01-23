import { PrismaClient, Role } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import dotenv from 'dotenv'

dotenv.config()

const connectionString = process.env.DATABASE_URL
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)

const prisma = new PrismaClient({ adapter })

async function main() {
    const email = 'admin@example.com'
    const password = 'TroopTreasury2026!' // Meets new password requirements
    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await prisma.user.upsert({
        where: { email },
        update: {
            isActive: true, // Ensure user is active
        },
        create: {
            email,
            name: 'Admin User',
            role: Role.ADMIN,
            passwordHash: hashedPassword,
            isActive: true, // Explicitly set to active
        },
    })

    console.log({ user })
    console.log('\n=== Admin User Created ===')
    console.log('Email:', email)
    console.log('Password:', password)
    console.log('========================\n')
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
