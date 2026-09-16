import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  HamletDataService,
  PHRASE_DIMENSION_KEYS,
  PHRASE_DIMENSION_LABELS,
  TARGET_VERSIONS,
  VERSIONS,
  versionLabels,
} from '../../services/hamlet-data.service';
import { DimensionToolbarComponent } from '../dimension-toolbar/dimension-toolbar.component';
import { PhraseStatusLegendComponent } from '../phrase-status-legend/phrase-status-legend.component';
import { AlignedPhraseColumnComponent } from '../aligned-phrase-column/aligned-phrase-column.component';
import { PhraseEvidencePanelComponent } from '../phrase-evidence-panel/phrase-evidence-panel.component';
import { BookContextDialogComponent } from '../book-context-dialog/book-context-dialog.component';

@Component({
  selector: 'app-ha-phrase-evidence-workspace',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DimensionToolbarComponent,
    PhraseStatusLegendComponent,
    AlignedPhraseColumnComponent,
    PhraseEvidencePanelComponent,
    BookContextDialogComponent,
  ],
  templateUrl: './phrase-evidence-workspace.component.html',
  styleUrls: ['./phrase-evidence-workspace.component.scss'],
})
export class PhraseEvidenceWorkspaceComponent implements OnChanges {
  @Input() comparisonPassageId: string | null = null;
  @Input() phraseData: any = null;
  @Input() evidenceLoadError: string | null = null;
  @Input() externalDimension: string | null = null;
  @Input() englishPdfPath = '/assets/Hamlet.pdf';
  @Input() germanPdfPath = '/assets/GermanHamlet.pdf';

  @Output() dimensionActivated = new EventEmitter<string>();

  @ViewChild('workspaceAnchor') workspaceAnchor?: ElementRef<HTMLElement>;

  evidencePassage: any = null;
  alignments: any[] = [];
  dimensionSummary: Record<string, number | null> | null = null;

  hoveredAlignmentId: string | null = null;
  selectedAlignmentId: string | null = null;
  selectedPhraseVersion: string | null = null;
  selectedDimension = 'semantic';
  showPhraseScores = true;
  panelOpen = false;
  selectedAlignment: any = null;

  bookDialogOpen = false;
  bookDialogLang: 'english' | 'german' = 'english';

  mobileVersion: string = 'english';
  validatedIds = new Set<string>();

  readonly columnVersions = [...VERSIONS];
  readonly targetVersions = TARGET_VERSIONS;
  readonly labels = versionLabels;
  readonly dimLabels = PHRASE_DIMENSION_LABELS;
  readonly dimKeys = PHRASE_DIMENSION_KEYS;

  constructor(private dataService: HamletDataService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['comparisonPassageId'] || changes['phraseData']) {
      this.resolvePassage();
    }
    if (changes['externalDimension'] && this.externalDimension) {
      this.selectedDimension = this.externalDimension;
    }
  }

  resolvePassage(): void {
    this.panelOpen = false;
    this.selectedAlignmentId = null;
    this.selectedAlignment = null;
    this.hoveredAlignmentId = null;

    if (!this.comparisonPassageId || !this.phraseData?.passages) {
      this.evidencePassage = null;
      this.alignments = [];
      this.dimensionSummary = null;
      return;
    }

    this.evidencePassage =
      this.phraseData.passages.find(
        (p: any) => p.passage_id === this.comparisonPassageId
      ) ?? null;

    this.alignments = this.evidencePassage?.phrase_alignments ?? [];
    this.dimensionSummary = this.evidencePassage?.dimension_summary ?? null;
    this.refreshValidatedIds();
  }

  refreshValidatedIds(): void {
    const ids = new Set<string>();
    if (!this.evidencePassage) {
      this.validatedIds = ids;
      return;
    }
    const all = this.dataService.loadAllValidations();
    Object.values(all).forEach((v) => {
      if (v.passage_id === this.evidencePassage.passage_id && v.decision) {
        ids.add(v.alignment_id);
      }
    });
    this.validatedIds = ids;
  }

  highlightAlignment(alignmentId: string): void {
    this.hoveredAlignmentId = alignmentId;
  }

  clearHoveredAlignment(): void {
    this.hoveredAlignmentId = null;
  }

  onPhraseHover(alignmentId: string | null): void {
    if (alignmentId) {
      this.highlightAlignment(alignmentId);
    } else {
      this.clearHoveredAlignment();
    }
  }

  selectPhrase(event: { alignment: any; version: string }): void {
    this.selectedAlignment = event.alignment;
    this.selectedAlignmentId = event.alignment.alignment_id;
    this.selectedPhraseVersion = event.version;
    this.panelOpen = true;
  }

  isPhraseHighlighted(alignmentId: string): boolean {
    return (
      alignmentId === this.hoveredAlignmentId ||
      alignmentId === this.selectedAlignmentId
    );
  }

  isPhraseDimmed(alignmentId: string): boolean {
    const active = this.hoveredAlignmentId || this.selectedAlignmentId;
    return !!active && alignmentId !== active;
  }

  onDimensionChange(dim: string): void {
    this.selectedDimension = dim;
    this.dimensionActivated.emit(dim);
  }

  onShowScoresChange(show: boolean): void {
    this.showPhraseScores = show;
  }

  onSummaryClick(dim: string): void {
    this.onDimensionChange(dim);
  }

  formatSummary(key: string): string {
    return this.dataService.formatScore(this.dimensionSummary?.[key] ?? null);
  }

  summaryBarWidth(key: string): number {
    const v = this.dimensionSummary?.[key];
    if (v == null || Number.isNaN(Number(v))) {
      return 0;
    }
    return Math.max(0, Math.min(100, Number(v)));
  }

  openBook(lang: 'english' | 'german'): void {
    this.bookDialogLang = lang;
    this.bookDialogOpen = true;
  }

  closeBook(): void {
    this.bookDialogOpen = false;
  }

  closePanel(): void {
    this.panelOpen = false;
  }

  onValidationChanged(): void {
    this.refreshValidatedIds();
  }

  exportValidations(): void {
    const json = this.dataService.exportValidationsJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'hamlet_phrase_evidence_validations.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  importValidations(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = this.dataService.importValidationsJson(String(reader.result || ''));
      if (!result.ok) {
        alert(`Import failed: ${result.error || 'Invalid file'}`);
      } else {
        this.refreshValidatedIds();
        alert(`Imported ${result.count} validation record(s).`);
      }
      input.value = '';
    };
    reader.readAsText(file);
  }

  scrollIntoView(): void {
    this.workspaceAnchor?.nativeElement?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }

  /** Called from parent when heatmap cell is clicked */
  activateFromHeatmap(dimension: string): void {
    this.selectedDimension = dimension;
    this.scrollIntoView();
  }

  get validationOptions(): string[] {
    return this.phraseData?.validation_options ?? this.dataService.getValidationOptions();
  }
}
