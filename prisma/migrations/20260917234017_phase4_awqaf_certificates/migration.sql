-- CreateTable
CREATE TABLE "AppSettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "awqafPassThreshold" INTEGER NOT NULL DEFAULT 60,

    CONSTRAINT "AppSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AwqafBatch" (
    "id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AwqafBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AwqafResult" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "score" INTEGER,
    "certArrived" BOOLEAN NOT NULL DEFAULT false,
    "certArchived" BOOLEAN NOT NULL DEFAULT false,
    "certFileUrl" TEXT,
    "certDelivered" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AwqafResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AwqafResult_studentId_idx" ON "AwqafResult"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "AwqafResult_batchId_studentId_key" ON "AwqafResult"("batchId", "studentId");

-- AddForeignKey
ALTER TABLE "AwqafBatch" ADD CONSTRAINT "AwqafBatch_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AwqafResult" ADD CONSTRAINT "AwqafResult_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "AwqafBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AwqafResult" ADD CONSTRAINT "AwqafResult_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
