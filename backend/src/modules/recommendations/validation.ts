import { z } from 'zod';
import { MAX_ONBOARDING_SELECTIONS } from './preferenceGames.js';
import { SUPPORTED_EVENT_TYPES } from './weights.js';

export const onboardingSchema = z.object({
  externalGameIds: z.array(z.string().min(1).max(60)).max(MAX_ONBOARDING_SELECTIONS).default([]),
});

export const eventSchema = z.object({
  type: z.enum(SUPPORTED_EVENT_TYPES as [string, ...string[]]),
  gameId: z.string().min(1).max(60).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const limitSchema = z.object({
  limit: z.coerce.number().int().min(1).max(30).default(10),
});
