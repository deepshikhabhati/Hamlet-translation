import { Injectable } from '@angular/core';
import {
  ALIGNMENT_STATUS_LABELS,
  HEIDI_DIMENSIONS,
  HeidiChapter,
  HeidiDimensionKey,
  HeidiPassage,
} from '../models/heidi.models';
import { HeidiReviewService } from './heidi-review.service';
import { HeidiRttService } from './heidi-rtt.service';

export interface HeidiReaderFilters {
  type: 'all' | 'dialogue' | 'narration';
  alignment: 'all' | 'aligned' | 'review' | 'unmatched';
  search: string;
}

export type HeidiQueueFilter =
  | 'all' | 'low_semantic' | 'emotion_shift' | 'imagery_change' | 'cultural_issue' | 'omissions'
  | 'low_alignment' | 'unmatched' | 'rtt_disagreement' | 'unreviewed' | 'reviewed';

export type HeidiQueueSort = 'chapter' | 'order' | 'lowest_score' | 'alignment_confidence' | 'rtt_disagreement' | 'review_status';

export interface HeidiQueueItem {
  key: string;
  passage: HeidiPassage;
  chapterNumber: number;
  issue: HeidiQueueFilter;
  issueLabel: string;
  focus: 'alignment' | 'rtt' | HeidiDimensionKey;
  score: number | null;
  detail: string;
  reviewed: boolean;
}

export interface ChapterDimensionSummary {
  mean: number | null;
  /** number of passages that contributed a score */
  n: number;
  /** passages in the chapter (denominator shown in the UI) */
  total: number;
}

const LOW = 60;

@Injectable({ providedIn: 'root' })
export class HeidiAlignmentService {
  constructor(private reviews: HeidiReviewService, private rtt: HeidiRttService) {}

  statusLabel(p: HeidiPassage): string {
    if (this.reviews.alignmentRejected(p.passage_id)) { return 'Alignment rejected by expert'; }
    if (this.reviews.alignmentVerified(p.passage_id)) { return 'Alignment verified by expert'; }
    return ALIGNMENT_STATUS_LABELS[p.alignment.status];
  }

  needsAlignmentReview(p: HeidiPassage): boolean {
    if (this.reviews.alignmentVerified(p.passage_id)) { return false; }
    return p.alignment.status !== 'aligned';
  }

  isUnmatched(p: HeidiPassage): boolean {
    return p.alignment.status === 'unmatched_de' || p.alignment.status === 'unmatched_en';
  }

  matchesFilters(p: HeidiPassage, f: HeidiReaderFilters): boolean {
    if (f.type === 'dialogue' && p.passage_type === 'narration') { return false; }
    if (f.type === 'narration' && p.passage_type !== 'narration') { return false; }
    if (f.alignment === 'aligned' && p.alignment.status !== 'aligned') { return false; }
    if (f.alignment === 'review' && !(p.alignment.status === 'needs_review' || p.alignment.status === 'low_confidence')) { return false; }
    if (f.alignment === 'unmatched' && !this.isUnmatched(p)) { return false; }
    const q = (f.search || '').trim().toLowerCase();
    if (q) {
      const hay = `${p.english_text || ''}\n${p.german_text || ''}\n${p.passage_id}`.toLowerCase();
      if (!hay.includes(q)) { return false; }
    }
    return true;
  }

  /** Mean of available scores only — null / not_applicable / not_run are excluded, never counted as 0. */
  chapterSummary(ch: HeidiChapter, dim: HeidiDimensionKey, type: HeidiReaderFilters['type'] = 'all'): ChapterDimensionSummary {
    const ps = ch.passages.filter(p => this.matchesFilters(p, { type, alignment: 'all', search: '' }));
    const vals = ps.map(p => this.reviews.effectiveScore(p, dim).score).filter((v): v is number => v !== null);
    return { mean: vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null, n: vals.length, total: ps.length };
  }

  rttDisagreement(p: HeidiPassage): number | null {
    const r = this.rtt.get(p.passage_id);
    return r && r.status === 'disagreement' ? r.disagreement : null;
  }

  buildQueue(chapters: HeidiChapter[]): HeidiQueueItem[] {
    const items: HeidiQueueItem[] = [];
    for (const ch of chapters) {
      for (const p of ch.passages) {
        const reviewed = this.reviews.isReviewed(p.passage_id);
        const push = (issue: HeidiQueueFilter, label: string, focus: HeidiQueueItem['focus'], score: number | null, detail: string) =>
          items.push({ key: `${p.passage_id}:${issue}`, passage: p, chapterNumber: ch.chapter_number, issue, issueLabel: label, focus, score, detail, reviewed });
        if (this.isUnmatched(p)) {
          push('unmatched', p.alignment.status === 'unmatched_de' ? 'Unmatched German passage' : 'Unmatched English passage',
            'alignment', null, 'No counterpart detected in the other language — possible omission/addition or mis-segmentation.');
        } else if (p.alignment.status !== 'aligned') {
          push('low_alignment', 'Low-confidence alignment', 'alignment', null,
            `${ALIGNMENT_STATUS_LABELS[p.alignment.status]} (confidence ${(p.alignment.confidence * 100).toFixed(0)}%, bead ${p.alignment.bead}).`);
        }
        const dims = p.analysis?.dimensions || {};
        const sem = this.reviews.effectiveScore(p, 'semantic').score;
        if (sem !== null && sem < LOW) { push('low_semantic', 'Low semantic preservation', 'semantic', sem, dims.semantic?.explanation || ''); }
        const emo = dims.emotion;
        if (emo && emo.score !== null && (emo.score < LOW || (emo.shift_categories || []).length)) {
          push('emotion_shift', 'Emotional shift', 'emotion', this.reviews.effectiveScore(p, 'emotion').score, emo.explanation);
        }
        const img = dims.imagery;
        if (img && img.score !== null && img.score < LOW) {
          push('imagery_change', 'Metaphor / imagery change', 'imagery', this.reviews.effectiveScore(p, 'imagery').score, img.explanation);
        }
        const cul = dims.cultural;
        if (cul && cul.score !== null && cul.score < LOW) {
          push('cultural_issue', 'Cultural translation issue', 'cultural', this.reviews.effectiveScore(p, 'cultural').score, cul.explanation);
        }
        const om = dims.omissions;
        if (om && om.score !== null && ((om.possible_omissions || 0) + (om.possible_additions || 0) > 0)) {
          push('omissions', 'Omissions & additions', 'omissions', this.reviews.effectiveScore(p, 'omissions').score, om.explanation);
        }
        const r = this.rtt.get(p.passage_id);
        if (r && r.status === 'disagreement') {
          push('rtt_disagreement', 'RTT disagreement', 'rtt', r.rtt_semantic_score,
            `Direct ${r.direct_semantic_score ?? '—'} vs RTT ${r.rtt_semantic_score ?? '—'} (Δ ${r.disagreement}).`);
        }
      }
    }
    return items;
  }

  filterQueue(items: HeidiQueueItem[], f: HeidiQueueFilter): HeidiQueueItem[] {
    if (f === 'all') { return items; }
    if (f === 'unreviewed') { return items.filter(i => !i.reviewed); }
    if (f === 'reviewed') { return items.filter(i => i.reviewed); }
    return items.filter(i => i.issue === f);
  }

  sortQueue(items: HeidiQueueItem[], s: HeidiQueueSort): HeidiQueueItem[] {
    const order = (a: HeidiQueueItem, b: HeidiQueueItem) => a.chapterNumber - b.chapterNumber || a.passage.sequence - b.passage.sequence;
    const nullLast = (x: number | null, y: number | null, asc = true) =>
      x === null && y === null ? 0 : x === null ? 1 : y === null ? -1 : (asc ? x - y : y - x);
    const arr = [...items];
    switch (s) {
      case 'chapter': return arr.sort((a, b) => a.chapterNumber - b.chapterNumber || a.issue.localeCompare(b.issue) || order(a, b));
      case 'order': return arr.sort(order);
      case 'lowest_score': return arr.sort((a, b) => nullLast(a.score, b.score) || order(a, b));
      case 'alignment_confidence': return arr.sort((a, b) => a.passage.alignment.confidence - b.passage.alignment.confidence || order(a, b));
      case 'rtt_disagreement': return arr.sort((a, b) => nullLast(this.rttDisagreement(a.passage), this.rttDisagreement(b.passage), false) || order(a, b));
      case 'review_status': return arr.sort((a, b) => Number(a.reviewed) - Number(b.reviewed) || order(a, b));
    }
  }

  dimensionLabel(k: HeidiDimensionKey): string {
    return HEIDI_DIMENSIONS.find(d => d.key === k)?.label ?? k;
  }
}
