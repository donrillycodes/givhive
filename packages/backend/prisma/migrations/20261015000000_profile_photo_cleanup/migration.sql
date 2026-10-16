-- Keep remote photo cleanup durable after a user's database row is deleted.
ALTER TABLE "account_deletions" ADD COLUMN "avatarPublicId" TEXT;
