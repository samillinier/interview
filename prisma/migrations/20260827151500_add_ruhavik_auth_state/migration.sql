-- CreateTable
CREATE TABLE "RuhavikAuthState" (
    "key" TEXT NOT NULL,
    "accessToken" TEXT,
    "tokenFetchedAt" TIMESTAMP(3),
    "lastLoginAttemptAt" TIMESTAMP(3),
    "loginBlockedUntil" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RuhavikAuthState_pkey" PRIMARY KEY ("key")
);
