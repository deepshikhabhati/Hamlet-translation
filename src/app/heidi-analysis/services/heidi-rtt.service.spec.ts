import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import {
  HEIDI_RTT_ENDPOINT,
  HeidiRttService,
  chunkForTranslation,
  cistem,
  computeDisagreement,
  englishSimilarity,
  germanSimilarity,
} from './heidi-rtt.service';
import { HEIDI_RTT_STORAGE_KEY, HeidiPassage } from '../models/heidi.models';

function passage(id: string, en: string | null, de: string | null): HeidiPassage {
  return {
    passage_id: id, part_id: 'P1', chapter_id: 'ch01', section_id: null, sequence: 1, passage_type: 'dialogue',
    speaker: null, speaker_label: null, speaker_conflict: false, german_text: de, english_text: en,
    source: { de_paragraph_indices: [0], en_paragraph_indices: [0], de_offsets: [[0, 1]], en_offsets: [[0, 1]] },
    alignment: { status: 'aligned', bead: '1:1', confidence: 0.9, components: {}, structurally_supported: false, method: 'test',
      source_pages_de: [2], source_pages_en: [12], print_pages_en: [] },
    analysis: { status: 'automated_provisional', method: 'automated_heuristic_v1', dimensions: {} },
    round_trip_verification: { status: 'not_run', back_translated_german: null, translation_model: null, similarity_model: null,
      direct_semantic_score: null, rtt_semantic_score: null, disagreement: null, requires_expert_review: false, generated_at: null, input_hash: null },
    expert_review: { status: 'pending' },
  };
}

describe('Heidi RTT v2 (German original → AI English, compared with Stork\'s English)', () => {
  let service: HeidiRttService;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.removeItem(HEIDI_RTT_STORAGE_KEY);
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(HeidiRttService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    localStorage.removeItem(HEIDI_RTT_STORAGE_KEY);
  });

  it('CISTEM stems match the Python reference implementation (scripts/heidi_rtt_pipeline.py)', () => {
    const expected: Record<string, string> = {
      'Großmutter': 'grossmutt', 'geschlafen': 'schlaf', 'Häuser': 'hau', 'laufend': 'lauf', 'Kindern': 'kind',
      'Gespenst': 'spe', 'sagte': 'sag', 'schönsten': 'schon', 'Heidi': 'heidi', 'gegangen': 'gang', 'Mädchen': 'madch',
    };
    for (const [w, s] of Object.entries(expected)) { expect(cistem(w)).withContext(w).toBe(s); }
  });

  it('German similarity is identical to the Python pipeline values', () => {
    expect(germanSimilarity('Bist du müde, Heidi?, fragte die Begleiterin.', 'Bist du müde, Heidi?, fragte Deta das Kind.')).toBe(53.6);
    expect(germanSimilarity('Der Großvater saß auf der Bank vor der Hütte und rauchte seine Pfeife.',
      'Der Großvater saß auf der Bank vor seiner Hütte und rauchte.')).toBe(71.3);
    expect(germanSimilarity('Die Sonne ging unter.', 'Es regnete den ganzen Tag in Frankfurt.')).toBe(5.7);
    expect(germanSimilarity('', 'Text')).toBeNull();
  });

  it('computes disagreement as |direct − rtt| and never treats null as zero', () => {
    expect(computeDisagreement(80, 61.5)).toBe(18.5);
    expect(computeDisagreement(50, 70)).toBe(20);
    expect(computeDisagreement(null, 70)).toBeNull();
    expect(computeDisagreement(80, null)).toBeNull();
    expect(computeDisagreement(0, 0)).toBe(0);
  });

  it('English similarity (heidi-english-lexical-sim-v1) is symmetric-in-range, 100 for identical text and null for empty input', () => {
    const a = '"Are you tired, Heidi?" Deta asked the child.';
    expect(englishSimilarity(a, a)).toBe(100);
    const s = englishSimilarity(a, '"Are you tired, Heidi?" asked the companion.')!;
    expect(s).toBeGreaterThan(30);
    expect(s).toBeLessThan(100);
    expect(englishSimilarity('The sun went down.', 'It rained all day in Frankfurt.')!).toBeLessThan(20);
    expect(englishSimilarity('', 'text')).toBeNull();
    // parity with scripts/heidi_rtt_pipeline.py english_similarity()
    expect(englishSimilarity('"Are you tired, Heidi?" Deta asked the child.', '"Are you tired, Heidi?" asked the companion.')).toBe(49.2);
  });

  it('chunks long English text for the 500-byte NMT limit without losing text', () => {
    const text = Array.from({ length: 30 }, (_, i) => `Sentence number ${i} is about the Alm.`).join(' ');
    const chunks = chunkForTranslation(text);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.join(' ')).toBe(text);
    chunks.forEach(c => expect(new TextEncoder().encode(c).length).toBeLessThanOrEqual(450));
  });

  it('sends ONLY the German original (langpair de|en) and compares the AI English with Stork\'s English', async () => {
    const p = passage('ch01-a004', '"Are you tired, Heidi?" Deta asked the child.', '"Bist du müde, Heidi?", fragte die Begleiterin.');
    const done = new Promise<any>(resolve => service.generate(p, 100).subscribe(resolve));
    // inputHash is async (crypto.subtle) — wait a tick for the request to be issued
    await new Promise(r => setTimeout(r, 20));
    const req = http.expectOne(r => r.url === HEIDI_RTT_ENDPOINT);
    expect(req.request.params.get('langpair')).toBe('de|en');
    expect(req.request.params.get('q')).toBe(p.german_text!);
    expect(req.request.params.get('q')).not.toContain('tired');
    const bt = '"Are you tired, Heidi?" asked the companion.';
    req.flush({ responseStatus: 200, responseData: { translatedText: bt } });
    const rec = await done;
    expect(rec.back_translated_english).toBe(bt);
    expect(rec.back_translated_german).toBeNull();
    expect(rec.rtt_semantic_score).toBe(englishSimilarity(p.english_text!, bt));
    expect(rec.disagreement).toBe(computeDisagreement(100, rec.rtt_semantic_score));
    expect(rec.status).toBe(rec.disagreement! >= 15 ? 'disagreement' : 'agreement');
    expect(rec.input_hash).toBeTruthy();
    // persisted under the Heidi v2 namespace only
    expect(HEIDI_RTT_STORAGE_KEY).toBe('heidi_analysis_rtt_v2');
    expect(JSON.parse(localStorage.getItem(HEIDI_RTT_STORAGE_KEY)!)[p.passage_id].status).toBe(rec.status);
    expect(service.completedCount()).toBe(1);
  });

  it('records a failed status (no simulated result) when the endpoint fails', async () => {
    const p = passage('ch01-a005', 'No, but hot.', 'Nein, es ist mir heiß.');
    const done = new Promise<any>(resolve => service.generate(p, 90).subscribe(resolve));
    await new Promise(r => setTimeout(r, 20));
    http.expectOne(r => r.url === HEIDI_RTT_ENDPOINT).flush('down', { status: 503, statusText: 'Service Unavailable' });
    const rec = await done;
    expect(rec.status).toBe('failed');
    expect(rec.rtt_semantic_score).toBeNull();
    expect(rec.back_translated_english).toBeNull();
    expect(service.completedCount()).toBe(0);
  });

  it('refuses unmatched passages and disabled deployments', (done) => {
    service.generate(passage('X', null, 'Nur Deutsch'), 50).subscribe({ error: e => {
      expect(String(e.message)).toContain('English');
      service.liveGenerationEnabled = false;
      service.generate(passage('Y', 'English', 'Deutsch'), 50).subscribe({ error: e2 => { expect(String(e2.message)).toContain('disabled'); done(); } });
    } });
  });

  it('flags disagreements at the configurable threshold', () => {
    service.threshold = 15;
    const r1 = service.evaluate('A', 'The sun went down.', 'The sun went down.', 80, null);
    expect(r1.rtt_semantic_score).toBe(100);
    expect(r1.disagreement).toBe(20);
    expect(r1.status).toBe('disagreement');
    service.threshold = 25;
    const r2 = service.evaluate('B', 'The sun went down.', 'The sun went down.', 80, null);
    expect(r2.status).toBe('agreement');
    const r3 = service.evaluate('C', 'The sun went down.', 'The sun went down.', null, null);
    expect(r3.disagreement).toBeNull();
    expect(r3.status).toBe('failed');
    expect(r3.error).toContain('No direct semantic score');
  });
});
