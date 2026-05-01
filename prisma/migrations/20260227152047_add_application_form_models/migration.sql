-- CreateEnum
CREATE TYPE "ApplicationLimitType" AS ENUM ('NONE', 'PER_FORM', 'GLOBAL');

-- CreateEnum
CREATE TYPE "ApplicationFieldType" AS ENUM ('SHORT_TEXT', 'PARAGRAPH', 'NUMBER', 'EMAIL', 'PHONE', 'URL', 'DATE', 'TIME', 'MULTIPLE_CHOICE', 'CHECKBOXES', 'DROPDOWN', 'LINEAR_SCALE', 'RATING', 'YES_NO', 'FILE_UPLOAD', 'TIMEZONE', 'SECTION_HEADER');

-- CreateTable
CREATE TABLE "ApplicationForm" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "confirmationMessage" TEXT DEFAULT 'Thank you for your application. We will review it and get back to you soon.',
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "minAge" INTEGER,
    "limitType" "ApplicationLimitType" NOT NULL DEFAULT 'PER_FORM',
    "limitWindowDays" INTEGER NOT NULL DEFAULT 30,
    "limitPerForm" INTEGER NOT NULL DEFAULT 1,
    "maxResponses" INTEGER,
    "theme" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApplicationForm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationFormSection" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "title" TEXT,
    "description" TEXT,
    "conditionalLogic" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApplicationFormSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationFormField" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "sectionId" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "type" "ApplicationFieldType" NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "placeholder" TEXT,
    "options" JSONB,
    "validation" JSONB,
    "autoFill" TEXT,
    "shuffleOptions" BOOLEAN NOT NULL DEFAULT false,
    "conditionalLogic" JSONB,
    "fileConfig" JSONB,
    "scaleConfig" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApplicationFormField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationSubmission" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "username" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "answers" JSONB NOT NULL,
    "fileUrls" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "ApplicationSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationLimitReset" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "resetAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApplicationLimitReset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ApplicationFormSection_formId_idx" ON "ApplicationFormSection"("formId");

-- CreateIndex
CREATE INDEX "ApplicationFormField_formId_idx" ON "ApplicationFormField"("formId");

-- CreateIndex
CREATE INDEX "ApplicationFormField_sectionId_idx" ON "ApplicationFormField"("sectionId");

-- CreateIndex
CREATE INDEX "ApplicationSubmission_formId_idx" ON "ApplicationSubmission"("formId");

-- CreateIndex
CREATE INDEX "ApplicationSubmission_userId_idx" ON "ApplicationSubmission"("userId");

-- CreateIndex
CREATE INDEX "ApplicationSubmission_status_idx" ON "ApplicationSubmission"("status");

-- CreateIndex
CREATE INDEX "ApplicationLimitReset_formId_idx" ON "ApplicationLimitReset"("formId");

-- CreateIndex
CREATE UNIQUE INDEX "ApplicationLimitReset_userId_formId_key" ON "ApplicationLimitReset"("userId", "formId");

-- AddForeignKey
ALTER TABLE "ApplicationFormSection" ADD CONSTRAINT "ApplicationFormSection_formId_fkey" FOREIGN KEY ("formId") REFERENCES "ApplicationForm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationFormField" ADD CONSTRAINT "ApplicationFormField_formId_fkey" FOREIGN KEY ("formId") REFERENCES "ApplicationForm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationFormField" ADD CONSTRAINT "ApplicationFormField_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "ApplicationFormSection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationSubmission" ADD CONSTRAINT "ApplicationSubmission_formId_fkey" FOREIGN KEY ("formId") REFERENCES "ApplicationForm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
