-- Restore direct publication without changing blocks, closures or safety removals.
ALTER TABLE "food_needs" DROP CONSTRAINT "food_needs_moderationStatus_check";
ALTER TABLE "food_needs" DROP COLUMN "moderationStatus";
