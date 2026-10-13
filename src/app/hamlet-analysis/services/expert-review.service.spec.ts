import { TestBed } from '@angular/core/testing';
import { ExpertReviewService } from './expert-review.service';
import { AnalysisDialogue } from '../models/hamlet-analysis-v15.models';

describe('ExpertReviewService', () => {
  let service: ExpertReviewService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(ExpertReviewService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should save review without mutating analysis object', () => {
    const dialogue: AnalysisDialogue = {
      dialogue_id: 'EN-A1-S1-D00008',
      speaker: 'FRANCISCO',
      texts: { english: 'For this relief much thanks.' },
      analysis: {
        human_german: {
          semantic: {
            applicable: true,
            score: 90,
            confidence: 0.9,
            status: 'Preserved',
            explanation: 'Original model explanation',
            evidence: [],
            needs_review: false
          }
        }
      }
    };

    service.saveReview(dialogue, 'human_german', 'semantic', {
      decision: 'Accept',
      score_override: 95,
      comment: 'Excellent translation',
      reviewer: 'Shakespeare Scholar',
      reviewed_at: new Date().toISOString()
    });

    // Check expert_review object was updated
    const saved = service.getReview(dialogue, 'human_german', 'semantic');
    expect(saved.decision).toBe('Accept');
    expect(saved.score_override).toBe(95);
    expect(saved.reviewer).toBe('Shakespeare Scholar');

    // Ensure analysis was NEVER mutated
    expect(dialogue.analysis.human_german?.['semantic'].score).toBe(90);
    expect(dialogue.analysis.human_german?.['semantic'].explanation).toBe('Original model explanation');
  });

  it('should persist and restore review across service instances', () => {
    const dialogue: AnalysisDialogue = {
      dialogue_id: 'EN-A1-S1-D00008',
      speaker: 'FRANCISCO',
      texts: { english: 'For this relief much thanks.' },
      analysis: {}
    };

    service.saveReview(dialogue, 'ai_german', 'tone', {
      decision: 'Needs Revision',
      score_override: 70,
      comment: 'Too casual',
      reviewer: 'Editor 1',
      reviewed_at: new Date().toISOString()
    });

    // Instantiate new service to test localStorage persistence
    const newService = new ExpertReviewService();
    const freshDialogue: AnalysisDialogue = {
      dialogue_id: 'EN-A1-S1-D00008',
      speaker: 'FRANCISCO',
      texts: { english: 'For this relief much thanks.' },
      analysis: {}
    };

    newService.attachReviewsToDialogue(freshDialogue);
    const restored = newService.getReview(freshDialogue, 'ai_german', 'tone');
    expect(restored.decision).toBe('Needs Revision');
    expect(restored.score_override).toBe(70);
    expect(restored.comment).toBe('Too casual');
  });
});
