import {
  Component,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  HamletDataService,
  PHRASE_DIMENSION_LABELS,
  TARGET_VERSIONS,
  versionLabels,
} from '../../services/hamlet-data.service';
import { HumanValidationComponent } from '../human-validation/human-validation.component';

@Component({
  selector: 'app-ha-phrase-evidence-panel',
  standalone: true,
  imports: [CommonModule, HumanValidationComponent],
  templateUrl: './phrase-evidence-panel.component.html',
  styleUrls: ['./phrase-evidence-panel.component.scss'],
})
export class PhraseEvidencePanelComponent implements OnChanges {
  @Input() open = false;
  @Input() passage: any = null;
  @Input() alignment: any = null;
  @Input() selectedDimension = 'semantic';
  @Input() selectedPhraseVersion: string | null = null;
  @Input() validationOptions: string[] = [];

  @Output() closePanel = new EventEmitter<void>();
  @Output() targetVersionChange = new EventEmitter<string>();
  @Output() dimensionChange = new EventEmitter<string>();
  @Output() validationChanged = new EventEmitter<void>();

  targetVersion = 'context_ai_german';
  readonly targetVersions = TARGET_VERSIONS;
  readonly labels = versionLabels;
  readonly dimLabels = PHRASE_DIMENSION_LABELS;

  evidence: any = null;
  sourcePhrase = '';
  targetPhrase = '';

  constructor(private dataService: HamletDataService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedPhraseVersion'] && this.selectedPhraseVersion) {
      if (this.selectedPhraseVersion !== 'english') {
        this.targetVersion = this.selectedPhraseVersion;
      }
    }
    this.refresh();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.open) {
      this.closePanel.emit();
    }
  }

  refresh(): void {
    this.sourcePhrase = this.alignment?.english_phrase?.text || '';
    const target = this.dataService.getTargetPhrase(this.alignment, this.targetVersion);
    this.targetPhrase = target?.text || '';
    this.evidence = this.dataService.getEvidence(
      this.alignment,
      this.targetVersion,
      this.selectedDimension
    );
  }

  setTarget(version: string): void {
    this.targetVersion = version;
    this.targetVersionChange.emit(version);
    this.refresh();
  }

  formatScore(score: number | null | undefined): string {
    return this.dataService.formatScore(score);
  }

  statusClass(): string {
    return this.dataService.getStatusClass(this.evidence?.status);
  }

  statusIcon(): string {
    return this.dataService.getStatusIcon(this.evidence?.status);
  }

  get originalScore(): number | null {
    if (!this.evidence || this.evidence.applicable === false) {
      return null;
    }
    return this.evidence.score ?? null;
  }

  onValidationSaved(): void {
    this.validationChanged.emit();
  }

  onValidationCleared(): void {
    this.validationChanged.emit();
  }
}
