/**
 * Heidi Translation Analysis v1.0 — data model.
 * Built in the browser from src/assets/data/heidi_part1_side_by_side.json (the only Heidi dataset);
 * scores are computed by scoring/heidi-scoring.ts. Kept independent from the
 * Hamlet v1.5 models so that neither project can affect the other.
 */

export type HeidiAlignmentStatus =
  | 'verified'
  | 'aligned'
  | 'needs_review'
  | 'low_confidence'
  | 'unmatched_de'
  | 'unmatched_en'
  /** High-confidence group that the literary assessor found misaligned on reading. */
  | 'disputed';

export type HeidiPassageType = 'narration' | 'dialogue' | 'mixed';

export type HeidiDimensionKey =
  | 'semantic'
  | 'emotion'
  | 'imagery'
  | 'tone'
  | 'voice'
  | 'cultural'
  | 'omissions'
  | 'wordplay';

export function normalizeDimensionKey(key: string): HeidiDimensionKey {
  switch (key) {
    case 'metaphor_imagery':
      return 'imagery';
    case 'character_voice':
      return 'voice';
    case 'cultural_archaic':
      return 'cultural';
    case 'omissions_additions':
      return 'omissions';
    default:
      return key as HeidiDimensionKey;
  }
}

export interface HeidiSpan {
  start: number;
  end: number;
  text: string;
  category?: string;
}

export interface HeidiPhraseEvidence {
  id: string;
  de: HeidiSpan | null;
  en: HeidiSpan | null;
  kind: string;
  label?: string;
  explanation: string;
  confidence: 'low' | 'medium' | 'high';
  /** Literary-analysis fields (heidi_literary_analysis.json). */
  weight?: number;
  source_phrase?: string | null;
  target_phrase?: string | null;
  span_status?: string;
  /** Applies to the passage as a whole: counted in the score, never highlighted. */
  passage_level?: boolean;
  requires_expert_review?: boolean;
  sentence_alignment_verified?: boolean | null;
  provenance?: string;
}

export interface HeidiDimensionAssessment {
  /** scored = rubric score; not_applicable = feature absent (N/A); not_assessed = "Not evaluated"; uncertain = only uncertain evidence. */
  status: 'scored' | 'not_applicable' | 'not_assessed' | 'uncertain';
  applicability?: 'evaluated' | 'not_applicable' | 'not_evaluated' | 'uncertain';
  category_counts?: Record<string, number>;
  evidence_count?: number;
  score: number | null;
  explanation: string;
  evidence_de: HeidiSpan[];
  evidence_en: HeidiSpan[];
  phrase_evidence: HeidiPhraseEvidence[];
  method: string;
  provisional: boolean;
  confidence: 'low' | 'medium' | 'high' | null;
  review_status: string;
  shift_categories?: string[];
  possible_omissions?: number;
  possible_additions?: number;
  length_ratio_vs_chapter?: number;
}

export interface HeidiAlignment {
  status: HeidiAlignmentStatus;
  bead: string;
  /** Ordinal used for sorting only (verified 1, high 0.8, medium 0.5, low 0.2, unmatched 0) — not a probability. */
  confidence: number;
  /** Confidence exactly as given by the curated alignment file: verified / high / medium / low / unmatched. */
  confidence_label?: string;
  chapter_alignment_status?: string;
  note?: string | null;
  components: Record<string, number>;
  structurally_supported: boolean;
  method: string;
  source_pages_de: number[];
  source_pages_en: number[];
  print_pages_en: number[];
}

export interface HeidiRoundTrip {
  status: 'not_run' | 'running' | 'agreement' | 'disagreement' | 'failed' | 'expert_reviewed';
  /** v2 direction: German original → AI English. */
  back_translated_english?: string | null;
  /** @deprecated v1 direction (English → German); always null in v2. */
  back_translated_german: string | null;
  translation_model: string | null;
  similarity_model: string | null;
  direct_semantic_score: number | null;
  rtt_semantic_score: number | null;
  disagreement: number | null;
  requires_expert_review: boolean;
  generated_at: string | null;
  input_hash: string | null;
  error?: string | null;
}

export interface HeidiPassage {
  passage_id: string;
  part_id: string;
  chapter_id: string;
  section_id: string | null;
  sequence: number;
  passage_type: HeidiPassageType;
  speaker: string | null;
  speaker_label: string | null;
  speaker_conflict: boolean;
  german_text: string | null;
  english_text: string | null;
  source: {
    de_paragraph_indices: number[];
    en_paragraph_indices: number[];
    /** Stable paragraph IDs from heidi_part1_side_by_side.json (en-CC-PPP / de-CC-PPP). */
    en_paragraph_ids?: string[];
    de_paragraph_ids?: string[];
    de_offsets: number[][];
    en_offsets: number[][];
  };
  alignment: HeidiAlignment;
  analysis: {
    status: 'literary_provisional' | 'automated_provisional' | 'blocked_alignment_review' | 'not_applicable_unmatched'
      | 'alignment_disputed' | 'awaiting_analysis';
    method: string | null;
    dimensions: Partial<Record<HeidiDimensionKey, HeidiDimensionAssessment>>;
    note?: string;
    assessor?: string | null;
    sentence_alignment?: { sentences_de: number; sentences_en: number; links: number; link_types: Record<string, number>; unmatched_de: number; unmatched_en: number } | null;
    sentences?: { de: [number, number][]; en: [number, number][] } | null;
    sentence_alignments?: import('../literary/heidi-literary').LitSentenceAlignment[];
  };
  round_trip_verification: HeidiRoundTrip;
  expert_review: { status: string };
}

export interface HeidiChapter {
  chapter_id: string;
  chapter_number: number;
  title_en: string;
  title_de: string;
  editorial_sections: null | unknown[];
  /** 'verified' (chapter 1) or 'automatic' — from the curated alignment file. */
  alignment_status?: string;
  source_paragraphs: { de: number; en: number };
  chapter_char_ratio_en_de: number;
  passages: HeidiPassage[];
}

export interface HeidiPart {
  part_id: string;
  title_en: string;
  title_de: string;
  chapters: HeidiChapter[];
}

export interface HeidiDataset {
  project_id: 'heidi';
  version: string;
  generated_at: string;
  author: string;
  original_language: 'de';
  translation_language: 'en';
  translator: string;
  sources: Record<string, unknown>;
  scope: { part: number; chapter_start: number; chapter_end: number };
  methods: Record<string, string>;
  editorial_notes: { chapter: number; type: string; note: string }[];
  parts: HeidiPart[];
}

/** Expert review record for one Heidi passage (stored under heidi_analysis_reviews_v1). */
export interface HeidiAlignmentDecision {
  decision: 'accept' | 'reject' | 'correct' | null;
  correction_note: string | null;
}

export interface HeidiDimensionReview {
  /** accept / override change the displayed score; reject / revise record a verdict but keep the automated value (provenance shown). */
  decision: 'accept' | 'override' | 'reject' | 'revise' | null;
  score_override: number | null;
  comment: string | null;
  /** Expert Feedback: optional revised preservation classification and corrected translation / phrase. */
  revised_classification?: 'Preserved' | 'Changed' | 'Lost' | 'Added' | 'Uncertain' | null;
  corrected_translation?: string | null;
  /** Set when the corrected translation came from the AI assistant and the expert approved it. */
  corrected_translation_source?: 'expert' | 'ai_assistant_approved' | null;
}

export interface HeidiPassageReview {
  passage_id: string;
  reviewer: string | null;
  reviewed_at: string | null;
  alignment: HeidiAlignmentDecision;
  omission_addition: 'none' | 'omission' | 'addition' | 'both' | null;
  dimensions: Partial<Record<HeidiDimensionKey, HeidiDimensionReview>>;
  rtt_inaccurate: boolean;
  rtt_corrected_semantic_score: number | null;
  commentary: string | null;
}

export interface HeidiDimensionMeta {
  key: HeidiDimensionKey;
  label: string;
  short: string;
  description: string;
  optional?: boolean;
}

export const HEIDI_DIMENSIONS: HeidiDimensionMeta[] = [
  { key: 'semantic', label: 'Semantic Preservation', short: 'Semantic', description: 'Preservation of meaning, facts, and relationships.' },
  { key: 'emotion', label: 'Emotional Preservation', short: 'Emotion', description: 'Preservation of emotional intensity and sentiment.' },
  { key: 'imagery', label: 'Metaphor & Imagery', short: 'Imagery', description: 'Natural imagery, description and figurative language.' },
  { key: 'tone', label: 'Tone & Register', short: 'Tone', description: 'Narrative tone, formality and stylistic atmosphere.' },
  { key: 'voice', label: 'Narrative & Character Voice', short: 'Voice', description: 'Narrator style and character speech.' },
  { key: 'cultural', label: 'Cultural & Historical Context', short: 'Cultural', description: 'Swiss Alpine references, regional language, customs, historical terms.' },
  { key: 'omissions', label: 'Omissions & Additions', short: 'Omit/Add', description: 'Meaningful information removed, condensed, expanded or introduced.' },
  { key: 'wordplay', label: 'Wordplay', short: 'Wordplay', description: 'Puns and play on words (optional; expert-assessed only).', optional: true },
];

export const ALIGNMENT_STATUS_LABELS: Record<HeidiAlignmentStatus, string> = {
  verified: 'Verified alignment (checked by reading)',
  aligned: 'Automatic alignment — high confidence (unreviewed)',
  needs_review: 'Needs Alignment Review — medium confidence',
  low_confidence: 'Needs Alignment Review — low confidence',
  unmatched_de: 'Unmatched German (possible omission)',
  unmatched_en: 'Unmatched English (possible addition)',
  disputed: 'Alignment disputed on reading — needs re-alignment',
};

export const RTT_STATUS_LABELS: Record<HeidiRoundTrip['status'], string> = {
  not_run: 'Not evaluated',
  running: 'Running',
  /** Below an uncalibrated threshold: reported neutrally, never as "agreement". */
  agreement: 'Evaluated',
  disagreement: 'Potential disagreement',
  failed: 'Failed',
  expert_reviewed: 'Expert reviewed',
};

/** v2: passage IDs are the alignment-group IDs of heidi_part1_side_by_side.json (chCC-aGGG). */
export const HEIDI_REVIEW_STORAGE_KEY = 'heidi_analysis_reviews_v2';
/** v2: RTT direction German original → AI English, compared with Stork's English. */
export const HEIDI_RTT_STORAGE_KEY = 'heidi_analysis_rtt_v2';
export const HEIDI_ALIGNMENT_URL = 'assets/data/heidi_part1_side_by_side.json';
export const HEIDI_PASSAGE_ID_RE = /^ch\d\d-a\d{3}$/;
export const HEIDI_RTT_THRESHOLD_DEFAULT = 15;
