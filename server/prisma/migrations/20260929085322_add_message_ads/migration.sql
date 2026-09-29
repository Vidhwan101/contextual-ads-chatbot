/*
  Warnings:

  - You are about to drop the column `clicks` on the `Ad` table. All the data in the column will be lost.
  - You are about to drop the column `impressions` on the `Ad` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Ad" DROP COLUMN "clicks",
DROP COLUMN "impressions";

-- CreateTable
CREATE TABLE "MessageAd" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "adId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "qSim" DOUBLE PRECISION NOT NULL,
    "aSim" DOUBLE PRECISION NOT NULL,
    "clicked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageAd_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MessageAd_adId_idx" ON "MessageAd"("adId");

-- CreateIndex
CREATE UNIQUE INDEX "MessageAd_messageId_adId_key" ON "MessageAd"("messageId", "adId");

-- AddForeignKey
ALTER TABLE "MessageAd" ADD CONSTRAINT "MessageAd_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageAd" ADD CONSTRAINT "MessageAd_adId_fkey" FOREIGN KEY ("adId") REFERENCES "Ad"("id") ON DELETE CASCADE ON UPDATE CASCADE;
