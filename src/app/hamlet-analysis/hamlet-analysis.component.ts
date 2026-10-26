import { FullBookAdapterService } from './services/full-book-adapter.service';
import { Component, OnInit, OnDestroy, ViewChild, ChangeDetectorRef, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import {
  COMPARISON_TO_PHRASE_DIM_MAP,
  EvidenceFocusContext,
  HamletDataService,
  PassageFilters,
  VERSIONS,
} from './services/hamlet-data.service';
import { FullBookNavigatorComponent } from './components/full-book-navigator/full-book-navigator.component';
import { VersionCardsComponent } from './components/version-cards/version-cards.component';
import { ComparisonSelectorComponent } from './components/comparison-selector/comparison-selector.component';
import { OverallScoreComponent } from './components/overall-score/overall-score.component';
import { ScoreBarsComponent } from './components/score-bars/score-bars.component';
import { RadarChartComponent } from './components/radar-chart/radar-chart.component';
import { DimensionDetailsComponent } from './components/dimension-details/dimension-details.component';
import { ComparisonMatrixComponent } from './components/comparison-matrix/comparison-matrix.component';
import { TranslationRankingComponent } from './components/translation-ranking/translation-ranking.component';
import { ComparisonDiffComponent } from './components/comparison-diff/comparison-diff.component';
import { DatasetDashboardComponent } from './components/dataset-dashboard/dataset-dashboard.component';
import { PhraseEvidenceWorkspaceComponent } from './components/phrase-evidence-workspace/phrase-evidence-workspace.component';
import { EvidenceHeatmapComponent } from './components/evidence-heatmap/evidence-heatmap.component';
import { PdfHighlighterComponent } from '../pdf-highlighter/pdf-highlighter.component';
import { EvidenceHighlightedTextComponent, codePointLength } from './components/evidence-highlighted-text/evidence-highlighted-text.component';
import { ValidationQueueComponent, QueueItem } from './components/validation-queue/validation-queue.component';
import {
  HamletUiAnalysisData,
  AnalysisAct,
  AnalysisScene,
  AnalysisDialogue,
  DIMENSION_DEFINITIONS,
  VERSION_DEFINITIONS,
  DimensionSummaryScore
} from './models/hamlet-analysis-v15.models';
import { HamletAggregationService } from './services/hamlet-aggregation.service';
import { ExpertReviewService } from './services/expert-review.service';
import { ReviewCountingService, DialogueReviewGroup, ReviewIssue, SceneReviewSummary } from './services/review-counting.service';
import { SceneDialogueTableComponent } from './components/scene-dialogue-table/scene-dialogue-table.component';
import { HamletSelectionService, ViewMode } from './services/hamlet-selection.service';
import { BackTranslationService, BackTranslationResult } from './services/back-translation.service';
import {
  HUMAN_SCORE_HEATMAP,
  getHeatmapThreshold,
  getScoreCssClass,
  formatHumanScore
} from './models/heatmap-config';

export interface ActiveEvidencePopover {
  evidenceId?: string;
  dialogueId: string;
  speaker: string;
  translationKey: string;
  translationName: string;
  dimensionKey: string;
  dimensionName: string;
  status: string;
  score: number | null;
  confidence: number | null;
  sourceQuote: string;
  targetQuote: string;
  explanation: string;
  englishDialogue: string;
  targetDialogue: string;
  mode: 'hover' | 'pinned';
  left: number;
  top: number;
  arrowPos: 'top' | 'bottom';
  docNotice?: string | null;
}

export interface AnalysisNavigationTarget {
  act: number;
  sceneId: string;
  dialogueId?: string;
  translationKey?: string;
  dimensionKey?: string;
  evidenceId?: string;
}

@Component({
  selector: 'app-hamlet-analysis',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    FullBookNavigatorComponent,
    VersionCardsComponent,
    ComparisonSelectorComponent,
    OverallScoreComponent,
    ScoreBarsComponent,
    RadarChartComponent,
    DimensionDetailsComponent,
    ComparisonMatrixComponent,
    TranslationRankingComponent,
    ComparisonDiffComponent,
    DatasetDashboardComponent,
    PhraseEvidenceWorkspaceComponent,
    EvidenceHeatmapComponent,
    PdfHighlighterComponent,
    EvidenceHighlightedTextComponent,
    ValidationQueueComponent,
    SceneDialogueTableComponent,
  ],
  templateUrl: './hamlet-analysis.component.html',
  styleUrls: ['./hamlet-analysis.component.scss'],
})
export class HamletAnalysisComponent implements OnInit, OnDestroy {
  @ViewChild(PhraseEvidenceWorkspaceComponent)
  phraseWorkspace?: PhraseEvidenceWorkspaceComponent;

  passages: any[] = [];
  sceneData: any[] = [];
  datasetSummary: any = null;
  metadata: any = null;
  loading = true;
  error: string | null = null;

  phraseData: any = null;
  evidenceLoadError: string | null = null;
  heatmapDimension: string | null = null;
  evidenceFocusContext: EvidenceFocusContext | null = null;

  activeTab: 'passage' | 'dataset' | 'heatmap' | 'queue' = 'passage';
  selectedPassage: any = null;
  selectedSource = 'english';
  selectedTarget = 'context_ai_german';
  selectedComparison: any = null;
  selectedDiffCategory: string | null = 'semantic';

  // --- Version 1.5 Analysis Dataset & State ---
  analysisData: HamletUiAnalysisData | null = null;
  analysisActs: AnalysisAct[] = [];
  selectedAnalysisAct = 1;
  selectedAnalysisScene: AnalysisScene | null = null;
  selectedAnalysisDimension = 'semantic';
  analysisPhraseFilter: 'all' | 'diff' | 'review' = 'all';
  analysisSearchText = '';
  studySortMode: 'rec' | 'spread' | 'flags' | 'ctx' | 'low' = 'rec';
  speechPreviewsOpen = false;

  // Hierarchical Scene & Dialogue Expansion State
  expandedSceneIds = new Set<string>();
  autoExpandDialogueId: string | null = null;

  // Workspace Scroll Container Reference (for independent scrolling)
  @ViewChild('workspaceContainer') workspaceContainerRef?: ElementRef<HTMLElement>;

  // Act Bar Chart Dimension State (Defaults to 'overall' or active dimension)
  selectedActChartDimension: string = 'overall';

  // Inspector State
  activeInspectedDialogueId: string | null = null;
  activeInspectorDim = 'semantic';
  activeLinkedSpanId: string | null = null;

  // Heatmap View State
  v15HeatmapMode: 'cmp' | 'human_german' | 'ai_german' | 'context_ai_german' | 'eff' = 'cmp';
  v15HeatmapAct = 'all';
  v15HeatmapMax = 'all';

  // Validation & Review Inspector State
  expertValidations: Record<string, any> = {};
  valTarget = 'ai_german';
  valVerdict: string | null = null;
  valClassification = 'No correction';
  valDecision: 'Accept' | 'Reject' | 'Needs Revision' | null = null;
  valScoreOverride: number | null = null;
  valComment = '';
  valReviewer = 'Shakespeare Scholar';
  valReviewedAt: string | null = null;
  valSaveMessage = '';

  // Score Traceability Modal State
  scoreTraceModalOpen = false;
  scoreTraceData: {
    scene: AnalysisScene;
    dimKey: string;
    dimName: string;
    verKey: string;
    verName: string;
    summary: DimensionSummaryScore;
    dialogues: Array<{
      dialogue_id: string;
      speaker: string;
      english: string;
      score: number | null;
      applicable: boolean;
      weight: number;
      weightedScore: number;
      hasOverride: boolean;
      evidenceCount: number;
      dialogue: AnalysisDialogue;
    }>;
  } | null = null;

  // Review Drill-down Modal State
  reviewDrilldownModalOpen = false;
  reviewDrilldownData: {
    scene: AnalysisScene;
    dialogueGroups: DialogueReviewGroup[];
    flaggedDialogues?: any[];
    flaggedDialoguesCount: number;
    totalFlaggedAssessments: number;
    evidenceIssueCount: number;
  } | null = null;

  // Managed Evidence Popover State
  activePopover: ActiveEvidencePopover | null = null;
  popoverCloseTimer: any = null;
  isMouseOverPopover = false;

  // Backward compatibility tooltip properties
  tooltipVisible = false;
  tooltipDimension = '';
  tooltipVersion = '';
  tooltipStatus = '';
  tooltipScore = '';
  tooltipConfidence = '';
  tooltipQuotes = '';
  tooltipExplanation = '';
  tooltipPos = { left: 0, top: 0 };

  readonly v15Dimensions = DIMENSION_DEFINITIONS;
  readonly v15Versions = VERSION_DEFINITIONS;

  dimensions = [
    { value: 'semantic', label: 'Semantic' },
    { value: 'emotion', label: 'Emotion' },
    { value: 'tone', label: 'Tone' },
    { value: 'metaphor', label: 'Metaphor' },
    { value: 'cultural', label: 'Cultural' },
    { value: 'voice', label: 'Voice' },
    { value: 'omission', label: 'Omission' }
  ];
  
  showPairwiseForScene = false;

  getSceneScore(passage: any, dim: string, target: string): string | number {
    const comp = passage.comparisons?.find((c: any) => c.source_version === 'english' && c.target_version === target);
    if (comp && comp.dimensions && comp.dimensions[dim]) {
      return comp.dimensions[dim].score;
    }
    return '-';
  }

  selectTranslation(dim: string, target: string): void {
    this.selectedSource = 'english';
    this.selectedTarget = target;
    this.showPairwiseForScene = true;
    this.onPairwiseDimensionClick(dim);
  }

  filters: PassageFilters = {
    search: '',
    act: null,
    scene: null,
    feature: '',
  };

  sidebarOpen = true;

  /** PDF book viewer panel */
  pdfPanelOpen = false;
  activePdfBook: 'english' | 'german' | null = null;
  pdfSource = '';
  pdfHighlightText = '';
  readonly englishPdfPath = 'assets/Hamlet.pdf';
  readonly germanPdfPath = 'assets/GermanHamlet.pdf';

  readonly versions = VERSIONS;

  /** October 25 Meeting UI Redesign State */
  showAnalysis = false;
  detailedReviewModalOpen = false;
  readerInspectedDialogueId: string | null = null;
  selectedEvidencePhrase: {
    dimension: string;
    sourceText: string;
    targetText: string;
    category: string;
    score: number | null;
    confidence: number | null;
    explanation: string;
    evidenceId: string;
    provenance: string;
  } | null = null;

  readonly primaryDimensionTabs = [
    { key: 'semantic', label: 'Semantic', name: 'Semantic' },
    { key: 'emotion', label: 'Emotion', name: 'Emotion' },
    { key: 'metaphor_imagery', label: 'Metaphor', name: 'Metaphor' },
    { key: 'tone', label: 'Tone', name: 'Tone' },
    { key: 'character_voice', label: 'Voice', name: 'Voice' },
    { key: 'cultural_archaic', label: 'Cultural', name: 'Cultural' },
    { key: 'omissions_additions', label: 'Omissions', name: 'Omissions' }
  ];

  sceneReadingOpen = true;
  mobileTocOpen = false;
  backTranslationResult: BackTranslationResult | null = null;
  backTranslationLoading = false;
  readonly heatmapThresholds = HUMAN_SCORE_HEATMAP;

  constructor(
    private dataService: HamletDataService,
    private adapter: FullBookAdapterService,
    private sanitizer: DomSanitizer,
    public aggregationService: HamletAggregationService,
    public expertReviewService: ExpertReviewService,
    public reviewCountingService: ReviewCountingService,
    public selectionService: HamletSelectionService,
    public backTranslationService: BackTranslationService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Load local storage validations if present
    try {
      const stored = localStorage.getItem('hamlet_v15_validations');
      if (stored) this.expertValidations = JSON.parse(stored);
    } catch (e) {}

    forkJoin({
      comparison: this.dataService.getData().pipe(catchError(() => of({ passages: [] }))),
      fullBookUi: this.dataService.loadFullBookUiData().pipe(catchError(() => of(null))),
      sceneLevelData: this.dataService.loadFullBookHierarchy().pipe(catchError(() => of(null))),
      phrase: this.dataService.getPhraseEvidenceData().pipe(catchError(() => of(null))),
      analysisJson: this.dataService.loadAnalysisJson().pipe(catchError(() => of(null))),
    }).subscribe({
      next: ({ comparison, phrase, sceneLevelData, fullBookUi, analysisJson }) => {
        this.passages = comparison?.passages ?? [];
        this.sceneData = fullBookUi?.scenes ?? sceneLevelData?.scenes ?? [];
        this.datasetSummary = comparison?.dataset_summary ?? null;
        this.metadata = comparison?.metadata ?? null;
        this.phraseData = phrase;

        if (analysisJson) {
          this.initAnalysisV15Data(analysisJson);
        }

        if (!phrase) {
          this.evidenceLoadError =
            'Phrase-alignment evidence JSON could not be loaded. Passage comparison still works.';
        }
        this.loading = false;
      },
      error: () => {
        this.error = 'Failed to load Hamlet comparison data.';
        this.loading = false;
      },
    });
  }

  selectPassage(passage: any): void {
    this.selectedPassage = passage;
    // this.selectedDiffCategory = null; // Do not clear the dimension on selection
    this.evidenceFocusContext = null;
    this.updateComparison();
    if (this.pdfPanelOpen && this.activePdfBook) {
      this.refreshPdfHighlight();
    }
  }

  onSceneSelected(event: { act: number; scene: number }): void {
    console.log('onSceneSelected triggered!', event, 'Scene data length:', this.sceneData?.length);
    const sceneObj = this.sceneData.find(s => s.act === event.act && s.scene === event.scene);
    console.log('Found scene object:', sceneObj);
    if (sceneObj) {
      this.selectPassage(sceneObj);
      this.showPairwiseForScene = false;
    }
  }

  onPairwiseDimensionClick(dimKey: string): void {
    const mappedDim = COMPARISON_TO_PHRASE_DIM_MAP[dimKey] || dimKey;
    this.evidenceFocusContext = {
      sourceVersion: this.selectedSource,
      targetVersion: this.selectedTarget,
      dimension: mappedDim,
    };
    this.phraseWorkspace?.focusDimension(mappedDim, this.evidenceFocusContext);
  }

  getEvidencePassage(passageId: string | null | undefined): any | null {
    if (!passageId || !this.phraseData?.passages) {
      return null;
    }
    return (
      this.phraseData.passages.find((p: any) => p.passage_id === passageId) ?? null
    );
  }

  openPdfBook(book: 'english' | 'german', customHighlight?: string): void {
    this.activePdfBook = book;
    this.pdfSource = book === 'english' ? this.englishPdfPath : this.germanPdfPath;
    this.pdfHighlightText = (customHighlight !== undefined && customHighlight !== null)
      ? customHighlight.trim()
      : this.getPdfHighlightText(book);
    this.pdfPanelOpen = true;
  }

  closePdfPanel(): void {
    this.pdfPanelOpen = false;
    this.activePdfBook = null;
    this.pdfHighlightText = '';
  }

  private refreshPdfHighlight(): void {
    if (!this.activePdfBook) {
      return;
    }
    this.pdfHighlightText = this.getPdfHighlightText(this.activePdfBook);
  }

  private getPdfHighlightText(book: 'english' | 'german'): string {
    const inspected = this.getInspectedDialogue();
    if (inspected && inspected.texts) {
      if (book === 'english') {
        return String(inspected.texts.english || '').trim();
      }
      return String(inspected.texts.human_german || inspected.texts.ai_german || inspected.texts.context_ai_german || '').trim();
    }

    if (this.selectedAnalysisScene && this.selectedAnalysisScene.dialogues.length > 0) {
      const d0 = this.selectedAnalysisScene.dialogues[0];
      if (book === 'english') {
        return String(d0.texts.english || '').trim();
      }
      return String(d0.texts.human_german || d0.texts.ai_german || d0.texts.context_ai_german || '').trim();
    }

    const texts = this.selectedPassage?.texts;
    if (!texts) {
      return '';
    }
    if (book === 'english') {
      return String(texts.english || '').trim();
    }
    return String(texts.human_german || texts.ai_german || texts.context_ai_german || '').trim();
  }

  getPdfPanelTitle(): string {
    if (this.activePdfBook === 'english') {
      return 'English Hamlet';
    }
    if (this.activePdfBook === 'german') {
      return 'German Hamlet';
    }
    return 'PDF Reader';
  }

  onSourceChange(source: string): void {
    this.selectedSource = source;
    if (this.selectedTarget === source) {
      const alt = this.versions.find((v) => v !== source);
      this.selectedTarget = alt ?? 'human_german';
    }
    this.updateComparison();
  }

  onTargetChange(target: string): void {
    if (target === this.selectedSource) {
      return;
    }
    this.selectedTarget = target;
    this.updateComparison();
  }

  onComparisonSelect(event: { source: string; target: string }): void {
    this.selectedSource = event.source;
    this.selectedTarget = event.target;
    this.updateComparison();
  }

  updateComparison(): void {
    if (!this.selectedPassage) {
      this.selectedComparison = null;
      return;
    }
    if (this.selectedSource === this.selectedTarget) {
      const alt = this.versions.find((v) => v !== this.selectedSource);
      this.selectedTarget = alt ?? 'human_german';
    }
    this.selectedComparison = this.dataService.getComparison(
      this.selectedPassage,
      this.selectedSource,
      this.selectedTarget
    );
  }

  onFiltersChange(filters: PassageFilters): void {
    this.filters = { ...filters };
  }

  onDiffCategoryChange(category: string | null): void {
    if (category) {
      this.selectedDiffCategory = category;
    }
  }

  setTab(tab: 'passage' | 'dataset' | 'heatmap' | 'queue'): void {
    this.activeTab = tab;
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  openHeatmapCell(passageId: string, dimension: string): void {
    const passage = this.passages.find((p) => p.passage_id === passageId);
    if (!passage) {
      return;
    }
    this.selectPassage(passage);
    this.heatmapDimension = dimension;
    this.activeTab = 'passage';
    setTimeout(() => {
      this.phraseWorkspace?.activateFromHeatmap(dimension);
    }, 80);
  }

  // ==========================================
  // Version 1.5 Product Visual System Methods
  // ==========================================

  private initAnalysisV15Data(raw: HamletUiAnalysisData): void {
    this.analysisData = raw;

    if (raw.acts && raw.acts.length > 0) {
      this.analysisActs = raw.acts.map((act) => {
        const scenes = act.scenes.map((scene) => {
          if (scene.dialogues) {
            scene.dialogues.forEach((dlg) => {
              this.expertReviewService.attachReviewsToDialogue(dlg);
            });
          }
          return scene;
        });
        return {
          act: act.act,
          scenes,
          scores: act.scores
        };
      });
    }

    if (this.analysisActs.length > 0) {
      this.reviewCountingService.buildIndex(this.analysisActs);
      this.selectedAnalysisAct = 1;
      const firstScene = this.analysisActs[0]?.scenes?.[0] || null;
      this.selectedAnalysisScene = firstScene;
      this.sceneReadingOpen = true;
      this.showAnalysis = false;
    }
  }

  getStatusBadgeLabel(status: string | null | undefined, flagged: boolean = false): string {
    if (!status || status === 'Not computed') return 'Not computed';
    if (status.toLowerCase().includes('review') || flagged) return 'Needs Review';
    return status;
  }

  getChipClass(status: string | null | undefined, flagged: boolean = false): string {
    if (!status) return 'v15-chip--not';
    const st = status.toLowerCase();
    if (st.includes('review') || flagged) return 'v15-chip--review';
    if (st.includes('preserv')) return 'v15-chip--preserved';
    if (st.includes('chang')) return 'v15-chip--changed';
    if (st.includes('lost')) return 'v15-chip--lost';
    if (st.includes('add')) return 'v15-chip--added';
    return 'v15-chip--not';
  }

  isSceneAnalyzed(scene: AnalysisScene | null | undefined): boolean {
    if (!scene) return false;
    if (scene.analyzed_count !== undefined) return scene.analyzed_count > 0;
    return !!scene.dialogues && scene.dialogues.some((d) => !!d.analysis && Object.keys(d.analysis).length > 0);
  }

  isDialogueAnalyzed(dlg: AnalysisDialogue | null | undefined): boolean {
    return !!dlg && !!dlg.analysis && Object.keys(dlg.analysis).length > 0;
  }

  isDialogueFlaggedForReview(d: AnalysisDialogue): boolean {
    if (!d.analysis) return false;
    for (const v of this.v15Versions) {
      const verObj = d.analysis[v.key];
      if (!verObj) continue;
      for (const dim of this.v15Dimensions) {
        const ana = verObj[dim.key];
        if (!ana || !ana.applicable) continue;
        if (ana.needs_review) return true;
        if (ana.confidence !== null && ana.confidence !== undefined && ana.confidence < 0.70) return true;
        if (ana.evidence && ana.evidence.some((e) => e.valid === false || (e.span_validation && !e.span_validation.valid))) return true;
      }
    }
    return false;
  }

  getAllAnalysisScenes(): AnalysisScene[] {
    const scenes: AnalysisScene[] = [];
    if (!this.analysisActs) return scenes;
    this.analysisActs.forEach((act) => {
      if (act.scenes) {
        act.scenes.forEach((sc) => scenes.push(sc));
      }
    });
    return scenes;
  }

  get viewMode(): ViewMode {
    if (this.activeInspectedDialogueId) return 'dialogue';
    if (this.selectedAnalysisScene) return 'scene';
    return 'act';
  }

  get currentAct(): AnalysisAct | null {
    return this.analysisActs.find((a) => a.act === this.selectedAnalysisAct) || null;
  }

  getActScenes(actNum: number): AnalysisScene[] {
    const act = this.analysisActs.find((a) => a.act === actNum);
    return act?.scenes || [];
  }

  selectAnalysisAct(actNum: number): void {
    this.selectedAnalysisAct = actNum;
    this.selectedAnalysisScene = null;
    this.activeInspectedDialogueId = null;
    this.selectionService.selectAct(actNum);
    this.closeEvidencePopover();
    this.scrollWorkspaceToTop();
  }

  selectAnalysisScene(scene: AnalysisScene | null): void {
    this.selectedAnalysisScene = scene;
    if (scene) {
      this.selectedAnalysisAct = scene.act;
      this.selectionService.selectScene(scene.act, scene.scene_id, this.sceneReadingOpen);
    } else {
      this.selectionService.selectAct(this.selectedAnalysisAct);
    }
    this.activeInspectedDialogueId = null;
    this.closeEvidencePopover();
    this.scrollWorkspaceToTop();
  }

  switchToSceneView(): void {
    this.activeInspectedDialogueId = null;
    this.backTranslationResult = null;
    if (this.selectedAnalysisScene) {
      this.selectionService.selectScene(
        this.selectedAnalysisScene.act,
        this.selectedAnalysisScene.scene_id,
        this.sceneReadingOpen
      );
    } else {
      this.selectionService.clearDialogue();
    }
    this.closeEvidencePopover();
    this.scrollWorkspaceToTop();
  }

  switchToActView(actNum?: number): void {
    const targetAct = actNum !== undefined ? actNum : (this.selectedAnalysisScene?.act || this.selectedAnalysisAct || 1);
    this.selectAnalysisAct(targetAct);
    this.scrollWorkspaceToTop();
  }

  scrollWorkspaceToTop(): void {
    if (this.workspaceContainerRef?.nativeElement) {
      this.workspaceContainerRef.nativeElement.scrollTop = 0;
    }
  }

  onActChartDimensionChange(dimKey: string): void {
    this.selectedActChartDimension = dimKey;
  }

  getSceneChartScore(scene: AnalysisScene): number | null {
    if (this.selectedActChartDimension === 'overall') {
      return this.getSceneOverallScore(scene);
    }
    return this.getSceneDimensionAverageScore(scene, this.selectedActChartDimension);
  }

  getSceneOverallScore(scene: AnalysisScene): number | null {
    if (!this.isSceneAnalyzed(scene)) return null;

    if (scene.dialogues && scene.dialogues.length > 0) {
      const dialogueMeans: number[] = [];
      for (const dlg of scene.dialogues) {
        const dimScores: number[] = [];
        for (const dim of this.v15Dimensions) {
          const ana = dlg.analysis?.human_german?.[dim.key];
          if (ana && ana.applicable !== false && ana.score !== null && ana.score !== undefined && !isNaN(ana.score)) {
            const rev = this.expertReviewService.getReview(dlg, 'human_german', dim.key);
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
      for (const dim of this.v15Dimensions) {
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

  getSceneDimensionAverageScore(scene: AnalysisScene, dimKey: string): number | null {
    if (!this.isSceneAnalyzed(scene)) return null;

    if (scene.dialogues && scene.dialogues.length > 0) {
      let totalScore = 0;
      let count = 0;
      for (const dlg of scene.dialogues) {
        const ana = dlg.analysis?.human_german?.[dimKey];
        if (ana && ana.applicable !== false && ana.score !== null && ana.score !== undefined && !isNaN(ana.score)) {
          const rev = this.expertReviewService.getReview(dlg, 'human_german', dimKey);
          if (rev && rev.score_override !== null && rev.score_override !== undefined && !isNaN(rev.score_override)) {
            totalScore += Number(rev.score_override);
          } else {
            totalScore += Number(ana.score);
          }
          count++;
        }
      }
      if (count > 0) {
        return Math.round((totalScore / count) * 10) / 10;
      }
    }

    return this.getSceneDimensionScore(scene, dimKey, 'human_german');
  }

  getSceneScoredDialoguesCount(scene: AnalysisScene, dimKey: string = 'overall'): number {
    if (!this.isSceneAnalyzed(scene)) return 0;
    if (!scene.dialogues || scene.dialogues.length === 0) {
      return this.getSceneDimensionUnits(scene, dimKey === 'overall' ? 'semantic' : dimKey);
    }
    if (dimKey === 'overall') {
      return scene.dialogues.filter((dlg) => {
        return this.v15Dimensions.some((dim) => {
          const ana = dlg.analysis?.human_german?.[dim.key];
          return ana && ana.applicable !== false && ana.score !== null && ana.score !== undefined;
        });
      }).length;
    }
    return scene.dialogues.filter((dlg) => {
      const ana = dlg.analysis?.human_german?.[dimKey];
      return ana && ana.applicable !== false && ana.score !== null && ana.score !== undefined;
    }).length;
  }

  getActTotalValidAssessments(actNum: number): number {
    const scenes = this.getActScenes(actNum);
    return scenes.reduce((acc, sc) => acc + this.getSceneScoredDialoguesCount(sc, 'overall'), 0);
  }

  selectAnalysisSceneWithDimension(scene: AnalysisScene, dimKey: string): void {
    this.selectedAnalysisDimension = dimKey;
    this.activeInspectorDim = dimKey;
    this.selectedActChartDimension = dimKey;
    this.selectAnalysisScene(scene);
  }

  hasExplanationMismatch(diag: AnalysisDialogue | null, dimKey: string): boolean {
    if (!diag) return false;
    const ana = diag.analysis?.human_german?.[dimKey];
    if (!ana) return false;
    const expl = ana.explanation || '';
    const humanDe = diag.texts?.human_german || '';
    if (expl.includes('Wer ist da?') && !humanDe.includes('Wer ist da?')) {
      return true;
    }
    return false;
  }

  getBarWidth(totalScenes: number): number {
    if (totalScenes <= 0) return 40;
    const colWidth = 690 / totalScenes;
    return Math.max(26, Math.min(54, colWidth * 0.55));
  }

  getBarX(index: number, totalScenes: number): number {
    if (totalScenes <= 0) return 50;
    const colWidth = 690 / totalScenes;
    const barWidth = this.getBarWidth(totalScenes);
    return 50 + index * colWidth + (colWidth - barWidth) / 2;
  }

  getBarHeight(score: number | null): number {
    if (score === null || isNaN(score)) return 6;
    return Math.max(4, Math.min(210, (score / 100) * 210));
  }

  getBarY(score: number | null): number {
    if (score === null || isNaN(score)) return 234;
    return 240 - this.getBarHeight(score);
  }

  getBarCenterX(index: number, totalScenes: number): number {
    if (totalScenes <= 0) return 50;
    const colWidth = 690 / totalScenes;
    return 50 + index * colWidth + colWidth / 2;
  }

  getActDimensionScore(actNum: number, dimKey: string): number | null {
    const act = this.analysisActs.find((a) => a.act === actNum);
    if (!act) return null;
    if (act.scores?.human_german?.[dimKey]?.score !== undefined && act.scores.human_german[dimKey].score !== null) {
      return act.scores.human_german[dimKey].score;
    }
    let totalWeightedScore = 0;
    let totalWeight = 0;
    for (const scene of act.scenes || []) {
      for (const dlg of scene.dialogues || []) {
        const ana = dlg.analysis?.human_german?.[dimKey];
        if (ana && ana.applicable && ana.score !== null && ana.score !== undefined) {
          let scoreToUse = Number(ana.score);
          const review = dlg.expert_review?.dimension_reviews?.human_german?.[dimKey];
          if (review && review.score_override !== null && review.score_override !== undefined && !isNaN(review.score_override)) {
            scoreToUse = Number(review.score_override);
          }
          const weight = Math.max(1, dlg.texts?.english?.length || 10);
          totalWeightedScore += scoreToUse * weight;
          totalWeight += weight;
        }
      }
    }
    if (totalWeight > 0) {
      return Math.round((totalWeightedScore / totalWeight) * 10) / 10;
    }
    return null;
  }

  getActDimensionHumanReviewCount(actNum: number, dimKey: string): number {
    const act = this.analysisActs.find((a) => a.act === actNum);
    if (!act) return 0;
    return (act.scenes || []).reduce((acc, s) => acc + this.getSceneDimensionHumanReviewCount(s, dimKey), 0);
  }

  onActDimensionRowClick(dimKey: string): void {
    this.selectedAnalysisDimension = dimKey;
    this.activeInspectorDim = dimKey;
  }

  getActDimensionUnits(actNum: number, dimKey: string): { units: number; total: number } {
    const act = this.analysisActs.find((a) => a.act === actNum);
    if (!act) return { units: 0, total: 0 };
    let units = 0;
    let total = 0;
    for (const scene of act.scenes || []) {
      total += scene.dialogues?.length || 0;
      for (const dlg of scene.dialogues || []) {
        const ana = dlg.analysis?.human_german?.[dimKey];
        if (ana && ana.applicable && ana.score !== null && ana.score !== undefined) {
          units++;
        }
      }
    }
    return { units, total };
  }

  getActTotalDialogues(actNum: number): number {
    const act = this.analysisActs.find((a) => a.act === actNum);
    if (!act) return 0;
    return (act.scenes || []).reduce((acc, s) => acc + (s.dialogues?.length || 0), 0);
  }

  getActTotalReviewCount(actNum: number): number {
    const act = this.analysisActs.find((a) => a.act === actNum);
    if (!act) return 0;
    return (act.scenes || []).reduce((acc, s) => acc + this.getSceneHumanReviewCount(s), 0);
  }

  getActScoredDialoguesCount(actNum: number): number {
    const act = this.analysisActs.find((a) => a.act === actNum);
    if (!act) return 0;
    return (act.scenes || []).reduce((acc, s) => acc + this.getSceneScoredDialoguesCount(s), 0);
  }


  onTocActSelected(actNum: number): void {
    this.selectAnalysisAct(actNum);
  }

  onTocSceneSelected(evt: { act: number; sceneId: string; sceneNumber: number }): void {
    const act = this.analysisActs.find((a) => a.act === evt.act);
    const sc = act?.scenes.find((s) => s.scene_id === evt.sceneId);
    if (sc) {
      this.selectAnalysisAct(evt.act);
      this.selectAnalysisScene(sc);
      this.sceneReadingOpen = true;
    }
  }

  onTocDialogueSelected(evt: { act: number; sceneId: string; dialogueId: string; dialogue: AnalysisDialogue }): void {
    const act = this.analysisActs.find((a) => a.act === evt.act);
    const sc = act?.scenes.find((s) => s.scene_id === evt.sceneId);
    if (sc) {
      this.selectedAnalysisAct = evt.act;
      this.selectedAnalysisScene = sc;
      this.valTarget = 'human_german';
      this.openInspector(evt.dialogueId, 'human_german');
      this.selectionService.selectDialogue(evt.dialogueId, evt.act, evt.sceneId);
      this.scrollWorkspaceToTop();
    }
  }

  onTocDimensionChange(dimKey: string): void {
    this.selectedAnalysisDimension = dimKey;
    this.activeInspectorDim = dimKey;
    this.selectionService.selectDimension(dimKey);
    this.selectedActChartDimension = dimKey;
  }

  onSceneDimensionRowClick(dimKey: string): void {
    this.selectedAnalysisDimension = dimKey;
    this.activeInspectorDim = dimKey;
    this.sceneReadingOpen = true;
    this.selectionService.selectDimension(dimKey);
  }

  toggleSceneReading(): void {
    this.sceneReadingOpen = !this.sceneReadingOpen;
    this.selectionService.setAnalysisPanelOpen(this.sceneReadingOpen);
  }

  translateActiveDialogueBackToEnglish(): void {
    const d = this.getInspectedDialogue();
    const deText = d?.texts?.human_german;
    if (!deText) {
      this.backTranslationResult = {
        dialogueId: d?.dialogue_id,
        sourceGerman: '',
        translatedEnglish: '',
        cached: false,
        status: 'error',
        message: 'No Human German translation available for this dialogue.'
      };
      return;
    }

    this.backTranslationLoading = true;
    this.backTranslationService.translateGermanToEnglish(deText, d?.dialogue_id).subscribe({
      next: (res) => {
        this.backTranslationResult = res;
        this.backTranslationLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.backTranslationResult = {
          dialogueId: d?.dialogue_id,
          sourceGerman: deText,
          translatedEnglish: '',
          cached: false,
          status: 'error',
          message: 'Back-translation service error.'
        };
        this.backTranslationLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  getHumanScoreThreshold(score: number | null | undefined) {
    return getHeatmapThreshold(score);
  }

  getHumanScoreClass(score: number | null | undefined): string {
    return getScoreCssClass(score);
  }

  getDialogueHumanScore(diag: AnalysisDialogue | null | undefined, dimKey: string): number | null {
    if (!diag || !diag.analysis) return null;
    const ana = (diag.analysis as any)?.human_german?.[dimKey];
    if (!ana || ana.applicable === false || ana.score === null || ana.score === undefined) {
      return null;
    }
    return ana.score;
  }


  getHumanScoreColor(score: number | null | undefined): string {
    const t = getHeatmapThreshold(score);
    return t ? t.color : '#94a3b8';
  }

  getHumanScoreBgColor(score: number | null | undefined): string {
    const t = getHeatmapThreshold(score);
    return t ? t.bgColor : '#f1f5f9';
  }

  getHumanScoreWidth(score: number | null | undefined): string {
    if (score === null || score === undefined || isNaN(score)) return '0%';
    return `${Math.min(100, Math.max(0, score))}%`;
  }

  getSceneHumanReviewCount(scene: AnalysisScene): number {
    if (!scene) return 0;
    return this.reviewCountingService.getSceneFlaggedDialogueCount(scene.scene_id);
  }

  getSceneDimensionHumanReviewCount(scene: AnalysisScene, dimKey: string): number {
    if (!scene) return 0;
    return this.reviewCountingService.getSceneDimensionFlaggedDialogueCount(scene.scene_id, dimKey);
  }

  isDialogueExpertReviewed(dialogue: AnalysisDialogue | undefined | null, dimKey: string): boolean {
    if (!dialogue) return false;
    const rev = dialogue.expert_review?.dimension_reviews?.human_german?.[dimKey];
    return !!(rev && (rev.decision || (rev.score_override !== null && rev.score_override !== undefined)));
  }

  isSceneExpanded(sceneId: string): boolean {
    return this.expandedSceneIds.has(sceneId);
  }

  toggleSceneExpand(sceneId: string, forceState?: boolean): void {
    if (forceState !== undefined) {
      if (forceState) {
        this.expandedSceneIds.add(sceneId);
      } else {
        this.expandedSceneIds.delete(sceneId);
      }
      return;
    }
    if (this.expandedSceneIds.has(sceneId)) {
      this.expandedSceneIds.delete(sceneId);
    } else {
      this.expandedSceneIds.add(sceneId);
    }
  }

  onStudySceneClick(sc: AnalysisScene): void {
    this.navigateToAnalysis({
      act: sc.act,
      sceneId: sc.scene_id
    });
  }

  async navigateToAnalysis(target: AnalysisNavigationTarget): Promise<void> {
    this.closeEvidencePopover();

    // 1. Resolve act and scene from loaded dataset
    let targetScene: AnalysisScene | undefined;
    for (const act of this.analysisActs) {
      const found = act.scenes.find((s) => s.scene_id === target.sceneId);
      if (found) {
        targetScene = found;
        target.act = act.act;
        break;
      }
    }

    if (!targetScene) {
      const act = this.analysisActs.find((a) => a.act === target.act);
      if (act && act.scenes.length > 0) {
        targetScene = act.scenes.find((s) => s.scene_id === target.sceneId) || act.scenes[0];
      }
    }

    if (!targetScene) {
      console.warn('Target scene could not be resolved for navigation:', target);
      return;
    }

    // 2. Activate act tab & select scene
    this.selectedAnalysisAct = targetScene.act;
    this.selectedAnalysisScene = targetScene;

    // 3. Clear filters and search so dialogues are never hidden
    this.analysisPhraseFilter = 'all';
    this.analysisSearchText = '';

    // 4. Set dimension & target translation if provided
    if (target.dimensionKey) {
      this.selectedAnalysisDimension = target.dimensionKey;
      this.activeInspectorDim = target.dimensionKey;
    }
    if (target.translationKey && target.translationKey !== 'english') {
      this.valTarget = target.translationKey;
    }

    // 5. Resolve dialogue target if specified or find first relevant dialogue
    let targetDialogueId = target.dialogueId;
    if (!targetDialogueId && targetScene.dialogues?.length > 0) {
      const flaggedDlg = targetScene.dialogues.find(
        (d) =>
          this.isDialogueFlagged(d, this.valTarget, this.selectedAnalysisDimension) ||
          this.isDialogueFlagged(d, 'human_german', this.selectedAnalysisDimension) ||
          this.isDialogueFlagged(d, 'ai_german', this.selectedAnalysisDimension) ||
          this.isDialogueFlagged(d, 'context_ai_german', this.selectedAnalysisDimension)
      );
      if (flaggedDlg) {
        targetDialogueId = flaggedDlg.dialogue_id;
      } else {
        targetDialogueId = targetScene.dialogues[0].dialogue_id;
      }
    }

    if (targetDialogueId) {
      this.autoExpandDialogueId = targetDialogueId;
      this.activeInspectedDialogueId = targetDialogueId;
    }

    // Wait for view rendering
    this.cdr.detectChanges();
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

    // Scroll requested content into view
    const readingEl = document.querySelector('.v15-detail-wrap');
    if (readingEl) {
      readingEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  trackBySceneId(index: number, sc: AnalysisScene): string {
    return sc.scene_id || index.toString();
  }

  getSceneAnalyzedCount(scene: AnalysisScene): number {
    if (scene.analyzed_count !== undefined) return scene.analyzed_count;
    if (!scene.dialogues) return 0;
    return scene.dialogues.filter((d) => this.isDialogueAnalyzed(d)).length;
  }

  getActHotCount(actNum: number): number {
    const ranked = this.getRankedStudyScenes().slice(0, 5);
    return ranked.filter((s) => s.act === actNum && this.isSceneAnalyzed(s)).length;
  }

  getStudySortHint(): string {
    switch (this.studySortMode) {
      case 'spread':
        return 'Scenes where Human, AI and Context AI scores are furthest apart.';
      case 'flags':
        return 'Scenes with the most phrases flagged for expert review.';
      case 'ctx':
        return 'Scenes where adding dramatic context changed the AI translation most.';
      case 'low':
        return 'Scenes where at least one translation preserves the least.';
      default:
        return 'Review Workload: Priority based on flagged review dialogues (w=3), score spread (w=0.5), and lowest dimension score.';
    }
  }

  getSceneSemanticScore(scene: AnalysisScene, verKey: string): number | null {
    return this.getSceneDimensionScore(scene, 'semantic', verKey);
  }

  getSceneDimensionScore(scene: AnalysisScene, dimKey: string, verKey: string): number | null {
    if (!this.isSceneAnalyzed(scene)) return null;

    const scores = scene.scores;
    if (scores && scores[verKey] && scores[verKey]![dimKey]?.score !== undefined && scores[verKey]![dimKey].score !== null) {
      return scores[verKey]![dimKey].score;
    }

    if (scene.dialogues && scene.dialogues.length > 0) {
      const summary = this.aggregationService.calculateSceneDimensionScore(scene.dialogues, verKey, dimKey);
      if (summary.score !== null) return summary.score;
    }

    return null;
  }

  getSceneDimensionUnits(scene: AnalysisScene, dimKey: string): number {
    if (!this.isSceneAnalyzed(scene)) return 0;

    if (scene.scores?.['human_german']?.[dimKey]?.units !== undefined) {
      return scene.scores['human_german'][dimKey].units;
    }

    if (scene.dialogues && scene.dialogues.length > 0) {
      return this.aggregationService.calculateSceneDimensionScore(scene.dialogues, 'human_german', dimKey).units;
    }
    return 0;
  }

  getSceneSpread(scene: AnalysisScene): number {
    if (!this.isSceneAnalyzed(scene)) return 0;

    const scores = this.v15Versions.map((v) => this.getSceneSemanticScore(scene, v.key))
      .filter((s): s is number => s !== null && !isNaN(s));
    if (scores.length < 2) return 0;
    return Math.round((Math.max(...scores) - Math.min(...scores)) * 10) / 10;
  }

  getSceneReviewCount(scene: AnalysisScene): number {
    if (!this.isSceneAnalyzed(scene)) return 0;
    return this.reviewCountingService.getSceneFlaggedDialogueCount(scene.scene_id);
  }

  getRankedStudyScenes(): AnalysisScene[] {
    const all = this.getAllAnalysisScenes();
    if (all.length === 0) return [];

    return all.slice().sort((a, b) => {
      const analyzedA = this.isSceneAnalyzed(a);
      const analyzedB = this.isSceneAnalyzed(b);
      if (analyzedA && !analyzedB) return -1;
      if (!analyzedA && analyzedB) return 1;
      if (!analyzedA && !analyzedB) return a.scene_number - b.scene_number;

      const spA = this.getSceneSpread(a);
      const spB = this.getSceneSpread(b);
      const revA = this.getSceneReviewCount(a);
      const revB = this.getSceneReviewCount(b);

      const scA = this.v15Versions.map((v) => this.getSceneSemanticScore(a, v.key)).filter((s): s is number => s !== null);
      const scB = this.v15Versions.map((v) => this.getSceneSemanticScore(b, v.key)).filter((s): s is number => s !== null);
      const minA = scA.length ? Math.min(...scA) : 100;
      const minB = scB.length ? Math.min(...scB) : 100;

      if (this.studySortMode === 'spread') return spB - spA;
      if (this.studySortMode === 'flags') return revB - revA;
      if (this.studySortMode === 'low') return minA - minB;
      if (this.studySortMode === 'ctx') {
        const cA = this.getSceneSemanticScore(a, 'context_ai_german') ?? 0;
        const aiA = this.getSceneSemanticScore(a, 'ai_german') ?? 0;
        const cB = this.getSceneSemanticScore(b, 'context_ai_german') ?? 0;
        const aiB = this.getSceneSemanticScore(b, 'ai_german') ?? 0;
        return Math.abs(cB - aiB) - Math.abs(cA - aiA);
      }
      // Review Workload Formula: 3.0 * flagged dialogues + 0.5 * spread + 0.5 * (100 - minScore)
      return (revB * 3.0 + spB * 0.5 + (100 - minB) * 0.5) - (revA * 3.0 + spA * 0.5 + (100 - minA) * 0.5);
    });
  }

  getStudyReason(scene: AnalysisScene): string {
    const sp = this.getSceneSpread(scene);
    const rev = this.getSceneReviewCount(scene);
    const scores = this.v15Versions.map((v) => ({ name: v.short, val: this.getSceneSemanticScore(scene, v.key) }))
      .filter((s): s is { name: string; val: number } => s.val !== null);
    const lowest = scores.length ? scores.reduce((prev, curr) => curr.val < prev.val ? curr : prev) : null;

    if (this.studySortMode === 'spread') return `Scores ${sp} points apart`;
    if (this.studySortMode === 'flags') return `${rev} phrases flagged for review`;
    if (this.studySortMode === 'low') return `Lowest: ${lowest ? lowest.name + ' at ' + lowest.val : 'N/A'}`;
    return `${sp}-point spread, ${rev} to review, ${lowest ? lowest.name : ''} lowest`;
  }

  getStudyRank(scene: AnalysisScene): number | null {
    const ranked = this.getRankedStudyScenes();
    const idx = ranked.findIndex((s) => s.scene_id === scene.scene_id);
    return idx >= 0 && idx < 5 ? idx + 1 : null;
  }

  // --- Exact Phrase-Level Parallel Rows for Read the Scene ---
  getParallelPhraseRows(): any[] {
    if (!this.selectedAnalysisScene) return [];

    const dim = this.selectedAnalysisDimension;
    return this.selectedAnalysisScene.dialogues.map((d) => {
      const isAnalyzed = this.isDialogueAnalyzed(d);
      const hStatus = isAnalyzed ? this.getDialogueStatus(d, 'human_german', dim) : 'Not analyzed';
      const aStatus = isAnalyzed ? this.getDialogueStatus(d, 'ai_german', dim) : 'Not analyzed';
      const cStatus = isAnalyzed ? this.getDialogueStatus(d, 'context_ai_german', dim) : 'Not analyzed';
      const isDiff = isAnalyzed && (() => {
        const lower = hStatus.toLowerCase();
        return lower.includes('chang') || lower.includes('lost') || lower.includes('add');
      })();
      // Canonical review flag: dialogue has at least one active flagged assessment in this scene
      const needsReview = isAnalyzed && this.reviewCountingService.isDialogueFlagged(d.dialogue_id);
      // Dimension-specific review flag for active dimension
      const dimNeedsReview = isAnalyzed && this.reviewCountingService.isDialogueFlagged(d.dialogue_id, dim);

      const hFlagged = isAnalyzed && this.isDialogueFlagged(d, 'human_german', dim);
      const aFlagged = isAnalyzed && this.isDialogueFlagged(d, 'ai_german', dim);
      const cFlagged = isAnalyzed && this.isDialogueFlagged(d, 'context_ai_german', dim);
      const hasInvalidEvidence = isAnalyzed && this.hasInvalidSpans(d, dim);

      return {
        id: d.dialogue_id,
        dialogue_id: d.dialogue_id,
        speaker: d.speaker,
        dialogue: d,
        tag: !isAnalyzed ? 'Not Analyzed' : '',
        english: d.texts.english,
        human_german: d.texts.human_german || '',
        ai_german: d.texts.ai_german || '',
        context_ai_german: d.texts.context_ai_german || '',
        canOpen: isAnalyzed,
        isAnalyzed,
        humanStatus: hStatus,
        aiStatus: aStatus,
        contextAiStatus: cStatus,
        humanNeedsReview: hFlagged,
        aiNeedsReview: aFlagged,
        contextAiNeedsReview: cFlagged,
        humanLiteral: false,
        aiLiteral: false,
        contextAiLiteral: false,
        needsReview,
        dimNeedsReview,
        isDiff,
        hasInvalidEvidence,
        invalidEvidenceWarning: hasInvalidEvidence ? 'Evidence offset could not be validated against text; highlight suppressed.' : '',
        sourceSpans: isAnalyzed ? this.getHumanSourceSpansForDialogue(d, dim) : [],
        humanSpans: isAnalyzed ? this.getTargetSpansForDialogue(d, 'human_german', dim) : [],
        aiSpans: isAnalyzed ? this.getTargetSpansForDialogue(d, 'ai_german', dim) : [],
        contextAiSpans: isAnalyzed ? this.getTargetSpansForDialogue(d, 'context_ai_german', dim) : []
      };
    });
  }

  getAllPhrasesCount(): number {
    return this.getParallelPhraseRows().length;
  }

  getDifferencesCount(): number {
    return this.getParallelPhraseRows().filter((r) => r.isDiff).length;
  }

  getNeedsReviewCount(): number {
    if (!this.selectedAnalysisScene) return 0;
    return this.reviewCountingService.getSceneFlaggedDialogueCount(this.selectedAnalysisScene.scene_id);
  }

  getDimensionNeedsReviewCount(dimKey: string): number {
    if (!this.selectedAnalysisScene) return 0;
    return this.reviewCountingService.getSceneDimensionFlaggedDialogueCount(this.selectedAnalysisScene.scene_id, dimKey);
  }

  getDimensionName(dimKey: string): string {
    const found = this.v15Dimensions.find((d) => d.key === dimKey);
    return found?.short || found?.name || dimKey;
  }

  getFilteredPhraseRows(): any[] {
    let rows = this.getParallelPhraseRows();
    const dim = this.selectedAnalysisDimension;

    if (this.analysisPhraseFilter === 'diff') {
      rows = rows.filter((r) => r.isDiff || (r.dialogue?.analysis?.human_german?.[dim]?.score !== null && r.dialogue?.analysis?.human_german?.[dim]?.score < 85));
      // Rank by largest score difference / deviation from 100
      rows.sort((a, b) => {
        const scA = a.dialogue?.analysis?.human_german?.[dim]?.score ?? 100;
        const scB = b.dialogue?.analysis?.human_german?.[dim]?.score ?? 100;
        return scA - scB;
      });
    } else if (this.analysisPhraseFilter === 'review') {
      rows = rows.filter((r) => r.needsReview || r.humanNeedsReview);
    }

    if (this.analysisSearchText && this.analysisSearchText.trim()) {
      const q = this.analysisSearchText.trim().toLowerCase();
      rows = rows.filter((r) =>
        (r.dialogue_id && r.dialogue_id.toLowerCase().includes(q)) ||
        (r.speaker && r.speaker.toLowerCase().includes(q)) ||
        (r.english && r.english.toLowerCase().includes(q))
      );
    }

    return rows;
  }

  selectDimensionTab(dimKey: string): void {
    this.selectedAnalysisDimension = dimKey;
    this.activeInspectorDim = dimKey;
    this.selectionService.selectDimension(dimKey);
    this.selectedActChartDimension = dimKey;
    if (this.readerInspectedDialogueId) {
      this.updateSelectedEvidencePhrase(this.readerInspectedDialogueId);
    }
  }

  onToggleShowAnalysis(): void {
    this.showAnalysis = !this.showAnalysis;
  }

  onReaderInspectDialogue(dialogueId: string): void {
    this.readerInspectedDialogueId = dialogueId;
    this.updateSelectedEvidencePhrase(dialogueId);
    if (typeof document !== 'undefined') {
      const el = document.getElementById('dlg-en-' + dialogueId);
      if (el && typeof el.scrollIntoView === 'function') {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }

  closeReaderInspector(): void {
    this.readerInspectedDialogueId = null;
    this.selectedEvidencePhrase = null;
  }

  getReaderInspectedDialogue(): AnalysisDialogue | null {
    if (!this.readerInspectedDialogueId) return null;
    return this.selectedAnalysisScene?.dialogues?.find((d) => d.dialogue_id === this.readerInspectedDialogueId) || null;
  }

  updateSelectedEvidencePhrase(dialogueId: string): void {
    const diag = this.selectedAnalysisScene?.dialogues?.find((d) => d.dialogue_id === dialogueId);
    if (!diag) return;
    const dim = this.selectedAnalysisDimension;
    const ana = diag.analysis?.['human_german']?.[dim];
    const ev = ana?.evidence?.[0];

    this.selectedEvidencePhrase = {
      dimension: dim,
      sourceText: ev?.source_span?.text || ev?.source_quote || diag.texts.english,
      targetText: ev?.target_span?.text || ev?.target_quote || (diag.texts.human_german || ''),
      category: ev?.status || ana?.status || 'Preserved',
      score: ana?.score ?? null,
      confidence: ana?.confidence ?? null,
      explanation: ev?.explanation || ana?.explanation || 'Aligned phrase evidence from Schlegel-Tieck translation.',
      evidenceId: ev?.evidence_id || diag.dialogue_id,
      provenance: (ev as any)?.provenance || 'Schlegel-Tieck (1839/40)'
    };
  }

  openDetailedReviewModal(dialogueId?: string): void {
    if (dialogueId) {
      this.openInspector(dialogueId, 'human_german');
    } else if (this.readerInspectedDialogueId) {
      this.openInspector(this.readerInspectedDialogueId, 'human_german');
    }
    this.detailedReviewModalOpen = true;
  }

  closeDetailedReviewModal(): void {
    this.detailedReviewModalOpen = false;
  }

  onTocFilterSelected(filter: 'all' | 'diff' | 'review'): void {
    this.analysisPhraseFilter = filter;
  }

  getInspectedDialogueDimScore(diag: AnalysisDialogue | null, dimKey: string): number | null {
    if (!diag) return null;
    const review = diag.expert_review?.dimension_reviews?.['human_german']?.[dimKey];
    if (review && review.score_override !== null && review.score_override !== undefined && !isNaN(review.score_override)) {
      return Number(review.score_override);
    }
    const ana = diag.analysis?.['human_german']?.[dimKey];
    return (ana && ana.applicable && ana.score !== null && ana.score !== undefined) ? Number(ana.score) : null;
  }

  getInspectedDialogueStatus(diag: AnalysisDialogue | null, dimKey: string): string {
    if (!diag) return 'Not computed';
    return this.getDialogueStatus(diag, 'human_german', dimKey);
  }

  getInspectedDialogueConfidence(diag: AnalysisDialogue | null, dimKey: string): number | null {
    if (!diag) return null;
    const ana = diag.analysis?.['human_german']?.[dimKey];
    return ana?.confidence ?? null;
  }

  getInspectedDialogueExplanation(diag: AnalysisDialogue | null, dimKey: string): string {
    if (!diag) return '';
    const ana = diag.analysis?.['human_german']?.[dimKey];
    return ana?.explanation || '';
  }

  getInspectedDialogueEvidence(diag: AnalysisDialogue | null, dimKey: string): any | null {
    if (!diag) return null;
    const ana = diag.analysis?.['human_german']?.[dimKey];
    return ana?.evidence?.[0] || null;
  }

  getSceneDimensionScoreDisplay(scene: AnalysisScene | null, dimKey: string): string {
    if (!scene) return '—';
    const sc = this.getSceneDimensionScore(scene, dimKey, 'human_german');
    return sc !== null ? sc.toFixed(1) : '—';
  }

  trackByDialogueRow(index: number, item: any): string {
    return item.dialogue_id || item.id || index.toString();
  }

  formatHumanScore(val: number | null | undefined): string {
    return formatHumanScore(val);
  }

  getInspectorScoreValue(inspectedDlg: AnalysisDialogue | null): number | null {
    if (this.selectedEvidencePhrase && this.selectedEvidencePhrase.score !== null && this.selectedEvidencePhrase.score !== undefined) {
      return this.selectedEvidencePhrase.score;
    }
    if (!inspectedDlg) return null;
    return this.getInspectedDialogueDimScore(inspectedDlg, this.selectedAnalysisDimension);
  }

  getInspectorScoreDisplay(inspectedDlg: AnalysisDialogue | null): string {
    const val = this.getInspectorScoreValue(inspectedDlg);
    return val !== null && val !== undefined ? val.toString() : 'N/A';
  }

  getInspectorScoreColor(inspectedDlg: AnalysisDialogue | null): string {
    const val = this.getInspectorScoreValue(inspectedDlg);
    return this.getHumanScoreColor(val);
  }

  getInspectorConfidenceDisplay(inspectedDlg: AnalysisDialogue | null): string {
    if (this.selectedEvidencePhrase && this.selectedEvidencePhrase.confidence !== null && this.selectedEvidencePhrase.confidence !== undefined) {
      return `${Math.round(this.selectedEvidencePhrase.confidence * 100)}%`;
    }
    if (!inspectedDlg) return 'N/A';
    const conf = this.getInspectedDialogueConfidence(inspectedDlg, this.selectedAnalysisDimension);
    return conf !== null ? `${Math.round(conf * 100)}%` : 'N/A';
  }

  getHumanSourceSpansForDialogue(diag: AnalysisDialogue, dimKey: string): any[] {
    const spans: any[] = [];
    const verObj = diag.analysis?.['human_german'];
    const ana = verObj?.[dimKey];
    if (ana && ana.evidence) {
      ana.evidence.forEach((ev, evIdx) => {
        if (ev.span_validation && ev.span_validation.valid === false) {
          return;
        }
        if (ev.source_span && ev.source_span.start !== null && ev.source_span.end !== null) {
          spans.push({
            start: ev.source_span.start,
            end: ev.source_span.end,
            status: ev.status,
            isSource: true,
            evidence: ev,
            needs_review: ana.needs_review || ev.verified === false,
            linkId: `${diag.dialogue_id}_${evIdx}`
          });
        }
      });
    }
    return spans;
  }

  // --- Exact Word-Level Highlighting Adapters ---
  getSourceSpansForDialogue(diag: AnalysisDialogue, dimKey: string): any[] {
    const spans: any[] = [];
    this.v15Versions.forEach((v) => {
      const verObj = diag.analysis?.[v.key];
      const ana = verObj?.[dimKey];
      if (ana && ana.evidence) {
        ana.evidence.forEach((ev, evIdx) => {
          // Rule: Never highlight an invalid offset
          if (ev.span_validation && ev.span_validation.valid === false) {
            return;
          }
          if (ev.source_span && ev.source_span.start !== null && ev.source_span.end !== null) {
            spans.push({
              start: ev.source_span.start,
              end: ev.source_span.end,
              status: ev.status,
              isSource: true,
              evidence: ev,
              needs_review: ana.needs_review || ev.verified === false,
              linkId: `${diag.dialogue_id}_${evIdx}`
            });
          }
        });
      }
    });
    return spans;
  }

  getTargetSpansForDialogue(diag: AnalysisDialogue, verKey: string, dimKey: string): any[] {
    const spans: any[] = [];
    const verObj = diag.analysis?.[verKey];
    const ana = verObj?.[dimKey];
    if (ana && ana.evidence) {
      ana.evidence.forEach((ev, evIdx) => {
        // Rule: Never highlight an invalid offset
        if (ev.span_validation && ev.span_validation.valid === false) {
          return;
        }
        if (ev.target_span && ev.target_span.start !== null && ev.target_span.end !== null) {
          spans.push({
            start: ev.target_span.start,
            end: ev.target_span.end,
            status: ev.status || ana.status,
            isSource: false,
            evidence: ev,
            needs_review: ana.needs_review || ev.verified === false,
            linkId: `${diag.dialogue_id}_${evIdx}`
          });
        }
      });
    }
    return spans;
  }

  hasInvalidSpans(diag: AnalysisDialogue, dimKey: string): boolean {
    for (const v of this.v15Versions) {
      const verObj = diag.analysis?.[v.key];
      const ana = verObj?.[dimKey];
      if (ana && ana.evidence) {
        if (ana.evidence.some((e) => e.span_validation && e.span_validation.valid === false)) {
          return true;
        }
      }
    }
    return false;
  }

  getDialogueStatus(diag: AnalysisDialogue, verKey: string, dimKey: string): string {
    const verObj = diag.analysis?.[verKey];
    const ana = verObj?.[dimKey];
    if (!ana) return 'Not computed';
    if (!ana.applicable) return 'Not Applicable';
    return ana.status || 'Preserved';
  }

  isDialogueFlagged(diag: AnalysisDialogue, verKey: string, dimKey: string): boolean {
    const verObj = diag.analysis?.[verKey];
    const ana = verObj?.[dimKey];
    const review = diag.expert_review?.dimension_reviews?.[verKey]?.[dimKey];
    const res = this.reviewCountingService.evaluateAssessment(ana, review, diag.dialogue_id, verKey, dimKey);
    return res.flagged;
  }

  // --- Inspector & Expert Review ---
  openInspector(diagId: string, targetVersion?: string): void {
    this.activeInspectedDialogueId = diagId;
    this.activeInspectorDim = this.selectedAnalysisDimension;
    this.valTarget = targetVersion || 'human_german';

    const diag = this.getInspectedDialogue();
    const deText = diag?.texts?.human_german || '';
    if (this.backTranslationService.hasCachedTranslation(diagId, deText)) {
      this.backTranslationResult = {
        dialogueId: diagId,
        sourceGerman: deText,
        translatedEnglish: this.backTranslationService.getCachedTranslation(diagId, deText)!,
        cached: true,
        status: 'success'
      };
    } else {
      this.backTranslationResult = null;
    }

    this.loadCurrentReviewForInspector();
    this.scrollWorkspaceToTop();
  }

  closeInspector(): void {
    this.switchToSceneView();
  }

  getInspectedDialogue(): AnalysisDialogue | null {
    if (!this.activeInspectedDialogueId) return null;
    if (this.selectedAnalysisScene) {
      const found = this.selectedAnalysisScene.dialogues?.find((d) => d.dialogue_id === this.activeInspectedDialogueId);
      if (found) return found;
    }
    for (const act of this.analysisActs) {
      for (const sc of act.scenes || []) {
        const found = sc.dialogues?.find((d) => d.dialogue_id === this.activeInspectedDialogueId);
        if (found) {
          if (!this.selectedAnalysisScene) {
            this.selectedAnalysisScene = sc;
            this.selectedAnalysisAct = sc.act;
          }
          return found;
        }
      }
    }
    return null;
  }


  loadCurrentReviewForInspector(): void {
    const diag = this.getInspectedDialogue();
    if (!diag) return;
    const rev = this.expertReviewService.getReview(diag, this.valTarget, this.activeInspectorDim);
    this.valDecision = (rev.decision as any) || null;
    this.valScoreOverride = rev.score_override !== null && rev.score_override !== undefined ? rev.score_override : null;
    this.valComment = rev.comment || '';
    this.valReviewer = rev.reviewer || this.valReviewer || 'Shakespeare Scholar';
    this.valReviewedAt = rev.reviewed_at || null;
  }

  onInspectorVersionChange(verKey: string): void {
    this.valTarget = verKey;
    this.loadCurrentReviewForInspector();
    this.closeEvidencePopover();
  }

  onInspectorDimensionChange(dimKey: string): void {
    this.activeInspectorDim = dimKey;
    this.selectedAnalysisDimension = dimKey;
    this.loadCurrentReviewForInspector();
    this.closeEvidencePopover();
  }

  getActiveEvidenceItems(): any[] {
    const diag = this.getInspectedDialogue();
    if (!diag) return [];
    const verObj = diag.analysis?.[this.valTarget];
    const ana = verObj?.[this.activeInspectorDim];
    return ana?.evidence || [];
  }

  hasInvalidEvidenceInActiveInspector(): boolean {
    return this.getActiveEvidenceItems().some((e) => e.span_validation && e.span_validation.valid === false);
  }

  hasRepairedEvidenceInActiveInspector(): boolean {
    return this.getActiveEvidenceItems().some((e) => e.span_validation && e.span_validation.repaired === true);
  }

  onLinkClick(linkId: string): void {
    this.activeLinkedSpanId = this.activeLinkedSpanId === linkId ? null : linkId;
  }

  onSegmentHover(data: { segment: any; event: MouseEvent }, verKey: string, dialogueContext?: any): void {
    if (this.activePopover?.mode === 'pinned') {
      return;
    }
    clearTimeout(this.popoverCloseTimer);
    this.openEvidencePopover(data, verKey, dialogueContext, 'hover');
  }

  onSegmentLeave(): void {
    if (this.activePopover && this.activePopover.mode !== 'pinned') {
      clearTimeout(this.popoverCloseTimer);
      this.popoverCloseTimer = setTimeout(() => {
        if (!this.isMouseOverPopover && this.activePopover && this.activePopover.mode !== 'pinned') {
          this.activePopover = null;
          this.tooltipVisible = false;
        }
      }, 150);
    }
  }

  onPopoverMouseEnter(): void {
    this.isMouseOverPopover = true;
    clearTimeout(this.popoverCloseTimer);
  }

  onPopoverMouseLeave(): void {
    this.isMouseOverPopover = false;
    if (this.activePopover && this.activePopover.mode !== 'pinned') {
      clearTimeout(this.popoverCloseTimer);
      this.popoverCloseTimer = setTimeout(() => {
        if (!this.isMouseOverPopover && this.activePopover && this.activePopover.mode !== 'pinned') {
          this.activePopover = null;
          this.tooltipVisible = false;
        }
      }, 150);
    }
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.detailedReviewModalOpen) {
      this.detailedReviewModalOpen = false;
    } else if (this.readerInspectedDialogueId) {
      this.closeReaderInspector();
    } else if (this.activeInspectedDialogueId) {
      this.closeInspector();
    } else if (this.activePopover) {
      this.closeEvidencePopover();
    } else if (this.pdfPanelOpen) {
      this.closePdfPanel();
    }
  }

  onSegmentClick(data: { segment: any; event: MouseEvent }, verKey: string, dialogueContext?: any): void {
    if (data.event) {
      data.event.stopPropagation();
    }
    clearTimeout(this.popoverCloseTimer);

    let diagId = dialogueContext?.dialogue_id || dialogueContext?.id;
    if (!diagId && dialogueContext?.texts) {
      diagId = dialogueContext.dialogue_id;
    }

    if (diagId) {
      this.readerInspectedDialogueId = diagId;
    }

    const seg = data.segment;
    const ev = seg?.evidence;
    const diag = this.getReaderInspectedDialogue();
    const ana = diag?.analysis?.['human_german']?.[this.selectedAnalysisDimension];

    this.selectedEvidencePhrase = {
      dimension: this.selectedAnalysisDimension,
      sourceText: ev?.source_span?.text || ev?.source_quote || (verKey === 'english' ? seg.text : diag?.texts?.english || ''),
      targetText: ev?.target_span?.text || ev?.target_quote || (verKey !== 'english' ? seg.text : diag?.texts?.human_german || ''),
      category: seg.status || ev?.status || ana?.status || 'Preserved',
      score: ev?.score !== undefined ? ev.score : (ana?.score ?? null),
      confidence: ev?.confidence !== undefined ? ev.confidence : (ana?.confidence ?? null),
      explanation: ev?.explanation || ana?.explanation || 'Aligned phrase evidence from Schlegel-Tieck translation.',
      evidenceId: ev?.evidence_id || `${diagId || 'EV'}-PHRASE`,
      provenance: (ev as any)?.provenance || 'Schlegel-Tieck (1839/40)'
    };

    this.openEvidencePopover(data, verKey, dialogueContext, 'pinned');
  }

  closeEvidencePopover(): void {
    clearTimeout(this.popoverCloseTimer);
    this.activePopover = null;
    this.isMouseOverPopover = false;
    this.tooltipVisible = false;
  }

  openEvidencePopover(
    data: { segment: any; event: MouseEvent },
    verKey: string,
    dialogueContext: any,
    mode: 'hover' | 'pinned'
  ): void {
    const seg = data.segment;
    const ev = seg.evidence;
    const dimDef = this.v15Dimensions.find((d) => d.key === this.selectedAnalysisDimension);
    const verDef = this.v15Versions.find((v) => v.key === verKey);

    let dialogue: AnalysisDialogue | undefined;
    if (dialogueContext) {
      if (dialogueContext.texts) {
        dialogue = dialogueContext as AnalysisDialogue;
      } else if (dialogueContext.dialogue) {
        dialogue = dialogueContext.dialogue;
      } else if (dialogueContext.dialogue_id && this.selectedAnalysisScene) {
        dialogue = this.selectedAnalysisScene.dialogues.find(
          (d) => d.dialogue_id === dialogueContext.dialogue_id
        );
      }
    }
    if (!dialogue && this.selectedAnalysisScene) {
      dialogue = this.getInspectedDialogue() || this.selectedAnalysisScene.dialogues[0];
    }

    const dialogueId = dialogue?.dialogue_id || dialogueContext?.id || dialogueContext?.dialogue_id || '';
    const speaker = dialogue?.speaker || dialogueContext?.speaker || 'Speaker';
    const dimKey = this.selectedAnalysisDimension;
    const dimName = dimDef?.name || dimKey;
    const translationName = verKey === 'english' ? 'English Source' : (verDef?.name || verKey);
    const status = seg.status || ev?.status || 'Preserved';
    const score = ev?.score !== undefined ? ev.score : (dialogue?.analysis?.[verKey]?.[dimKey]?.score ?? null);
    const confidence = ev?.confidence !== undefined ? ev.confidence : (dialogue?.analysis?.[verKey]?.[dimKey]?.confidence ?? null);
    const sourceQuote = ev?.source_quote || seg.text || '';
    const targetQuote = ev?.target_quote || (verKey !== 'english' ? seg.text : '');
    const explanation = ev?.explanation || dialogue?.analysis?.[verKey]?.[dimKey]?.explanation || 'No phrase-level explanation recorded.';

    const targetEl = data.event.target as HTMLElement;
    const rect = targetEl.getBoundingClientRect();
    const popoverWidth = 360;
    const popoverHeight = 280;

    const left = Math.min(window.innerWidth - popoverWidth - 16, Math.max(16, rect.left));
    let top: number;
    let arrowPos: 'top' | 'bottom';

    if (rect.bottom + popoverHeight + 16 <= window.innerHeight) {
      top = rect.bottom + 8;
      arrowPos = 'top';
    } else if (rect.top - popoverHeight - 8 >= 0) {
      top = rect.top - popoverHeight - 8;
      arrowPos = 'bottom';
    } else {
      top = Math.max(12, window.innerHeight - popoverHeight - 12);
      arrowPos = 'top';
    }

    this.activePopover = {
      evidenceId: seg.linkId || ev?.evidence_id,
      dialogueId,
      speaker,
      translationKey: verKey,
      translationName,
      dimensionKey: dimKey,
      dimensionName: dimName,
      status,
      score,
      confidence,
      sourceQuote,
      targetQuote,
      explanation,
      englishDialogue: dialogue?.texts?.english || '',
      targetDialogue: dialogue?.texts?.[verKey] || '',
      mode,
      left,
      top,
      arrowPos,
      docNotice: null
    };

    // Keep backward compatibility values synced
    this.tooltipDimension = dimName;
    this.tooltipVersion = translationName;
    this.tooltipStatus = status;
    this.tooltipScore = score !== null ? `Score: ${score}` : '';
    this.tooltipConfidence = confidence !== null ? `Conf: ${confidence}` : '';
    this.tooltipQuotes = sourceQuote || targetQuote ? `<strong>Quote:</strong> “${sourceQuote}” → “${targetQuote}”` : '';
    this.tooltipExplanation = explanation;
    this.tooltipPos = { left, top };
    this.tooltipVisible = true;
  }

  viewInOriginalDocument(popover: ActiveEvidencePopover): void {
    if (!this.englishPdfPath) {
      popover.docNotice = 'Original document reference unavailable.';
      return;
    }
    const searchText = popover.sourceQuote || popover.englishDialogue || '';
    this.openPdfBook('english', searchText);
  }

  viewTranslationSource(popover: ActiveEvidencePopover): void {
    if (!this.germanPdfPath) {
      popover.docNotice = 'Translation document reference unavailable.';
      return;
    }
    const searchText = popover.targetQuote || popover.targetDialogue || '';
    this.openPdfBook('german', searchText);
  }

  inspectFromPopover(popover: ActiveEvidencePopover): void {
    if (popover.dimensionKey) {
      this.selectedAnalysisDimension = popover.dimensionKey;
      this.activeInspectorDim = popover.dimensionKey;
    }
    if (popover.translationKey && popover.translationKey !== 'english') {
      this.valTarget = popover.translationKey;
    }
    if (popover.dialogueId) {
      this.openInspector(popover.dialogueId);
    }
    this.closeEvidencePopover();
  }

  @HostListener('document:keydown.escape')
  onDocumentEscape(): void {
    if (this.activePopover) {
      this.closeEvidencePopover();
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.activePopover) return;
    const target = event.target as HTMLElement;
    if (target.closest && (target.closest('.v15-evidence-popover') || target.closest('.highlight-segment'))) {
      return;
    }
    this.closeEvidencePopover();
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    if (this.activePopover && this.activePopover.mode !== 'pinned') {
      this.closeEvidencePopover();
    }
  }

  getActiveInspectorScoreDisplay(): string {
    const diag = this.getInspectedDialogue();
    if (!diag) return '—';
    const texts = diag.texts || {};
    if (this.valTarget !== 'english' && !texts[this.valTarget as keyof typeof texts]) {
      return 'Translation unavailable';
    }
    const ana = diag.analysis?.[this.valTarget]?.[this.activeInspectorDim];
    if (!ana) {
      return 'Not yet evaluated';
    }
    if (ana.applicable === false) {
      return 'Not applicable';
    }
    if (ana.score === null || ana.score === undefined) {
      return 'Not yet evaluated';
    }
    return String(ana.score);
  }

  getActiveInspectorExplanation(): string {
    const diag = this.getInspectedDialogue();
    if (!diag) return 'No dialogue selected.';
    const texts = diag.texts || {};
    if (this.valTarget !== 'english' && !texts[this.valTarget as keyof typeof texts]) {
      return 'Translation unavailable for this version.';
    }
    const ana = diag.analysis?.[this.valTarget]?.[this.activeInspectorDim];
    if (ana?.applicable === false) {
      return 'Not applicable to this dialogue.';
    }
    if (ana?.explanation && ana.explanation.trim()) {
      return ana.explanation;
    }
    return 'No phrase-level evidence available.';
  }

  ngOnDestroy(): void {
    this.closeEvidencePopover();
  }

  setVerdict(decision: 'Accept' | 'Reject' | 'Needs Revision'): void {
    this.valDecision = decision;
  }

  saveDraftReview(): void {
    this.saveValidation();
  }

  saveValidation(): void {
    const diag = this.getInspectedDialogue();
    if (!diag) return;

    this.expertReviewService.saveReview(diag, this.valTarget, this.activeInspectorDim, {
      decision: this.valDecision,
      score_override: this.valScoreOverride !== null && this.valScoreOverride !== undefined ? Number(this.valScoreOverride) : null,
      comment: this.valComment,
      reviewer: this.valReviewer,
      reviewed_at: new Date().toISOString()
    });
    this.reviewCountingService.buildIndex(this.analysisActs);

    this.expertValidations[diag.dialogue_id] = {
      target: this.valTarget,
      verdict: this.valDecision || 'Reviewed',
      classification: this.valClassification,
      comment: this.valComment,
      reviewer: this.valReviewer,
      timestamp: new Date().toISOString()
    };
    try {
      localStorage.setItem('hamlet_v15_validations', JSON.stringify(this.expertValidations));
    } catch (e) {}

    this.valSaveMessage = `Saved review decision for ${diag.dialogue_id} (localStorage draft).`;
    setTimeout(() => { this.valSaveMessage = ''; }, 3500);
  }

  resetDraft(): void {
    const diag = this.getInspectedDialogue();
    if (!diag) return;
    this.expertReviewService.resetReview(diag, this.valTarget, this.activeInspectorDim);
    this.valDecision = null;
    this.valScoreOverride = null;
    this.valComment = '';
    this.valReviewedAt = null;
    this.valSaveMessage = `Reset review draft for ${diag.dialogue_id}.`;
    setTimeout(() => { this.valSaveMessage = ''; }, 3500);
  }

  nextReview(): void {
    if (!this.selectedAnalysisScene) return;
    const dlgs = this.selectedAnalysisScene.dialogues;
    if (!dlgs || dlgs.length === 0) return;

    const curIdx = dlgs.findIndex((d) => d.dialogue_id === this.activeInspectedDialogueId);
    let nextDlg = dlgs.slice(curIdx + 1).find((d) => this.isDialogueFlagged(d, this.valTarget, this.activeInspectorDim));
    if (!nextDlg) {
      nextDlg = dlgs.find((d) => this.isDialogueFlagged(d, this.valTarget, this.activeInspectorDim));
    }
    if (!nextDlg && curIdx < dlgs.length - 1) {
      nextDlg = dlgs[curIdx + 1];
    }

    if (nextDlg) {
      this.openInspector(nextDlg.dialogue_id);
    }
  }

  exportReviewsJson(): void {
    const jsonStr = this.expertReviewService.exportReviewsJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hamlet_expert_reviews_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  importReviewsJson(event: any): void {
    const file = event.target?.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e: any) => {
      const content = e.target.result;
      const success = this.expertReviewService.importReviewsJson(content);
      if (success && this.analysisActs) {
        this.analysisActs.forEach((act) => {
          act.scenes.forEach((sc) => {
            sc.dialogues.forEach((dlg) => this.expertReviewService.attachReviewsToDialogue(dlg));
          });
        });
        alert('Successfully imported expert reviews.');
        this.loadCurrentReviewForInspector();
      } else {
        alert('Failed to parse or import reviews JSON.');
      }
    };
    reader.readAsText(file);
  }

  // --- Score Traceability Drill-down Modal ---
  openScoreTrace(scene: AnalysisScene, dimKey: string, verKey: string): void {
    const dimDef = this.v15Dimensions.find((d) => d.key === dimKey);
    const verDef = this.v15Versions.find((v) => v.key === verKey);
    const summary = this.aggregationService.calculateSceneDimensionScore(scene.dialogues, verKey, dimKey);

    const dialogues = scene.dialogues.map((d) => {
      const verObj = d.analysis?.[verKey];
      const ana = verObj?.[dimKey];
      const applicable = !!(ana && ana.applicable);
      const weight = Math.max(1, codePointLength(d.texts.english));
      
      let score: number | null = null;
      let hasOverride = false;
      if (applicable && ana.score !== null && ana.score !== undefined) {
        score = Number(ana.score);
        const review = d.expert_review?.dimension_reviews?.[verKey]?.[dimKey];
        if (review && review.score_override !== null && review.score_override !== undefined && !isNaN(review.score_override)) {
          score = Number(review.score_override);
          hasOverride = true;
        }
      }

      const weightedScore = score !== null ? Math.round(score * weight * 10) / 10 : 0;
      const evidenceCount = ana?.evidence?.length || 0;

      return {
        dialogue_id: d.dialogue_id,
        speaker: d.speaker,
        english: d.texts.english,
        score,
        applicable,
        weight,
        weightedScore,
        hasOverride,
        evidenceCount,
        dialogue: d
      };
    });

    this.scoreTraceData = {
      scene,
      dimKey,
      dimName: dimDef?.name || dimKey,
      verKey,
      verName: verDef?.name || verKey,
      summary,
      dialogues
    };
    this.scoreTraceModalOpen = true;
  }

  closeScoreTrace(): void {
    this.scoreTraceModalOpen = false;
    this.scoreTraceData = null;
  }

  inspectDialogueFromTrace(item: any): void {
    const sc = this.scoreTraceData?.scene;
    const dimKey = this.scoreTraceData?.dimKey || 'semantic';
    const verKey = this.scoreTraceData?.verKey || 'ai_german';
    this.closeScoreTrace();

    if (sc) {
      this.selectAnalysisAct(sc.act);
      this.selectAnalysisScene(sc);
    }
    this.selectedAnalysisDimension = dimKey;
    this.activeInspectorDim = dimKey;
    this.valTarget = verKey;
    this.openInspector(item.dialogue_id);
  }

  // --- Review Drill-down Modal ---
  openReviewDrilldown(scene: AnalysisScene): void {
    const dialogueGroups = this.reviewCountingService.getSceneDialogueGroups(scene.scene_id);
    const sceneSummary = this.reviewCountingService.getSceneSummary(scene.scene_id);

    this.reviewDrilldownData = {
      scene,
      dialogueGroups,
      flaggedDialogues: dialogueGroups,
      flaggedDialoguesCount: sceneSummary?.flaggedDialogueCount || dialogueGroups.length,
      totalFlaggedAssessments: sceneSummary?.flaggedAssessmentCount || 0,
      evidenceIssueCount: sceneSummary?.evidenceIssueCount || 0
    };
    this.reviewDrilldownModalOpen = true;
  }

  closeReviewDrilldown(): void {
    this.reviewDrilldownModalOpen = false;
    this.reviewDrilldownData = null;
  }

  inspectDialogueFromReviewList(item: any): void {
    const sc = this.reviewDrilldownData?.scene;
    this.closeReviewDrilldown();

    if (sc) {
      this.selectAnalysisAct(sc.act);
      this.selectAnalysisScene(sc);
    }
    const issues = item.issues || item.flags || [];
    if (issues.length > 0) {
      const firstIssue = issues[0];
      const dimKey = firstIssue.dimensionKey || firstIssue.dimKey;
      const verKey = firstIssue.translationKey || firstIssue.verKey;
      this.selectedAnalysisDimension = dimKey;
      this.activeInspectorDim = dimKey;
      this.valTarget = verKey;
    }
    const dlgId = item.dialogueId || item.dialogue?.dialogue_id;
    if (dlgId) {
      this.openInspector(dlgId);
    }
  }

  // --- Dynamic Header Summary Getters ---
  getTotalDialoguesCount(): number {
    return this.reviewCountingService.getPlaySummary().totalDialogues || 1107;
  }

  getAnalyzedDialoguesCount(): number {
    return this.reviewCountingService.getPlaySummary().analyzedDialogues || 1107;
  }

  getTotalReviewDialoguesCount(): number {
    return this.reviewCountingService.getPlaySummary().flaggedDialogueCount || 0;
  }

  getTotalFlaggedAssessmentsCount(): number {
    return this.reviewCountingService.getPlaySummary().flaggedAssessmentCount || 0;
  }

  getTotalScenesCount(): number {
    return this.getAllAnalysisScenes().length || 20;
  }

  // --- Validation Queue ---
  getValidationQueueItems(): QueueItem[] {
    if (this.analysisData?.review_queue && this.analysisData.review_queue.length > 0) {
      return this.analysisData.review_queue.map((rq) => {
        const dimDef = this.v15Dimensions.find((d) => d.key === rq.dimension);
        const verDef = this.v15Versions.find((v) => v.key === rq.translation_version);
        const actObj = this.analysisActs.find((a) => a.act === rq.act);
        const sceneObj = actObj?.scenes.find((s) => s.scene_id === rq.scene_id || s.scene_number === rq.scene_number);

        let issueType = 'Needs review flag';
        let priority = 2;
        let evidenceValidity: 'Valid' | 'Invalid offset' | 'No evidence' = 'Valid';

        if (rq.reasons.includes('invalid_evidence_span')) {
          issueType = 'Invalid evidence span';
          priority = 3;
          evidenceValidity = 'Invalid offset';
        } else if (rq.reasons.includes('low_confidence_below_0.70')) {
          issueType = 'Low confidence (<0.70)';
          priority = rq.reasons.length > 1 ? 3 : 1;
        } else if (rq.reasons.includes('model_needs_review')) {
          issueType = 'Needs review flag';
          priority = rq.reasons.length > 1 ? 3 : 2;
        }

        return {
          review_id: rq.review_id,
          dialogue_id: rq.dialogue_id,
          speaker: rq.speaker,
          act: rq.act,
          scene_id: rq.scene_id,
          scene_title: sceneObj?.title || `Act ${rq.act}, Scene ${rq.scene_number}`,
          english: rq.english || '',
          versionKey: rq.translation_version,
          versionName: verDef?.name || rq.translation_version,
          dimKey: rq.dimension,
          dimName: dimDef?.name || rq.dimension,
          score: rq.score,
          confidence: rq.confidence,
          issueType,
          priority,
          explanation: '',
          reasons: rq.reasons,
          evidenceValidity
        };
      });
    }

    const items: QueueItem[] = [];
    if (!this.analysisData?.acts) return items;

    this.analysisData.acts.forEach((act) => {
      act.scenes.forEach((scene) => {
        scene.dialogues.forEach((diag) => {
          this.v15Versions.forEach((v) => {
            this.v15Dimensions.forEach((dim) => {
              const verObj = diag.analysis?.[v.key];
              const ana = verObj?.[dim.key];
              if (!ana) return;

              let isCandidate = false;
              let issueType = 'Needs review flag';
              let priority = 2;
              let evidenceValidity: 'Valid' | 'Invalid offset' | 'No evidence' = 'Valid';

              if (ana.needs_review) {
                isCandidate = true;
                issueType = 'Needs review flag';
                priority = 2;
              }
              if (ana.evidence && ana.evidence.some((e) => (e.span_validation && !e.span_validation.valid) || e.valid === false)) {
                isCandidate = true;
                issueType = 'Invalid evidence span';
                priority = 3;
                evidenceValidity = 'Invalid offset';
              }
              if (ana.confidence !== undefined && ana.confidence !== null && ana.confidence < 0.70) {
                isCandidate = true;
                issueType = 'Low confidence (<0.70)';
                priority = 1;
              }

              if (isCandidate) {
                items.push({
                  review_id: `${diag.dialogue_id}:${v.key}:${dim.key}`,
                  dialogue_id: diag.dialogue_id,
                  speaker: diag.speaker,
                  act: act.act,
                  scene_id: scene.scene_id,
                  scene_title: scene.title || `Act ${act.act}, Scene ${scene.scene_number}`,
                  english: diag.texts.english,
                  versionKey: v.key,
                  versionName: v.name,
                  dimKey: dim.key,
                  dimName: dim.name,
                  score: ana.score,
                  confidence: ana.confidence,
                  issueType,
                  priority,
                  explanation: ana.explanation,
                  evidenceValidity
                });
              }
            });
          });
        });
      });
    });
    return items;
  }

  getOpenQueueCount(): number {
    return this.getValidationQueueItems().filter((item) => !this.expertValidations[item.dialogue_id]).length;
  }

  onQueueItemReview(item: QueueItem): void {
    const act = this.analysisActs.find((a) => a.act === item.act);
    if (act) {
      this.selectedAnalysisAct = act.act;
      const sc = act.scenes.find((s) => s.scene_id === item.scene_id || s.scene_number === (item as any).scene_number);
      if (sc) {
        this.selectedAnalysisScene = sc;
      }
    }
    this.selectedAnalysisDimension = item.dimKey;
    this.activeInspectorDim = item.dimKey;
    this.valTarget = item.versionKey;
    this.activeTab = 'passage';
    this.openInspector(item.dialogue_id, item.versionKey);
  }

  // --- Exportable Research Data (Section 12) ---
  exportFlaggedDialoguesCsv(): void {
    const items = this.getValidationQueueItems();
    const uniqueMap = new Map<string, any>();
    items.forEach((it) => {
      if (!uniqueMap.has(it.dialogue_id)) {
        uniqueMap.set(it.dialogue_id, {
          dialogue_id: it.dialogue_id,
          act: it.act,
          scene: it.scene_title,
          speaker: it.speaker,
          english: (it.english || '').replace(/"/g, '""'),
          issues: [it.issueType]
        });
      } else {
        const existing = uniqueMap.get(it.dialogue_id);
        if (!existing.issues.includes(it.issueType)) {
          existing.issues.push(it.issueType);
        }
      }
    });

    const rows = ['"Dialogue ID","Act","Scene","Speaker","English Text","Flagged Issues"'];
    uniqueMap.forEach((val) => {
      rows.push(`"${val.dialogue_id}","${val.act}","${val.scene}","${val.speaker}","${val.english}","${val.issues.join('; ')}"`);
    });

    this.downloadFile(rows.join('\n'), 'hamlet_flagged_dialogues.csv', 'text/csv');
  }

  exportFlaggedAssessmentsCsv(): void {
    const items = this.getValidationQueueItems();
    const rows = ['"Review ID","Dialogue ID","Act","Scene","Speaker","Translation","Dimension","Score","Confidence","Issue Type","Evidence Validity"'];
    items.forEach((it) => {
      rows.push(`"${it.review_id || it.dialogue_id + ':' + it.versionKey + ':' + it.dimKey}","${it.dialogue_id}","${it.act}","${it.scene_title}","${it.speaker}","${it.versionName}","${it.dimName}","${it.score !== null ? it.score : ''}","${it.confidence !== null ? it.confidence : ''}","${it.issueType}","${it.evidenceValidity || ''}"`);
    });

    this.downloadFile(rows.join('\n'), 'hamlet_flagged_assessments.csv', 'text/csv');
  }

  exportSceneSummariesCsv(): void {
    const scenes = this.getAllAnalysisScenes();
    const headers = ['"Scene ID","Act","Scene Number","Title","Analyzed Status","Analyzed Dialogues","Total Dialogues","Review Dialogues"'];
    this.v15Dimensions.forEach((d) => {
      this.v15Versions.forEach((v) => {
        headers.push(`"${d.short} (${v.short})"`);
      });
    });

    const rows = [headers.join(',')];
    scenes.forEach((sc) => {
      const isAna = this.isSceneAnalyzed(sc);
      const row = [
        `"${sc.scene_id}"`,
        `"${sc.act}"`,
        `"${sc.scene_number}"`,
        `"${sc.title.replace(/"/g, '""')}"`,
        `"${isAna ? 'Analyzed' : 'Not analyzed'}"`,
        `"${sc.analyzed_count ?? (isAna ? sc.dialogues.length : 0)}"`,
        `"${sc.total_dialogues ?? sc.dialogues.length}"`,
        `"${this.getSceneReviewCount(sc)}"`
      ];
      this.v15Dimensions.forEach((d) => {
        this.v15Versions.forEach((v) => {
          const s = this.getSceneDimensionScore(sc, d.key, v.key);
          row.push(`"${s !== null ? s : 'N/A'}"`);
        });
      });
      rows.push(row.join(','));
    });

    this.downloadFile(rows.join('\n'), 'hamlet_scene_summaries.csv', 'text/csv');
  }

  exportValidationReport(): void {
    this.dataService.loadSpanValidationReport().subscribe((rep) => {
      const jsonStr = JSON.stringify(rep || this.analysisData?.metadata?.span_validation_summary || {}, null, 2);
      this.downloadFile(jsonStr, 'hamlet_evidence_validation_report.json', 'application/json');
    });
  }

  private downloadFile(content: string, fileName: string, contentType: string): void {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  }

  // --- SVG Mini Range Bar Generator ---
  getCmpData(h: number | null, a: number | null, c: number | null, minVal = 80, maxVal = 100, width = 150): {
    w: number;
    vb: string;
    tick: number;
    minX: number;
    maxX: number;
    hX: number;
    aX: number;
    cPts: string;
    hasH: boolean;
    hasA: boolean;
    hasC: boolean;
    label: string;
  } {
    const clamp = (v: number) => Math.max(minVal, Math.min(maxVal, v));
    const px = (v: number) => Math.round(Math.max(0, Math.min(width, (clamp(v) - minVal) / (maxVal - minVal) * width)) * 10) / 10;
    
    const valid = [h, a, c].filter((v): v is number => v !== null && !isNaN(v));
    const tick = width / 2;
    if (valid.length === 0) {
      return {
        w: width,
        vb: `0 0 ${width} 26`,
        tick,
        minX: 0,
        maxX: 0,
        hX: -99,
        aX: -99,
        cPts: '',
        hasH: false,
        hasA: false,
        hasC: false,
        label: 'No data'
      };
    }

    const minS = Math.min(...valid);
    const maxS = Math.max(...valid);
    const minX = px(minS);
    const maxX = px(maxS);
    const hasH = h !== null && !isNaN(h);
    const hasA = a !== null && !isNaN(a);
    const hasC = c !== null && !isNaN(c);
    const hX = hasH ? px(h!) : -99;
    const aX = hasA ? px(a!) - 3.25 : -99;
    const cX = hasC ? px(c!) : -99;
    const cY = 21;
    const cPts = `${cX},${cY - 3.75} ${cX + 3.75},${cY} ${cX},${cY + 3.75} ${cX - 3.75},${cY}`;
    const spread = Math.round((maxS - minS) * 10) / 10;

    return {
      w: width,
      vb: `0 0 ${width} 26`,
      tick,
      minX,
      maxX,
      hX,
      aX,
      cPts,
      hasH,
      hasA,
      hasC,
      label: `Human: ${h ?? 'N/A'}, AI: ${a ?? 'N/A'}, Context AI: ${c ?? 'N/A'} (Spread: ${spread})`
    };
  }

  getComparisonSvg(h: number | null, a: number | null, c: number | null, minVal = 80, maxVal = 100, width = 150): SafeHtml {
    const d = this.getCmpData(h, a, c, minVal, maxVal, width);
    const raw = `<svg width="${d.w}" height="26" viewBox="${d.vb}" role="img" aria-label="${d.label}" style="display:block; overflow:visible">
      <line x1="0" y1="13" x2="${d.w}" y2="13" stroke="#D8DCE3" stroke-width="1"></line>
      <line x1="${d.tick}" y1="9" x2="${d.tick}" y2="17" stroke="#C3C8D1" stroke-width="1"></line>
      <line x1="${d.minX}" y1="13" x2="${d.maxX}" y2="13" stroke="#9AA6BA" stroke-width="3" stroke-linecap="round"></line>
      ${d.hasH ? `<circle cx="${d.hX}" cy="5" r="3.5" fill="#B8500A" stroke="#FBFBFC" stroke-width="1"></circle>` : ''}
      ${d.hasA ? `<rect x="${d.aX}" y="9.75" width="6.5" height="6.5" fill="#384152" stroke="#FBFBFC" stroke-width="1"></rect>` : ''}
      ${d.hasC ? `<polygon points="${d.cPts}" fill="#2563eb" stroke="#FBFBFC" stroke-width="1"></polygon>` : ''}
    </svg>`;
    return this.sanitizer.bypassSecurityTrustHtml(raw);
  }

  // Score band classes
  getScoreClass(val: number | null | undefined): string {
    if (val === null || val === undefined || isNaN(val)) return 'score-cell-na';
    if (val < 60) return 'score-band-1';
    if (val < 85) return 'score-band-2';
    if (val < 93) return 'score-band-3';
    if (val < 97) return 'score-band-4';
    return 'score-band-5';
  }

  formatScore(val: number | null | undefined): string {
    if (val === null || val === undefined || isNaN(val)) return 'N/A';
    return (Math.round(val * 10) / 10).toString();
  }

  getActiveInspectorConfidence(): string {
    const d = this.getInspectedDialogue();
    const conf = d?.analysis?.[this.valTarget]?.[this.activeInspectorDim]?.confidence;
    if (conf !== undefined && conf !== null) {
      return `${Math.round(conf * 100)}%`;
    }
    return 'N/A';
  }

  getContextEffect(scene: AnalysisScene, dimKey: string): { text: string; color: string } {
    const ai = this.getSceneDimensionScore(scene, dimKey, 'ai_german');
    const ctx = this.getSceneDimensionScore(scene, dimKey, 'context_ai_german');
    if (ai === null || ctx === null) return { text: 'N/A', color: 'var(--muted)' };
    const diff = Math.round((ctx - ai) * 10) / 10;
    return {
      text: diff > 0 ? `+${diff}` : `${diff}`,
      color: diff > 0 ? '#1E6B3A' : diff < 0 ? 'var(--warn-ink)' : 'var(--ink-2)'
    };
  }
}

