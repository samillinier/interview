-- LTR weekly Excel survey imports
CREATE TABLE "LtrUploadBatch" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fileName" TEXT,
    "uploadedByEmail" TEXT,
    "rowCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "LtrUploadBatch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LtrSurveyRecord" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "batchId" TEXT NOT NULL,
    "region" TEXT,
    "laborCategory" TEXT,
    "surveyComment" TEXT,
    "surveyDate" TIMESTAMP(3),
    "poNumber" TEXT,
    "woNumber" TEXT,
    "ltrScore" INTEGER,
    "company" TEXT,
    "installer" TEXT,
    "customer" TEXT,
    "workroom" TEXT,

    CONSTRAINT "LtrSurveyRecord_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LtrSurveyRecord_batchId_idx" ON "LtrSurveyRecord"("batchId");
CREATE INDEX "LtrSurveyRecord_workroom_company_installer_idx" ON "LtrSurveyRecord"("workroom", "company", "installer");

ALTER TABLE "LtrSurveyRecord" ADD CONSTRAINT "LtrSurveyRecord_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "LtrUploadBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
