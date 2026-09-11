export interface EmbeddingComparisonLanguageDetail {
  matchedConcepts: string[];
  reasoning: string;
  chronologyScore: number;
  semanticScore: number;
}

export interface EmbeddingComparisonDifference {
  category: string;
  english: string;
  german: string;
  impact: string;
}

export interface EmbeddingComparisonResponse {
  summary: string;
  english: EmbeddingComparisonLanguageDetail;
  german: EmbeddingComparisonLanguageDetail;
  differences: EmbeddingComparisonDifference[];
  finalConclusion: string;
}

export interface EmbeddingComparisonRequest {
  english_query: string;
  german_query: string;
  english_paragraph: string;
  german_paragraph: string;
  model?: string;
}

export interface EmbeddingComparisonState {
  loading?: boolean;
  error?: string;
  data?: EmbeddingComparisonResponse;
  englishTopicPath?: string;
  germanTopicPath?: string;
  englishQuery?: string;
  germanQuery?: string;
}
