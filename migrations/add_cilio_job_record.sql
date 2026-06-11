-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('ADMIN', 'MODERATOR', 'MANAGER', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "InstallerTrackerStage" AS ENUM ('PENDING', 'QUALIFIED', 'WAITING_FOR_APPROVAL', 'VERIFICATION_IN_PROGRESS', 'BACKGROUND', 'ACTIVE_APPROVED');

-- CreateEnum
CREATE TYPE "ComplianceStatus" AS ENUM ('COMPLIANT', 'NOT_COMPLIANT', 'IN_PROGRESS');

-- CreateEnum
CREATE TYPE "LocationDocumentCategory" AS ENUM ('lease', 'misc');

-- CreateEnum
CREATE TYPE "VehicleDocumentCategory" AS ENUM ('vehicle', 'misc');

-- CreateTable
CREATE TABLE "Admin" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "role" "AdminRole" NOT NULL DEFAULT 'ADMIN',
    "createdBy" TEXT,
    "photoUrl" TEXT,
    "reportColumnVisibility" TEXT,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminAuditLog" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "adminEmail" TEXT NOT NULL,
    "adminId" TEXT,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "targetLabel" TEXT,
    "before" JSONB,
    "after" JSONB,

    CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DashboardUpdate" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updateNumber" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "photoUrl" TEXT,
    "createdByEmail" TEXT,
    "createdByName" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "showNavBadge" BOOLEAN NOT NULL DEFAULT false,
    "navBadgeCount" INTEGER,

    CONSTRAINT "DashboardUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Communication" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "installerId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "subject" TEXT,
    "content" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'sent',
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Communication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "installerId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "verificationLink" TEXT,
    "verificationLinkStatus" TEXT,
    "adminRejectionNote" TEXT,
    "adminCorrectionUrl" TEXT,
    "adminCorrectionName" TEXT,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Installer" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "yearsOfExperience" INTEGER,
    "flooringSpecialties" TEXT,
    "previousEmployers" TEXT,
    "hasOwnCrew" BOOLEAN NOT NULL DEFAULT false,
    "crewSize" INTEGER,
    "hasOwnTools" BOOLEAN NOT NULL DEFAULT false,
    "hasVehicle" BOOLEAN NOT NULL DEFAULT false,
    "toolsDescription" TEXT,
    "serviceAreas" TEXT,
    "willingToTravel" BOOLEAN NOT NULL DEFAULT false,
    "maxTravelDistance" INTEGER,
    "availability" TEXT,
    "canStartImmediately" BOOLEAN NOT NULL DEFAULT false,
    "preferredStartDate" TIMESTAMP(3),
    "hasInsurance" BOOLEAN NOT NULL DEFAULT false,
    "insuranceType" TEXT,
    "complianceStatus" "ComplianceStatus",
    "hasLicense" BOOLEAN NOT NULL DEFAULT false,
    "licenseNumber" TEXT,
    "licenseExpiry" TIMESTAMP(3),
    "hasGeneralLiability" BOOLEAN NOT NULL DEFAULT false,
    "hasCommercialAutoLiability" BOOLEAN NOT NULL DEFAULT false,
    "hasWorkersComp" BOOLEAN NOT NULL DEFAULT false,
    "hasWorkersCompExemption" BOOLEAN NOT NULL DEFAULT false,
    "isSunbizRegistered" BOOLEAN NOT NULL DEFAULT false,
    "isSunbizActive" BOOLEAN NOT NULL DEFAULT false,
    "hasBusinessLicense" BOOLEAN NOT NULL DEFAULT false,
    "canPassBackgroundCheck" BOOLEAN,
    "backgroundCheckDetails" TEXT,
    "vehicleDescription" TEXT,
    "flooringSkills" TEXT,
    "primaryFlooringSurface" TEXT,
    "mondayToFridayAvailability" TEXT,
    "saturdayAvailability" TEXT,
    "openToTravel" BOOLEAN NOT NULL DEFAULT false,
    "travelLocations" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "trackerStage" "InstallerTrackerStage" NOT NULL DEFAULT 'PENDING',
    "passFailReason" TEXT,
    "overallScore" INTEGER,
    "notes" TEXT,
    "followUpDate" TIMESTAMP(3),
    "followUpReason" TEXT,
    "companyCity" TEXT,
    "companyName" TEXT,
    "companyState" TEXT,
    "companyStreetAddress" TEXT,
    "companyTitle" TEXT,
    "companyZipCode" TEXT,
    "dailyCeramicTileSqft" INTEGER,
    "dailyLaminateSqft" INTEGER,
    "dailyLuxuryVinylPlankSqft" INTEGER,
    "dailyNailDownSolidHardwoodSqft" INTEGER,
    "dailyPorcelainTileSqft" INTEGER,
    "dailyStoneTileSqft" INTEGER,
    "dailyStretchInCarpetSqft" INTEGER,
    "dailyTileBacksplashSqft" INTEGER,
    "dailyVinylCompositionTileSqft" INTEGER,
    "emailVerificationToken" TEXT,
    "emailVerifiedAt" TIMESTAMP(3),
    "passedInterviewEmailSentAt" TIMESTAMP(3),
    "installsCeramicTile" BOOLEAN,
    "installsGlueDownCarpet" BOOLEAN,
    "installsLaminateOnStairs" BOOLEAN,
    "installsLuxuryVinylPlank" BOOLEAN,
    "installsLuxuryVinylTile" BOOLEAN,
    "installsNailDownSolidHardwood" BOOLEAN,
    "installsPorcelainTile" BOOLEAN,
    "installsSheetVinyl" BOOLEAN,
    "installsStapleDownEngineeredHardwood" BOOLEAN,
    "installsStoneTile" BOOLEAN,
    "installsStretchInCarpet" BOOLEAN,
    "installsTileBacksplash" BOOLEAN,
    "installsTrim" BOOLEAN,
    "installsVinylCompositionTile" BOOLEAN,
    "movesFurniture" BOOLEAN,
    "ndaAgreedAt" TIMESTAMP(3),
    "offersTileRemoval" BOOLEAN,
    "passwordHash" TEXT,
    "passwordResetToken" TEXT,
    "paymentAccountName" TEXT,
    "paymentAccountNumber" TEXT,
    "paymentAccountType" TEXT,
    "paymentAuthorizationDate" TIMESTAMP(3),
    "paymentAuthorizationName" TEXT,
    "paymentAuthorizationSignature" TEXT,
    "paymentBankName" TEXT,
    "paymentBusinessAddress" TEXT,
    "paymentCompanyName" TEXT,
    "paymentContactPerson" TEXT,
    "paymentEmailAddress" TEXT,
    "paymentPhoneNumber" TEXT,
    "paymentRoutingNumber" TEXT,
    "photoUrl" TEXT,
    "serviceAgreementDate" TIMESTAMP(3),
    "serviceAgreementName" TEXT,
    "serviceAgreementSignature" TEXT,
    "serviceAgreementSignedAt" TIMESTAMP(3),
    "username" TEXT,
    "wantsToAddCarpet" BOOLEAN,
    "wantsToAddHardwood" BOOLEAN,
    "wantsToAddLaminate" BOOLEAN,
    "wantsToAddTile" BOOLEAN,
    "wantsToAddVinyl" BOOLEAN,
    "companyAddress" TEXT,
    "companyCounty" TEXT,
    "employerLiabilityPolicyNumber" TEXT,
    "feiEin" TEXT,
    "automobileLiabilityExpiry" TIMESTAMP(3),
    "btrExpiry" TIMESTAMP(3),
    "employersLiabilityExpiry" TIMESTAMP(3),
    "generalLiabilityExpiry" TIMESTAMP(3),
    "llrpExpiry" TIMESTAMP(3),
    "llrpExpiryDates" TEXT,
    "workersCompExemExpiry" TIMESTAMP(3),
    "automobileLiabilityExpiryDates" TEXT,
    "workersCompExemExpiryDates" TEXT,
    "dateNullFields" TEXT,
    "cilioEnterpriseGroupNumber" INTEGER,
    "digitalId" TEXT,
    "workroom" TEXT,
    "referralCode" TEXT,
    "referredByInstallerId" TEXT,
    "remarks" TEXT,
    "managerRemarks" TEXT,

    CONSTRAINT "Installer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstallerAgreement" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "installerId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "payload" JSONB NOT NULL,
    "signedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "adminSignature" TEXT,
    "adminSignedDate" TEXT,

    CONSTRAINT "InstallerAgreement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Claim" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "customer" TEXT,
    "jobNumber" TEXT,
    "workroom" TEXT,
    "installationDate" TIMESTAMP(3),
    "installerId" TEXT,
    "installerName" TEXT,
    "installerCompanyName" TEXT,
    "category" TEXT,
    "claimNumber" TEXT,
    "lowesClaimNumber" TEXT,
    "insuranceCompany" TEXT,
    "adjusterName" TEXT,
    "adjusterPhone" TEXT,
    "adjusterEmail" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "dateOfLoss" TIMESTAMP(3),
    "damage" TEXT,
    "amount" DECIMAL(12,2),
    "dropdown" TEXT,
    "updateNotes" TEXT,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "Claim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClaimDocument" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "claimId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,

    CONSTRAINT "ClaimDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Licence" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "category" TEXT,
    "country" TEXT,
    "county" TEXT,
    "city" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "areas" TEXT,
    "licenceType" TEXT,
    "licenceNumber" TEXT,
    "licenceExpirationDate" TIMESTAMP(3),
    "lastPaymentDate" TIMESTAMP(3),
    "cost" DECIMAL(12,2),
    "bondRequired" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "competenceCardsNotes" TEXT,
    "businessTaxOccLicenceNumber" TEXT,
    "taxOccExpirationDate" TIMESTAMP(3),
    "taxOccCost" DECIMAL(12,2),
    "businessTaxReceiptNotes" TEXT,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "Licence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LicenceDocument" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "licenceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,

    CONSTRAINT "LicenceDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstallerHistory" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "installerId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "phone" TEXT,
    "yearsOfExperience" INTEGER,
    "flooringSpecialties" TEXT,
    "flooringSkills" TEXT,
    "previousEmployers" TEXT,
    "hasOwnCrew" BOOLEAN,
    "crewSize" INTEGER,
    "hasOwnTools" BOOLEAN,
    "hasVehicle" BOOLEAN,
    "toolsDescription" TEXT,
    "vehicleDescription" TEXT,
    "serviceAreas" TEXT,
    "willingToTravel" BOOLEAN,
    "maxTravelDistance" INTEGER,
    "availability" TEXT,
    "canStartImmediately" BOOLEAN,
    "preferredStartDate" TIMESTAMP(3),
    "mondayToFridayAvailability" TEXT,
    "saturdayAvailability" TEXT,
    "hasInsurance" BOOLEAN,
    "insuranceType" TEXT,
    "hasLicense" BOOLEAN,
    "licenseNumber" TEXT,
    "licenseExpiry" TIMESTAMP(3),
    "hasGeneralLiability" BOOLEAN,
    "hasCommercialAutoLiability" BOOLEAN,
    "hasWorkersComp" BOOLEAN,
    "hasWorkersCompExemption" BOOLEAN,
    "isSunbizRegistered" BOOLEAN,
    "isSunbizActive" BOOLEAN,
    "hasBusinessLicense" BOOLEAN,
    "canPassBackgroundCheck" BOOLEAN,
    "backgroundCheckDetails" TEXT,
    "companyName" TEXT,
    "companyTitle" TEXT,
    "companyStreetAddress" TEXT,
    "companyCity" TEXT,
    "companyState" TEXT,
    "companyZipCode" TEXT,
    "companyCounty" TEXT,
    "companyAddress" TEXT,
    "wantsToAddCarpet" BOOLEAN,
    "installsStretchInCarpet" BOOLEAN,
    "dailyStretchInCarpetSqft" INTEGER,
    "installsGlueDownCarpet" BOOLEAN,
    "wantsToAddHardwood" BOOLEAN,
    "installsNailDownSolidHardwood" BOOLEAN,
    "dailyNailDownSolidHardwoodSqft" INTEGER,
    "installsStapleDownEngineeredHardwood" BOOLEAN,
    "wantsToAddLaminate" BOOLEAN,
    "dailyLaminateSqft" INTEGER,
    "installsLaminateOnStairs" BOOLEAN,
    "wantsToAddVinyl" BOOLEAN,
    "installsSheetVinyl" BOOLEAN,
    "installsLuxuryVinylPlank" BOOLEAN,
    "dailyLuxuryVinylPlankSqft" INTEGER,
    "installsLuxuryVinylTile" BOOLEAN,
    "installsVinylCompositionTile" BOOLEAN,
    "dailyVinylCompositionTileSqft" INTEGER,
    "wantsToAddTile" BOOLEAN,
    "installsCeramicTile" BOOLEAN,
    "dailyCeramicTileSqft" INTEGER,
    "installsPorcelainTile" BOOLEAN,
    "dailyPorcelainTileSqft" INTEGER,
    "installsStoneTile" BOOLEAN,
    "dailyStoneTileSqft" INTEGER,
    "offersTileRemoval" BOOLEAN,
    "installsTileBacksplash" BOOLEAN,
    "dailyTileBacksplashSqft" INTEGER,
    "movesFurniture" BOOLEAN,
    "installsTrim" BOOLEAN,
    "notes" TEXT,
    "automobileLiabilityExpiryDates" TEXT,
    "workersCompExemExpiryDates" TEXT,
    "digitalId" TEXT,
    "workroom" TEXT,

    CONSTRAINT "InstallerHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Interview" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "installerId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'in_progress',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "incompleteReminderSentAt" TIMESTAMP(3),
    "transcript" TEXT,
    "extractedData" TEXT,
    "aiAnalysis" TEXT,

    CONSTRAINT "Interview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewResponse" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "interviewId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "questionText" TEXT NOT NULL,
    "answerText" TEXT,
    "answerAudio" TEXT,
    "extractedValue" TEXT,
    "confidence" DOUBLE PRECISION,

    CONSTRAINT "InterviewResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "jobType" TEXT NOT NULL,
    "requirements" TEXT,
    "skills" TEXT,
    "payRange" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'active',
    "targetStatus" TEXT,
    "benefits" TEXT,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobApplication" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "jobId" TEXT NOT NULL,
    "installerId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "notes" TEXT,

    CONSTRAINT "JobApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "installerId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "link" TEXT,
    "senderId" TEXT,
    "senderType" TEXT,
    "attachmentName" TEXT,
    "attachmentUrl" TEXT,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstallerChangeRequest" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "installerId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "source" TEXT,
    "sections" JSONB,
    "payload" JSONB NOT NULL,
    "submittedBy" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,

    CONSTRAINT "InstallerChangeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstallerTracking" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "installerId" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "category" TEXT,
    "metadata" JSONB,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "notes" TEXT,
    "matrixSortOrder" INTEGER NOT NULL DEFAULT 0,
    "matrixCellOverrides" JSONB,
    "reportColumnVisibility" TEXT,

    CONSTRAINT "InstallerTracking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScreeningCriteria" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "rules" TEXT NOT NULL,
    "weights" TEXT,

    CONSTRAINT "ScreeningCriteria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffMember" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "installerId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "photoUrl" TEXT,
    "title" TEXT,
    "notes" TEXT,
    "digitalId" TEXT,
    "expirationDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'active',

    CONSTRAINT "StaffMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Property" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "username" TEXT,
    "passwordHash" TEXT,
    "passwordResetToken" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "photoUrl" TEXT,
    "companyName" TEXT,
    "companyAddress" TEXT,
    "notes" TEXT,

    CONSTRAINT "Property_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertySafetyWalk" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "propertyId" TEXT NOT NULL,
    "inspectorName" TEXT NOT NULL,
    "inspectionDate" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT NOT NULL,
    "completionTime" TEXT NOT NULL,
    "workroom" TEXT NOT NULL,
    "comments" TEXT,
    "actionPlan" TEXT,
    "payload" JSONB NOT NULL,
    "analytics" JSONB,

    CONSTRAINT "PropertySafetyWalk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "propertyId" TEXT NOT NULL,
    "location" TEXT,
    "aliasLocation" TEXT,
    "propertyAddress" TEXT,
    "leaseStart" TIMESTAMP(3),
    "leaseRenewal" TIMESTAMP(3),
    "landlord" TEXT,
    "landlordPhone" TEXT,
    "propertyMgr" TEXT,
    "rentAmount" DOUBLE PRECISION,
    "depositAmt" DOUBLE PRECISION,
    "depositPayback" DOUBLE PRECISION,
    "depositPaybackDate" TIMESTAMP(3),
    "status" TEXT DEFAULT 'active',
    "insuranceRequirements" TEXT,
    "subBroker" TEXT,
    "sublessee" TEXT,
    "subRent" DOUBLE PRECISION,
    "subDeposit" DOUBLE PRECISION,
    "subContacts" TEXT,
    "subPhone" TEXT,
    "sqFeet" DOUBLE PRECISION,
    "photoUrl" TEXT,
    "wifiName" TEXT,
    "wifiPassword" TEXT,
    "waterProvider" TEXT,
    "internetProvider" TEXT,
    "powerProvider" TEXT,
    "garbageProvider" TEXT,
    "propaneProvider" TEXT,
    "securityLock" TEXT,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LocationDocument" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "locationId" TEXT NOT NULL,
    "category" "LocationDocumentCategory" NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,

    CONSTRAINT "LocationDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "propertyId" TEXT NOT NULL,
    "category" TEXT,
    "vehicleYear" INTEGER,
    "vehicleMake" TEXT,
    "vehicleModel" TEXT,
    "assignedDriver" TEXT,
    "vin" TEXT,
    "location" TEXT,
    "locationAddress" TEXT,
    "plate" TEXT,
    "tagRenewal" TIMESTAMP(3),
    "transponderNumber" TEXT,
    "mileageAsOfAugust2025" DOUBLE PRECISION,
    "photoUrl" TEXT,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleDocument" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "category" "VehicleDocumentCategory" NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,

    CONSTRAINT "VehicleDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inventory" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "propertyId" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "sku" TEXT,
    "category" TEXT,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unitOfMeasure" TEXT DEFAULT 'unit',
    "cost" DOUBLE PRECISION,
    "usagePlacement" TEXT DEFAULT 'in_use',
    "supplier" TEXT,
    "supplierContact" TEXT,
    "location" TEXT,
    "warehouse" TEXT,
    "reorderLevel" DOUBLE PRECISION,
    "minimumStock" DOUBLE PRECISION,
    "maximumStock" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'active',
    "brand" TEXT,
    "manufacturer" TEXT,
    "barcode" TEXT,
    "serialNumber" TEXT,
    "purchaseDate" TIMESTAMP(3),
    "lastRestocked" TIMESTAMP(3),
    "warrantyDate" TIMESTAMP(3),
    "expirationDate" TIMESTAMP(3),
    "condition" TEXT,
    "maintenanceNotes" TEXT,
    "notes" TEXT,
    "photoUrl" TEXT,
    "responsiblePerson" TEXT,

    CONSTRAINT "Inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LtrUploadBatch" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "fileName" TEXT,
    "uploadedByEmail" TEXT,
    "rowCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "LtrUploadBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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
    "storeName" TEXT,
    "craftScore" INTEGER,
    "professionalScore" INTEGER,
    "homeImprovementScore" INTEGER,
    "projectValueScore" INTEGER,
    "installerKnowledgeScore" INTEGER,
    "timeTaken" TEXT,

    CONSTRAINT "LtrSurveyRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LtrSurveyDelivery" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "installerId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "workroom" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "installer" TEXT NOT NULL,
    "sentByEmail" TEXT,

    CONSTRAINT "LtrSurveyDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CilioJobRecord" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "orderNumber" INTEGER NOT NULL,
    "orderStatusDescription" TEXT,
    "jobType" TEXT NOT NULL DEFAULT 'scheduled',
    "storeNumber" TEXT,
    "storeName" TEXT,
    "laborCategoryDescription" TEXT,
    "workroom" TEXT,
    "scheduledInstallDate" TIMESTAMP(3),
    "measureDate" TIMESTAMP(3),
    "bookingDate" TIMESTAMP(3),
    "installerId" TEXT NOT NULL,
    "installerName" TEXT,
    "cilioPayload" JSONB NOT NULL,

    CONSTRAINT "CilioJobRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Admin_email_key" ON "Admin"("email");

-- CreateIndex
CREATE INDEX "Admin_email_idx" ON "Admin"("email");

-- CreateIndex
CREATE INDEX "Admin_isActive_idx" ON "Admin"("isActive");

-- CreateIndex
CREATE INDEX "AdminAuditLog_createdAt_idx" ON "AdminAuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AdminAuditLog_adminEmail_idx" ON "AdminAuditLog"("adminEmail");

-- CreateIndex
CREATE INDEX "AdminAuditLog_action_idx" ON "AdminAuditLog"("action");

-- CreateIndex
CREATE INDEX "AdminAuditLog_targetType_targetId_idx" ON "AdminAuditLog"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "DashboardUpdate_createdAt_idx" ON "DashboardUpdate"("createdAt");

-- CreateIndex
CREATE INDEX "DashboardUpdate_isActive_idx" ON "DashboardUpdate"("isActive");

-- CreateIndex
CREATE INDEX "DashboardUpdate_showNavBadge_idx" ON "DashboardUpdate"("showNavBadge");

-- CreateIndex
CREATE UNIQUE INDEX "Installer_email_key" ON "Installer"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Installer_username_key" ON "Installer"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Installer_referralCode_key" ON "Installer"("referralCode");

-- CreateIndex
CREATE INDEX "Installer_referredByInstallerId_idx" ON "Installer"("referredByInstallerId");

-- CreateIndex
CREATE INDEX "InstallerAgreement_installerId_idx" ON "InstallerAgreement"("installerId");

-- CreateIndex
CREATE INDEX "InstallerAgreement_type_idx" ON "InstallerAgreement"("type");

-- CreateIndex
CREATE INDEX "InstallerAgreement_status_idx" ON "InstallerAgreement"("status");

-- CreateIndex
CREATE UNIQUE INDEX "InstallerAgreement_installerId_type_key" ON "InstallerAgreement"("installerId", "type");

-- CreateIndex
CREATE INDEX "Claim_installerId_idx" ON "Claim"("installerId");

-- CreateIndex
CREATE INDEX "Claim_status_idx" ON "Claim"("status");

-- CreateIndex
CREATE INDEX "Claim_claimNumber_idx" ON "Claim"("claimNumber");

-- CreateIndex
CREATE INDEX "Claim_lowesClaimNumber_idx" ON "Claim"("lowesClaimNumber");

-- CreateIndex
CREATE INDEX "Claim_jobNumber_idx" ON "Claim"("jobNumber");

-- CreateIndex
CREATE INDEX "Claim_workroom_idx" ON "Claim"("workroom");

-- CreateIndex
CREATE INDEX "ClaimDocument_claimId_idx" ON "ClaimDocument"("claimId");

-- CreateIndex
CREATE INDEX "Licence_isActive_idx" ON "Licence"("isActive");

-- CreateIndex
CREATE INDEX "Licence_licenceNumber_idx" ON "Licence"("licenceNumber");

-- CreateIndex
CREATE INDEX "Licence_county_idx" ON "Licence"("county");

-- CreateIndex
CREATE INDEX "Licence_city_idx" ON "Licence"("city");

-- CreateIndex
CREATE INDEX "Licence_licenceType_idx" ON "Licence"("licenceType");

-- CreateIndex
CREATE INDEX "Licence_category_idx" ON "Licence"("category");

-- CreateIndex
CREATE INDEX "LicenceDocument_licenceId_idx" ON "LicenceDocument"("licenceId");

-- CreateIndex
CREATE INDEX "InstallerHistory_installerId_idx" ON "InstallerHistory"("installerId");

-- CreateIndex
CREATE INDEX "InstallerHistory_year_idx" ON "InstallerHistory"("year");

-- CreateIndex
CREATE UNIQUE INDEX "InstallerHistory_installerId_year_key" ON "InstallerHistory"("installerId", "year");

-- CreateIndex
CREATE INDEX "Interview_status_startedAt_incompleteReminderSentAt_idx" ON "Interview"("status", "startedAt", "incompleteReminderSentAt");

-- CreateIndex
CREATE INDEX "Job_createdAt_idx" ON "Job"("createdAt");

-- CreateIndex
CREATE INDEX "Job_status_idx" ON "Job"("status");

-- CreateIndex
CREATE INDEX "JobApplication_installerId_idx" ON "JobApplication"("installerId");

-- CreateIndex
CREATE INDEX "JobApplication_jobId_idx" ON "JobApplication"("jobId");

-- CreateIndex
CREATE INDEX "JobApplication_status_idx" ON "JobApplication"("status");

-- CreateIndex
CREATE UNIQUE INDEX "JobApplication_jobId_installerId_key" ON "JobApplication"("jobId", "installerId");

-- CreateIndex
CREATE INDEX "Notification_installerId_idx" ON "Notification"("installerId");

-- CreateIndex
CREATE INDEX "Notification_isRead_idx" ON "Notification"("isRead");

-- CreateIndex
CREATE INDEX "Notification_type_idx" ON "Notification"("type");

-- CreateIndex
CREATE INDEX "InstallerChangeRequest_installerId_idx" ON "InstallerChangeRequest"("installerId");

-- CreateIndex
CREATE INDEX "InstallerChangeRequest_status_idx" ON "InstallerChangeRequest"("status");

-- CreateIndex
CREATE INDEX "InstallerChangeRequest_createdAt_idx" ON "InstallerChangeRequest"("createdAt");

-- CreateIndex
CREATE INDEX "InstallerTracking_installerId_idx" ON "InstallerTracking"("installerId");

-- CreateIndex
CREATE INDEX "InstallerTracking_status_idx" ON "InstallerTracking"("status");

-- CreateIndex
CREATE INDEX "InstallerTracking_type_idx" ON "InstallerTracking"("type");

-- CreateIndex
CREATE INDEX "InstallerTracking_createdAt_idx" ON "InstallerTracking"("createdAt");

-- CreateIndex
CREATE INDEX "InstallerTracking_priority_idx" ON "InstallerTracking"("priority");

-- CreateIndex
CREATE INDEX "InstallerTracking_type_matrixSortOrder_idx" ON "InstallerTracking"("type", "matrixSortOrder");

-- CreateIndex
CREATE INDEX "StaffMember_installerId_idx" ON "StaffMember"("installerId");

-- CreateIndex
CREATE INDEX "StaffMember_status_idx" ON "StaffMember"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Property_email_key" ON "Property"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Property_username_key" ON "Property"("username");

-- CreateIndex
CREATE INDEX "Property_email_idx" ON "Property"("email");

-- CreateIndex
CREATE INDEX "Property_username_idx" ON "Property"("username");

-- CreateIndex
CREATE INDEX "Property_status_idx" ON "Property"("status");

-- CreateIndex
CREATE INDEX "PropertySafetyWalk_propertyId_idx" ON "PropertySafetyWalk"("propertyId");

-- CreateIndex
CREATE INDEX "PropertySafetyWalk_inspectionDate_idx" ON "PropertySafetyWalk"("inspectionDate");

-- CreateIndex
CREATE INDEX "PropertySafetyWalk_createdAt_idx" ON "PropertySafetyWalk"("createdAt");

-- CreateIndex
CREATE INDEX "Location_propertyId_idx" ON "Location"("propertyId");

-- CreateIndex
CREATE INDEX "Location_status_idx" ON "Location"("status");

-- CreateIndex
CREATE INDEX "LocationDocument_locationId_idx" ON "LocationDocument"("locationId");

-- CreateIndex
CREATE INDEX "LocationDocument_category_idx" ON "LocationDocument"("category");

-- CreateIndex
CREATE INDEX "Vehicle_propertyId_idx" ON "Vehicle"("propertyId");

-- CreateIndex
CREATE INDEX "Vehicle_category_idx" ON "Vehicle"("category");

-- CreateIndex
CREATE INDEX "Vehicle_vin_idx" ON "Vehicle"("vin");

-- CreateIndex
CREATE INDEX "Vehicle_plate_idx" ON "Vehicle"("plate");

-- CreateIndex
CREATE INDEX "VehicleDocument_vehicleId_idx" ON "VehicleDocument"("vehicleId");

-- CreateIndex
CREATE INDEX "VehicleDocument_category_idx" ON "VehicleDocument"("category");

-- CreateIndex
CREATE INDEX "Inventory_propertyId_idx" ON "Inventory"("propertyId");

-- CreateIndex
CREATE INDEX "Inventory_sku_idx" ON "Inventory"("sku");

-- CreateIndex
CREATE INDEX "Inventory_category_idx" ON "Inventory"("category");

-- CreateIndex
CREATE INDEX "Inventory_status_idx" ON "Inventory"("status");

-- CreateIndex
CREATE INDEX "Inventory_barcode_idx" ON "Inventory"("barcode");

-- CreateIndex
CREATE INDEX "LtrSurveyRecord_batchId_idx" ON "LtrSurveyRecord"("batchId");

-- CreateIndex
CREATE INDEX "LtrSurveyRecord_workroom_company_installer_idx" ON "LtrSurveyRecord"("workroom", "company", "installer");

-- CreateIndex
CREATE INDEX "LtrSurveyDelivery_installerId_createdAt_idx" ON "LtrSurveyDelivery"("installerId", "createdAt");

-- CreateIndex
CREATE INDEX "LtrSurveyDelivery_batchId_idx" ON "LtrSurveyDelivery"("batchId");

-- CreateIndex
CREATE UNIQUE INDEX "LtrSurveyDelivery_installerId_batchId_workroom_company_inst_key" ON "LtrSurveyDelivery"("installerId", "batchId", "workroom", "company", "installer");

-- CreateIndex
CREATE UNIQUE INDEX "CilioJobRecord_orderNumber_key" ON "CilioJobRecord"("orderNumber");

-- CreateIndex
CREATE INDEX "CilioJobRecord_installerId_idx" ON "CilioJobRecord"("installerId");

-- CreateIndex
CREATE INDEX "CilioJobRecord_jobType_idx" ON "CilioJobRecord"("jobType");

-- CreateIndex
CREATE INDEX "CilioJobRecord_orderNumber_idx" ON "CilioJobRecord"("orderNumber");

-- CreateIndex
CREATE INDEX "CilioJobRecord_createdAt_idx" ON "CilioJobRecord"("createdAt");

-- AddForeignKey
ALTER TABLE "Communication" ADD CONSTRAINT "Communication_installerId_fkey" FOREIGN KEY ("installerId") REFERENCES "Installer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_installerId_fkey" FOREIGN KEY ("installerId") REFERENCES "Installer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Installer" ADD CONSTRAINT "Installer_referredByInstallerId_fkey" FOREIGN KEY ("referredByInstallerId") REFERENCES "Installer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstallerAgreement" ADD CONSTRAINT "InstallerAgreement_installerId_fkey" FOREIGN KEY ("installerId") REFERENCES "Installer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Claim" ADD CONSTRAINT "Claim_installerId_fkey" FOREIGN KEY ("installerId") REFERENCES "Installer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClaimDocument" ADD CONSTRAINT "ClaimDocument_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "Claim"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LicenceDocument" ADD CONSTRAINT "LicenceDocument_licenceId_fkey" FOREIGN KEY ("licenceId") REFERENCES "Licence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstallerHistory" ADD CONSTRAINT "InstallerHistory_installerId_fkey" FOREIGN KEY ("installerId") REFERENCES "Installer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interview" ADD CONSTRAINT "Interview_installerId_fkey" FOREIGN KEY ("installerId") REFERENCES "Installer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewResponse" ADD CONSTRAINT "InterviewResponse_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "Interview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobApplication" ADD CONSTRAINT "JobApplication_installerId_fkey" FOREIGN KEY ("installerId") REFERENCES "Installer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobApplication" ADD CONSTRAINT "JobApplication_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_installerId_fkey" FOREIGN KEY ("installerId") REFERENCES "Installer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstallerChangeRequest" ADD CONSTRAINT "InstallerChangeRequest_installerId_fkey" FOREIGN KEY ("installerId") REFERENCES "Installer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstallerTracking" ADD CONSTRAINT "InstallerTracking_installerId_fkey" FOREIGN KEY ("installerId") REFERENCES "Installer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffMember" ADD CONSTRAINT "StaffMember_installerId_fkey" FOREIGN KEY ("installerId") REFERENCES "Installer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertySafetyWalk" ADD CONSTRAINT "PropertySafetyWalk_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationDocument" ADD CONSTRAINT "LocationDocument_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleDocument" ADD CONSTRAINT "VehicleDocument_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inventory" ADD CONSTRAINT "Inventory_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LtrSurveyRecord" ADD CONSTRAINT "LtrSurveyRecord_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "LtrUploadBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LtrSurveyDelivery" ADD CONSTRAINT "LtrSurveyDelivery_installerId_fkey" FOREIGN KEY ("installerId") REFERENCES "Installer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LtrSurveyDelivery" ADD CONSTRAINT "LtrSurveyDelivery_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "LtrUploadBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CilioJobRecord" ADD CONSTRAINT "CilioJobRecord_installerId_fkey" FOREIGN KEY ("installerId") REFERENCES "Installer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
