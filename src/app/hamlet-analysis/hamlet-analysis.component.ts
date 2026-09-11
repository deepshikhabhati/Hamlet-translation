import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  HamletDataService,
  PassageFilters,
  VERSIONS,
} from './services/hamlet-data.service';
import { PassageSidebarComponent } from './components/passage-sidebar/passage-sidebar.component';
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
import { PdfHighlighterComponent } from '../pdf-highlighter/pdf-highlighter.component';

@Component({
  selector: 'app-hamlet-analysis',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PassageSidebarComponent,
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
    PdfHighlighterComponent,
  ],
  templateUrl: './hamlet-analysis.component.html',
  styleUrls: ['./hamlet-analysis.component.scss'],
})
export class HamletAnalysisComponent implements OnInit {
  passages: any[] = [];
  datasetSummary: any = null;
  metadata: any = null;
  loading = true;
  error: string | null = null;

  activeTab: 'passage' | 'dataset' = 'passage';
  selectedPassage: any = null;
  selectedSource = 'english';
  selectedTarget = 'context_ai_german';
  selectedComparison: any = null;
  selectedDiffCategory: string | null = null;

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
  readonly englishPdfPath = '/assets/Hamlet.pdf';
  readonly germanPdfPath = '/assets/GermanHamlet.pdf';

  readonly versions = VERSIONS;

  constructor(private dataService: HamletDataService) {}

  ngOnInit(): void {
    this.dataService.getData().subscribe({
      next: (data) => {
        this.passages = data.passages ?? [];
        this.datasetSummary = data.dataset_summary ?? null;
        this.metadata = data.metadata ?? null;
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
    this.updateComparison();
    if (this.pdfPanelOpen && this.activePdfBook) {
      this.refreshPdfHighlight();
    }
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
    // German book is the human translation source
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

  setTab(tab: 'passage' | 'dataset'): void {
    this.activeTab = tab;
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }
}
