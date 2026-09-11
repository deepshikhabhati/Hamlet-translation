import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HamletDataService } from '../../services/hamlet-data.service';

@Component({
  selector: 'app-ha-overall-score',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './overall-score.component.html',
  styleUrls: ['./overall-score.component.scss'],
})
export class OverallScoreComponent {
  @Input() score: number | null = null;

  constructor(private dataService: HamletDataService) {}

  get label(): string {
    return this.dataService.getScoreLabel(this.score);
  }

  get color(): string {
    return this.dataService.getScoreColor(this.score);
  }

  get circumference(): number {
    return 2 * Math.PI * 54;
  }

  get dashOffset(): number {
    const pct = (this.score ?? 0) / 100;
    return this.circumference * (1 - pct);
  }

  get displayScore(): string {
    if (this.score == null) return '—';
    return this.score.toFixed(1);
  }
}
