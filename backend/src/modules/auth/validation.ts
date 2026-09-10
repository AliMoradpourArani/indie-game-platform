import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
  role: z.enum(['PLAYER', 'DEVELOPER']),
  displayName: z.string().min(2).max(60),
  studioName: z.string().min(2).max(80).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1).max(128),
});

export type LoginInput = z.infer<typeof loginSchema>;
