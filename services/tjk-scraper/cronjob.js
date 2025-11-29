/**
 * Nightly Cronjob for TJK Data Updates
 * Runs at 2 AM daily
 * Updates races, gallops, declarations, registrations for all horses
 * Delta updates only (writes only new data)
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Import Playwright functions (to be implemented)
// const { fetchTJKHorseDetail } = require('./lib/tjk-horse-detail-scraper');
// const { fetchTJKHorseGallops } = require('./lib/tjk-gallops-scraper');

/**
 * Main cronjob function
 */
async function runNightlyUpdate() {
  console.log('[Cronjob] Starting nightly update...');
  const startTime = Date.now();

  try {
    // Get all stablemates
    const stablemates = await prisma.stablemate.findMany({
      include: {
        horses: {
          where: {
            externalRef: { not: null }, // Only horses with TJK ID
          },
        },
      },
    });

    console.log(`[Cronjob] Found ${stablemates.length} stablemates to update`);

    let totalUpdated = 0;
    let totalNewRaces = 0;
    let totalNewGallops = 0;
    let totalNewDeclarations = 0;
    let totalNewRegistrations = 0;
    const errors = [];

    // Process each stablemate
    for (const stablemate of stablemates) {
      console.log(`[Cronjob] Processing stablemate: ${stablemate.name} (${stablemate.horses.length} horses)`);

      // Process each horse
      for (const horse of stablemate.horses) {
        try {
          console.log(`[Cronjob] Updating horse: ${horse.name} (ID: ${horse.externalRef})`);

          // Update races, gallops, declarations, registrations
          const result = await updateHorseData(horse);
          
          totalUpdated++;
          totalNewRaces += result.newRaces || 0;
          totalNewGallops += result.newGallops || 0;
          totalNewDeclarations += result.newDeclarations || 0;
          totalNewRegistrations += result.newRegistrations || 0;

        } catch (error) {
          console.error(`[Cronjob] Error updating horse ${horse.name}:`, error.message);
          errors.push({
            horseId: horse.id,
            horseName: horse.name,
            error: error.message,
          });
        }
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('[Cronjob] Nightly update completed!');
    console.log(`[Cronjob] Duration: ${duration}s`);
    console.log(`[Cronjob] Updated: ${totalUpdated} horses`);
    console.log(`[Cronjob] New races: ${totalNewRaces}`);
    console.log(`[Cronjob] New gallops: ${totalNewGallops}`);
    console.log(`[Cronjob] New declarations: ${totalNewDeclarations}`);
    console.log(`[Cronjob] New registrations: ${totalNewRegistrations}`);
    console.log(`[Cronjob] Errors: ${errors.length}`);

    return {
      success: true,
      duration,
      updated: totalUpdated,
      newRaces: totalNewRaces,
      newGallops: totalNewGallops,
      newDeclarations: totalNewDeclarations,
      newRegistrations: totalNewRegistrations,
      errors,
    };

  } catch (error) {
    console.error('[Cronjob] Fatal error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Update data for a single horse (delta updates)
 */
async function updateHorseData(horse) {
  const result = {
    newRaces: 0,
    newGallops: 0,
    newDeclarations: 0,
    newRegistrations: 0,
  };

  if (!horse.externalRef) {
    console.log(`[Cronjob] Horse ${horse.name} has no externalRef, skipping`);
    return result;
  }

  // 1. Update race history (delta)
  const newRaces = await updateRaceHistory(horse);
  result.newRaces = newRaces;

  // 2. Update gallops (delta)
  const newGallops = await updateGallops(horse);
  result.newGallops = newGallops;

  // 3. Update declarations/registrations (delta)
  const { declarations, registrations } = await updateDeclarationsRegistrations(horse);
  result.newDeclarations = declarations;
  result.newRegistrations = registrations;

  // 4. Update horse summary data (handicap points, earnings, etc.)
  await updateHorseSummary(horse);

  return result;
}

/**
 * Update race history (delta - only new races)
 */
async function updateRaceHistory(horse) {
  // TODO: Implement
  // 1. Fetch latest race history from TJK
  // 2. Get existing races from database
  // 3. Compare dates - find new races
  // 4. Insert only new races
  // 5. Return count of new races

  console.log(`[Cronjob] Updating race history for ${horse.name}`);
  // const detailData = await fetchTJKHorseDetail(horse.externalRef);
  // ... compare and insert new races
  return 0;
}

/**
 * Update gallops (delta - only new gallops)
 */
async function updateGallops(horse) {
  // TODO: Implement
  // 1. Fetch latest gallops from TJK
  // 2. Get existing gallops from database
  // 3. Compare dates - find new gallops
  // 4. Insert only new gallops
  // 5. Return count of new gallops

  console.log(`[Cronjob] Updating gallops for ${horse.name}`);
  // const gallopsData = await fetchTJKHorseGallops(horse.externalRef, horse.name);
  // ... compare and insert new gallops
  return 0;
}

/**
 * Update declarations and registrations (delta)
 */
async function updateDeclarationsRegistrations(horse) {
  // TODO: Implement
  // 1. Fetch latest declarations/registrations from TJK
  // 2. Get existing from database
  // 3. Compare - find new ones
  // 4. Insert only new records
  // 5. Return counts

  console.log(`[Cronjob] Updating declarations/registrations for ${horse.name}`);
  return { declarations: 0, registrations: 0 };
}

/**
 * Update horse summary data (handicap points, earnings, etc.)
 */
async function updateHorseSummary(horse) {
  // TODO: Implement
  // 1. Fetch latest horse detail from TJK
  // 2. Update horse record with new summary data
  // (handicap points, total earnings, race counts, etc.)

  console.log(`[Cronjob] Updating summary for ${horse.name}`);
}

// Run if called directly
if (require.main === module) {
  runNightlyUpdate()
    .then((result) => {
      console.log('[Cronjob] Success:', result);
      process.exit(0);
    })
    .catch((error) => {
      console.error('[Cronjob] Failed:', error);
      process.exit(1);
    });
}

module.exports = { runNightlyUpdate };

