-- CreateTable
CREATE TABLE "medicine_generics" (
    "id" TEXT NOT NULL,
    "genericId" INTEGER,
    "genericName" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "monographLink" TEXT,
    "indicationDescription" TEXT,
    "therapeuticClassDescription" TEXT,
    "pharmacologyDescription" TEXT,
    "dosageDescription" TEXT,
    "administrationDescription" TEXT,
    "interactionDescription" TEXT,
    "contraindicationsDescription" TEXT,
    "sideEffectsDescription" TEXT,
    "pregnancyAndLactationDescription" TEXT,
    "precautionsDescription" TEXT,
    "pediatricUsageDescription" TEXT,
    "overdoseEffectsDescription" TEXT,
    "durationOfTreatmentDescription" TEXT,
    "reconstitutionDescription" TEXT,
    "storageConditionsDescription" TEXT,
    "descriptionsCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "drugClassId" TEXT,
    "indicationId" TEXT,

    CONSTRAINT "medicine_generics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medicines" (
    "id" TEXT NOT NULL,
    "brandId" INTEGER,
    "brandName" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "dosageForm" TEXT,
    "strength" TEXT,
    "packageContainer" TEXT,
    "packSizeInfo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "genericId" TEXT,
    "manufacturerId" TEXT,

    CONSTRAINT "medicines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medicine_manufacturers" (
    "id" TEXT NOT NULL,
    "manufacturerId" INTEGER,
    "manufacturerName" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "genericsCount" INTEGER,
    "brandNamesCount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "medicine_manufacturers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medicine_drug_classes" (
    "id" TEXT NOT NULL,
    "drugClassId" INTEGER,
    "drugClassName" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "genericsCount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "medicine_drug_classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medicine_indications" (
    "id" TEXT NOT NULL,
    "indicationId" INTEGER,
    "indicationName" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "genericsCount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "medicine_indications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medicine_dosage_forms" (
    "id" TEXT NOT NULL,
    "dosageFormId" INTEGER,
    "dosageFormName" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "brandNamesCount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "medicine_dosage_forms_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "medicine_generics_genericId_key" ON "medicine_generics"("genericId");

-- CreateIndex
CREATE INDEX "medicine_generics_genericName_idx" ON "medicine_generics"("genericName");

-- CreateIndex
CREATE UNIQUE INDEX "medicines_brandId_key" ON "medicines"("brandId");

-- CreateIndex
CREATE INDEX "medicines_brandName_idx" ON "medicines"("brandName");

-- CreateIndex
CREATE INDEX "medicines_genericId_idx" ON "medicines"("genericId");

-- CreateIndex
CREATE INDEX "medicines_manufacturerId_idx" ON "medicines"("manufacturerId");

-- CreateIndex
CREATE UNIQUE INDEX "medicine_manufacturers_manufacturerId_key" ON "medicine_manufacturers"("manufacturerId");

-- CreateIndex
CREATE INDEX "medicine_manufacturers_manufacturerName_idx" ON "medicine_manufacturers"("manufacturerName");

-- CreateIndex
CREATE UNIQUE INDEX "medicine_drug_classes_drugClassId_key" ON "medicine_drug_classes"("drugClassId");

-- CreateIndex
CREATE INDEX "medicine_drug_classes_drugClassName_idx" ON "medicine_drug_classes"("drugClassName");

-- CreateIndex
CREATE UNIQUE INDEX "medicine_indications_indicationId_key" ON "medicine_indications"("indicationId");

-- CreateIndex
CREATE INDEX "medicine_indications_indicationName_idx" ON "medicine_indications"("indicationName");

-- CreateIndex
CREATE UNIQUE INDEX "medicine_dosage_forms_dosageFormId_key" ON "medicine_dosage_forms"("dosageFormId");

-- CreateIndex
CREATE INDEX "medicine_dosage_forms_dosageFormName_idx" ON "medicine_dosage_forms"("dosageFormName");

-- AddForeignKey
ALTER TABLE "medicine_generics" ADD CONSTRAINT "medicine_generics_drugClassId_fkey" FOREIGN KEY ("drugClassId") REFERENCES "medicine_drug_classes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medicine_generics" ADD CONSTRAINT "medicine_generics_indicationId_fkey" FOREIGN KEY ("indicationId") REFERENCES "medicine_indications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medicines" ADD CONSTRAINT "medicines_genericId_fkey" FOREIGN KEY ("genericId") REFERENCES "medicine_generics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medicines" ADD CONSTRAINT "medicines_manufacturerId_fkey" FOREIGN KEY ("manufacturerId") REFERENCES "medicine_manufacturers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
