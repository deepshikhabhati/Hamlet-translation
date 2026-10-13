import { Injectable } from '@angular/core';
import {
  AnalysisAct,
  AnalysisScene,
  AnalysisDialogue,
  DimensionAnalysis,
  DimensionReview,
  DIMENSION_DEFINITIONS,
  VERSION_DEFINITIONS
} from '../models/hamlet-analysis-v15.models';

export interface ReviewPolicyConfig {
  includeModelFlag: boolean;
  confidenceThreshold: number | null;
  scoreThreshold: number | null;
  includeInvalidEvidence: boolean;
  includeProvisional: boolean;
  respectExpertDecisions: boolean;
}

export const DEFAULT_REVIEW_POLICY: ReviewPolicyConfig = {
  includeModelFlag: true,
  confidenceThreshold: 0.70,
  scoreThreshold: null, // by default, score threshold is null; can be set to 70 when configured
  includeInvalidEvidence: true,
  includeProvisional: false,
  respectExpertDecisions: true
};

export interface ReviewIssue {
  issueId: string;
  dialogueId: string;
  act: number;
  sceneId: string;
  speaker: string;
  english: string;
  translationKey: string;
  translationName: string;
  dimensionKey: string;
  dimensionName: string;
  reasons: string[];
  score: number | null;
  confidence: number | null;
  evidenceStatus: 'Valid' | 'Invalid' | 'Unverified';
  resolved: boolean;
  resolutionType?: string | null;
  resolutionComment?: string | null;
}

export interface DialogueReviewGroup {
  dialogue: AnalysisDialogue;
  dialogueId: string;
  act: number;
  sceneId: string;
  speaker: string;
  english: string;
  issues: ReviewIssue[];
  issueCount: number;
  hasInvalidEvidence: boolean;
}

export interface SceneReviewSummary {
  sceneId: string;
  act: number;
  sceneNumber: number;
  flaggedAssessmentCount: number;
  flaggedDialogueCount: number;
  flaggedDialogueIds: string[];
  byDimension: Record<string, number>;
  byDimensionAssessments: Record<string, number>;
  evidenceIssueCount: number;
}

export interface PlayReviewSummary {
  totalDialogues: number;
  analyzedDialogues: number;
  flaggedDialogueCount: number;
  flaggedAssessmentCount: number;
  evidenceIssueCount: number;
  sceneSummaries: Map<string, SceneReviewSummary>;
}

@Injectable({
  providedIn: 'root'
})
export class ReviewCountingService {
  private config: ReviewPolicyConfig = { ...DEFAULT_REVIEW_POLICY };

  private actsCache: AnalysisAct[] = [];
  private allIssues: Map<string, ReviewIssue> = new Map();
  private sceneSummaries: Map<string, SceneReviewSummary> = new Map();
  private sceneDialogueGroups: Map<string, DialogueReviewGroup[]> = new Map();
  private playSummary: PlayReviewSummary = {
    totalDialogues: 0,
    analyzedDialogues: 0,
    flaggedDialogueCount: 0,
    flaggedAssessmentCount: 0,
    evidenceIssueCount: 0,
    sceneSummaries: new Map()
  };

  getConfig(): ReviewPolicyConfig {
    return { ...this.config };
  }

  getPolicy(): ReviewPolicyConfig {
    return this.getConfig();
  }

  setConfig(newConfig: Partial<ReviewPolicyConfig>): void {
    this.config = { ...this.config, ...newConfig };
    if (this.actsCache.length > 0) {
      this.buildIndex(this.actsCache);
    }
  }

  /**
   * Central predicate to evaluate whether an individual dimension assessment satisfies
   * the review policy criteria.
   */
  evaluateAssessment(
    ana: DimensionAnalysis | undefined | null,
    review: DimensionReview | undefined | null,
    dialogueId: string,
    verKey: string,
    dimKey: string,
    overrideConfig?: Partial<ReviewPolicyConfig>
  ): {
    flagged: boolean;
    reasons: string[];
    evidenceStatus: 'Valid' | 'Invalid' | 'Unverified';
    resolved: boolean;
    resolutionType?: string | null;
    effectiveScore: number | null;
  } {
    const cfg = overrideConfig ? { ...this.config, ...overrideConfig } : this.config;

    if (!ana || !ana.applicable) {
      return {
        flagged: false,
        reasons: [],
        evidenceStatus: 'Valid',
        resolved: false,
        effectiveScore: null
      };
    }

    const reasons: string[] = [];
    let evidenceStatus: 'Valid' | 'Invalid' | 'Unverified' = 'Valid';

    // 1. Evidence validation
    if (ana.evidence && ana.evidence.length > 0) {
      const hasInvalidSpan = ana.evidence.some(
        (e) => (e.span_validation && !e.span_validation.valid) || e.valid === false || e.verified === false
      );
      if (hasInvalidSpan) {
        evidenceStatus = 'Invalid';
        if (cfg.includeInvalidEvidence) {
          reasons.push('Invalid evidence span offset');
        }
      }
    }

    // 2. Model needs_review flag
    if (cfg.includeModelFlag && ana.needs_review) {
      reasons.push('Model flagged for review');
    }

    // 3. Low confidence
    if (
      cfg.confidenceThreshold !== null &&
      ana.confidence !== null &&
      ana.confidence !== undefined &&
      ana.confidence < cfg.confidenceThreshold
    ) {
      reasons.push(`Low confidence (${ana.confidence})`);
    }

    // 4. Effective score (with expert override check)
    let effectiveScore = ana.score;
    let isScoreOverridden = false;
    if (review && review.score_override !== null && review.score_override !== undefined && !isNaN(review.score_override)) {
      effectiveScore = Number(review.score_override);
      isScoreOverridden = true;
    }

    // 5. Score threshold
    if (
      cfg.scoreThreshold !== null &&
      effectiveScore !== null &&
      effectiveScore !== undefined &&
      effectiveScore < cfg.scoreThreshold
    ) {
      reasons.push(`Score below ${cfg.scoreThreshold} (${effectiveScore})`);
    }

    // 6. Expert decision resolution
    let resolved = false;
    let resolutionType: string | null = null;
    if (cfg.respectExpertDecisions && review) {
      if (review.decision === 'Accept') {
        resolved = true;
        resolutionType = 'Accept';
      } else if (isScoreOverridden && reasons.length === 1 && reasons[0].startsWith('Score below')) {
        resolved = true;
        resolutionType = 'Override';
      }
    }

    const flagged = reasons.length > 0 && !resolved;

    return {
      flagged,
      reasons,
      evidenceStatus,
      resolved,
      resolutionType,
      effectiveScore
    };
  }

  /**
   * Derive canonical review index across all acts and dialogues.
   */
  buildIndex(acts: AnalysisAct[]): PlayReviewSummary {
    this.actsCache = acts;
    this.allIssues.clear();
    this.sceneSummaries.clear();
    this.sceneDialogueGroups.clear();

    const verMap = new Map(VERSION_DEFINITIONS.map((v) => [v.key, v.name]));
    const dimMap = new Map(DIMENSION_DEFINITIONS.map((d) => [d.key, d.name]));

    let totalDialogues = 0;
    let analyzedDialogues = 0;
    let totalEvidenceIssues = 0;
    const playFlaggedDlgs = new Set<string>();

    acts.forEach((act) => {
      act.scenes.forEach((scene) => {
        const sceneId = scene.scene_id;
        const dialogueGroups: DialogueReviewGroup[] = [];
        const sceneFlaggedDlgs = new Set<string>();
        const byDimensionDialogues: Record<string, Set<string>> = {};
        const byDimensionAssessments: Record<string, number> = {};
        let sceneEvidenceIssues = 0;
        let sceneAssessmentCount = 0;

        DIMENSION_DEFINITIONS.forEach((d) => {
          byDimensionDialogues[d.key] = new Set<string>();
          byDimensionAssessments[d.key] = 0;
        });

        if (scene.dialogues) {
          scene.dialogues.forEach((dlg) => {
            totalDialogues++;
            const hasAnalysis = !!dlg.analysis && Object.keys(dlg.analysis).length > 0;
            if (hasAnalysis) {
              analyzedDialogues++;
            }

            const dialogueIssues: ReviewIssue[] = [];
            let dlgHasInvalidEvidence = false;

            VERSION_DEFINITIONS.forEach((v) => {
              const verObj = dlg.analysis?.[v.key];
              if (!verObj) return;

              DIMENSION_DEFINITIONS.forEach((dim) => {
                const ana = verObj[dim.key];
                const review = dlg.expert_review?.dimension_reviews?.[v.key]?.[dim.key];

                const evalResult = this.evaluateAssessment(
                  ana,
                  review,
                  dlg.dialogue_id,
                  v.key,
                  dim.key
                );

                if (evalResult.evidenceStatus === 'Invalid') {
                  sceneEvidenceIssues++;
                  totalEvidenceIssues++;
                  dlgHasInvalidEvidence = true;
                }

                if (evalResult.flagged) {
                  const issueId = `${dlg.dialogue_id}:${v.key}:${dim.key}`;
                  const issue: ReviewIssue = {
                    issueId,
                    dialogueId: dlg.dialogue_id,
                    act: act.act,
                    sceneId,
                    speaker: dlg.speaker,
                    english: dlg.texts.english || '',
                    translationKey: v.key,
                    translationName: verMap.get(v.key) || v.key,
                    dimensionKey: dim.key,
                    dimensionName: dimMap.get(dim.key) || dim.key,
                    reasons: evalResult.reasons,
                    score: evalResult.effectiveScore,
                    confidence: ana?.confidence ?? null,
                    evidenceStatus: evalResult.evidenceStatus,
                    resolved: evalResult.resolved,
                    resolutionType: evalResult.resolutionType,
                    resolutionComment: review?.comment || null
                  };

                  dialogueIssues.push(issue);
                  this.allIssues.set(issueId, issue);

                  sceneAssessmentCount++;
                  sceneFlaggedDlgs.add(dlg.dialogue_id);
                  playFlaggedDlgs.add(dlg.dialogue_id);

                  byDimensionDialogues[dim.key].add(dlg.dialogue_id);
                  byDimensionAssessments[dim.key] = (byDimensionAssessments[dim.key] || 0) + 1;
                }
              });
            });

            if (dialogueIssues.length > 0) {
              dialogueGroups.push({
                dialogue: dlg,
                dialogueId: dlg.dialogue_id,
                act: act.act,
                sceneId,
                speaker: dlg.speaker,
                english: dlg.texts.english || '',
                issues: dialogueIssues,
                issueCount: dialogueIssues.length,
                hasInvalidEvidence: dlgHasInvalidEvidence
              });
            }
          });
        }

        const byDimension: Record<string, number> = {};
        DIMENSION_DEFINITIONS.forEach((d) => {
          byDimension[d.key] = byDimensionDialogues[d.key]?.size || 0;
        });

        const sortedDialogueIds = Array.from(sceneFlaggedDlgs).sort();

        const sceneSummary: SceneReviewSummary = {
          sceneId,
          act: act.act,
          sceneNumber: scene.scene_number || 1,
          flaggedAssessmentCount: sceneAssessmentCount,
          flaggedDialogueCount: sceneFlaggedDlgs.size,
          flaggedDialogueIds: sortedDialogueIds,
          byDimension,
          byDimensionAssessments,
          evidenceIssueCount: sceneEvidenceIssues
        };

        this.sceneSummaries.set(sceneId, sceneSummary);
        this.sceneDialogueGroups.set(sceneId, dialogueGroups);
      });
    });

    this.playSummary = {
      totalDialogues,
      analyzedDialogues,
      flaggedDialogueCount: playFlaggedDlgs.size,
      flaggedAssessmentCount: this.allIssues.size,
      evidenceIssueCount: totalEvidenceIssues,
      sceneSummaries: this.sceneSummaries
    };

    return this.playSummary;
  }

  getSceneSummary(sceneId: string): SceneReviewSummary | undefined {
    return this.sceneSummaries.get(sceneId);
  }

  getSceneFlaggedDialogueCount(sceneId: string): number {
    return this.sceneSummaries.get(sceneId)?.flaggedDialogueCount || 0;
  }

  getSceneFlaggedAssessmentCount(sceneId: string): number {
    return this.sceneSummaries.get(sceneId)?.flaggedAssessmentCount || 0;
  }

  getSceneDialogueGroups(sceneId: string): DialogueReviewGroup[] {
    return this.sceneDialogueGroups.get(sceneId) || [];
  }

  getSceneDimensionFlaggedDialogueCount(sceneId: string, dimKey: string): number {
    const summary = this.sceneSummaries.get(sceneId);
    return summary?.byDimension[dimKey] || 0;
  }

  isDialogueFlagged(dialogueId: string, dimKey?: string): boolean {
    for (const [_, issue] of this.allIssues) {
      if (issue.dialogueId === dialogueId) {
        if (!dimKey || issue.dimensionKey === dimKey) {
          return true;
        }
      }
    }
    return false;
  }

  getPlaySummary(): PlayReviewSummary {
    return this.playSummary;
  }
}
