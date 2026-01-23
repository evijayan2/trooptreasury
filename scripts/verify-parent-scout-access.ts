import { prisma } from "../lib/prisma"

async function main() {
    const email = 'admin@example.com' // Using the known admin email
    console.log(`Verifying access for user: ${email}`)

    const user = await prisma.user.findUnique({
        where: { email },
        include: {
            scout: true,
            parentLinks: {
                include: { scout: true }
            }
        }
    })

    if (!user) {
        console.error("User not found")
        return
    }

    console.log(`User ID: ${user.id}`)
    console.log(`Direct Scout Link: ${user.scout ? 'Yes' : 'No'}`)
    console.log(`Parent Links: ${user.parentLinks.length}`)

    let finalScout = user.scout

    if (!finalScout) {
        console.log("No direct scout link found. Checking parent links...")
        const parentLink = await prisma.parentScout.findFirst({
            where: { parentId: user.id },
            include: { scout: true }
        })

        if (parentLink) {
            console.log(`Found connected scout via parent link: ${parentLink.scout.name}`)
            finalScout = parentLink.scout
        } else {
            console.log("No connected scouts found via parent link.")
        }
    } else {
        console.log(`Using direct scout profile: ${finalScout.name}`)
    }

    if (finalScout) {
        console.log("SUCCESS: User would be granted access to the page.")
    } else {
        console.error("FAILURE: User would be denied access.")
    }
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
