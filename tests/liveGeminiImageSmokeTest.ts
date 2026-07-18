import { GoogleGenAI } from '@google/genai';

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.log('Skipping live Gemini Vision test (no API key provided)');
    return;
  }
  
  const client = new GoogleGenAI({ apiKey });
  const start = Date.now();
  console.log('Running live Gemini Image validation test...');

  try {
    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: 'Does this text match the concept of a Jaguar? Return MATCH or NO_MATCH in json format.',
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: { match: { type: 'STRING' } },
          required: ['match']
        }
      }
    });

    const parsed = JSON.parse(response.text() || '{}');
    if (!parsed.match) throw new Error('Schema failure');
    
    console.log(`Success! Evaluated: ${parsed.match}`);
    console.log(`Duration: ${Date.now() - start}ms`);
  } catch(e) {
    console.error('Failed smoke test', e);
    process.exit(1);
  }
}

main();
