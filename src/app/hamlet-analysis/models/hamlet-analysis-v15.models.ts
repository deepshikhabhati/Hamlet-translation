export interface SpanOffset {
  start: number;
  end: number;
  text: string;
}

export interface SpanValidation {
  source_valid: boolean;
  target_valid: boolean;
  valid: boolean;
  offset_unit: string;
  end_exclusive: boolean;
  reason?: string;
}

export interface PhraseEvidence {
  evidence_id?: string;
  source_quote: string;
  target_quote: string;
  source_span: SpanOffset | null;
  target_span: SpanOffset | null;
  status: string;
  explanation: string;
  verified?: boolean;
  valid?: boolean;
  span_validation?: SpanValidation;
}

export interface DimensionAnalysis {
  applicable: boolean;
  score: number | null;
  confidence: number | null;
  status: string;
  explanation: string;
  evidence: PhraseEvidence[];
  needs_review: boolean;
}

export interface DimensionReview {
  decision: 'Accept' | 'Reject' | 'Needs Revision' | null;
  score_override: number | null;
  comment: string | null;
  reviewer?: string | null;
  reviewed_at?: string | null;
}

export interface ExpertReview {
  status: 'pending' | 'in_progress' | 'completed' | string;
  reviewer: string | null;
  reviewed_at: string | null;
  dimension_reviews: {
    human_german: Record<string, DimensionReview>;
    ai_german: Record<string, DimensionReview>;
    context_ai_german: Record<string, DimensionReview>;
    [key: string]: Record<string, DimensionReview>;
  };
}

export interface AnalysisDialogue {
  dialogue_id: string;
  speaker: string;
  texts: {
    english: string;
    human_german?: string;
    ai_german?: string;
    context_ai_german?: string;
    [key: string]: string | undefined;
  };
  analysis: {
    human_german?: Record<string, DimensionAnalysis>;
    ai_german?: Record<string, DimensionAnalysis>;
    context_ai_german?: Record<string, DimensionAnalysis>;
    [key: string]: Record<string, DimensionAnalysis> | undefined;
  };
  expert_review?: ExpertReview;
}

export interface DimensionSummaryScore {
  score: number | null;
  units: number;
  total_units: number;
  method?: string;
}

export interface IntegratedReviewQueueItem {
  review_id: string;
  dialogue_id: string;
  scene_id: string;
  act: number;
  scene_number: number;
  speaker: string;
  english: string;
  translation_version: string;
  dimension: string;
  score: number | null;
  confidence: number | null;
  reasons: string[];
  invalid_evidence_ids: string[];
  expert_review_status: string;
}

export interface AnalysisScene {
  scene_id: string;
  act: number;
  scene_number: number;
  title: string;
  analyzed_count?: number;
  total_dialogues?: number;
  review_dialogues_count?: number;
  dialogues: AnalysisDialogue[];
  scores?: {
    human_german?: Record<string, DimensionSummaryScore>;
    ai_german?: Record<string, DimensionSummaryScore>;
    context_ai_german?: Record<string, DimensionSummaryScore>;
    [key: string]: Record<string, DimensionSummaryScore> | undefined;
  } | null;
}

export interface AnalysisAct {
  act: number;
  scenes: AnalysisScene[];
  scores?: {
    human_german?: Record<string, DimensionSummaryScore>;
    ai_german?: Record<string, DimensionSummaryScore>;
    context_ai_german?: Record<string, DimensionSummaryScore>;
    [key: string]: Record<string, DimensionSummaryScore> | undefined;
  };
}

export interface HamletUiAnalysisData {
  metadata: {
    title: string;
    dimensions: string[];
    versions: string[];
    score_type: string;
    span_offsets: string;
    aggregation: string;
    model?: string;
    total_dialogues?: number;
    analyzed_dialogues?: number;
    not_analyzed_dialogues?: number;
    scene_count?: number;
    review_assessment_count?: number;
    review_unique_dialogue_count?: number;
    review_reason_counts?: {
      model_needs_review?: number;
      low_confidence_below_0_70?: number;
      invalid_evidence_span?: number;
      [key: string]: number | undefined;
    };
    review_schema_version?: string;
    review_notes?: string;
    span_validation_summary?: {
      total_evidence: number;
      invalid_evidence: number;
    };
    [key: string]: any;
  };
  acts: AnalysisAct[];
  review_queue?: IntegratedReviewQueueItem[];
  scene_summaries?: Array<{
    scene_id: string;
    analyzed: number;
    total: number;
    review_dialogues: number;
  }>;
  scores?: {
    human_german?: Record<string, DimensionSummaryScore>;
    ai_german?: Record<string, DimensionSummaryScore>;
    context_ai_german?: Record<string, DimensionSummaryScore>;
    [key: string]: Record<string, DimensionSummaryScore> | undefined;
  };
}

export const DIMENSION_DEFINITIONS = [
  { key: 'semantic', name: 'Semantic', short: 'Semantic' },
  { key: 'emotion', name: 'Emotion', short: 'Emotion' },
  { key: 'metaphor_imagery', name: 'Metaphor / imagery', short: 'Metaphor' },
  { key: 'tone', name: 'Tone', short: 'Tone' },
  { key: 'character_voice', name: 'Character voice', short: 'Voice' },
  { key: 'wordplay', name: 'Wordplay', short: 'Wordplay' },
  { key: 'cultural_archaic', name: 'Cultural / archaic', short: 'Cultural' },
  { key: 'omissions_additions', name: 'Omissions / additions', short: 'Omissions' }
];

export const VERSION_DEFINITIONS = [
  { key: 'human_german', name: 'Human DE', short: 'Human' },
  { key: 'ai_german', name: 'AI DE', short: 'AI' },
  { key: 'context_ai_german', name: 'Context AI DE', short: 'Context AI' }
];
