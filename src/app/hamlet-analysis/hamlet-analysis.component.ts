import { FullBookAdapterService } from './services/full-book-adapter.service';
import { Component, OnInit, ViewChild } from '@angular/core';
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
export class HamletAnalysisComponent implements OnInit {
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

  // Tooltip State
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

  constructor(
    private dataService: HamletDataService,
    private adapter: FullBookAdapterService,
    private sanitizer: DomSanitizer,
    public aggregationService: HamletAggregationService,
    public expertReviewService: ExpertReviewService,
    public reviewCountingService: ReviewCountingService
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

  openPdfBook(book: 'english' | 'german'): void {
    this.activePdfBook = book;
    this.pdfSource = book === 'english' ? this.englishPdfPath : this.germanPdfPath;
    this.pdfHighlightText = this.getPdfHighlightText(book);
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
      this.selectedAnalysisScene = null;
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

  getActScenes(actNum: number): AnalysisScene[] {
    const act = this.analysisActs.find((a) => a.act === actNum);
    return act?.scenes || [];
  }

  selectAnalysisAct(actNum: number): void {
    this.selectedAnalysisAct = actNum;
    const scenes = this.getActScenes(actNum);
    this.selectedAnalysisScene = scenes[0] || null;
    this.activeInspectedDialogueId = null;
  }

  selectAnalysisScene(scene: AnalysisScene): void {
    this.selectedAnalysisScene = scene;
    this.activeInspectedDialogueId = null;
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
    this.selectAnalysisAct(sc.act);
    this.selectedAnalysisScene = sc;
    this.toggleSceneExpand(sc.scene_id, true);
    const flaggedDlg = sc.dialogues?.find(
      (d) =>
        this.isDialogueFlagged(d, 'human_german', 'semantic') ||
        this.isDialogueFlagged(d, 'ai_german', 'semantic') ||
        this.isDialogueFlagged(d, 'context_ai_german', 'semantic')
    );
    if (flaggedDlg) {
      this.autoExpandDialogueId = flaggedDlg.dialogue_id;
      this.activeInspectedDialogueId = flaggedDlg.dialogue_id;
    }
    setTimeout(() => {
      const el = document.getElementById('scene-row-' + sc.scene_id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 60);
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
      const isDiff = isAnalyzed && [hStatus, aStatus, cStatus].some((s) => {
        const lower = s.toLowerCase();
        return lower.includes('chang') || lower.includes('lost') || lower.includes('add');
      });
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
        sourceSpans: isAnalyzed ? this.getSourceSpansForDialogue(d, dim) : [],
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
    if (this.analysisPhraseFilter === 'diff') {
      rows = rows.filter((r) => r.isDiff);
    } else if (this.analysisPhraseFilter === 'review') {
      rows = rows.filter((r) => r.needsReview);
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
  openInspector(diagId: string): void {
    this.activeInspectedDialogueId = diagId;
    this.activeInspectorDim = this.selectedAnalysisDimension;
    this.loadCurrentReviewForInspector();
  }

  closeInspector(): void {
    this.activeInspectedDialogueId = null;
  }

  getInspectedDialogue(): AnalysisDialogue | null {
    if (!this.selectedAnalysisScene || !this.activeInspectedDialogueId) return null;
    return this.selectedAnalysisScene.dialogues.find((d) => d.dialogue_id === this.activeInspectedDialogueId) || null;
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
  }

  onInspectorDimensionChange(dimKey: string): void {
    this.activeInspectorDim = dimKey;
    this.selectedAnalysisDimension = dimKey;
    this.loadCurrentReviewForInspector();
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

  onSegmentHover(data: { segment: any; event: MouseEvent }, verKey: string): void {
    const seg = data.segment;
    const ev = seg.evidence;
    const dimDef = this.v15Dimensions.find((d) => d.key === this.selectedAnalysisDimension);
    const verDef = this.v15Versions.find((v) => v.key === verKey);

    this.tooltipDimension = dimDef?.name || this.selectedAnalysisDimension;
    this.tooltipVersion = verKey === 'english' ? 'English source' : (verDef?.name || verKey);
    this.tooltipStatus = seg.status || 'Preserved';
    this.tooltipScore = ev?.score !== undefined ? `Score: ${ev.score}` : '';
    this.tooltipConfidence = ev?.confidence !== undefined ? `Conf: ${ev.confidence}` : '';
    this.tooltipQuotes = ev ? `<strong>Quote:</strong> “${ev.source_quote || ''}” → “${ev.target_quote || ''}”` : '';
    this.tooltipExplanation = ev?.explanation || '';

    const rect = (data.event.target as HTMLElement).getBoundingClientRect();
    this.tooltipPos = {
      left: Math.min(window.innerWidth - 320, Math.max(10, rect.left)),
      top: rect.bottom + 8
    };
    this.tooltipVisible = true;
  }

  onSegmentLeave(): void {
    this.tooltipVisible = false;
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
    this.openInspector(item.dialogue_id);
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

