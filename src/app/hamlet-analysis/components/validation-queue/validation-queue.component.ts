import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface QueueItem {
  review_id?: string;
  dialogue_id: string;
  speaker: string;
  act: number;
  scene_id: string;
  scene_title: string;
  english: string;
  versionKey: string;
  versionName: string;
  dimKey: string;
  dimName: string;
  score: number | null;
  confidence: number | null;
  issueType: string;
  priority: number;
  explanation: string;
  reasons?: string[];
  evidenceValidity?: 'Valid' | 'Invalid offset' | 'No evidence';
}

@Component({
  selector: 'app-ha-validation-queue',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="queue-view-wrapper">
      <div class="queue-card">
        <div class="queue-header-row">
          <div>
            <h2 class="queue-title">Validation Queue</h2>
            <p class="queue-description">
              Expert review queue covering <strong>{{ uniqueDialogueCount }} unique dialogues</strong> across <strong>{{ items.length }} flagged assessments</strong> (derived from model review flags, confidence &lt; 0.70, and invalid evidence offsets).
            </p>
          </div>
          <div class="queue-summary-pills">
            <span class="queue-pill queue-pill--dlgs">{{ uniqueDialogueCount }} Unique Dialogues</span>
            <span class="queue-pill queue-pill--assessments">{{ items.length }} Assessments</span>
            <span class="queue-pill queue-pill--done">{{ reviewedCount }} Reviewed</span>
          </div>
        </div>

        <div class="queue-progress-bar-bg" role="progressbar" [attr.aria-valuenow]="reviewedCount" [attr.aria-valuemax]="items.length">
          <div class="queue-progress-bar-fill" [style.width.%]="progressPercent"></div>
        </div>

        <div class="queue-controls-row">
          <div role="group" aria-label="Status filter" class="filter-btn-group">
            <button
              type="button"
              class="filter-btn"
              [attr.aria-pressed]="statusFilter === 'open'"
              (click)="setStatusFilter('open')"
            >Pending ({{ openCount }})</button>
            <button
              type="button"
              class="filter-btn"
              [attr.aria-pressed]="statusFilter === 'done'"
              (click)="setStatusFilter('done')"
            >Reviewed ({{ reviewedCount }})</button>
            <button
              type="button"
              class="filter-btn"
              [attr.aria-pressed]="statusFilter === 'all'"
              (click)="setStatusFilter('all')"
            >All ({{ items.length }})</button>
          </div>

          <label class="issue-select-label">Filter issue
            <select class="issue-select" [(ngModel)]="issueFilter">
              <option value="all">All issues ({{ items.length }})</option>
              <option value="invalid_evidence">Invalid evidence spans</option>
              <option value="model_needs_review">Model needs review</option>
              <option value="low_confidence">Low confidence (&lt;0.70)</option>
              <option value="pending">Pending expert review</option>
              <option value="completed">Completed expert review</option>
            </select>
          </label>
        </div>

        <div class="queue-table-scroll">
          <div class="queue-table-inner">
            <div class="queue-thead">
              <span>Priority</span>
              <span>Dialogue &amp; Scene</span>
              <span>English excerpt</span>
              <span>Translation</span>
              <span>Dimension</span>
              <span>Score &amp; Conf</span>
              <span>Review Reason</span>
              <span>Status</span>
              <span>Action</span>
            </div>

            <div *ngFor="let q of filteredItems" class="queue-row">
              <span class="queue-priority" [ngClass]="'pri-' + q.priority">{{ getPriorityLabel(q.priority) }}</span>
              <span class="queue-loc">
                <strong class="queue-scene-title">{{ q.dialogue_id }}</strong>
                <span class="queue-diag-id">{{ q.scene_title }} &bull; {{ q.speaker }}</span>
              </span>
              <span class="queue-english-excerpt" [title]="q.english">{{ q.english }}</span>
              <span class="queue-dim-name">
                <span class="queue-badge-ver">{{ q.versionName }}</span>
              </span>
              <span class="queue-dim-name">{{ q.dimName }}</span>
              <span class="queue-issue-col">
                <strong>{{ q.score !== null ? q.score : 'N/A' }}</strong>
                <span class="queue-ver-sub" *ngIf="q.confidence !== null">Conf: {{ (q.confidence * 100) | number:'1.0-0' }}%</span>
              </span>
              <span class="queue-issue-col">
                <span class="queue-reason-tag" [ngClass]="getReasonClass(q)">{{ q.issueType }}</span>
                <span *ngIf="q.evidenceValidity === 'Invalid offset'" class="queue-invalid-badge">Invalid span offset</span>
              </span>
              <span class="queue-status-col" [class.is-done]="isReviewed(q.dialogue_id)">
                {{ isReviewed(q.dialogue_id) ? 'Reviewed' : 'Pending' }}
              </span>
              <button
                type="button"
                class="queue-action-btn"
                (click)="onReviewClick(q)"
              >Inspect</button>
            </div>

            <div *ngIf="filteredItems.length === 0" class="queue-empty-message">
              No items match this filter criteria.
            </div>
          </div>
        </div>

      </div>
    </div>
  `,
  styles: [`
    .queue-view-wrapper {
      max-width: 1680px;
      margin: 20px auto 40px;
      padding: 0 24px;
      box-sizing: border-box;
    }
    .queue-card {
      background: var(--surface, #FBFBFC);
      border: 1px solid var(--line, #D8DCE3);
      border-radius: 8px;
      padding: 18px 20px 22px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .queue-header-row {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: baseline;
      gap: 6px 16px;
    }
    .queue-title {
      margin: 0;
      font-size: 22px;
      font-weight: 600;
      letter-spacing: -0.01em;
      color: var(--ink, #1A1F2B);
    }
    .queue-progress-count {
      font-size: 13px;
      color: var(--ink-2, #384152);
      font-variant-numeric: tabular-nums;
    }
    .queue-progress-bar-bg {
      height: 6px;
      background: var(--surface-2, #ECEFF4);
      border-radius: 3px;
      overflow: hidden;
    }
    .queue-progress-bar-fill {
      height: 100%;
      background: var(--accent, #2F5FA8);
      transition: width 200ms ease;
    }
    .queue-description {
      margin: 0;
      font-size: 14px;
      color: var(--ink-2, #384152);
      max-width: 75ch;
    }
    .queue-controls-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 10px 24px;
    }
    .filter-btn-group {
      display: flex;
      border: 1px solid var(--line, #D8DCE3);
      border-radius: 6px;
      overflow: hidden;
    }
    .filter-btn {
      border: 0;
      font: inherit;
      font-size: 13px;
      padding: 0 12px;
      min-height: 36px;
      cursor: pointer;
      background: var(--surface, #FBFBFC);
      color: var(--ink-2, #384152);
    }
    .filter-btn + .filter-btn {
      border-left: 1px solid var(--line, #D8DCE3);
    }
    .filter-btn[aria-pressed="true"] {
      background: var(--ink, #1A1F2B);
      color: var(--on-dark, #F6F7FA);
      font-weight: 600;
    }
    .issue-select-label {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: var(--muted, #566072);
    }
    .issue-select {
      font: inherit;
      font-size: 13px;
      color: var(--ink, #1A1F2B);
      min-height: 36px;
      padding: 0 8px;
      border: 1px solid var(--line, #D8DCE3);
      border-radius: 6px;
      background: var(--surface, #FBFBFC);
    }
    .queue-table-scroll {
      overflow-x: auto;
    }
    .queue-table-inner {
      min-width: 900px;
    }
    .queue-summary-pills {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }
    .queue-pill {
      font-size: 12px;
      font-weight: 600;
      padding: 4px 10px;
      border-radius: 9999px;
      border: 1px solid var(--line, #D8DCE3);
      background: var(--surface, #FBFBFC);
    }
    .queue-pill--dlgs {
      background: #eff6ff;
      color: #1e40af;
      border-color: #bfdbfe;
    }
    .queue-pill--assessments {
      background: #fdf4ff;
      color: #86198f;
      border-color: #f5d0fe;
    }
    .queue-pill--done {
      background: #ecfdf5;
      color: #065f46;
      border-color: #a7f3d0;
    }
    .queue-badge-ver {
      display: inline-block;
      font-size: 11px;
      font-weight: 600;
      padding: 2px 6px;
      border-radius: 4px;
      background: #f1f5f9;
      color: #334155;
    }
    .queue-reason-tag {
      display: inline-block;
      font-size: 11px;
      font-weight: 500;
      padding: 2px 6px;
      border-radius: 4px;
      background: #fef3c7;
      color: #92400e;
    }
    .queue-reason-tag.is-invalid {
      background: #fee2e2;
      color: #991b1b;
      font-weight: 600;
    }
    .queue-invalid-badge {
      display: block;
      font-size: 10px;
      color: #dc2626;
      font-weight: 600;
      margin-top: 2px;
    }
    .queue-thead {
      display: grid;
      grid-template-columns: 65px minmax(130px, 1.1fr) minmax(200px, 1.8fr) 100px 110px 85px 140px 80px 80px;
      gap: 8px;
      padding: 6px 4px;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--muted, #566072);
      border-bottom: 1px solid var(--line, #D8DCE3);
    }
    .queue-row {
      display: grid;
      grid-template-columns: 65px minmax(130px, 1.1fr) minmax(200px, 1.8fr) 100px 110px 85px 140px 80px 80px;
      gap: 8px;
      align-items: center;
      padding: 10px 4px;
      border-bottom: 1px solid var(--line-soft, #E6E9EE);
    }
    .queue-priority {
      font-size: 12px;
    }
    .pri-3 {
      color: #b91c1c;
      font-weight: 700;
    }
    .pri-2 {
      color: #b45309;
      font-weight: 600;
    }
    .pri-1 {
      color: var(--muted, #566072);
    }
    .queue-loc {
      display: flex;
      flex-direction: column;
      line-height: 1.3;
    }
    .queue-scene-title {
      font-size: 13px;
      color: var(--ink, #1A1F2B);
    }
    .queue-diag-id {
      font-size: 11px;
      color: var(--muted, #566072);
      font-variant-numeric: tabular-nums;
    }
    .queue-english-excerpt {
      font-family: 'Source Serif 4', Georgia, serif;
      font-size: 14px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      color: #1e293b;
    }
    .queue-dim-name {
      font-size: 13px;
      color: #334155;
    }
    .queue-issue-col {
      font-size: 12px;
      color: var(--ink-2, #384152);
    }
    .queue-ver-sub {
      display: block;
      font-size: 11px;
      color: var(--muted, #566072);
    }
    .queue-status-col {
      font-size: 12px;
      color: var(--ink-2, #384152);
    }
    .queue-status-col.is-done {
      color: #047857;
      font-weight: 600;
    }
    .queue-action-btn {
      font: inherit;
      font-size: 12px;
      font-weight: 600;
      min-height: 32px;
      padding: 0 10px;
      border-radius: 6px;
      border: 1px solid #1e3a8a;
      background: #eff6ff;
      color: #1e3a8a;
      cursor: pointer;
      white-space: nowrap;
      transition: all 120ms ease;
    }
    .queue-action-btn:hover {
      background: #1e3a8a;
      color: #ffffff;
    }
    .queue-empty-message {
      padding: 24px 8px;
      font-size: 14px;
      color: var(--muted, #566072);
      text-align: center;
    }
  `]
})
export class ValidationQueueComponent {
  @Input() items: QueueItem[] = [];
  @Input() validations: Record<string, any> = {};

  @Output() itemReview = new EventEmitter<QueueItem>();

  statusFilter: 'open' | 'done' | 'all' = 'open';
  issueFilter: string = 'all';

  get uniqueDialogueCount(): number {
    return new Set(this.items.map((i) => i.dialogue_id)).size;
  }

  get openCount(): number {
    return this.items.filter((item) => !this.isReviewed(item.dialogue_id)).length;
  }

  get reviewedCount(): number {
    return this.items.filter((item) => this.isReviewed(item.dialogue_id)).length;
  }

  get progressPercent(): number {
    if (this.items.length === 0) return 0;
    return Math.round((this.reviewedCount / this.items.length) * 100);
  }

  get filteredItems(): QueueItem[] {
    return this.items.filter((item) => {
      const done = this.isReviewed(item.dialogue_id);
      if (this.statusFilter === 'open' && done) return false;
      if (this.statusFilter === 'done' && !done) return false;

      if (this.issueFilter === 'invalid_evidence') {
        const isInv = item.issueType.includes('Invalid') || item.evidenceValidity === 'Invalid offset' || (item.reasons && item.reasons.includes('invalid_evidence_span'));
        if (!isInv) return false;
      } else if (this.issueFilter === 'model_needs_review') {
        const isNeeds = item.issueType.includes('Needs review') || (item.reasons && item.reasons.includes('model_needs_review'));
        if (!isNeeds) return false;
      } else if (this.issueFilter === 'low_confidence') {
        const isLowConf = item.issueType.includes('Low confidence') || (item.confidence !== null && item.confidence < 0.70) || (item.reasons && item.reasons.includes('low_confidence_below_0.70'));
        if (!isLowConf) return false;
      } else if (this.issueFilter === 'pending') {
        if (done) return false;
      } else if (this.issueFilter === 'completed') {
        if (!done) return false;
      }

      return true;
    });
  }

  isReviewed(dialogueId: string): boolean {
    return !!this.validations[dialogueId];
  }

  getPriorityLabel(pri: number): string {
    if (pri === 3) return 'High';
    if (pri === 2) return 'Med';
    return 'Low';
  }

  getReasonClass(q: QueueItem): string {
    if (q.issueType.includes('Invalid') || q.evidenceValidity === 'Invalid offset' || (q.reasons && q.reasons.includes('invalid_evidence_span'))) {
      return 'is-invalid';
    }
    return '';
  }

  setStatusFilter(filter: 'open' | 'done' | 'all'): void {
    this.statusFilter = filter;
  }

  onReviewClick(item: QueueItem): void {
    this.itemReview.emit(item);
  }
}
