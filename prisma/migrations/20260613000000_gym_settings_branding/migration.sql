-- Tenant-ready branding/visual configuration for the gym.
-- Single-row table (id = 'primary') representing Primary Performance until
-- a Gym/Tenant model is introduced. See GymSettings model comment for the
-- planned multi-tenant migration path.
-- Apply with: psql $DATABASE_URL -f this_file.sql
-- OR via Prisma: prisma migrate deploy

-- CreateEnum
CREATE TYPE "AppearanceMode" AS ENUM ('LIGHT', 'DARK', 'SYSTEM');

-- CreateTable
CREATE TABLE "GymSettings" (
    "id" TEXT NOT NULL DEFAULT 'primary',
    "gymName" TEXT NOT NULL DEFAULT 'Primary Performance',
    "logoUrl" TEXT,
    "logoStoragePath" TEXT,
    "primaryColor" TEXT NOT NULL DEFAULT '#4fc3f7',
    "accentColor" TEXT NOT NULL DEFAULT '#22c55e',
    "appearanceMode" "AppearanceMode" NOT NULL DEFAULT 'DARK',
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GymSettings_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "GymSettings" ADD CONSTRAINT "GymSettings_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed the default row for Primary Performance so the app always has a row to read.
INSERT INTO "GymSettings" ("id", "gymName", "logoUrl", "primaryColor", "accentColor", "appearanceMode", "updatedAt")
VALUES ('primary', 'Primary Performance', '/brand/logo-primary-performance.png', '#4fc3f7', '#22c55e', 'DARK', CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
