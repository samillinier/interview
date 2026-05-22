-- Track one-time reminder emails for incomplete AI interviews.
ALTER TABLE "Interview" ADD COLUMN "incompleteReminderSentAt" TIMESTAMP(3);

CREATE INDEX "Interview_status_startedAt_incompleteReminderSentAt_idx"
ON "Interview"("status", "startedAt", "incompleteReminderSentAt");
