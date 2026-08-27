-- Add emoji reactions to messages (admin + installer)
CREATE TABLE "MessageReaction" (
    "id" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "reactorId" TEXT NOT NULL,
    "reactorType" TEXT NOT NULL,
    "reactorName" TEXT,
    "emoji" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageReaction_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MessageReaction_notificationId_reactorId_reactorType_emoji_key"
    ON "MessageReaction"("notificationId", "reactorId", "reactorType", "emoji");
CREATE INDEX "MessageReaction_notificationId_idx" ON "MessageReaction"("notificationId");

ALTER TABLE "MessageReaction" ADD CONSTRAINT "MessageReaction_notificationId_fkey"
    FOREIGN KEY ("notificationId") REFERENCES "Notification"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
