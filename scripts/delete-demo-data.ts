import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// User email to delete demo data for
const USER_EMAIL = 'omerfaruk.aktulum@gmail.com'

/**
 * Get user and their horses
 */
async function getUserAndHorses() {
  console.log(`\n🔍 Finding user: ${USER_EMAIL}`)
  
  const user = await prisma.user.findUnique({
    where: { email: USER_EMAIL },
    include: {
      ownerProfile: {
        include: {
          stablemate: {
            include: {
              horses: true,
            },
          },
        },
      },
    },
  })

  if (!user) {
    throw new Error(`User not found: ${USER_EMAIL}`)
  }

  if (!user.ownerProfile) {
    throw new Error(`User does not have an owner profile: ${USER_EMAIL}`)
  }

  if (!user.ownerProfile.stablemate) {
    throw new Error(`User does not have a stablemate: ${USER_EMAIL}`)
  }

  const horses = user.ownerProfile.stablemate.horses

  console.log(`  ✅ Found user: ${user.email}`)
  console.log(`  ✅ Found stablemate: ${user.ownerProfile.stablemate.name}`)
  console.log(`  ✅ Found ${horses.length} horses`)

  return { user, horses }
}

async function main() {
  console.log('🗑️  Starting demo data deletion...\n')

  try {
    // Get user and their horses
    const { user, horses } = await getUserAndHorses()

    if (horses.length === 0) {
      console.log('  ⚠ No horses found for user. Exiting.')
      return
    }

    const horseIds = horses.map(h => h.id)

    console.log(`\n📊 Deleting demo data for ${horses.length} horses...`)

    // Delete expenses
    const deletedExpenses = await prisma.expense.deleteMany({
      where: {
        horseId: { in: horseIds },
      },
    })
    console.log(`  ✅ Deleted ${deletedExpenses.count} expenses`)

    // Delete notes
    const deletedNotes = await prisma.horseNote.deleteMany({
      where: {
        horseId: { in: horseIds },
      },
    })
    console.log(`  ✅ Deleted ${deletedNotes.count} notes`)

    // Delete illness operations first (due to foreign key)
    const illnesses = await prisma.horseIllness.findMany({
      where: {
        horseId: { in: horseIds },
      },
      select: { id: true },
    })
    
    const illnessIds = illnesses.map(i => i.id)
    if (illnessIds.length > 0) {
      const deletedOperations = await prisma.horseIllnessOperation.deleteMany({
        where: {
          illnessId: { in: illnessIds },
        },
      })
      console.log(`  ✅ Deleted ${deletedOperations.count} illness operations`)
    }

    // Delete illnesses
    const deletedIllnesses = await prisma.horseIllness.deleteMany({
      where: {
        horseId: { in: horseIds },
      },
    })
    console.log(`  ✅ Deleted ${deletedIllnesses.count} illnesses`)

    // Delete banned medicines
    const deletedMedicines = await prisma.horseBannedMedicine.deleteMany({
      where: {
        horseId: { in: horseIds },
      },
    })
    console.log(`  ✅ Deleted ${deletedMedicines.count} banned medicines`)

    // Delete training plans
    const deletedPlans = await prisma.horseTrainingPlan.deleteMany({
      where: {
        horseId: { in: horseIds },
      },
    })
    console.log(`  ✅ Deleted ${deletedPlans.count} training plans`)

    // Print summary
    console.log('\n' + '='.repeat(60))
    console.log('✅ Demo data deletion completed!')
    console.log('='.repeat(60))
    console.log(`\n📋 Summary for ${USER_EMAIL}:`)
    console.log(`  Horses: ${horses.length}`)
    console.log(`  Expenses deleted: ${deletedExpenses.count}`)
    console.log(`  Notes deleted: ${deletedNotes.count}`)
    console.log(`  Illnesses deleted: ${deletedIllnesses.count}`)
    console.log(`  Banned medicines deleted: ${deletedMedicines.count}`)
    console.log(`  Training plans deleted: ${deletedPlans.count}`)
    console.log('\n' + '='.repeat(60))
  } catch (error) {
    console.error('\n❌ Error deleting demo data:', error)
    throw error
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

