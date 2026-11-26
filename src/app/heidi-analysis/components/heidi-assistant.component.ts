import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AssistantContext, AssistantReply, AssistantStatus, HeidiAssistantService } from '../services/heidi-assistant.service';

export const ASSISTANT_SUGGESTIONS = [
  'Explain this translation difference.',
  'Why is this phrase classified as changed?',
  'Suggest a more faithful English translation.',
  'Improve emotional preservation.',
  'Preserve the original metaphor.',
  'Preserve character voice.',
  'Restore omitted meaning.',
  'Revise translation using expert feedback.',
];

/** Ask Assistant AI drawer. Proposals are shown separately and never replace the published texts. */
@Component({
  selector: 'app-heidi-assistant',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <div class="hd-drawer-backdrop" *ngIf="open" (click)="close.emit()"></div>
  <aside class="hd-drawer" *ngIf="open && context" role="dialog" aria-modal="true" aria-labelledby="hdAiTitle" data-test="assistant-drawer"
         (keydown.escape)="close.emit()">
    <header class="hd-drawer-head">
      <div>
        <h3 id="hdAiTitle">Ask Assistant AI</h3>
        <p class="hd-drawer-sub">{{ context.passage_id }} · {{ context.dimension }}</p>
      </div>
      <button type="button" class="hd-icon-btn" (click)="close.emit()" aria-label="Close assistant">✕</button>
    </header>
    <div class="hd-drawer-body">
      <div class="hd-ai-unavailable" *ngIf="status && !status.available" role="status" data-test="assistant-unavailable">
        <strong>Assistant unavailable.</strong> {{ status.reason }} No answers are generated without a backend, so nothing here is simulated.
      </div>

      <details class="hd-ai-ctx">
        <summary>Context sent to the assistant</summary>
        <dl>
          <dt>Selection</dt><dd>{{ context.selection ? (context.selection.german || '—') + ' ↔ ' + (context.selection.english || '— (absent in English)') : 'Whole passage' }}</dd>
          <dt>Classification</dt><dd>{{ context.classification || '—' }}</dd>
          <dt>Score</dt><dd>{{ context.score === null ? 'Not evaluated' : context.score + '/100' }}</dd>
          <dt>Evidence items</dt><dd>{{ context.evidence.length }}</dd>
          <dt>Expert feedback</dt><dd>{{ context.expert_feedback || '—' }}</dd>
        </dl>
      </details>

      <div class="hd-ai-chips" role="group" aria-label="Suggested questions">
        <button type="button" class="hd-ai-chip" *ngFor="let q of suggestions" (click)="ask(q)" [disabled]="busy || !status?.available">{{ q }}</button>
      </div>
      <label class="hd-fb-label">Your question
        <textarea class="hd-input hd-textarea" rows="3" [(ngModel)]="question" placeholder="Ask about this passage, the selected phrase or a better rendering" data-test="assistant-question"></textarea>
      </label>
      <div class="hd-ai-actions">
        <button type="button" class="hd-btn hd-btn--primary" (click)="ask(question)" [disabled]="busy || !question.trim() || !status?.available" data-test="assistant-ask">{{ busy ? 'Asking…' : 'Ask' }}</button>
      </div>
      <p class="hd-fb-error" *ngIf="error" role="alert" data-test="assistant-error">{{ error }}</p>

      <ng-container *ngIf="reply">
        <div class="hd-ai-answer" data-test="assistant-answer">{{ reply.answer }}</div>
        <div class="hd-ai-proposal" *ngIf="reply.proposed_translation" data-test="assistant-proposal">
          <span class="hd-fb-kicker">Proposed English — AI suggestion, not the published translation</span>
          <p lang="en">{{ reply.proposed_translation }}</p>
          <p class="hd-ai-note">Aims to preserve the selected feature more closely; preservation is not guaranteed and needs expert judgement.<ng-container *ngIf="reply.caveats"> {{ reply.caveats }}</ng-container></p>
          <div class="hd-ai-actions">
            <button type="button" class="hd-btn hd-btn--sm" (click)="copy()" data-test="assistant-copy">{{ copied ? 'Copied' : 'Copy suggestion' }}</button>
            <button type="button" class="hd-btn hd-btn--sm" (click)="useAsCorrection.emit(reply.proposed_translation!)" data-test="assistant-use">Use as proposed correction</button>
            <button type="button" class="hd-btn hd-btn--sm" (click)="attach.emit(reply.proposed_translation!)" data-test="assistant-attach">Attach to expert feedback</button>
            <button type="button" class="hd-btn hd-btn--sm" (click)="revise()" [disabled]="busy" data-test="assistant-revise">Request another revision</button>
          </div>
        </div>
      </ng-container>
    </div>
  </aside>`,
  styleUrls: ['./heidi-drawer.css'],
})
export class HeidiAssistantComponent implements OnInit, OnChanges {
  @Input() open = false;
  @Input() context: AssistantContext | null = null;
  @Output() close = new EventEmitter<void>();
  /** Opens Expert Feedback prefilled — the scholar still has to save it. */
  @Output() useAsCorrection = new EventEmitter<string>();
  /** Appends the proposal to the expert's justification (draft only). */
  @Output() attach = new EventEmitter<string>();

  readonly suggestions = ASSISTANT_SUGGESTIONS;
  status: AssistantStatus | null = null;
  question = '';
  busy = false;
  error: string | null = null;
  reply: AssistantReply | null = null;
  copied = false;

  constructor(private assistant: HeidiAssistantService) {}

  ngOnInit(): void {
    this.assistant.status().subscribe(s => this.status = s);
  }

  ngOnChanges(ch: SimpleChanges): void {
    if (ch['context'] && !ch['context'].firstChange &&
        ch['context'].previousValue?.passage_id !== ch['context'].currentValue?.passage_id) {
      this.reply = null; this.error = null; this.question = '';
    }
  }

  ask(q: string, previous: string | null = null): void {
    if (!this.context || !q.trim() || this.busy) { return; }
    this.question = q;
    this.busy = true;
    this.error = null;
    this.copied = false;
    this.assistant.ask(this.context, q, previous).subscribe({
      next: r => { this.reply = r; this.busy = false; },
      error: e => { this.error = String(e?.message || e); this.busy = false; },
    });
  }

  revise(): void {
    this.ask('Request another revision: propose a different English rendering that preserves the selected literary feature more closely.',
      this.reply?.proposed_translation ?? null);
  }

  copy(): void {
    const t = this.reply?.proposed_translation;
    if (!t) { return; }
    navigator.clipboard?.writeText(t).then(() => this.copied = true).catch(() => this.copied = false);
  }
}
