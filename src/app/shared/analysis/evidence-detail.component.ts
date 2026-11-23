import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PHRASE_CATEGORIES, PhraseCategory, categoryMeta } from './phrase-categories';
import { EvidenceDecision, EvidenceReviewRecord, EvidenceReviewService, ProjectId } from './evidence-review.service';

/** View-model for one evidence item, built by each project from its own data. */
export interface EvidenceVm {
  project: ProjectId;
  evidenceId: string;
  dimensionKey: string;
  dimensionLabel: string;
  location: string;
  sourceLabel: string;
  sourcePhrase: string | null;
  translationLabel: string;
  translationPhrase: string | null;
  backTranslationPhrase: string | null;
  category: PhraseCategory;
  directScore: number | null;
  rttScore: number | null;
  explanation: string | null;
  alignmentConfidence: string | null;
  method: string | null;
  provenance: string | null;
  unlocated?: boolean;
  /** Project-specific extra rows (e.g. Heidi: weight, span status, review flag). */
  details?: { label: string; value: string }[];
  /** Short note shown above the grid (e.g. passage-level evidence without a highlight). */
  notice?: string | null;
}

/**
 * Evidence Inspector body. Expert decisions are stored separately (EvidenceReviewService);
 * the machine assessment shown here is never modified.
 */
@Component({
  selector: 'app-evidence-detail',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="sa-card ed" *ngIf="ev" role="region" aria-label="Evidence inspector" data-test="evidence-detail">
      <div class="sa-head">
        <div>
          <h4 class="sa-h4">Evidence Inspector</h4>
          <p class="sa-muted">{{ ev.location }} · <code>{{ ev.evidenceId }}</code></p>
        </div>
        <div class="sa-row">
          <span class="sa-cat" [style.background]="meta(ev.category).background" [style.color]="meta(ev.category).color" [style.borderColor]="meta(ev.category).color" data-test="ed-machine-cat">
            <i [style.background]="meta(ev.category).color"></i>Machine: {{ ev.category }}</span>
          <span class="sa-cat" *ngIf="review" style="background:#eff6ff;color:#1d4ed8;border-color:#93c5fd" data-test="ed-expert">Expert: {{ decisionLabel(review) }}</span>
          <button type="button" class="sa-btn" (click)="close.emit()" aria-label="Close evidence inspector">✕</button>
        </div>
      </div>

      <p class="ed-unlocated" *ngIf="ev.unlocated" data-test="ed-unlocated">Unlocated evidence — the recorded phrase could not be matched to the displayed text. Routed to review.</p>

      <p class="ed-notice" *ngIf="ev.notice" data-test="ed-notice">{{ ev.notice }}</p>

      <dl class="ed-grid">
        <div><dt>Dimension</dt><dd>{{ ev.dimensionLabel }}</dd></div>
        <div><dt>Direct score</dt><dd>{{ ev.directScore === null ? 'Not evaluated' : ev.directScore + '/100' }}</dd></div>
        <div><dt>RTT score</dt><dd>{{ ev.rttScore === null ? 'Not evaluated' : ev.rttScore + '/100' }}</dd></div>
        <div><dt>Alignment confidence</dt><dd>{{ ev.alignmentConfidence || '—' }}</dd></div>
        <div class="ed-wide"><dt>{{ ev.sourceLabel }}</dt><dd class="ed-phrase">{{ ev.sourcePhrase || '— (none on this side)' }}</dd></div>
        <div class="ed-wide"><dt>{{ ev.translationLabel }}</dt><dd class="ed-phrase">{{ ev.translationPhrase || '— (none on this side)' }}</dd></div>
        <div class="ed-wide"><dt>Back-translation</dt><dd class="ed-phrase">{{ ev.backTranslationPhrase || 'Not available' }}</dd></div>
        <div class="ed-wide"><dt>Explanation</dt><dd>{{ ev.explanation || '—' }}</dd></div>
        <div *ngFor="let d of ev.details || []"><dt>{{ d.label }}</dt><dd>{{ d.value }}</dd></div>
        <div class="ed-wide"><dt>Method / provenance</dt><dd class="sa-muted">{{ ev.method || '—' }}<ng-container *ngIf="ev.provenance"> · {{ ev.provenance }}</ng-container></dd></div>
      </dl>

      <div class="sa-row ed-actions" role="group" aria-label="Evidence review actions">
        <button type="button" class="sa-btn" (click)="decide('accept')" data-test="ed-accept">Accept evidence</button>
        <button type="button" class="sa-btn" (click)="decide('reject')" data-test="ed-reject">Reject evidence</button>
        <button type="button" class="sa-btn" (click)="mode = mode === 'revise' ? null : 'revise'" [class.on]="mode === 'revise'" data-test="ed-revise">Revise</button>
        <button type="button" class="sa-btn" (click)="mode = mode === 'reclassify' ? null : 'reclassify'" [class.on]="mode === 'reclassify'" data-test="ed-reclassify">Correct classification</button>
        <button type="button" class="sa-btn" (click)="mode = mode === 'realign' ? null : 'realign'" [class.on]="mode === 'realign'" data-test="ed-realign">Correct phrase alignment</button>
        <button type="button" class="sa-btn" (click)="decide('uncertain')" data-test="ed-uncertain">Mark uncertain</button>
        <button type="button" class="sa-btn" *ngIf="hasPrev" (click)="prev.emit()" data-test="ed-prev">← Previous evidence</button>
        <button type="button" class="sa-btn sa-btn--primary" (click)="next.emit()" [disabled]="!hasNext" data-test="ed-next">Next evidence →</button>
      </div>

      <div class="ed-form" *ngIf="mode === 'reclassify'">
        <label class="sa-muted">Corrected category
          <select class="sa-input" [(ngModel)]="category" data-test="ed-category">
            <option *ngFor="let c of categories" [ngValue]="c.key">{{ c.key }}</option>
          </select>
        </label>
        <button type="button" class="sa-btn sa-btn--primary" (click)="decide('reclassify')" data-test="ed-save-reclassify">Save classification</button>
      </div>
      <div class="ed-form" *ngIf="mode === 'revise'" data-test="ed-revise-form">
        <label class="sa-muted">Classification
          <select class="sa-input" [(ngModel)]="category" data-test="ed-rev-category">
            <option *ngFor="let c of categories" [ngValue]="c.key">{{ c.key }}</option>
          </select>
        </label>
        <label class="sa-muted">Expert score for {{ ev.dimensionLabel }} (0–100, optional)
          <input class="sa-input" type="number" min="0" max="100" [(ngModel)]="score" data-test="ed-rev-score" /></label>
        <label class="sa-muted ed-grow">Corrected explanation
          <textarea class="sa-input" [(ngModel)]="explanation" data-test="ed-rev-explanation"></textarea></label>
        <label class="sa-muted">Corrected {{ ev.sourceLabel }} phrase <input class="sa-input" [(ngModel)]="srcPhrase" data-test="ed-rev-src" /></label>
        <label class="sa-muted">Corrected {{ ev.translationLabel }} phrase <input class="sa-input" [(ngModel)]="tgtPhrase" data-test="ed-rev-tgt" /></label>
        <button type="button" class="sa-btn sa-btn--primary" (click)="decide('revise')" data-test="ed-save-revise">Save revision</button>
        <p class="sa-muted" *ngIf="scoreError" data-test="ed-rev-error">{{ scoreError }}</p>
      </div>
      <div class="ed-form" *ngIf="mode === 'realign'">
        <label class="sa-muted">Corrected {{ ev.sourceLabel }} phrase <input class="sa-input" [(ngModel)]="srcPhrase" data-test="ed-src-phrase" /></label>
        <label class="sa-muted">Corrected {{ ev.translationLabel }} phrase <input class="sa-input" [(ngModel)]="tgtPhrase" data-test="ed-tgt-phrase" /></label>
        <button type="button" class="sa-btn sa-btn--primary" (click)="decide('realign')" data-test="ed-save-realign">Save alignment</button>
      </div>
      <label class="sa-muted ed-note">Reviewer note <textarea class="sa-input" [(ngModel)]="note" aria-label="Reviewer note"></textarea></label>
      <p class="sa-muted" *ngIf="review">Saved {{ review.reviewed_at | date:'medium' }}. Machine assessment preserved: {{ review.original.category }}.
        <ng-container *ngIf="review.corrected_explanation"> Expert explanation: “{{ review.corrected_explanation }}”.</ng-container>
        <ng-container *ngIf="review.corrected_score !== null && review.corrected_score !== undefined"> Expert score: {{ review.corrected_score }}/100.</ng-container>
        <button type="button" class="sa-btn" (click)="undo()" data-test="ed-undo">Undo decision</button></p>
    </section>`,
  styleUrls: ['./analysis-shared.css'],
  styles: [`
    .ed-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 6px 16px; margin: 6px 0 10px; }
    .ed-grid dt { font-size: 10.5px; text-transform: uppercase; letter-spacing: .05em; color: #64748b; }
    .ed-grid dd { margin: 0; font-size: 13px; overflow-wrap: anywhere; }
    .ed-wide { grid-column: 1 / -1; }
    .ed-phrase { font-family: Georgia, serif; font-size: 14px !important; }
    .ed-notice { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 10px; font-size: 12.5px; color: #334155; }
    .ed-grow { flex: 1 1 260px; }
    .ed-unlocated { background: #f1f5f9; border: 1px dotted #64748b; border-radius: 6px; padding: 6px 10px; font-size: 12.5px; color: #334155; }
    .ed-actions { margin-bottom: 8px; }
    .ed-form { display: flex; flex-wrap: wrap; gap: 8px; align-items: flex-end; margin-bottom: 8px; }
    .ed-form label { display: flex; flex-direction: column; gap: 2px; }
    .ed-note { display: block; }
  `],
})
export class EvidenceDetailComponent implements OnChanges {
  @Input() ev: EvidenceVm | null = null;
  @Input() hasNext = false;
  @Input() hasPrev = false;
  @Input() reviewer: string | null = null;
  @Output() next = new EventEmitter<void>();
  @Output() prev = new EventEmitter<void>();
  @Output() close = new EventEmitter<void>();
  @Output() decided = new EventEmitter<EvidenceReviewRecord | null>();

  readonly categories = PHRASE_CATEGORIES;
  mode: 'reclassify' | 'realign' | 'revise' | null = null;
  category: PhraseCategory = 'Preserved';
  srcPhrase = '';
  tgtPhrase = '';
  note = '';
  explanation = '';
  score: number | null = null;
  scoreError: string | null = null;
  review: EvidenceReviewRecord | null = null;

  constructor(private reviews: EvidenceReviewService) {}

  ngOnChanges(): void {
    this.mode = null;
    if (!this.ev) { this.review = null; return; }
    this.review = this.reviews.get(this.ev.project, this.ev.evidenceId);
    this.category = this.review?.corrected_category ?? this.ev.category;
    this.srcPhrase = this.review?.corrected_source_phrase ?? this.ev.sourcePhrase ?? '';
    this.tgtPhrase = this.review?.corrected_target_phrase ?? this.ev.translationPhrase ?? '';
    this.note = this.review?.note ?? '';
    this.explanation = this.review?.corrected_explanation ?? this.ev.explanation ?? '';
    this.score = this.review?.corrected_score ?? null;
    this.scoreError = null;
  }

  meta(c: PhraseCategory) { return categoryMeta(c); }

  decisionLabel(r: EvidenceReviewRecord): string {
    switch (r.decision) {
      case 'accept': return 'Accepted';
      case 'reject': return 'Rejected';
      case 'reclassify': return `Reclassified → ${r.corrected_category}`;
      case 'realign': return 'Alignment corrected';
      case 'revise': return `Revised${r.corrected_category ? ' → ' + r.corrected_category : ''}`;
      default: return 'Marked uncertain';
    }
  }

  decide(decision: EvidenceDecision): void {
    if (!this.ev) { return; }
    const ev = this.ev;
    const sc = this.score === null || (this.score as any) === '' ? null : Number(this.score);
    if (decision === 'revise' && sc !== null && (isNaN(sc) || sc < 0 || sc > 100)) {
      this.scoreError = 'Score must be between 0 and 100, or left empty.';
      return;
    }
    this.scoreError = null;
    this.review = this.reviews.record({
      evidence_id: ev.evidenceId,
      project: ev.project,
      location: ev.location,
      dimension: ev.dimensionKey,
      decision,
      corrected_category: decision === 'reclassify' || decision === 'revise' ? this.category : null,
      corrected_source_phrase: decision === 'realign' || decision === 'revise' ? (this.srcPhrase || null) : null,
      corrected_target_phrase: decision === 'realign' || decision === 'revise' ? (this.tgtPhrase || null) : null,
      corrected_explanation: decision === 'revise' ? (this.explanation || null) : null,
      corrected_score: decision === 'revise' ? sc : null,
      note: this.note || null,
      reviewer: this.reviewer,
      original: { category: ev.category, source_phrase: ev.sourcePhrase, target_phrase: ev.translationPhrase, method: ev.method },
    });
    this.mode = null;
    this.decided.emit(this.review);
  }

  undo(): void {
    if (!this.ev) { return; }
    this.reviews.clear(this.ev.project, this.ev.evidenceId);
    this.review = null;
    this.decided.emit(null);
  }
}
