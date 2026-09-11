import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  VERSIONS,
  versionShortLabels,
} from '../../services/hamlet-data.service';

@Component({
  selector: 'app-ha-comparison-matrix',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './comparison-matrix.component.html',
  styleUrls: ['./comparison-matrix.component.scss'],
})
export class ComparisonMatrixComponent {
  @Input() matrix: Record<string, Record<string, number | null>> = {};
  @Input() selectedSource = 'english';
  @Input() selectedTarget = 'context_ai_german';

  @Output() selectComparison = new EventEmitter<{ source: string; target: string }>();

  readonly versions = VERSIONS;
  readonly versionShortLabels = versionShortLabels;

  getScore(source: string, target: string): number | null {
    if (source === target) return null;
    return this.matrix?.[source]?.[target] ?? null;
  }

  cellClass(source: string, target: string): string {
    const classes = ['matrix-cell'];
    if (source === target) {
      classes.push('matrix-cell--diag');
      return classes.join(' ');
    }
    if (source === this.selectedSource && target === this.selectedTarget) {
      classes.push('matrix-cell--selected');
    }
    return classes.join(' ');
  }

  cellBackground(source: string, target: string): string {
    if (source === target) return '#f1f5f9';
    const score = this.getScore(source, target);
    if (score == null) return '#fff';
    const t = score / 100;
    const r = Math.round(255 - t * (255 - 30));
    const g = Math.round(255 - t * (255 - 99));
    const b = Math.round(255 - t * (255 - 235));
    return `rgb(${r}, ${g}, ${b})`;
  }

  onCellClick(source: string, target: string): void {
    if (source === target) return;
    this.selectComparison.emit({ source, target });
  }

  formatScore(source: string, target: string): string {
    if (source === target) return '—';
    const score = this.getScore(source, target);
    return score != null ? score.toFixed(1) : '—';
  }
}
