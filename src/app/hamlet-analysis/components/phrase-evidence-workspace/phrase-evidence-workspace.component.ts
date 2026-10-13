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
  EvidenceConcept,
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
  selectedAnalysisPassage: any = null;
  
  selectedLevel: 'scene' | 'dialogue' = 'dialogue';
  selectedScene: any;
  selectedPassage: any;
  phraseAlignments: any[] = [];
  dialoguePhraseGroups: any[] = [];
  activeAlignmentId: string | null = null;

  hoveredAlignmentId: string | null = null;
  selectedAlignmentId: string | null = null;
  selectedPhraseVersion: string | null = null;
  selectedEvidenceDimension = 'semantic';
  hoveredConceptId: string | null = null;
  selectedConceptId: string | null = null;
  selectedConcept: EvidenceConcept | null = null;

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

  get selectedDimension(): string {
    return this.selectedEvidenceDimension;
  }
  set selectedDimension(val: string) {
    this.selectedEvidenceDimension = val;
  }

  constructor(private dataService: HamletDataService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['comparisonPassageId'] || changes['phraseData']) {
      this.selectedLevel = (this.comparisonPassageId || '').includes('-D') ? 'dialogue' : 'scene';
      this.updatePhraseEvidence();
    }
    if (changes['externalDimension'] && this.externalDimension) {
      this.selectedEvidenceDimension = this.externalDimension;
    }
    if (changes['focusContext'] && this.focusContext) {
      this.handleFocusContextChange(this.focusContext);
    }
  }

  updatePhraseEvidence(): void {
    this.activeAlignmentId = null;
    this.selectedAlignment = null;

    if (!this.phraseData) {
      this.phraseAlignments = [];
      this.dialoguePhraseGroups = [];
      return;
    }

    if (this.selectedLevel === 'scene') {
      this.loadScenePhraseEvidence();
    } else {
      this.loadDialoguePhraseEvidence();
    }

    this.refreshValidatedIds();
  }

  loadDialoguePhraseEvidence(): void {
    const dialogueId = this.comparisonPassageId || '';
    const dialogueEvidence = this.phraseData?.by_passage_id?.[dialogueId];
    this.phraseAlignments = dialogueEvidence?.phrase_alignments || [];
    this.dialoguePhraseGroups = [];
  }

  getSceneId(scene: any): string {
    if (scene?.scene_id) {
      return scene.scene_id;
    }
    if (scene?.act && scene?.scene) {
      return `A${scene.act}-S${scene.scene}`;
    }
    return this.comparisonPassageId || '';
  }

  loadScenePhraseEvidence(): void {
    const sceneId = this.comparisonPassageId || ''; // The passage ID is the scene ID in scene mode
    const sceneEvidence = this.phraseData?.by_scene_id?.[sceneId];
    this.phraseAlignments = sceneEvidence?.phrase_alignments || [];
    this.dialoguePhraseGroups = sceneEvidence?.dialogue_phrase_groups || [];
  }

  getPhraseText(alignment: any, version: string): string {
    if (version === 'english') {
      return alignment?.english_phrase?.text?.trim() || '';
    }
    return alignment?.targets?.[version]?.text?.trim() || '';
  }

  getDimensionEvidence(alignment: any, version: string): any {
    if (version === 'english') {
      return null;
    }
    return alignment?.targets?.[version]?.evidence?.find(
      (item: any) => item.dimension === this.selectedEvidenceDimension
    ) || null;
  }

  getPhraseStatus(alignment: any, version: string): string {
    const phraseText = this.getPhraseText(alignment, version);
    if (!phraseText) {
      return 'Lost';
    }
    const evidence = this.getDimensionEvidence(alignment, version);
    if (!evidence) {
      return 'Not Available';
    }
    if (evidence.applicable === false) {
      return 'Not Applicable';
    }
    return evidence.status;
  }

  trackByAlignment(index: number, alignment: any): string {
    return alignment?.alignment_id || String(index);
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
    this.selectedEvidenceDimension = dim;
    this.hoveredConceptId = null;
    this.selectedConceptId = null;
    this.selectedConcept = null;
    this.dimensionActivated.emit(dim);
  }

  hoverConcept(conceptId: string): void {
    this.hoveredConceptId = conceptId;
  }

  clearHoveredConcept(): void {
    this.hoveredConceptId = null;
  }

  selectConcept(alignment: any, dimensionEvidence: any, concept: any): void {
    this.selectedConceptId = concept?.concept_id || null;
    this.selectedConcept = concept || null;
    this.selectedAlignmentId = alignment?.alignment_id || null;
    this.selectedAlignment = alignment;
    this.panelOpen = true;
  }

  isConceptHighlighted(conceptId: string): boolean {
    if (!conceptId) return false;
    return (
      conceptId === this.hoveredConceptId ||
      conceptId === this.selectedConceptId
    );
  }

  isEvidenceDimmed(conceptId: string): boolean {
    const active = this.hoveredConceptId || this.selectedConceptId;
    if (!active) return false;
    return conceptId !== active;
  }

  getActiveDimensionEvidence(alignment: any): any {
    return this.dataService.getActiveDimensionEvidence(alignment, this.selectedEvidenceDimension);
  }

  getConcepts(phrase: AlignedPhraseGroup): EvidenceConcept[] {
    return this.dataService.getConceptsForDimension(phrase, this.selectedEvidenceDimension);
  }

  onSegmentClick(event: Event, phrase: AlignedPhraseGroup, seg: TextSegment): void {
    event.stopPropagation();
    if (!seg.highlighted || !seg.concept_id) return;
    const concepts = this.getConcepts(phrase);
    const concept = concepts.find((c) => c.concept_id === seg.concept_id) || {
      concept_id: seg.concept_id,
      label: seg.concept_label || seg.text,
      dimension: this.selectedEvidenceDimension,
    };
    this.selectConcept(phrase, this.getActiveDimensionEvidence(phrase), concept);
  }

  onConceptBadgeClick(event: Event, phrase: AlignedPhraseGroup, concept: EvidenceConcept): void {
    event.stopPropagation();
    this.selectConcept(phrase, this.getActiveDimensionEvidence(phrase), concept);
  }

  getSegments(phrase: any, version: string): TextSegment[] {
    const rawText = this.getPhraseText(phrase, version);
    if (!rawText) return [{ text: 'No corresponding span', highlighted: false, isMissingPlaceholder: true }];

    const spans: any[] = [];
    const dim = this.selectedEvidenceDimension;

    if (phrase.alignment_id === "EN-A1-S1-D00026-AL-001" && version === "human_german") {
      console.log("=== EN-A1-S1-D00026-AL-001 DEBUG ===");
      console.log("DIM:", dim);
      const tgtEvidence = phrase.targets?.[version]?.evidence?.find((e: any) => e.dimension === dim);
      console.log("tgtEvidence:", tgtEvidence ? "FOUND" : "NOT FOUND");
      if (tgtEvidence) {
        console.log("eSpans length:", tgtEvidence.evidence_spans?.length);
        console.log("first span target:", tgtEvidence.evidence_spans?.[0]?.target);
      }
    }

    if (version === 'english') {
      const targets = ['human_german', 'ai_german', 'context_ai_german'];
      const seen = new Set<string>();

      let dimFoundInAnyTarget = false;
      for (const tgt of targets) {
        const tgtEvidence = phrase.targets?.[tgt]?.evidence?.find((e: any) => e.dimension === dim);
        if (tgtEvidence) dimFoundInAnyTarget = true;
        if (tgtEvidence && tgtEvidence.evidence_spans) {
          for (const s of tgtEvidence.evidence_spans) {
            const source = s.source;
            if (source && source.start !== undefined && source.end !== undefined) {
              const key = `${s.concept_id}-${source.start}-${source.end}`;
              if (!seen.has(key)) {
                seen.add(key);
                spans.push({
                  start: source.start,
                  end: source.end,
                  text: source.text,
                  concept_id: s.concept_id,
                  status: 'source'
                });
              }
            }
          }
        }
      }
      if (!dimFoundInAnyTarget) return [{ text: rawText, highlighted: false }];
      if (spans.length === 0) return [{ text: rawText, highlighted: false, missingEvidence: 'english_spans_zero' }];
    } else {
      const tgtEvidence = phrase.targets?.[version]?.evidence?.find((e: any) => e.dimension === dim);
      if (!tgtEvidence) {
        return [{ text: rawText, highlighted: false }];
      }
      if (tgtEvidence.applicable === false || tgtEvidence.status === 'Not Applicable') {
        return [{ text: rawText, highlighted: false }];
      }
      const eSpans = tgtEvidence.evidence_spans || [];
      if (eSpans.length === 0) {
        return [{ text: rawText, highlighted: false, missingEvidence: 'espans_zero', debugInfo: tgtEvidence }];
      }
      for (const s of eSpans) {
        const tgt = s.target;
        if (tgt && tgt.start !== undefined && tgt.end !== undefined) {
          spans.push({
            start: tgt.start,
            end: tgt.end,
            text: tgt.text,
            concept_id: s.concept_id,
            status: s.status
          });
        }
      }
      if (spans.length === 0) return [{ text: rawText, highlighted: false, missingEvidence: 'spans_zero', debugInfo: eSpans }];
    }

    // Offset validation
    spans.forEach(span => {
      const actual = rawText.slice(span.start, span.end);
      if (actual !== span.text) {
        console.warn('EVIDENCE OFFSET MISMATCH', { expected: span.text, actual, start: span.start, end: span.end, rawText });
      }
    });

    const sortedSpans = spans.sort((a, b) => a.start - b.start);
    return this.sliceTextIntoSegments(rawText, sortedSpans);
  }

  private sliceTextIntoSegments(rawText: string, sortedSpans: any[]): TextSegment[] {
    const mergedSpans = [];
    if (sortedSpans.length > 0) {
      let current = { ...sortedSpans[0] };
      for (let i = 1; i < sortedSpans.length; i++) {
        const next = sortedSpans[i];
        if (next.start <= current.end) {
          // Merge overlapping spans
          current.end = Math.max(current.end, next.end);
        } else {
          mergedSpans.push(current);
          current = { ...next };
        }
      }
      mergedSpans.push(current);
    }

    const segments: TextSegment[] = [];
    let currentIdx = 0;
    for (const span of mergedSpans) {
      if (span.start > currentIdx) {
        segments.push({ text: rawText.slice(currentIdx, span.start), highlighted: false });
      }
      segments.push({
        text: rawText.slice(span.start, span.end),
        highlighted: true,
        concept_id: span.concept_id,
        concept_label: span.concept_id,
        status: span.status
      });
      currentIdx = span.end;
    }
    if (currentIdx < rawText.length) {
      segments.push({ text: rawText.slice(currentIdx), highlighted: false });
    }
    return segments;
  }

  getRawText(phrase: any, version: string): string {
    if (version === 'english') {
      return phrase.english_phrase?.text || phrase.spans?.english?.[0]?.text || '';
    }
    const tgt = phrase.targets?.[version];
    return typeof tgt === 'string' ? tgt : tgt?.text || '';
  }

  getClassification(phrase: AlignedPhraseGroup, version: string): string {
    if (version === 'english') {
      return '';
    }
    return phrase.dimensions[this.selectedEvidenceDimension]?.classifications[version] || 'N/A';
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

  getSegmentClass(seg: any): string {
    if (!seg.highlighted) return '';
    let cls = 'phrase-segment phrase-segment--highlight';
    if (seg.status) {
      const statusStr = seg.status.toLowerCase().replace(' ', '-');
      cls += ` phrase-segment--${statusStr}`;
    }
    if (seg.concept_id && this.isConceptHighlighted(seg.concept_id)) {
      cls += ' phrase-segment--concept-active';
    }
    if (seg.concept_id && this.isEvidenceDimmed(seg.concept_id)) {
      cls += ' phrase-segment--dimmed';
    }
    return cls;
  }

  isCardPulsing(alignmentId: string): boolean {
    return this.pulsingAlignmentIds.has(alignmentId);
  }

  onCardSelect(phrase: AlignedPhraseGroup, version: string = 'context_ai_german'): void {
    this.selectedAlignment = phrase;
    this.selectedAlignmentId = phrase.alignment_id;
    this.selectedPhraseVersion = version;
    const concepts = this.getConcepts(phrase);
    this.selectedConcept = concepts[0] || null;
    this.selectedConceptId = this.selectedConcept?.concept_id || null;
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
    this.selectedConceptId = null;
    this.selectedConcept = null;
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
