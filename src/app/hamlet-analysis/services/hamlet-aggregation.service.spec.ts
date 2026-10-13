import { TestBed } from '@angular/core/testing';
import { HamletAggregationService } from './hamlet-aggregation.service';
import { AnalysisDialogue } from '../models/hamlet-analysis-v15.models';

describe('HamletAggregationService', () => {
  let service: HamletAggregationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(HamletAggregationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should correctly calculate English-character-length-weighted mean', () => {
    const dialogues: AnalysisDialogue[] = [
      {
        dialogue_id: 'D1',
        speaker: 'A',
        texts: { english: 'Short text' }, // length 10
        analysis: {
          human_german: {
            semantic: {
              applicable: true,
              score: 80,
              confidence: 0.9,
              status: 'Preserved',
              explanation: '',
              evidence: [],
              needs_review: false
            }
          }
        }
      },
      {
        dialogue_id: 'D2',
        speaker: 'B',
        texts: { english: 'A much longer sentence here' }, // length 27
        analysis: {
          human_german: {
            semantic: {
              applicable: true,
              score: 90,
              confidence: 0.95,
              status: 'Preserved',
              explanation: '',
              evidence: [],
              needs_review: false
            }
          }
        }
      },
      {
        dialogue_id: 'D3',
        speaker: 'C',
        texts: { english: 'Not applicable dialogue' },
        analysis: {
          human_german: {
            semantic: {
              applicable: false,
              score: null,
              confidence: 1,
              status: 'Not Applicable',
              explanation: '',
              evidence: [],
              needs_review: false
            }
          }
        }
      }
    ];

    // (80 * 10 + 90 * 27) / (10 + 27) = (800 + 2430) / 37 = 3230 / 37 ≈ 87.297 -> 87.3
    const res = service.calculateSceneDimensionScore(dialogues, 'human_german', 'semantic');
    expect(res.score).toBe(87.3);
    expect(res.units).toBe(2);
    expect(res.total_units).toBe(3);
  });

  it('should handle missing or non-applicable dimensions by returning score null', () => {
    const dialogues: AnalysisDialogue[] = [
      {
        dialogue_id: 'D1',
        speaker: 'A',
        texts: { english: 'Test' },
        analysis: {
          human_german: {
            wordplay: {
              applicable: false,
              score: null,
              confidence: 1,
              status: 'Not Applicable',
              explanation: '',
              evidence: [],
              needs_review: false
            }
          }
        }
      }
    ];

    const res = service.calculateSceneDimensionScore(dialogues, 'human_german', 'wordplay');
    expect(res.score).toBeNull();
    expect(res.units).toBe(0);
  });

  it('should calculate Context Effect as Context AI minus AI', () => {
    const effPositive = service.calculateContextEffect(85, 90);
    expect(effPositive.value).toBe(5);
    expect(effPositive.text).toBe('+5');

    const effNegative = service.calculateContextEffect(90, 85);
    expect(effNegative.value).toBe(-5);
    expect(effNegative.text).toBe('-5');

    const effNull = service.calculateContextEffect(null, 85);
    expect(effNull.value).toBeNull();
    expect(effNull.text).toBe('N/A');
  });
});
