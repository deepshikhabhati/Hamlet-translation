import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  HamletDataService,
  PhraseValidationRecord,
} from '../../services/hamlet-data.service';

@Component({
  selector: 'app-ha-human-validation',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './human-validation.component.html',
  styleUrls: ['./human-validation.component.scss'],
})
export class HumanValidationComponent implements OnChanges {
  @Input() passageId = '';
  @Input() alignmentId = '';
  @Input() targetVersion = '';
  @Input() dimension = '';
  @Input() originalScore: number | null = null;
  @Input() originalStatus = '';
  @Input() options: string[] = ['Agree', 'Partially Agree', 'Disagree'];

  @Output() saved = new EventEmitter<PhraseValidationRecord>();
  @Output() cleared = new EventEmitter<void>();

  decision: PhraseValidationRecord['decision'] = null;
  correctedStatus: string | null = null;
  correctedScore: number | null = null;
  comment = '';
  reviewer = '';
  message = '';

  readonly classificationOptions = [
    'Preserved',
    'Changed',
    'Lost',
    'Added',
    'N/A',
    'Needs Review',
  ];

  constructor(private dataService: HamletDataService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (
      changes['passageId'] ||
      changes['alignmentId'] ||
      changes['targetVersion'] ||
      changes['dimension']
    ) {
      this.load();
    }
  }

  load(): void {
    this.message = '';
    const existing = this.dataService.getValidation(
      this.passageId,
      this.alignmentId,
      this.targetVersion,
      this.dimension
    );
    if (existing) {
      this.decision = existing.decision;
      this.correctedStatus = existing.corrected_status || null;
      this.correctedScore = existing.corrected_score;
      this.comment = existing.comment || '';
      this.reviewer = existing.reviewer || '';
    } else {
      this.decision = null;
      this.correctedStatus = null;
      this.correctedScore = null;
      this.comment = '';
    }
  }

  save(): void {
    if (!this.passageId || !this.alignmentId || !this.dimension) {
      return;
    }
    const record: PhraseValidationRecord = {
      passage_id: this.passageId,
      alignment_id: this.alignmentId,
      target_version: this.targetVersion,
      dimension: this.dimension,
      decision: this.decision,
      original_status: this.originalStatus,
      corrected_status: this.correctedStatus,
      original_score: this.originalScore,
      corrected_score:
        this.correctedScore === null || this.correctedScore === ('' as any)
          ? null
          : Number(this.correctedScore),
      comment: this.comment,
      reviewer: this.reviewer,
      reviewed_at: new Date().toISOString(),
    };
    this.dataService.saveValidation(record);
    this.message = 'Validation saved locally.';
    this.saved.emit(record);
  }

  clear(): void {
    this.dataService.clearValidation(
      this.passageId,
      this.alignmentId,
      this.targetVersion,
      this.dimension
    );
    this.decision = null;
    this.correctedStatus = null;
    this.correctedScore = null;
    this.comment = '';
    this.message = 'Validation cleared.';
    this.cleared.emit();
  }
}
