-- Archive flag + feedback (comments/ratings) + discount codes + deletion log
ALTER TABLE "Game" ADD COLUMN "isArchived" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Game" ADD COLUMN "archivedAt" TIMESTAMP(3);
CREATE INDEX "Game_isArchived_idx" ON "Game"("isArchived");

ALTER TABLE "Purchase" ADD COLUMN "discountCode" TEXT;

CREATE TABLE "GameComment" (
  "id" TEXT NOT NULL,
  "gameId" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GameComment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "GameComment_gameId_createdAt_idx" ON "GameComment"("gameId", "createdAt");
ALTER TABLE "GameComment" ADD CONSTRAINT "GameComment_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GameComment" ADD CONSTRAINT "GameComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "GameRating" (
  "id" TEXT NOT NULL,
  "gameId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "stars" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GameRating_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "GameRating_gameId_userId_key" ON "GameRating"("gameId", "userId");
CREATE INDEX "GameRating_gameId_idx" ON "GameRating"("gameId");
ALTER TABLE "GameRating" ADD CONSTRAINT "GameRating_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GameRating" ADD CONSTRAINT "GameRating_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "DiscountCode" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "percentOff" INTEGER NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DiscountCode_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DiscountCode_code_key" ON "DiscountCode"("code");
CREATE INDEX "DiscountCode_active_idx" ON "DiscountCode"("active");

CREATE TABLE "GameDeletionLog" (
  "id" TEXT NOT NULL,
  "gameId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "deletedBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GameDeletionLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "GameDeletionLog_gameId_idx" ON "GameDeletionLog"("gameId");
