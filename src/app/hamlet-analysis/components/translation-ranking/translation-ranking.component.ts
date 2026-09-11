import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { versionLabels } from '../../services/hamlet-data.service';

@Component({
  selector: 'app-ha-translation-ranking',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './translation-ranking.component.html',
  styleUrls: ['./translation-ranking.component.scss'],
})
export class TranslationRankingComponent implements OnChanges {
  @Input() ranking: { version: string; overall_score: number }[] = [];

  sorted: { version: string; overall_score: number; rank: number }[] = [];
  readonly versionLabels = versionLabels;

  ngOnChanges(): void {
    this.sorted = [...(this.ranking ?? [])]
      .sort((a, b) => b.overall_score - a.overall_score)
      .map((item, i) => ({ ...item, rank: i + 1 }));
  }

  podiumOrder(): { version: string; overall_score: number; rank: number }[] {
    if (this.sorted.length < 3) return this.sorted;
    return [this.sorted[1], this.sorted[0], this.sorted[2]];
  }

  podiumHeight(rank: number): string {
    if (rank === 1) return '100px';
    if (rank === 2) return '72px';
    return '56px';
  }

  medalIcon(rank: number): string {
    if (rank === 1) return 'fa-trophy';
    if (rank === 2) return 'fa-medal';
    return 'fa-award';
  }
}
