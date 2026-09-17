import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
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
export class VersionCardsComponent implements OnChanges {
  @Input() texts: Record<string, string> = {};
  @Input() selectedSource = 'english';
  @Input() selectedTarget = 'context_ai_german';
  @Input() evidencePassage: any = null;
  @Input() selectedPassage: any = null;

  @Output() sourceChange = new EventEmitter<string>();
  @Output() targetChange = new EventEmitter<string>();

  readonly versions = VERSIONS;
  readonly versionLabels = versionLabels;
  readonly translatableVersions = ['ai_german', 'context_ai_german'];

  translationView: Record<string, 'german' | 'english_translation'> = {
    ai_german: 'german',
    context_ai_german: 'german',
  };

  expanded: Record<string, boolean> = {};
  clickStep: 'source' | 'target' = 'source';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedPassage'] || changes['evidencePassage']) {
      this.resetTranslationViews();
    }
  }

  resetTranslationViews(): void {
    this.translationView = {
      ai_german: 'german',
      context_ai_german: 'german',
    };
  }

  canToggleTranslation(version: string): boolean {
    return this.translatableVersions.includes(version);
  }

  hasEnglishTranslation(version: string): boolean {
    if (!this.canToggleTranslation(version)) {
      return false;
    }
    const value = this.evidencePassage?.english_back_translations?.[version];
    return typeof value === 'string' && value.trim().length > 0;
  }

  isTranslationActive(version: string): boolean {
    return this.translationView[version] === 'english_translation';
  }

  toggleTranslation(version: string, event?: Event): void {
    event?.stopPropagation();
    if (!this.hasEnglishTranslation(version)) {
      return;
    }
    this.translationView[version] =
      this.translationView[version] === 'german'
        ? 'english_translation'
        : 'german';
  }

  getDisplayedVersionText(version: string): string {
    if (
      this.translationView[version] === 'english_translation' &&
      this.hasEnglishTranslation(version)
    ) {
      return this.evidencePassage.english_back_translations[version];
    }
    return this.selectedPassage?.texts?.[version] || this.texts?.[version] || '';
  }

  translationAriaLabel(version: string): string {
    return this.isTranslationActive(version)
      ? 'Show German original'
      : 'Show English translation';
  }

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
    const text = this.getDisplayedVersionText(version);
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
