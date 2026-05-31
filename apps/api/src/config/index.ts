import { z } from 'zod';

const configSchema = z.object({
  port: z.coerce.number().int().positive().default(4000),
  nodeEnv: z.enum(['development', 'test', 'production']).default('development'),
  jwtSecret: z.string().min(16).default('pmg-dev-secret-change-in-production'),
  jwtIssuer: z.string().default('pmg-mock-idp'),
  jwtAudience: z.string().default('pmg-presence-api'),
  jwtExpiresInSeconds: z.coerce.number().int().positive().default(8 * 60 * 60), // 8h
});

const parsed = configSchema.safeParse({
  port: process.env['PORT'],
  nodeEnv: process.env['NODE_ENV'],
  jwtSecret: process.env['JWT_SECRET'],
  jwtIssuer: process.env['JWT_ISSUER'],
  jwtAudience: process.env['JWT_AUDIENCE'],
  jwtExpiresInSeconds: process.env['JWT_EXPIRES_IN_SECONDS'],
});

if (!parsed.success) {
  console.error('Invalid configuration:', parsed.error.flatten());
  process.exit(1);
}

export const config = parsed.data;
