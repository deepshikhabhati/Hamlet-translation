import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DISAGREEMENT_LABELS, disagreementOf } from './phrase-categories';

export interface RttPanelText { label: string; sublabel?: string; text: string | null; lang: string; ai?: boolean; }
export interface RttPanelRow { key: string; name: string; direct: number | null; rtt: number | null; rttMethod?: string | null; }
export interface RttProvenance { translationModel: string | null; similarityModel: string | null; generatedAt: string | null; source?: string | null; }

/**
 * Round-trip / reverse-translation comparison panel shared by Hamlet and Heidi.
 * Shows only RTT scores that were actually computed (semantic in both projects);
 * every other dimension is "Not evaluated" — RTT values are never copied across dimensions.
 */
@Component({
  selector: 'app-rtt-compare-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="sa-card" role="region" [attr.aria-label]="title" data-test="rtt-panel">
      <div class="sa-head">
        <div>
          <h4 class="sa-h4">{{ title }}</h4>
          <p class="sa-sub">{{ direction }}</p>
          <p class="sa-muted" *ngIf="directionNote" style="margin:2px 0 0">{{ directionNote }}</p>
        </div>
        <div class="sa-tabs" role="tablist" aria-label="RTT view">
          <button type="button" role="tab" [class.on]="mode === 'direct'" [attr.aria-selected]="mode === 'direct'" (click)="mode = 'direct'" data-test="rttp-direct">Direct Assessment</button>
          <button type="button" role="tab" [class.on]="mode === 'rtt'" [attr.aria-selected]="mode === 'rtt'" (click)="mode = 'rtt'" data-test="rttp-rtt">RTT Assessment</button>
          <button type="button" role="tab" [class.on]="mode === 'compare'" [attr.aria-selected]="mode === 'compare'" (click)="mode = 'compare'" data-test="rttp-compare">Compare Both</button>
        </div>
      </div>

      <div class="sa-panels">
        <div *ngFor="let t of texts" class="sa-panel" [class.sa-panel--ai]="t.ai">
          <h5>{{ t.label }} <span class="sa-muted" *ngIf="t.sublabel" style="text-transform:none;letter-spacing:0">{{ t.sublabel }}</span><span class="sa-ai-tag" *ngIf="t.ai">AI-generated</span></h5>
          <p [attr.lang]="t.lang" [attr.data-test]="t.ai ? 'rttp-bt' : null">{{ t.text || (t.ai ? 'Not generated yet.' : '—') }}</p>
        </div>
      </div>

      <div class="sa-notrun" *ngIf="!hasRtt" data-test="rttp-not-run">
        <strong>RTT Not Run</strong>
        <span>No back-translation exists for this {{ unitLabel }}, so no RTT score is shown.</span>
        <button type="button" class="sa-btn sa-btn--primary" (click)="generate.emit()" [disabled]="!!disabledReason || busy" data-test="rttp-generate">{{ busy ? 'Generating…' : 'Generate Back-Translation' }}</button>
        <span class="sa-muted" *ngIf="disabledReason">{{ disabledReason }}</span>
      </div>
      <p class="sa-err" *ngIf="error">{{ error }}</p>

      <div class="sa-table-wrap">
        <table class="sa-table" data-test="rttp-table">
          <thead><tr>
            <th>Dimension</th>
            <th class="num" *ngIf="mode !== 'rtt'">Direct</th>
            <th class="num" *ngIf="mode !== 'direct'">RTT</th>
            <th class="num" *ngIf="mode === 'compare'">Difference</th>
            <th>Status</th>
            <th>Evidence</th>
          </tr></thead>
          <tbody>
            <tr *ngFor="let r of rows" [class.on]="r.key === activeKey" (click)="selectDimension.emit(r.key)" [attr.data-test]="'rttp-row-' + r.key">
              <td><strong>{{ r.name }}</strong></td>
              <td class="num" *ngIf="mode !== 'rtt'"><span *ngIf="r.direct !== null">{{ fmt(r.direct) }}</span><span *ngIf="r.direct === null" class="sa-na">N/A</span></td>
              <td class="num" *ngIf="mode !== 'direct'"><span *ngIf="r.rtt !== null" [title]="r.rttMethod || ''">{{ fmt(r.rtt) }}</span><span *ngIf="r.rtt === null" class="sa-na">—</span></td>
              <td class="num" *ngIf="mode === 'compare'"><span class="sa-diff" *ngIf="dis(r).diff !== null">{{ dis(r).diff! > 0 ? '+' : '' }}{{ fmt(dis(r).diff!) }}</span><span *ngIf="dis(r).diff === null" class="sa-na">—</span></td>
              <td><span class="sa-badge" [ngClass]="'sa-badge--' + statusFor(r)">{{ statusText(r) }}</span></td>
              <td><button type="button" class="sa-btn" [class.on]="r.key === activeKey" (click)="$event.stopPropagation(); selectDimension.emit(r.key)">{{ r.key === activeKey ? 'Active' : 'Select' }}</button></td>
            </tr>
          </tbody>
        </table>
      </div>

      <p class="sa-sub" *ngIf="explanation" style="margin-top:8px" data-test="rttp-explanation">{{ explanation }}</p>
      <div class="sa-prov">
        <label>Disagreement threshold
          <input type="number" min="1" max="60" step="1" class="sa-input" style="width:64px" [ngModel]="threshold" (ngModelChange)="thresholdChange.emit(+$event)" data-test="rttp-threshold" aria-label="Disagreement threshold in points" /> points
        </label>
        · not calibrated against expert judgements — above-threshold differences are only <em>potential</em> disagreements.
        <br />Back-translation model <code>{{ provenance?.translationModel || '—' }}</code> · similarity <code>{{ provenance?.similarityModel || '—' }}</code>
        <ng-container *ngIf="provenance?.generatedAt"> · generated {{ provenance?.generatedAt | date:'medium' }}</ng-container>
        <ng-container *ngIf="provenance?.source"> · source: {{ provenance?.source }}</ng-container>
      </div>
    </section>`,
  styleUrls: ['./analysis-shared.css'],
})
export class RttComparePanelComponent {
  @Input() title = 'Round-Trip Translation (RTT) Analysis';
  @Input() direction = '';
  @Input() directionNote: string | null = null;
  @Input() texts: RttPanelText[] = [];
  @Input() rows: RttPanelRow[] = [];
  @Input() activeKey: string | null = null;
  @Input() threshold = 15;
  @Input() provenance: RttProvenance | null = null;
  @Input() explanation: string | null = null;
  @Input() busy = false;
  @Input() error: string | null = null;
  @Input() disabledReason: string | null = null;
  @Input() unitLabel = 'passage';
  @Input() mode: 'direct' | 'rtt' | 'compare' = 'compare';
  @Output() selectDimension = new EventEmitter<string>();
  @Output() generate = new EventEmitter<void>();
  @Output() thresholdChange = new EventEmitter<number>();

  get hasRtt(): boolean {
    return this.rows.some(r => r.rtt !== null);
  }

  dis(r: RttPanelRow) {
    return disagreementOf(r.direct, r.rtt, this.threshold);
  }

  statusFor(r: RttPanelRow): string {
    if (this.mode === 'direct') { return r.direct === null ? 'not_evaluated' : 'agree'; }
    if (this.mode === 'rtt') { return r.rtt === null ? 'not_evaluated' : 'agree'; }
    return this.dis(r).status;
  }

  statusText(r: RttPanelRow): string {
    if (this.mode === 'direct') { return r.direct === null ? 'Not evaluated' : 'Direct assessment'; }
    if (this.mode === 'rtt') { return r.rtt === null ? 'Not evaluated' : 'RTT computed'; }
    return DISAGREEMENT_LABELS[this.dis(r).status];
  }

  fmt(v: number): string {
    return (Math.round(v * 10) / 10).toString();
  }
}
