import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from, of, throwError, forkJoin } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import {
  HEIDI_RTT_STORAGE_KEY,
  HEIDI_RTT_THRESHOLD_DEFAULT,
  HeidiPassage,
  HeidiRoundTrip,
} from '../models/heidi.models';

/**
 * Reverse-translation consistency check for Heidi (v2).
 *
 *   Human English (Stork)  ←  German original (Spyri)  →  AI back-translated English
 *   compare: Human English ↔ AI back-translated English
 *
 * German is the literary original, so this is NOT a classic round trip of the
 * human translation: it checks whether an independent machine reading of the
 * German original recovers the content of Stork's English. Only `german_text`
 * is sent to the NMT endpoint; Stork's English is the comparison reference.
 *
 * Translation model : MyMemory public NMT API (langpair de|en). Keyless public
 *                     endpoint with CORS — no API key exists in client code.
 * Similarity model  : heidi-english-lexical-sim-v1 (identical to
 *                     scripts/heidi_rtt_pipeline.py::english_similarity)
 *                     — lexical/morphological, not neural; scale not calibrated.
 */
export const HEIDI_TRANSLATION_MODEL = 'MyMemory-NMT de|en';
export const HEIDI_SIMILARITY_MODEL = 'heidi-english-lexical-sim-v1';
export const HEIDI_RTT_CONFIG = 'v2';
export const HEIDI_RTT_DIRECTION = 'German original → AI English, compared with the human English translation (reverse-translation consistency check)';

const EN_STOP = new Set(`a about after again all am an and any are as at be because been before being both but by can could did do does
doing down during each few for from further had has have having he her here hers herself him himself his how i if in into is it its itself
just me more most my myself no nor not now of off on once only or other our ours out over own same she should so some such than that the
their theirs them themselves then there these they this those through to too under until up very was we were what when where which while
who whom why will with would you your yours yourself said says shall upon oh`.split(/\s+/).filter(Boolean));

/** Light English suffix stripper (documented, deterministic; mirrored in Python). */
export function enStem(w: string): string {
  let s = w.toLowerCase().replace(/[’']/g, '');
  for (const suf of ['ingly', 'edly', 'ing', 'ies', 'ied', 'ed', 'es', 'ly', 's']) {
    if (s.length - suf.length >= 3 && s.endsWith(suf)) {
      s = s.slice(0, -suf.length) + (suf === 'ies' || suf === 'ied' ? 'y' : '');
      break;
    }
  }
  return s;
}

/** heidi-english-lexical-sim-v1 → 0–100, or null when either side is empty. Same weighting as the German variant. */
export function englishSimilarity(a: string, b: string): number | null {
  const tok = (x: string) => (x.toLowerCase().match(/[a-z][a-z’']*/g) || []);
  const ta = tok(a), tb = tok(b);
  if (!ta.length || !tb.length) { return null; }
  const fa = ta.filter(t => !EN_STOP.has(t)), fb = tb.filter(t => !EN_STOP.has(t));
  const sa = (fa.length ? fa : ta).map(enStem), sb = (fb.length ? fb : tb).map(enStem);
  return lexicalSimilarity(sa, sb, ta.length, tb.length);
}

function lexicalSimilarity(sa: string[], sb: string[], la: number, lb: number): number {
  const A = new Set(sa), B = new Set(sb);
  const inter = [...A].filter(x => B.has(x)).length;
  const jac = inter / new Set([...A, ...B]).size;
  const grams = (st: string[]) => {
    const g = new Set<string>();
    for (const s0 of st) {
      const s = `_${s0}_`;
      for (let i = 0; i < Math.max(1, s.length - 3); i++) { g.add(s.substring(i, i + 4)); }
    }
    return g;
  };
  const ga = grams(sa), gb = grams(sb);
  const gi = [...ga].filter(x => gb.has(x)).length;
  const dice = ga.size && gb.size ? (2 * gi) / (ga.size + gb.size) : 0;
  const bg = (st: string[]) => new Set(st.slice(0, -1).map((s, i) => s + '\u0001' + st[i + 1]));
  const ba = bg(sa), bb = bg(sb);
  const bi = [...ba].filter(x => bb.has(x)).length;
  const bu = new Set([...ba, ...bb]).size;
  const big = (ba.size || bb.size) ? bi / bu : jac;
  const lr = Math.min(la, lb) / Math.max(la, lb);
  return Math.round(1000 * (0.45 * jac + 0.30 * dice + 0.15 * big + 0.10 * lr)) / 10;
}
/** Workflow B storage (Human English → AI German → AI English); separate from Workflow A records. */
export const HEIDI_RTT_EN_STORAGE_KEY = 'heidi_analysis_rtt_en_v1';

export interface EnRoundTripRecord {
  passage_id: string;
  workflow: 'en_to_ai_de_to_ai_en';
  status: 'running' | 'done' | 'failed';
  ai_german: string | null;
  ai_back_english: string | null;
  similarity_to_human_english: number | null;
  translation_model: string;
  similarity_model: string;
  generated_at: string | null;
  error: string | null;
  source_text?: string;
}

export const HEIDI_RTT_ENDPOINT = 'https://api.mymemory.translated.net/get';

const DE_STOP = new Set(`aber alle allem allen aller alles als also am an ander andere auch auf aus bei bin bis bist da damit dann
das dass daß dem den denn der des dessen dich die dies diese diesem diesen dieser dieses dir doch dort du durch ein eine
einem einen einer eines er es etwas euch euer eure für hatte hatten hat habe haben hier ich ihm ihn ihnen ihr ihre im in
ins ist ja jetzt kann kein keine man mich mir mit muss nach nicht noch nun nur ob oder ohne sein seine sich sie sind so
um und uns unter vom von vor war waren was weil wenn wer wie wieder wir wird wo zu zum zur sehr schon`.split(/\s+/).filter(Boolean));

/** CISTEM stemmer (Weissweiler & Fraser 2017), case-insensitive variant. */
export function cistem(word: string): string {
  if (!word) { return word; }
  let w = word.toLowerCase().replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ä/g, 'a').replace(/ß/g, 'ss');
  w = w.replace(/^ge(.{4,})/, '$1');
  w = w.replace(/sch/g, '$').replace(/ei/g, '%').replace(/ie/g, '&');
  w = w.replace(/(.)\1/g, '$1*');
  while (w.length > 3) {
    if (w.length > 5) {
      let w2 = w.replace(/e[mr]$/, '');
      if (w2 !== w) { w = w2; continue; }
      w2 = w.replace(/nd$/, '');
      if (w2 !== w) { w = w2; continue; }
    }
    let w3 = w.replace(/t$/, '');
    if (w3 !== w) { w = w3; continue; }
    w3 = w.replace(/[esn]$/, '');
    if (w3 !== w) { w = w3; continue; }
    break;
  }
  w = w.replace(/(.)\*/g, '$1$1');
  return w.replace(/&/g, 'ie').replace(/%/g, 'ei').replace(/\$/g, 'sch');
}

function tokens(s: string): string[] {
  return (s.toLowerCase().match(/[a-zäöüß]+/g) || []);
}

/** heidi-german-lexical-sim-v1 → 0–100, or null when either side is empty. */
export function germanSimilarity(a: string, b: string): number | null {
  const ta = tokens(a), tb = tokens(b);
  if (!ta.length || !tb.length) { return null; }
  const fa = ta.filter(t => !DE_STOP.has(t)), fb = tb.filter(t => !DE_STOP.has(t));
  const sa = (fa.length ? fa : ta).map(cistem), sb = (fb.length ? fb : tb).map(cistem);
  const A = new Set(sa), B = new Set(sb);
  const inter = [...A].filter(x => B.has(x)).length;
  const jac = inter / new Set([...A, ...B]).size;
  const grams = (st: string[]) => {
    const g = new Set<string>();
    for (const s0 of st) {
      const s = `_${s0}_`;
      for (let i = 0; i < Math.max(1, s.length - 3); i++) { g.add(s.substring(i, i + 4)); }
    }
    return g;
  };
  const ga = grams(sa), gb = grams(sb);
  const gi = [...ga].filter(x => gb.has(x)).length;
  const dice = ga.size && gb.size ? (2 * gi) / (ga.size + gb.size) : 0;
  const bg = (st: string[]) => new Set(st.slice(0, -1).map((s, i) => s + '\u0001' + st[i + 1]));
  const ba = bg(sa), bb = bg(sb);
  const bi = [...ba].filter(x => bb.has(x)).length;
  const bu = new Set([...ba, ...bb]).size;
  const big = (ba.size || bb.size) ? bi / bu : jac;
  const lr = Math.min(ta.length, tb.length) / Math.max(ta.length, tb.length);
  return Math.round(1000 * (0.45 * jac + 0.30 * dice + 0.15 * big + 0.10 * lr)) / 10;
}

export function computeDisagreement(direct: number | null | undefined, rtt: number | null | undefined): number | null {
  if (direct === null || direct === undefined || rtt === null || rtt === undefined) { return null; }
  return Math.round(Math.abs(direct - rtt) * 10) / 10;
}

/** Split text into ≤450-byte chunks at sentence boundaries (MyMemory 500-byte limit). */
export function chunkForTranslation(text: string, maxBytes = 450): string[] {
  const enc = (s: string) => new TextEncoder().encode(s).length;
  const out: string[] = [];
  let cur = '';
  for (const sent of text.split(/(?<=[.!?])\s+/)) {
    if (cur && enc(cur + ' ' + sent) > maxBytes) { out.push(cur); cur = sent; } else { cur = (cur + ' ' + sent).trim(); }
  }
  if (cur) { out.push(cur); }
  return out;
}

export interface RttRecord extends HeidiRoundTrip {
  passage_id: string;
}

@Injectable({ providedIn: 'root' })
export class HeidiRttService {
  /**
   * Disagreement threshold on |direct − RTT| (points). Configurable and persisted per browser.
   * NOT calibrated against expert judgements: results above it are "potential disagreements".
   */
  threshold = HEIDI_RTT_THRESHOLD_DEFAULT;
  static readonly THRESHOLD_KEY = 'heidi_analysis_rtt_threshold_v1';

  setThreshold(v: number): void {
    if (!isFinite(v) || v <= 0) { return; }
    this.threshold = v;
    try { localStorage.setItem(HeidiRttService.THRESHOLD_KEY, String(v)); } catch { /* ignore */ }
    for (const r of Object.values(this.records)) {
      if ((r.status === 'agreement' || r.status === 'disagreement') && r.disagreement !== null) {
        r.status = r.disagreement >= v ? 'disagreement' : 'agreement';
        r.requires_expert_review = r.disagreement >= v;
      }
    }
    this.persist();
  }
  /** Set false to disable live generation (e.g. a deployment without network egress). */
  liveGenerationEnabled = true;
  private records: Record<string, RttRecord> = {};

  constructor(private http: HttpClient) {
    try {
      const t = Number(localStorage.getItem(HeidiRttService.THRESHOLD_KEY));
      if (t > 0) { this.threshold = t; }
    } catch { /* ignore */ }
    try {
      const raw = localStorage.getItem(HEIDI_RTT_STORAGE_KEY);
      this.records = raw ? JSON.parse(raw) : {};
    } catch {
      this.records = {};
    }
  }

  private persist(): void {
    try { localStorage.setItem(HEIDI_RTT_STORAGE_KEY, JSON.stringify(this.records)); } catch { /* ignore */ }
  }

  get(passageId: string): RttRecord | null {
    return this.records[passageId] ?? null;
  }

  completedCount(ids?: Set<string>): number {
    return Object.values(this.records).filter(r =>
      (r.status === 'agreement' || r.status === 'disagreement' || r.status === 'expert_reviewed') &&
      r.rtt_semantic_score !== null && (!ids || ids.has(r.passage_id))).length;
  }

  /** Merge results produced offline by scripts/heidi_rtt_pipeline.py (never overwrites local records). */
  mergePipelineResults(results: any[]): void {
    for (const r of results || []) {
      if (!this.records[r.passage_id] && r.rtt_semantic_score !== null) {
        this.records[r.passage_id] = {
          passage_id: r.passage_id, status: r.status, back_translated_german: null, back_translated_english: r.back_translated_english,
          translation_model: r.translation_model, similarity_model: r.similarity_model,
          direct_semantic_score: r.direct_semantic_score, rtt_semantic_score: r.rtt_semantic_score,
          disagreement: r.disagreement, requires_expert_review: r.status === 'disagreement',
          generated_at: r.generated_at, input_hash: r.input_hash,
        };
      }
    }
  }

  markExpertReviewed(passageId: string): void {
    const r = this.records[passageId];
    if (r) { r.status = 'expert_reviewed'; r.requires_expert_review = false; this.persist(); }
  }

  async inputHash(p: HeidiPassage): Promise<string> {
    const s = `${p.passage_id}|${p.german_text}|${HEIDI_TRANSLATION_MODEL}|${HEIDI_RTT_CONFIG}`;
    const subtle = (globalThis.crypto as Crypto | undefined)?.subtle;
    if (subtle) {
      const buf = await subtle.digest('SHA-256', new TextEncoder().encode(s));
      return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
    }
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return 'fnv1a-' + h.toString(16);
  }

  /** Translate the GERMAN original → ENGLISH. Stork's English is never sent. */
  translateGermanToEnglish(german: string): Observable<string> {
    const chunks = chunkForTranslation(german);
    return forkJoin(chunks.map(c =>
      this.http.get<any>(HEIDI_RTT_ENDPOINT, { params: { q: c, langpair: 'de|en' } }).pipe(
        map(res => {
          if (!res || res.responseStatus !== 200 || !res.responseData?.translatedText) {
            throw new Error(res?.responseDetails || 'Translation service returned no text');
          }
          const t: string = res.responseData.translatedText;
          if (/MYMEMORY WARNING|QUOTA/i.test(t)) { throw new Error(t); }
          return t;
        }),
      ))).pipe(map(parts => parts.join(' ')));
  }

  /**
   * Generate (or return cached) RTT for an aligned passage.
   * Emits the final record (status agreement / disagreement / failed).
   */
  generate(p: HeidiPassage, directSemantic: number | null): Observable<RttRecord> {
    if (!p.english_text || !p.german_text) {
      return throwError(() => new Error('RTT requires both an English translation and a German reference.'));
    }
    if (!this.liveGenerationEnabled) {
      return throwError(() => new Error('Live back-translation is disabled in this deployment.'));
    }
    const german = p.german_text;
    const englishReference = p.english_text;
    return from(this.inputHash(p)).pipe(
      switchMap(hash => {
        const cached = this.records[p.passage_id];
        if (cached && cached.input_hash === hash && cached.rtt_semantic_score !== null) {
          return of(cached);
        }
        this.records[p.passage_id] = this.blank(p.passage_id, 'running', hash, directSemantic);
        return this.translateGermanToEnglish(german).pipe(
          map(bt => this.evaluate(p.passage_id, bt, englishReference, directSemantic, hash)),
          catchError(err => {
            const rec = this.blank(p.passage_id, 'failed', hash, directSemantic);
            rec.error = String(err?.message || err);
            this.records[p.passage_id] = rec;
            this.persist();
            return of(rec);
          }),
        );
      }),
    );
  }

  /** Pure evaluation step — compares the AI English (from the German original) with Stork's English. */
  evaluate(passageId: string, backTranslated: string, englishReference: string, directSemantic: number | null, hash: string | null): RttRecord {
    const rtt = englishSimilarity(englishReference, backTranslated);
    const dis = computeDisagreement(directSemantic, rtt);
    const rec: RttRecord = {
      passage_id: passageId,
      status: rtt === null || dis === null ? 'failed' : (dis >= this.threshold ? 'disagreement' : 'agreement'),
      back_translated_german: null,
      back_translated_english: backTranslated,
      translation_model: HEIDI_TRANSLATION_MODEL,
      similarity_model: HEIDI_SIMILARITY_MODEL,
      direct_semantic_score: directSemantic,
      rtt_semantic_score: rtt,
      disagreement: dis,
      requires_expert_review: dis !== null && dis >= this.threshold,
      generated_at: new Date().toISOString(),
      input_hash: hash,
      error: rtt === null ? 'Similarity could not be computed (empty text).'
        : dis === null ? 'No direct semantic score to compare against (passage not scored).' : null,
    };
    this.records[passageId] = rec;
    this.persist();
    return rec;
  }

  /**
   * Re-base a cached record on the CURRENT direct semantic score (the literary analysis replaced the heuristic score;
   * the AI back-translation and its similarity are unchanged, only the difference is recomputed).
   */
  rebase(passageId: string, direct: number | null): RttRecord | null {
    const r = this.records[passageId];
    if (!r || r.direct_semantic_score === direct || r.status === 'running') { return r ?? null; }
    r.direct_semantic_score = direct;
    r.disagreement = computeDisagreement(direct, r.rtt_semantic_score);
    if (r.status !== 'expert_reviewed' && r.status !== 'failed') {
      r.status = r.disagreement === null ? 'agreement' : (r.disagreement >= this.threshold ? 'disagreement' : 'agreement');
      r.requires_expert_review = r.disagreement !== null && r.disagreement >= this.threshold;
      r.error = r.disagreement === null ? 'No direct semantic score to compare against (passage not evaluated).' : null;
    }
    this.persist();
    return r;
  }

  // ------------------------------------------------------------------ Workflow B
  /**
   * Workflow B (kept entirely separate from Workflow A and from every dimension score):
   *   Human English (Stork) → AI German → AI back-translated English, compared with Stork's English.
   * It measures how stable Stork's English is under machine round-tripping. It says nothing about fidelity to
   * Spyri, and the AI German is NOT the German original.
   */
  private enRecords: Record<string, EnRoundTripRecord> = (() => {
    try { return JSON.parse(localStorage.getItem(HEIDI_RTT_EN_STORAGE_KEY) || '{}'); } catch { return {}; }
  })();

  getEnRoundTrip(passageId: string): EnRoundTripRecord | null {
    return this.enRecords[passageId] ?? null;
  }

  private translate(text: string, langpair: 'en|de' | 'de|en'): Observable<string> {
    const chunks = chunkForTranslation(text);
    return forkJoin(chunks.map(c =>
      this.http.get<any>(HEIDI_RTT_ENDPOINT, { params: { q: c, langpair } }).pipe(
        map(res => {
          if (!res || res.responseStatus !== 200 || !res.responseData?.translatedText) {
            throw new Error(res?.responseDetails || 'Translation service returned no text');
          }
          const t: string = res.responseData.translatedText;
          if (/MYMEMORY WARNING|QUOTA/i.test(t)) { throw new Error(t); }
          return t;
        }),
      ))).pipe(map(parts => parts.join(' ')));
  }

  generateEnglishRoundTrip(p: HeidiPassage): Observable<EnRoundTripRecord> {
    if (!p.english_text) { return throwError(() => new Error('Workflow B needs Stork\'s English for this passage.')); }
    if (!this.liveGenerationEnabled) { return throwError(() => new Error('Live back-translation is disabled in this deployment.')); }
    const en = p.english_text;
    const id = p.passage_id;
    const base = (status: EnRoundTripRecord['status']): EnRoundTripRecord => ({
      passage_id: id, workflow: 'en_to_ai_de_to_ai_en', status, ai_german: null, ai_back_english: null,
      similarity_to_human_english: null, translation_model: 'MyMemory-NMT en|de, de|en', similarity_model: HEIDI_SIMILARITY_MODEL,
      generated_at: null, error: null,
    });
    const cached = this.enRecords[id];
    if (cached && cached.status === 'done' && cached.source_text === en) { return of(cached); }
    this.enRecords[id] = base('running');
    return this.translate(en, 'en|de').pipe(
      switchMap(aiDe => this.translate(aiDe, 'de|en').pipe(map(aiEn => ({ aiDe, aiEn })))),
      map(({ aiDe, aiEn }) => {
        const rec: EnRoundTripRecord = { ...base('done'), ai_german: aiDe, ai_back_english: aiEn,
          similarity_to_human_english: englishSimilarity(en, aiEn), generated_at: new Date().toISOString(), source_text: en };
        this.enRecords[id] = rec;
        this.persistEn();
        return rec;
      }),
      catchError(err => {
        const rec = { ...base('failed'), error: String(err?.message || err) };
        this.enRecords[id] = rec;
        this.persistEn();
        return of(rec);
      }),
    );
  }

  private persistEn(): void {
    try { localStorage.setItem(HEIDI_RTT_EN_STORAGE_KEY, JSON.stringify(this.enRecords)); } catch { /* ignore */ }
  }

  private blank(id: string, status: HeidiRoundTrip['status'], hash: string | null, direct: number | null): RttRecord {
    return {
      passage_id: id, status, back_translated_german: null, back_translated_english: null, translation_model: HEIDI_TRANSLATION_MODEL,
      similarity_model: HEIDI_SIMILARITY_MODEL, direct_semantic_score: direct, rtt_semantic_score: null,
      disagreement: null, requires_expert_review: false, generated_at: null, input_hash: hash, error: null,
    };
  }
}
