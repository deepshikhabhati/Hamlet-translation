import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PhraseEvidence } from '../../models/hamlet-analysis-v15.models';

export interface TextSegment {
  text: string;
  isHighlighted: boolean;
  status?: string;
  isSource?: boolean;
  needsReview?: boolean;
  evidence?: PhraseEvidence;
  linkId?: string;
}

/**
 * Unicode-safe substring slicing using code-point indexing
 */
export function codePointSlice(text: string, start: number, end: number): string {
  if (!text) return '';
  return Array.from(text).slice(start, end).join('');
}

export function codePointLength(text: string): number {
  if (!text) return 0;
  return Array.from(text).length;
}

@Component({
  selector: 'app-ha-evidence-highlighted-text',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="ha-highlighted-content literary-text">
      <ng-container *ngFor="let seg of segments">
        <span
          *ngIf="seg.isHighlighted; else plainText"
          class="ev-span"
          [ngClass]="getSegmentClasses(seg)"
          [class.ev-span-active-link]="seg.linkId && activeLinkId === seg.linkId"
          (mouseenter)="onSegmentHover(seg, $event)"
          (mouseleave)="onSegmentLeave()"
          (click)="onSegmentClick(seg, $event)"
          (keydown.enter)="onSegmentClick(seg, $any($event))"
          tabindex="0"
          role="button"
          [attr.aria-label]="segmentLabel(seg)"
          [attr.data-category]="categoryOf(seg)"
        >{{ seg.text }}</span>
        <ng-template #plainText>{{ seg.text }}</ng-template>
      </ng-container>
      <span *ngIf="!text" class="text-muted italic">{{ fallbackText }}</span>
    </span>
  `,
  styles: [`
    .literary-text {
      font-family: 'Source Serif 4', Georgia, Cambria, 'Times New Roman', Times, serif;
      font-size: 16px;
      line-height: 1.55;
      color: var(--ink, #1A1F2B);
      white-space: pre-line;
    }
    .ev-span {
      position: relative;
      cursor: pointer;
      text-decoration: underline;
      text-decoration-thickness: 2px;
      text-underline-offset: 3px;
      transition: all 120ms ease;
    }
    .ev-span-preserved {
      text-decoration-color: #16a34a;
      color: #14513F;
      background: rgba(22, 163, 74, 0.08);
      border-radius: 2px;
    }
    .ev-span-changed {
      text-decoration-color: #d97706;
      color: #92400e;
      background: rgba(217, 119, 6, 0.10);
      border-radius: 2px;
    }
    .ev-span-lost {
      text-decoration-color: #dc2626;
      color: #991b1b;
      background: rgba(220, 38, 38, 0.08);
      border-radius: 2px;
    }
    .ev-span-added {
      text-decoration-color: #9333ea;
      color: #6b21a8;
      background: rgba(147, 51, 234, 0.08);
      border-radius: 2px;
    }
    .ev-span-review {
      text-decoration-style: dotted;
      text-decoration-color: #64748b;
      color: #334155;
      background: rgba(100, 116, 139, 0.06);
      border-radius: 2px;
    }
    .ev-span-source-cue {
      font-weight: 500;
    }
    .ev-span-active-link {
      box-shadow: 0 0 0 2px #2563eb !important;
      background-color: #dbeafe !important;
      color: #1e40af !important;
    }
    .text-muted {
      color: #566072;
    }
    .italic {
      font-style: italic;
    }
  `]
})
export class EvidenceHighlightedTextComponent implements OnChanges {
  @Input() text: string = '';
  @Input() fallbackText: string = '[German text from dataset]';
  @Input() spans: Array<{
    start: number;
    end: number;
    status: string;
    isSource: boolean;
    needs_review?: boolean;
    evidence?: PhraseEvidence;
    linkId?: string;
  }> = [];
  @Input() activeLinkId: string | null = null;

  @Output() segmentHover = new EventEmitter<{ segment: TextSegment; event: MouseEvent }>();
  @Output() segmentLeave = new EventEmitter<void>();
  @Output() segmentClick = new EventEmitter<{ segment: TextSegment; event: MouseEvent }>();
  @Output() linkClick = new EventEmitter<string>();

  segments: TextSegment[] = [];

  private lastSignature: string | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['text'] || changes['spans']) {
      // Callers often pass a freshly built (but identical) span array on every change-detection pass.
      // Rebuilding would recreate the DOM under the pointer (breaking hover/click), so skip identical inputs.
      const sig = this.signature();
      if (sig === this.lastSignature) { return; }
      this.lastSignature = sig;
      this.buildSegments();
    }
  }

  private signature(): string {
    const sp = (this.spans || []).map((s) => `${s.start}-${s.end}-${s.status}-${s.isSource ? 1 : 0}-${s.needs_review ? 1 : 0}-${s.linkId || ''}`).join('|');
    return `${this.text?.length || 0}:${this.text}#${sp}`;
  }

  private buildSegments(): void {
    if (!this.text) {
      this.segments = [];
      return;
    }

    const codePoints = Array.from(this.text);
    const totalLen = codePoints.length;

    if (!this.spans || this.spans.length === 0) {
      this.segments = [{ text: this.text, isHighlighted: false }];
      return;
    }

    // Boundary cuts
    const cuts = new Set<number>([0, totalLen]);
    this.spans.forEach((sp) => {
      const s = Math.max(0, Math.min(totalLen, sp.start));
      const e = Math.max(0, Math.min(totalLen, sp.end));
      cuts.add(s);
      cuts.add(e);
    });

    const sortedCuts = Array.from(cuts).sort((a, b) => a - b);
    const result: TextSegment[] = [];

    for (let i = 0; i < sortedCuts.length - 1; i++) {
      const start = sortedCuts[i];
      const end = sortedCuts[i + 1];
      if (start >= end) continue;

      const segText = codePoints.slice(start, end).join('');
      const active = this.spans.filter((sp) => sp.start <= start && sp.end >= end);

      if (active.length === 0) {
        result.push({ text: segText, isHighlighted: false });
      } else {
        const primary = active[0];
        result.push({
          text: segText,
          isHighlighted: true,
          status: primary.status,
          isSource: primary.isSource,
          needsReview: primary.needs_review,
          evidence: primary.evidence,
          linkId: primary.linkId
        });
      }
    }

    this.segments = result;
  }

  getSegmentClasses(seg: TextSegment): Record<string, boolean> {
    const st = (seg.status || 'Preserved').toLowerCase();
    const isRev = !!seg.needsReview || st.includes('review') || st.includes('uncertain');
    return {
      'ev-span-source-cue': !!seg.isSource,
      'ev-span-preserved': st.includes('preserv') && !isRev,
      'ev-span-changed': st.includes('chang') && !isRev,
      'ev-span-lost': st.includes('lost') && !isRev,
      'ev-span-added': st.includes('add') && !isRev,
      'ev-span-review': isRev
    };
  }

  /** Five-way display category (Preserved / Changed / Lost / Added / Uncertain). */
  categoryOf(seg: TextSegment): string {
    const st = (seg.status || 'Preserved').toLowerCase();
    if (seg.needsReview || st.includes('review') || st.includes('uncertain')) { return 'Uncertain'; }
    if (st.includes('lost')) { return 'Lost'; }
    if (st.includes('add')) { return 'Added'; }
    if (st.includes('chang')) { return 'Changed'; }
    return 'Preserved';
  }

  segmentLabel(seg: TextSegment): string {
    return `${this.categoryOf(seg)} evidence: ${seg.text}`;
  }

  onSegmentHover(seg: TextSegment, event: MouseEvent): void {
    this.segmentHover.emit({ segment: seg, event });
  }

  onSegmentLeave(): void {
    this.segmentLeave.emit();
  }

  onSegmentClick(seg: TextSegment, event: MouseEvent): void {
    event.stopPropagation();
    this.segmentClick.emit({ segment: seg, event });
    if (seg.linkId) {
      this.linkClick.emit(seg.linkId);
    }
  }
}
