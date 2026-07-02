-- One-time email to qualified installers when they pass interview.
ALTER TABLE "Installer" ADD COLUMN "passedInterviewEmailSentAt" TIMESTAMP(3);

CREATE INDEX "Installer_passedInterviewEmailSentAt_idx" ON "Installer"("passedInterviewEmailSentAt");
