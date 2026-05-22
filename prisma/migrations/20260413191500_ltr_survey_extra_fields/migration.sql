-- Optional columns for richer survey detail (parsed from Excel when headers exist)
ALTER TABLE "LtrSurveyRecord" ADD COLUMN IF NOT EXISTS "storeName" TEXT;
ALTER TABLE "LtrSurveyRecord" ADD COLUMN IF NOT EXISTS "craftScore" INTEGER;
ALTER TABLE "LtrSurveyRecord" ADD COLUMN IF NOT EXISTS "professionalScore" INTEGER;
ALTER TABLE "LtrSurveyRecord" ADD COLUMN IF NOT EXISTS "homeImprovementScore" INTEGER;
ALTER TABLE "LtrSurveyRecord" ADD COLUMN IF NOT EXISTS "projectValueScore" INTEGER;
ALTER TABLE "LtrSurveyRecord" ADD COLUMN IF NOT EXISTS "installerKnowledgeScore" INTEGER;
ALTER TABLE "LtrSurveyRecord" ADD COLUMN IF NOT EXISTS "timeTaken" TEXT;
