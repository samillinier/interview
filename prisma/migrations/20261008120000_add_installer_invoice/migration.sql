-- CreateTable
CREATE TABLE "InstallerInvoice" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "installerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "note" TEXT,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSize" INTEGER,
    "sentByEmail" TEXT,
    "sentByName" TEXT,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "InstallerInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InstallerInvoice_installerId_idx" ON "InstallerInvoice"("installerId");

-- CreateIndex
CREATE INDEX "InstallerInvoice_createdAt_idx" ON "InstallerInvoice"("createdAt");

-- AddForeignKey
ALTER TABLE "InstallerInvoice" ADD CONSTRAINT "InstallerInvoice_installerId_fkey" FOREIGN KEY ("installerId") REFERENCES "Installer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
