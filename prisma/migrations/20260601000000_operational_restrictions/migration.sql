-- Operational restrictions: make healthRecordId optional and add sourceRole.
-- Allows coaches to create operational notes/considerations without requiring a HealthRecord.
-- Apply with: psql $DATABASE_URL -f this_file.sql
-- OR via Prisma: prisma migrate deploy

-- Make healthRecordId nullable (coach-created notes have no clinical record)
ALTER TABLE "HealthRestriction" ALTER COLUMN "healthRecordId" DROP NOT NULL;

-- Add sourceRole to identify which staff role created the entry
ALTER TABLE "HealthRestriction" ADD COLUMN IF NOT EXISTS "sourceRole" "Role";
