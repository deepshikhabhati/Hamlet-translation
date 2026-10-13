import { Injectable } from '@angular/core';
import {
  AnalysisDialogue,
  DimensionSummaryScore,
  DimensionReview
} from '../models/hamlet-analysis-v15.models';
import { codePointLength } from '../components/evidence-highlighted-text/evidence-highlighted-text.component';

@Injectable({
  providedIn: 'root'
})
export class HamletAggregationService {

  /**
   * Calculates the English-character-length-weighted mean of applicable dialogue scores.
   * Rules:
   * 1. Include only records with applicable: true and valid numeric score.
   * 2. Weight each score by corresponding English dialogue character length (code-point length).
   * 3. Units (N) shows the number of applicable dialogues.
   * 4. Context Effect = Context AI score - AI score.
   * 5. Returns null when no applicable scores exist.
   */
  calculateSceneDimensionScore(
    dialogues: AnalysisDialogue[],
    verKey: string,
    dimKey: string
  ): DimensionSummaryScore {
    let totalWeight = 0;
    let weightedSum = 0;
    let units = 0;
    const totalUnits = dialogues.length;

    for (const d of dialogues) {
      const verObj = d.analysis?.[verKey];
      const ana = verObj?.[dimKey];
      if (ana && ana.applicable && ana.score !== null && ana.score !== undefined && !isNaN(ana.score)) {
        // Consider expert review score override if present
        let scoreToUse = Number(ana.score);
        const review = d.expert_review?.dimension_reviews?.[verKey]?.[dimKey];
        if (review && review.score_override !== null && review.score_override !== undefined && !isNaN(review.score_override)) {
          scoreToUse = Number(review.score_override);
        }

        const len = Math.max(1, codePointLength(d.texts.english));
        totalWeight += len;
        weightedSum += scoreToUse * len;
        units++;
      }
    }

    if (totalWeight === 0 || units === 0) {
      return {
        score: null,
        units: 0,
        total_units: totalUnits,
        method: 'character_weighted_mean'
      };
    }

    const mean = Math.round((weightedSum / totalWeight) * 10) / 10;
    return {
      score: mean,
      units,
      total_units: totalUnits,
      method: 'character_weighted_mean'
    };
  }

  /**
   * Calculates Context Effect = Context AI score - AI score.
   */
  calculateContextEffect(
    aiScore: number | null | undefined,
    contextAiScore: number | null | undefined
  ): { value: number | null; text: string; color: string } {
    if (
      aiScore === null || aiScore === undefined || isNaN(aiScore) ||
      contextAiScore === null || contextAiScore === undefined || isNaN(contextAiScore)
    ) {
      return { value: null, text: 'N/A', color: 'var(--muted, #566072)' };
    }

    const diff = Math.round((contextAiScore - aiScore) * 10) / 10;
    return {
      value: diff,
      text: diff > 0 ? `+${diff}` : `${diff}`,
      color: diff > 0 ? '#1E6B3A' : diff < 0 ? 'var(--warn-ink, #9B1C47)' : 'var(--ink-2, #384152)'
    };
  }

  /**
   * Formats a numeric score or returns 'N/A'.
   */
  formatScore(score: number | null | undefined): string {
    if (score === null || score === undefined || isNaN(score)) return 'N/A';
    return (Math.round(score * 10) / 10).toString();
  }

  /**
   * Determines the CSS score band class.
   */
  getScoreClass(val: number | null | undefined): string {
    if (val === null || val === undefined || isNaN(val)) return 'score-cell-na';
    if (val < 60) return 'score-band-1';
    if (val < 85) return 'score-band-2';
    if (val < 93) return 'score-band-3';
    if (val < 97) return 'score-band-4';
    return 'score-band-5';
  }
}
