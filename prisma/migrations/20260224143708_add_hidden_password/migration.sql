-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "hidden" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Page" ADD COLUMN     "hidden" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "password" TEXT;
