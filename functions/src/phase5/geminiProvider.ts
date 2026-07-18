import { 
  GamePackage, Category, Question, 
  PackageGenerationSettings, GeneratedPackageDraft, 
  GenerateCategoryRequest, GeneratedCategoryDraft,
  FillCategoryRequest, GeneratedQuestionDraft,
  RegenerateQuestionRequest, ValidationResult
} from 'shared/src/phase5/models';

export interface AIContentProvider {
  generatePackage(
    prompt: string,
    settings: PackageGenerationSettings
  ): Promise<GeneratedPackageDraft>;

  generateCategory(
    request: GenerateCategoryRequest
  ): Promise<GeneratedCategoryDraft>;

  fillCategory(
    request: FillCategoryRequest
  ): Promise<GeneratedQuestionDraft[]>;

  regenerateQuestion(
    request: RegenerateQuestionRequest
  ): Promise<GeneratedQuestionDraft>;

  validateQuestion(
    question: Question
  ): Promise<ValidationResult>;
}

export class MockContentProvider implements AIContentProvider {
  async generatePackage(prompt: string, settings: PackageGenerationSettings): Promise<GeneratedPackageDraft> {
    return {
      metadata: {
        name: 'Wiedza Ogólna - Mock',
        description: prompt,
        language: 'pl',
        status: 'DRAFT',
        version: 1,
        categoryCount: settings.categoryCount,
        activeQuestionCount: settings.categoryCount * settings.questionsPerCategory,
        reserveQuestionCount: settings.categoryCount * settings.reserveQuestionsPerCategory,
        validationSummary: null
      },
      categories: []
    };
  }
  async generateCategory(req: GenerateCategoryRequest): Promise<GeneratedCategoryDraft> { 
    return {
      id: 'mock-cat',
      name: req.topic,
      description: 'Opis kategorii',
      tags: [],
      status: 'DRAFT',
      type: 'TEXT',
      difficulty: { 'EASY': 5 },
      questions: []
    };
  }
  async fillCategory(req: FillCategoryRequest): Promise<GeneratedQuestionDraft[]> { 
    return [];
  }
  async regenerateQuestion(req: RegenerateQuestionRequest): Promise<GeneratedQuestionDraft> { 
    return {
      id: req.questionId,
      categoryId: req.categoryId,
      canonicalAnswer: 'Mock Answer',
      acceptedAnswers: [],
      prompt: 'Zregenerowane pytanie mock',
      type: 'TEXT_OPEN',
      difficulty: 'MEDIUM',
      hostNote: null,
      status: 'ACTIVE'
    };
  }
  async validateQuestion(q: Question): Promise<ValidationResult> { 
    return {
      state: 'VALID',
      confidence: 0.95,
      issues: []
    };
  }
}
