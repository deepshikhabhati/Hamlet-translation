import { Injectable } from '@angular/core';
import {
  AnalysisDialogue,
  AnalysisScene,
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

  /**
   * Retrieves or computes the scene average score for a specific dimension.
   */
  getSceneDimensionScore(scene: AnalysisScene, dimKey: string, verKey: string = 'human_german'): number | null {
    if (!scene) return null;

    const scoreObj = scene.scores?.[verKey]?.[dimKey];
    if (scoreObj?.score !== undefined && scoreObj?.score !== null) {
      return scoreObj.score;
    }

    if (scene.dialogues && scene.dialogues.length > 0) {
      const summary = this.calculateSceneDimensionScore(scene.dialogues, verKey, dimKey);
      if (summary.score !== null) return summary.score;
    }

    return null;
  }

  /**
   * Retrieves or computes the number of scored units for a scene dimension.
   */
  getSceneDimensionUnits(scene: AnalysisScene, dimKey: string, verKey: string = 'human_german'): number {
    if (!scene) return 0;

    const scoreObj = scene.scores?.[verKey]?.[dimKey];
    if (scoreObj?.units !== undefined && scoreObj?.units !== null) {
      return scoreObj.units;
    }

    if (scene.dialogues && scene.dialogues.length > 0) {
      return this.calculateSceneDimensionScore(scene.dialogues, verKey, dimKey).units;
    }
    return 0;
  }

  /**
   * Calculates overall scene average across scored dimensions/dialogues.
   */
  getSceneOverallScore(scene: AnalysisScene, dimensions?: { key: string }[]): number | null {
    if (!scene) return null;

    const dims = dimensions || [
      { key: 'semantic' },
      { key: 'emotion' },
      { key: 'metaphor_imagery' },
      { key: 'tone' },
      { key: 'character_voice' },
      { key: 'wordplay' },
      { key: 'cultural_archaic' },
      { key: 'omissions_additions' }
    ];

    if (scene.dialogues && scene.dialogues.length > 0) {
      const dialogueMeans: number[] = [];
      for (const dlg of scene.dialogues) {
        const dimScores: number[] = [];
        for (const dim of dims) {
          const ana = dlg.analysis?.human_german?.[dim.key];
          if (ana && ana.applicable !== false && ana.score !== null && ana.score !== undefined && !isNaN(ana.score)) {
            const rev = dlg.expert_review?.dimension_reviews?.human_german?.[dim.key];
            if (rev && rev.score_override !== null && rev.score_override !== undefined && !isNaN(rev.score_override)) {
              dimScores.push(Number(rev.score_override));
            } else {
              dimScores.push(Number(ana.score));
            }
          }
        }
        if (dimScores.length > 0) {
          const mean = dimScores.reduce((sum, s) => sum + s, 0) / dimScores.length;
          dialogueMeans.push(mean);
        }
      }
      if (dialogueMeans.length > 0) {
        const overall = dialogueMeans.reduce((sum, m) => sum + m, 0) / dialogueMeans.length;
        return Math.round(overall * 10) / 10;
      }
    }

    if (scene.scores?.human_german) {
      const scores: number[] = [];
      for (const dim of dims) {
        const s = scene.scores.human_german[dim.key]?.score;
        if (s !== null && s !== undefined && !isNaN(s)) {
          scores.push(Number(s));
        }
      }
      if (scores.length > 0) {
        return Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
      }
    }

    return null;
  }

  /**
   * Applies consistent score coloring:
   * Green: 85–100
   * Amber: 70–84.9
   * Red: below 70
   * Gray: N/A or unavailable
   */
  getDonutColor(score: number | null | undefined): string {
    if (score === null || score === undefined || isNaN(score)) return '#94a3b8';
    if (score >= 85) return '#16a34a';
    if (score >= 70) return '#d97706';
    return '#dc2626';
  }

  /**
   * Formats donut center text (0-100 or '—').
   */
  getDonutCenterText(score: number | null | undefined): string {
    if (score === null || score === undefined || isNaN(score)) return '—';
    return Math.round(score).toString();
  }

  /**
   * Computes stroke-dashoffset for SVG donut chart based on score and circumference.
   */
  getDonutDashOffset(score: number | null | undefined, circumference: number = 69.12): number {
    if (score === null || score === undefined || isNaN(score) || score <= 0) {
      return circumference;
    }
    const clamped = Math.max(0, Math.min(100, score));
    return Math.round((circumference - (circumference * clamped) / 100) * 100) / 100;
  }
}
