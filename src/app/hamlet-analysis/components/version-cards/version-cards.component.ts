import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  VERSIONS,
  versionLabels,
} from '../../services/hamlet-data.service';

@Component({
  selector: 'app-ha-version-cards',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './version-cards.component.html',
  styleUrls: ['./version-cards.component.scss'],
})
export class VersionCardsComponent {
  @Input() texts: Record<string, string> = {};
  @Input() selectedSource = 'english';
  @Input() selectedTarget = 'context_ai_german';

  @Output() sourceChange = new EventEmitter<string>();
  @Output() targetChange = new EventEmitter<string>();

  readonly versions = VERSIONS;
  readonly versionLabels = versionLabels;

  expanded: Record<string, boolean> = {};
  clickStep: 'source' | 'target' = 'source';

  onCardClick(version: string): void {
    if (this.clickStep === 'source') {
      this.sourceChange.emit(version);
      this.clickStep = 'target';
      if (this.selectedTarget === version) {
        const alt = this.versions.find((v) => v !== version);
        if (alt) {
          this.targetChange.emit(alt);
        }
      }
    } else {
      if (version !== this.selectedSource) {
        this.targetChange.emit(version);
      }
      this.clickStep = 'source';
    }
  }

  toggleExpand(version: string, event: Event): void {
    event.stopPropagation();
    this.expanded[version] = !this.expanded[version];
  }

  copyText(version: string, event: Event): void {
    event.stopPropagation();
    const text = this.texts[version] ?? '';
    navigator.clipboard?.writeText(text);
  }

  isExpanded(version: string): boolean {
    return !!this.expanded[version];
  }

  cardClass(version: string): string {
    if (version === this.selectedSource) return 'source';
    if (version === this.selectedTarget) return 'target';
    return '';
  }

  truncate(text: string, max = 120): string {
    if (!text) return '';
    if (text.length <= max) return text;
    return text.slice(0, max) + '…';
  }
}
