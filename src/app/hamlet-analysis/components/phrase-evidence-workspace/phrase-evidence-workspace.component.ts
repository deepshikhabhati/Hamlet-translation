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
  AlignedPhraseGroup,
  EvidenceFocusContext,
  HamletDataService,
  PHRASE_DIMENSION_KEYS,
  PHRASE_DIMENSION_LABELS,
  STATUS_META,
  TARGET_VERSIONS,
  TextSegment,
  VERSIONS,
  versionLabels,
} from '../../services/hamlet-data.service';
import { DimensionToolbarComponent } from '../dimension-toolbar/dimension-toolbar.component';
import { PhraseStatusLegendComponent } from '../phrase-status-legend/phrase-status-legend.component';
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
  @Input() focusContext: EvidenceFocusContext | null = null;
  @Input() englishPdfPath = 'assets/Hamlet.pdf';
  @Input() germanPdfPath = 'assets/GermanHamlet.pdf';

  @Output() dimensionActivated = new EventEmitter<string>();

  @ViewChild('workspaceAnchor') workspaceAnchor?: ElementRef<HTMLElement>;

  evidencePassage: any = null;
  alignedPhrases: AlignedPhraseGroup[] = [];

  hoveredAlignmentId: string | null = null;
  selectedAlignmentId: string | null = null;
  selectedPhraseVersion: string | null = null;
  selectedDimension = 'semantic';
  showPhraseScores = false;
  panelOpen = false;
  selectedAlignment: AlignedPhraseGroup | null = null;

  bookDialogOpen = false;
  bookDialogLang: 'english' | 'german' = 'english';

  validatedIds = new Set<string>();
  pulsingAlignmentIds = new Set<string>();
  private pulseTimer?: any;

  readonly versions = VERSIONS;
  readonly targetVersions = TARGET_VERSIONS;
  readonly labels = versionLabels;
  readonly dimLabels = PHRASE_DIMENSION_LABELS;
  readonly dimKeys = PHRASE_DIMENSION_KEYS;
  readonly statusMeta = STATUS_META;

  phraseTranslationView: Record<string, 'german' | 'english_translation'> = {};

  constructor(private dataService: HamletDataService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['comparisonPassageId'] || changes['phraseData']) {
      this.resolvePassage();
    }
    if (changes['externalDimension'] && this.externalDimension) {
      this.selectedDimension = this.externalDimension;
    }
    if (changes['focusContext'] && this.focusContext) {
      this.handleFocusContextChange(this.focusContext);
    }
  }

  resolvePassage(): void {
    this.panelOpen = false;
    this.selectedAlignmentId = null;
    this.selectedAlignment = null;
    this.hoveredAlignmentId = null;
    this.focusContext = null;
    this.pulsingAlignmentIds.clear();
    if (this.pulseTimer) {
      clearTimeout(this.pulseTimer);
    }

    if (!this.comparisonPassageId) {
      this.evidencePassage = null;
      this.alignedPhrases = [];
      return;
    }

    this.evidencePassage = this.dataService.getEvidencePassage(this.comparisonPassageId);
    this.alignedPhrases = this.dataService.getAlignedPhrases(this.comparisonPassageId);
    this.resetTranslationViews();
    this.refreshValidatedIds();
  }

  resetTranslationViews(): void {
    this.phraseTranslationView = {};
  }

  refreshValidatedIds(): void {
    const ids = new Set<string>();
    if (!this.comparisonPassageId) {
      this.validatedIds = ids;
      return;
    }
    const all = this.dataService.loadAllValidations();
    Object.values(all).forEach((v) => {
      if (v.passage_id === this.comparisonPassageId && v.decision) {
        ids.add(v.alignment_id);
      }
    });
    this.validatedIds = ids;
  }

  focusDimension(dimension: string, context?: EvidenceFocusContext): void {
    this.selectedDimension = dimension;
    this.focusContext = context ?? null;
    if (context) {
      this.handleFocusContextChange(context);
    }
    this.dimensionActivated.emit(dimension);
    this.scrollIntoView();
  }

  private handleFocusContextChange(context: EvidenceFocusContext): void {
    if (!this.comparisonPassageId) return;
    const contributorIds = this.dataService.getPairwiseEvidenceContributors(
      this.comparisonPassageId,
      context.sourceVersion,
      context.targetVersion,
      context.dimension
    );
    this.pulsingAlignmentIds = new Set(contributorIds);
    if (this.pulseTimer) {
      clearTimeout(this.pulseTimer);
    }
    this.pulseTimer = setTimeout(() => {
      this.pulsingAlignmentIds.clear();
    }, 3200);
  }

  onDimensionChange(dim: string): void {
    this.selectedDimension = dim;
    this.dimensionActivated.emit(dim);
  }

  getSegments(phrase: AlignedPhraseGroup, version: string): TextSegment[] {
    const isTransActive = this.isTranslationActive(phrase, version);
    return this.dataService.getRelevantSpans(
      phrase,
      version,
      this.selectedDimension,
      isTransActive
    );
  }

  getClassification(phrase: AlignedPhraseGroup, version: string): string {
    if (version === 'english') {
      return '';
    }
    return phrase.dimensions[this.selectedDimension]?.classifications[version] || 'N/A';
  }

  getClassificationMeta(phrase: AlignedPhraseGroup, version: string): { className: string; icon: string; label: string; color: string } {
    const status = this.getClassification(phrase, version);
    return this.statusMeta[status] || this.statusMeta['N/A'];
  }

  hasTranslation(phrase: AlignedPhraseGroup, version: string): boolean {
    if (version !== 'ai_german' && version !== 'context_ai_german') {
      return false;
    }
    const raw = phrase.raw_targets?.[version];
    return (
      raw?.translation_available === true &&
      typeof raw?.english_translation === 'string' &&
      raw.english_translation.trim().length > 0
    );
  }

  isTranslationActive(phrase: AlignedPhraseGroup, version: string): boolean {
    const key = `${phrase.alignment_id}::${version}`;
    return this.phraseTranslationView[key] === 'english_translation';
  }

  toggleTranslation(phrase: AlignedPhraseGroup, version: string, event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    if (!this.hasTranslation(phrase, version)) return;
    const key = `${phrase.alignment_id}::${version}`;
    this.phraseTranslationView = {
      ...this.phraseTranslationView,
      [key]: this.isTranslationActive(phrase, version) ? 'german' : 'english_translation',
    };
  }

  onCardHover(alignmentId: string | null): void {
    this.hoveredAlignmentId = alignmentId;
  }

  isCardHighlighted(alignmentId: string): boolean {
    return (
      alignmentId === this.hoveredAlignmentId ||
      alignmentId === this.selectedAlignmentId
    );
  }

  isCardDimmed(alignmentId: string): boolean {
    const active = this.hoveredAlignmentId || this.selectedAlignmentId;
    return !!active && alignmentId !== active;
  }

  isCardPulsing(alignmentId: string): boolean {
    return this.pulsingAlignmentIds.has(alignmentId);
  }

  onCardSelect(phrase: AlignedPhraseGroup, version: string = 'context_ai_german'): void {
    this.selectedAlignment = phrase;
    this.selectedAlignmentId = phrase.alignment_id;
    this.selectedPhraseVersion = version;
    this.panelOpen = true;
  }

  isValidated(alignmentId: string): boolean {
    return this.validatedIds.has(alignmentId);
  }

  confidenceBadgeClass(level: string): string {
    if (level === 'High') return 'meta-tag--high';
    if (level === 'Medium') return 'meta-tag--med';
    return 'meta-tag--low';
  }

  reviewStatusClass(status: string): string {
    if (status === 'reviewed') return 'meta-tag--reviewed';
    if (status === 'needs_review') return 'meta-tag--needs-review';
    return 'meta-tag--auto';
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
    if (!file) return;
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

  activateFromHeatmap(dimension: string): void {
    this.selectedDimension = dimension;
    this.scrollIntoView();
  }

  get validationOptions(): string[] {
    return this.phraseData?.validation_options ?? this.dataService.getValidationOptions();
  }
}
