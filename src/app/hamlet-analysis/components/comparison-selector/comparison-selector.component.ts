import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  VERSIONS,
  versionShortLabels,
} from '../../services/hamlet-data.service';

@Component({
  selector: 'app-ha-comparison-selector',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './comparison-selector.component.html',
  styleUrls: ['./comparison-selector.component.scss'],
})
export class ComparisonSelectorComponent {
  @Input() selectedSource = 'english';
  @Input() selectedTarget = 'context_ai_german';

  @Output() sourceChange = new EventEmitter<string>();
  @Output() targetChange = new EventEmitter<string>();

  readonly versions = VERSIONS;
  readonly versionShortLabels = versionShortLabels;

  get targetOptions(): string[] {
    return this.versions.filter((v) => v !== this.selectedSource);
  }

  onSourceChange(source: string): void {
    this.sourceChange.emit(source);
  }

  onTargetChange(target: string): void {
    if (target !== this.selectedSource) {
      this.targetChange.emit(target);
    }
  }
}
