import { z } from 'zod';

export const createGameSchema = z.object({
  title: z.string().min(2).max(120),
  description: z.string().min(10).max(10000),
  genre: z.string().min(2).max(40),
  tags: z.array(z.string().min(1).max(30)).max(12).default([]),
  priceCents: z.number().int().min(0).max(100_000_00).default(0),
  currency: z.string().length(3).default('USD'),
});

export const updateGameSchema = createGameSchema.partial();

export const createVersionSchema = z.object({
  version: z.string().min(1).max(32),
  changelog: z.string().max(5000).default(''),
  requirements: z.record(z.unknown()).optional(),
});

export const createBuildSchema = z.object({
  platform: z.enum(['WINDOWS', 'LINUX', 'MAC', 'WEB']),
  demo: z.boolean().default(false),
  sha256: z.string().length(64),
  sizeBytes: z.coerce.number().int().positive(),
});

export type CreateGameInput = z.infer<typeof createGameSchema>;
export type UpdateGameInput = z.infer<typeof updateGameSchema>;
export type CreateVersionInput = z.infer<typeof createVersionSchema>;
