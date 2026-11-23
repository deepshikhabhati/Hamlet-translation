import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DISAGREEMENT_LABELS, disagreementOf } from './phrase-categories';

export type ScoreProvenance = 'automated_heuristic' | 'model_assisted' | 'provisional' | 'expert_validated' | 'expert_override' | 'none';

export const PROVENANCE_LABELS: Record<ScoreProvenance, string> = {
  automated_heuristic: 'Automated heuristic · provisional',
  model_assisted: 'Model-assisted assessment · provisional',
  provisional: 'Machine-generated initial assessment · provisional',
  expert_validated: 'Expert-validated',
  expert_override: 'Expert override (machine score preserved)',
  none: 'Not evaluated',
};

/** Compact "selected dimension" summary: direct score, RTT score, difference, status and provenance. */
@Component({
  selector: 'app-dimension-summary',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="sa-card ds" [attr.aria-label]="dimensionLabel + ' summary'" data-test="dim-summary">
      <div class="ds-title">
        <h4 class="sa-h4">{{ dimensionLabel }}</h4>
        <span class="ds-warn" *ngIf="reviewWarning" title="Flagged for expert review">⚠ review</span>
        <span class="sa-muted ds-prov">{{ provenanceLabel || labels[provenance] }}</span>
      </div>
      <dl class="ds-grid">
        <div><dt>Direct score</dt><dd data-test="ds-direct">{{ direct === null || direct === undefined ? 'Not evaluated' : fmt(direct) + '/100' }}</dd></div>
        <div><dt>RTT score</dt><dd data-test="ds-rtt">{{ rtt === null || rtt === undefined ? 'Not evaluated' : fmt(rtt) + '/100' }}</dd></div>
        <div><dt>Difference</dt><dd data-test="ds-diff">{{ d.abs === null ? '—' : fmt(d.abs) + ' points' }}</dd></div>
        <div><dt>Status</dt><dd><span class="sa-badge" [ngClass]="'sa-badge--' + d.status" data-test="ds-status">{{ statusLabels[d.status] }}</span></dd></div>
      </dl>
      <p class="sa-muted ds-note" *ngIf="note">{{ note }}</p>
    </section>`,
  styleUrls: ['./analysis-shared.css'],
  styles: [`
    .ds { padding: 10px 14px; }
    .ds-title { display: flex; flex-wrap: wrap; align-items: baseline; gap: 6px 12px; }
    .ds-prov { margin-left: auto; }
    .ds-warn { font-size: 11px; font-weight: 700; color: #b45309; background: #fef3c7; border-radius: 999px; padding: 1px 8px; }
    .ds-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 6px 16px; margin: 8px 0 0; }
    .ds-grid dt { font-size: 10.5px; text-transform: uppercase; letter-spacing: .05em; color: #64748b; }
    .ds-grid dd { margin: 0; font-size: 15px; font-weight: 700; font-variant-numeric: tabular-nums; }
    .ds-note { margin: 6px 0 0; }
  `],
})
export class DimensionSummaryComponent {
  @Input() dimensionLabel = '';
  @Input() direct: number | null | undefined = null;
  @Input() rtt: number | null | undefined = null;
  @Input() threshold = 15;
  @Input() provenance: ScoreProvenance = 'none';
  @Input() provenanceLabel: string | null = null;
  @Input() reviewWarning = false;
  @Input() note: string | null = null;
  readonly labels = PROVENANCE_LABELS;
  readonly statusLabels = DISAGREEMENT_LABELS;

  get d() {
    return disagreementOf(this.direct ?? null, this.rtt ?? null, this.threshold);
  }

  fmt(v: number): string {
    return (Math.round(v * 10) / 10).toString();
  }
}
