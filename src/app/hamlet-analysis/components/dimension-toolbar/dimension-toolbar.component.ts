import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  PHRASE_DIMENSION_KEYS,
  PHRASE_DIMENSION_LABELS,
} from '../../services/hamlet-data.service';

@Component({
  selector: 'app-ha-dimension-toolbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dimension-toolbar.component.html',
  styleUrls: ['./dimension-toolbar.component.scss'],
})
export class DimensionToolbarComponent {
  @Input() selectedDimension = 'semantic';
  @Input() showPhraseScores = true;
  @Input() dimensionSummary: Record<string, number | null> | null = null;

  @Output() dimensionChange = new EventEmitter<string>();
  @Output() showScoresChange = new EventEmitter<boolean>();

  readonly keys = PHRASE_DIMENSION_KEYS;
  readonly labels = PHRASE_DIMENSION_LABELS;

  select(dim: string): void {
    this.dimensionChange.emit(dim);
  }

  toggleScores(): void {
    this.showScoresChange.emit(!this.showPhraseScores);
  }

  formatSummary(key: string): string {
    const v = this.dimensionSummary?.[key];
    if (v === null || v === undefined || Number.isNaN(Number(v))) {
      return 'N/A';
    }
    const n = Number(v);
    return Number.isInteger(n) ? String(n) : n.toFixed(1);
  }
}
