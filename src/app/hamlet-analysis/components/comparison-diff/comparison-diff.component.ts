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

  readonly categories = [
    { key: 'semantic_preservation', label: 'Semantic', icon: 'fa-brain' },
    { key: 'emotion', label: 'Emotion', icon: 'fa-heart' },
    { key: 'metaphor_imagery', label: 'Metaphor', icon: 'fa-feather-alt' },
    { key: 'tone', label: 'Tone', icon: 'fa-volume-up' },
    { key: 'character_voice', label: 'Voice', icon: 'fa-user' },
    { key: 'wordplay', label: 'Wordplay', icon: 'fa-puzzle-piece' },
    { key: 'cultural_archaic_language', label: 'Archaic', icon: 'fa-landmark' },
    { key: 'omissions_additions', label: 'Omissions', icon: 'fa-cut' },
    { key: 'human_preference', label: 'Preference', icon: 'fa-thumbs-up' },
  ];

  toggleCategory(key: string): void {
    const next = this.selectedCategory === key ? null : key;
    this.categoryChange.emit(next);
  }

  isActive(key: string): boolean {
    return this.selectedCategory === key;
  }

  get sourceLabel(): string {
    return versionShortLabels[this.comparison?.source_version] ?? 'Source';
  }

  get targetLabel(): string {
    return versionShortLabels[this.comparison?.target_version] ?? 'Target';
  }
}
