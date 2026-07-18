import { z } from 'zod';

export const ThemeTokensSchema = z.object({
  primary: z.string(),
  secondary: z.string(),
  accent: z.string(),
  background: z.string(),
  surface: z.string(),
  text: z.string(),
  success: z.string(),
  warning: z.string(),
  danger: z.string()
});

export const ThemeTypographySchema = z.object({
  fontFamily: z.string(),
  scale: z.number()
});

export const ThemeBoardStyleSchema = z.object({
  tileShape: z.enum(['SQUARE', 'ROUNDED', 'CIRCLE', 'HEXAGON']),
  borderWidth: z.string(),
  glowIntensity: z.number(),
  perspective: z.boolean()
});

export const ThemeAnimationSettingsSchema = z.object({
  intensity: z.number(),
  reducedMotionFallback: z.boolean()
});

export const ThemeAudioSettingsSchema = z.object({
  presetId: z.string()
});

export const ThemeAccessibilitySettingsSchema = z.object({
  highContrast: z.boolean(),
  colorBlindPalette: z.boolean()
});

export const ThemeSchema = z.object({
  id: z.string(),
  ownerId: z.string().nullable(),
  name: z.string(),
  description: z.string(),
  tokens: ThemeTokensSchema,
  typography: ThemeTypographySchema,
  boardStyle: ThemeBoardStyleSchema,
  animation: ThemeAnimationSettingsSchema,
  audio: ThemeAudioSettingsSchema,
  accessibility: ThemeAccessibilitySettingsSchema,
  backgroundMediaUrl: z.string().nullable()
});

export const CustomThemeDraftSchema = ThemeSchema.extend({
  status: z.enum(['DRAFT', 'VALIDATED', 'ACTIVE'])
});

export type ThemeTokens = z.infer<typeof ThemeTokensSchema>;
export type ThemeTypography = z.infer<typeof ThemeTypographySchema>;
export type ThemeBoardStyle = z.infer<typeof ThemeBoardStyleSchema>;
export type ThemeAnimationSettings = z.infer<typeof ThemeAnimationSettingsSchema>;
export type ThemeAudioSettings = z.infer<typeof ThemeAudioSettingsSchema>;
export type ThemeAccessibilitySettings = z.infer<typeof ThemeAccessibilitySettingsSchema>;
export type Theme = z.infer<typeof ThemeSchema>;
export type CustomThemeDraft = z.infer<typeof CustomThemeDraftSchema>;
