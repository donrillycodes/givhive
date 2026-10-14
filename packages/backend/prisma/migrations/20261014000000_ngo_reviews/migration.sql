ALTER TABLE "ngos" ADD COLUMN "registrationNumber" TEXT,
ADD COLUMN "foodDonationDetails" TEXT;

CREATE TABLE "ngo_reviews" (
  "id" TEXT NOT NULL,
  "ngoId" TEXT NOT NULL,
  "reviewerId" TEXT NOT NULL,
  "organisationChecked" BOOLEAN NOT NULL,
  "representativeConfirmed" BOOLEAN NOT NULL,
  "foodOperationsConfirmed" BOOLEAN NOT NULL,
  "evidenceSources" TEXT NOT NULL,
  "contactMethod" TEXT NOT NULL,
  "contactedAt" TIMESTAMP(3) NOT NULL,
  "notes" TEXT NOT NULL,
  "applicationSnapshot" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ngo_reviews_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ngo_reviews_ngoId_createdAt_idx" ON "ngo_reviews"("ngoId", "createdAt");
ALTER TABLE "ngo_reviews" ADD CONSTRAINT "ngo_reviews_ngoId_fkey"
FOREIGN KEY ("ngoId") REFERENCES "ngos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ngo_reviews" ADD CONSTRAINT "ngo_reviews_reviewerId_fkey"
FOREIGN KEY ("reviewerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
