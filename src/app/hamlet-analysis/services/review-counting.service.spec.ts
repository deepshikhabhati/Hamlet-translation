import { TestBed } from '@angular/core/testing';
import { ReviewCountingService, DEFAULT_REVIEW_POLICY } from './review-counting.service';
import { AnalysisAct, AnalysisDialogue } from '../models/hamlet-analysis-v15.models';

describe('ReviewCountingService — Canonical Review Logic Suite', () => {
  let service: ReviewCountingService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ReviewCountingService]
    });
    service = TestBed.inject(ReviewCountingService);
  });

  it('should be created with default review policy', () => {
    expect(service).toBeTruthy();
    expect(service.getPolicy().confidenceThreshold).toBe(0.70);
    expect(service.getPolicy().includeModelFlag).toBeTrue();
    expect(service.getPolicy().includeInvalidEvidence).toBeTrue();
  });

  it('should count one dialogue with four flagged assessments as one flagged dialogue', () => {
    const dialogueWith4Flags: AnalysisDialogue = {
      dialogue_id: 'TEST-D1',
      speaker: 'HAMLET',
      texts: { english: 'To be, or not to be.', human_german: 'Sein oder Nichtsein.' },
      analysis: {
        human_german: {
          semantic: { applicable: true, score: 80, confidence: 0.60, status: 'Preserved', explanation: '', evidence: [], needs_review: false },
          tone: { applicable: true, score: 75, confidence: 0.65, status: 'Preserved', explanation: '', evidence: [], needs_review: false }
        },
        ai_german: {
          semantic: { applicable: true, score: 85, confidence: 0.90, status: 'Preserved', explanation: '', evidence: [], needs_review: true },
          emotion: { applicable: true, score: 60, confidence: 0.50, status: 'Changed', explanation: '', evidence: [], needs_review: false }
        }
      }
    };

    const mockActs: AnalysisAct[] = [
      {
        act: 1,
        scenes: [
          {
            scene_id: 'A1-S1',
            act: 1,
            scene_number: 1,
            title: 'Platform',
            dialogues: [dialogueWith4Flags]
          }
        ]
      }
    ];

    service.buildIndex(mockActs);

    const summary = service.getSceneSummary('A1-S1');
    expect(summary).toBeDefined();
    expect(summary?.flaggedDialogueCount).toBe(1);
    expect(summary?.flaggedAssessmentCount).toBe(4);
    expect(summary?.flaggedDialogueIds).toEqual(['TEST-D1']);

    const groups = service.getSceneDialogueGroups('A1-S1');
    expect(groups.length).toBe(1);
    expect(groups[0].dialogueId).toBe('TEST-D1');
    expect(groups[0].issues.length).toBe(4);
  });

  it('should not inflate counts with duplicate issue records', () => {
    const dialogue: AnalysisDialogue = {
      dialogue_id: 'TEST-D1',
      speaker: 'HORATIO',
      texts: { english: 'Friends to this ground.' },
      analysis: {
        human_german: {
          semantic: { applicable: true, score: 85, confidence: 0.55, status: 'Preserved', explanation: '', evidence: [], needs_review: false }
        }
      }
    };

    const mockActs: AnalysisAct[] = [
      {
        act: 1,
        scenes: [{ scene_id: 'A1-S1', act: 1, scene_number: 1, title: 'Scene 1', dialogues: [dialogue] }]
      }
    ];

    // Building index multiple times should produce consistent, deduplicated counts
    service.buildIndex(mockActs);
    service.buildIndex(mockActs);

    const summary = service.getSceneSummary('A1-S1');
    expect(summary?.flaggedDialogueCount).toBe(1);
    expect(summary?.flaggedAssessmentCount).toBe(1);
  });

  it('should ensure scene table and review modal show the same unique dialogue count', () => {
    const d1: AnalysisDialogue = {
      dialogue_id: 'D1',
      speaker: 'BERNARDO',
      texts: { english: 'Who’s there?' },
      analysis: { human_german: { semantic: { applicable: true, score: 90, confidence: 0.5, status: 'Preserved', explanation: '', evidence: [], needs_review: false } } }
    };
    const d2: AnalysisDialogue = {
      dialogue_id: 'D2',
      speaker: 'FRANCISCO',
      texts: { english: 'Nay, answer me.' },
      analysis: { human_german: { semantic: { applicable: true, score: 95, confidence: 0.95, status: 'Preserved', explanation: '', evidence: [], needs_review: false } } }
    };
    const d3: AnalysisDialogue = {
      dialogue_id: 'D3',
      speaker: 'BERNARDO',
      texts: { english: 'Long live the king!' },
      analysis: { ai_german: { tone: { applicable: true, score: 80, confidence: 0.9, status: 'Preserved', explanation: '', evidence: [], needs_review: true } } }
    };

    const mockActs: AnalysisAct[] = [
      {
        act: 1,
        scenes: [{ scene_id: 'A1-S1', act: 1, scene_number: 1, title: 'Scene 1', dialogues: [d1, d2, d3] }]
      }
    ];

    service.buildIndex(mockActs);

    // Scene table count
    const tableToReviewCount = service.getSceneFlaggedDialogueCount('A1-S1');
    // Modal drilldown groups
    const modalGroups = service.getSceneDialogueGroups('A1-S1');

    expect(tableToReviewCount).toBe(2); // D1 and D3
    expect(modalGroups.length).toBe(2);
    expect(modalGroups.map(g => g.dialogueId)).toEqual(['D1', 'D3']);
  });

  it('should verify reading view Needs review count matches its filtered results', () => {
    const d1: AnalysisDialogue = {
      dialogue_id: 'D1',
      speaker: 'HORATIO',
      texts: { english: 'A piece of him.' },
      analysis: { human_german: { semantic: { applicable: true, score: 80, confidence: 0.5, status: 'Preserved', explanation: '', evidence: [], needs_review: false } } }
    };
    const d2: AnalysisDialogue = {
      dialogue_id: 'D2',
      speaker: 'MARCELLUS',
      texts: { english: 'Welcome, Horatio.' },
      analysis: { human_german: { semantic: { applicable: true, score: 95, confidence: 0.9, status: 'Preserved', explanation: '', evidence: [], needs_review: false } } }
    };

    const mockActs: AnalysisAct[] = [
      {
        act: 1,
        scenes: [{ scene_id: 'A1-S1', act: 1, scene_number: 1, title: 'Scene 1', dialogues: [d1, d2] }]
      }
    ];

    service.buildIndex(mockActs);

    const flaggedCount = service.getSceneFlaggedDialogueCount('A1-S1');
    expect(flaggedCount).toBe(1);

    const filteredDialogues = [d1, d2].filter(d => service.isDialogueFlagged(d.dialogue_id));
    expect(filteredDialogues.length).toBe(flaggedCount);
    expect(filteredDialogues[0].dialogue_id).toBe('D1');
  });

  it('should compute dimension-specific counts correctly', () => {
    const d1: AnalysisDialogue = {
      dialogue_id: 'D1',
      speaker: 'HAMLET',
      texts: { english: 'A little more than kin, and less than kind.' },
      analysis: {
        human_german: {
          wordplay: { applicable: true, score: 50, confidence: 0.5, status: 'Lost', explanation: 'Untranslatable pun', evidence: [], needs_review: true },
          semantic: { applicable: true, score: 95, confidence: 0.95, status: 'Preserved', explanation: '', evidence: [], needs_review: false }
        }
      }
    };
    const d2: AnalysisDialogue = {
      dialogue_id: 'D2',
      speaker: 'KING',
      texts: { english: 'How is it that the clouds still hang on you?' },
      analysis: {
        human_german: {
          semantic: { applicable: true, score: 85, confidence: 0.6, status: 'Preserved', explanation: '', evidence: [], needs_review: false }
        }
      }
    };

    const mockActs: AnalysisAct[] = [
      {
        act: 1,
        scenes: [{ scene_id: 'A1-S2', act: 1, scene_number: 2, title: 'Room of state', dialogues: [d1, d2] }]
      }
    ];

    service.buildIndex(mockActs);

    expect(service.getSceneDimensionFlaggedDialogueCount('A1-S2', 'wordplay')).toBe(1);
    expect(service.getSceneDimensionFlaggedDialogueCount('A1-S2', 'semantic')).toBe(1);
    expect(service.getSceneDimensionFlaggedDialogueCount('A1-S2', 'tone')).toBe(0);
    expect(service.getSceneFlaggedDialogueCount('A1-S2')).toBe(2);
  });

  it('should exclude Not Applicable assessments from review flagging and missing-score warnings', () => {
    const dNonApp: AnalysisDialogue = {
      dialogue_id: 'D-NA',
      speaker: 'GHOST',
      texts: { english: 'Mark me.' },
      analysis: {
        human_german: {
          cultural_archaic: { applicable: false, score: null, confidence: null, status: 'Not Applicable', explanation: 'No cultural reference', evidence: [], needs_review: false },
          wordplay: { applicable: false, score: null, confidence: null, status: 'Not Applicable', explanation: 'No wordplay present', evidence: [], needs_review: false }
        }
      }
    };

    const mockActs: AnalysisAct[] = [
      {
        act: 1,
        scenes: [{ scene_id: 'A1-S5', act: 1, scene_number: 5, title: 'Castle walls', dialogues: [dNonApp] }]
      }
    ];

    service.buildIndex(mockActs);

    const summary = service.getSceneSummary('A1-S5');
    expect(summary?.flaggedDialogueCount).toBe(0);
    expect(summary?.flaggedAssessmentCount).toBe(0);
    expect(service.isDialogueFlagged('D-NA')).toBeFalse();
  });

  it('should follow documented resolution policy for expert-reviewed issues', () => {
    const dReviewed: AnalysisDialogue = {
      dialogue_id: 'D-EXP',
      speaker: 'POLONIUS',
      texts: { english: 'Though this be madness, yet there is method in’t.' },
      analysis: {
        human_german: {
          semantic: { applicable: true, score: 70, confidence: 0.6, status: 'Preserved', explanation: '', evidence: [], needs_review: true }
        }
      },
      expert_review: {
        reviewer: 'Dr. Schlegel',
        reviewed_at: '2026-10-13T10:00:00Z',
        status: 'completed',
        dimension_reviews: {
          human_german: {
            semantic: {
              decision: 'Accept',
              score_override: 95,
              comment: 'Accepted with override',
              reviewer: 'Dr. Schlegel',
              reviewed_at: '2026-10-13T10:00:00Z'
            }
          },
          ai_german: {},
          context_ai_german: {}
        }
      }
    };

    const mockActs: AnalysisAct[] = [
      {
        act: 2,
        scenes: [{ scene_id: 'A2-S2', act: 2, scene_number: 2, title: 'Room in castle', dialogues: [dReviewed] }]
      }
    ];

    service.buildIndex(mockActs);

    // Because decision is 'Accept', the issue is marked resolved and does not count toward active flagged queue
    expect(service.isDialogueFlagged('D-EXP')).toBeFalse();
    expect(service.getSceneFlaggedDialogueCount('A2-S2')).toBe(0);

    const groups = service.getSceneDialogueGroups('A2-S2');
    expect(groups.length).toBe(0);
  });

  it('should track invalid evidence distinctly', () => {
    const dInvalidSpan: AnalysisDialogue = {
      dialogue_id: 'D-INV',
      speaker: 'OPHELIA',
      texts: { english: 'My lord, as I was sewing in my closet' },
      analysis: {
        human_german: {
          semantic: {
            applicable: true,
            score: 95,
            confidence: 0.95,
            status: 'Preserved',
            explanation: '',
            needs_review: false,
            evidence: [
              {
                source_quote: 'sewing in my closet',
                target_quote: 'invalid',
                explanation: 'evidence explanation',
                source_span: { start: 10, end: 50, text: 'invalid text slice' },
                target_span: { start: 10, end: 50, text: 'invalid target' },
                status: 'Preserved',
                span_validation: {
                  source_valid: false,
                  target_valid: true,
                  valid: false,
                  offset_unit: 'unicode_codepoint',
                  end_exclusive: true,
                  reason: 'Source slice mismatch'
                }
              }
            ]
          }
        }
      }
    };

    const mockActs: AnalysisAct[] = [
      {
        act: 2,
        scenes: [{ scene_id: 'A2-S1', act: 2, scene_number: 1, title: 'House of Polonius', dialogues: [dInvalidSpan] }]
      }
    ];

    service.buildIndex(mockActs);

    const summary = service.getSceneSummary('A2-S1');
    expect(summary?.flaggedDialogueCount).toBe(1);
    expect(summary?.evidenceIssueCount).toBe(1);

    const groups = service.getSceneDialogueGroups('A2-S1');
    expect(groups.length).toBe(1);
    expect(groups[0].hasInvalidEvidence).toBeTrue();
    expect(groups[0].issues[0].evidenceStatus).toBe('Invalid');
  });

  it('should ensure act and scene filtering does not leak records', () => {
    const dAct1: AnalysisDialogue = {
      dialogue_id: 'D-A1',
      speaker: 'FRANCISCO',
      texts: { english: 'Give you good night.' },
      analysis: { human_german: { semantic: { applicable: true, score: 80, confidence: 0.5, status: 'Preserved', explanation: '', evidence: [], needs_review: false } } }
    };
    const dAct2: AnalysisDialogue = {
      dialogue_id: 'D-A2',
      speaker: 'POLONIUS',
      texts: { english: 'Give him this money.' },
      analysis: { human_german: { semantic: { applicable: true, score: 85, confidence: 0.5, status: 'Preserved', explanation: '', evidence: [], needs_review: false } } }
    };

    const mockActs: AnalysisAct[] = [
      {
        act: 1,
        scenes: [{ scene_id: 'A1-S1', act: 1, scene_number: 1, title: 'Act 1 Scene 1', dialogues: [dAct1] }]
      },
      {
        act: 2,
        scenes: [{ scene_id: 'A2-S1', act: 2, scene_number: 1, title: 'Act 2 Scene 1', dialogues: [dAct2] }]
      }
    ];

    service.buildIndex(mockActs);

    const a1Groups = service.getSceneDialogueGroups('A1-S1');
    expect(a1Groups.length).toBe(1);
    expect(a1Groups[0].dialogueId).toBe('D-A1');

    const a2Groups = service.getSceneDialogueGroups('A2-S1');
    expect(a2Groups.length).toBe(1);
    expect(a2Groups[0].dialogueId).toBe('D-A2');
  });

  it('should support all five acts across the play summary', () => {
    const createAct = (actNum: number): AnalysisAct => ({
      act: actNum,
      scenes: [
        {
          scene_id: `A${actNum}-S1`,
          act: actNum,
          scene_number: 1,
          title: `Act ${actNum} Scene 1`,
          dialogues: [
            {
              dialogue_id: `D-ACT${actNum}`,
              speaker: 'SPEAKER',
              texts: { english: `Line from Act ${actNum}` },
              analysis: {
                human_german: {
                  semantic: { applicable: true, score: 75, confidence: 0.5, status: 'Preserved', explanation: '', evidence: [], needs_review: false }
                }
              }
            }
          ]
        }
      ]
    });

    const fiveActs: AnalysisAct[] = [1, 2, 3, 4, 5].map(createAct);
    service.buildIndex(fiveActs);

    const playSummary = service.getPlaySummary();
    expect(playSummary.totalDialogues).toBe(5);
    expect(playSummary.analyzedDialogues).toBe(5);
    expect(playSummary.flaggedDialogueCount).toBe(5);
    expect(playSummary.flaggedAssessmentCount).toBe(5);

    for (let act = 1; act <= 5; act++) {
      expect(service.getSceneFlaggedDialogueCount(`A${act}-S1`)).toBe(1);
    }
  });
});
