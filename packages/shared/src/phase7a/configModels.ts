import { z } from 'zod';

export const WebConfigSchema = z.object({
  apiKey: z.string(),
  authDomain: z.string(),
  projectId: z.string(),
  databaseURL: z.string(),
  storageBucket: z.string(),
  appId: z.string(),
  appCheckSiteKey: z.string(),
  environmentName: z.enum(['development', 'staging', 'production']),
  releaseVersion: z.string()
});

export const ServerConfigSchema = z.object({
  geminiModelNames: z.array(z.string()),
  generationLimits: z.object({
    maxPackagesPerUser: z.number(),
    maxGenerationsPerDay: z.number()
  }),
  signedUrlLifetimeMinutes: z.number(),
  cleanupRetentionDays: z.number(),
  functionRegion: z.string(),
  taskQueueSettings: z.object({ maxConcurrent: z.number() }),
  loggingLevel: z.enum(['DEBUG', 'INFO', 'WARN', 'ERROR']),
  featureFlags: z.record(z.string(), z.boolean())
});

export type WebConfig = z.infer<typeof WebConfigSchema>;
export type ServerConfig = z.infer<typeof ServerConfigSchema>;
