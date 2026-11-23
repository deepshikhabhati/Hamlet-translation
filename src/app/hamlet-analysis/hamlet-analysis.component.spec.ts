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
    localStorage.clear();
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
    mockDataService.loadAnalysisJson.and.callFake(() => of(JSON.parse(JSON.stringify(mockIntegratedData))));
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

  it('should initialize and open the first available Scene by default', () => {
    expect(component).toBeTruthy();
    expect(component.selectedAnalysisAct).toBe(1);
    expect(component.selectedAnalysisScene?.scene_id).toBe('A1-S1');
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

  it('should navigate from validation queue to exact dialogue, dimension, and translation without leaving parallel reading', () => {
    const queueItems = component.getValidationQueueItems();
    const targetItem = queueItems[0];

    component.onQueueItemReview(targetItem);

    expect(component.selectedAnalysisAct).toBe(1);
    expect(component.selectedAnalysisScene?.scene_id).toBe('A1-S1');
    expect(component.selectedAnalysisDimension).toBe('omissions_additions');
    expect(component.valTarget).toBe('ai_german');
    expect(component.readerInspectedDialogueId).toBe('EN-A1-S1-D00008');
    expect(component.viewMode).toBe('scene');
    expect(component.isInspectorRttOpen).toBeTrue();
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
    it('13. defaults to "act" viewMode and renders the Act 8-dim matrix table, scene matrix, and compact scene averages bar chart', () => {
      component.selectedAnalysisAct = 1;
      component.selectedAnalysisScene = null;
      component.activeInspectedDialogueId = null;

      expect(component.viewMode).toBe('act');
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.v15-act-header-card')).toBeTruthy();
      expect(compiled.querySelector('.v15-human-matrix-section')).toBeTruthy();
      expect(compiled.querySelector('.v15-act-matrix-card')).toBeTruthy();
      expect(compiled.querySelector('.v15-act-chart-card')).toBeTruthy();
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

    it('14b. calculates Act-level dimension scores, units, and review counts for the Act 8-dimension table', () => {
      component.selectedAnalysisAct = 1;
      component.selectedAnalysisScene = null;
      component.activeInspectedDialogueId = null;

      const semScore = component.getActDimensionScore(1, 'semantic');
      expect(semScore).toBeGreaterThanOrEqual(0);
      expect(semScore).toBeLessThanOrEqual(100);

      const unitsObj = component.getActDimensionUnits(1, 'semantic');
      expect(unitsObj.units).toBeGreaterThanOrEqual(1);
      expect(unitsObj.total).toBe(component.getActTotalDialogues(1));

      const revCount = component.getActDimensionHumanReviewCount(1, 'semantic');
      expect(revCount).toBeGreaterThanOrEqual(0);

      component.onActDimensionRowClick('metaphor_imagery');
      expect(component.selectedAnalysisDimension).toBe('metaphor_imagery');
      expect(component.activeInspectorDim).toBe('metaphor_imagery');
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

    it('19. October 25 Redesign: starting page defaults to Act 1 Scene 1 with showAnalysis=false and parallel bilingual reader', () => {
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;

      // Starting page defaults
      expect(component.viewMode).toBe('scene');
      expect(component.selectedAnalysisScene?.scene_id).toBe('A1-S1');
      expect(component.showAnalysis).toBeFalse();

      // Parallel reader elements
      expect(compiled.querySelector('.reader-main-title')?.textContent).toContain('Hamlet, side by side');
      expect(compiled.querySelector('.reader-sub-title')?.textContent).toContain('Read the English original and the Human German translation together.');
      expect(compiled.querySelector('.reader-callout-banner')).toBeTruthy();
      expect(compiled.querySelector('.reader-lang-column--en')).toBeTruthy();
      expect(compiled.querySelector('.reader-lang-column--de')).toBeTruthy();

      // Show analysis toggle
      component.onToggleShowAnalysis();
      expect(component.showAnalysis).toBeTrue();
      fixture.detectChanges();
      expect(compiled.querySelector('.reader-analysis-summary-bar')).toBeTruthy();
    });

    it('20. October 25 Redesign: dimension tab switching updates selectedAnalysisDimension and updates evidence', () => {
      component.selectDimensionTab('metaphor_imagery');
      expect(component.selectedAnalysisDimension).toBe('metaphor_imagery');
      expect(component.activeInspectorDim).toBe('metaphor_imagery');
    });

    it('21. October 25 Redesign: reader evidence inspection, escape dismissal, and PDF opening', () => {
      const act1Scene1 = component.analysisActs[0].scenes[0];
      const diag1 = act1Scene1.dialogues[0];

      // Inspect dialogue in reader
      component.onReaderInspectDialogue(diag1.dialogue_id);
      expect(component.readerInspectedDialogueId).toBe(diag1.dialogue_id);
      expect(component.selectedEvidencePhrase).toBeTruthy();
      expect(component.viewMode).toBe('scene'); // Must remain in scene view

      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.ha-col-inspector')).toBeTruthy();
      expect(compiled.querySelector('.inspector-content-panel')).toBeTruthy();

      // Escape key dismissal
      component.onEscapeKey();
      expect(component.readerInspectedDialogueId).toBeNull();
      expect(component.selectedEvidencePhrase).toBeNull();

      fixture.detectChanges();
      expect(compiled.querySelector('.inspector-empty-state')).toBeTruthy();

      // In-app PDF panel with inspected dialogue highlighting
      component.onReaderInspectDialogue(diag1.dialogue_id);
      component.openPdfBook('english');
      expect(component.pdfPanelOpen).toBeTrue();
      expect(component.activePdfBook).toBe('english');
      expect(component.pdfSource).toBe(component.englishPdfPath);
      expect(component.pdfHighlightText).toBe(diag1.texts.english.trim());

      component.openPdfBook('german');
      expect(component.pdfPanelOpen).toBeTrue();
      expect(component.activePdfBook).toBe('german');
      expect(component.pdfSource).toBe(component.germanPdfPath);
      expect(component.pdfHighlightText).toBe((diag1.texts.human_german || '').trim());

      component.closePdfPanel();
      expect(component.pdfPanelOpen).toBeFalse();
    });
  });

  describe('Hamlet Translation Analysis v1.5 Requirements Test Suite', () => {
    it('v1.5 Req 5 & 6: supports switching across all 8 dimensions and strictly filters highlight eligibility', () => {
      const dimensions = ['semantic', 'emotion', 'metaphor_imagery', 'tone', 'character_voice', 'wordplay', 'cultural_archaic', 'omissions_additions'];
      dimensions.forEach(dim => {
        component.selectDimensionTab(dim);
        expect(component.selectedAnalysisDimension).toBe(dim);
      });

      const mockDiag: any = {
        dialogue_id: 'TEST-D1',
        texts: { english: 'To be, or not to be.', human_german: 'Sein oder Nichtsein.' },
        analysis: {
          human_german: {
            semantic: {
              applicable: true,
              score: 95,
              status: 'Preserved',
              evidence: [
                {
                  source_quote: 'To be',
                  target_quote: 'Sein',
                  source_span: { start: 0, end: 5 },
                  target_span: { start: 0, end: 4 },
                  status: 'Preserved',
                  explanation: 'Preserved',
                  ui_highlight_eligible: true,
                  span_validation: { valid: true, source_valid: true, target_valid: true }
                },
                {
                  source_quote: 'invalid phrase',
                  target_quote: 'invalid phrase',
                  source_span: { start: 0, end: 500 },
                  target_span: { start: 0, end: 500 },
                  status: 'Changed',
                  explanation: 'Invalid',
                  ui_highlight_eligible: false,
                  span_validation: { valid: false, source_valid: false, target_valid: false }
                }
              ]
            }
          }
        }
      };

      const sourceSpans = component.getSourceSpansForDialogue(mockDiag, 'semantic', 'human_german');
      expect(sourceSpans.length).toBe(1);
      expect(sourceSpans[0].start).toBe(0);
      expect(sourceSpans[0].end).toBe(5);

      const targetSpans = component.getTargetSpansForDialogue(mockDiag, 'human_german', 'semantic');
      expect(targetSpans.length).toBe(1);
      expect(targetSpans[0].start).toBe(0);
      expect(targetSpans[0].end).toBe(4);
    });

    it('v1.5 Req 7: popover handles pinning, mouseleave dismiss, and manual close', (done) => {
      component.activePopover = {
        dialogueId: 'TEST-D1',
        dimensionKey: 'semantic',
        dimensionName: 'Semantic',
        translationKey: 'human_german',
        translationName: 'Human German',
        status: 'Preserved',
        score: 95,
        speaker: 'HAMLET',
        sourceQuote: 'To be',
        targetQuote: 'Sein',
        explanation: 'Preserved meaning',
        mode: 'hover',
        left: 100,
        top: 200,
        arrowPos: 'top'
      } as any;

      expect(component.activePopover).toBeTruthy();

      // On mouse leave in hover mode, popover closes after debounce
      component.onPopoverMouseLeave();
      setTimeout(() => {
        expect(component.activePopover).toBeNull();

        // In pinned mode, mouseleave does not close
        component.activePopover = {
          dialogueId: 'TEST-D1',
          dimensionKey: 'semantic',
          dimensionName: 'Semantic',
          translationKey: 'human_german',
          translationName: 'Human German',
          status: 'Preserved',
          score: 95,
          speaker: 'HAMLET',
          sourceQuote: 'To be',
          targetQuote: 'Sein',
          explanation: 'Preserved meaning',
          mode: 'pinned',
          left: 100,
          top: 200,
          arrowPos: 'top'
        } as any;
        component.onPopoverMouseLeave();
        expect(component.activePopover).toBeTruthy();

        // Manual close
        component.closeEvidencePopover();
        expect(component.activePopover).toBeNull();
        done();
      }, 200);
    });

    it('v1.5 Req 8 & 14: preserves reading position when navigating from scene reader to dialogue and back', () => {
      const act1Scene1 = component.analysisActs[0].scenes[0];
      const diag1 = act1Scene1.dialogues[0];

      component.selectAnalysisScene(act1Scene1);
      component.lastReaderDialogueId = diag1.dialogue_id;

      component.openInspector(diag1.dialogue_id, 'human_german');
      expect(component.viewMode).toBe('dialogue');
      expect(component.lastReaderDialogueId).toBe(diag1.dialogue_id);

      component.switchToSceneView();
      expect(component.viewMode).toBe('scene');
      expect(component.selectedAnalysisScene).toBe(act1Scene1);
    });

    it('v1.5 Req 11: expert review saving and decisions export', () => {
      const act1Scene1 = component.analysisActs[0].scenes[0];
      const diag1 = act1Scene1.dialogues[0];

      component.openInspector(diag1.dialogue_id, 'human_german');
      component.activeInspectorDim = 'semantic';
      component.valDecision = 'Accept';
      component.valScoreOverride = 98;
      component.valReviewer = 'Dr. Horatio';
      component.valComment = 'Accurate translation according to early modern German syntax.';

      component.saveDraftReview();
      expect(component.valSaveMessage).toContain('Saved review decision');

      const isReviewed = component.isDialogueExpertReviewed(diag1, 'semantic');
      expect(isReviewed).toBeTrue();
    });

    it('v1.5 Req 13: Act scene averages bar chart supports dimension switching and scene navigation', () => {
      component.selectedAnalysisAct = 1;
      const scenes = component.getActScenes(1);
      expect(scenes.length).toBeGreaterThan(0);

      component.onActChartDimensionChange('semantic');
      expect(component.selectedActChartDimension).toBe('semantic');

      component.onActChartVersionChange('human_german');
      expect(component.selectedActChartVersion).toBe('human_german');

      const score = component.getSceneChartScore(scenes[0]);
      expect(score).not.toBeNull();
      expect(score).toBeGreaterThan(0);

      const count = component.getSceneChartApplicableCount(scenes[0]);
      expect(count).toBeGreaterThan(0);

      const provenance = component.getSceneChartProvenance(scenes[0]);
      expect(provenance).toContain('Schlegel-Tieck');
    });

    // --- November 5 Research Meeting Updates Test Suite ---

    it('November 5 Req 1: simplifies primary comparison strictly to Original English and Human German', () => {
      const act1Scene1 = component.analysisActs[0].scenes[0];
      const diag1 = act1Scene1.dialogues[0];
      component.openInspector(diag1.dialogue_id, 'human_german');
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      const twoCol = el.querySelector('.v15-evidence-columns--two');
      expect(twoCol).toBeTruthy();

      const fourCol = el.querySelector('.v15-evidence-columns--four');
      expect(fourCol).toBeNull();

      // Original English and Human German present
      expect(el.textContent).toContain('Original English');
      expect(el.textContent).toContain('Human German');
    });

    it('November 5 Req 2: compact inline back-translation in Human German panel with caching', () => {
      const act1Scene1 = component.analysisActs[0].scenes[0];
      const diag1 = act1Scene1.dialogues[0];
      component.openInspector(diag1.dialogue_id, 'human_german');
      fixture.detectChanges();

      expect(component.isInlineBtOpen).toBeFalse();

      spyOn(component.backTranslationService, 'translateGermanToEnglish').and.returnValue(of({
        dialogueId: diag1.dialogue_id,
        sourceGerman: diag1.texts?.human_german || 'Wer da?',
        translatedEnglish: 'Who is there?',
        cached: true,
        status: 'success'
      }));

      component.toggleInlineBackTranslation();
      expect(component.isInlineBtOpen).toBeTrue();
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelector('.v15-inline-bt-panel')).toBeTruthy();
      expect(el.textContent).toContain('AI Back-Translation (German → English)');
      expect(el.textContent).toContain('Who is there?');

      // Toggling again closes it
      component.toggleInlineBackTranslation();
      expect(component.isInlineBtOpen).toBeFalse();
    });

    it('November 5 Req 3: Round-Trip Translation (RTT) evaluation across 8 dimensions with score comparison and difference badges', () => {
      const act1Scene1 = component.analysisActs[0].scenes[0];
      const diag1 = act1Scene1.dialogues[0];
      component.openInspector(diag1.dialogue_id, 'human_german');

      component.computeRttForCurrentDialogue('Who is there?');
      expect(component.currentRttResult).toBeTruthy();

      const semRtt = component.getRttDimScore('semantic');
      expect(semRtt).toBeTruthy();
      expect(semRtt?.originalScore).not.toBeNull();
      expect(semRtt?.rttScore).not.toBeNull();
      expect(semRtt?.diff).not.toBeNull();
      expect(semRtt?.explanation).toContain('Semantic');

      // Only semantic RTT exists: other dimensions are "Not evaluated" and never reuse the semantic score
      const emoRtt = component.getRttDimScore('emotion');
      expect(emoRtt).toBeTruthy();
      expect(emoRtt?.rttScore).toBeNull();
      expect(emoRtt?.status).toBe('Not evaluated');

      // View mode options
      component.rttViewMode = 'original';
      expect(component.rttViewMode).toBe('original');
      component.rttViewMode = 'rtt';
      expect(component.rttViewMode).toBe('rtt');
      component.rttViewMode = 'compare';
      expect(component.rttViewMode).toBe('compare');
    });

    it('November 5 Req 4: extends Evidence Heatmap with dual assessment toggle and difference calculation', () => {
      const act1Scene1 = component.analysisActs[0].scenes[0];

      component.heatmapAssessmentSource = 'original';
      const origScore = component.getSceneOriginalScore(act1Scene1, 'semantic');
      expect(origScore).not.toBeNull();

      // No completed RTT in the scene → "Not evaluated" (null), never a fabricated delta
      component.heatmapAssessmentSource = 'rtt';
      expect(component.getSceneRttScore(act1Scene1, 'semantic')).toBeNull();
      expect(component.getSceneRttDiff(act1Scene1, 'semantic')).toBeNull();

      act1Scene1.dialogues[0].round_trip_verification = {
        status: 'completed', source_translation: 'human_german', back_translated_english: 'Who is there?',
        back_translation_model: 'MyMemory-NMT-DE-EN-v2.1', similarity_model: 'Philological-Semantic-Sim-v1.5',
        direct_semantic_score: 95, rtt_semantic_score: 88, disagreement: -7, requires_expert_review: false, review_reason: null,
        generated_at: '2026-11-09T00:00:00Z'
      };
      const rttScore = component.getSceneRttScore(act1Scene1, 'semantic');
      expect(rttScore).toBe(88);
      component.heatmapAssessmentSource = 'compare';
      const diff = component.getSceneRttDiff(act1Scene1, 'semantic');
      expect(diff).toBe(Math.round((88 - (component.getDialogueDimensionScore(act1Scene1.dialogues[0], 'semantic') as number)) * 10) / 10);
      expect(component.getSceneRttScore(act1Scene1, 'emotion')).toBeNull();
      expect(component.getSceneRttCoverageLabel(act1Scene1, 'semantic')).toBe('1/1');

      const applicableCount = component.getSceneApplicableDialoguesCount(act1Scene1, 'semantic');
      expect(applicableCount).toBeGreaterThan(0);

      // Clicking cell navigates with selected dimension and assessment source
      component.onHeatmapCellClick(1, act1Scene1, 'emotion', 'rtt');
      expect(component.selectedAnalysisDimension).toBe('emotion');
      expect(component.activeInspectorDim).toBe('emotion');
      expect(component.rttViewMode).toBe('rtt');
    });

    it('November 5 Req 5: detects when dialogue has no verified phrase evidence for selected dimension', () => {
      const act1Scene1 = component.analysisActs[0].scenes[0];
      const diag1 = act1Scene1.dialogues[0];

      const noEvidence = component.hasNoVerifiedEvidence(diag1, 'wordplay');
      expect(typeof noEvidence).toBe('boolean');
    });

    it('November 5 Req 6: dimension-focused German generation produces distinct objectives and explanations', () => {
      const act1Scene1 = component.analysisActs[0].scenes[0];
      const diag1 = act1Scene1.dialogues[0];
      component.openInspector(diag1.dialogue_id, 'human_german');

      // Semantic generation
      component.selectedFocusedDimension = 'semantic';
      component.generateDimensionFocusedTranslation();
      expect(component.focusedTranslationResult).toBeTruthy();
      expect(component.focusedTranslationResult?.objective).toContain('propositional');

      // Emotion generation
      component.selectedFocusedDimension = 'emotion';
      component.generateDimensionFocusedTranslation();
      expect(component.focusedTranslationResult?.objective).toContain('affective');

      // Tone generation
      component.selectedFocusedDimension = 'tone';
      component.generateDimensionFocusedTranslation();
      expect(component.focusedTranslationResult?.objective).toContain('dramatic register');
    });

    it('November 5 Req 7: AI Research Assistant provides suggestions and populates review form', () => {
      const act1Scene1 = component.analysisActs[0].scenes[0];
      const diag1 = act1Scene1.dialogues[0];
      component.openInspector(diag1.dialogue_id, 'human_german');

      component.selectAiPresetQuestion('Which emotional expressions are preserved in this translation?');
      expect(component.aiAssistantQuestion).toBe('Which emotional expressions are preserved in this translation?');

      // Provide mock response
      component.aiAssistantResponse = {
        answer: 'Emotion cues preserved.',
        suggestedOverride: 88,
        suggestedNotes: 'Affective cues match early modern urgency.'
      };

      component.applyAiSuggestionToReview();
      expect(component.valScoreOverride).toBe(88);
      expect(component.valComment).toContain('early modern urgency');
    });

    it('November 5 Req 8: Expert validation handles blank override by keeping machine score and persists dimension-keyed decisions', () => {
      const act1Scene1 = component.analysisActs[0].scenes[0];
      const diag1 = act1Scene1.dialogues[0];
      component.openInspector(diag1.dialogue_id, 'human_german');
      component.activeInspectorDim = 'tone';

      component.valDecision = 'Accept';
      component.valScoreOverride = null; // Blank means keep existing score
      component.valReviewer = 'Prof. J. Schmidt (Shakespeare Philology)';
      component.valComment = 'Retains martial watch tone.';

      component.saveValidation();
      expect(component.valSaveMessage).toContain('Saved review decision');

      // Switch to another dimension and back
      component.selectDimension('emotion');
      component.loadCurrentReviewForInspector();

      component.selectDimension('tone');
      component.loadCurrentReviewForInspector();
      expect(component.valComment).toContain('Retains martial watch tone');
      expect(component.valDecision).toBe('Accept');
    });

    it('November 5 Req 9: expert-guided translation refinement workflow', () => {
      const act1Scene1 = component.analysisActs[0].scenes[0];
      const diag1 = act1Scene1.dialogues[0];
      component.openInspector(diag1.dialogue_id, 'human_german');
      component.activeInspectorDim = 'emotion';

      component.generateRefinedGermanTranslation();
      expect(component.refinedTranslationResult).toBeTruthy();
      expect(component.refinedTranslationResult?.refinedGerman).toBeTruthy();
      expect(component.refinedTranslationResult?.rationale).toBeTruthy();

      // Accept refinement
      component.acceptRefinedTranslation();
      expect(component.refinedTranslationResult?.accepted).toBeTrue();
      expect(component.valComment).toContain('Accepted Scholar Refinement');

      // Reject refinement
      component.rejectRefinedTranslation();
      expect(component.refinedTranslationResult?.accepted).toBeFalse();
    });
  });

  describe('Round-Trip Translation (RTT) Integration — Tasks 1 to 8', () => {
    it('should initialize with Evidence Inspector RTT card collapsed by default and toggle correctly', () => {
      expect(component.isInspectorRttOpen).toBeFalse();
      component.toggleInspectorRtt();
      expect(component.isInspectorRttOpen).toBeTrue();
      component.toggleInspectorRtt();
      expect(component.isInspectorRttOpen).toBeFalse();
    });

    it('should compute scene RTT coverage accurately without presenting partial coverage as full validation', () => {
      const act1Scene1 = component.analysisActs[0].scenes[0];
      const covBefore = component.getSceneRttCoverage(act1Scene1);
      expect(covBefore).toBeTruthy();
      expect(covBefore?.total).toBe(1);
      expect(covBefore?.verified).toBe(0);

      // Attach real RTT verification record to dialogue
      act1Scene1.dialogues[0].round_trip_verification = {
        status: 'completed',
        source_translation: 'human_german',
        back_translated_english: 'For this relief much thanks: it is bitter cold, and I am sick at heart.',
        back_translation_model: 'Helsinki-NLP/opus-mt-de-en (NMT)',
        similarity_model: 'sentence-transformers/all-MiniLM-L6-v2',
        direct_semantic_score: 90.0,
        rtt_semantic_score: 93.5,
        disagreement: 3.5,
        requires_expert_review: false,
        review_reason: null,
        generated_at: '2026-11-09T00:00:00Z'
      };

      const covAfter = component.getSceneRttCoverage(act1Scene1);
      expect(covAfter).toBeTruthy();
      expect(covAfter?.total).toBe(1);
      expect(covAfter?.verified).toBe(1);
    });

    it('should return correct RTT status label and CSS classes based on disagreement and review status', () => {
      const act1Scene1 = component.analysisActs[0].scenes[0];
      const dlg = act1Scene1.dialogues[0];

      // Awaiting analysis when round_trip_verification is undefined or not_run
      delete dlg.round_trip_verification;
      expect(component.getRttStatusLabel(dlg)).toBe('Awaiting Analysis');
      expect(component.getRttStatusClass(dlg)).toBe('status-awaiting');

      // Agreement (difference < 15)
      dlg.round_trip_verification = {
        status: 'completed',
        source_translation: 'human_german',
        back_translated_english: 'For this relief much thanks...',
        back_translation_model: 'opus-mt-de-en',
        similarity_model: 'all-MiniLM-L6-v2',
        direct_semantic_score: 90.0,
        rtt_semantic_score: 93.0,
        disagreement: 3.0,
        requires_expert_review: false,
        review_reason: null,
        generated_at: '2026-11-09T00:00:00Z'
      };
      expect(component.getRttStatusLabel(dlg)).toBe('Agreement');
      expect(component.getRttStatusClass(dlg)).toBe('status-agreement');

      // Disagreement (requires_expert_review = true or disagreement >= 15)
      dlg.round_trip_verification.requires_expert_review = true;
      dlg.round_trip_verification.disagreement = 25.0;
      expect(component.getRttStatusLabel(dlg)).toBe('Disagreement');
      expect(component.getRttStatusClass(dlg)).toBe('status-disagreement');

      // Expert reviewed
      dlg.round_trip_verification.status = 'expert_reviewed';
      expect(component.getRttStatusLabel(dlg)).toBe('Expert Reviewed');
      expect(component.getRttStatusClass(dlg)).toBe('status-reviewed');
    });

    it('should generate back-translation and calculate RTT score and disagreement on generateInspectorRtt', fakeAsync(() => {
      const act1Scene1 = component.analysisActs[0].scenes[0];
      const dlg = act1Scene1.dialogues[0];
      component.readerInspectedDialogueId = dlg.dialogue_id;

      spyOn(component['backTranslationService'], 'translateGermanToEnglish').and.returnValue(of({
        dialogueId: dlg.dialogue_id,
        sourceGerman: dlg.texts.human_german || '',
        translatedEnglish: 'For this relief much thanks: it is bitter cold, and I am sick at heart.',
        cached: false,
        status: 'success'
      }));

      component.generateInspectorRtt(dlg);

      expect(component.inspectorRttLoading).toBeFalse();
      expect(dlg.round_trip_verification).toBeTruthy();
      expect(dlg.round_trip_verification?.status).toBe('completed');
      expect(dlg.round_trip_verification?.back_translated_english).toContain('For this relief much thanks');
      expect(dlg.round_trip_verification?.rtt_semantic_score).toBeGreaterThan(0);
      expect(dlg.round_trip_verification?.disagreement).not.toBeNull();
    }));

    it('should save expert validation with RTT notes, inaccurate back-translation flag, and corrected semantic score', () => {
      const act1Scene1 = component.analysisActs[0].scenes[0];
      const dlg = act1Scene1.dialogues[0];
      component.selectAnalysisScene(act1Scene1);
      component.readerInspectedDialogueId = dlg.dialogue_id;
      component.selectedAnalysisDimension = 'semantic';
      component.valTarget = 'human_german';

      dlg.round_trip_verification = {
        status: 'completed',
        source_translation: 'human_german',
        back_translated_english: 'For this relief much thanks...',
        back_translation_model: 'opus-mt-de-en',
        similarity_model: 'all-MiniLM-L6-v2',
        direct_semantic_score: 90.0,
        rtt_semantic_score: 65.0,
        disagreement: 25.0,
        requires_expert_review: true,
        review_reason: 'Semantic score divergence between direct assessment and RTT',
        generated_at: '2026-11-09T00:00:00Z'
      };

      component.valDecision = 'Needs Revision';
      component.valScoreOverride = 88;
      component.valInaccurateBt = true;
      component.valCorrectedSemanticScore = 88;
      component.valRttNotes = 'The German "bitterkalt" was rendered literally, suppressing Shakespearean cadence.';
      component.valReviewer = 'Prof. Hamlet Scholar';

      component.saveInspectorReviewFromEvidence();

      expect(dlg.round_trip_verification.status).toBe('expert_reviewed');
      expect(dlg.round_trip_verification.inaccurate_back_translation).toBeTrue();
      expect(dlg.round_trip_verification.corrected_semantic_score).toBe(88);
      expect(dlg.round_trip_verification.rtt_notes).toContain('German "bitterkalt" was rendered literally');

      // Verify expert reviews service holds the review
      const rev = component.expertReviewService.getReview(dlg, 'human_german', 'semantic');
      expect(rev.inaccurate_back_translation).toBeTrue();
      expect(rev.corrected_semantic_score).toBe(88);
      expect(rev.rtt_notes).toContain('German "bitterkalt"');
    });

    it('should include RTT verification data in CSV exports', () => {
      const act1Scene1 = component.analysisActs[0].scenes[0];
      const dlg = act1Scene1.dialogues[0];
      dlg.round_trip_verification = {
        status: 'completed',
        source_translation: 'human_german',
        back_translated_english: 'For this relief much thanks...',
        back_translation_model: 'opus-mt-de-en',
        similarity_model: 'all-MiniLM-L6-v2',
        direct_semantic_score: 90.0,
        rtt_semantic_score: 65.0,
        disagreement: 25.0,
        requires_expert_review: true,
        review_reason: 'Divergence',
        generated_at: '2026-11-09T00:00:00Z'
      };

      spyOn<any>(component, 'downloadFile').and.callFake((content: string, filename: string) => {
        expect(filename).toBeTruthy();
        expect(content).toContain('RTT Score');
        expect(content).toContain('RTT Disagreement');
        expect(content).toContain('25');
      });

      component.exportFlaggedAssessmentsCsv();
    });
  });

  describe('Selected-dialogue card: unsaved expert-review protection', () => {
    it('prompts before discarding unsaved edits and keeps the card open when cancelled', () => {
      const dlg = component.analysisActs[0].scenes[0].dialogues[0];
      component.selectedAnalysisAct = 1;
      component.selectedAnalysisScene = component.analysisActs[0].scenes[0];
      component.openInspector(dlg.dialogue_id);
      expect(component.hasUnsavedDraft()).toBeFalse();
      component.valComment = 'unsaved philological note';
      expect(component.hasUnsavedDraft()).toBeTrue();
      const confirmSpy = spyOn(window, 'confirm').and.returnValue(false);
      const sceneSpy = spyOn(component, 'switchToSceneView').and.callThrough();
      component.closeInspector();
      expect(confirmSpy).toHaveBeenCalled();
      expect(sceneSpy).not.toHaveBeenCalled();
      expect(component.activeInspectedDialogueId).toBe(dlg.dialogue_id);
      confirmSpy.and.returnValue(true);
      component.closeInspector();
      expect(sceneSpy).toHaveBeenCalled();
    });

    it('does not prompt when the draft is unchanged or saved', () => {
      const dlg = component.analysisActs[0].scenes[0].dialogues[0];
      component.selectedAnalysisScene = component.analysisActs[0].scenes[0];
      component.openInspector(dlg.dialogue_id);
      const confirmSpy = spyOn(window, 'confirm').and.returnValue(false);
      component.valComment = 'note';
      component.saveDraftReview();
      expect(component.hasUnsavedDraft()).toBeFalse();
      component.closeInspector();
      expect(confirmSpy).not.toHaveBeenCalled();
    });
  });
  describe('Phase 6 — dimension evidence, honest RTT and evidence inspector (Hamlet)', () => {
    const rttRecord = (rtt: number, direct: number) => ({
      status: 'completed' as const, source_translation: 'human_german', back_translated_english: 'Who is there?',
      back_translation_model: 'MyMemory-NMT-DE-EN-v2.1', similarity_model: 'Philological-Semantic-Sim-v1.5',
      direct_semantic_score: direct, rtt_semantic_score: rtt, disagreement: rtt - direct, requires_expert_review: false,
      review_reason: null, generated_at: '2026-11-09T00:00:00Z'
    });

    it('shows "Not evaluated" RTT for every dimension when no back-translation exists (no baseline from the source English)', () => {
      const d = component.analysisActs[0].scenes[0].dialogues[0];
      delete d.round_trip_verification;
      component.openInspector(d.dialogue_id, 'human_german');
      component.currentInlineBtResult = null;
      component.backTranslationResult = null;
      component.computeRttForCurrentDialogue();
      expect(component.currentRttSource).toBe('none');
      const rows = component.hamletRttRows(d);
      expect(rows.length).toBe(8);
      expect(rows.every(r => r.rtt === null)).toBeTrue();
      expect(component.hamletDisagreement(d).status).toBe('not_evaluated');
    });

    it('uses the dataset semantic RTT only and never duplicates it across dimensions', () => {
      const d = component.analysisActs[0].scenes[0].dialogues[0];
      d.round_trip_verification = rttRecord(70, 95);
      component.openInspector(d.dialogue_id, 'human_german');
      component.currentInlineBtResult = null;
      component.backTranslationResult = null;
      component.computeRttForCurrentDialogue();
      expect(component.currentRttSource).toBe('dataset');
      const rows = component.hamletRttRows(d);
      expect(rows.find(r => r.key === 'semantic')!.rtt).toBe(70);
      expect(rows.filter(r => r.key !== 'semantic').every(r => r.rtt === null)).toBeTrue();
      expect(component.getHamletBtEnglish(d)).toBe('Who is there?');
      // the direct score is left untouched (no overwrite, no averaging)
      expect(rows.find(r => r.key === 'semantic')!.direct).toBe(component.getDialogueDimensionScore(d, 'semantic'));
    });

    it('labels |direct − RTT| at or above the configurable threshold as a potential disagreement and queues it', () => {
      const d = component.analysisActs[0].scenes[0].dialogues[0];
      const direct = component.getDialogueDimensionScore(d, 'semantic') as number;
      d.round_trip_verification = rttRecord(direct - 20, direct);
      component.openInspector(d.dialogue_id, 'human_german');
      component.currentInlineBtResult = null;
      component.backTranslationResult = null;
      component.computeRttForCurrentDialogue();
      component.setRttThreshold(15);
      expect(component.hamletDisagreement(d).status).toBe('potential_disagreement');
      const q = component.getValidationQueueItems().filter(i => i.dialogue_id === d.dialogue_id && i.dimKey === 'semantic');
      expect(q.length).toBeGreaterThan(0);
      component.setRttThreshold(25);
      expect(component.hamletDisagreement(d).status).toBe('agree');
      expect(localStorage.getItem('hamlet_rtt_threshold_v1')).toBe('25');
      component.setRttThreshold(15);
    });

    it('validates evidence offsets against the displayed text and routes mismatches to "Unlocated evidence"', () => {
      const d = component.analysisActs[0].scenes[0].dialogues[0];
      component.openInspector(d.dialogue_id, 'human_german');
      const ana = d.analysis.human_german!['semantic'];
      const good = ana.evidence.length;
      ana.evidence.push({
        evidence_id: 'BROKEN-1', source_quote: 'nonexistent', target_quote: 'gibt es nicht',
        source_span: { start: 0, end: 5, text: 'xxxxx' }, target_span: { start: 0, end: 3, text: 'zzz' },
        status: 'Lost', explanation: 'offset drift', ui_highlight_eligible: true
      } as any);
      component.activeInspectorDim = 'semantic';
      const unlocated = component.hamletUnlocatedEvidence(d);
      expect(unlocated.map(u => u.key)).toContain('BROKEN-1');
      expect(component.getHumanSourceSpansForDialogue(d, 'semantic').length).toBeLessThanOrEqual(good);
      expect(component.getHumanSourceSpansForDialogue(d, 'semantic').some(sp => sp.linkId === 'BROKEN-1')).toBeFalse();
      ana.evidence.pop();
    });

    it('links English and German spans of the same evidence item by evidence ID and opens the Evidence Inspector', () => {
      const d = component.analysisActs[0].scenes[0].dialogues[0];
      component.openInspector(d.dialogue_id, 'human_german');
      component.activeInspectorDim = 'semantic';
      const en = Array.from(d.texts.english), de = Array.from(d.texts.human_german || '');
      d.analysis.human_german!['semantic'].evidence = [{
        evidence_id: `${d.dialogue_id}:human_german:semantic:001`, source_quote: en.slice(0, 3).join(''), target_quote: de.slice(0, 3).join(''),
        source_span: { start: 0, end: 3, text: en.slice(0, 3).join('') }, target_span: { start: 0, end: 3, text: de.slice(0, 3).join('') },
        status: 'Preserved', explanation: 'test pair', verified: true, ui_highlight_eligible: true,
        span_validation: { valid: true, source_valid: true, target_valid: true, offset_unit: 'unicode_codepoint', end_exclusive: true } as any
      }];
      const src = component.getHumanSourceSpansForDialogue(d, 'semantic');
      const tgt = component.getTargetSpansForDialogue(d, 'human_german', 'semantic');
      expect(src.length).toBe(1);
      expect(tgt.length).toBe(1);
      expect(src[0].linkId).toBe(tgt[0].linkId);
      component.onSegmentClick({ segment: { linkId: src[0].linkId, evidence: src[0].evidence, text: 'x', status: 'Preserved' }, event: new MouseEvent('click') }, 'english', d);
      expect(component.selectedEvidenceKey).toBe(src[0].linkId);
      const vm = component.hamletEvidenceVm(d)!;
      expect(vm.project).toBe('hamlet');
      expect(vm.dimensionKey).toBe('semantic');
      expect(vm.sourcePhrase).toBeTruthy();
      expect(component.activePopover).toBeNull();
    });

    it('keeps the selected dimension when moving to the previous / next dialogue', () => {
      const scene = component.analysisActs[0].scenes[0];
      component.selectAnalysisScene(scene);
      component.openInspector(scene.dialogues[0].dialogue_id, 'human_german');
      component.selectDimensionTab('tone');
      expect(component.hasPrevDialogue()).toBeFalse();
      if (component.hasNextDialogue()) {
        component.goToDialogue(1);
        expect(component.activeInspectorDim).toBe('tone');
        component.goToDialogue(-1);
        expect(component.activeInspectorDim).toBe('tone');
      }
      expect(component.activeInspectedDialogueId).toBe(scene.dialogues[0].dialogue_id);
    });

    it('reports provenance and shows N/A instead of 0 for non-applicable dimensions', () => {
      const d = component.analysisActs[0].scenes[0].dialogues[0];
      for (const k of ['semantic', 'emotion', 'metaphor_imagery', 'tone', 'character_voice', 'wordplay', 'cultural_archaic', 'omissions_additions']) {
        const sc = component.getDialogueDimensionScore(d, k);
        if (sc === null) { expect(component.getDialogueDimensionScoreDisplay(d, k)).toBe('N/A'); }
        else { expect(component.getDialogueDimensionScoreDisplay(d, k)).not.toBe('N/A'); }
      }
      component.openInspector(d.dialogue_id, 'human_german');
      expect(['provisional', 'model_assisted', 'expert_validated', 'none']).toContain(component.hamletDirectProvenance(d));
    });
  });
});
