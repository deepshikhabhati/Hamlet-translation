import { FullBookAdapterService } from './services/full-book-adapter.service';
import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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

  activeTab: 'passage' | 'dataset' | 'heatmap' = 'passage';
  selectedPassage: any = null;
  selectedSource = 'english';
  selectedTarget = 'context_ai_german';
  selectedComparison: any = null;
  selectedDiffCategory: string | null = null;

  // Add these to hamlet-analysis.component.ts
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

  constructor(private dataService: HamletDataService, private adapter: FullBookAdapterService) {}

  ngOnInit(): void {
    forkJoin({
      comparison: this.dataService.getData(),
      fullBookUi: this.dataService.loadFullBookUiData().pipe(catchError(() => of(null))),
      sceneLevelData: this.dataService.loadFullBookHierarchy().pipe(catchError(() => of(null))),
      phrase: this.dataService.getPhraseEvidenceData().pipe(
        catchError(() => of(null))
      ),
    }).subscribe({
      next: ({ comparison, phrase, sceneLevelData, fullBookUi }) => {
        this.passages = comparison.passages ?? [];
        this.sceneData = fullBookUi?.scenes ?? sceneLevelData?.scenes ?? [];
        this.datasetSummary = comparison.dataset_summary ?? null;
        this.metadata = comparison.metadata ?? null;
        this.phraseData = phrase;
        if (!phrase) {
          this.evidenceLoadError =
            'Phrase-alignment evidence JSON could not be loaded. Passage comparison still works.';
        }
        if (this.passages.length) {
          this.selectPassage(this.passages[0]);
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
    this.selectedDiffCategory = null;
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
    if (!this.selectedPassage) {
      return;
    }
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
    this.selectedDiffCategory = category;
  }

  setTab(tab: 'passage' | 'dataset' | 'heatmap'): void {
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
}
