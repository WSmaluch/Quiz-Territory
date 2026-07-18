import { Theme } from './themeModels';

export const BUILT_IN_THEMES: Theme[] = [
  {
    id: 'neon-arena',
    ownerId: null,
    name: 'Neon Arena',
    description: 'Modern television-show styling with vibrant neon accents',
    tokens: {
      primary: '#00f3ff',
      secondary: '#ff00aa',
      accent: '#ffd700',
      background: '#1a1a24',
      surface: '#2a2a35',
      text: '#ffffff',
      success: '#00ff88',
      warning: '#ffaa00',
      danger: '#ff3333'
    },
    typography: { fontFamily: 'Inter, sans-serif', scale: 1.0 },
    boardStyle: { tileShape: 'ROUNDED', borderWidth: '2px', glowIntensity: 0.8, perspective: true },
    animation: { intensity: 1.0, reducedMotionFallback: true },
    audio: { presetId: 'modern-synth' },
    accessibility: { highContrast: false, colorBlindPalette: false },
    backgroundMediaUrl: null
  },
  {
    id: 'gold-show',
    ownerId: null,
    name: 'Gold Show',
    description: 'Elegant dark charcoal with warm gold accents',
    tokens: {
      primary: '#d4af37',
      secondary: '#b8860b',
      accent: '#fdf5e6',
      background: '#222222',
      surface: '#333333',
      text: '#ffffff',
      success: '#2e8b57',
      warning: '#daa520',
      danger: '#b22222'
    },
    typography: { fontFamily: 'Georgia, serif', scale: 1.0 },
    boardStyle: { tileShape: 'SQUARE', borderWidth: '1px', glowIntensity: 0.2, perspective: false },
    animation: { intensity: 0.5, reducedMotionFallback: true },
    audio: { presetId: 'orchestral' },
    accessibility: { highContrast: false, colorBlindPalette: false },
    backgroundMediaUrl: null
  },
  {
    id: 'cyber-blue',
    ownerId: null,
    name: 'Cyber Blue',
    description: 'Deep navy and electric blue sharper styling',
    tokens: {
      primary: '#0055ff',
      secondary: '#00ffff',
      accent: '#00ffaa',
      background: '#050a1f',
      surface: '#0a1535',
      text: '#e0f0ff',
      success: '#00ff88',
      warning: '#ffaa00',
      danger: '#ff0055'
    },
    typography: { fontFamily: 'Roboto, sans-serif', scale: 1.0 },
    boardStyle: { tileShape: 'HEXAGON', borderWidth: '3px', glowIntensity: 0.9, perspective: true },
    animation: { intensity: 1.2, reducedMotionFallback: true },
    audio: { presetId: 'cyber' },
    accessibility: { highContrast: false, colorBlindPalette: false },
    backgroundMediaUrl: null
  },
  {
    id: 'red-battle',
    ownerId: null,
    name: 'Red Battle',
    description: 'Energetic competitive appearance',
    tokens: {
      primary: '#e60000',
      secondary: '#ff4d4d',
      accent: '#ff9900',
      background: '#1a0000',
      surface: '#330000',
      text: '#ffffff',
      success: '#00cc44',
      warning: '#ffcc00',
      danger: '#ff0000'
    },
    typography: { fontFamily: 'Impact, sans-serif', scale: 1.1 },
    boardStyle: { tileShape: 'ROUNDED', borderWidth: '4px', glowIntensity: 0.6, perspective: true },
    animation: { intensity: 1.5, reducedMotionFallback: true },
    audio: { presetId: 'battle' },
    accessibility: { highContrast: false, colorBlindPalette: false },
    backgroundMediaUrl: null
  },
  {
    id: 'high-contrast',
    ownerId: null,
    name: 'High Contrast',
    description: 'Accessibility-focused styling',
    tokens: {
      primary: '#ffff00',
      secondary: '#00ffff',
      accent: '#ff00ff',
      background: '#000000',
      surface: '#111111',
      text: '#ffffff',
      success: '#00ff00',
      warning: '#ffaa00',
      danger: '#ff0000'
    },
    typography: { fontFamily: 'Arial, sans-serif', scale: 1.2 },
    boardStyle: { tileShape: 'SQUARE', borderWidth: '2px', glowIntensity: 0.0, perspective: false },
    animation: { intensity: 0.0, reducedMotionFallback: true },
    audio: { presetId: 'minimal' },
    accessibility: { highContrast: true, colorBlindPalette: true },
    backgroundMediaUrl: null
  }
];
