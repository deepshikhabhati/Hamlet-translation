/**
 * Shared phrase-evidence categories for Hamlet and Heidi.
 * One visual vocabulary for both projects (see PhraseLegendComponent).
 */
export type PhraseCategory = 'Preserved' | 'Changed' | 'Lost' | 'Added' | 'Uncertain';

export interface PhraseCategoryMeta {
  key: PhraseCategory;
  color: string;
  background: string;
  underline: 'solid' | 'dotted';
  definition: string;
}

export const PHRASE_CATEGORIES: PhraseCategoryMeta[] = [
  { key: 'Preserved', color: '#16a34a', background: 'rgba(22, 163, 74, 0.08)', underline: 'solid', definition: 'Literary feature successfully preserved' },
  { key: 'Changed', color: '#d97706', background: 'rgba(217, 119, 6, 0.10)', underline: 'solid', definition: 'Feature transformed or partially preserved' },
  { key: 'Lost', color: '#dc2626', background: 'rgba(220, 38, 38, 0.08)', underline: 'solid', definition: 'Feature absent or substantially weakened' },
  { key: 'Added', color: '#9333ea', background: 'rgba(147, 51, 234, 0.08)', underline: 'solid', definition: 'Feature introduced in the translation' },
  { key: 'Uncertain', color: '#64748b', background: 'rgba(100, 116, 139, 0.08)', underline: 'dotted', definition: 'Evidence requires verification' },
];

/** Normalise the free-text statuses found in the datasets onto the five shared categories. */
export function normalizeCategory(status: string | null | undefined, uncertain = false): PhraseCategory {
  if (uncertain) { return 'Uncertain'; }
  const s = (status || '').toLowerCase();
  if (!s) { return 'Uncertain'; }
  if (s.includes('review') || s.includes('uncertain') || s.includes('unverified')) { return 'Uncertain'; }
  if (s.includes('partial') || s.includes('modif') || s.includes('chang') || s.includes('adapt')) { return 'Changed'; }
  if (s.includes('omission/addition')) { return 'Changed'; }
  if (s.includes('preserv') || s.includes('retain')) { return 'Preserved'; }
  if (s.includes('lost') || s.includes('omit') || s.includes('omission')) { return 'Lost'; }
  if (s.includes('add')) { return 'Added'; }
  return 'Uncertain';
}

export function categoryMeta(c: PhraseCategory): PhraseCategoryMeta {
  return PHRASE_CATEGORIES.find(m => m.key === c) ?? PHRASE_CATEGORIES[4];
}

/** Disagreement classification for direct vs RTT scores (threshold is configurable, not calibrated). */
export type DisagreementStatus = 'agree' | 'potential_disagreement' | 'not_evaluated';

export function disagreementOf(direct: number | null | undefined, rtt: number | null | undefined, threshold: number):
  { diff: number | null; abs: number | null; status: DisagreementStatus } {
  if (direct === null || direct === undefined || rtt === null || rtt === undefined || isNaN(direct) || isNaN(rtt)) {
    return { diff: null, abs: null, status: 'not_evaluated' };
  }
  const diff = Math.round((rtt - direct) * 10) / 10;
  const abs = Math.abs(diff);
  return { diff, abs, status: abs >= threshold ? 'potential_disagreement' : 'agree' };
}

export const DISAGREEMENT_LABELS: Record<DisagreementStatus, string> = {
  agree: 'Signals agree',
  potential_disagreement: 'Potential disagreement — review recommended',
  not_evaluated: 'Not evaluated',
};

/** Validates a code-point span against the exact displayed text. Returns null when it cannot be located. */
export function locateSpan(text: string | null | undefined, start: number | null | undefined, end: number | null | undefined,
  expected?: string | null): { start: number; end: number } | null {
  if (!text || start === null || start === undefined || end === null || end === undefined) { return null; }
  const cps = Array.from(text);
  if (start < 0 || end > cps.length || start >= end) { return null; }
  if (expected !== undefined && expected !== null && cps.slice(start, end).join('') !== expected) { return null; }
  return { start, end };
}
