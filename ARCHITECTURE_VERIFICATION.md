# Architecture Verification: Two-Service Separation

## ✅ Verified Separation

### 🔐 Admin Service (Admin-Only)

**Routes:**
- `/admin/*` - All admin pages
- `/admin-signin` - Admin login
- `/admin/create-owner/*` - Admin onboarding flow

**APIs with Playwright:**
- ✅ `/api/admin/tjk/horses` - Uses Playwright directly
- ✅ `/api/admin/onboarding/*` - Admin onboarding APIs
- ✅ `/api/import/horses` - Supports admin mode (used during admin onboarding)

**Features:**
- ✅ Can use Playwright for fetching horses from TJK
- ✅ Can create users manually
- ✅ Can do full onboarding for target users
- ✅ Has access to all admin tools

---

### 👥 User Service (Regular Users)

**Routes:**
- `/signin` - User login
- `/register/owner` - Owner registration (creates account only)
- `/register/trainer` - Trainer registration (creates account only)
- `/app/*` - All user-facing pages

**APIs (NO Playwright):**
- ✅ `/api/tjk/horses` - **Database-only** (removed Playwright service call)
- ✅ `/api/tjk/owners` - Uses TJK API directly (no Playwright needed)
- ✅ `/api/auth/*` - Authentication
- ✅ `/api/horses` - Horse management (database)
- ✅ `/api/expenses` - Expense management (database)
- ✅ All other user APIs

**Blocked:**
- ❌ `/onboarding/*` - **Redirected to `/app/home`** (middleware blocks)
- ❌ `/api/onboarding/*` - **Returns 403 error** (disabled)
- ❌ No Playwright access
- ❌ No onboarding flow

---

## 🔒 Security Implementation

### Middleware (`middleware.ts`):
```typescript
// Onboarding routes - BLOCKED for regular users
if (pathname.startsWith('/onboarding')) {
  return NextResponse.redirect(new URL('/app/home', request.url))
}

// Admin-only routes
if (pathname.startsWith('/admin')) {
  if (token?.role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/app/home', request.url))
  }
}
```

### API Blocks:
- `/api/onboarding/owner-profile` → Returns 403
- `/api/onboarding/stablemate` → Returns 403
- `/api/onboarding/set-locations` → Returns 403
- `/api/onboarding/trainer-profile` → Returns 403

### User API (`/api/tjk/horses`):
- ✅ Removed Playwright service call
- ✅ Database-only lookup
- ✅ No external service dependencies

---

## 📋 Summary

**Admin Service:**
- Has Playwright access ✅
- Can do onboarding ✅
- Manages users ✅
- Uses `/admin/*` routes ✅

**User Service:**
- NO Playwright ✅
- NO onboarding ✅
- Only register/login + app pages ✅
- Uses `/app/*` routes ✅
- All data pre-loaded by admin ✅

---

## ✅ Verification Checklist

- [x] `/api/tjk/horses` - Database-only (no Playwright)
- [x] `/api/admin/tjk/horses` - Uses Playwright
- [x] `/onboarding/*` - Blocked by middleware
- [x] `/api/onboarding/*` - Returns 403
- [x] Regular users redirect to `/app/home` after login
- [x] Admin uses `/admin/create-owner/*` for onboarding
- [x] No Playwright in user-facing code

