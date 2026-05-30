-- Incremental migration: Health Module v1
-- Adds KINESIOLOGIST role and clinical layer on top of existing schema.
-- Safe to run on UAT or PROD that already has the base schema applied.
-- Apply with: psql $DATABASE_URL -f this_file.sql
-- OR via Prisma: prisma migrate deploy (after marking baseline)

-- ─── New enum values ──────────────────────────────────────────────────────────

ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'KINESIOLOGIST';

DO $$ BEGIN
  CREATE TYPE "HealthSessionStatus" AS ENUM ('OPEN', 'CLOSED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "RestrictionSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── HealthRecord ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "HealthRecord" (
    "id"               TEXT        NOT NULL,
    "patientId"        TEXT        NOT NULL,
    "createdById"      TEXT        NOT NULL,
    "birthDate"        TIMESTAMP(3),
    "biologicalSex"    TEXT,
    "occupation"       TEXT,
    "reasonForConsult" TEXT,
    "medicalBackground" TEXT,
    "surgeries"        TEXT,
    "currentMedication" TEXT,
    "allergies"        TEXT,
    "painLevel"        INTEGER,
    "initialAssessment" TEXT,
    "diagnosis"        TEXT,
    "treatmentGoals"   TEXT,
    "internalNotes"    TEXT,
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HealthRecord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "HealthRecord_patientId_key" ON "HealthRecord"("patientId");
CREATE INDEX IF NOT EXISTS "HealthRecord_patientId_idx"   ON "HealthRecord"("patientId");
CREATE INDEX IF NOT EXISTS "HealthRecord_createdById_idx" ON "HealthRecord"("createdById");

ALTER TABLE "HealthRecord"
  ADD CONSTRAINT "HealthRecord_patientId_fkey"
  FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "HealthRecord"
  ADD CONSTRAINT "HealthRecord_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ─── HealthSession ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "HealthSession" (
    "id"              TEXT                 NOT NULL,
    "healthRecordId"  TEXT                 NOT NULL,
    "sessionId"       TEXT,
    "kinesiologistId" TEXT                 NOT NULL,
    "patientId"       TEXT                 NOT NULL,
    "sessionDate"     TIMESTAMP(3)         NOT NULL,
    "subjective"      TEXT,
    "objective"       TEXT,
    "assessment"      TEXT,
    "plan"            TEXT,
    "exercises"       TEXT,
    "observations"    TEXT,
    "privateNotes"    TEXT,
    "patientNotes"    TEXT,
    "status"          "HealthSessionStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt"       TIMESTAMP(3)         NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3)         NOT NULL,
    CONSTRAINT "HealthSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "HealthSession_sessionId_key"       ON "HealthSession"("sessionId");
CREATE INDEX        IF NOT EXISTS "HealthSession_healthRecordId_idx"  ON "HealthSession"("healthRecordId");
CREATE INDEX        IF NOT EXISTS "HealthSession_kinesiologistId_idx" ON "HealthSession"("kinesiologistId");
CREATE INDEX        IF NOT EXISTS "HealthSession_patientId_idx"       ON "HealthSession"("patientId");
CREATE INDEX        IF NOT EXISTS "HealthSession_sessionDate_idx"     ON "HealthSession"("sessionDate");

ALTER TABLE "HealthSession"
  ADD CONSTRAINT "HealthSession_healthRecordId_fkey"
  FOREIGN KEY ("healthRecordId") REFERENCES "HealthRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "HealthSession"
  ADD CONSTRAINT "HealthSession_sessionId_fkey"
  FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "HealthSession"
  ADD CONSTRAINT "HealthSession_kinesiologistId_fkey"
  FOREIGN KEY ("kinesiologistId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "HealthSession"
  ADD CONSTRAINT "HealthSession_patientId_fkey"
  FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ─── HealthRestriction ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "HealthRestriction" (
    "id"             TEXT                 NOT NULL,
    "healthRecordId" TEXT                 NOT NULL,
    "patientId"      TEXT                 NOT NULL,
    "createdById"    TEXT                 NOT NULL,
    "label"          TEXT                 NOT NULL,
    "severity"       "RestrictionSeverity" NOT NULL DEFAULT 'INFO',
    "isActive"       BOOLEAN              NOT NULL DEFAULT true,
    "startDate"      TIMESTAMP(3)         NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate"        TIMESTAMP(3),
    "createdAt"      TIMESTAMP(3)         NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3)         NOT NULL,
    CONSTRAINT "HealthRestriction_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "HealthRestriction_healthRecordId_idx" ON "HealthRestriction"("healthRecordId");
CREATE INDEX IF NOT EXISTS "HealthRestriction_patientId_idx"      ON "HealthRestriction"("patientId");
CREATE INDEX IF NOT EXISTS "HealthRestriction_isActive_idx"       ON "HealthRestriction"("isActive");

ALTER TABLE "HealthRestriction"
  ADD CONSTRAINT "HealthRestriction_healthRecordId_fkey"
  FOREIGN KEY ("healthRecordId") REFERENCES "HealthRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "HealthRestriction"
  ADD CONSTRAINT "HealthRestriction_patientId_fkey"
  FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "HealthRestriction"
  ADD CONSTRAINT "HealthRestriction_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
