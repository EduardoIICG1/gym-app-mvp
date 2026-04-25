# Primary Performance — Setup Guide

## Environment Variables

Create `.env.local` at the project root (never committed to git):

```env
DATABASE_URL="postgresql://postgres.PROJECTREF:PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres.PROJECTREF:PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres"
AUTH_SECRET="<openssl rand -base64 32>"
AUTH_GOOGLE_ID="<from console.cloud.google.com>"
AUTH_GOOGLE_SECRET="<from console.cloud.google.com>"
NEXTAUTH_URL="http://localhost:3000"
```

Where to get each value:
- **DATABASE_URL / DIRECT_URL** → Supabase → Project Settings → Database → Connection String. Use "Transaction" mode (port 6543) for `DATABASE_URL` and "Session" mode (port 5432) for `DIRECT_URL`.
- **AUTH_SECRET** → run `openssl rand -base64 32`
- **AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET** → [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials → OAuth 2.0 Client IDs. Add `http://localhost:3000/api/auth/callback/google` to Authorized Redirect URIs.

---

## Prisma 7 — Important Note

This project uses **Prisma 7**, which moved database connection URLs out of `schema.prisma` and into `prisma.config.ts`.

`prisma.config.ts` loads `.env.local` via `@next/env` and passes `DATABASE_URL` / `DIRECT_URL` to Prisma. This works correctly in local development.

### Vercel Deployments

On Vercel, `.env.local` is not used during the build step. You must set the variables directly in the Vercel dashboard:

1. Vercel Dashboard → Project → Settings → Environment Variables
2. Add `DATABASE_URL` and `DIRECT_URL` for **Production**, **Preview**, and **Development**
3. Add `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `NEXTAUTH_URL`

For production, `NEXTAUTH_URL` should be your production domain (e.g., `https://primaryperformance.vercel.app`).

> **Why two DB URLs?** Supabase uses PgBouncer for connection pooling. `DATABASE_URL` (port 6543, pgbouncer=true) is for the app at runtime. `DIRECT_URL` (port 5432) is for Prisma migrations (`db push` / `migrate`), which require a direct connection that bypasses the pooler.

---

## First-Time Database Setup

```bash
# Push schema to Supabase (creates all tables)
npx prisma db push

# Seed initial data (users, programs, sessions, memberships)
npx prisma db seed

# Open Prisma Studio to inspect data
npx prisma studio
```

---

## Google OAuth — Authorized Redirect URIs

| Environment | Redirect URI |
|---|---|
| Local | `http://localhost:3000/api/auth/callback/google` |
| Vercel Preview | `https://<your-preview-url>.vercel.app/api/auth/callback/google` |
| Production | `https://<your-domain>/api/auth/callback/google` |

Add all three to your Google OAuth client's Authorized Redirect URIs.
