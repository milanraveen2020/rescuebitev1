-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "reservationExpiresAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Order_status_reservationExpiresAt_idx" ON "Order"("status", "reservationExpiresAt");
