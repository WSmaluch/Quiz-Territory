import { GoogleGenAI } from '@google/genai';
import { 
  AIContentProvider, GamePackage, Category, Question, 
  PackageGenerationSettings, GeneratedPackageDraft, 
  GenerateCategoryRequest, GeneratedCategoryDraft,
  FillCategoryRequest, GeneratedQuestionDraft,
  RegenerateQuestionRequest, ValidationResult
} from 'shared/src/phase5/models';
import { HttpsError } from 'firebase-functions/v2/https';

export interface GeminiModelConfiguration {
  generationModel: string;
  validationModel: string;
  repairModel: string;
}

export const defaultConfig: GeminiModelConfiguration = {
  generationModel: process.env.GEMINI_GENERATION_MODEL || 'gemini-2.5-flash',
  validationModel: process.env.GEMINI_VALIDATION_MODEL || 'gemini-2.5-flash',
  repairModel: process.env.GEMINI_REPAIR_MODEL || 'gemini-2.5-flash'
};

export class GeminiContentProvider implements AIContentProvider {
  private client: GoogleGenAI | null = null;
  private config: GeminiModelConfiguration;
  private fakeTransport: any = null;

  constructor(config: GeminiModelConfiguration = defaultConfig, fakeTransport?: any) {
    this.config = config;
    if (fakeTransport) {
      this.fakeTransport = fakeTransport;
    }
  }

  private initClient() {
    if (this.fakeTransport) return;
    if (this.client) return;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new HttpsError('failed-precondition', 'GEMINI_KEY_MISSING');
    }
    this.client = new GoogleGenAI({ apiKey });
  }

  private async callGemini(modelName: string, prompt: string, schema: any) {
    if (this.fakeTransport) {
      return this.fakeTransport(modelName, prompt, schema);
    }
    this.initClient();
    try {
      const response = await this.client!.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: schema
        }
      });
      return JSON.parse(response.text() || '{}');
    } catch (e: any) {
      // safe error mapping
      if (e.message?.includes('429')) throw new HttpsError('resource-exhausted', 'GEMINI_RATE_LIMITED');
      if (e.message?.includes('403') || e.message?.includes('API_KEY_INVALID')) throw new HttpsError('unauthenticated', 'GEMINI_AUTH_FAILED');
      if (e.message?.includes('not found')) throw new HttpsError('failed-precondition', 'GEMINI_MODEL_UNAVAILABLE');
      if (e.message?.includes('SAFETY')) throw new HttpsError('permission-denied', 'GEMINI_SAFETY_BLOCKED');
      throw new HttpsError('internal', 'GEMINI_TIMEOUT');
    }
  }

  async generatePackage(prompt: string, settings: PackageGenerationSettings): Promise<GeneratedPackageDraft> {
    const schema = {
      type: "OBJECT",
      properties: {
        metadata: {
          type: "OBJECT",
          properties: {
            name: { type: "STRING" },
            description: { type: "STRING" },
            language: { type: "STRING" },
            status: { type: "STRING" },
            version: { type: "NUMBER" },
            categoryCount: { type: "NUMBER" },
            activeQuestionCount: { type: "NUMBER" },
            reserveQuestionCount: { type: "NUMBER" },
            validationSummary: { type: "STRING" }
          },
          required: ["name", "description", "language", "status", "version", "categoryCount", "activeQuestionCount", "reserveQuestionCount"]
        },
        categories: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              id: { type: "STRING" },
              name: { type: "STRING" },
              description: { type: "STRING" },
              tags: { type: "ARRAY", items: { type: "STRING" } },
              status: { type: "STRING" },
              type: { type: "STRING" },
              difficulty: { type: "OBJECT" },
              questions: { type: "ARRAY", items: { type: "OBJECT" } }
            },
            required: ["id", "name", "description", "tags", "status", "type"]
          }
        }
      },
      required: ["metadata", "categories"]
    };
    
    return await this.callGemini(this.config.generationModel, `Wygeneruj pakiet. Kontekst: ${prompt}`, schema) as GeneratedPackageDraft;
  }

  async generateCategory(request: GenerateCategoryRequest): Promise<GeneratedCategoryDraft> {
    throw new Error('Not implemented completely in stub');
  }

  async fillCategory(request: FillCategoryRequest): Promise<GeneratedQuestionDraft[]> {
    throw new Error('Not implemented completely in stub');
  }

  async regenerateQuestion(request: RegenerateQuestionRequest): Promise<GeneratedQuestionDraft> {
    throw new Error('Not implemented completely in stub');
  }

  async validateQuestion(question: Question): Promise<ValidationResult> {
    const schema = {
      type: "OBJECT",
      properties: {
        state: { type: "STRING" },
        confidence: { type: "NUMBER" },
        issues: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: { type: { type: "STRING" }, severity: { type: "STRING" }, message: { type: "STRING" } }
          }
        }
      },
      required: ["state", "confidence", "issues"]
    };
    return await this.callGemini(this.config.validationModel, `Oceń to pytanie: ${JSON.stringify(question)}`, schema) as ValidationResult;
  }
}
