import { z } from 'zod';

export const validateEnv = (config: Record<string, unknown>) => {
  const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.string().default('3000'),

    // JWT
    JWT_ACCESS_TOKEN_SECRET: z.string().min(32),
    JWT_REFRESH_TOKEN_SECRET: z.string().min(32),
    JWT_ACCESS_TOKEN_EXPIRATION: z.string().default('30m'),
    JWT_REFRESH_TOKEN_EXPIRATION: z.string().default('7d'),

    // Database
    DATABASE_URL: z.url(),
  });

  const parsed = envSchema.safeParse(config);

  if (!parsed.success) {
    const treeified = z.treeifyError(parsed.error);
    console.error('Invalid environment variables:', treeified.errors);
    throw new Error('Invalid environment variables');
  }

  return parsed.data;
};
