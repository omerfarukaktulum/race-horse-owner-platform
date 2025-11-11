# TJK Stablemate - Setup Guide

## Prerequisites

- Node.js 18+ installed
- PostgreSQL installed and running
- npm or yarn package manager

## Step-by-Step Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup PostgreSQL Database

#### Option A: Using Local PostgreSQL

1. **Install PostgreSQL** (if not already installed):
   - macOS: `brew install postgresql@15`
   - Ubuntu: `sudo apt-get install postgresql`
   - Windows: Download from [postgresql.org](https://www.postgresql.org/download/)

2. **Start PostgreSQL**:
   ```bash
   # macOS
   brew services start postgresql@15
   
   # Ubuntu
   sudo service postgresql start
   ```

3. **Create Database**:
   ```bash
   # Connect to PostgreSQL
   psql postgres
   
   # Create database
   CREATE DATABASE tjk_stablemate;
   
   # Create user (optional)
   CREATE USER tjk_user WITH ENCRYPTED PASSWORD 'your_password';
   GRANT ALL PRIVILEGES ON DATABASE tjk_stablemate TO tjk_user;
   
   # Exit
   \q
   ```

#### Option B: Using Docker

```bash
docker run --name tjk-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=tjk_stablemate \
  -p 5432:5432 \
  -d postgres:15
```

### 3. Configure Environment Variables

The `.env.local` file has been created with default values. Update these as needed:

```bash
# Edit .env.local
nano .env.local
```

**Important variables to configure:**

- `DATABASE_URL`: Update with your PostgreSQL credentials
  - Default: `postgresql://postgres:postgres@localhost:5432/tjk_stablemate?schema=public`
  - Format: `postgresql://USERNAME:PASSWORD@HOST:PORT/DATABASE?schema=public`

- `NEXTAUTH_SECRET`: Generate a secure random string
  ```bash
  # Generate a secure secret
  openssl rand -base64 32
  ```

- **For Production**: Update Stripe keys, Resend API key, etc.

### 4. Initialize Database

```bash
# Push schema to database
npm run db:push

# Seed database with demo data
npm run db:seed
```

This will create:
- Demo admin account: `admin@tjk-stablemate.com` / `admin123456`
- Demo owner account: `demo@owner.com` / `owner123456`
- Demo trainer account: `demo@trainer.com` / `trainer123456`
- 13 racecourses
- 5 farms

### 5. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Verification

### Test the Setup

1. **Visit Landing Page**: http://localhost:3000
2. **Sign In**: Click "Giriş Yap" and use demo credentials
3. **Check Database**: 
   ```bash
   npm run db:studio
   ```
   This opens Prisma Studio at http://localhost:5555

### Common Issues

#### 1. Database Connection Failed

**Error**: `Can't reach database server`

**Solution**:
- Verify PostgreSQL is running: `pg_isready`
- Check DATABASE_URL in `.env.local`
- Ensure database exists: `psql -l`

#### 2. Prisma Client Not Generated

**Error**: `Cannot find module '@prisma/client'`

**Solution**:
```bash
npx prisma generate
```

#### 3. Port 3000 Already in Use

**Solution**:
```bash
# Use different port
npm run dev -- -p 3001
```

#### 4. Missing Dependencies

**Solution**:
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

## Database Management

### Useful Commands

```bash
# View database in GUI
npm run db:studio

# Push schema changes (development)
npm run db:push

# Create migration (production)
npm run db:migrate

# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Re-seed database
npm run db:seed
```

### Database Schema

The database includes:
- **users** - User accounts (owners, trainers, admins)
- **owner_profiles** - Owner-specific data
- **trainer_profiles** - Trainer-specific data
- **stablemates** - Eküri (stable) information
- **horses** - Horse records
- **expenses** - Expense tracking
- **racecourses** - Racecourse reference data
- **farms** - Farm reference data
- **accounts** & **sessions** - NextAuth authentication

## Next Steps

### For Development

1. **Explore the App**:
   - Sign in with demo accounts
   - Navigate through horses, expenses, statistics
   - Test onboarding flow (register new owner)

2. **Check API Endpoints**:
   - API routes are in `app/api/`
   - Test with tools like Postman or Thunder Client

3. **Customize**:
   - Update Turkish translations in `lib/constants/tr.ts`
   - Modify color scheme in `tailwind.config.js`
   - Add new features following existing patterns

### For Production

1. **Setup Stripe**:
   - Create Stripe account at [stripe.com](https://stripe.com)
   - Get API keys from dashboard
   - Create products and price IDs
   - Update environment variables

2. **Setup Resend**:
   - Create account at [resend.com](https://resend.com)
   - Get API key
   - Configure sender domain

3. **Deploy to Vercel**:
   ```bash
   # Install Vercel CLI
   npm i -g vercel
   
   # Deploy
   vercel
   ```

4. **Setup Production Database**:
   - Option A: Vercel Postgres
   - Option B: Supabase
   - Option C: Railway
   - Option D: Neon

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ Yes | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | ✅ Yes | Secret for JWT signing |
| `NEXTAUTH_URL` | ✅ Yes | Application URL |
| `STRIPE_SECRET_KEY` | ⚠️ For billing | Stripe secret key |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | ⚠️ For billing | Stripe public key |
| `STRIPE_WEBHOOK_SECRET` | ⚠️ For billing | Stripe webhook secret |
| `NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID` | ⚠️ For billing | Stripe price ID |
| `RESEND_API_KEY` | ⚠️ For emails | Resend API key |
| `RESEND_FROM_EMAIL` | ⚠️ For emails | Sender email address |
| `BLOB_READ_WRITE_TOKEN` | ⚪ Optional | Vercel Blob for uploads |
| `PLAYWRIGHT_ENABLED` | ⚪ Optional | Enable TJK scraping |

## Getting Help

- Check `README.md` for project overview
- See `IMPLEMENTATION_STATUS.md` for feature completion
- Review `PROJECT_SUMMARY.md` for technical details
- Open an issue on GitHub (if applicable)

## Development Tips

1. **Hot Reload**: Changes to code auto-reload the browser
2. **TypeScript**: VS Code provides excellent IntelliSense
3. **Database Changes**: Use `npm run db:push` after schema updates
4. **API Testing**: Use Prisma Studio to verify data
5. **Debugging**: Check browser console and terminal logs

---

**Happy Coding! 🐴**

