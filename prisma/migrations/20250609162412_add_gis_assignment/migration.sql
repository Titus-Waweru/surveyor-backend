-- CreateTable
CREATE TABLE "GisAssignment" (
    "id" SERIAL NOT NULL,
    "location" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" INTEGER NOT NULL,
    "assignedGisExpertId" INTEGER,

    CONSTRAINT "GisAssignment_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "GisAssignment" ADD CONSTRAINT "GisAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GisAssignment" ADD CONSTRAINT "GisAssignment_assignedGisExpertId_fkey" FOREIGN KEY ("assignedGisExpertId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
