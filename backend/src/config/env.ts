import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  PORT: z.coerce.number().int().positive().default(4000),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  STORAGE_ROOT: z.string().default('./storage'),
  STORAGE_BASE_URL: z.string().default('/files'),
  DOWNLOAD_TOKEN_SECRET: z.string().min(16).default('dev-only-download-secret-change-me'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

export type AppConfig = z.infer<typeof envSchema>;

let cached: AppConfig | null = null;

/** Validates env at boot; fail fast on misconfiguration. */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  if (cached) return cached;
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    const details = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Invalid configuration: ${details}`);
  }
  cached = parsed.data;
  return cached;
}

/** Test-only reset for the config cache. */
export function resetConfigCache(): void {
  cached = null;
}
