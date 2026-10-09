-- Track that the Leggett/vendor pad-order email was sent so approval never double-sends.
ALTER TABLE "CarpetPadOrder" ADD COLUMN IF NOT EXISTS "vendorOrderEmailSentAt" TIMESTAMP(3);
