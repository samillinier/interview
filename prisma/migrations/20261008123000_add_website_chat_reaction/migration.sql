-- Add emoji reactions to website chat messages (admin + visitor)
CREATE TABLE "WebsiteChatReaction" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "reactorId" TEXT NOT NULL,
    "reactorType" TEXT NOT NULL,
    "reactorName" TEXT,
    "emoji" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebsiteChatReaction_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WebsiteChatReaction_messageId_reactorId_reactorType_emoji_key"
    ON "WebsiteChatReaction"("messageId", "reactorId", "reactorType", "emoji");
CREATE INDEX "WebsiteChatReaction_messageId_idx" ON "WebsiteChatReaction"("messageId");

ALTER TABLE "WebsiteChatReaction" ADD CONSTRAINT "WebsiteChatReaction_messageId_fkey"
    FOREIGN KEY ("messageId") REFERENCES "WebsiteChatMessage"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
