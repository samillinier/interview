-- Public landing-page chats that appear in admin Messages
CREATE TABLE "WebsiteChat" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "visitorToken" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebsiteChat_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WebsiteChatMessage" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "chatId" TEXT NOT NULL,
    "senderType" TEXT NOT NULL,
    "senderName" TEXT,
    "content" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "WebsiteChatMessage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WebsiteChat_visitorToken_key" ON "WebsiteChat"("visitorToken");
CREATE INDEX "WebsiteChat_email_idx" ON "WebsiteChat"("email");
CREATE INDEX "WebsiteChat_lastMessageAt_idx" ON "WebsiteChat"("lastMessageAt");
CREATE INDEX "WebsiteChatMessage_chatId_createdAt_idx" ON "WebsiteChatMessage"("chatId", "createdAt");
CREATE INDEX "WebsiteChatMessage_isRead_idx" ON "WebsiteChatMessage"("isRead");

ALTER TABLE "WebsiteChatMessage" ADD CONSTRAINT "WebsiteChatMessage_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "WebsiteChat"("id") ON DELETE CASCADE ON UPDATE CASCADE;
