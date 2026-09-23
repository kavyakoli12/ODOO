import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config({ override: true });

// If running in Render cloud environment and NODE_ENV is unset, default to production
if (process.env.RENDER && !process.env.NODE_ENV) {
  process.env.NODE_ENV = 'production';
}

const envSchema = z.object({
  PORT: z.string().default('5000').transform((val) => parseInt(val, 10)),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  MONGODB_URI: z.string().default('mongodb://127.0.0.1:27017/safemap'),
  CLIENT_ORIGIN: z.string().default('http://localhost:5173'),
  JWT_ACCESS_SECRET: z.string().min(16).default('safemap_dev_access_secret_key_32_characters_long_123'),
  JWT_REFRESH_SECRET: z.string().min(16).default('safemap_dev_refresh_secret_key_32_characters_long_456'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  GEMINI_API_KEY: z.string().optional(),
  EMAIL_USER: z.string().optional().default('').transform((val) => val.trim()),
  EMAIL_PASS: z.string().optional().default('').transform((val) => val.trim()),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Environment configuration error:');
  console.error(JSON.stringify(parsed.error.format(), null, 2));
  process.exit(1);
}

export const env = parsed.data;
