# Final Architecture: Manual Admin Setup + Nightly Updates

## Overview

**Flow:**
1. **User Registration** → User fills form, gets "we'll get back to you" message
2. **Admin Manual Setup** → Admin creates account, finds owner, loads all data
3. **User Login** → User sees everything ready (anasayfa, atlar, giderler, etc.)
4. **Nightly Cronjob** → Updates races, gallops, declarations, registrations (delta updates)

## User Flow

### 1. Registration (`/register/owner` or `/register/trainer`)
- User fills: Name, Email, Telephone
- Shows: "Kayıt başvurunuz alınmıştır, en kısa sürede sizinle iletişime geçeceğiz"
- **No onboarding** - user waits for admin setup

### 2. Admin Manual Setup (`/register/admin`)
- Admin creates user account
- Finds owner (at sahibi) by name
- Loads horses, gallops, races, declarations, registrations (one-time)
- Sets up stablemate
- User account is ready

### 3. User Login
- User logs in
- Sees: Anasayfa, Atlar, Giderler, etc.
- All data already in database
- **No onboarding flow**

### 4. Nightly Cronjob (2 AM)
- Runs for each stablemate in database
- For each horse owned by stablemate:
  - Fetches new races (delta)
  - Fetches new gallops (delta)
  - Fetches new declarations (delta)
  - Fetches new registrations (delta)
- Writes only new data (delta updates)
- Next day, users see updated data automatically

## Architecture

```
┌─────────────────┐
│  User Registers │  → "We'll get back to you"
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Admin Setup    │  → Manual setup via /register/admin
│  (Playwright)   │  → Finds owner, loads all data
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  User Logs In   │  → Sees everything ready
│  (No Onboarding)│  → Anasayfa, Atlar, Giderler, etc.
└─────────────────┘

┌─────────────────┐
│  Nightly Cron   │  → Runs at 2 AM
│  (Playwright)   │  → Updates races, gallops, etc.
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Database       │  → Delta updates only
│  (Supabase)     │
└─────────────────┘
```

## Components

### 1. User Registration Pages
- ✅ `/register/owner` - Already shows "we'll get back to you"
- ✅ `/register/trainer` - Already shows "we'll get back to you"
- No changes needed

### 2. Admin Manual Setup Tool
- `/register/admin` - Admin creates account
- Admin tools for:
  - Finding owner (TJK owner search)
  - Loading horses (Playwright)
  - Loading gallops (Playwright)
  - Loading races (Playwright)
  - Loading declarations/registrations (Playwright)
  - Setting up stablemate

### 3. Nightly Cronjob
- Runs on Playwright service (Railway/Render)
- Endpoint: `POST /api/tjk/update-all`
- Logic:
  1. Get all stablemates
  2. For each stablemate:
     - Get all horses
     - For each horse:
       - Fetch new races (compare with existing)
       - Fetch new gallops (compare with existing)
       - Fetch new declarations (compare with existing)
       - Fetch new registrations (compare with existing)
       - Write only new records (delta)

### 4. User Pages (No Changes)
- `/app/home` - Dashboard
- `/app/horses` - Horse list
- `/app/expenses` - Expenses
- `/app/notes` - Notes
- All work as-is, just read from database

## Data Flow

### Initial Setup (One-time)
```
Admin → Playwright Service → TJK → Database
  ↓
- Owner profile created
- Stablemate created
- All horses loaded
- All gallops loaded
- All races loaded
- All declarations/registrations loaded
```

### Nightly Updates (Delta)
```
Cronjob → Playwright Service → TJK → Database (delta only)
  ↓
- New races added
- New gallops added
- New declarations added
- New registrations added
- Existing data unchanged
```

## Implementation Status

### ✅ Already Done
- User registration pages (show "we'll get back to you")
- Database schema (supports all data)
- User pages (anasayfa, atlar, giderler, etc.)

### 🔨 To Do
1. **Admin Setup Tool** (`/register/admin`)
   - Create user account
   - Find owner (TJK search)
   - Load horses (Playwright)
   - Load all data (Playwright)
   - Set up stablemate

2. **Nightly Cronjob**
   - Endpoint: `POST /api/tjk/update-all`
   - Delta update logic
   - Run for each stablemate/horse

3. **Remove/Disable Onboarding**
   - Remove onboarding pages or redirect
   - Update middleware if needed

## Benefits

✅ **No user onboarding** - Simpler UX
✅ **Admin control** - You control data quality
✅ **Delta updates** - Efficient, only new data
✅ **Reliable** - Playwright runs on compatible hosting
✅ **Scalable** - Can handle many users

