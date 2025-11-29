# Implementation Plan: Manual Admin Setup + Nightly Updates

## ✅ Already Complete

1. **User Registration Pages**
   - `/register/owner` - Shows "we'll get back to you" ✅
   - `/register/trainer` - Shows "we'll get back to you" ✅

2. **Database Route Updated**
   - `app/api/tjk/horses/route.ts` - Now queries database (no Playwright) ✅

3. **Architecture Documented**
   - `FINAL_ARCHITECTURE.md` - Complete flow documented ✅
   - `ADMIN_SETUP_GUIDE.md` - Admin workflow documented ✅

4. **Cronjob Structure**
   - `services/tjk-scraper/cronjob.js` - Nightly update logic ✅
   - `services/tjk-scraper/server.js` - Endpoint for cronjob ✅

## 🔨 To Implement

### 1. Admin Setup Tool (`/register/admin`)
**Priority: High**

Create admin page with:
- [ ] User account creation form
- [ ] TJK owner search (reuse existing API)
- [ ] Stablemate creation form
- [ ] "Load Horses" button (calls Playwright service)
- [ ] "Load Details" button per horse (calls Playwright service)
- [ ] Progress indicators
- [ ] Error handling

**Files to create:**
- `app/register/admin/page.tsx`
- `app/api/admin/setup/route.ts` (if needed)

### 2. Playwright Service - Complete Implementation
**Priority: High**

Complete the service:
- [ ] Copy Playwright functions from `lib/tjk-api.ts`
- [ ] Copy scrapers from `lib/tjk-*.ts`
- [ ] Set up Prisma client
- [ ] Implement all endpoints
- [ ] Test locally

**Files to complete:**
- `services/tjk-scraper/server.js` - Add actual implementations
- `services/tjk-scraper/lib/` - Copy Playwright functions here

### 3. Cronjob - Delta Update Logic
**Priority: Medium**

Implement delta updates:
- [ ] `updateRaceHistory()` - Compare dates, insert new races
- [ ] `updateGallops()` - Compare dates, insert new gallops
- [ ] `updateDeclarationsRegistrations()` - Compare, insert new
- [ ] `updateHorseSummary()` - Update horse stats

**File:**
- `services/tjk-scraper/cronjob.js` - Complete implementations

### 4. Disable/Redirect Onboarding Pages
**Priority: Low**

Since users don't go through onboarding:
- [ ] Redirect `/onboarding/*` to `/app/home` (if user is logged in)
- [ ] Or show "Onboarding not needed" message
- [ ] Update middleware if needed

**Files to check:**
- `app/onboarding/*` - All onboarding pages
- `middleware.ts` - Check onboarding routes

### 5. Deploy Playwright Service
**Priority: High**

- [ ] Deploy to Railway or Render
- [ ] Set environment variables
- [ ] Test endpoints
- [ ] Set up cronjob (Railway cron or external)

## Implementation Order

1. **Complete Playwright Service** (can test locally)
2. **Create Admin Setup Tool** (needs service working)
3. **Implement Cronjob Logic** (needs service working)
4. **Deploy Service** (Railway/Render)
5. **Set Up Cronjob** (nightly schedule)
6. **Disable Onboarding** (cleanup)

## Testing Checklist

- [ ] Admin can create user account
- [ ] Admin can find owner in TJK
- [ ] Admin can load horses (Playwright works)
- [ ] Admin can load horse details (Playwright works)
- [ ] User can log in and see data
- [ ] Cronjob runs successfully
- [ ] Cronjob only adds new data (delta)
- [ ] Users see updated data next day

## Notes

- Onboarding pages can stay (for reference) but should redirect
- User registration pages are already correct
- Database route is already updated
- Focus on admin tools and cronjob implementation

