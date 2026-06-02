-- CreateEnum
CREATE TYPE "InvitationType" AS ENUM ('ADMIN', 'NGO_MEMBER');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'REVOKED');

-- CreateTable
CREATE TABLE "invitations" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "type" "InvitationType" NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "department" "AdminDepartment",
    "ngoId" TEXT,
    "memberRole" "NGOMemberRole",
    "permissions" JSONB NOT NULL,
    "invitedById" TEXT NOT NULL,
    "acceptedByUserId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invitations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "invitations_token_key" ON "invitations"("token");

-- CreateIndex
CREATE INDEX "invitations_email_idx" ON "invitations"("email");

-- CreateIndex
CREATE INDEX "invitations_token_idx" ON "invitations"("token");

-- CreateIndex
CREATE INDEX "invitations_status_idx" ON "invitations"("status");

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_ngoId_fkey" FOREIGN KEY ("ngoId") REFERENCES "ngos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_acceptedByUserId_fkey" FOREIGN KEY ("acceptedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
