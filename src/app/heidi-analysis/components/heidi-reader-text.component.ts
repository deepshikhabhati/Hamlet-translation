import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

/** A sentence-level (background tint) or phrase-level (underline) highlight, in code points of the displayed text. */
export interface HeidiHl {
  start: number;
  end: number;
  /** preserved | changed | lost | added | uncertain | unassessed */
  label: string;
  id: string;
}

interface Seg {
  text: string;
  sent: HeidiHl | null;
  phrase: HeidiHl | null;
}

const LABEL_TEXT: Record<string, string> = {
  preserved: 'Preserved', changed: 'Changed', lost: 'Lost', added: 'Added', uncertain: 'Uncertain', unassessed: 'Not assessed',
};

/**
 * Heidi reading text with two highlight layers:
 *  - sentence layer (Semantic only): a light background tint for every sentence group;
 *  - phrase layer (every dimension): coloured underline + stronger tint for phrase-level evidence.
 * Spans are code-point offsets and are only rendered when they fit the displayed text.
 */
@Component({
  selector: 'app-heidi-reader-text',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="hrt" [attr.lang]="lang"><ng-container *ngFor="let s of segs"><span
      *ngIf="s.phrase; else nonPhrase" class="hrt-seg hrt-phrase"
      [ngClass]="cls(s)" [class.hrt-active]="isActive(s)"
      tabindex="0" role="button" [attr.aria-label]="aria(s)" [attr.data-sentence]="s.sent?.id" [attr.data-phrase]="s.phrase?.id"
      [attr.data-label]="s.phrase?.label"
      (click)="pick(s, $event)" (keydown.enter)="pick(s, $event)">{{ s.text }}</span><ng-template #nonPhrase><span
      *ngIf="s.sent; else plain" class="hrt-seg hrt-sent-only" [class.hrt-active]="isActive(s)"
      tabindex="0" role="button" [attr.aria-label]="aria(s)" [attr.data-sentence]="s.sent?.id"
      [attr.data-label]="s.sent?.label"
      (click)="pick(s, $event)" (keydown.enter)="pick(s, $event)">{{ s.text }}</span><ng-template #plain>{{ s.text }}</ng-template></ng-template></ng-container></span>`,
  styles: [`
    .hrt { white-space: pre-line; }
    .hrt-seg { border-radius: 2px; transition: background-color 140ms ease, box-shadow 140ms ease;
      -webkit-box-decoration-break: clone; box-decoration-break: clone; }
    .hrt-seg:focus-visible { outline: 2px solid #93c5fd; outline-offset: 1px; }
    .hrt-phrase { cursor: pointer; text-decoration-line: underline; text-decoration-thickness: 2px; text-underline-offset: 3px; }
    .hrt-sent-only { cursor: pointer; background: transparent; text-decoration: none; }

    .p-preserved { background-color: #DCFCE7; text-decoration-color: #15803D; color: inherit; }
    .p-changed { background-color: #FEF3C7; text-decoration-color: #D97706; color: inherit; }
    .p-lost { background-color: #FEE2E2; text-decoration-color: #DC2626; color: inherit; }
    .p-added { background-color: #F3E8FF; text-decoration-color: #9333EA; color: inherit; }
    .p-uncertain { background-color: transparent; text-decoration-color: #64748B; text-decoration-style: dotted; color: inherit; }

    .hrt-active { outline: 2px solid #2563eb !important; outline-offset: 1px; }
  `],
})
export class HeidiReaderTextComponent implements OnChanges {
  @Input() text = '';
  @Input() lang: 'en' | 'de' = 'en';
  /** Sentence layer — non-overlapping, sorted. */
  @Input() sentences: HeidiHl[] = [];
  /** Phrase layer — overlapping spans are dropped (first wins). */
  @Input() phrases: HeidiHl[] = [];
  @Input() activeIds: (string | null)[] = [];
  @Output() pickSegment = new EventEmitter<{ sentenceId: string | null; phraseId: string | null }>();

  segs: Seg[] = [];
  private sig = '';

  ngOnChanges(): void {
    const sig = `${this.text}#${this.sentences.map(h => `${h.start}-${h.end}-${h.label}-${h.id}`).join('|')}#${this.phrases.map(h => `${h.start}-${h.end}-${h.label}-${h.id}`).join('|')}`;
    if (sig === this.sig) { return; }
    this.sig = sig;
    this.segs = buildSegments(this.text || '', this.sentences || [], this.phrases || []);
  }

  cls(s: Seg): string {
    return s.phrase ? 'p-' + s.phrase.label : '';
  }

  isActive(s: Seg): boolean {
    const ids = this.activeIds.filter(Boolean);
    return (!!s.phrase && ids.includes(s.phrase.id)) || (!s.phrase && !!s.sent && ids.includes(s.sent.id));
  }

  aria(s: Seg): string {
    const h = s.phrase || s.sent;
    if (!h) { return s.text.slice(0, 80); }
    return `${LABEL_TEXT[h.label] || h.label}${s.phrase ? ' phrase' : ' sentence'}: ${s.text.slice(0, 80)}`;
  }

  pick(s: Seg, ev: Event): void {
    ev.stopPropagation();
    this.pickSegment.emit({ sentenceId: s.sent?.id ?? null, phraseId: s.phrase?.id ?? null });
  }
}

/** Split the text at every highlight boundary (code points). Exported for tests. */
export function buildSegments(text: string, sentences: HeidiHl[], phrases: HeidiHl[]): Seg[] {
  const cps = Array.from(text);
  const n = cps.length;
  const fits = (h: HeidiHl) => h.start >= 0 && h.end <= n && h.start < h.end;
  const sents = sentences.filter(fits).sort((a, b) => a.start - b.start);
  const ph: HeidiHl[] = [];
  for (const p of phrases.filter(fits).sort((a, b) => a.start - b.start)) {
    if (!ph.length || p.start >= ph[ph.length - 1].end) { ph.push(p); }
  }
  const cuts = new Set<number>([0, n]);
  for (const h of [...sents, ...ph]) { cuts.add(h.start); cuts.add(h.end); }
  const pts = [...cuts].sort((a, b) => a - b);
  const out: Seg[] = [];
  for (let k = 0; k < pts.length - 1; k++) {
    const a = pts[k], b = pts[k + 1];
    if (a >= b) { continue; }
    const sent = sents.find(h => h.start <= a && b <= h.end) || null;
    const phrase = ph.find(h => h.start <= a && b <= h.end) || null;
    const last = out[out.length - 1];
    const t = cps.slice(a, b).join('');
    if (last && last.sent === sent && last.phrase === phrase) { last.text += t; } else { out.push({ text: t, sent, phrase }); }
  }
  return out;
}
