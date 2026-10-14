ALTER TABLE "donations" DROP CONSTRAINT "donations_donorId_fkey";
ALTER TABLE "donations" ALTER COLUMN "donorId" DROP NOT NULL;
ALTER TABLE "donations" ADD CONSTRAINT "donations_donorId_fkey"
FOREIGN KEY ("donorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "account_deletions" (
  "id" TEXT NOT NULL,
  "firebaseUid" TEXT,
  "email" TEXT NOT NULL,
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "lastAttemptAt" TIMESTAMP(3),
  CONSTRAINT "account_deletions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "account_deletions_firebaseUid_key" ON "account_deletions"("firebaseUid");
CREATE INDEX "account_deletions_requestedAt_idx" ON "account_deletions"("requestedAt");
