# Supabase Quick Start Checklist

Follow these steps in order:

## ✅ Setup Checklist

- [ ] **Step 1**: Sign up at [supabase.com](https://supabase.com)
- [ ] **Step 2**: Create new project
  - Name: `race-horse-owner-platform`
  - Save database password securely
  - Choose region (West Europe recommended for Turkey)
- [ ] **Step 3**: Get connection strings
  - Go to Settings → Database
  - Copy **Transaction** connection string (pooled, port 6543)
  - Copy **URI** connection string (direct, port 5432)
- [ ] **Step 4**: Update `.env.local`
  ```bash
  DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true"
  DIRECT_URL="postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres"
  ```
- [ ] **Step 5**: Test connection
  ```bash
  npx prisma generate
  npx prisma db pull
  ```
- [ ] **Step 6**: Push schema
  ```bash
  npm run db:push
  ```
- [ ] **Step 7**: Verify in Prisma Studio
  ```bash
  npm run db:studio
  ```
- [ ] **Step 8**: Test app
  ```bash
  npm run dev
  ```
- [ ] **Step 9**: Update production env vars (Vercel/etc)
  - Add `DATABASE_URL` and `DIRECT_URL`

## 🔗 Quick Links

- **Supabase Dashboard**: https://supabase.com/dashboard
- **Table Editor**: https://supabase.com/dashboard/project/[your-project]/editor
- **Database Settings**: https://supabase.com/dashboard/project/[your-project]/settings/database

## 📝 Connection String Format

**Pooled (for app):**
```
postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true
```

**Direct (for migrations):**
```
postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres
```

## ⚠️ Important Notes

1. **Never commit** `.env.local` to git
2. **Save your database password** - you can't recover it
3. Use **pooled connection** for app queries
4. Use **direct connection** for migrations
5. Free tier pauses after 1 week of inactivity

## 🆘 Troubleshooting

**Connection fails?**
- Check password is correct
- Verify connection string format
- Try direct connection instead

**Migrations fail?**
- Use `DIRECT_URL` for migrations
- Check Prisma schema is valid
- Run `npx prisma generate` first

**Tables not showing?**
- Run `npm run db:push`
- Check Supabase Table Editor
- Verify connection strings

For detailed instructions, see [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)

