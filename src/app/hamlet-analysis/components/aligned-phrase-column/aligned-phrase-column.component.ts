import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  HamletDataService,
  versionLabels,
} from '../../services/hamlet-data.service';

@Component({
  selector: 'app-ha-aligned-phrase-column',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './aligned-phrase-column.component.html',
  styleUrls: ['./aligned-phrase-column.component.scss'],
})
export class AlignedPhraseColumnComponent {
  @Input() versionKey = 'english';
  @Input() alignments: any[] = [];
  @Input() selectedDimension = 'semantic';
  @Input() hoveredAlignmentId: string | null = null;
  @Input() selectedAlignmentId: string | null = null;
  @Input() showPhraseScores = true;
  @Input() validatedIds: Set<string> = new Set();

  @Output() phraseHover = new EventEmitter<string | null>();
  @Output() phraseSelect = new EventEmitter<{ alignment: any; version: string }>();

  readonly labels = versionLabels;

  constructor(private dataService: HamletDataService) {}

  trackByAlignment(_: number, a: any): string {
    return a.alignment_id;
  }

  getPhrase(alignment: any): { phrase_id: string; text: string } | null {
    if (this.versionKey === 'english') {
      return alignment?.english_phrase ?? null;
    }
    return alignment?.targets?.[this.versionKey] ?? null;
  }

  getEvidence(alignment: any): any | null {
    if (this.versionKey === 'english') {
      // Prefer context AI evidence for English column status coloring
      return this.dataService.getEvidence(
        alignment,
        'context_ai_german',
        this.selectedDimension
      );
    }
    return this.dataService.getEvidence(
      alignment,
      this.versionKey,
      this.selectedDimension
    );
  }

  isHighlighted(alignmentId: string): boolean {
    return (
      alignmentId === this.hoveredAlignmentId ||
      alignmentId === this.selectedAlignmentId
    );
  }

  isDimmed(alignmentId: string): boolean {
    const active = this.hoveredAlignmentId || this.selectedAlignmentId;
    return !!active && alignmentId !== active;
  }

  isSelected(alignmentId: string): boolean {
    return alignmentId === this.selectedAlignmentId;
  }

  isValidated(alignmentId: string): boolean {
    return this.validatedIds.has(alignmentId);
  }

  statusClass(alignment: any): string {
    const ev = this.getEvidence(alignment);
    return this.dataService.getStatusClass(ev?.status);
  }

  statusIcon(alignment: any): string {
    const ev = this.getEvidence(alignment);
    return this.dataService.getStatusIcon(ev?.status);
  }

  scoreBadge(alignment: any): string {
    const ev = this.getEvidence(alignment);
    if (!ev || ev.applicable === false || ev.score == null) {
      return 'N/A';
    }
    return `${this.dataService.formatScore(ev.score)} · ${ev.status || ''}`.trim();
  }

  ariaLabel(alignment: any): string {
    const phrase = this.getPhrase(alignment);
    const ev = this.getEvidence(alignment);
    const status = ev?.status || 'Unknown';
    const score =
      ev?.applicable === false || ev?.score == null
        ? 'N/A'
        : this.dataService.formatScore(ev.score);
    return `${this.labels[this.versionKey]} phrase: ${phrase?.text || ''}. Status ${status}. Score ${score}.`;
  }

  onEnter(alignmentId: string): void {
    this.phraseHover.emit(alignmentId);
  }

  onLeave(): void {
    this.phraseHover.emit(null);
  }

  onSelect(alignment: any): void {
    this.phraseSelect.emit({ alignment, version: this.versionKey });
  }

  onKey(event: KeyboardEvent, alignment: any): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.onSelect(alignment);
    }
  }
}
