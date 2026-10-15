ALTER TYPE "AuditAction" ADD VALUE 'SAFETY_REPORT_REVIEWED';
ALTER TABLE "food_needs" ADD COLUMN "isSafetyHidden" BOOLEAN NOT NULL DEFAULT false;
CREATE TABLE "safety_reports" (
 "id" TEXT NOT NULL, "reporterId" TEXT NOT NULL, "targetType" TEXT NOT NULL,
 "targetId" TEXT NOT NULL, "ngoId" TEXT NOT NULL, "reason" TEXT NOT NULL,
 "details" TEXT NOT NULL, "snapshot" JSONB NOT NULL, "status" TEXT NOT NULL DEFAULT 'OPEN',
 "resolution" TEXT, "reviewedById" TEXT, "reviewedAt" TIMESTAMP(3),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "safety_reports_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "safety_reports_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT "safety_reports_targetType_check" CHECK ("targetType" IN ('NGO','UPDATE','FOOD_NEED')),
 CONSTRAINT "safety_reports_status_check" CHECK ("status" IN ('OPEN','RESOLVED','DISMISSED'))
);
CREATE UNIQUE INDEX "safety_reports_reporterId_targetType_targetId_key" ON "safety_reports"("reporterId","targetType","targetId");
CREATE INDEX "safety_reports_status_createdAt_idx" ON "safety_reports"("status","createdAt");
CREATE TABLE "blocked_organisations" (
 "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "ngoId" TEXT NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "blocked_organisations_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "blocked_organisations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT "blocked_organisations_ngoId_fkey" FOREIGN KEY ("ngoId") REFERENCES "ngos"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "blocked_organisations_userId_ngoId_key" ON "blocked_organisations"("userId","ngoId");
CREATE INDEX "blocked_organisations_ngoId_idx" ON "blocked_organisations"("ngoId");

ALTER TABLE "updates" ADD COLUMN "moderationStatus" TEXT NOT NULL DEFAULT 'PENDING';
ALTER TABLE "food_needs" ADD COLUMN "moderationStatus" TEXT NOT NULL DEFAULT 'PENDING';
ALTER TABLE "updates" ADD CONSTRAINT "updates_moderationStatus_check" CHECK ("moderationStatus" IN ('PENDING','APPROVED','REJECTED'));
ALTER TABLE "food_needs" ADD CONSTRAINT "food_needs_moderationStatus_check" CHECK ("moderationStatus" IN ('PENDING','APPROVED','REJECTED'));
