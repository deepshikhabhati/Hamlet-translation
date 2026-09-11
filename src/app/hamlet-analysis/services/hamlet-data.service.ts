import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, shareReplay } from 'rxjs';

export const VERSIONS = [
  'english',
  'human_german',
  'ai_german',
  'context_ai_german',
] as const;

export type VersionKey = (typeof VERSIONS)[number];

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

@Injectable({ providedIn: 'root' })
export class HamletDataService {
  private readonly url = 'assets/data/hamlet_4x3_comparison.json';
  private cache$?: Observable<any>;

  constructor(private http: HttpClient) {}

  getData(): Observable<any> {
    if (!this.cache$) {
      this.cache$ = this.http.get<any>(this.url).pipe(shareReplay(1));
    }
    return this.cache$;
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
