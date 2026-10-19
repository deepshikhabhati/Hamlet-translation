import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { HamletAnalysisComponent } from './hamlet-analysis.component';
import { HamletDataService } from './services/hamlet-data.service';
import { HamletAggregationService } from './services/hamlet-aggregation.service';
import { ExpertReviewService } from './services/expert-review.service';
import { HamletUiAnalysisData } from './models/hamlet-analysis-v15.models';

describe('HamletAnalysisComponent — v1.5 Integration Suite', () => {
  let component: HamletAnalysisComponent;
  let fixture: ComponentFixture<HamletAnalysisComponent>;
  let mockDataService: jasmine.SpyObj<HamletDataService>;

  const mockIntegratedData: HamletUiAnalysisData = {
    metadata: {
      title: 'Hamlet Translation Analysis v1.5 Integrated Dataset',
      dimensions: ['semantic', 'emotion', 'metaphor_imagery', 'tone', 'character_voice', 'wordplay', 'cultural_archaic', 'omissions_additions'],
      versions: ['english', 'human_german', 'ai_german', 'context_ai_german'],
      score_type: '0-100',
      span_offsets: 'unicode_codepoint',
      aggregation: 'english_character_length_weighted_mean',
      total_dialogues: 1107,
      analyzed_dialogues: 454,
      not_analyzed_dialogues: 653,
      scene_count: 20,
      review_assessment_count: 962,
      review_unique_dialogue_count: 264
    },
    acts: [
      {
        act: 1,
        scenes: [
          {
            scene_id: 'A1-S1',
            act: 1,
            scene_number: 1,
            title: 'Elsinore. A platform before the castle.',
            analyzed_count: 59,
            total_dialogues: 59,
            review_dialogues_count: 33,
            dialogues: [
              {
                dialogue_id: 'EN-A1-S1-D00008',
                speaker: 'FRANCISCO',
                texts: {
                  english: 'For this relief much thanks. ’Tis bitter cold, And I am sick at heart.',
                  human_german: 'Ich danke euch recht sehr, daß ihr mich so zeitig ablöset: Es ist bitterlich kalt, und mir ist gar nicht wohl.',
                  ai_german: '„Für diese Ablösung vielen Dank. Es ist bitterkalt, und mir ist schwer ums Herz.',
                  context_ai_german: '„Hab vielen Dank für die Ablösung. Es ist bitterkalt, und mir ist bang ums Herz.'
                },
                analysis: {
                  human_german: {
                    semantic: {
                      applicable: true,
                      score: 90,
                      confidence: 0.9,
                      status: 'Preserved',
                      explanation: 'Gratitude for relief preserved.',
                      evidence: [],
                      needs_review: false
                    },
                    omissions_additions: {
                      applicable: true,
                      score: 85,
                      confidence: 0.9,
                      status: 'Preserved',
                      explanation: '',
                      evidence: [],
                      needs_review: true
                    }
                  },
                  ai_german: {
                    semantic: {
                      applicable: true,
                      score: 90,
                      confidence: 0.9,
                      status: 'Preserved',
                      explanation: '',
                      evidence: [],
                      needs_review: false
                    },
                    omissions_additions: {
                      applicable: true,
                      score: 95,
                      confidence: 0.95,
                      status: 'Preserved',
                      explanation: 'Flagged for review',
                      evidence: [],
                      needs_review: true
                    }
                  },
                  context_ai_german: {
                    semantic: {
                      applicable: true,
                      score: 90,
                      confidence: 0.9,
                      status: 'Preserved',
                      explanation: '',
                      evidence: [],
                      needs_review: false
                    },
                    omissions_additions: {
                      applicable: true,
                      score: 95,
                      confidence: 0.95,
                      status: 'Preserved',
                      explanation: 'Flagged for review',
                      evidence: [],
                      needs_review: true
                    }
                  }
                }
              }
            ],
            scores: {
              human_german: {
                semantic: { score: 91.2, units: 59, total_units: 59 }
              },
              ai_german: {
                semantic: { score: 94.5, units: 59, total_units: 59 }
              },
              context_ai_german: {
                semantic: { score: 96.0, units: 59, total_units: 59 }
              }
            }
          }
        ]
      },
      {
        act: 3,
        scenes: [
          {
            scene_id: 'A3-S2',
            act: 3,
            scene_number: 2,
            title: 'A hall in the castle.',
            analyzed_count: 0,
            total_dialogues: 140,
            review_dialogues_count: 0,
            dialogues: [
              {
                dialogue_id: 'EN-A3-S2-D00001',
                speaker: 'HAMLET',
                texts: {
                  english: 'Speak the speech, I pray you, as I pronounced it to you...',
                  human_german: 'Esst die Rede, ich bitte euch...',
                  ai_german: 'Sprecht die Rede...',
                  context_ai_german: 'Sprecht die Rede...'
                },
                analysis: null as any
              }
            ],
            scores: null
          }
        ]
      }
    ],
    review_queue: [
      {
        review_id: 'EN-A1-S1-D00008:ai_german:omissions_additions',
        dialogue_id: 'EN-A1-S1-D00008',
        scene_id: 'A1-S1',
        act: 1,
        scene_number: 1,
        speaker: 'FRANCISCO',
        english: 'For this relief much thanks...',
        translation_version: 'ai_german',
        dimension: 'omissions_additions',
        score: 95,
        confidence: 0.95,
        reasons: ['model_needs_review'],
        invalid_evidence_ids: [],
        expert_review_status: 'pending'
      },
      {
        review_id: 'EN-A1-S1-D00008:context_ai_german:omissions_additions',
        dialogue_id: 'EN-A1-S1-D00008',
        scene_id: 'A1-S1',
        act: 1,
        scene_number: 1,
        speaker: 'FRANCISCO',
        english: 'For this relief much thanks...',
        translation_version: 'context_ai_german',
        dimension: 'omissions_additions',
        score: 95,
        confidence: 0.95,
        reasons: ['model_needs_review'],
        invalid_evidence_ids: [],
        expert_review_status: 'pending'
      }
    ]
  };

  beforeEach(async () => {
    mockDataService = jasmine.createSpyObj('HamletDataService', [
      'getData',
      'loadFullBookUiData',
      'loadFullBookHierarchy',
      'getPhraseEvidenceData',
      'loadAnalysisJson',
      'loadComputationReport',
      'loadSpanValidationReport'
    ]);

    mockDataService.getData.and.returnValue(of({ passages: [] }));
    mockDataService.loadFullBookUiData.and.returnValue(of(null));
    mockDataService.loadFullBookHierarchy.and.returnValue(of(null));
    mockDataService.getPhraseEvidenceData.and.returnValue(of(null));
    mockDataService.loadAnalysisJson.and.returnValue(of(mockIntegratedData));
    mockDataService.loadComputationReport.and.returnValue(of(null));
    mockDataService.loadSpanValidationReport.and.returnValue(of(null));

    await TestBed.configureTestingModule({
      imports: [HamletAnalysisComponent, HttpClientTestingModule],
      providers: [
        { provide: HamletDataService, useValue: mockDataService },
        HamletAggregationService,
        ExpertReviewService
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(HamletAnalysisComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should initialize and not select any scene by default', () => {
    expect(component).toBeTruthy();
    expect(component.selectedAnalysisAct).toBe(1);
    expect(component.selectedAnalysisScene).toBeNull();
  });

  it('should distinguish analyzed scenes from unanalyzed scenes', () => {
    const act1Scene1 = component.analysisActs[0].scenes[0];
    const act3Scene2 = component.analysisActs[1].scenes[0];

    expect(component.isSceneAnalyzed(act1Scene1)).toBeTrue();
    expect(component.isSceneAnalyzed(act3Scene2)).toBeFalse();

    // Analyzed scene returns real scores
    expect(component.getSceneDimensionScore(act1Scene1, 'semantic', 'human_german')).toBe(91.2);
    // Unanalyzed scene strictly returns null (Never displays zero)
    expect(component.getSceneDimensionScore(act3Scene2, 'semantic', 'human_german')).toBeNull();
  });

  it('should correctly verify D00008 expected scores and review items', () => {
    const act1Scene1 = component.analysisActs[0].scenes[0];
    component.selectAnalysisScene(act1Scene1);

    const d8 = act1Scene1.dialogues.find(d => d.dialogue_id === 'EN-A1-S1-D00008')!;
    expect(d8).toBeDefined();

    // Check expected D00008 scores
    expect(d8.analysis?.human_german?.['semantic'].score).toBe(90);
    expect(d8.analysis?.ai_german?.['omissions_additions'].score).toBe(95);
    expect(d8.analysis?.ai_german?.['omissions_additions'].needs_review).toBeTrue();
    expect(d8.analysis?.context_ai_german?.['omissions_additions'].needs_review).toBeTrue();

    // Check review queue has both D00008 items
    const queueItems = component.getValidationQueueItems();
    expect(queueItems.length).toBe(2);
    expect(queueItems[0].dialogue_id).toBe('EN-A1-S1-D00008');
  });

  it('should switch dimensions without reloading the scene', () => {
    const act1Scene1 = component.analysisActs[0].scenes[0];
    component.selectAnalysisScene(act1Scene1);

    component.selectedAnalysisDimension = 'semantic';
    let rows = component.getFilteredPhraseRows();
    expect(rows.length).toBe(1);
    expect(rows[0].humanStatus).toBe('Preserved');

    // Switch to omissions_additions
    component.selectedAnalysisDimension = 'omissions_additions';
    rows = component.getFilteredPhraseRows();
    expect(rows.length).toBe(1);
    expect(rows[0].needsReview).toBeTrue();
  });

  it('should filter dialogues by search text (ID or speaker)', () => {
    const act1Scene1 = component.analysisActs[0].scenes[0];
    component.selectAnalysisScene(act1Scene1);

    component.analysisSearchText = 'FRANCISCO';
    expect(component.getFilteredPhraseRows().length).toBe(1);

    component.analysisSearchText = 'NONEXISTENT';
    expect(component.getFilteredPhraseRows().length).toBe(0);

    component.analysisSearchText = 'D00008';
    expect(component.getFilteredPhraseRows().length).toBe(1);
  });

  it('should navigate from validation queue to exact dialogue, dimension, and translation', () => {
    const queueItems = component.getValidationQueueItems();
    const targetItem = queueItems[0];

    component.onQueueItemReview(targetItem);

    expect(component.selectedAnalysisAct).toBe(1);
    expect(component.selectedAnalysisScene?.scene_id).toBe('A1-S1');
    expect(component.selectedAnalysisDimension).toBe('omissions_additions');
    expect(component.valTarget).toBe('ai_german');
    expect(component.activeInspectedDialogueId).toBe('EN-A1-S1-D00008');
  });

  it('should save expert review without mutating original model analysis', () => {
    const act1Scene1 = component.analysisActs[0].scenes[0];
    const d8 = act1Scene1.dialogues[0];

    component.selectAnalysisScene(act1Scene1);
    component.openInspector('EN-A1-S1-D00008');
    component.valTarget = 'ai_german';
    component.activeInspectorDim = 'omissions_additions';

    component.valDecision = 'Accept';
    component.valScoreOverride = 98;
    component.valReviewer = 'Dr. Shakespeare';
    component.valComment = 'Validated fidelity';
    component.saveValidation();

    // Verify original analysis is NOT mutated
    expect(d8.analysis?.ai_german?.['omissions_additions'].score).toBe(95);

    // Verify expert review draft was persisted
    expect(d8.expert_review?.dimension_reviews.ai_german['omissions_additions'].decision).toBe('Accept');
    expect(d8.expert_review?.dimension_reviews.ai_german['omissions_additions'].score_override).toBe(98);
  });

  describe('Issue 2 — Scene Row Expansion vs Selection Interactions', () => {
    it('should select scene without expanding dialogues when selecting a scene row', () => {
      const act1Scene1 = component.analysisActs[0].scenes[0];
      expect(component.isSceneExpanded('A1-S1')).toBeFalse();

      // Selecting the scene row should update selectedAnalysisScene but NOT expand dialogues
      component.selectAnalysisScene(act1Scene1);
      expect(component.selectedAnalysisScene?.scene_id).toBe('A1-S1');
      expect(component.isSceneExpanded('A1-S1')).toBeFalse();
    });

    it('should expand and collapse dialogues only when toggleSceneExpand is triggered (chevron action)', () => {
      expect(component.isSceneExpanded('A1-S1')).toBeFalse();

      // First click on chevron expands
      component.toggleSceneExpand('A1-S1');
      expect(component.isSceneExpanded('A1-S1')).toBeTrue();

      // Second click on chevron collapses
      component.toggleSceneExpand('A1-S1');
      expect(component.isSceneExpanded('A1-S1')).toBeFalse();
    });

    it('should keep multiple scenes expanded independently without closing one another', () => {
      component.toggleSceneExpand('A1-S1', true);
      component.toggleSceneExpand('A1-S2', true);

      expect(component.isSceneExpanded('A1-S1')).toBeTrue();
      expect(component.isSceneExpanded('A1-S2')).toBeTrue();

      component.toggleSceneExpand('A1-S1', false);
      expect(component.isSceneExpanded('A1-S1')).toBeFalse();
      expect(component.isSceneExpanded('A1-S2')).toBeTrue();
    });

    it('should open review drilldown modal without expanding the scene row', () => {
      const act1Scene1 = component.analysisActs[0].scenes[0];
      expect(component.isSceneExpanded('A1-S1')).toBeFalse();

      component.openReviewDrilldown(act1Scene1);

      expect(component.reviewDrilldownModalOpen).toBeTrue();
      expect(component.isSceneExpanded('A1-S1')).toBeFalse();
      expect(component.reviewDrilldownData?.scene?.scene_id).toBe('A1-S1');
    });

    it('should open score trace without expanding the scene row', () => {
      const act1Scene1 = component.analysisActs[0].scenes[0];
      expect(component.isSceneExpanded('A1-S1')).toBeFalse();

      component.openScoreTrace(act1Scene1, 'semantic', 'human_german');

      expect(component.scoreTraceModalOpen).toBeTrue();
      expect(component.isSceneExpanded('A1-S1')).toBeFalse();
    });
  });

  describe('Issue 1 — Count Agreement & Reading View Synchronization', () => {
    it('should have exact agreement between scene table To review count and review modal unique dialogue count', () => {
      const act1Scene1 = component.analysisActs[0].scenes[0];
      const tableCount = component.getSceneReviewCount(act1Scene1);

      component.openReviewDrilldown(act1Scene1);

      expect(component.reviewDrilldownData?.flaggedDialoguesCount).toBe(tableCount);
      expect(component.reviewDrilldownData?.dialogueGroups.length).toBe(tableCount);
    });

    it('should match reading view Needs review count to the filtered dialogue rows', () => {
      const act1Scene1 = component.analysisActs[0].scenes[0];
      component.selectAnalysisScene(act1Scene1);

      const reviewCount = component.getNeedsReviewCount();
      component.analysisPhraseFilter = 'review';
      const filteredRows = component.getFilteredPhraseRows();

      expect(filteredRows.length).toBe(reviewCount);
    });
  });

  describe('BUG 1 — Evidence Popovers (Hover preview, click-to-pin, outside click, dismissal, document access)', () => {
    let mockEvent: any;
    let mockSegment: any;

    beforeEach(() => {
      const el = document.createElement('span');
      spyOn(el, 'getBoundingClientRect').and.returnValue({
        left: 100,
        top: 200,
        bottom: 220,
        right: 180,
        width: 80,
        height: 20
      } as any);

      mockEvent = {
        target: el,
        stopPropagation: jasmine.createSpy('stopPropagation')
      };

      mockSegment = {
        text: 'bitter cold',
        status: 'Preserved',
        evidence: {
          evidence_id: 'ev-1',
          score: 95,
          confidence: 0.92,
          source_quote: 'bitter cold',
          target_quote: 'bitterkalt',
          explanation: 'Both expressions convey severe freezing weather.'
        }
      };
    });

    it('1. hovering over evidence opens preview popover with mode hover', () => {
      component.onSegmentHover({ segment: mockSegment, event: mockEvent }, 'ai_german');

      expect(component.activePopover).toBeTruthy();
      expect(component.activePopover?.mode).toBe('hover');
      expect(component.activePopover?.score).toBe(95);
      expect(component.activePopover?.sourceQuote).toBe('bitter cold');
      expect(component.activePopover?.targetQuote).toBe('bitterkalt');
      expect(component.activePopover?.explanation).toContain('freezing weather');
    });

    it('2. moving away from unpinned preview closes it after 150ms delay', fakeAsync(() => {
      component.onSegmentHover({ segment: mockSegment, event: mockEvent }, 'ai_german');
      expect(component.activePopover).toBeTruthy();

      component.onSegmentLeave();
      // Should still be open before 150ms
      tick(100);
      expect(component.activePopover).toBeTruthy();

      // Should close after 150ms
      tick(60);
      expect(component.activePopover).toBeNull();
    }));

    it('3. moving pointer into popover clears close timer and prevents flicker', fakeAsync(() => {
      component.onSegmentHover({ segment: mockSegment, event: mockEvent }, 'ai_german');
      component.onSegmentLeave();

      // Enter popover within 100ms
      tick(100);
      component.onPopoverMouseEnter();

      // Wait beyond 150ms
      tick(200);
      expect(component.activePopover).toBeTruthy();

      // Leaving popover closes it after delay
      component.onPopoverMouseLeave();
      tick(150);
      expect(component.activePopover).toBeNull();
    }));

    it('4. clicking evidence pins the popover open', () => {
      component.onSegmentClick({ segment: mockSegment, event: mockEvent }, 'ai_german');

      expect(component.activePopover).toBeTruthy();
      expect(component.activePopover?.mode).toBe('pinned');

      // Pointer leave should NOT close a pinned popover
      component.onSegmentLeave();
      expect(component.activePopover?.mode).toBe('pinned');
    });

    it('5. dismisses popover on close button, Escape key, or outside click', () => {
      component.onSegmentClick({ segment: mockSegment, event: mockEvent }, 'ai_german');
      expect(component.activePopover).toBeTruthy();

      // Close button
      component.closeEvidencePopover();
      expect(component.activePopover).toBeNull();

      // Escape key
      component.onSegmentClick({ segment: mockSegment, event: mockEvent }, 'ai_german');
      component.onDocumentEscape();
      expect(component.activePopover).toBeNull();

      // Outside click
      component.onSegmentClick({ segment: mockSegment, event: mockEvent }, 'ai_german');
      const outsideEl = document.createElement('div');
      component.onDocumentClick({ target: outsideEl } as any);
      expect(component.activePopover).toBeNull();
    });

    it('6. switching dimensions closes stale popover', () => {
      component.onSegmentClick({ segment: mockSegment, event: mockEvent }, 'ai_german');
      expect(component.activePopover).toBeTruthy();

      component.onInspectorDimensionChange('metaphor_imagery');
      expect(component.activePopover).toBeNull();
    });

    it('7. original document action opens PDF reader with search quote', () => {
      spyOn(component, 'openPdfBook');
      component.onSegmentClick({ segment: mockSegment, event: mockEvent }, 'ai_german');

      component.viewInOriginalDocument(component.activePopover!);
      expect(component.openPdfBook).toHaveBeenCalledWith('english', 'bitter cold');

      component.viewTranslationSource(component.activePopover!);
      expect(component.openPdfBook).toHaveBeenCalledWith('german', 'bitterkalt');
    });
  });

  describe('BUG 2 & Act Selection — Centralized Navigation & Study First', () => {
    it('8. clicking Study First recommendation selects the correct act and scene', fakeAsync(() => {
      const targetScene = component.analysisActs[0].scenes[0];
      component.selectedAnalysisScene = null;

      component.onStudySceneClick(targetScene);
      tick();

      expect(component.selectedAnalysisAct).toBe(1);
      expect((component.selectedAnalysisScene as any)?.scene_id).toBe('A1-S1');
    }));

    it('9. centralized navigateToAnalysis populates reading view with dialogues and resets filter', async () => {
      component.analysisPhraseFilter = 'diff';
      component.analysisSearchText = 'something-obscure';

      await component.navigateToAnalysis({
        act: 1,
        sceneId: 'A1-S1',
        dimensionKey: 'semantic'
      });

      expect(component.selectedAnalysisAct).toBe(1);
      expect(component.selectedAnalysisScene?.scene_id).toBe('A1-S1');
      expect(component.analysisPhraseFilter).toBe('all');
      expect(component.analysisSearchText).toBe('');
      expect(component.selectedAnalysisDimension).toBe('semantic');
      expect(component.selectedAnalysisScene?.dialogues.length).toBeGreaterThan(0);
    });

    it('10. switching Act tabs does NOT default-select a scene for other acts', () => {
      // User requested: "also check other than act1 for others act it defaultly selecitng scenes"
      component.selectedAnalysisScene = null;

      component.selectAnalysisAct(2);
      expect(component.selectedAnalysisAct).toBe(2);
      expect(component.selectedAnalysisScene).toBeNull();

      component.selectAnalysisAct(3);
      expect(component.selectedAnalysisAct).toBe(3);
      expect(component.selectedAnalysisScene).toBeNull();
    });

    it('11. clicking a scene row explicitly selects that scene without expanding dialogues', () => {
      const act1Scene1 = component.analysisActs[0].scenes[0];
      expect(component.isSceneExpanded('A1-S1')).toBeFalse();

      component.selectAnalysisScene(act1Scene1);
      expect(component.selectedAnalysisScene?.scene_id).toBe('A1-S1');
      expect(component.isSceneExpanded('A1-S1')).toBeFalse();
    });
  });

  describe('BUG 3 — Empty or Incorrect Analysis Panel Handlers', () => {
    it('12. displays meaningful status for Not Applicable dimensions and missing translations', () => {
      const testDialogue: any = {
        dialogue_id: 'TEST-D1',
        speaker: 'HAMLET',
        texts: { english: 'Hello', human_german: 'Hallo' },
        analysis: {
          human_german: {
            wordplay: { applicable: false, score: null, explanation: 'No wordplay here.' }
          }
        }
      };

      component.activeInspectedDialogueId = 'TEST-D1';
      spyOn(component, 'getInspectedDialogue').and.returnValue(testDialogue);

      // wordplay applicable: false
      component.valTarget = 'human_german';
      component.activeInspectorDim = 'wordplay';
      expect(component.getActiveInspectorScoreDisplay()).toBe('Not applicable');

      // ai_german has no text
      component.valTarget = 'ai_german';
      expect(component.getActiveInspectorScoreDisplay()).toBe('Translation unavailable');
      expect(component.getActiveInspectorExplanation()).toBe('Translation unavailable for this version.');
    });
  });

  describe('Navigation Levels & Scene vs Dialogue Selection (v1.5 Distinct Modes)', () => {
    it('13. defaults to "act" viewMode and renders the Act Scene Average Bar Chart and 8-dim matrix', () => {
      component.selectedAnalysisAct = 1;
      component.selectedAnalysisScene = null;
      component.activeInspectedDialogueId = null;

      expect(component.viewMode).toBe('act');
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.v15-act-header-card')).toBeTruthy();
      expect(compiled.querySelector('.v15-act-chart-card')).toBeTruthy();
      expect(compiled.querySelector('.v15-act-matrix-card')).toBeTruthy();
      expect(compiled.querySelector('.v15-scene-header-card')).toBeNull();
      expect(compiled.querySelector('.v15-dialogue-detail-panel')).toBeNull();
    });

    it('14. correctly calculates Scene-level average dimension scores and overall score for the bar chart', () => {
      const act1Scene1 = component.analysisActs[0].scenes[0];
      const semScore = component.getSceneDimensionAverageScore(act1Scene1, 'semantic');
      expect(semScore).toBe(90);

      const overallScore = component.getSceneOverallScore(act1Scene1);
      expect(overallScore).toBe(87.5);

      const chartScore = component.getSceneChartScore(act1Scene1);
      expect(chartScore).toBe(87.5);

      component.onActChartDimensionChange('semantic');
      expect(component.selectedActChartDimension).toBe('semantic');
      expect(component.getSceneChartScore(act1Scene1)).toBe(90);
    });

    it('15. selecting a Scene switches viewMode to "scene", displays scene analysis, and hides dialogue panel and act chart', () => {
      const act1Scene1 = component.analysisActs[0].scenes[0];
      component.selectAnalysisScene(act1Scene1);

      expect(component.viewMode).toBe('scene');
      expect(component.selectedAnalysisScene?.scene_id).toBe('A1-S1');
      expect(component.activeInspectedDialogueId).toBeNull();

      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.v15-scene-header-card')).toBeTruthy();
      expect(compiled.querySelector('.v15-human-matrix-section')).toBeTruthy();
      expect(compiled.querySelector('.v15-act-chart-card')).toBeNull();
      expect(compiled.querySelector('.v15-dialogue-detail-panel')).toBeNull();
    });

    it('16. selecting a Dialogue switches viewMode to "dialogue", displays ONLY dialogue analysis, and hides scene cards and act chart', () => {
      const act1Scene1 = component.analysisActs[0].scenes[0];
      component.selectAnalysisScene(act1Scene1);

      // Select individual dialogue
      component.onTocDialogueSelected({
        act: 1,
        sceneId: 'A1-S1',
        dialogueId: 'EN-A1-S1-D00008',
        dialogue: act1Scene1.dialogues[0]
      });

      expect(component.viewMode).toBe('dialogue');
      expect(component.activeInspectedDialogueId).toBe('EN-A1-S1-D00008');

      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;

      // In dialogue mode, scene summary, 8-dim scene matrix, full reading table, and act chart are hidden
      expect(compiled.querySelector('.v15-scene-header-card')).toBeNull();
      expect(compiled.querySelector('.v15-human-matrix-section')).toBeNull();
      expect(compiled.querySelector('.v15-act-chart-card')).toBeNull();

      // Only dedicated dialogue detail panel is rendered
      expect(compiled.querySelector('.v15-dialogue-detail-panel')).toBeTruthy();
      expect(compiled.textContent).toContain('EN-A1-S1-D00008');
      expect(compiled.textContent).toContain('FRANCISCO');
    });

    it('17. breadcrumb "Scene 1" click or switchToSceneView() returns from dialogue mode to scene mode', () => {
      const act1Scene1 = component.analysisActs[0].scenes[0];
      component.selectAnalysisScene(act1Scene1);
      component.activeInspectedDialogueId = 'EN-A1-S1-D00008';
      expect(component.viewMode).toBe('dialogue');

      component.switchToSceneView();
      expect(component.viewMode).toBe('scene');
      expect(component.activeInspectedDialogueId).toBeNull();
      expect(component.selectedAnalysisScene?.scene_id).toBe('A1-S1');
    });

    it('18. missing dialogue dimension scores show N/A instead of zero or scene averages', () => {
      const act1Scene1 = component.analysisActs[0].scenes[0];
      const dialogue = act1Scene1.dialogues[0];

      // semantic is scored 90
      const semScore = component.getDialogueHumanScore(dialogue, 'semantic');
      expect(semScore).toBe(90);

      // metaphor_imagery is not present on this dialogue
      const metaScore = component.getDialogueHumanScore(dialogue, 'metaphor_imagery');
      expect(metaScore).toBeNull();
      expect(component.formatHumanScore(metaScore)).toBe('N/A');
    });

    it('19. resets right workspace scroll to top on navigation level change or dialogue switch', () => {
      spyOn(component, 'scrollWorkspaceToTop');
      const act1Scene1 = component.analysisActs[0].scenes[0];

      component.selectAnalysisAct(1);
      expect(component.scrollWorkspaceToTop).toHaveBeenCalled();

      component.selectAnalysisScene(act1Scene1);
      expect(component.scrollWorkspaceToTop).toHaveBeenCalled();

      component.onTocDialogueSelected({
        act: 1,
        sceneId: 'A1-S1',
        dialogueId: 'EN-A1-S1-D00008',
        dialogue: act1Scene1.dialogues[0]
      });
      expect(component.scrollWorkspaceToTop).toHaveBeenCalled();
    });

    it('20. detects explanation text phrasing mismatch for review flagging', () => {
      const mockDialogueWithMismatch: any = {
        dialogue_id: 'EN-A1-S1-D00001',
        speaker: 'BERNARDO',
        texts: {
          english: "Who's there?",
          human_german: 'Wer da?'
        },
        analysis: {
          human_german: {
            semantic: {
              score: 95,
              explanation: 'Translates "Who\'s there?" as "Wer ist da?" preserving question intent.'
            }
          }
        }
      };

      expect(component.hasExplanationMismatch(mockDialogueWithMismatch, 'semantic')).toBeTrue();

      const mockDialogueAligned: any = {
        dialogue_id: 'EN-A1-S1-D00001',
        speaker: 'BERNARDO',
        texts: {
          english: "Who's there?",
          human_german: 'Wer da?'
        },
        analysis: {
          human_german: {
            semantic: {
              score: 95,
              explanation: 'Translates "Who\'s there?" accurately into German dramatic verse.'
            }
          }
        }
      };

      expect(component.hasExplanationMismatch(mockDialogueAligned, 'semantic')).toBeFalse();
    });
  });
});
