import { ThemeTokens } from './themeModels';

// WCAG Contrast ratio calculator
function getLuminance(r: number, g: number, b: number) {
  const a = [r, g, b].map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0]! * 0.2126 + a[1]! * 0.7152 + a[2]! * 0.0722;
}

function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1]!, 16),
        g: parseInt(result[2]!, 16),
        b: parseInt(result[3]!, 16),
      }
    : { r: 0, g: 0, b: 0 };
}

export function getContrastRatio(hex1: string, hex2: string) {
  const rgb1 = hexToRgb(hex1);
  const rgb2 = hexToRgb(hex2);
  const l1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
  const l2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);
  const lightest = Math.max(l1, l2);
  const darkest = Math.min(l1, l2);
  return (lightest + 0.05) / (darkest + 0.05);
}

export function validateThemeContrast(tokens: ThemeTokens): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  
  // Background vs Text
  if (getContrastRatio(tokens.background, tokens.text) < 4.5) {
    issues.push('Text color has insufficient contrast against background.');
  }

  // Surface vs Text
  if (getContrastRatio(tokens.surface, tokens.text) < 4.5) {
    issues.push('Text color has insufficient contrast against surface.');
  }

  // Primary vs Background (needs to be visible for focus rings, indicators)
  if (getContrastRatio(tokens.primary, tokens.background) < 3.0) {
    issues.push('Primary color has insufficient contrast against background.');
  }

  return {
    valid: issues.length === 0,
    issues
  };
}

export function generatePlayerColors(count: number, colorBlindFriendly: boolean = false): string[] {
  // Generate distinct HSL colors
  const colors: string[] = [];
  
  if (colorBlindFriendly) {
    // Wong's palette for colorblindness
    const wong = [
      '#E69F00', '#56B4E9', '#009E73', '#F0E442', '#0072B2', '#D55E00', '#CC79A7', '#000000'
    ];
    for (let i = 0; i < count; i++) {
      colors.push(wong[i % wong.length]!);
    }
    return colors;
  }

  for (let i = 0; i < count; i++) {
    const hue = Math.floor((360 / count) * i);
    // Alternate lightness to increase distinguishability for adjacent colors
    const lightness = i % 2 === 0 ? 60 : 40;
    // We convert HSL to hex string simply here (or just return hsl string)
    colors.push(`hsl(${hue}, 80%, ${lightness}%)`);
  }
  return colors;
}
