import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeidiDimensionKey, HeidiDimensionReview, HeidiPassageReview } from '../models/heidi.models';

export interface FeedbackSelection {
  kind: 'phrase' | 'sentence';
  id: string;
  label: string;
  german: string | null;
  english: string | null;
  explanation: string;
}

export interface FeedbackSaveEvent {
  review: HeidiPassageReview;
  reviewer: string;
  selection: FeedbackSelection | null;
}

type Decision = 'accept' | 'reject' | 'revise';

/**
 * Expert Feedback drawer. Edits a working copy of the passage review; nothing is stored until "Save Feedback".
 * Existing decisions, timestamps and the export format (heidi_analysis_reviews_v2) are unchanged.
 */
@Component({
  selector: 'app-heidi-expert-feedback',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <div class="hd-drawer-backdrop" *ngIf="open" (click)="cancel.emit()"></div>
  <aside class="hd-drawer" *ngIf="open && draft" role="dialog" aria-modal="true" aria-labelledby="hdFbTitle" data-test="feedback-drawer"
         (keydown.escape)="cancel.emit()">
    <header class="hd-drawer-head">
      <div>
        <h3 id="hdFbTitle">Expert Feedback</h3>
        <p class="hd-drawer-sub">{{ passageId }} · {{ dimensionLabel }}</p>
      </div>
      <button type="button" class="hd-icon-btn" (click)="cancel.emit()" aria-label="Close Expert Feedback">✕</button>
    </header>

    <div class="hd-drawer-body">
      <section class="hd-fb-context">
        <div class="hd-fb-row"><span>Current assessment</span><strong data-test="fb-current">{{ currentAssessment }}</strong></div>
        <div class="hd-fb-row"><span>Current score</span><strong data-test="fb-score">{{ currentScore === null ? notScoredLabel : currentScore + '/100' }}</strong></div>
        <div class="hd-fb-sel" *ngIf="selection">
          <span class="hd-fb-kicker">Selected {{ selection.kind }} · {{ selection.label }}</span>
          <p *ngIf="selection.german" lang="de" class="hd-fb-quote">{{ selection.german }}</p>
          <p *ngIf="selection.english" lang="en" class="hd-fb-quote">{{ selection.english }}</p>
        </div>
      </section>

      <fieldset class="hd-fb-field">
        <legend>Decision</legend>
        <div class="hd-seg" role="radiogroup" aria-label="Decision">
          <button type="button" role="radio" *ngFor="let d of decisions" [attr.aria-checked]="decision === d.key"
                  [class.on]="decision === d.key" [ngClass]="'hd-seg--' + d.key" (click)="decision = d.key" [attr.data-test]="'fb-' + d.key">{{ d.label }}</button>
        </div>
      </fieldset>

      <div class="hd-fb-grid">
        <label class="hd-fb-label">Revised classification <span class="hd-opt">optional</span>
          <select class="hd-input" [(ngModel)]="dim.revised_classification" data-test="fb-class">
            <option [ngValue]="null">— keep current —</option>
            <option *ngFor="let c of classes" [ngValue]="c">{{ c }}</option>
          </select>
        </label>
        <label class="hd-fb-label">Corrected score (0–100) <span class="hd-opt">optional</span>
          <input class="hd-input" type="number" min="0" max="100" step="1" [(ngModel)]="dim.score_override" placeholder="e.g. 85" aria-describedby="hdFbScoreHelp" data-test="fb-score-input" />
          <span class="hd-opt" id="hdFbScoreHelp">Leave empty to keep the current score.</span>
        </label>
      </div>
      <p class="hd-fb-error" *ngIf="error" role="alert" data-test="fb-error">{{ error }}</p>

      <label class="hd-fb-label">Corrected translation or phrase <span class="hd-opt">optional</span>
        <textarea class="hd-input hd-textarea" rows="3" [(ngModel)]="dim.corrected_translation" placeholder="Your proposed English rendering of the selected passage or phrase" data-test="fb-translation"></textarea>
        <span class="hd-opt" *ngIf="dim.corrected_translation_source === 'ai_assistant_approved'">Proposed by the AI assistant and approved by you.</span>
      </label>

      <label class="hd-fb-label">Reviewer
        <input class="hd-input" type="text" [(ngModel)]="reviewerName" placeholder="Name and affiliation, e.g. Prof. J. Schmidt (German Philology)" data-test="fb-reviewer" />
      </label>

      <label class="hd-fb-label">Scholarly feedback and justification
        <textarea class="hd-input hd-textarea" rows="5" [(ngModel)]="dim.comment" placeholder="Explain what is preserved, changed, lost or added, and why" data-test="fb-comment"></textarea>
      </label>

      <details class="hd-fb-adv" data-test="fb-advanced">
        <summary>Advanced review</summary>
        <div class="hd-fb-label">Alignment of this passage
          <div class="hd-seg" role="radiogroup" aria-label="Alignment decision">
            <button type="button" [class.on]="draft.alignment.decision === 'accept'" (click)="draft.alignment.decision = 'accept'">Accept alignment</button>
            <button type="button" [class.on]="draft.alignment.decision === 'correct'" (click)="draft.alignment.decision = 'correct'">Correct alignment</button>
            <button type="button" [class.on]="draft.alignment.decision === 'reject'" (click)="draft.alignment.decision = 'reject'">Reject alignment</button>
          </div>
        </div>
        <label class="hd-fb-label" *ngIf="draft.alignment.decision === 'correct' || draft.alignment.decision === 'reject'">Alignment note
          <textarea class="hd-input hd-textarea" rows="2" [(ngModel)]="draft.alignment.correction_note" placeholder="Correct pairing, e.g. DE paragraph 16 ↔ EN paragraph 17"></textarea>
        </label>
        <label class="hd-fb-label">Omission / addition in this passage
          <select class="hd-input" [(ngModel)]="draft.omission_addition">
            <option [ngValue]="null">— not assessed —</option>
            <option value="none">None</option>
            <option value="omission">Omission by the translator</option>
            <option value="addition">Addition by the translator</option>
            <option value="both">Both</option>
          </select>
        </label>
        <label class="hd-fb-check"><input type="checkbox" [(ngModel)]="draft.rtt_inaccurate" /> The AI back-translation for this passage is inaccurate</label>
        <label class="hd-fb-label">Corrected round-trip semantic score (0–100) <span class="hd-opt">optional</span>
          <input class="hd-input" type="number" min="0" max="100" [(ngModel)]="draft.rtt_corrected_semantic_score" />
        </label>
        <label class="hd-fb-label">Passage commentary
          <textarea class="hd-input hd-textarea" rows="3" [(ngModel)]="draft.commentary" placeholder="Notes that apply to the whole passage"></textarea>
        </label>
      </details>
    </div>

    <footer class="hd-drawer-foot">
      <span class="hd-opt" *ngIf="draft.reviewed_at">Last saved {{ draft.reviewed_at | date:'medium' }}<ng-container *ngIf="draft.reviewer"> by {{ draft.reviewer }}</ng-container></span>
      <span class="hd-grow"></span>
      <button type="button" class="hd-btn" (click)="cancel.emit()" data-test="fb-cancel">Cancel</button>
      <button type="button" class="hd-btn hd-btn--primary" (click)="submit()" data-test="fb-save">Save Feedback</button>
    </footer>
  </aside>`,
  styleUrls: ['./heidi-drawer.css'],
})
export class HeidiExpertFeedbackComponent implements OnChanges {
  @Input() open = false;
  @Input() passageId = '';
  @Input() dimensionKey: HeidiDimensionKey = 'semantic';
  @Input() dimensionLabel = '';
  @Input() currentAssessment = '';
  @Input() currentScore: number | null = null;
  @Input() notScoredLabel = 'Not evaluated';
  @Input() selection: FeedbackSelection | null = null;
  @Input() review: HeidiPassageReview | null = null;
  @Input() reviewer = '';
  /** A proposal the scholar chose to use from the AI assistant (prefills the corrected translation). */
  @Input() proposedCorrection: string | null = null;
  @Output() save = new EventEmitter<FeedbackSaveEvent>();
  @Output() cancel = new EventEmitter<void>();

  readonly decisions: { key: Decision; label: string }[] = [
    { key: 'accept', label: 'Accept' }, { key: 'reject', label: 'Reject' }, { key: 'revise', label: 'Needs Revision' },
  ];
  readonly classes = ['Preserved', 'Changed', 'Lost', 'Added', 'Uncertain'] as const;

  draft: HeidiPassageReview | null = null;
  dim: HeidiDimensionReview = { decision: null, score_override: null, comment: null };
  decision: Decision | null = null;
  reviewerName = '';
  error: string | null = null;

  ngOnChanges(ch: SimpleChanges): void {
    if ((ch['open'] && this.open) || (this.open && (ch['review'] || ch['dimensionKey'] || ch['proposedCorrection']))) {
      this.draft = this.review ? JSON.parse(JSON.stringify(this.review)) : null;
      if (!this.draft) { return; }
      const d = this.draft.dimensions[this.dimensionKey] ?? { decision: null, score_override: null, comment: null };
      this.dim = { revised_classification: null, corrected_translation: null, ...d };
      this.decision = d.decision === 'override' ? 'revise' : (d.decision as Decision | null);
      if (this.proposedCorrection) {
        this.dim.corrected_translation = this.proposedCorrection;
        this.dim.corrected_translation_source = 'ai_assistant_approved';
      }
      this.reviewerName = this.reviewer || this.draft.reviewer || '';
      this.error = null;
    }
  }

  submit(): void {
    if (!this.draft) { return; }
    const raw = this.dim.score_override as unknown;
    const sc = raw === null || raw === undefined || raw === '' ? null : Number(raw);
    if (sc !== null && (isNaN(sc) || sc < 0 || sc > 100)) {
      this.error = 'The corrected score must be a number from 0 to 100, or left empty.';
      return;
    }
    const rtt = this.draft.rtt_corrected_semantic_score as unknown;
    const rs = rtt === null || rtt === undefined || rtt === '' ? null : Number(rtt);
    if (rs !== null && (isNaN(rs) || rs < 0 || rs > 100)) {
      this.error = 'The corrected round-trip score must be a number from 0 to 100, or left empty.';
      return;
    }
    this.draft.rtt_corrected_semantic_score = rs;
    if (!this.dim.corrected_translation) { this.dim.corrected_translation_source = null; }
    else if (!this.dim.corrected_translation_source) { this.dim.corrected_translation_source = 'expert'; }
    this.draft.dimensions[this.dimensionKey] = { ...this.dim, decision: this.decision, score_override: sc };
    this.error = null;
    this.save.emit({ review: this.draft, reviewer: this.reviewerName.trim(), selection: this.selection });
  }
}
