import { Injectable } from '@angular/core';
import { AnalysisDialogue, DimensionReview, ExpertReview } from '../models/hamlet-analysis-v15.models';

const STORAGE_KEY = 'hamlet_v5_expert_reviews';

@Injectable({
  providedIn: 'root'
})
export class ExpertReviewService {
  private localReviews: Record<string, ExpertReview> = {};

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        this.localReviews = JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to load expert reviews from localStorage', e);
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.localReviews));
    } catch (e) {
      console.warn('Failed to save expert reviews to localStorage', e);
    }
  }

  /**
   * Initializes or merges saved local reviews onto dialogue objects.
   */
  attachReviewsToDialogue(dialogue: AnalysisDialogue): void {
    if (!dialogue.expert_review) {
      dialogue.expert_review = {
        status: 'pending',
        reviewer: null,
        reviewed_at: null,
        dimension_reviews: {
          human_german: {},
          ai_german: {},
          context_ai_german: {}
        }
      };
    }

    const saved = this.localReviews[dialogue.dialogue_id];
    if (saved && saved.dimension_reviews) {
      for (const ver of ['human_german', 'ai_german', 'context_ai_german']) {
        if (saved.dimension_reviews[ver]) {
          dialogue.expert_review.dimension_reviews[ver] = {
            ...dialogue.expert_review.dimension_reviews[ver],
            ...saved.dimension_reviews[ver]
          };
        }
      }
      dialogue.expert_review.status = saved.status || dialogue.expert_review.status;
      dialogue.expert_review.reviewer = saved.reviewer || dialogue.expert_review.reviewer;
      dialogue.expert_review.reviewed_at = saved.reviewed_at || dialogue.expert_review.reviewed_at;
    }
  }

  /**
   * Gets the review for a specific dialogue, version, and dimension.
   */
  getReview(dialogue: AnalysisDialogue, versionKey: string, dimKey: string): DimensionReview {
    const revObj = dialogue.expert_review?.dimension_reviews?.[versionKey]?.[dimKey];
    if (revObj) return { ...revObj };
    return {
      decision: null,
      score_override: null,
      comment: null,
      reviewer: null,
      reviewed_at: null
    };
  }

  /**
   * Saves a review for a specific dialogue, version, and dimension.
   * Modifies dialogue.expert_review, never touches dialogue.analysis.
   */
  saveReview(
    dialogue: AnalysisDialogue,
    versionKey: string,
    dimKey: string,
    review: DimensionReview
  ): void {
    if (!dialogue.expert_review) {
      dialogue.expert_review = {
        status: 'in_progress',
        reviewer: review.reviewer || null,
        reviewed_at: new Date().toISOString(),
        dimension_reviews: {
          human_german: {},
          ai_german: {},
          context_ai_german: {}
        }
      };
    }

    if (!dialogue.expert_review.dimension_reviews[versionKey]) {
      dialogue.expert_review.dimension_reviews[versionKey] = {};
    }

    dialogue.expert_review.dimension_reviews[versionKey][dimKey] = { ...review };
    dialogue.expert_review.status = 'in_progress';
    if (review.reviewer) dialogue.expert_review.reviewer = review.reviewer;
    dialogue.expert_review.reviewed_at = new Date().toISOString();

    // Store in local reviews map and persist
    this.localReviews[dialogue.dialogue_id] = dialogue.expert_review;
    this.saveToStorage();
  }

  /**
   * Resets draft review for a specific dialogue, version, and dimension.
   */
  resetReview(dialogue: AnalysisDialogue, versionKey: string, dimKey: string): void {
    if (dialogue.expert_review?.dimension_reviews?.[versionKey]?.[dimKey]) {
      delete dialogue.expert_review.dimension_reviews[versionKey][dimKey];
      if (this.localReviews[dialogue.dialogue_id]?.dimension_reviews?.[versionKey]?.[dimKey]) {
        delete this.localReviews[dialogue.dialogue_id].dimension_reviews[versionKey][dimKey];
        this.saveToStorage();
      }
    }
  }

  /**
   * Exports local reviews as a JSON string download.
   */
  exportReviewsJson(): string {
    return JSON.stringify(this.localReviews, null, 2);
  }

  /**
   * Imports local reviews from a JSON string.
   */
  importReviewsJson(jsonString: string): boolean {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed && typeof parsed === 'object') {
        this.localReviews = parsed;
        this.saveToStorage();
        return true;
      }
    } catch (e) {
      console.error('Invalid review JSON', e);
    }
    return false;
  }
}
