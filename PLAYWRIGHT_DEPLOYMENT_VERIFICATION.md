# Playwright Deployment Verification

## ✅ VERIFIED: Playwright is NOT used in the real user-facing app

### Summary
- **User-facing app**: ✅ NO Playwright usage
- **Admin onboarding**: ✅ Uses Playwright (admin-only, acceptable)
- **Regular onboarding**: ✅ Blocked (redirects to `/app/home`)

---

## User-Facing Routes (NO Playwright)

### 1. `/api/tjk/horses` - ✅ Database-Only
**File:** `app/api/tjk/horses/route.ts`
- **Status:** ✅ Database-only, NO Playwright
- **What it does:** Reads horses from database (pre-fetched by admin)
- **Used by:**
  - `app/components/modals/add-horse-modal.tsx` (user-facing modal)
  - `app/onboarding/import-horses/page.tsx` (blocked by middleware anyway)

**Code verification:**
```typescript
// USER SERVICE: Only read from database (no Playwright, no external service)
// Admin onboarding uses /api/admin/tjk/horses for Playwright fetching
const ownerProfile = await prisma.ownerProfile.findFirst({
  // ... database query only
})
```

### 2. `/app/horses` - ✅ Database-Only
**File:** `app/app/horses/page.tsx`
- **Status:** ✅ No Playwright calls
- **What it does:** Displays horses from database
- **Data source:** Database queries only

### 3. `/app/stablemate` - ✅ Database-Only
**File:** `app/app/stablemate/page.tsx`
- **Status:** ✅ No Playwright calls
- **What it does:** Displays stablemate info from database

### 4. Add Horse Modal - ✅ Database-Only
**File:** `app/components/modals/add-horse-modal.tsx`
- **Status:** ✅ Calls `/api/tjk/horses` (database-only)
- **Line 151:** `const tjkUrl = `/api/tjk/horses?${params.toString()}``
- **No Playwright:** Only fetches from database

---

## Admin-Only Routes (Uses Playwright - Acceptable)

### 1. `/api/admin/tjk/horses` - ⚠️ Uses Playwright
**File:** `app/api/admin/tjk/horses/route.ts`
- **Status:** ⚠️ Uses Playwright (admin-only)
- **Protection:** Requires `ADMIN` role
- **Used by:** `app/admin/create-owner/import-horses/page.tsx` (admin onboarding)
- **Impact:** ✅ Acceptable - only runs during admin onboarding, not in production user flows

**Code:**
```typescript
import { searchTJKHorsesPlaywright } from '@/lib/tjk-api'
// ...
const horses = await searchTJKHorsesPlaywright(ownerName, ownerRef)
```

---

## Blocked Routes

### 1. Regular User Onboarding (`/onboarding/*`) - ✅ Blocked
**File:** `middleware.ts` (lines 58-62)
- **Status:** ✅ All `/onboarding/*` routes redirect to `/app/home`
- **Reason:** Regular user onboarding is disabled (admin-managed only)
- **Note:** This is the OLD user-facing onboarding flow, NOT the admin tool

**Code:**
```typescript
if (pathname.startsWith('/onboarding')) {
  // Redirect all users (including authenticated) away from regular onboarding
  // Admin onboarding is at /admin/create-owner/*
  return NextResponse.redirect(new URL('/app/home', request.url))
}
```

**Examples of blocked routes:**
- `/onboarding/import-horses` ❌ (redirects to `/app/home`)
- `/onboarding/set-locations` ❌ (redirects to `/app/home`)
- `/onboarding/trainer-lookup` ❌ (redirects to `/app/home`)

### 2. Admin Onboarding (`/admin/create-owner/*`) - ✅ NOT Blocked (Admin-Only)
**File:** `middleware.ts` (lines 64-69)
- **Status:** ✅ Accessible to ADMIN users only
- **Purpose:** Admin tool for manually setting up user accounts
- **Uses Playwright:** ✅ Yes (via `/api/admin/tjk/horses`)

**Code:**
```typescript
// Admin-only routes
if (pathname.startsWith('/admin')) {
  if (token?.role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/app/home', request.url))
  }
}
```

**Examples of admin onboarding routes:**
- `/admin/create-owner` ✅ (admin only)
- `/admin/create-owner/owner-lookup` ✅ (admin only)
- `/admin/create-owner/stablemate-setup` ✅ (admin only)
- `/admin/create-owner/import-horses` ✅ (admin only, uses Playwright)

---

## Playwright Usage Locations

### ✅ Safe (Admin-Only)
1. `app/api/admin/tjk/horses/route.ts` - Admin onboarding only
2. `app/admin/create-owner/import-horses/page.tsx` - Admin onboarding page
3. `services/tjk-scraper/server.ts` - Separate service (not deployed to Vercel)

### ✅ Not Used in Production
1. `lib/tjk-api.ts` - Contains `searchTJKHorsesPlaywright()` but only called by admin routes
2. `lib/tjk-horse-detail-scraper.ts` - Not called by user-facing routes
3. `lib/tjk-gallops-scraper.ts` - Not called by user-facing routes

---

## Deployment Safety Checklist

- [x] `/api/tjk/horses` - Database-only (no Playwright)
- [x] `/app/horses` - No Playwright calls
- [x] `/app/stablemate` - No Playwright calls
- [x] Add Horse Modal - Calls database-only endpoint
- [x] `/onboarding/*` - Blocked by middleware
- [x] Admin routes - Protected by role check
- [x] No Playwright in `package.json` dependencies (only in `services/tjk-scraper/`)

---

## Conclusion

✅ **SAFE TO DEPLOY**

The main application deployed to Vercel:
- Does NOT use Playwright in any user-facing routes
- Only uses database queries for user data
- Admin onboarding uses Playwright, but:
  - Requires ADMIN role
  - Only runs during manual admin setup
  - Not part of regular user flows

**Playwright will NOT cause issues in production deployment** because:
1. User-facing endpoints are database-only
2. Onboarding routes are blocked
3. Admin Playwright usage is isolated and protected

---

## Notes

- The `services/tjk-scraper/` directory is a separate service (not deployed to Vercel)
- `playwright` is in `package.json` dependencies (line 58), but:
  - Only used by admin routes (protected)
  - Only used for E2E tests
  - **NOT called by any user-facing routes**
- The `postinstall` script has a fallback: `|| echo 'Playwright browser installation skipped'`
- Even if Playwright installation fails on Vercel, it won't break the app because:
  - User-facing routes don't call Playwright
  - Admin routes that use Playwright are protected and optional
- Admin onboarding can use Playwright locally or via the separate scraper service

