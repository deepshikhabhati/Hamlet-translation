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
  AlignedPhraseGroup,
  DimensionEvidenceRecord,
  EvidenceConcept,
  HamletDataService,
  PHRASE_DIMENSION_LABELS,
  STATUS_META,
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
  @Input() alignment: AlignedPhraseGroup | any = null;
  @Input() selectedDimension = 'semantic';
  @Input() selectedPhraseVersion: string | null = null;
  @Input() selectedConcept: EvidenceConcept | null = null;
  @Input() selectedConceptId: string | null = null;
  @Input() validationOptions: string[] = [];

  @Output() closePanel = new EventEmitter<void>();
  @Output() targetVersionChange = new EventEmitter<string>();
  @Output() dimensionChange = new EventEmitter<string>();
  @Output() validationChanged = new EventEmitter<void>();

  targetVersion = 'context_ai_german';
  readonly targetVersions = TARGET_VERSIONS;
  readonly labels = versionLabels;
  readonly dimLabels = PHRASE_DIMENSION_LABELS;
  readonly statusMeta = STATUS_META;

  showTechnicalDetails = false;

  dimRecord?: DimensionEvidenceRecord;
  englishText = '';
  humanText = '';
  aiText = '';
  contextText = '';

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
    if (!this.alignment) {
      this.dimRecord = undefined;
      return;
    }

    this.englishText =
      this.alignment.spans?.english?.[0]?.text ||
      this.alignment.english_phrase?.text ||
      '';
    this.humanText =
      this.alignment.spans?.human_german?.[0]?.text ||
      this.alignment.targets?.human_german?.text ||
      '';
    this.aiText =
      this.alignment.spans?.ai_german?.[0]?.text ||
      this.alignment.targets?.ai_german?.text ||
      '';
    this.contextText =
      this.alignment.spans?.context_ai_german?.[0]?.text ||
      this.alignment.targets?.context_ai_german?.text ||
      '';

    if (this.alignment.dimensions?.[this.selectedDimension]) {
      this.dimRecord = this.alignment.dimensions[this.selectedDimension];
    } else {
      // Fallback
      const target = this.alignment.targets?.[this.targetVersion];
      const ev = target?.evidence?.find((e: any) => e.dimension === this.selectedDimension);
      this.dimRecord = {
        applicable: ev?.applicable !== false,
        feature_label: ev?.feature_label || this.dimLabels[this.selectedDimension],
        classifications: {
          human_german: this.alignment.targets?.human_german?.evidence?.find((e: any) => e.dimension === this.selectedDimension)?.status || 'N/A',
          ai_german: this.alignment.targets?.ai_german?.evidence?.find((e: any) => e.dimension === this.selectedDimension)?.status || 'N/A',
          context_ai_german: this.alignment.targets?.context_ai_german?.evidence?.find((e: any) => e.dimension === this.selectedDimension)?.status || 'N/A',
        },
        relevant_spans: { english: [], human_german: [], ai_german: [], context_ai_german: [] },
        computed_rule_evidence: (ev?.rules || []).map((r: any) => ({
          rule_id: typeof r === 'string' ? r : r.rule_id,
          description: typeof r === 'string' ? this.dataService.describeRule(r) : r.description,
        })),
        explanation: ev?.explanation || 'No detailed explanation available.',
        technical_score: ev?.score ?? null,
        confidence: 0.9,
      };
    }
  }

  setTarget(version: string): void {
    this.targetVersion = version;
    this.targetVersionChange.emit(version);
  }

  toggleTechnical(): void {
    this.showTechnicalDetails = !this.showTechnicalDetails;
  }

  formatScore(score: number | null | undefined): string {
    return this.dataService.formatScore(score);
  }

  getStatusMeta(status: string) {
    return this.statusMeta[status] || this.statusMeta['N/A'];
  }

  getClassification(version: string): string {
    return this.dimRecord?.classifications?.[version] || 'N/A';
  }

  getClassificationStatusMeta(version: string) {
    return this.getStatusMeta(this.getClassification(version));
  }

  get targetClassification(): string {
    return this.getClassification(this.targetVersion);
  }

  get originalScore(): number | null {
    return this.dimRecord?.technical_score ?? null;
  }

  get lengthRatio(): string {
    const srcLen = this.englishText.length;
    const tgtLen = (this.alignment.raw_targets?.[this.targetVersion]?.text || '').length;
    if (!srcLen || !tgtLen) return 'N/A';
    return (tgtLen / srcLen).toFixed(2);
  }

  onValidationSaved(): void {
    this.validationChanged.emit();
  }

  onValidationCleared(): void {
    this.validationChanged.emit();
  }
}
