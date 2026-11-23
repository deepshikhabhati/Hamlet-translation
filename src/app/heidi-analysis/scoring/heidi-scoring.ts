/**
 * Heidi — in-browser scoring of heidi_part1_side_by_side.json (automated_heuristic_v1, provisional).
 *
 * The only Heidi dataset is the curated side-by-side alignment file. Every score and every piece of
 * phrase-level evidence is computed here, at load time, from its texts. This is an exact port of
 * scripts/heidi_build_dataset.py + scripts/heidi_lexicon.py (Bilex.coverage) + scripts/heidi_align.py,
 * checked for parity by scripts/heidi_scoring_parity.mjs.
 *
 *   semantic   bidirectional dictionary coverage of content words (Ding de-en), 0.10 → 0, 0.60 → 100
 *   emotion    emotion-lexicon profile + exclamation intensity (N/A without signal)
 *   imagery    share of German imagery terms rendered in English (N/A without imagery)
 *   tone       exclamation / question / diminutive agreement, formal address noted
 *   voice      direct-speech structure, attributed speaker, sentence-count ratio
 *   cultural   Swiss-Alpine / period terms retained / adapted / omitted (N/A without such terms)
 *   omissions  sentence-level unsupported content (possible omissions / additions) + length ratio
 *   wordplay   not assessed (null, never 0)
 *
 * Scores are produced only for groups whose curated confidence is `verified` (Chapter 1) or `high`.
 * Offsets are Unicode code points (the texts contain no astral characters, so they equal UTF-16 indexes).
 */
import { HEIDI_LEXICON, HEIDI_RULES } from './heidi-lexicon.data';
import { HeidiAlignmentStatus, HeidiDimensionAssessment, HeidiDimensionKey, HeidiPassage, HeidiPhraseEvidence, HeidiSpan } from '../models/heidi.models';

export const HEIDI_SCORING_METHOD = 'automated_heuristic_v1';
export const HEIDI_SCORING_DESCRIPTION =
  'automated_heuristic_v1 — provisional automated heuristics computed in the browser from heidi_part1_side_by_side.json '
  + '(Ding dictionary coverage, emotion / imagery / culture lexicons); scored only for verified or high-confidence groups; not expert-validated.';
export const HEIDI_JOIN = '\n\n';
export const STATUS_MAP: Record<string, HeidiAlignmentStatus> = { verified: 'verified', high: 'aligned', medium: 'needs_review', low: 'low_confidence' };
const SCORED = new Set<HeidiAlignmentStatus>(['verified', 'aligned']);

// ------------------------------------------------------------------ Python-compatible primitives
const W = '[\\p{L}\\p{N}_]';
const B = `(?:(?<=${W})(?!${W})|(?<!${W})(?=${W}))`;

/** Convert a Python `re` pattern (Unicode \b, \w) to an equivalent JS RegExp. */
const RX_CACHE = new Map<string, RegExp>();
export function pyRegex(src: string, flags = ''): RegExp {
  const key = flags + '\u0000' + src;
  let rx = RX_CACHE.get(key);
  if (!rx) {
    // A leading \b before a group whose alternatives all start with a letter is just "no word char before" (faster, same matches).
    const lead = /^\\b\(\?:[\p{L}]/u.test(src) && !/\|[^\p{L}]/u.test(src.slice(0, src.indexOf(')'))) ? `(?<!${W})` + src.slice(2) : src;
    const js = lead.replace(/\\'/g, '\'').replace(/\\b/g, B).replace(/\\w/g, W);
    rx = new RegExp(js, flags + 'u');
    RX_CACHE.set(key, rx);
  }
  rx.lastIndex = 0;
  return rx;
}

/** Python 3 round(): half to even. */
export function pyRound(x: number): number {
  const f = Math.floor(x);
  const d = x - f;
  if (d > 0.5) { return f + 1; }
  if (d < 0.5) { return f; }
  return f % 2 === 0 ? f : f + 1;
}

const clamp = (x: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, x));
const isAlpha = (c: string | undefined) => !!c && /\p{L}/u.test(c);
const count = (s: string, ch: string) => s.split(ch).length - 1;
const sum = (o: Record<string, number>) => Object.values(o).reduce((a, b) => a + b, 0);

// ------------------------------------------------------------------ lexicon (Bilex)
const TOKEN_RE = new RegExp(HEIDI_RULES.token_re, 'g');
const DE_STOP = new Set(HEIDI_RULES.de_stop);
const EN_STOP = new Set(HEIDI_RULES.en_stop);
const STEMS = HEIDI_LEXICON.stems;

const tokens = (text: string) => (text.match(TOKEN_RE) || []).map(t => t.toLowerCase());
export const deContent = (text: string) => tokens(text).filter(w => !DE_STOP.has(w) && w.length > 1);
export const enContent = (text: string) => tokens(text).filter(w => !EN_STOP.has(w) && w.length > 1);
const enStem = (w: string) => { const i = HEIDI_LEXICON.en[w]; return i === undefined ? w : STEMS[i]; };

/** Port of Bilex.coverage(): (German coverage, English coverage, matched (de word, en word) pairs). */
export function coverage(de: string, en: string): [number, number, [string, string][]] {
  const dw = deContent(de), ew = enContent(en);
  if (!dw.length || !ew.length) { return [0, 0, []]; }
  const enStems = new Map<string, string>();
  for (const w of ew) { const s = enStem(w); if (!enStems.has(s)) { enStems.set(s, w); } }
  let hitDe = 0;
  const used = new Set<string>();
  const pairs: [string, string][] = [];
  for (const w of dw) {
    const tr = HEIDI_LEXICON.de[w];
    let inter = tr ? tr.map(i => STEMS[i]).filter(s => enStems.has(s)) : [];
    if (!inter.length && enStems.has(w)) { inter = [w]; }
    if (!inter.length) {
      const c = HEIDI_LEXICON.cognate[w];
      if (c !== undefined && enStems.has(STEMS[c]) && w.length > 3) { inter = [STEMS[c]]; }
    }
    if (inter.length) {
      hitDe++;
      inter.forEach(s => used.add(s));
      pairs.push([w, enStems.get([...inter].sort()[0])!]);
    }
  }
  const hitEn = ew.filter(w => used.has(enStem(w))).length;
  return [hitDe / dw.length, hitEn / ew.length, pairs];
}

// ------------------------------------------------------------------ span helpers
/** Port of spans(): matches of a Python pattern, expanded to whole words. */
function spans(text: string, rx: string, ignoreCase = true, limit = 6): HeidiSpan[] {
  const out: HeidiSpan[] = [];
  for (const m of text.matchAll(pyRegex(rx, ignoreCase ? 'gi' : 'g'))) {
    let s = m.index!, e = m.index! + m[0].length;
    while (s > 0 && isAlpha(text[s - 1])) { s--; }
    while (e < text.length && (isAlpha(text[e]) || text[e] === '-')) { e++; }
    out.push({ start: s, end: e, text: text.slice(s, e) });
    if (out.length >= limit) { break; }
  }
  return out;
}

const WORD_CHAR = /[\p{L}\p{N}_]/u;
/** Port of find_word(): first whole-word, case-insensitive occurrence; else first occurrence anywhere. Words are letter tokens. */
function findWord(text: string, word: string): HeidiSpan | null {
  const lt = text.toLowerCase(), lw = word.toLowerCase();
  let first = -1;
  for (let i = lt.indexOf(lw); i >= 0; i = lt.indexOf(lw, i + 1)) {
    if (first < 0) { first = i; }
    const before = i > 0 ? text[i - 1] : '', after = text[i + lw.length] ?? '';
    if (!WORD_CHAR.test(before) && !WORD_CHAR.test(after)) { return { start: i, end: i + lw.length, text: text.slice(i, i + lw.length) }; }
  }
  return first < 0 ? null : { start: first, end: first + lw.length, text: text.slice(first, first + lw.length) };
}

function finditer(text: string, rx: RegExp): HeidiSpan[] {
  return [...text.matchAll(rx)].map(m => ({ start: m.index!, end: m.index! + m[0].length, text: m[0] }));
}

const SENT_SPLIT = pyRegex(HEIDI_RULES.sent_split);
function sentencesWithOffsets(text: string): HeidiSpan[] {
  const out: HeidiSpan[] = [];
  let pos = 0;
  for (const s of text.split(SENT_SPLIT)) {
    const i = text.indexOf(s, pos);
    out.push({ start: i, end: i + s.length, text: s });
    pos = i + s.length;
  }
  return out;
}

type Ev = HeidiPhraseEvidence & { label?: string };
type Dim = HeidiDimensionAssessment;

function dim(score: number | null, explanation: string, de: HeidiSpan[], en: HeidiSpan[], conf: Dim['confidence'],
  status: Dim['status'] = 'scored', evidence: Ev[] = []): Dim {
  return {
    status, score: score === null ? null : pyRound(score), explanation, evidence_de: de, evidence_en: en,
    phrase_evidence: evidence, method: HEIDI_SCORING_METHOD, provisional: true, confidence: conf, review_status: 'unreviewed',
  };
}
const na = (explanation: string, status: Dim['status'] = 'not_applicable') => dim(null, explanation, [], [], null, status);
const pct = (x: number) => `${pyRound(x * 100)}%`;

// ------------------------------------------------------------------ analysers
export function aSemantic(de: string, en: string): [Dim, number] {
  const [dc, ec, pairs] = coverage(de, en);
  const score = clamp(((dc + ec) / 2 - 0.10) / 0.50 * 100);
  const ev: Ev[] = [];
  const seen = new Set<string>();
  for (const [dw, ew] of pairs) {
    if (seen.has(dw)) { continue; }
    seen.add(dw);
    const ds = findWord(de, dw), es = findWord(en, ew);
    if (ds && es) {
      ev.push({ id: `sem-${ev.length + 1}`, de: ds, en: es, kind: 'lexical_correspondence',
        explanation: `Dictionary correspondence: "${ds.text}" ↔ "${es.text}"`, confidence: 'medium' });
    }
    if (ev.length >= 8) { break; }
  }
  const conf = deContent(de).length >= 12 ? 'medium' : 'low';
  return [dim(score, `Dictionary coverage: ${pct(dc)} of German content words and ${pct(ec)} of English content words have a lexical counterpart.`,
    ev.map(e => e.de!), ev.map(e => e.en!), conf, 'scored', ev), pyRound(score)];
}

function emoProfile(text: string, lex: Record<string, string>): [Record<string, number>, HeidiSpan[]] {
  const prof: Record<string, number> = {};
  const sp: HeidiSpan[] = [];
  for (const [cat, rx] of Object.entries(lex)) {
    const found = spans(text, '\\b(?:' + rx + ')\\w*', true, 10);
    prof[cat] = (prof[cat] || 0) + found.length;
    found.forEach(s => sp.push({ ...s, category: cat }));
  }
  return [prof, sp];
}

export function aEmotion(de: string, en: string): Dim {
  const [pd, sd] = emoProfile(de, HEIDI_RULES.emo_de);
  const [pe, se] = emoProfile(en, HEIDI_RULES.emo_en);
  const exd = count(de, '!'), exe = count(en, '!');
  if (sum(pd) + sum(pe) + exd + exe < 2) {
    return na('Insufficient emotional signal (fewer than two emotion-lexicon terms / exclamations across both texts).');
  }
  const cats = [...new Set([...Object.keys(pd), ...Object.keys(pe)])];
  const td = Math.max(1, sum(pd)), te = Math.max(1, sum(pe));
  const l1 = sum(pd) && sum(pe) ? cats.reduce((a, c) => a + Math.abs((pd[c] || 0) / td - (pe[c] || 0) / te), 0) / 2 : 1.0;
  const intensity = 1 - Math.abs(exd - exe) / Math.max(1, exd + exe);
  const presence = (sum(pd) > 0) === (sum(pe) > 0) ? 1 : 0;
  const score = 100 * (0.5 * (1 - l1) + 0.25 * intensity + 0.25 * presence);
  const shifts = cats.filter(c => ((pd[c] || 0) > 0) !== ((pe[c] || 0) > 0));
  const prof = (p: Record<string, number>) => Object.entries(p).filter(([, v]) => v).map(([k, v]) => `${k} ${v}`).join(', ') || 'none';
  const d = dim(score, `German emotion profile (${prof(pd)}) vs English (${prof(pe)}); exclamations ${exd} vs ${exe}.`
    + (shifts.length ? ` Category shift: ${shifts.join(', ')}.` : ''), sd.slice(0, 6), se.slice(0, 6), sum(pd) + sum(pe) >= 3 ? 'medium' : 'low');
  d.shift_categories = shifts;
  return d;
}

export function aImagery(de: string, en: string): Dim {
  let found = 0, kept = 0;
  const ev: Ev[] = [];
  for (const [drx, erx] of HEIDI_RULES.imagery) {
    const ds = spans(de, '\\b(?:' + drx + ')\\w*', true, 1);
    if (!ds.length) { continue; }
    found++;
    const es = spans(en, '\\b(?:' + erx + ')\\w*', true, 1);
    if (es.length) { kept++; }
    ev.push({ id: `img-${ev.length + 1}`, de: ds[0], en: es[0] || null, kind: es.length ? 'imagery_preserved' : 'imagery_not_rendered',
      explanation: es.length ? `Image "${ds[0].text}" rendered as "${es[0].text}"` : `Image "${ds[0].text}" has no detected English counterpart`,
      confidence: 'low' });
  }
  if (!found) { return na('No nature/imagery terms from the imagery lexicon in the German passage.'); }
  return dim(100 * kept / found, `${kept} of ${found} German imagery terms have an English counterpart.`,
    ev.map(e => e.de!), ev.filter(e => e.en).map(e => e.en!), found >= 3 ? 'medium' : 'low', 'scored', ev);
}

const DIMINUTIVE_RE = pyRegex(HEIDI_RULES.diminutive_re, 'g');
const DIM_EN_RE = pyRegex(HEIDI_RULES.dim_en_re, 'gi');
const FORMAL_RE = pyRegex(HEIDI_RULES.formal_re, 'g');

export function aTone(de: string, en: string): Dim {
  const exd = count(de, '!'), exe = count(en, '!'), qd = count(de, '?'), qe = count(en, '?');
  const dimsDe = finditer(de, DIMINUTIVE_RE).filter(m => !m.text.startsWith('Mädchen'));
  const dimsEn = finditer(en, DIM_EN_RE);
  const formal = finditer(de, FORMAL_RE);
  const parts = [1 - Math.abs(exd - exe) / Math.max(1, exd + exe), 1 - Math.abs(qd - qe) / Math.max(1, qd + qe)];
  const notes = [`exclamations ${exd}/${exe}`, `questions ${qd}/${qe}`];
  if (dimsDe.length) {
    parts.push(Math.min(1, dimsEn.length / dimsDe.length));
    notes.push(`diminutives ${dimsDe.length} → "little"-type markers ${dimsEn.length}`);
  }
  if (formal.length) { notes.push(`formal address (Sie/Ihnen) ×${formal.length} — English has no T/V distinction`); }
  return dim(100 * parts.reduce((a, b) => a + b, 0) / parts.length, 'German/English: ' + notes.join('; ') + '.',
    [...dimsDe.slice(0, 4), ...formal.slice(0, 2)], dimsEn.slice(0, 4), 'low');
}

const SPEAKERS = HEIDI_RULES.speakers;
export const SPEAKER_LABEL: Record<string, string> = Object.fromEntries(SPEAKERS.map(s => [s[0], s[1]]));

export function detectSpeaker(text: string, lang: 'de' | 'en'): string | null {
  const verbs = lang === 'de' ? HEIDI_RULES.speech_verbs_de : HEIDI_RULES.speech_verbs_en;
  const window = text.slice(0, 400);
  for (const [cid, , dePats, enPats] of SPEAKERS) {
    for (const p of lang === 'de' ? dePats : enPats) {
      const rx = lang === 'de'
        ? `${verbs}\\s+(?:jetzt\\s+|nun\\s+|da\\s+|wieder\\s+)?(?:die\\s+|der\\s+|das\\s+)?(?:\\w+\\s+)?${p}`
        : `(?:${verbs}\\s+(?:the\\s+)?(?:\\w+\\s+)?${p}|${p}\\w*\\s+${verbs})`;
      if (pyRegex(rx).test(window)) { return cid; }
    }
  }
  return null;
}

export function passageType(text: string): HeidiPassage['passage_type'] {
  const t = text.replace(/^\s+/, '');
  if (/^["„“']/.test(t)) { return 'dialogue'; }
  return /["„“]/.test(text) ? 'mixed' : 'narration';
}

export function aVoice(de: string, en: string, spkDe: string | null, spkEn: string | null): Dim {
  const qd = count(de, '"') + count(de, '„'), qe = count(en, '"');
  const parts = [1 - Math.abs(qd - qe) / Math.max(1, qd + qe)];
  const notes = [`quotation marks ${qd}/${qe}`];
  if (spkDe && spkEn) {
    parts.push(spkDe === spkEn ? 1 : 0);
    notes.push(`speaker ${SPEAKER_LABEL[spkDe]} / ${SPEAKER_LABEL[spkEn]}`);
  } else if (spkDe || spkEn) {
    notes.push(`speaker named only in ${spkDe ? 'German' : 'English'} (${SPEAKER_LABEL[(spkDe || spkEn)!]})`);
  }
  const sd = de.trim().split(SENT_SPLIT).length, se = en.trim().split(SENT_SPLIT).length;
  parts.push(Math.min(sd, se) / Math.max(sd, se));
  notes.push(`sentences ${sd}/${se}`);
  return dim(100 * parts.reduce((a, b) => a + b, 0) / parts.length, 'German/English: ' + notes.join('; ') + '.',
    spans(de, '"[^"]{1,80}"', false, 3), spans(en, '"[^"]{1,80}"', false, 3), 'low');
}

export function aCultural(de: string, en: string): Dim {
  let found = 0, value = 0;
  const ev: Ev[] = [];
  const kinds: Record<string, number> = {};
  for (const [drx, keepRx, adaptRx, label] of HEIDI_RULES.culture) {
    const ds = spans(de, drx, false, 1);
    if (!ds.length) { continue; }
    found++;
    const ks = spans(en, keepRx, false, 1), as = spans(en, adaptRx, true, 1);
    const [kind, val, es] = ks.length ? ['retained', 1, ks[0]] as const : as.length ? ['adapted', 0.75, as[0]] as const : ['omitted', 0, null] as const;
    value += val;
    kinds[kind] = (kinds[kind] || 0) + 1;
    ev.push({ id: `cul-${ev.length + 1}`, de: ds[0], en: es, kind: `cultural_${kind}`, label,
      explanation: `${label}: ${kind}` + (es ? ` as "${es.text}"` : ' (no English counterpart detected)'),
      confidence: kind === 'omitted' ? 'low' : 'medium' });
  }
  if (!found) { return na('No Swiss-Alpine / period culture terms from the culture lexicon in the German passage.'); }
  return dim(100 * value / found, `${found} culture-specific term(s): ` + Object.entries(kinds).map(([k, v]) => `${v} ${k}`).join(', ') + '.',
    ev.map(e => e.de!), ev.filter(e => e.en).map(e => e.en!), 'medium', 'scored', ev);
}

export function aOmissions(de: string, en: string, ratioCh: number): Dim {
  const om: HeidiSpan[] = [], ad: HeidiSpan[] = [], ev: Ev[] = [];
  let unsupported = 0, total = 0, totEn = 0, unsEn = 0;
  for (const s of sentencesWithOffsets(de)) {
    const cw = deContent(s.text);
    total += cw.length;
    if (cw.length < 5) { continue; }
    if (coverage(s.text, en)[0] < 0.12) { unsupported += cw.length; om.push(s); }
  }
  for (const s of sentencesWithOffsets(en)) {
    const cw = enContent(s.text);
    totEn += cw.length;
    if (cw.length < 5) { continue; }
    if (coverage(de, s.text)[1] < 0.12) { unsEn += cw.length; ad.push(s); }
  }
  const share = (unsupported + unsEn) / Math.max(1, total + totEn);
  const ratio = (en.length / Math.max(1, de.length)) / ratioCh;
  const score = 100 * (1 - share) * (0.7 + 0.3 * Math.exp(-(Math.log(ratio) ** 2) / (2 * 0.5 ** 2)));
  for (const o of om.slice(0, 4)) {
    ev.push({ id: `om-${ev.length + 1}`, de: o, en: null, kind: 'possible_omission',
      explanation: 'German sentence with almost no dictionary support in the English passage (possible omission or free rendering).', confidence: 'low' });
  }
  for (const a of ad.slice(0, 4)) {
    ev.push({ id: `om-${ev.length + 1}`, de: null, en: a, kind: 'possible_addition',
      explanation: 'English sentence with almost no dictionary support in the German passage (possible addition or free rendering).', confidence: 'low' });
  }
  const d = dim(score, `${om.length} possible omission(s), ${ad.length} possible addition(s); length ratio ${ratio.toFixed(2)}× the chapter norm.`,
    om.slice(0, 4), ad.slice(0, 4), 'low', 'scored', ev);
  d.possible_omissions = om.length;
  d.possible_additions = ad.length;
  d.length_ratio_vs_chapter = Math.round(ratio * 1000) / 1000;
  return d;
}

// ------------------------------------------------------------------ whole file
export interface SideBySideParagraph { id: string; type: string; text: string; }
export interface SideBySideRow { id: string; confidence: string; note?: string; en: SideBySideParagraph[]; de: SideBySideParagraph[]; }
export interface SideBySideChapter { id: string; number: number; alignment_status: string; title: { en: string; de: string }; rows: SideBySideRow[]; }
export interface SideBySideFile { meta: any; chapters: SideBySideChapter[]; }

export interface ScoredGroup {
  group_id: string; chapter_id: string; chapter_number: number; sequence: number;
  en_paragraph_ids: string[]; de_paragraph_ids: string[];
  passage_type: HeidiPassage['passage_type']; speaker: string | null; speaker_label: string | null; speaker_conflict: boolean;
  alignment: { source_confidence: string; status: HeidiAlignmentStatus; bead: string; note: string | null };
  analysis: HeidiPassage['analysis'] & { direct_semantic_score: number | null };
  unlocated_evidence: { dimension: string; side: string; text: string; evidence_id?: string }[];
}

function anchor(span: HeidiSpan, ids: string[], texts: string[]) {
  let pos = 0;
  for (let i = 0; i < ids.length; i++) {
    const end = pos + texts[i].length;
    if (span.start >= pos && span.end <= end) { return { paragraph_id: ids[i], start: span.start - pos, end: span.end - pos }; }
    pos = end + HEIDI_JOIN.length;
  }
  return null;
}

/**
 * Structural metadata for one alignment group (passage type, speaker, alignment status/bead) WITHOUT any scoring.
 * Used by the UI since the literary analysis replaced the heuristic scores.
 */
export function structureOf(ch: SideBySideChapter, r: SideBySideRow, seq: number): ScoredGroup {
  const enTx = r.en.map(p => p.text), deTx = r.de.map(p => p.text);
  const enIds = r.en.map(p => p.id), deIds = r.de.map(p => p.id);
  const en = enTx.join(HEIDI_JOIN) || null, de = deTx.join(HEIDI_JOIN) || null;
  const status: HeidiAlignmentStatus = !en || !de ? (de && !en ? 'unmatched_de' : 'unmatched_en') : (STATUS_MAP[r.confidence] ?? 'needs_review');
  let ptype = passageType((de || en)!);
  if (en && de && passageType(en) !== ptype) { ptype = ptype === 'narration' || passageType(en) === 'narration' ? 'mixed' : ptype; }
  const spkDe = de && ptype !== 'narration' ? detectSpeaker(de, 'de') : null;
  const spkEn = en && ptype !== 'narration' ? detectSpeaker(en, 'en') : null;
  const speaker = spkDe && (spkDe === spkEn || !spkEn) ? spkDe : (!spkDe ? spkEn : null);
  return {
    group_id: r.id, chapter_id: ch.id, chapter_number: ch.number, sequence: seq,
    en_paragraph_ids: enIds, de_paragraph_ids: deIds, passage_type: ptype,
    speaker, speaker_label: speaker ? SPEAKER_LABEL[speaker] : null, speaker_conflict: !!(spkDe && spkEn && spkDe !== spkEn),
    alignment: { source_confidence: r.confidence, status, bead: `${deIds.length}:${enIds.length}`, note: r.note ?? null },
    analysis: { status: 'awaiting_analysis', method: null, dimensions: {}, direct_semantic_score: null },
    unlocated_evidence: [],
  };
}

/** Score one alignment group (null analysis dimensions when the alignment is not usable). */
export function scoreGroup(ch: SideBySideChapter, r: SideBySideRow, seq: number, ratioCh: number): ScoredGroup {
  const enTx = r.en.map(p => p.text), deTx = r.de.map(p => p.text);
  const enIds = r.en.map(p => p.id), deIds = r.de.map(p => p.id);
  const en = enTx.join(HEIDI_JOIN) || null, de = deTx.join(HEIDI_JOIN) || null;
  const status: HeidiAlignmentStatus = !en || !de ? (de && !en ? 'unmatched_de' : 'unmatched_en') : (STATUS_MAP[r.confidence] ?? 'needs_review');
  let ptype = passageType((de || en)!);
  if (en && de && passageType(en) !== ptype) { ptype = ptype === 'narration' || passageType(en) === 'narration' ? 'mixed' : ptype; }
  const spkDe = de && ptype !== 'narration' ? detectSpeaker(de, 'de') : null;
  const spkEn = en && ptype !== 'narration' ? detectSpeaker(en, 'en') : null;
  const speaker = spkDe && (spkDe === spkEn || !spkEn) ? spkDe : (!spkDe ? spkEn : null);
  const g: ScoredGroup = {
    group_id: r.id, chapter_id: ch.id, chapter_number: ch.number, sequence: seq,
    en_paragraph_ids: enIds, de_paragraph_ids: deIds, passage_type: ptype,
    speaker, speaker_label: speaker ? SPEAKER_LABEL[speaker] : null, speaker_conflict: !!(spkDe && spkEn && spkDe !== spkEn),
    alignment: { source_confidence: r.confidence, status, bead: `${deIds.length}:${enIds.length}`, note: r.note ?? null },
    analysis: { status: 'blocked_alignment_review', method: null, dimensions: {}, direct_semantic_score: null },
    unlocated_evidence: [],
  };
  if (!SCORED.has(status) || !en || !de) {
    g.analysis = en && de
      ? { status: 'blocked_alignment_review', method: null, dimensions: {}, direct_semantic_score: null, note: 'Scores withheld until the alignment is verified by an expert.' }
      : { status: 'not_applicable_unmatched', method: null, dimensions: {}, direct_semantic_score: null, note: 'Unmatched passage: no counterpart in the other language (possible omission/addition).' };
    return g;
  }
  const [sem, semScore] = aSemantic(de, en);
  const dims: Partial<Record<HeidiDimensionKey, Dim>> = {
    semantic: sem, emotion: aEmotion(de, en), imagery: aImagery(de, en), tone: aTone(de, en),
    voice: aVoice(de, en, spkDe, spkEn), cultural: aCultural(de, en), omissions: aOmissions(de, en, ratioCh),
    wordplay: na('Wordplay is not detected automatically; requires expert assessment.', 'not_assessed'),
  };
  const texts = { de, en }, ids = { de: deIds, en: enIds }, paras = { de: deTx, en: enTx };
  for (const [dk, dv] of Object.entries(dims) as [string, Dim][]) {
    for (const side of ['de', 'en'] as const) {
      const key = side === 'de' ? 'evidence_de' : 'evidence_en';
      dv[key] = dv[key].filter(s => {
        if (texts[side].slice(s.start, s.end) === s.text) { (s as any).anchor = anchor(s, ids[side], paras[side]); return true; }
        g.unlocated_evidence.push({ dimension: dk, side, text: s.text });
        return false;
      });
    }
    for (const ev of dv.phrase_evidence) {
      ev.id = `${r.id}:${dk}:${ev.id}`;
      for (const side of ['de', 'en'] as const) {
        const s = ev[side];
        if (s && texts[side].slice(s.start, s.end) !== s.text) {
          g.unlocated_evidence.push({ dimension: dk, side, text: s.text, evidence_id: ev.id });
          ev[side] = null;
        } else if (s) {
          (s as any).anchor = anchor(s, ids[side], paras[side]);
        }
      }
    }
  }
  g.analysis = { status: 'automated_provisional', method: HEIDI_SCORING_METHOD, dimensions: dims, direct_semantic_score: semScore };
  return g;
}

/** Score every group of the side-by-side file. Pure and deterministic. */
export function scoreSideBySide(src: SideBySideFile): ScoredGroup[] {
  const out: ScoredGroup[] = [];
  for (const ch of src.chapters) {
    const enAll = ch.rows.reduce((n, r) => n + r.en.reduce((m, p) => m + p.text.length, 0), 0);
    const deAll = ch.rows.reduce((n, r) => n + r.de.reduce((m, p) => m + p.text.length, 0), 0);
    const ratio = enAll / Math.max(1, deAll);
    ch.rows.forEach((r, i) => out.push(scoreGroup(ch, r, i + 1, ratio)));
  }
  return out;
}
