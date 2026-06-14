-- Track which Membership a Booking consumed/should refund.
-- Additive and nullable: existing bookings keep membershipId = NULL and are
-- handled by the conservative fallback rule in the reservation routes.
-- Apply with: prisma migrate deploy

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN "membershipId" TEXT;

-- CreateIndex
CREATE INDEX "Booking_membershipId_idx" ON "Booking"("membershipId");

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "Membership"("id") ON DELETE SET NULL ON UPDATE CASCADE;
