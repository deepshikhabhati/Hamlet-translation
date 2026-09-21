import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, shareReplay, of, catchError } from 'rxjs';

export const VERSIONS = [
  'english',
  'human_german',
  'ai_german',
  'context_ai_german',
] as const;

export type VersionKey = (typeof VERSIONS)[number];

export const TARGET_VERSIONS = [
  'human_german',
  'ai_german',
  'context_ai_german',
] as const;

export const versionLabels: Record<string, string> = {
  english: 'Original English',
  human_german: 'Human German',
  ai_german: 'AI German',
  context_ai_german: 'Context-Aware AI German',
};

export const versionShortLabels: Record<string, string> = {
  english: 'English',
  human_german: 'Human DE',
  ai_german: 'AI DE',
  context_ai_german: 'Context AI',
};

export interface DimensionMeta {
  key: string;
  label: string;
  tooltip: string;
}

export interface PassageFilters {
  search: string;
  act: number | null;
  scene: number | null;
  feature: string;
}

/** Phrase-evidence dimension keys (from hamlet_phrase_alignment_ui.json) */
export const PHRASE_DIMENSION_LABELS: Record<string, string> = {
  semantic: 'Semantic',
  emotion: 'Emotion',
  metaphor: 'Metaphor / Imagery',
  tone: 'Tone',
  character_voice: 'Character Voice',
  wordplay: 'Wordplay',
  cultural_archaic: 'Cultural / Archaic',
  omissions_additions: 'Omissions / Additions',
};

export const PHRASE_DIMENSION_KEYS = Object.keys(PHRASE_DIMENSION_LABELS);

export const COMPARISON_TO_PHRASE_DIM_MAP: Record<string, string> = {
  semantic_preservation: 'semantic',
  semantic: 'semantic',
  emotion: 'emotion',
  metaphor_imagery: 'metaphor',
  metaphor: 'metaphor',
  tone: 'tone',
  character_voice: 'character_voice',
  wordplay: 'wordplay',
  cultural_archaic_language: 'cultural_archaic',
  cultural_archaic: 'cultural_archaic',
  omissions_additions: 'omissions_additions',
};

export const STATUS_META: Record<
  string,
  { className: string; icon: string; label: string; color: string }
> = {
  Preserved: { className: 'status-preserved', icon: 'fa-check-circle', label: 'Preserved', color: '#16a34a' },
  Changed: { className: 'status-changed', icon: 'fa-exchange-alt', label: 'Changed', color: '#d97706' },
  Lost: { className: 'status-lost', icon: 'fa-times-circle', label: 'Lost', color: '#dc2626' },
  Added: { className: 'status-added', icon: 'fa-plus-circle', label: 'Added', color: '#2563eb' },
  'N/A': { className: 'status-not-applicable', icon: 'fa-minus-circle', label: 'N/A', color: '#64748b' },
  'Not Applicable': { className: 'status-not-applicable', icon: 'fa-minus-circle', label: 'N/A', color: '#64748b' },
  'Needs Review': { className: 'status-needs-review', icon: 'fa-question-circle', label: 'Needs Review', color: '#9333ea' },
};

export interface AlignedSpan {
  span_id: string;
  text: string;
  start?: number;
  end?: number;
}

export interface DimensionEvidenceRecord {
  applicable: boolean;
  feature_label?: string;
  classifications: Record<string, string>;
  relevant_spans: Record<string, string[]>;
  computed_rule_evidence: Array<{ rule_id: string; description: string }>;
  explanation: string;
  technical_score?: number | null;
  confidence?: number | null;
}

export interface AlignedPhraseGroup {
  alignment_id: string;
  index: number;
  label: string;
  display_number: string;
  confidence: number;
  confidence_level: 'High' | 'Medium' | 'Low';
  review_status: 'automatic' | 'reviewed' | 'needs_review';
  spans: Record<'english' | 'human_german' | 'ai_german' | 'context_ai_german', AlignedSpan[]>;
  missing: Record<string, boolean>;
  raw_targets: Record<string, any>;
  dimensions: Record<string, DimensionEvidenceRecord>;
}

export interface TextSegment {
  text: string;
  highlighted: boolean;
  spanId?: string;
  isMissingPlaceholder?: boolean;
}

export interface EvidenceFocusContext {
  sourceVersion: string;
  targetVersion: string;
  dimension: string;
}

export interface PhraseValidationRecord {
  passage_id: string;
  alignment_id: string;
  target_version: string;
  dimension: string;
  decision: 'Agree' | 'Partially Agree' | 'Disagree' | null;
  original_status?: string;
  corrected_status?: string | null;
  original_score: number | null;
  corrected_score: number | null;
  comment: string;
  reviewer: string;
  reviewed_at: string | null;
}

export const DIMENSION_META: DimensionMeta[] = [
  {
    key: 'semantic_preservation',
    label: 'Semantic Preservation',
    tooltip:
      'Measures how successfully the target preserves the meaning, intentions, relationships, and implications of the source.',
  },
  {
    key: 'emotion',
    label: 'Emotion',
    tooltip: 'Preservation of emotional cues, intensity, and affective register across the translation.',
  },
  {
    key: 'metaphor_imagery',
    label: 'Metaphor / Imagery',
    tooltip: 'Retention of figurative language, imagery families, and poetic devices.',
  },
  {
    key: 'tone',
    label: 'Tone',
    tooltip: 'Match of rhetorical register, mood, and stylistic tone.',
  },
  {
    key: 'character_voice',
    label: 'Character Voice',
    tooltip:
      "Measures whether the target preserves the speaker's personality, social position, rhetorical style, and dramatic identity.",
  },
  {
    key: 'wordplay',
    label: 'Wordplay',
    tooltip: 'Preservation of puns, repetition, contrast, and rhetorical play.',
  },
  {
    key: 'cultural_archaic_language',
    label: 'Cultural / Archaic Language',
    tooltip: 'Handling of period forms, cultural references, and archaic diction.',
  },
  {
    key: 'omissions_additions',
    label: 'Omissions / Additions',
    tooltip: 'Directional fidelity regarding omitted or added material.',
  },
  {
    key: 'human_preference',
    label: 'Human Preference',
    tooltip:
      'Estimated expert preference for the target as a literary rendering of the source.',
  },
];

const VALIDATION_STORAGE_KEY = 'hamlet_phrase_evidence_validations';

@Injectable({ providedIn: 'root' })
export class HamletDataService {
  private readonly url = 'assets/data/hamlet_4x3_comparison.json';
  private readonly phraseUrl = 'assets/data/hamlet_phrase_alignment_ui.json';
  private cache$?: Observable<any>;
  private phraseCache$?: Observable<any>;
  private phraseDataSnapshot: any = null;

  constructor(private http: HttpClient) {}

  getData(): Observable<any> {
    if (!this.cache$) {
      this.cache$ = this.http.get<any>(this.url).pipe(shareReplay(1));
    }
    return this.cache$;
  }

  getPhraseEvidenceData(): Observable<any> {
    if (!this.phraseCache$) {
      this.phraseCache$ = this.http.get<any>(this.phraseUrl).pipe(
        map((data) => {
          this.phraseDataSnapshot = data;
          return data;
        }),
        catchError(() => {
          this.phraseDataSnapshot = null;
          return of(null);
        }),
        shareReplay(1)
      );
    }
    return this.phraseCache$;
  }

  getPhrasePassageById(passageId: string): any | null {
    const passages = this.phraseDataSnapshot?.passages;
    if (!passages || !passageId) {
      return null;
    }
    return passages.find((p: any) => p.passage_id === passageId) ?? null;
  }

  getEvidencePassage(passageId: string | null | undefined): any | null {
    return this.getPhrasePassageById(passageId || '');
  }

  getAlignedPhrases(passageId: string): AlignedPhraseGroup[] {
    const passage = this.getPhrasePassageById(passageId);
    if (!passage) {
      return [];
    }
    if (Array.isArray(passage.aligned_phrases) && passage.aligned_phrases.length > 0) {
      return passage.aligned_phrases.map((item: any, idx: number) =>
        this.adaptPhraseAlignmentToGroup(item, idx + 1, passage)
      );
    }
    if (Array.isArray(passage.phrase_alignments) && passage.phrase_alignments.length > 0) {
      return passage.phrase_alignments.map((item: any, idx: number) =>
        this.adaptPhraseAlignmentToGroup(item, idx + 1, passage)
      );
    }
    return [];
  }

  private adaptPhraseAlignmentToGroup(
    item: any,
    index: number,
    passage: any
  ): AlignedPhraseGroup {
    const pad = String(index).padStart(2, '0');
    const alignmentId = item.alignment_id || `${passage?.passage_id || 'P'}-AL-${pad}`;
    const displayNumber = `Aligned Phrase ${pad}`;

    const enText = item.english_phrase?.text || item.spans?.english?.[0]?.text || '';
    const humanTarget = item.targets?.human_german || item.spans?.human_german?.[0];
    const aiTarget = item.targets?.ai_german || item.spans?.ai_german?.[0];
    const contextTarget = item.targets?.context_ai_german || item.spans?.context_ai_german?.[0];

    const humanText = typeof humanTarget === 'string' ? humanTarget : humanTarget?.text || '';
    const aiText = typeof aiTarget === 'string' ? aiTarget : aiTarget?.text || '';
    const contextText = typeof contextTarget === 'string' ? contextTarget : contextTarget?.text || '';

    const spans: Record<'english' | 'human_german' | 'ai_german' | 'context_ai_german', AlignedSpan[]> = {
      english: enText
        ? [{ span_id: item.english_phrase?.phrase_id || `en-${pad}`, text: enText, start: 0, end: enText.length }]
        : [],
      human_german: humanText
        ? [{ span_id: humanTarget?.phrase_id || `human-${pad}`, text: humanText, start: 0, end: humanText.length }]
        : [],
      ai_german: aiText
        ? [{ span_id: aiTarget?.phrase_id || `ai-${pad}`, text: aiText, start: 0, end: aiText.length }]
        : [],
      context_ai_german: contextText
        ? [{ span_id: contextTarget?.phrase_id || `context-${pad}`, text: contextText, start: 0, end: contextText.length }]
        : [],
    };

    const missing: Record<string, boolean> = {
      english: !enText.trim(),
      human_german: !humanText.trim(),
      ai_german: !aiText.trim(),
      context_ai_german: !contextText.trim(),
    };

    const dimensions: Record<string, DimensionEvidenceRecord> = {};
    let totalScore = 0;
    let scoreCount = 0;
    let anyNeedsReview = item.review_status === 'needs_review';

    for (const dimKey of PHRASE_DIMENSION_KEYS) {
      // Check if item already has direct dimensions mapping
      const directDim = item.dimensions?.[dimKey];
      if (directDim) {
        dimensions[dimKey] = {
          applicable: directDim.applicable !== false,
          feature_label: directDim.feature_label || item.label || PHRASE_DIMENSION_LABELS[dimKey],
          classifications: directDim.classifications || {
            human_german: 'Changed',
            ai_german: 'Preserved',
            context_ai_german: 'Preserved',
          },
          relevant_spans: directDim.relevant_spans || { english: [], human_german: [], ai_german: [], context_ai_german: [] },
          computed_rule_evidence: (directDim.computed_rule_evidence || []).map((r: any) =>
            typeof r === 'string' ? { rule_id: r, description: this.describeRule(r) } : r
          ),
          explanation: directDim.explanation || 'Analyzed literary dimension.',
          technical_score: directDim.technical_score ?? 80,
          confidence: directDim.confidence ?? 0.9,
        };
        continue;
      }

      const humanEv = item.targets?.human_german?.evidence?.find((e: any) => e.dimension === dimKey);
      const aiEv = item.targets?.ai_german?.evidence?.find((e: any) => e.dimension === dimKey);
      const ctxEv = item.targets?.context_ai_german?.evidence?.find((e: any) => e.dimension === dimKey);

      const applicable = !!(
        (humanEv && humanEv.applicable !== false) ||
        (aiEv && aiEv.applicable !== false) ||
        (ctxEv && ctxEv.applicable !== false)
      );

      const classifications: Record<string, string> = {
        human_german: this.normalizeStatus(humanEv?.status, applicable),
        ai_german: this.normalizeStatus(aiEv?.status, applicable),
        context_ai_german: this.normalizeStatus(ctxEv?.status, applicable),
      };

      if (Object.values(classifications).includes('Needs Review')) {
        anyNeedsReview = true;
      }

      const rulesSet = new Set<string>();
      [humanEv, aiEv, ctxEv].forEach((ev) => {
        if (ev?.rules) {
          ev.rules.forEach((r: any) => {
            if (typeof r === 'string') rulesSet.add(r);
            else if (r?.rule_id) rulesSet.add(r.rule_id);
          });
        }
      });

      const explanation =
        ctxEv?.explanation ||
        aiEv?.explanation ||
        humanEv?.explanation ||
        (applicable
          ? `Feature correspondence analyzed across targets for ${PHRASE_DIMENSION_LABELS[dimKey]}.`
          : `N/A — No relevant ${PHRASE_DIMENSION_LABELS[dimKey].toLowerCase()} cues detected in this aligned phrase.`);

      const score = ctxEv?.score ?? aiEv?.score ?? humanEv?.score ?? null;
      if (score != null) {
        totalScore += score;
        scoreCount++;
      }

      const relevantSpans: Record<string, string[]> = {
        english: humanEv?.source_features || aiEv?.source_features || ctxEv?.source_features || [],
        human_german: humanEv?.target_features || [],
        ai_german: aiEv?.target_features || [],
        context_ai_german: ctxEv?.target_features || [],
      };

      const featureLabel =
        ctxEv?.feature_label ||
        aiEv?.feature_label ||
        humanEv?.feature_label ||
        item.label ||
        PHRASE_DIMENSION_LABELS[dimKey];

      dimensions[dimKey] = {
        applicable,
        feature_label: featureLabel,
        classifications,
        relevant_spans: relevantSpans,
        computed_rule_evidence: Array.from(rulesSet).map((rid) => ({
          rule_id: rid,
          description: this.describeRule(rid),
        })),
        explanation,
        technical_score: score,
        confidence: applicable ? 0.92 : 0.7,
      };
    }

    const avgScore = scoreCount > 0 ? totalScore / scoreCount : 80;
    const confidence = item.confidence ?? (anyNeedsReview ? 0.65 : Math.min(0.95, Math.max(0.75, avgScore / 100)));
    const confidenceLevel: 'High' | 'Medium' | 'Low' =
      confidence >= 0.85 ? 'High' : confidence >= 0.7 ? 'Medium' : 'Low';

    const reviewStatus: 'automatic' | 'reviewed' | 'needs_review' =
      item.review_status || (anyNeedsReview || confidence < 0.7 ? 'needs_review' : 'automatic');

    const label = item.label || passage?.primary_research_feature || displayNumber;

    return {
      alignment_id: alignmentId,
      index,
      label,
      display_number: displayNumber,
      confidence,
      confidence_level: confidenceLevel,
      review_status: reviewStatus,
      spans,
      missing,
      raw_targets: item.targets || {},
      dimensions,
    };
  }

  normalizeStatus(status: string | undefined, applicable: boolean): string {
    if (!applicable || !status || status === 'Not Applicable' || status === 'N/A') {
      return 'N/A';
    }
    const s = String(status).trim();
    if (s === 'Preserved') return 'Preserved';
    if (s === 'Changed') return 'Changed';
    if (s === 'Lost') return 'Lost';
    if (s === 'Added') return 'Added';
    if (s.toLowerCase().includes('review')) return 'Needs Review';
    return s;
  }

  describeRule(ruleId: string): string {
    const map: Record<string, string> = {
      R_LENGTH_CONTENT_RATIO: 'Content length & token ratio correspondence',
      R_PUNCTUATION_RHETORIC: 'Punctuation & rhetorical cadence matching',
      R_BILINGUAL_CUE_PRESERVATION: 'Bilingual lexical cue preservation',
      R_METAPHOR_BODY: 'Body-part & figurative imagery detection',
      R_HEART_MAPPING: 'Direct mapping of core figurative imagery (heart/Herz)',
      R_EMOTION_DISTRESS: 'Affective state & distress marker correspondence',
      R_VOICE_FORMALITY: 'Dramatic register & social hierarchy formality',
      R_WORDPLAY_PUN: 'Polysemous wordplay & rhetorical contrast retention',
      R_ARCHAIC_DICTION: 'Handling of period diction & archaic syntax',
      R_OMISSION_ADDITION: 'Directional fidelity on omitted/added material',
    };
    return map[ruleId] || ruleId.replace(/_/g, ' ');
  }

  getRelevantSpans(
    alignment: AlignedPhraseGroup,
    version: string,
    dimension: string,
    isEnglishTranslation: boolean = false
  ): TextSegment[] {
    if (alignment.missing[version]) {
      return [{ text: 'NO CORRESPONDING SPAN', highlighted: false, isMissingPlaceholder: true }];
    }

    let rawText = '';
    if (isEnglishTranslation && (version === 'ai_german' || version === 'context_ai_german')) {
      const tgt = alignment.raw_targets?.[version];
      rawText = tgt?.english_translation || '';
    } else {
      const spanList = alignment.spans[version as keyof AlignedPhraseGroup['spans']] || [];
      rawText = spanList.map((s) => s.text).join(' ');
    }

    if (!rawText || !rawText.trim()) {
      return [{ text: 'NO CORRESPONDING SPAN', highlighted: false, isMissingPlaceholder: true }];
    }

    const dimRecord = alignment.dimensions[dimension];
    if (!dimRecord || !dimRecord.applicable) {
      return [{ text: rawText, highlighted: false }];
    }

    const keywords = dimRecord.relevant_spans[version] || [];
    if (keywords.length > 0) {
      return this.segmentByKeywords(rawText, keywords);
    }

    return [{ text: rawText, highlighted: true }];
  }

  private segmentByKeywords(text: string, keywords: string[]): TextSegment[] {
    const validKeywords = keywords.filter((k) => typeof k === 'string' && k.trim().length > 0);
    if (validKeywords.length === 0) {
      return [{ text, highlighted: true }];
    }

    const escaped = validKeywords
      .map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .sort((a, b) => b.length - a.length);

    try {
      const regex = new RegExp(`(${escaped.join('|')})`, 'gi');
      const parts = text.split(regex);
      const segments: TextSegment[] = [];

      for (const part of parts) {
        if (!part) continue;
        const isMatch = validKeywords.some((k) => k.toLowerCase() === part.toLowerCase());
        segments.push({
          text: part,
          highlighted: isMatch,
        });
      }
      return segments.length ? segments : [{ text, highlighted: true }];
    } catch {
      return [{ text, highlighted: true }];
    }
  }

  getDimensionEvidence(alignment: any, dimension: string): any {
    if (!alignment) return null;
    if (alignment.dimensions?.[dimension]) {
      return alignment.dimensions[dimension];
    }
    return null;
  }

  getPairwiseEvidenceContributors(
    passageId: string,
    sourceVersion: string,
    targetVersion: string,
    dimension: string
  ): string[] {
    const phrases = this.getAlignedPhrases(passageId);
    const targetKey = targetVersion;
    const contributors: string[] = [];

    for (const phrase of phrases) {
      const dimRecord = phrase.dimensions[dimension];
      if (!dimRecord || !dimRecord.applicable) {
        continue;
      }
      const status = dimRecord.classifications[targetKey];
      if (
        status === 'Changed' ||
        status === 'Lost' ||
        status === 'Added' ||
        (dimRecord.technical_score != null && dimRecord.technical_score < 85)
      ) {
        contributors.push(phrase.alignment_id);
      }
    }
    if (contributors.length === 0) {
      return phrases
        .filter((p) => p.dimensions[dimension]?.applicable)
        .map((p) => p.alignment_id);
    }
    return contributors;
  }

  getAlignment(passage: any, alignmentId: string): any | null {
    if (!passage?.phrase_alignments || !alignmentId) {
      return null;
    }
    return (
      passage.phrase_alignments.find((a: any) => a.alignment_id === alignmentId) ??
      null
    );
  }

  getEvidence(
    alignment: any,
    targetVersion: string,
    dimension: string
  ): any | null {
    if (!alignment?.targets || !targetVersion || !dimension) {
      return null;
    }
    const target = alignment.targets[targetVersion];
    if (!target?.evidence?.length) {
      return null;
    }
    return (
      target.evidence.find((e: any) => e.dimension === dimension) ?? null
    );
  }

  getTargetPhrase(alignment: any, targetVersion: string): any | null {
    return alignment?.targets?.[targetVersion] ?? null;
  }

  getHeatmapCells(): any[] {
    return this.phraseDataSnapshot?.overview_heatmap?.cells ?? [];
  }

  getValidationOptions(): string[] {
    return (
      this.phraseDataSnapshot?.validation_options ?? [
        'Agree',
        'Partially Agree',
        'Disagree',
      ]
    );
  }

  formatScore(score: number | null | undefined): string {
    if (score === null || score === undefined || Number.isNaN(Number(score))) {
      return 'N/A';
    }
    const n = Number(score);
    return Number.isInteger(n) ? String(n) : n.toFixed(1);
  }

  getStatusClass(status: string | null | undefined): string {
    return STATUS_META[status || '']?.className || 'status-not-applicable';
  }

  getStatusIcon(status: string | null | undefined): string {
    return STATUS_META[status || '']?.icon || 'fa-ban';
  }

  /* ---------- Human validation (localStorage) ---------- */

  private validationKey(
    passageId: string,
    alignmentId: string,
    targetVersion: string,
    dimension: string
  ): string {
    return `${passageId}::${alignmentId}::${targetVersion}::${dimension}`;
  }

  loadAllValidations(): Record<string, PhraseValidationRecord> {
    try {
      const raw = localStorage.getItem(VALIDATION_STORAGE_KEY);
      if (!raw) {
        return {};
      }
      return JSON.parse(raw) as Record<string, PhraseValidationRecord>;
    } catch {
      return {};
    }
  }

  getValidation(
    passageId: string,
    alignmentId: string,
    targetVersion: string,
    dimension: string
  ): PhraseValidationRecord | null {
    const all = this.loadAllValidations();
    return (
      all[this.validationKey(passageId, alignmentId, targetVersion, dimension)] ??
      null
    );
  }

  saveValidation(record: PhraseValidationRecord): void {
    const all = this.loadAllValidations();
    const key = this.validationKey(
      record.passage_id,
      record.alignment_id,
      record.target_version,
      record.dimension
    );
    all[key] = {
      ...record,
      reviewed_at: record.reviewed_at || new Date().toISOString(),
    };
    localStorage.setItem(VALIDATION_STORAGE_KEY, JSON.stringify(all));
  }

  clearValidation(
    passageId: string,
    alignmentId: string,
    targetVersion: string,
    dimension: string
  ): void {
    const all = this.loadAllValidations();
    delete all[this.validationKey(passageId, alignmentId, targetVersion, dimension)];
    localStorage.setItem(VALIDATION_STORAGE_KEY, JSON.stringify(all));
  }

  exportValidationsJson(): string {
    return JSON.stringify(Object.values(this.loadAllValidations()), null, 2);
  }

  importValidationsJson(json: string): { ok: boolean; count: number; error?: string } {
    try {
      const parsed = JSON.parse(json);
      const list = Array.isArray(parsed) ? parsed : Object.values(parsed);
      const all = this.loadAllValidations();
      let count = 0;
      for (const item of list) {
        if (!item?.passage_id || !item?.alignment_id || !item?.dimension) {
          continue;
        }
        const key = this.validationKey(
          item.passage_id,
          item.alignment_id,
          item.target_version || 'context_ai_german',
          item.dimension
        );
        all[key] = item as PhraseValidationRecord;
        count++;
      }
      localStorage.setItem(VALIDATION_STORAGE_KEY, JSON.stringify(all));
      return { ok: true, count };
    } catch (e: any) {
      return { ok: false, count: 0, error: e?.message || 'Invalid JSON' };
    }
  }

  isPhraseValidated(
    passageId: string,
    alignmentId: string,
    targetVersion?: string | null,
    dimension?: string | null
  ): boolean {
    const all = this.loadAllValidations();
    if (targetVersion && dimension) {
      return !!all[this.validationKey(passageId, alignmentId, targetVersion, dimension)]
        ?.decision;
    }
    return Object.values(all).some(
      (v) =>
        v.passage_id === passageId &&
        v.alignment_id === alignmentId &&
        !!v.decision
    );
  }

  getPassages(): Observable<any[]> {
    return this.getData().pipe(map((d) => d.passages ?? []));
  }

  getPassageById(id: string): Observable<any | undefined> {
    return this.getPassages().pipe(
      map((passages) => passages.find((p) => p.passage_id === id))
    );
  }

  getComparison(passage: any, source: string, target: string): any | null {
    if (!passage?.comparisons || source === target) {
      return null;
    }
    return (
      passage.comparisons.find(
        (c: any) =>
          c.source_version === source && c.target_version === target
      ) ?? null
    );
  }

  getDatasetSummary(): Observable<any> {
    return this.getData().pipe(map((d) => d.dataset_summary ?? {}));
  }

  getMetadata(): Observable<any> {
    return this.getData().pipe(map((d) => d.metadata ?? {}));
  }

  getDimensionScore(comparison: any, key: string): number | null {
    if (!comparison) {
      return null;
    }
    const dim = comparison[key];
    if (!dim) {
      return null;
    }
    if (key === 'omissions_additions') {
      return dim.preservation_score ?? null;
    }
    if (dim.applicable === false || dim.score === null || dim.score === undefined) {
      return null;
    }
    return dim.score;
  }

  isDimensionApplicable(comparison: any, key: string): boolean {
    if (!comparison) {
      return false;
    }
    const dim = comparison[key];
    if (!dim) {
      return false;
    }
    if (key === 'omissions_additions' || key === 'semantic_preservation') {
      return true;
    }
    if (dim.applicable === false) {
      return false;
    }
    return dim.score !== null && dim.score !== undefined;
  }

  getScoreLabel(score: number | null): string {
    if (score === null || score === undefined) {
      return 'N/A';
    }
    if (score >= 90) return 'Excellent';
    if (score >= 75) return 'Very Good';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Moderate';
    return 'Weak';
  }

  getScoreColor(score: number | null): string {
    if (score === null || score === undefined) {
      return '#94a3b8';
    }
    if (score >= 90) return '#059669';
    if (score >= 75) return '#2563eb';
    if (score >= 60) return '#0891b2';
    if (score >= 40) return '#d97706';
    return '#dc2626';
  }

  getUniqueActs(passages: any[]): number[] {
    return [...new Set(passages.map((p) => p.act))].sort((a, b) => a - b);
  }

  getUniqueScenes(passages: any[], act?: number | null): number[] {
    const filtered =
      act != null ? passages.filter((p) => p.act === act) : passages;
    return [...new Set(filtered.map((p) => p.scene))].sort((a, b) => a - b);
  }

  getUniqueFeatures(passages: any[]): string[] {
    return [...new Set(passages.map((p) => p.primary_research_feature))].sort();
  }
}
