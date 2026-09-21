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
  metaphor: 'Metaphor & Imagery',
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

export interface EvidenceSpanItem {
  span_id?: string;
  text: string;
  start?: number;
  end?: number;
  concept_id?: string;
  concept_label?: string;
}

export interface EvidenceConcept {
  concept_id: string;
  label: string;
  dimension: string;
  phrases?: Record<string, string[]>;
  evidence_spans?: Record<string, EvidenceSpanItem[]>;
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
  dimension_evidence?: Record<string, any>;
  semantic_concept_links?: any[];
  concepts?: Record<string, EvidenceConcept[]>;
}

export interface TextSegment {
  text: string;
  highlighted: boolean;
  concept_id?: string;
  concept_label?: string;
  evidence_span_id?: string;
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
  private readonly phraseUrl = 'assets/data/hamlet_phrase_alignment_semantic_emotion_tone_aligned.json';
  private readonly phraseFallbackUrl = 'assets/data/hamlet_phrase_alignment_ui.json';
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
        catchError((err) => {
          console.warn('Failed to load primary aligned dataset, falling back to legacy UI json:', err);
          return this.http.get<any>(this.phraseFallbackUrl).pipe(
            map((data) => {
              this.phraseDataSnapshot = data;
              return data;
            }),
            catchError(() => {
              this.phraseDataSnapshot = null;
              return of(null);
            })
          );
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
      const dev = item.dimension_evidence?.[dimKey];
      const directDim = item.dimensions?.[dimKey];

      const humanEv = item.targets?.human_german?.evidence?.find((e: any) => e.dimension === dimKey);
      const aiEv = item.targets?.ai_german?.evidence?.find((e: any) => e.dimension === dimKey);
      const ctxEv = item.targets?.context_ai_german?.evidence?.find((e: any) => e.dimension === dimKey);

      const applicable = dev
        ? !!(dev.targets?.human_german?.applicable !== false || dev.targets?.ai_german?.applicable !== false || dev.targets?.context_ai_german?.applicable !== false)
        : !!(directDim ? directDim.applicable !== false : ((humanEv && humanEv.applicable !== false) || (aiEv && aiEv.applicable !== false) || (ctxEv && ctxEv.applicable !== false)));

      const classifications: Record<string, string> = {
        human_german: this.normalizeStatus(dev?.targets?.human_german?.status || directDim?.classifications?.['human_german'] || humanEv?.status, applicable),
        ai_german: this.normalizeStatus(dev?.targets?.ai_german?.status || directDim?.classifications?.['ai_german'] || aiEv?.status, applicable),
        context_ai_german: this.normalizeStatus(dev?.targets?.context_ai_german?.status || directDim?.classifications?.['context_ai_german'] || ctxEv?.status, applicable),
      };

      if (Object.values(classifications).includes('Needs Review')) {
        anyNeedsReview = true;
      }

      const rulesSet = new Set<string>();
      if (directDim?.computed_rule_evidence) {
        directDim.computed_rule_evidence.forEach((r: any) => {
          if (typeof r === 'string') rulesSet.add(r);
          else if (r?.rule_id) rulesSet.add(r.rule_id);
        });
      }
      [humanEv, aiEv, ctxEv].forEach((ev) => {
        if (ev?.rules) {
          ev.rules.forEach((r: any) => {
            if (typeof r === 'string') rulesSet.add(r);
            else if (r?.rule_id) rulesSet.add(r.rule_id);
          });
        }
      });

      const explanation =
        dev?.targets?.context_ai_german?.explanation ||
        dev?.targets?.ai_german?.explanation ||
        dev?.targets?.human_german?.explanation ||
        directDim?.explanation ||
        ctxEv?.explanation ||
        aiEv?.explanation ||
        humanEv?.explanation ||
        (applicable
          ? `Feature correspondence analyzed across targets for ${PHRASE_DIMENSION_LABELS[dimKey]}.`
          : `N/A — No relevant ${PHRASE_DIMENSION_LABELS[dimKey].toLowerCase()} cues detected in this aligned phrase.`);

      const score =
        dev?.targets?.context_ai_german?.score ??
        dev?.targets?.ai_german?.score ??
        dev?.targets?.human_german?.score ??
        directDim?.technical_score ??
        ctxEv?.score ??
        aiEv?.score ??
        humanEv?.score ??
        null;

      if (score != null) {
        totalScore += score;
        scoreCount++;
      }

      const relevantSpans: Record<string, string[]> = {
        english: dev?.source?.evidence_spans?.map((s: any) => s.text) || directDim?.relevant_spans?.['english'] || humanEv?.source_features || aiEv?.source_features || ctxEv?.source_features || [],
        human_german: dev?.targets?.human_german?.evidence_spans?.map((s: any) => s.text) || directDim?.relevant_spans?.['human_german'] || humanEv?.target_features || [],
        ai_german: dev?.targets?.ai_german?.evidence_spans?.map((s: any) => s.text) || directDim?.relevant_spans?.['ai_german'] || aiEv?.target_features || [],
        context_ai_german: dev?.targets?.context_ai_german?.evidence_spans?.map((s: any) => s.text) || directDim?.relevant_spans?.['context_ai_german'] || ctxEv?.target_features || [],
      };

      const featureLabel =
        ctxEv?.feature_label ||
        aiEv?.feature_label ||
        humanEv?.feature_label ||
        directDim?.feature_label ||
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
      dimension_evidence: item.dimension_evidence || {},
      semantic_concept_links: item.semantic_concept_links || [],
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

  getActiveDimensionEvidence(alignment: any, dimension?: string): any {
    if (!alignment) return null;
    const dim = dimension || 'semantic';
    if (alignment.dimension_evidence?.[dim]) {
      return alignment.dimension_evidence[dim];
    }
    return alignment.dimensions?.[dim] || null;
  }

  getConceptsForDimension(alignment: AlignedPhraseGroup | any, dimension: string): EvidenceConcept[] {
    if (!alignment) return [];
    if (alignment.concepts?.[dimension] && alignment.concepts[dimension].length > 0) {
      return alignment.concepts[dimension];
    }

    const concepts: EvidenceConcept[] = [];

    // 1. Semantic concept links if available in JSON
    if (
      dimension === 'semantic' &&
      Array.isArray(alignment.semantic_concept_links) &&
      alignment.semantic_concept_links.length > 0
    ) {
      for (const link of alignment.semantic_concept_links) {
        const cid = link.concept_id || 'concept';
        const label = cid.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
        concepts.push({
          concept_id: cid,
          label,
          dimension: 'semantic',
          phrases: {
            english: link.english || [],
            human_german: link.human_german || [],
            ai_german: link.ai_german || [],
            context_ai_german: link.context_ai_german || [],
          },
        });
      }
      return concepts;
    }

    // 2. Derive from dimension_evidence
    const dev = alignment.dimension_evidence?.[dimension];
    if (dev) {
      const srcSpans = dev.source?.evidence_spans || [];
      if (srcSpans.length > 0) {
        for (let i = 0; i < srcSpans.length; i++) {
          const s = srcSpans[i];
          const cid = `${dimension}_${s.text.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;
          if (concepts.some((c) => c.concept_id === cid || c.label.toLowerCase() === s.text.toLowerCase())) {
            continue;
          }
          const label = s.text.replace(/\b\w/g, (c: string) => c.toUpperCase());
          concepts.push({
            concept_id: cid,
            label,
            dimension,
            phrases: {
              english: [s.text],
              human_german: (dev.targets?.human_german?.evidence_spans || []).map((x: any) => x.text),
              ai_german: (dev.targets?.ai_german?.evidence_spans || []).map((x: any) => x.text),
              context_ai_german: (dev.targets?.context_ai_german?.evidence_spans || []).map((x: any) => x.text),
            },
          });
        }
      } else {
        const anyTargetSpans = [
          ...(dev.targets?.human_german?.evidence_spans || []),
          ...(dev.targets?.ai_german?.evidence_spans || []),
          ...(dev.targets?.context_ai_german?.evidence_spans || []),
        ];
        if (anyTargetSpans.length > 0) {
          const first = anyTargetSpans[0].text;
          const cid = `${dimension}_cue`;
          concepts.push({
            concept_id: cid,
            label: `${PHRASE_DIMENSION_LABELS[dimension] || dimension} Cue`,
            dimension,
            phrases: {
              english: [],
              human_german: (dev.targets?.human_german?.evidence_spans || []).map((x: any) => x.text),
              ai_german: (dev.targets?.ai_german?.evidence_spans || []).map((x: any) => x.text),
              context_ai_german: (dev.targets?.context_ai_german?.evidence_spans || []).map((x: any) => x.text),
            },
          });
        }
      }
      if (concepts.length > 0) return concepts;
    }

    // 3. Fallback from dimensions / features (for metaphor, voice, wordplay, cultural, omissions)
    const dimRecord = alignment.dimensions?.[dimension];
    if (dimRecord && dimRecord.applicable) {
      const srcFeat = dimRecord.relevant_spans?.['english'] || [];
      const humanFeat = dimRecord.relevant_spans?.['human_german'] || [];
      const aiFeat = dimRecord.relevant_spans?.['ai_german'] || [];
      const ctxFeat = dimRecord.relevant_spans?.['context_ai_german'] || [];

      if (srcFeat.length > 0 || humanFeat.length > 0 || aiFeat.length > 0 || ctxFeat.length > 0) {
        const featureName = dimRecord.feature_label || srcFeat[0] || PHRASE_DIMENSION_LABELS[dimension];
        const cid = `${dimension}_feat`;
        concepts.push({
          concept_id: cid,
          label: featureName,
          dimension,
          phrases: {
            english: srcFeat,
            human_german: humanFeat,
            ai_german: aiFeat,
            context_ai_german: ctxFeat,
          },
        });
      }
    }

    return concepts;
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

    const dev = alignment.dimension_evidence?.[dimension];
    const dimRecord = alignment.dimensions?.[dimension];
    const applicable = dev
      ? (version === 'english' ? true : dev.targets?.[version]?.applicable !== false)
      : (dimRecord?.applicable !== false);

    if (!applicable) {
      return [{ text: rawText, highlighted: false }];
    }

    const concepts = this.getConceptsForDimension(alignment, dimension);

    interface SpanCandidate {
      text: string;
      start: number;
      end: number;
      concept_id?: string;
      concept_label?: string;
      evidence_span_id?: string;
    }
    const candidates: SpanCandidate[] = [];

    // Path 1: Check if dimension_evidence has exact character offsets
    if (!isEnglishTranslation && dev) {
      const rawSpans = version === 'english'
        ? (dev.source?.evidence_spans || [])
        : (dev.targets?.[version]?.evidence_spans || []);

      for (const sp of rawSpans) {
        if (typeof sp.start === 'number' && typeof sp.end === 'number' && sp.end > sp.start) {
          const start = sp.start;
          const end = sp.end;
          const spanText = sp.text || rawText.substring(start, end);
          if (end <= rawText.length && rawText.substring(start, end).toLowerCase() === spanText.toLowerCase()) {
            const matchingConcept = this.findMatchingConcept(spanText, version, concepts);
            candidates.push({
              text: rawText.substring(start, end),
              start,
              end,
              concept_id: matchingConcept?.concept_id || `${dimension}_cue`,
              concept_label: matchingConcept?.label || spanText,
              evidence_span_id: `${dimension}-${version}-${start}`,
            });
          } else {
            const idx = rawText.toLowerCase().indexOf(spanText.toLowerCase());
            if (idx >= 0) {
              const matchingConcept = this.findMatchingConcept(spanText, version, concepts);
              candidates.push({
                text: rawText.substring(idx, idx + spanText.length),
                start: idx,
                end: idx + spanText.length,
                concept_id: matchingConcept?.concept_id || `${dimension}_cue`,
                concept_label: matchingConcept?.label || spanText,
                evidence_span_id: `${dimension}-${version}-${idx}`,
              });
            }
          }
        } else if (sp.text) {
          const idx = rawText.toLowerCase().indexOf(sp.text.toLowerCase());
          if (idx >= 0) {
            const matchingConcept = this.findMatchingConcept(sp.text, version, concepts);
            candidates.push({
              text: rawText.substring(idx, idx + sp.text.length),
              start: idx,
              end: idx + sp.text.length,
              concept_id: matchingConcept?.concept_id || `${dimension}_cue`,
              concept_label: matchingConcept?.label || sp.text,
              evidence_span_id: `${dimension}-${version}-${idx}`,
            });
          }
        }
      }
    }

    // Path 2: Check concept phrases if no spans found or if translated
    if (candidates.length === 0) {
      const matchKey = isEnglishTranslation ? 'english' : version;
      for (const concept of concepts) {
        const phrases = concept.phrases?.[matchKey] || [];
        for (const p of phrases) {
          if (!p || !p.trim()) continue;
          const lowerText = rawText.toLowerCase();
          const lowerP = p.toLowerCase().trim();
          const idx = lowerText.indexOf(lowerP);
          if (idx >= 0) {
            candidates.push({
              text: rawText.substring(idx, idx + lowerP.length),
              start: idx,
              end: idx + lowerP.length,
              concept_id: concept.concept_id,
              concept_label: concept.label,
              evidence_span_id: `${dimension}-${version}-${idx}`,
            });
          }
        }
      }
    }

    // Path 3: Fallback to relevant_spans from dimRecord
    if (candidates.length === 0 && dimRecord?.relevant_spans?.[version]?.length) {
      const keywords = dimRecord.relevant_spans[version];
      const lowerText = rawText.toLowerCase();
      for (const kw of keywords) {
        if (!kw || !kw.trim()) continue;
        const lowerKw = kw.toLowerCase().trim();
        const idx = lowerText.indexOf(lowerKw);
        if (idx >= 0) {
          candidates.push({
            text: rawText.substring(idx, idx + lowerKw.length),
            start: idx,
            end: idx + lowerKw.length,
            concept_id: `${dimension}_cue`,
            concept_label: kw,
            evidence_span_id: `${dimension}-${version}-${idx}`,
          });
        }
      }
    }

    // If no evidence spans exist, do not highlight the whole aligned phrase
    if (candidates.length === 0) {
      return [{ text: rawText, highlighted: false }];
    }

    // Sort candidates: start ascending, then length descending
    candidates.sort((a, b) => a.start !== b.start ? a.start - b.start : (b.end - b.start) - (a.end - a.start));

    // Resolve overlapping spans: keep longer/enclosing span, skip overlapping sub-spans
    const nonOverlapping: SpanCandidate[] = [];
    let lastEnd = -1;
    for (const c of candidates) {
      if (c.start >= lastEnd) {
        nonOverlapping.push(c);
        lastEnd = c.end;
      }
    }

    // Build segments
    const segments: TextSegment[] = [];
    let currentIdx = 0;
    for (const span of nonOverlapping) {
      if (span.start > currentIdx) {
        segments.push({
          text: rawText.substring(currentIdx, span.start),
          highlighted: false,
        });
      }
      segments.push({
        text: rawText.substring(span.start, span.end),
        highlighted: true,
        concept_id: span.concept_id,
        concept_label: span.concept_label,
        evidence_span_id: span.evidence_span_id,
      });
      currentIdx = span.end;
    }
    if (currentIdx < rawText.length) {
      segments.push({
        text: rawText.substring(currentIdx),
        highlighted: false,
      });
    }

    return segments.length > 0 ? segments : [{ text: rawText, highlighted: false }];
  }

  private findMatchingConcept(
    spanText: string,
    version: string,
    concepts: EvidenceConcept[]
  ): EvidenceConcept | undefined {
    const sLower = spanText.toLowerCase().trim();
    for (const c of concepts) {
      const phrases = c.phrases?.[version] || [];
      for (const p of phrases) {
        const pLower = p.toLowerCase().trim();
        if (pLower === sLower || pLower.includes(sLower) || sLower.includes(pLower)) {
          return c;
        }
      }
      const enPhrases = c.phrases?.['english'] || [];
      for (const ep of enPhrases) {
        const epLower = ep.toLowerCase().trim();
        if (epLower === sLower || epLower.includes(sLower) || sLower.includes(epLower)) {
          return c;
        }
      }
    }
    return concepts[0];
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
