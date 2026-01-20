import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
    const settings = await prisma.troopSettings.findFirst()
    console.log("SETTINGS:", settings)
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
