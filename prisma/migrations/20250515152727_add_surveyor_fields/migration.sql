-- AlterTable
ALTER TABLE "User" ADD COLUMN     "certUrl" TEXT,
ADD COLUMN     "idCardUrl" TEXT,
ADD COLUMN     "iskNumber" TEXT,
ADD COLUMN     "otp" TEXT,
ADD COLUMN     "paid" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'pending';
