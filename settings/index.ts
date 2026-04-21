import { z } from "zod";

const envSchema = z.object({
  FB_API_KEY: z.string(),
  FB_AUTH_DOMAIN: z.string(),
  FB_PROJECT_ID: z.string(),
  FB_STORAGE_BUCKET: z.string()
});

const env = envSchema.parse({
  FB_API_KEY: process.env.EXPO_PUBLIC_FB_API_KEY,
  FB_AUTH_DOMAIN: process.env.EXPO_PUBLIC_FB_AUTH_DOMAIN,
  FB_PROJECT_ID: process.env.EXPO_PUBLIC_FB_PROJECT_ID,
  FB_STORAGE_BUCKET: process.env.EXPO_PUBLIC_FB_STORAGE_BUCKET
});

export const settings = {
  ...env,
};