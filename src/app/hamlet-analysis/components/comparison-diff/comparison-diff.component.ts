import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  versionShortLabels,
} from '../../services/hamlet-data.service';

@Component({
  selector: 'app-ha-comparison-diff',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './comparison-diff.component.html',
  styleUrls: ['./comparison-diff.component.scss'],
})
export class ComparisonDiffComponent {
  @Input() comparison: any = null;
  @Input() selectedCategory: string | null = null;

  @Output() categoryChange = new EventEmitter<string | null>();

  readonly versionShortLabels = versionShortLabels;

  get sourceLabel(): string {
    return versionShortLabels[this.comparison?.source_version] ?? 'Source';
  }

  get targetLabel(): string {
    return versionShortLabels[this.comparison?.target_version] ?? 'Target';
  }
}
