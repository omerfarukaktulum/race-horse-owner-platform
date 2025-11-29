/**
 * Nightly Cronjob for TJK Data Updates
 * Runs via GitHub Actions at 2 AM UTC daily
 * Updates races, gallops, declarations, registrations for all horses
 * Delta updates only (writes only new data)
 */

import { PrismaClient } from '@prisma/client'
import { fetchTJKHorseDetail } from '@/lib/tjk-horse-detail-scraper'
import { fetchTJKHorseGallops } from '@/lib/tjk-gallops-scraper'

// Use PROD_DATABASE_URL if provided, otherwise fall back to DATABASE_URL
let databaseUrl = process.env.PROD_DATABASE_URL || process.env.DATABASE_URL

if (!databaseUrl) {
  console.error('[Cronjob] Error: DATABASE_URL or PROD_DATABASE_URL must be set')
  console.error('[Cronjob] PROD_DATABASE_URL:', process.env.PROD_DATABASE_URL ? 'SET (hidden)' : 'NOT SET')
  console.error('[Cronjob] DATABASE_URL:', process.env.DATABASE_URL ? 'SET (hidden)' : 'NOT SET')
  console.error('[Cronjob] Please ensure PROD_DATABASE_URL secret is configured in GitHub Actions')
  process.exit(1)
}

// For Supabase, prefer connection pooler (port 6543) over direct connection (port 5432)
// The pooler is more reliable for external connections like GitHub Actions
if (databaseUrl.includes('supabase.co:5432') && !databaseUrl.includes('pooler')) {
  console.log('[Cronjob] Converting Supabase direct connection to pooler connection...')
  // Convert direct connection to pooler
  // From: postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres
  // To: postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true
  // Note: This is a simplified conversion - user should use pooler URL directly
  console.warn('[Cronjob] WARNING: Using direct connection. For better reliability, use Supabase connection pooler URL (port 6543)')
}

console.log(`[Cronjob] Using database: ${databaseUrl.includes('supabase') || databaseUrl.includes('neon') ? 'PRODUCTION' : 'LOCAL'}`)
console.log(`[Cronjob] Connection type: ${databaseUrl.includes('pooler') ? 'Pooler' : databaseUrl.includes('supabase') ? 'Direct (Supabase)' : 'Standard'}`)

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: databaseUrl,
    },
  },
  log: ['error', 'warn'],
})

interface UpdateResult {
  newRaces: number
  newGallops: number
  newDeclarations: number
  newRegistrations: number
}

/**
 * Main cronjob function
 */
async function runNightlyUpdate() {
  console.log('[Cronjob] Starting nightly update...')
  const startTime = Date.now()

  try {
    // Get all stablemates with horses that have externalRef
    const stablemates = await prisma.stablemate.findMany({
      include: {
        horses: {
          where: {
            externalRef: { not: null },
            status: { not: 'DEAD' }, // Skip dead horses
          },
        },
      },
    })

    console.log(`[Cronjob] Found ${stablemates.length} stablemates to update`)

    let totalUpdated = 0
    let totalNewRaces = 0
    let totalNewGallops = 0
    let totalNewDeclarations = 0
    let totalNewRegistrations = 0
    const errors: Array<{ horseId: string; horseName: string; error: string }> = []

    // Process each stablemate
    for (const stablemate of stablemates) {
      console.log(`[Cronjob] Processing stablemate: ${stablemate.name} (${stablemate.horses.length} horses)`)

      // Update stablemate status to IN_PROGRESS
      try {
        await prisma.stablemate.update({
          where: { id: stablemate.id },
          data: {
            dataFetchStatus: 'IN_PROGRESS' as any,
            dataFetchStartedAt: new Date() as any,
          } as any,
        })
      } catch (e) {
        // Ignore if migration not run
        console.log('[Cronjob] Could not update stablemate status (migration may not be run)')
      }

      // Process each horse
      for (const horse of stablemate.horses) {
        try {
          console.log(`[Cronjob] Updating horse: ${horse.name} (ID: ${horse.externalRef})`)

          // Update races, gallops, declarations, registrations
          const result = await updateHorseData(horse)

          totalUpdated++
          totalNewRaces += result.newRaces
          totalNewGallops += result.newGallops
          totalNewDeclarations += result.newDeclarations
          totalNewRegistrations += result.newRegistrations

          // Small delay between horses to avoid rate limiting
          await new Promise((resolve) => setTimeout(resolve, 2000))

        } catch (error: any) {
          console.error(`[Cronjob] Error updating horse ${horse.name}:`, error.message)
          errors.push({
            horseId: horse.id,
            horseName: horse.name,
            error: error.message,
          })
        }
      }

      // Update stablemate status to COMPLETED
      try {
        await prisma.stablemate.update({
          where: { id: stablemate.id },
          data: {
            dataFetchStatus: 'COMPLETED' as any,
            dataFetchCompletedAt: new Date() as any,
          } as any,
        })
      } catch (e) {
        // Ignore if migration not run
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2)

    console.log('[Cronjob] Nightly update completed!')
    console.log(`[Cronjob] Duration: ${duration}s`)
    console.log(`[Cronjob] Updated: ${totalUpdated} horses`)
    console.log(`[Cronjob] New races: ${totalNewRaces}`)
    console.log(`[Cronjob] New gallops: ${totalNewGallops}`)
    console.log(`[Cronjob] New declarations: ${totalNewDeclarations}`)
    console.log(`[Cronjob] New registrations: ${totalNewRegistrations}`)
    console.log(`[Cronjob] Errors: ${errors.length}`)

    if (errors.length > 0) {
      console.error('[Cronjob] Errors:', errors)
    }

    return {
      success: true,
      duration: parseFloat(duration),
      updated: totalUpdated,
      newRaces: totalNewRaces,
      newGallops: totalNewGallops,
      newDeclarations: totalNewDeclarations,
      newRegistrations: totalNewRegistrations,
      errors,
    }
  } catch (error: any) {
    console.error('[Cronjob] Fatal error:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

/**
 * Update data for a single horse (delta updates)
 */
async function updateHorseData(horse: { id: string; name: string; externalRef: string | null }): Promise<UpdateResult> {
  const result: UpdateResult = {
    newRaces: 0,
    newGallops: 0,
    newDeclarations: 0,
    newRegistrations: 0,
  }

  if (!horse.externalRef) {
    console.log(`[Cronjob] Horse ${horse.name} has no externalRef, skipping`)
    return result
  }

  try {
    // 1. Fetch latest horse detail (includes races and registrations/declarations)
    console.log(`[Cronjob] Fetching horse detail for ${horse.name}...`)
    const detailData = await fetchTJKHorseDetail(horse.externalRef)

    if (!detailData) {
      console.log(`[Cronjob] No detail data returned for ${horse.name}`)
      return result
    }

    // 2. Update race history (delta - only new races)
    result.newRaces = await updateRaceHistory(horse.id, detailData.races)

    // 3. Update registrations/declarations (delta)
    const regResult = await updateRegistrations(horse.id, detailData.registrations)
    result.newRegistrations = regResult.registrations
    result.newDeclarations = regResult.declarations

    // 4. Update horse summary data (handicap points, earnings, etc.)
    await updateHorseSummary(horse.id, detailData)

    // 5. Fetch and update gallops (delta)
    console.log(`[Cronjob] Fetching gallops for ${horse.name}...`)
    const gallopsData = await fetchTJKHorseGallops(horse.externalRef, horse.name)
    if (gallopsData && gallopsData.length > 0) {
      result.newGallops = await updateGallops(horse.id, gallopsData)
    }

  } catch (error: any) {
    console.error(`[Cronjob] Error updating horse ${horse.name}:`, error.message)
    throw error
  }

  return result
}

/**
 * Update race history (delta - only new races)
 */
async function updateRaceHistory(horseId: string, newRaces: any[]): Promise<number> {
  if (!newRaces || newRaces.length === 0) {
    console.log(`[Cronjob] No races found from TJK, skipping race history update`)
    return 0
  }

  console.log(`[Cronjob] Found ${newRaces.length} races from TJK, checking against database...`)

  // Get existing races from database
  const existingRaces = await prisma.horseRaceHistory.findMany({
    where: { horseId },
    select: {
      raceDate: true,
      raceName: true,
      city: true,
    },
  })

  console.log(`[Cronjob] Found ${existingRaces.length} existing races in database`)

  // Create a set of existing race keys (date + name + city for uniqueness)
  const existingKeys = new Set(
    existingRaces.map((r) => {
      const date = r.raceDate.toISOString().split('T')[0]
      return `${date}-${r.raceName || ''}-${r.city || ''}`
    })
  )

  // Filter new races (not in database)
  const racesToInsert = newRaces
    .filter((race) => {
      // Parse date from DD.MM.YYYY format
      const dateParts = race.raceDate.split('.')
      if (dateParts.length !== 3) return false

      const date = new Date(`${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`)
      if (isNaN(date.getTime())) return false

      const dateKey = date.toISOString().split('T')[0]
      const key = `${dateKey}-${race.raceName || ''}-${race.city || ''}`
      return !existingKeys.has(key)
    })
    .map((race) => {
      // Parse date
      const dateParts = race.raceDate.split('.')
      const raceDate = new Date(`${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`)

      return {
        horseId,
        raceDate,
        city: race.city || null,
        distance: race.distance || null,
        surface: race.surface || null,
        surfaceType: race.surfaceType || null,
        position: race.position || null,
        derece: race.derece || null,
        weight: race.weight ? race.weight.toString() : null,
        jockeyName: race.jockeyName || null,
        jockeyId: race.jockeyId || null,
        raceNumber: race.raceNumber || null,
        raceName: race.raceName || null,
        raceType: race.raceType || null,
        trainerName: race.trainerName || null,
        trainerId: race.trainerId || null,
        handicapPoints: race.handicapPoints || null,
        prizeMoney: race.prizeMoney ? race.prizeMoney.toString() : null,
        videoUrl: race.videoUrl || null,
        photoUrl: race.photoUrl || null,
      }
    })

  if (racesToInsert.length > 0) {
    await prisma.horseRaceHistory.createMany({
      data: racesToInsert,
      skipDuplicates: true,
    })
    console.log(`[Cronjob] ✓ Inserted ${racesToInsert.length} new races (${newRaces.length - racesToInsert.length} already existed)`)
  } else {
    console.log(`[Cronjob] ✓ No new races to insert (all ${newRaces.length} races already exist in database)`)
  }

  return racesToInsert.length
}

/**
 * Update registrations and declarations (sync with TJK)
 * - Deletes registrations/declarations that no longer exist in TJK (became races or cancelled)
 * - Updates KAYIT → DEKLARE when jockey is declared
 * - Inserts new registrations/declarations
 */
async function updateRegistrations(
  horseId: string,
  newRegistrations: any[]
): Promise<{ registrations: number; declarations: number }> {
  console.log(`[Cronjob] Syncing registrations/declarations for horse ${horseId}...`)

  // Get existing registrations from database (full records for updates/deletes)
  const existingRegs = await prisma.horseRegistration.findMany({
    where: { horseId },
  })

  console.log(`[Cronjob] Found ${existingRegs.length} existing registrations/declarations in database`)
  console.log(`[Cronjob] Found ${newRegistrations?.length || 0} registrations/declarations from TJK`)

  // Create a map of TJK registrations by key (date + city + distance)
  const tjkRegsMap = new Map<string, any>()
  if (newRegistrations && newRegistrations.length > 0) {
    for (const reg of newRegistrations) {
      const dateParts = reg.raceDate.split('.')
      if (dateParts.length !== 3) continue

      const raceDate = new Date(`${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`)
      if (isNaN(raceDate.getTime())) continue

      const dateKey = raceDate.toISOString().split('T')[0]
      const key = `${dateKey}-${reg.city || ''}-${reg.distance || ''}`
      tjkRegsMap.set(key, {
        ...reg,
        raceDate,
        dateKey,
        type: reg.type === 'Deklare' ? 'DEKLARE' : 'KAYIT',
      })
    }
  }

  // Create a map of existing registrations by key
  const existingRegsMap = new Map<string, typeof existingRegs[0]>()
  existingRegs.forEach((reg) => {
    const date = reg.raceDate.toISOString().split('T')[0]
    const key = `${date}-${reg.city || ''}-${reg.distance || ''}`
    existingRegsMap.set(key, reg)
  })

  const regsToInsert: any[] = []
  const regsToUpdate: Array<{ id: string; data: any }> = []
  const regsToDelete: string[] = []

  // Step 1: Find registrations to delete (exist in DB but not in TJK - became races or cancelled)
  for (const existingReg of existingRegs) {
    const date = existingReg.raceDate.toISOString().split('T')[0]
    const key = `${date}-${existingReg.city || ''}-${existingReg.distance || ''}`
    
    if (!tjkRegsMap.has(key)) {
      // This registration/declaration no longer exists in TJK - delete it
      console.log(`[Cronjob] Registration/declaration no longer in TJK, will delete: ${date} ${existingReg.city} (${existingReg.type})`)
      regsToDelete.push(existingReg.id)
    }
  }

  // Step 2: Process TJK registrations - insert new or update existing
  for (const [key, tjkReg] of tjkRegsMap.entries()) {
    const existingReg = existingRegsMap.get(key)

    if (!existingReg) {
      // New registration - insert
      regsToInsert.push({
        horseId,
        raceDate: tjkReg.raceDate,
        city: tjkReg.city || null,
        distance: tjkReg.distance || null,
        surface: tjkReg.surface || null,
        surfaceType: tjkReg.surfaceType || null,
        raceType: tjkReg.raceType || null,
        type: tjkReg.type,
        jockeyName: tjkReg.jockeyName || null,
        jockeyId: tjkReg.jockeyId || null,
      })
    } else if (existingReg.type === 'KAYIT' && tjkReg.type === 'DEKLARE') {
      // KAYIT became DEKLARE - update
      console.log(`[Cronjob] Updating KAYIT to DEKLARE: ${tjkReg.dateKey} ${tjkReg.city}`)
      regsToUpdate.push({
        id: existingReg.id,
        data: {
          type: 'DEKLARE',
          jockeyName: tjkReg.jockeyName || null,
          jockeyId: tjkReg.jockeyId || null,
        },
      })
    }
    // If it's already DEKLARE and still DEKLARE, or already KAYIT and still KAYIT, no change needed
  }

  // Step 3: Delete registrations that no longer exist in TJK
  if (regsToDelete.length > 0) {
    await prisma.horseRegistration.deleteMany({
      where: { id: { in: regsToDelete } },
    })
    console.log(`[Cronjob] ✓ Deleted ${regsToDelete.length} registrations/declarations that no longer exist in TJK`)
  }

  // Step 4: Update KAYIT → DEKLARE
  for (const update of regsToUpdate) {
    await prisma.horseRegistration.update({
      where: { id: update.id },
      data: update.data,
    })
  }
  if (regsToUpdate.length > 0) {
    console.log(`[Cronjob] ✓ Updated ${regsToUpdate.length} registrations from KAYIT to DEKLARE`)
  }

  // Step 5: Insert new registrations
  if (regsToInsert.length > 0) {
    await prisma.horseRegistration.createMany({
      data: regsToInsert,
      skipDuplicates: true,
    })
    const declarations = regsToInsert.filter((r) => r.type === 'DEKLARE').length
    const registrations = regsToInsert.filter((r) => r.type === 'KAYIT').length
    console.log(`[Cronjob] ✓ Inserted ${regsToInsert.length} new registrations/declarations (${declarations} declarations, ${registrations} registrations)`)
    return { declarations, registrations }
  } else {
    console.log(`[Cronjob] ✓ No new registrations/declarations to insert`)
    return { declarations: 0, registrations: 0 }
  }
}

/**
 * Update gallops (delta - only new gallops)
 */
async function updateGallops(horseId: string, newGallops: any[]): Promise<number> {
  if (!newGallops || newGallops.length === 0) {
    console.log(`[Cronjob] No gallops found from TJK, skipping gallop update`)
    return 0
  }

  console.log(`[Cronjob] Found ${newGallops.length} gallops from TJK, checking against database...`)

  // Get existing gallops from database
  const existingGallops = await prisma.horseGallop.findMany({
    where: { horseId },
    select: {
      gallopDate: true,
      racecourse: true,
    },
  })

  console.log(`[Cronjob] Found ${existingGallops.length} existing gallops in database`)

  // Create a set of existing gallop keys (date + racecourse)
  const existingKeys = new Set(
    existingGallops.map((g) => {
      const date = g.gallopDate.toISOString().split('T')[0]
      return `${date}-${g.racecourse || ''}`
    })
  )

  // Filter new gallops
  const gallopsToInsert = newGallops
    .filter((gallop) => {
      const dateParts = gallop.date.split('.')
      if (dateParts.length !== 3) return false

      const date = new Date(`${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`)
      if (isNaN(date.getTime())) return false

      const dateKey = date.toISOString().split('T')[0]
      const key = `${dateKey}-${gallop.racecourse || ''}`
      return !existingKeys.has(key)
    })
    .map((gallop) => {
      const dateParts = gallop.date.split('.')
      const gallopDate = new Date(`${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`)

      return {
        horseId,
        gallopDate,
        status: gallop.status || null,
        racecourse: gallop.racecourse || null,
        surface: gallop.surface || null,
        jockeyName: gallop.jockeyName || null,
        distances: gallop.distances || {},
      }
    })

  if (gallopsToInsert.length > 0) {
    await prisma.horseGallop.createMany({
      data: gallopsToInsert,
      skipDuplicates: true,
    })
    console.log(`[Cronjob] ✓ Inserted ${gallopsToInsert.length} new gallops (${newGallops.length - gallopsToInsert.length} already existed)`)
  } else {
    console.log(`[Cronjob] ✓ No new gallops to insert (all ${newGallops.length} gallops already exist in database)`)
  }

  return gallopsToInsert.length
}

/**
 * Update horse summary data (handicap points, earnings, etc.)
 */
async function updateHorseSummary(horseId: string, detailData: any) {
  const updateData: any = {}

  if (detailData.handicapPoints !== undefined) {
    updateData.handicapPoints = detailData.handicapPoints
  }
  if (detailData.totalEarnings !== undefined) {
    updateData.totalEarnings = detailData.totalEarnings.toString()
  }
  if (detailData.prizeMoney !== undefined) {
    updateData.prizeMoney = detailData.prizeMoney.toString()
  }
  if (detailData.ownerPremium !== undefined) {
    updateData.ownerPremium = detailData.ownerPremium.toString()
  }
  if (detailData.breederPremium !== undefined) {
    updateData.breederPremium = detailData.breederPremium.toString()
  }
  if (detailData.totalRaces !== undefined) {
    updateData.totalRaces = detailData.totalRaces
  }
  if (detailData.firstPlaces !== undefined) {
    updateData.firstPlaces = detailData.firstPlaces
  }
  if (detailData.secondPlaces !== undefined) {
    updateData.secondPlaces = detailData.secondPlaces
  }
  if (detailData.thirdPlaces !== undefined) {
    updateData.thirdPlaces = detailData.thirdPlaces
  }
  if (detailData.fourthPlaces !== undefined) {
    updateData.fourthPlaces = detailData.fourthPlaces
  }
  if (detailData.fifthPlaces !== undefined) {
    updateData.fifthPlaces = detailData.fifthPlaces
  }
  if (detailData.turfRaces !== undefined) {
    updateData.turfRaces = detailData.turfRaces
  }
  if (detailData.turfFirsts !== undefined) {
    updateData.turfFirsts = detailData.turfFirsts
  }
  if (detailData.turfEarnings !== undefined) {
    updateData.turfEarnings = detailData.turfEarnings.toString()
  }
  if (detailData.dirtRaces !== undefined) {
    updateData.dirtRaces = detailData.dirtRaces
  }
  if (detailData.dirtFirsts !== undefined) {
    updateData.dirtFirsts = detailData.dirtFirsts
  }
  if (detailData.dirtEarnings !== undefined) {
    updateData.dirtEarnings = detailData.dirtEarnings.toString()
  }
  if (detailData.syntheticRaces !== undefined) {
    updateData.syntheticRaces = detailData.syntheticRaces
  }
  if (detailData.syntheticFirsts !== undefined) {
    updateData.syntheticFirsts = detailData.syntheticFirsts
  }
  if (detailData.syntheticEarnings !== undefined) {
    updateData.syntheticEarnings = detailData.syntheticEarnings.toString()
  }

  updateData.dataFetchedAt = new Date()

  if (Object.keys(updateData).length > 1) {
    // More than just dataFetchedAt
    await prisma.horse.update({
      where: { id: horseId },
      data: updateData,
    })
  }
}

// Run if called directly
runNightlyUpdate()
  .then((result) => {
    console.log('[Cronjob] Success:', JSON.stringify(result, null, 2))
    process.exit(0)
  })
  .catch((error) => {
    console.error('[Cronjob] Failed:', error)
    process.exit(1)
  })

export { runNightlyUpdate }

