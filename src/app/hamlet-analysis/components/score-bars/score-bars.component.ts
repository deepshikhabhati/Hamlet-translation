import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  DIMENSION_META,
  HamletDataService,
} from '../../services/hamlet-data.service';

@Component({
  selector: 'app-ha-score-bars',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './score-bars.component.html',
  styleUrls: ['./score-bars.component.scss'],
})
export class ScoreBarsComponent implements OnChanges {
  @Input() comparison: any = null;
  @Output() dimensionClick = new EventEmitter<string>();

  dimensions: {
    key: string;
    label: string;
    tooltip: string;
    score: number | null;
    applicable: boolean;
    color: string;
  }[] = [];

  readonly dimensionMeta = DIMENSION_META;

  constructor(private dataService: HamletDataService) {}

  ngOnChanges(): void {
    this.buildDimensions();
  }

  buildDimensions(): void {
    this.dimensions = DIMENSION_META.map((meta) => {
      const applicable = this.dataService.isDimensionApplicable(
        this.comparison,
        meta.key
      );
      const score = this.dataService.getDimensionScore(
        this.comparison,
        meta.key
      );
      return {
        key: meta.key,
        label: meta.label,
        tooltip: meta.tooltip,
        score,
        applicable,
        color: this.dataService.getScoreColor(score),
      };
    });
  }

  onDimensionClick(key: string): void {
    this.dimensionClick.emit(key);
  }
}
