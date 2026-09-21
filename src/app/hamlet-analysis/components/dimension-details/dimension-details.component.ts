import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HamletDataService } from '../../services/hamlet-data.service';

@Component({
  selector: 'app-ha-dimension-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dimension-details.component.html',
  styleUrls: ['./dimension-details.component.scss'],
})
export class DimensionDetailsComponent {
  @Input() comparison: any = null;
  @Input() highlightCategory: string | null = null;
  @Output() dimensionClick = new EventEmitter<string>();

  constructor(private dataService: HamletDataService) {}

  onDimensionClick(key: string): void {
    this.dimensionClick.emit(key);
  }

  sectionClass(key: string): string {
    const base = 'dim-section';
    return this.highlightCategory === key ? `${base} dim-section--highlight` : base;
  }

  isWordplayApplicable(): boolean {
    return this.comparison?.wordplay?.applicable !== false;
  }

  importanceClass(importance: string): string {
    const map: Record<string, string> = {
      low: 'importance--low',
      medium: 'importance--medium',
      high: 'importance--high',
    };
    return map[importance?.toLowerCase()] ?? 'importance--medium';
  }

  scoreColor(key: string): string {
    return this.dataService.getScoreColor(
      this.dataService.getDimensionScore(this.comparison, key)
    );
  }

  formatScore(key: string): string {
    const score = this.dataService.getDimensionScore(this.comparison, key);
    if (score == null) return 'N/A';
    return String(score);
  }
}
