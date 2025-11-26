# Deprecated Registration Pages

This directory contains the old registration pages that have been replaced with simpler forms.

## Files

- **`owner-page.tsx`** - Old owner registration page (email + password registration)
- **`trainer-page.tsx`** - Old trainer registration page (email + password registration)
- **`page.tsx`** - Old role selection page (if moved here)

## Migration Date

These pages were deprecated and replaced on: [Current Date]

## What Changed

The old registration pages required:
- Email
- Password
- Password confirmation
- Auto sign-in after registration
- Redirect to onboarding flow

The new registration pages (located in `/app/register/owner/page.tsx` and `/app/register/trainer/page.tsx`) now require:
- Name-surname
- Email
- Telephone number
- Show success message: "Your registration request has been received, we'll contact you soon"

## When to Use Old Pages

If you need to restore the old registration flow (with password-based registration and auto sign-in), you can:
1. Copy the files from this directory back to their original locations
2. Restore the API endpoints if they were changed
3. Update any routing or links that point to the registration pages

## Notes

- The old pages are kept for reference and potential rollback
- API endpoints may need to be restored if they were modified
- Check git history for the exact changes made during migration

