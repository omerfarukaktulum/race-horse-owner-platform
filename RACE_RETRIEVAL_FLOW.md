# Race Retrieval System - Current Flow

## Overview
The race retrieval system has been simplified to use a **database-only approach**. All race history is stored permanently in the database and queried directly - no caching, no complex merging logic.

## Current Flow (Simple)

```
1. Get Owner Profile
   └─ Fetch stablemate with all horses

2. Query Database
   ├─ Get all race history for horses in stablemate
   ├─ Filter to past races only
   ├─ Sort by date (most recent first)
   └─ Return top N races

3. Return Recent Races
```

## How It Works

### Race History Storage
- **When horses are added**: During onboarding, race history is automatically fetched from TJK and stored in `HorseRaceHistory` table
- **Permanent storage**: All race data is stored in the database - no caching
- **Future updates**: A scheduler job will be added later to periodically fetch new races and add them to the database

### Recent Races API
- **Simple query**: Just queries `HorseRaceHistory` table for all horses in the stablemate
- **Filtering**: Only past races (raceDate < today)
- **Sorting**: By date descending (most recent first)
- **Limit**: Returns top N races (default 10)

### Position Parsing
- **Fixed**: The scraper now correctly identifies "S" column for position (not "Derece")
- **Derece field**: Time elapsed is stored separately in `derece` field for display on horse detail page
- **Validation**: Added checks to prevent parsing time data as position

## Database Schema

### HorseRaceHistory
- Stores all race data permanently
- Includes: date, city, distance, surface, position (S), derece (time), weight, jockey, trainer, prize money, etc.
- Indexed by `horseId` and `raceDate` for fast queries

## Future Enhancements

### Scheduler Job
- Will periodically fetch new races for all horses in all stablemates
- Will add new races to database (avoiding duplicates)
- Will run daily/weekly as needed

### Registrations & Gallops
- Currently not stored in database (APIs return empty)
- Can be added later with similar approach:
  - Create `HorseRegistration` and `HorseGallop` models
  - Fetch and store during onboarding
  - Update via scheduler job

## Benefits of This Approach

1. **Simplicity**: No complex caching, merging, or filtering logic
2. **Performance**: Fast database queries (indexed)
3. **Consistency**: Single source of truth (database)
4. **Maintainability**: Easy to understand and modify
5. **Scalability**: Can handle large amounts of data efficiently

## Migration Notes

- **Removed**: All cache fields from `OwnerProfile` and `Horse` models
- **Removed**: Cache logic from all API routes
- **Removed**: `clear-race-cache.ts` script (no longer needed)
- **Simplified**: Recent races API (from ~320 lines to ~100 lines)
