import { GoogleGenAI } from '@google/genai';

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.log('Skipping live Gemini test (no API key provided)');
    return;
  }
  
  const client = new GoogleGenAI({ apiKey });
  const start = Date.now();
  console.log('Running live Gemini structured output test...');

  try {
    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: 'Wygeneruj losowe miasto w Polsce',
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            miasto: { type: 'STRING' }
          },
          required: ['miasto']
        }
      }
    });

    const parsed = JSON.parse(response.text() || '{}');
    if (!parsed.miasto) throw new Error('Schema failure');
    
    console.log(`Success! Generated: ${parsed.miasto}`);
    console.log(`Duration: ${Date.now() - start}ms`);
  } catch(e) {
    console.error('Failed smoke test', e);
    process.exit(1);
  }
}

main();
