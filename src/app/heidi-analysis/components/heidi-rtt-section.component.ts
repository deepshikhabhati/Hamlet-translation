import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EnRoundTripRecord, RttRecord } from '../services/heidi-rtt.service';

export interface BertScoreRecord { f1_x100: number; model: string; chunked: boolean }

/** Neutral status labels — no "Agreement" verdict from an uncalibrated threshold. */
export function rttStatusLabel(r: RttRecord | null | undefined): string {
  if (!r) { return 'Not evaluated'; }
  switch (r.status) {
    case 'disagreement': return 'Potential disagreement';
    case 'agreement': return 'Evaluated';
    case 'expert_reviewed': return 'Expert reviewed';
    case 'running': return 'Running';
    case 'failed': return 'Failed';
    default: return 'Not evaluated';
  }
}

/**
 * One compact, collapsed-by-default Round-Trip Translation section.
 * Workflow "de": German original → AI English (compared with Stork's English).
 * Workflow "en": Stork's English → AI German → AI English. The AI German is never presented as Spyri's text.
 */
@Component({
  selector: 'app-heidi-rtt-section',
  standalone: true,
  imports: [CommonModule],
  template: `
  <section class="hrs" data-test="rtt-section">
    <button type="button" class="hrs-head" (click)="expanded = !expanded" [attr.aria-expanded]="expanded" data-test="rtt-toggle">
      <span class="hrs-title">Round-Trip Translation</span>
      <span class="hrs-score" *ngIf="recA?.rtt_semantic_score !== null && recA?.rtt_semantic_score !== undefined" data-test="rtt-head-score">
        {{ recA!.rtt_semantic_score }}<small>/100</small></span>
      <span class="hrs-status" [attr.data-status]="statusA" data-test="rtt-status">{{ statusA }}</span>
      <span class="hrs-chev" aria-hidden="true">{{ expanded ? '▾' : '▸' }}</span>
    </button>

    <div class="hrs-body" *ngIf="expanded" data-test="rtt-body">
      <div class="hrs-switch" role="tablist" aria-label="Round-trip workflow">
        <button type="button" role="tab" [attr.aria-selected]="mode === 'de'" [class.on]="mode === 'de'" (click)="mode = 'de'" data-test="rtt-mode-de">German original → AI English</button>
      </div>

      <ng-container *ngIf="mode === 'de'">
        <div class="hrs-cols">
          <div><span class="hrs-lbl">Human English (Stork)</span><p lang="en">{{ english || '—' }}</p></div>
          <div><span class="hrs-lbl">German original (Spyri)</span><p lang="de">{{ german || '—' }}</p></div>
          <div><span class="hrs-lbl">AI English (machine translation of the German)</span>
            <p lang="en" *ngIf="recA?.back_translated_english as bt; else noBt" data-test="rtt-ai-en">{{ bt }}</p>
            <ng-template #noBt><p class="hrs-muted">Not generated yet.</p></ng-template></div>
        </div>
        <div class="hrs-metrics">
          <span>Direct semantic assessment <strong>{{ direct === null ? 'Not evaluated' : direct + '/100' }}</strong></span>
          <span>RTT similarity <strong data-test="rtt-sim">{{ recA?.rtt_semantic_score ?? '—' }}</strong></span>
          <span *ngIf="bert">BERTScore-based similarity <strong data-test="rtt-bert">{{ bert.f1_x100 }}</strong></span>
          <span *ngIf="recA?.disagreement !== null && recA?.disagreement !== undefined" title="Different methods: indicative only">Difference <strong>{{ recA!.disagreement }}</strong></span>
        </div>
        <p class="hrs-note">Similarity scores compare English with English; they are not literary preservation scores and are never applied to other dimensions.</p>
        <p class="hrs-err" *ngIf="errorA">{{ errorA }}</p>
        <button type="button" class="hrs-btn" (click)="generateA.emit()" [disabled]="busyA || !german || !english" data-test="rtt-generate">
          {{ busyA ? 'Generating…' : (recA?.back_translated_english ? 'Regenerate' : 'Generate') }}</button>
      </ng-container>

      <ng-container *ngIf="mode === 'en'">
        <div class="hrs-cols">
          <div><span class="hrs-lbl">Human English (Stork)</span><p lang="en">{{ english || '—' }}</p></div>
          <div><span class="hrs-lbl">AI German (machine translation of Stork — not Spyri's original)</span>
            <p lang="de" *ngIf="recB?.ai_german as g; else noG" data-test="rtt-b-de">{{ g }}</p><ng-template #noG><p class="hrs-muted">Not generated yet.</p></ng-template></div>
          <div><span class="hrs-lbl">AI English (back from the AI German)</span>
            <p lang="en" *ngIf="recB?.ai_back_english as e; else noE" data-test="rtt-b-en">{{ e }}</p><ng-template #noE><p class="hrs-muted">Not generated yet.</p></ng-template></div>
        </div>
        <div class="hrs-metrics">
          <span>Round-trip similarity to Stork <strong data-test="rtt-b-sim">{{ recB?.similarity_to_human_english ?? '—' }}</strong></span>
        </div>
        <p class="hrs-note">Tests how stable Stork's English is under machine round-tripping; it says nothing about fidelity to Spyri.</p>
        <p class="hrs-err" *ngIf="recB?.error">{{ recB?.error }}</p>
        <button type="button" class="hrs-btn" (click)="generateB.emit()" [disabled]="busyB || !english" data-test="rtt-b-run">
          {{ busyB ? 'Generating…' : (recB?.status === 'done' ? 'Regenerate' : 'Generate') }}</button>
      </ng-container>
    </div>
  </section>`,
  styles: [`
    .hrs { border: 1px solid #e2e8f0; border-radius: 8px; background: #fff; }
    .hrs-head { width: 100%; display: flex; align-items: center; gap: 10px; padding: 9px 12px; border: 0; background: transparent; cursor: pointer; text-align: left;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .hrs-title { font-size: 13px; font-weight: 700; color: #0f172a; flex: 1; }
    .hrs-score { font-size: 14px; font-weight: 700; color: #1e3a8a; }
    .hrs-score small { font-weight: 400; color: #64748b; }
    .hrs-status { font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 999px; background: #f1f5f9; color: #475569; }
    .hrs-status[data-status="Potential disagreement"] { background: #fef3c7; color: #92400e; }
    .hrs-status[data-status="Evaluated"] { background: #e0f2fe; color: #075985; }
    .hrs-status[data-status="Expert reviewed"] { background: #e0e7ff; color: #3730a3; }
    .hrs-status[data-status="Failed"] { background: #fee2e2; color: #991b1b; }
    .hrs-chev { color: #64748b; }
    .hrs-body { border-top: 1px solid #e2e8f0; padding: 10px 12px 12px; display: flex; flex-direction: column; gap: 10px; }
    .hrs-switch { display: inline-flex; flex-wrap: wrap; border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden; align-self: flex-start; }
    .hrs-switch button { border: 0; border-right: 1px solid #cbd5e1; background: #fff; padding: 6px 12px; font-size: 12px; cursor: pointer; color: #334155; }
    .hrs-switch button:last-child { border-right: 0; }
    .hrs-switch button.on { background: #eff6ff; color: #1d4ed8; font-weight: 700; }
    .hrs-cols { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
    @media (max-width: 900px) { .hrs-cols { grid-template-columns: minmax(0, 1fr); } }
    .hrs-lbl { display: block; font-size: 10.5px; text-transform: uppercase; letter-spacing: .05em; color: #64748b; margin-bottom: 4px; }
    .hrs-cols p { margin: 0; font-family: Georgia, 'Palatino Linotype', serif; font-size: 15px; line-height: 1.55; color: #0f172a; white-space: pre-line; }
    .hrs-cols p.hrs-muted, .hrs-muted { font-family: inherit; font-size: 12.5px; color: #94a3b8; }
    .hrs-metrics { display: flex; flex-wrap: wrap; gap: 6px 18px; font-size: 12.5px; color: #475569; }
    .hrs-metrics strong { color: #0f172a; }
    .hrs-note { margin: 0; font-size: 11.5px; color: #64748b; }
    .hrs-err { margin: 0; font-size: 12px; color: #b91c1c; }
    .hrs-btn { align-self: flex-start; height: 32px; padding: 0 14px; border: 1px solid #2563eb; background: #fff; color: #1d4ed8; border-radius: 6px;
      font-size: 12.5px; font-weight: 600; cursor: pointer; }
    .hrs-btn:disabled { opacity: .5; cursor: default; }
  `],
})
export class HeidiRttSectionComponent {
  @Input() german: string | null = null;
  @Input() english: string | null = null;
  @Input() recA: RttRecord | null = null;
  @Input() recB: EnRoundTripRecord | null = null;
  @Input() bert: BertScoreRecord | null = null;
  @Input() direct: number | null = null;
  @Input() busyA = false;
  @Input() busyB = false;
  @Input() errorA: string | null = null;
  @Input() expanded = false;
  @Output() generateA = new EventEmitter<void>();
  @Output() generateB = new EventEmitter<void>();
  mode: 'de' | 'en' = 'de';

  get statusA(): string { return rttStatusLabel(this.recA); }
}
