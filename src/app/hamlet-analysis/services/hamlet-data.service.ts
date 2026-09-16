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

export const STATUS_META: Record<
  string,
  { className: string; icon: string; label: string }
> = {
  Preserved: { className: 'status-preserved', icon: 'fa-check-circle', label: 'Preserved' },
  Changed: { className: 'status-changed', icon: 'fa-exchange-alt', label: 'Changed' },
  Lost: { className: 'status-lost', icon: 'fa-times-circle', label: 'Lost' },
  Added: { className: 'status-added', icon: 'fa-plus-circle', label: 'Added' },
  'Not Applicable': {
    className: 'status-not-applicable',
    icon: 'fa-ban',
    label: 'Not Applicable',
  },
};

export interface PhraseValidationRecord {
  passage_id: string;
  alignment_id: string;
  target_version: string;
  dimension: string;
  decision: 'Agree' | 'Partially Agree' | 'Disagree' | null;
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
