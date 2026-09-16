-- Recommendations subsystem: behavior events, external preference anchors, onboarding flags
CREATE TYPE "RecommendationEventType" AS ENUM ('GAME_VIEWED', 'GAME_VIEW_REPEATED', 'DEMO_DOWNLOADED', 'GAME_PURCHASED', 'RECOMMENDATION_CLICKED', 'GAME_OPENED_FROM_RECOMMENDATION');

ALTER TABLE "Profile" ADD COLUMN "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Profile" ADD COLUMN "onboardingSkipped" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "UserEvent" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "eventType" "RecommendationEventType" NOT NULL,
  "gameId" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "UserEvent_userId_createdAt_idx" ON "UserEvent"("userId", "createdAt");
CREATE INDEX "UserEvent_userId_eventType_idx" ON "UserEvent"("userId", "eventType");
CREATE INDEX "UserEvent_gameId_idx" ON "UserEvent"("gameId");
ALTER TABLE "UserEvent" ADD CONSTRAINT "UserEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserEvent" ADD CONSTRAINT "UserEvent_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "UserPreference" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "externalGameId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserPreference_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "UserPreference_userId_externalGameId_key" ON "UserPreference"("userId", "externalGameId");
CREATE INDEX "UserPreference_userId_idx" ON "UserPreference"("userId");
ALTER TABLE "UserPreference" ADD CONSTRAINT "UserPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
