# Database Query Performance Optimization Plan

## Issues Identified

### 1. Missing Composite Indexes
Current indexes are single-column, but queries often filter by `(horseId, date)` combinations.

### 2. N+1 Query Problems
- Dashboard APIs make 2-3 sequential queries instead of 1
- Horses list fetches all relations for all horses
- Horse detail page makes 4 separate API calls

### 3. Over-fetching Data
- Horses list includes illnesses, banned medicines, location history for ALL horses
- Dashboard APIs fetch owner profile multiple times

### 4. No Pagination
- Horses list loads all horses at once
- No limits on related data fetches

## Optimization Steps

### Step 1: Add Composite Indexes (High Priority)
Add indexes for common query patterns:

```prisma
// In HorseRaceHistory
@@index([horseId, raceDate(sort: Desc)])

// In HorseGallop  
@@index([horseId, gallopDate(sort: Desc)])

// In HorseRegistration
@@index([horseId, raceDate(sort: Asc)])

// In Expense
@@index([horseId, createdAt(sort: Desc)])
```

### Step 2: Optimize Dashboard APIs
Combine sequential queries into single queries with proper joins:

**Before (3 queries):**
1. Get ownerId
2. Get stablemate + horses
3. Get races/gallops/registrations

**After (1 query):**
- Use Prisma's `include` to fetch everything in one query

### Step 3: Optimize Horses List API
- Remove unnecessary includes (illnesses, banned medicines)
- Only fetch what's needed for the list view
- Add pagination

### Step 4: Optimize Horse Detail Page
- Combine 4 API calls into 1 with selective includes
- Use query parameters to control what data to fetch

### Step 5: Add Pagination
- Add pagination to horses list
- Add limits to related data (expenses, notes, etc.)

## Expected Performance Improvements

- **Dashboard APIs**: 50-70% faster (fewer queries)
- **Horses List**: 60-80% faster (less data fetched)
- **Horse Detail**: 40-60% faster (single query instead of 4)
- **Overall**: 2-3x faster page loads

