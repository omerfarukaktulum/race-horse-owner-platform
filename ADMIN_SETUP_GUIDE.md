# Admin Manual Setup Guide

## Overview

After a user registers (via `/register/owner` or `/register/trainer`), you need to manually set up their account using the admin tools.

## Setup Flow

### 1. Access Admin Tools
- Go to `/register/admin`
- Or use admin dashboard

### 2. Create User Account
- Enter user's email, name, etc.
- Create account in database
- Set password (user will reset later)

### 3. Find Owner (At Sahibi)
- Search for owner name in TJK
- Select correct owner
- This gives you `officialName` and `officialRef` (TJK owner ID)

### 4. Create Stablemate (Eküri)
- Enter stablemate name
- Foundation year, location, etc.
- Link to owner profile

### 5. Load Horses (One-time)
- Use Playwright service to fetch all horses for owner
- Store in database linked to stablemate
- This includes: name, yob, gender, status, externalRef, sire, dam

### 6. Load Horse Details (One-time)
For each horse:
- **Race History**: All past races
- **Gallops**: All training records
- **Pedigree**: 4-generation family tree
- **Declarations/Registrations**: Upcoming races

### 7. User Account Ready
- User can now log in
- Sees all their data
- No onboarding needed

## Tools Needed

### Admin Page (`/register/admin`)
- Create user account
- Find owner (TJK search)
- Create stablemate
- Trigger data loading (Playwright service)

### Playwright Service Endpoints
- `POST /api/tjk/fetch-horses` - Load horses for owner
- `POST /api/tjk/fetch-horse-details` - Load details for horse
- Called by admin during setup

## Nightly Updates

After initial setup, nightly cronjob handles updates:
- Runs at 2 AM
- Updates races, gallops, declarations, registrations
- Delta updates only (new data)
- No admin action needed

## Example Workflow

1. **User registers** → "We'll get back to you"
2. **You receive notification** (email/notification system)
3. **You go to admin tools** → `/register/admin`
4. **Create account** → Enter user details
5. **Find owner** → Search "EMRAH KARAMAZI" → Select
6. **Create stablemate** → "Karamazi Eküri"
7. **Load horses** → Click "Load Horses" → Wait 5-10 seconds
8. **Load details** → For each horse, click "Load Details" → Wait 2-3 seconds each
9. **Notify user** → "Your account is ready! You can log in now."
10. **User logs in** → Sees everything ready

## Time Estimate

- **Account creation**: 1 minute
- **Find owner**: 30 seconds
- **Create stablemate**: 1 minute
- **Load horses**: 5-10 seconds
- **Load details per horse**: 2-3 seconds × number of horses
- **Total for 10 horses**: ~5-10 minutes
- **Total for 50 horses**: ~15-20 minutes

## Tips

- Load horses first (fast)
- Load details in background (can be slow)
- Use batch operations when possible
- Check for errors and retry if needed

