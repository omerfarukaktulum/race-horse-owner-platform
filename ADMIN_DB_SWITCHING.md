# Admin Database Switching

## Overview

The admin tool now supports switching between local and production databases. This feature is **admin-only** and does not affect regular users.

## How It Works

1. **Database Preference Storage**: Admin's database preference is stored in a cookie (`admin-db-preference`)
2. **Environment Variables**:
   - `DATABASE_URL` - Default database (used by regular users and as fallback)
   - `PROD_DATABASE_URL` - Production database URL (optional, for admin switching)
3. **Admin Routes**: Should use `getAdminPrismaClient()` from `@/lib/admin-prisma` instead of the default `prisma` import

## Usage

### For Admins

1. Go to `/admin` page
2. See current database status in the top right
3. If `PROD_DATABASE_URL` is configured, a "Switch" button will appear
4. Click "Switch" to toggle between local and production databases
5. Page will reload to reflect the new database

### For Developers

#### Updating Admin Routes to Use Admin Prisma Client

Replace:
```typescript
import { prisma } from '@/lib/prisma'
```

With:
```typescript
import { getAdminPrismaClient } from '@/lib/admin-prisma'

// In your route handler:
const prisma = getAdminPrismaClient()
```

#### Example

```typescript
// app/api/admin/users/route.ts
import { NextResponse } from 'next/server'
import { getAdminPrismaClient } from '@/lib/admin-prisma'
import { cookies } from 'next/headers'
import { verify } from 'jsonwebtoken'

export async function GET(request: Request) {
  try {
    // ... auth checks ...
    
    const prisma = getAdminPrismaClient() // Use admin Prisma client
    const users = await prisma.user.findMany({
      // ... query ...
    })
    
    return NextResponse.json({ users })
  } catch (error) {
    // ... error handling ...
  }
}
```

## Important Notes

- **Regular users are NOT affected**: They always use `DATABASE_URL`
- **Production environment**: In production, regular users always use `DATABASE_URL` regardless of admin preference
- **Cookie-based**: Admin preference is stored in a cookie and persists for 7 days
- **Client caching**: Prisma clients are cached per database URL to improve performance

## API Endpoints

- `GET /api/admin/db-status` - Get current database status and preference
- `POST /api/admin/db-switch` - Switch database preference (`{ preference: 'local' | 'prod' }`)

## Environment Setup

Add to your `.env` file:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/race_horse_owner"
PROD_DATABASE_URL="postgresql://user:password@prod-host:5432/prod_db"
```

In production, `PROD_DATABASE_URL` is optional. If not set, the switch button won't appear.

