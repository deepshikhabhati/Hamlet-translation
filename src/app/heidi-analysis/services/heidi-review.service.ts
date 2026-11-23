import { Injectable } from '@angular/core';
import {
  HEIDI_PASSAGE_ID_RE,
  HEIDI_REVIEW_STORAGE_KEY,
  HeidiDimensionKey,
  HeidiPassage,
  HeidiPassageReview,
} from '../models/heidi.models';

export interface EffectiveScore {
  score: number | null;
  /** where the displayed score comes from */
  provenance: 'automated_heuristic' | 'expert_override' | 'expert_accepted' | 'none';
  automatedScore: number | null;
  method: string | null;
}

/**
 * Expert reviews for Heidi, persisted under their own namespaced localStorage
 * key (`heidi_analysis_reviews_v1`). Hamlet's key (`hamlet_v5_expert_reviews`)
 * is never read or written here.
 */
@Injectable({ providedIn: 'root' })
export class HeidiReviewService {
  private reviews: Record<string, HeidiPassageReview> = {};

  constructor() {
    this.reload();
  }

  reload(): void {
    try {
      const raw = localStorage.getItem(HEIDI_REVIEW_STORAGE_KEY);
      this.reviews = raw ? JSON.parse(raw) : {};
    } catch {
      this.reviews = {};
    }
  }

  private persist(): void {
    try {
      localStorage.setItem(HEIDI_REVIEW_STORAGE_KEY, JSON.stringify(this.reviews));
    } catch (e) {
      console.warn('Heidi: could not persist reviews', e);
    }
  }

  blank(passageId: string): HeidiPassageReview {
    return {
      passage_id: passageId,
      reviewer: null,
      reviewed_at: null,
      alignment: { decision: null, correction_note: null },
      omission_addition: null,
      dimensions: {},
      rtt_inaccurate: false,
      rtt_corrected_semantic_score: null,
      commentary: null,
    };
  }

  get(passageId: string): HeidiPassageReview | null {
    return this.reviews[passageId] ? JSON.parse(JSON.stringify(this.reviews[passageId])) : null;
  }

  getOrBlank(passageId: string): HeidiPassageReview {
    return this.get(passageId) ?? this.blank(passageId);
  }

  save(review: HeidiPassageReview, reviewer: string): HeidiPassageReview {
    const r: HeidiPassageReview = {
      ...JSON.parse(JSON.stringify(review)),
      reviewer: reviewer?.trim() || 'anonymous reviewer',
      reviewed_at: new Date().toISOString(),
    };
    this.reviews[r.passage_id] = r;
    this.persist();
    return r;
  }

  clear(passageId: string): void {
    delete this.reviews[passageId];
    this.persist();
  }

  isReviewed(passageId: string): boolean {
    return !!this.reviews[passageId]?.reviewed_at;
  }

  reviewedCount(): number {
    return Object.values(this.reviews).filter(r => !!r.reviewed_at).length;
  }

  all(): HeidiPassageReview[] {
    return Object.values(this.reviews);
  }

  /** Alignment accepted (or corrected) by an expert → scores may be considered verified. */
  alignmentVerified(passageId: string): boolean {
    const d = this.reviews[passageId]?.alignment?.decision;
    return d === 'accept' || d === 'correct';
  }

  alignmentRejected(passageId: string): boolean {
    return this.reviews[passageId]?.alignment?.decision === 'reject';
  }

  /**
   * Effective (displayed) score for a dimension. Expert overrides replace the
   * displayed value but the automated score and its method are preserved.
   * Never coerces null to 0.
   */
  effectiveScore(p: HeidiPassage, dim: HeidiDimensionKey): EffectiveScore {
    const a = p.analysis?.dimensions?.[dim];
    const automated = a && a.score !== null && a.score !== undefined ? a.score : null;
    const r = this.reviews[p.passage_id];
    const dr = r?.dimensions?.[dim];
    if (dr?.decision === 'override' && dr.score_override !== null && dr.score_override !== undefined) {
      return { score: dr.score_override, provenance: 'expert_override', automatedScore: automated, method: a?.method ?? null };
    }
    if (dim === 'semantic' && r?.rtt_corrected_semantic_score !== null && r?.rtt_corrected_semantic_score !== undefined) {
      return { score: r.rtt_corrected_semantic_score, provenance: 'expert_override', automatedScore: automated, method: a?.method ?? null };
    }
    if (automated === null) {
      return { score: null, provenance: 'none', automatedScore: null, method: a?.method ?? null };
    }
    if (dr?.decision === 'accept') {
      return { score: automated, provenance: 'expert_accepted', automatedScore: automated, method: a?.method ?? null };
    }
    return { score: automated, provenance: 'automated_heuristic', automatedScore: automated, method: a?.method ?? null };
  }

  /** Merge reviews from a JSON file produced by exportJson(); returns the number imported. Hamlet data is never touched. */
  importJson(content: string): number {
    const parsed = JSON.parse(content);
    if (!parsed || parsed.project_id !== 'heidi' || typeof parsed.reviews !== 'object') {
      throw new Error('Not a Heidi review export (project_id must be "heidi").');
    }
    let n = 0;
    for (const [id, r] of Object.entries(parsed.reviews as Record<string, HeidiPassageReview>)) {
      if (r && typeof r === 'object' && (r as HeidiPassageReview).passage_id === id && HEIDI_PASSAGE_ID_RE.test(id)) {
        this.reviews[id] = r as HeidiPassageReview;
        n++;
      }
    }
    this.persist();
    return n;
  }

  exportJson(): string {
    return JSON.stringify({ project_id: 'heidi', storage_key: HEIDI_REVIEW_STORAGE_KEY, reviews: this.reviews }, null, 2);
  }
}
