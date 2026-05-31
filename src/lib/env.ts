import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  BETTER_AUTH_SECRET: z.string().min(32),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  ALLOWED_EMAIL: z
    .string()
    .email()
    .transform((v) => v.toLowerCase()),
  BOT_TOKEN: z.string().min(32),
  TELEGRAM_OWNER_USER_ID: z.string().regex(/^\d+$/, "must be numeric"),
  TELEGRAM_DM_CHAT_ID: z.string().regex(/^-?\d+$/, "must be numeric"),
  WEBHOOK_SECRET: z.string().min(32),
  CRON_SECRET: z.string().min(32),
  NEXT_PUBLIC_APP_URL: z.string().url(),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | undefined;

export function validateEnv(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment variables:\n${issues}`);
  }
  cached = parsed.data;
  return cached;
}

export const env: Env = validateEnv();
