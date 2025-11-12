# Database Scripts

This directory contains utility scripts for managing your local database.

## 📋 Available Scripts

### Truncate Database

Completely removes all data from your local database. Useful for:
- Resetting your development environment
- Testing from a clean state
- Removing test data

**⚠️ WARNING: This will permanently delete ALL data!**

#### Usage Options

**Option 1: Using npm (Recommended)**
```bash
npm run db:truncate
```

**Option 2: Direct shell script**
```bash
./scripts/truncate-db.sh
```

**Option 3: Direct SQL**
```bash
# Load your DATABASE_URL from .env first
export $(grep DATABASE_URL .env | xargs)
psql "$DATABASE_URL" -f scripts/truncate-database.sql
```

#### What it does

The script will:
1. ✅ Ask for confirmation before proceeding
2. ✅ Load your DATABASE_URL from `.env` or `.env.local`
3. ✅ Truncate all tables in the correct order (respecting foreign key constraints)
4. ✅ Display a success message

#### After truncating

After clearing the database, you can:
- **Add seed data**: `npm run db:seed`
- **Create new users**: Register through the app at `/register`
- **Start fresh**: Begin testing with a clean database

## 📊 Tables Affected

All tables will be truncated in this order:
1. `expenses` - All expense records
2. `horses` - All horse records
3. `stablemates` - All stablemate/stable records
4. `racecourses` - All racecourse data
5. `farms` - All farm data
6. `accounts` - NextAuth accounts
7. `sessions` - NextAuth sessions
8. `owner_profiles` - Owner profile data
9. `trainer_profiles` - Trainer profile data
10. `users` - All user accounts

## 🔒 Safety Features

- ✅ Requires explicit "yes" confirmation
- ✅ Only works with local database (requires manual DATABASE_URL)
- ✅ Uses CASCADE to properly handle foreign keys
- ✅ Colored output for warnings and errors

## 🚨 Important Notes

- This script is for **local development only**
- **Never run this on production databases**
- The operation is **irreversible** - all data will be permanently deleted
- Make sure you have backups if you need to preserve any data

