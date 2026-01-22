'use server'

import { prisma } from "@/lib/prisma"
import { Role, Prisma, ScoutStatus, CampoutStatus, TransactionType, TransactionStatus, CampoutAdultRole } from "@prisma/client"
import bcrypt from "bcryptjs"
import { Decimal } from "decimal.js"
import { revalidatePath } from "next/cache"

export async function generateReplayJson() {
  const defaultPassword = "123456"
  const hashedPassword = await bcrypt.hash(defaultPassword, 10)

  // Fetch all data
  const allUsers = await prisma.user.findMany()
  const allScouts = await prisma.scout.findMany()
  const allCampouts = await prisma.campout.findMany()
  const allCampoutScouts = await prisma.campoutScout.findMany()
  const allCampoutAdults = await prisma.campoutAdult.findMany()
  const allTransactions = await prisma.transaction.findMany()
  const allAdultExpenses = await prisma.adultExpense.findMany()
  const allParentScouts = await prisma.parentScout.findMany()
  const allBudgets = await prisma.budget.findMany()
  const allBudgetCategories = await prisma.budgetCategory.findMany()
  const allFundraisingCampaigns = await prisma.fundraisingCampaign.findMany()
  const troopSettings = await prisma.troopSettings.findFirst()

  // Filter out Admins
  const adminIds = new Set(allUsers.filter(u => u.role === Role.ADMIN).map(u => u.id))

  const usersToExport = allUsers.filter(u => !adminIds.has(u.id)).map(u => ({
    ...u,
    passwordHash: hashedPassword,
    invitationToken: null,
    invitationExpires: null
  }))

  const scoutsToExport = allScouts.map(s => ({
    ...s,
    userId: s.userId && adminIds.has(s.userId) ? null : s.userId
  }))

  const parentScoutsToExport = allParentScouts.filter(ps => !adminIds.has(ps.parentId))
  const campoutAdultsToExport = allCampoutAdults.filter(ca => !adminIds.has(ca.adultId))
  const adultExpensesToExport = allAdultExpenses.filter(ae => !adminIds.has(ae.adultId))
  const transactionsToExport = allTransactions
    .map(t => ({
      ...t,
      userId: t.userId && adminIds.has(t.userId) ? null : t.userId,
      approvedBy: t.approvedBy && adminIds.has(t.approvedBy) ? null : t.approvedBy
    }))

  return JSON.stringify({
    troopSettings: troopSettings ? {
      ...troopSettings,
      rolePermissions: troopSettings.rolePermissions // Ensure JSON compatibility
    } : null,
    users: usersToExport,
    scouts: scoutsToExport,
    parentScouts: parentScoutsToExport,
    campouts: allCampouts,
    campoutScouts: allCampoutScouts,
    campoutAdults: campoutAdultsToExport,
    adultExpenses: adultExpensesToExport,
    transactions: transactionsToExport,
    budgets: allBudgets,
    budgetCategories: allBudgetCategories,
    fundraisingCampaigns: allFundraisingCampaigns
  }, null, 2)
}

export async function restoreFromReplayJson(jsonString: string) {
  try {
    const data = JSON.parse(jsonString)

    // 1. Troop Settings
    if (data.troopSettings) {
      await prisma.troopSettings.upsert({
        where: { id: data.troopSettings.id },
        update: {
          ...data.troopSettings,
          updatedAt: new Date(data.troopSettings.updatedAt)
        },
        create: {
          ...data.troopSettings,
          updatedAt: new Date(data.troopSettings.updatedAt)
        }
      })
    }

    // 2. Users
    for (const user of data.users) {
      await prisma.user.upsert({
        where: { id: user.id },
        update: {
          ...user,
          createdAt: new Date(user.createdAt),
          updatedAt: new Date(user.updatedAt),
          deactivatedAt: user.deactivatedAt ? new Date(user.deactivatedAt) : null,
          invitationExpires: user.invitationExpires ? new Date(user.invitationExpires) : null
        },
        create: {
          ...user,
          createdAt: new Date(user.createdAt),
          updatedAt: new Date(user.updatedAt),
          deactivatedAt: user.deactivatedAt ? new Date(user.deactivatedAt) : null,
          invitationExpires: user.invitationExpires ? new Date(user.invitationExpires) : null
        }
      })
    }

    // 3. Scouts
    for (const scout of data.scouts) {
      await prisma.scout.upsert({
        where: { id: scout.id },
        update: {
          ...scout,
          ibaBalance: new Decimal(scout.ibaBalance),
          createdAt: new Date(scout.createdAt),
          updatedAt: new Date(scout.updatedAt),
        },
        create: {
          ...scout,
          ibaBalance: new Decimal(scout.ibaBalance),
          createdAt: new Date(scout.createdAt),
          updatedAt: new Date(scout.updatedAt),
        }
      })
    }

    // 4. ParentScout
    for (const ps of data.parentScouts) {
      const parentExists = await prisma.user.findUnique({ where: { id: ps.parentId } })
      const scoutExists = await prisma.scout.findUnique({ where: { id: ps.scoutId } })

      if (parentExists && scoutExists) {
        await prisma.parentScout.upsert({
          where: { parentId_scoutId: { parentId: ps.parentId, scoutId: ps.scoutId } },
          update: ps,
          create: ps
        })
      }
    }

    // 5. Campouts
    for (const campout of data.campouts) {
      await prisma.campout.upsert({
        where: { id: campout.id },
        update: {
          ...campout,
          startDate: new Date(campout.startDate),
          endDate: campout.endDate ? new Date(campout.endDate) : null,
          estimatedCost: campout.estimatedCost ? new Decimal(campout.estimatedCost) : null,
          createdAt: new Date(campout.createdAt),
          updatedAt: new Date(campout.updatedAt),
        },
        create: {
          ...campout,
          startDate: new Date(campout.startDate),
          endDate: campout.endDate ? new Date(campout.endDate) : null,
          estimatedCost: campout.estimatedCost ? new Decimal(campout.estimatedCost) : null,
          createdAt: new Date(campout.createdAt),
          updatedAt: new Date(campout.updatedAt),
        }
      })
    }

    // 5b. Budgets
    if (data.budgets) {
      for (const budget of data.budgets) {
        await prisma.budget.upsert({
          where: { id: budget.id },
          update: {
            ...budget,
            annualDuesAmount: new Decimal(budget.annualDuesAmount),
            createdAt: new Date(budget.createdAt),
            updatedAt: new Date(budget.updatedAt),
          },
          create: {
            ...budget,
            annualDuesAmount: new Decimal(budget.annualDuesAmount),
            createdAt: new Date(budget.createdAt),
            updatedAt: new Date(budget.updatedAt),
          }
        })
      }
    }

    // 5c. BudgetCategories
    if (data.budgetCategories) {
      for (const bc of data.budgetCategories) {
        await prisma.budgetCategory.upsert({
          where: { id: bc.id },
          update: {
            ...bc,
            plannedIncome: new Decimal(bc.plannedIncome),
            plannedExpense: new Decimal(bc.plannedExpense),
          },
          create: {
            ...bc,
            plannedIncome: new Decimal(bc.plannedIncome),
            plannedExpense: new Decimal(bc.plannedExpense),
          }
        })
      }
    }

    // 5d. FundraisingCampaigns
    if (data.fundraisingCampaigns) {
      for (const fc of data.fundraisingCampaigns) {
        await prisma.fundraisingCampaign.upsert({
          where: { id: fc.id },
          update: {
            ...fc,
            startDate: new Date(fc.startDate),
            endDate: fc.endDate ? new Date(fc.endDate) : null,
            goal: new Decimal(fc.goal),
          },
          create: {
            ...fc,
            startDate: new Date(fc.startDate),
            endDate: fc.endDate ? new Date(fc.endDate) : null,
            goal: new Decimal(fc.goal),
          }
        })
      }
    }

    // 6. CampoutScout
    for (const cs of data.campoutScouts) {
      await prisma.campoutScout.upsert({
        where: { campoutId_scoutId: { campoutId: cs.campoutId, scoutId: cs.scoutId } },
        update: {
          ...cs,
          registeredAt: new Date(cs.registeredAt)
        },
        create: {
          ...cs,
          registeredAt: new Date(cs.registeredAt)
        }
      })
    }

    // 7. CampoutAdult
    for (const ca of data.campoutAdults) {
      // Need to ensure adult exists, though we should have imported them. 
      // If the adult was an admin (filtered out), this entry wouldn't be in the JSON anyway.
      const adultExists = await prisma.user.findUnique({ where: { id: ca.adultId } })
      if (adultExists) {
        await prisma.campoutAdult.upsert({
          where: {
            campoutId_adultId_role: {
              campoutId: ca.campoutId,
              adultId: ca.adultId,
              role: ca.role
            }
          },
          update: ca,
          create: ca
        })
      }
    }

    // 8. AdultExpenses
    for (const ae of data.adultExpenses) {
      const adultExists = await prisma.user.findUnique({ where: { id: ae.adultId } })
      if (adultExists) {
        await prisma.adultExpense.upsert({
          where: { id: ae.id },
          update: {
            ...ae,
            amount: new Decimal(ae.amount),
            createdAt: new Date(ae.createdAt)
          },
          create: {
            ...ae,
            amount: new Decimal(ae.amount),
            createdAt: new Date(ae.createdAt)
          }
        })
      }
    }

    // 9. Transactions
    for (const t of data.transactions) {
      // Ensure relations if they exist
      // userId, scoutId, campoutId, approvedBy
      // If userId refers to a missing user (e.g. filtered admin), we shouldn't insert?
      // But we filtered transactions already.

      await prisma.transaction.upsert({
        where: { id: t.id },
        update: {
          ...t,
          amount: new Decimal(t.amount),
          createdAt: new Date(t.createdAt),
          updatedAt: new Date(t.updatedAt),
        },
        create: {
          ...t,
          amount: new Decimal(t.amount),
          createdAt: new Date(t.createdAt),
          updatedAt: new Date(t.updatedAt),
        }
      })
    }

    revalidatePath('/', 'layout')
    return { success: true }

  } catch (e) {
    console.error("Restore failed:", e)
    return { success: false, error: String(e) }
  }
}
