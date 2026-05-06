import { z } from 'zod';
import dotenv from 'dotenv';
import { ConfigurationError } from './utils/errors';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).catch('development').default('development'),
  PORT: z.coerce.number().int().positive().catch(4000).default(4000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).catch('info').default('info'),

  DATABASE_URL: z.string().trim().catch('').default(''),

  JWT_SECRET: z.string().min(8).catch('dev-secret-change-me').default('dev-secret-change-me'),
  FIREBASE_SERVICE_ACCOUNT_JSON: z.string().trim().optional().catch(undefined),

  OPENAI_API_KEY: z.string().trim().optional().catch(undefined),
  ANTHROPIC_API_KEY: z.string().trim().optional().catch(undefined),
  GOOGLE_API_KEY: z.string().trim().optional().catch(undefined),
  NVIDIA_API_KEY: z.string().trim().optional().catch(undefined),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().catch(60_000).default(60_000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().catch(120).default(120),

  // Defaults include both the legacy api.clex.in and the new
  // ai.clex.in / api.ai.clex.in / www.ai.clex.in aliases so the dashboard
  // can call the API regardless of which hostname Vercel is currently
  // serving the request on. clex.in (file-transfer product) is *not*
  // here — only AI surfaces.
  ALLOWED_ORIGINS: z.string()
    .catch('https://api.clex.in,https://ai.clex.in,https://www.ai.clex.in,https://api.ai.clex.in,http://localhost:3000,http://localhost:5173')
    .default('https://api.clex.in,https://ai.clex.in,https://www.ai.clex.in,https://api.ai.clex.in,http://localhost:3000,http://localhost:5173'),

  PROVIDER_TIMEOUT_MS: z.coerce.number().int().positive().catch(60_000).default(60_000),
});

export const config = envSchema.parse(process.env);

export const requiredEnvironmentVariables = [] as const;

export type ConfigKey = keyof typeof config;
type RequiredEnvironmentVariable = typeof requiredEnvironmentVariables[number];

const requiredEnvironmentMessages: Record<string, string> = {
  DATABASE_URL: 'DATABASE_URL is required.',
};

function isConfiguredValue(value: unknown): boolean {
  if (typeof value === 'string') {
    return value.trim().length > 0;
  }

  return value !== undefined && value !== null;
}

export function getConfigurationIssues(
  keys: readonly ConfigKey[] = requiredEnvironmentVariables,
) {
  const missingEnvironmentVariables = keys.filter((key) => !isConfiguredValue(config[key]));
  const fieldErrors = Object.fromEntries(
    missingEnvironmentVariables.map((key) => [
      key,
      [requiredEnvironmentMessages[key as RequiredEnvironmentVariable] || `${String(key)} is required.`],
    ]),
  ) as Record<string, string[]>;

  return {
    isValid: missingEnvironmentVariables.length === 0,
    missingEnvironmentVariables,
    fieldErrors,
  };
}

export function getConfigurationError(
  keys: readonly ConfigKey[] = requiredEnvironmentVariables,
): ConfigurationError | null {
  const issues = getConfigurationIssues(keys);
  if (issues.isValid) {
    return null;
  }

  return new ConfigurationError(
    'Required environment variables are missing or invalid. Configure them in the deployment environment and redeploy.',
    {
      missingEnvironmentVariables: issues.missingEnvironmentVariables.map(String),
      fieldErrors: issues.fieldErrors,
    },
  );
}

const startupConfigurationError = getConfigurationError();

if (startupConfigurationError && process.env.NODE_ENV !== 'test' && !process.env.VITEST) {
  console.error('Invalid environment configuration:');
  console.error(startupConfigurationError.toJSON().error);
}

export const allowedOrigins = config.ALLOWED_ORIGINS.split(',').map(s => s.trim()).filter(Boolean);
