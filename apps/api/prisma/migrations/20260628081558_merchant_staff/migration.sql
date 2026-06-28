-- AlterTable
ALTER TABLE "Store" ADD COLUMN     "openingHours" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "staffStoreId" TEXT;

-- CreateIndex
CREATE INDEX "User_staffStoreId_idx" ON "User"("staffStoreId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_staffStoreId_fkey" FOREIGN KEY ("staffStoreId") REFERENCES "Store"("id") ON DELETE SET NULL ON UPDATE CASCADE;
