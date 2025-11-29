# Service Separation Verification

## ✅ Admin Service (Admin-Only)

### Pages:
- `/admin` - Admin dashboard
- `/admin-signin` - Admin login
- `/admin/create-owner/*` - Admin onboarding flow (uses Playwright)
- `/admin/users` - User management
- `/admin/racecourses` - Racecourse management
- `/admin/farms` - Farm management

### APIs with Playwright:
- `/api/admin/tjk/horses` - ✅ Uses Playwright directly
- `/api/admin/onboarding/*` - Admin onboarding APIs

### Features:
- ✅ Can use Playwright for fetching horses from TJK
- ✅ Can create users manually
- ✅ Can do full onboarding for target users
- ✅ Has access to all admin tools

---

## ✅ User Service (Regular Users)

### Pages:
- `/signin` - User login
- `/register/owner` - Owner registration (creates account only)
- `/register/trainer` - Trainer registration (creates account only)
- `/app/*` - All user-facing pages (home, horses, expenses, etc.)

### APIs (NO Playwright):
- `/api/tjk/horses` - ✅ Database-only (no Playwright, no external service)
- `/api/tjk/owners` - ✅ Uses TJK API directly (no Playwright needed)
- `/api/auth/*` - Authentication
- `/api/horses` - Horse management (database)
- `/api/expenses` - Expense management (database)
- All other user APIs

### Blocked:
- ❌ `/onboarding/*` - Redirected to `/app/home` (middleware blocks)
- ❌ `/api/onboarding/*` - Returns 403 error
- ❌ No Playwright access
- ❌ No onboarding flow

---

## 🔒 Security

### Middleware Protection:
- `/onboarding/*` → Redirects to `/app/home` (blocked for all users)
- `/admin/*` → Requires ADMIN role
- Regular users → Can only access `/app/*` and public routes

### API Protection:
- `/api/onboarding/*` → Returns 403 (disabled)
- `/api/admin/tjk/horses` → Requires ADMIN role + uses Playwright
- `/api/tjk/horses` → Database-only (no Playwright)

---

## 📝 Summary

**Admin Service:**
- Has Playwright access
- Can do onboarding
- Manages users
- Uses `/admin/*` routes

**User Service:**
- NO Playwright
- NO onboarding
- Only register/login + app pages
- Uses `/app/*` routes
- All data pre-loaded by admin

