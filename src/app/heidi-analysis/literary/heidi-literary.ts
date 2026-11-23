/**
 * Heidi eight-dimension literary analysis — client-side adapter.
 *
 * The analysis is produced OUTSIDE Angular by scripts/heidi_literary_pipeline.py and stored in
 * src/assets/data/heidi_literary_analysis.json (schema heidi-literary-analysis-v1). That file holds
 * evidence, spans and rubric scores only; all passage text still comes from heidi_part1_side_by_side.json.
 * This module maps the file onto the existing HeidiPassage['analysis'] model. Nothing here computes a score.
 */
import { HeidiDimensionAssessment, HeidiDimensionKey, HeidiPassage, HeidiPhraseEvidence, HeidiSpan } from '../models/heidi.models';

export const HEIDI_LITERARY_URL = 'assets/data/heidi_literary_analysis.json';
export const HEIDI_LITERARY_SCHEMA = 'heidi-literary-analysis-v1';

export type LitCategory = 'preserved' | 'changed' | 'lost' | 'added' | 'uncertain';
export type LitApplicability = 'evaluated' | 'not_applicable' | 'not_evaluated' | 'uncertain';

export interface LitSpan { start: number; end: number; text: string }

export interface LitEvidence {
  evidence_id: string;
  passage_id: string;
  dimension: HeidiDimensionKey;
  category: LitCategory;
  weight: number;
  source_language: 'de';
  source_phrase: string | null;
  target_language: 'en';
  target_phrase: string | null;
  source_span: LitSpan | null;
  target_span: LitSpan | null;
  span_status: 'located' | 'located_by_alignment' | 'ambiguous_occurrence' | 'unlocated' | 'passage_level';
  sentence_alignment_verified: boolean | null;
  explanation: string;
  confidence: 'low' | 'medium' | 'high';
  requires_expert_review: boolean;
  provenance: string;
}

export interface LitDimension {
  applicability: LitApplicability;
  score: number | null;
  confidence: 'low' | 'medium' | 'high' | null;
  method: string;
  evidence_count: number;
  category_counts: Record<LitCategory, number>;
  explanation: string;
  review_status: string;
}

export interface LitPassage {
  status: 'analyzed' | 'awaiting_alignment_review' | 'awaiting_analysis' | 'stale_assessment' | 'alignment_disputed';
  alignment_confidence: string;
  assessor?: string;
  text_hash?: string;
  has_dialogue?: boolean;
  review_reason?: string;
  sentence_alignment?: { sentences_de: number; sentences_en: number; links: number; link_types: Record<string, number>; unmatched_de: number; unmatched_en: number };
  dimensions?: Partial<Record<HeidiDimensionKey, LitDimension>>;
  evidence?: LitEvidence[];
}

export interface LitFile {
  schema: string;
  generated_at: string;
  method: string;
  rubric: Record<string, unknown>;
  coverage: Record<string, any>;
  passages: Record<string, LitPassage>;
}

export const LIT_CATEGORY_LABEL: Record<LitCategory, 'Preserved' | 'Changed' | 'Lost' | 'Added' | 'Uncertain'> = {
  preserved: 'Preserved', changed: 'Changed', lost: 'Lost', added: 'Added', uncertain: 'Uncertain',
};

export const LIT_METHOD =
  'Eight-dimension phrase-level comparison (German original authoritative); model-assisted, provisional; rubric_v1. See docs/HEIDI_LITERARY_ANALYSIS.md.';

/** Code-point length-safe slice used to verify a span against the displayed text. */
function cpSlice(text: string | null, s: LitSpan | null): string | null {
  if (!text || !s) { return null; }
  return Array.from(text).slice(s.start, s.end).join('');
}

function toSpan(s: LitSpan | null, text: string | null): { span: HeidiSpan | null; ok: boolean } {
  if (!s) { return { span: null, ok: true }; }
  const ok = cpSlice(text, s) === s.text;
  return { span: ok ? { start: s.start, end: s.end, text: s.text } : null, ok };
}

/** Map one literary dimension + its evidence onto the UI assessment model. N/A and not-evaluated never become 0. */
export function mapDimension(dim: LitDimension, evs: LitEvidence[], de: string | null, en: string | null,
  unlocated: { dimension: string; side: string; text: string; evidence_id?: string }[]): HeidiDimensionAssessment {
  const status: HeidiDimensionAssessment['status'] =
    dim.applicability === 'evaluated' ? 'scored'
      : dim.applicability === 'not_applicable' ? 'not_applicable'
        : dim.applicability === 'uncertain' ? 'uncertain' : 'not_assessed';
  const phrase_evidence: HeidiPhraseEvidence[] = evs.map(e => {
    const d = toSpan(e.source_span, de);
    const t = toSpan(e.target_span, en);
    if (!d.ok) { unlocated.push({ dimension: e.dimension, side: 'de', text: e.source_phrase || '', evidence_id: e.evidence_id }); }
    if (!t.ok) { unlocated.push({ dimension: e.dimension, side: 'en', text: e.target_phrase || '', evidence_id: e.evidence_id }); }
    if (e.span_status === 'unlocated') {
      unlocated.push({ dimension: e.dimension, side: e.source_phrase ? 'de' : 'en', text: (e.source_phrase || e.target_phrase || ''), evidence_id: e.evidence_id });
    }
    return {
      id: e.evidence_id,
      de: d.span,
      en: t.span,
      kind: 'lit:' + e.category,
      label: LIT_CATEGORY_LABEL[e.category],
      explanation: e.explanation,
      confidence: e.confidence,
      weight: e.weight,
      source_phrase: e.source_phrase,
      target_phrase: e.target_phrase,
      span_status: e.span_status,
      passage_level: e.span_status === 'passage_level',
      requires_expert_review: e.requires_expert_review,
      sentence_alignment_verified: e.sentence_alignment_verified,
      provenance: e.provenance,
    };
  });
  return {
    status,
    applicability: dim.applicability,
    score: status === 'scored' ? dim.score : null,
    explanation: dim.explanation,
    evidence_de: [],
    evidence_en: [],
    phrase_evidence,
    method: dim.method,
    provisional: true,
    confidence: dim.confidence,
    review_status: dim.review_status,
    category_counts: dim.category_counts,
    evidence_count: dim.evidence_count,
  };
}

const PENDING_NOTE: Record<string, string> = {
  awaiting_alignment_review: 'Not analysed: the alignment group has medium/low confidence or is unmatched; it must be verified before a literary comparison is meaningful.',
  awaiting_analysis: 'Not analysed yet: no literary assessment has been recorded for this passage.',
  stale_assessment: 'Not shown: the passage text changed after it was assessed; it must be re-assessed.',
  alignment_disputed: 'Not analysed: on reading, the German and English sides of this group are not translations of each other. The alignment must be corrected.',
};

/** Literary analysis for one passage, or the pending state when there is none. */
export function mapPassageAnalysis(lit: LitPassage | undefined, de: string | null, en: string | null):
  { analysis: HeidiPassage['analysis']; unlocated: { dimension: string; side: string; text: string; evidence_id?: string }[]; disputed: string | null } {
  const unlocated: { dimension: string; side: string; text: string; evidence_id?: string }[] = [];
  if (!lit || lit.status !== 'analyzed' || !lit.dimensions) {
    const st = lit?.status ?? 'awaiting_analysis';
    const unmatched = !de || !en;
    return {
      analysis: {
        status: unmatched ? 'not_applicable_unmatched' : st === 'alignment_disputed' ? 'alignment_disputed' : st === 'awaiting_alignment_review' ? 'blocked_alignment_review' : 'awaiting_analysis',
        method: null,
        dimensions: {},
        note: unmatched ? 'Unmatched passage: no counterpart in the other language (possible omission/addition).'
          : (lit?.review_reason ? `${PENDING_NOTE[st]} ${lit.review_reason}` : PENDING_NOTE[st] ?? PENDING_NOTE['awaiting_analysis']),
      },
      unlocated,
      disputed: st === 'alignment_disputed' ? (lit?.review_reason ?? PENDING_NOTE[st]) : null,
    };
  }
  const evs = lit.evidence || [];
  const dims: Partial<Record<HeidiDimensionKey, HeidiDimensionAssessment>> = {};
  for (const [k, d] of Object.entries(lit.dimensions) as [HeidiDimensionKey, LitDimension][]) {
    dims[k] = mapDimension(d, evs.filter(e => e.dimension === k), de, en, unlocated);
  }
  return {
    analysis: { status: 'literary_provisional', method: LIT_METHOD, dimensions: dims, assessor: lit.assessor ?? null,
      sentence_alignment: lit.sentence_alignment ?? null },
    unlocated,
    disputed: null,
  };
}

/** Passage-level counts of evidence categories across all dimensions (used by the compact summary). */
export function categoryTotals(a: HeidiPassage['analysis'], dim?: HeidiDimensionKey): Record<'Preserved' | 'Changed' | 'Lost' | 'Added' | 'Uncertain', number> {
  const out = { Preserved: 0, Changed: 0, Lost: 0, Added: 0, Uncertain: 0 };
  const list = dim ? [a.dimensions[dim]] : Object.values(a.dimensions);
  for (const d of list) {
    for (const e of d?.phrase_evidence || []) {
      const lab = e.label as keyof typeof out;
      if (lab in out) { out[lab]++; }
    }
  }
  return out;
}
