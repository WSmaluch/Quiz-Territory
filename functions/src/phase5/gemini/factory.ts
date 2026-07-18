import { AIContentProvider } from 'shared/src/phase5/models';
import { GeminiContentProvider } from './provider';
import { MockContentProvider } from '../geminiProvider'; // The Phase 5A one
import { HttpsError } from 'firebase-functions/v2/https';

export function createAIContentProvider(providerType: string, fakeTransport?: any): AIContentProvider {
  if (providerType === 'MOCK') {
    return new MockContentProvider();
  }
  if (providerType === 'GEMINI') {
    return new GeminiContentProvider(undefined, fakeTransport);
  }
  throw new HttpsError('invalid-argument', 'Unknown provider type');
}
