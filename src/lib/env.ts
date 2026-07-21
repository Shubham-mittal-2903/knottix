import { z } from 'zod';

const serverEnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  AUTH_SECRET: z.string().min(1),
  AUTH_URL: z.string().url().optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  ANTHROPIC_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  GOOGLE_AI_API_KEY: z.string().optional(),
  OPENROUTER_API_KEY: z.string().optional(),
  AZURE_OPENAI_API_KEY: z.string().optional(),
  OLLAMA_BASE_URL: z.string().optional(),
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET_NAME: z.string().optional(),
  R2_PUBLIC_URL: z.string().optional(),
});

const clientEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3955'),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type ClientEnv = z.infer<typeof clientEnvSchema>;

function validateEnv<T>(schema: z.ZodSchema<T>, data: Record<string, unknown>, label: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid ${label} environment variables:\n${issues}`);
  }
  return result.data;
}

let _serverEnv: ServerEnv | undefined;
let _clientEnv: ClientEnv | undefined;

export function serverEnv(): ServerEnv {
  if (_serverEnv) return _serverEnv;
  _serverEnv = validateEnv(serverEnvSchema, process.env, 'server');
  return _serverEnv;
}

export function clientEnv(): ClientEnv {
  if (_clientEnv) return _clientEnv;
  _clientEnv = validateEnv(clientEnvSchema, process.env, 'client');
  return _clientEnv;
}

export function isProduction(): boolean {
  return serverEnv().NODE_ENV === 'production';
}

export function isDevelopment(): boolean {
  return serverEnv().NODE_ENV === 'development';
}
