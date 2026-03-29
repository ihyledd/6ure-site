-- CreateTable
CREATE TABLE "ManualUpdate" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ManualUpdate_pkey" PRIMARY KEY ("id")
);
