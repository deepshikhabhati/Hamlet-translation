import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SceneDialogueTableComponent } from './scene-dialogue-table.component';
import { ExpertReviewService } from '../../services/expert-review.service';
import { AnalysisScene, AnalysisDialogue } from '../../models/hamlet-analysis-v15.models';

describe('SceneDialogueTableComponent', () => {
  let component: SceneDialogueTableComponent;
  let fixture: ComponentFixture<SceneDialogueTableComponent>;
  let mockExpertReviewService: jasmine.SpyObj<ExpertReviewService>;

  const mockDialogues: AnalysisDialogue[] = Array.from({ length: 25 }, (_, i) => ({
    dialogue_id: `EN-A1-S1-D000${(i + 1).toString().padStart(2, '0')}`,
    speaker: i % 2 === 0 ? 'BARNARDO' : 'FRANCISCO',
    texts: {
      english: `Speech line ${i + 1}`,
      human_german: `Deutsche Rede ${i + 1}`,
      ai_german: `KI Rede ${i + 1}`,
      context_ai_german: `Kontext KI Rede ${i + 1}`
    },
    analysis: {
      human_german: {
        semantic: {
          applicable: true,
          score: 85,
          confidence: 0.95,
          status: 'Preserved',
          explanation: 'Accurate preservation',
          evidence: [
            {
              source_quote: 'Speech line',
              target_quote: 'Deutsche Rede',
              source_span: { start: 0, end: 11, text: 'Speech line' },
              target_span: { start: 0, end: 13, text: 'Deutsche Rede' },
              status: 'Preserved',
              explanation: 'Semantic match',
              valid: true
            }
          ],
          needs_review: false
        },
        emotion: {
          applicable: true,
          score: 90,
          confidence: 0.9,
          status: 'Preserved',
          explanation: '',
          evidence: [],
          needs_review: false
        }
      },
      ai_german: {
        semantic: {
          applicable: true,
          score: 88,
          confidence: 0.92,
          status: 'Preserved',
          explanation: '',
          evidence: [],
          needs_review: false
        }
      },
      context_ai_german: {
        semantic: {
          applicable: true,
          score: 87,
          confidence: 0.94,
          status: 'Preserved',
          explanation: '',
          evidence: [],
          needs_review: false
        }
      }
    }
  }));

  const mockScene: AnalysisScene = {
    scene_id: 'A1-S1',
    act: 1,
    scene_number: 1,
    title: 'Elsinore. A platform before the castle.',
    analyzed_count: 25,
    dialogues: mockDialogues
  };

  beforeEach(async () => {
    mockExpertReviewService = jasmine.createSpyObj('ExpertReviewService', ['saveReview', 'getReview']);

    await TestBed.configureTestingModule({
      imports: [SceneDialogueTableComponent],
      providers: [
        { provide: ExpertReviewService, useValue: mockExpertReviewService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SceneDialogueTableComponent);
    component = fixture.componentInstance;
    component.scene = mockScene;
    fixture.detectChanges();
  });

  it('should create and initialize with default 10 dialogues limit', () => {
    expect(component).toBeTruthy();
    expect(component.getDisplayedDialogues().length).toBe(10);
    expect(component.getSceneAnalyzedCount()).toBe(25);
  });

  it('should paginate correctly with showMoreDialogues, showAllDialogues, and collapseDialogues', () => {
    component.showMoreDialogues();
    expect(component.getDisplayedDialogues().length).toBe(20);

    component.showAllDialogues();
    expect(component.getDisplayedDialogues().length).toBe(25);

    component.collapseDialogues();
    expect(component.getDisplayedDialogues().length).toBe(10);
  });

  it('should expand and collapse dialogue details', () => {
    const dlgId = mockDialogues[0].dialogue_id;
    expect(component.isDialogueExpanded(dlgId)).toBeFalse();

    component.toggleDialogue(dlgId);
    expect(component.isDialogueExpanded(dlgId)).toBeTrue();
    expect(component.getActiveDimension(dlgId)).toBe('semantic');
    expect(component.getActiveVersion(dlgId)).toBe('human_german');

    component.toggleDialogue(dlgId);
    expect(component.isDialogueExpanded(dlgId)).toBeFalse();
  });

  it('should calculate composite dialogue score without coercing missing scores to zero', () => {
    const dlg = mockDialogues[0];
    const scoreH = component.getDialogueScore(dlg, 'human_german');
    // Human has semantic (85) and emotion (90) applicable -> average 87.5
    expect(scoreH).toBe(87.5);

    // AI only has semantic (88)
    const scoreA = component.getDialogueScore(dlg, 'ai_german');
    expect(scoreA).toBe(88);

    // Spread between 88, 87.5, 87
    expect(component.getDialogueSpread(dlg)).toBe('1');
  });

  it('should support view mode toggle between matrix and chart', () => {
    const dlgId = mockDialogues[0].dialogue_id;
    component.toggleDialogue(dlgId);

    expect(component.dialogueViewMode[dlgId]).toBe('matrix');
    component.dialogueViewMode[dlgId] = 'chart';
    expect(component.dialogueViewMode[dlgId]).toBe('chart');
  });

  it('should navigate through multiple evidence items', () => {
    const dlgId = mockDialogues[0].dialogue_id;
    component.toggleDialogue(dlgId);

    expect(component.getCurrentEvidenceIndex(dlgId)).toBe(0);
    component.nextEvidence(dlgId, 3);
    expect(component.getCurrentEvidenceIndex(dlgId)).toBe(1);

    component.prevEvidence(dlgId, 3);
    expect(component.getCurrentEvidenceIndex(dlgId)).toBe(0);

    // Wrap around
    component.prevEvidence(dlgId, 3);
    expect(component.getCurrentEvidenceIndex(dlgId)).toBe(2);
  });

  it('should save expert review decisions via ExpertReviewService', () => {
    const dlg = mockDialogues[0];
    component.toggleDialogue(dlg.dialogue_id);

    component.reviewDrafts[dlg.dialogue_id].decision = 'Needs Revision';
    component.reviewDrafts[dlg.dialogue_id].scoreOverride = 92;
    component.reviewDrafts[dlg.dialogue_id].comment = 'Excellent archaic fidelity';

    component.saveReview(dlg);

    expect(mockExpertReviewService.saveReview).toHaveBeenCalledWith(
      dlg,
      'human_german',
      'semantic',
      jasmine.objectContaining({
        decision: 'Needs Revision',
        score_override: 92,
        comment: 'Excellent archaic fidelity'
      })
    );
  });
});
