import { TestBed } from '@angular/core/testing';
import { HeidiReviewService } from './heidi-review.service';
import { HEIDI_REVIEW_STORAGE_KEY, HeidiPassage } from '../models/heidi.models';

const HAMLET_KEY = 'hamlet_v5_expert_reviews';

function scored(id: string, semantic: number | null): HeidiPassage {
  return {
    passage_id: id, part_id: 'P1', chapter_id: 'P1-C01', section_id: null, sequence: 1, passage_type: 'narration', speaker: null,
    speaker_label: null, speaker_conflict: false, german_text: 'Text', english_text: 'Text',
    source: { de_paragraph_indices: [0], en_paragraph_indices: [0], de_offsets: [], en_offsets: [] },
    alignment: { status: 'aligned', bead: '1:1', confidence: 0.9, components: {}, structurally_supported: false, method: 'm',
      source_pages_de: [], source_pages_en: [], print_pages_en: [] },
    analysis: { status: 'automated_provisional', method: 'automated_heuristic_v1', dimensions: {
      semantic: { status: 'scored', score: semantic, explanation: '', evidence_de: [], evidence_en: [], phrase_evidence: [],
        method: 'automated_heuristic_v1', provisional: true, confidence: 'medium', review_status: 'unreviewed' },
      wordplay: { status: 'not_assessed', score: null, explanation: '', evidence_de: [], evidence_en: [], phrase_evidence: [],
        method: 'automated_heuristic_v1', provisional: true, confidence: null, review_status: 'unreviewed' },
    } },
    round_trip_verification: { status: 'not_run', back_translated_german: null, translation_model: null, similarity_model: null,
      direct_semantic_score: semantic, rtt_semantic_score: null, disagreement: null, requires_expert_review: false, generated_at: null, input_hash: null },
    expert_review: { status: 'pending' },
  };
}

describe('HeidiReviewService (expert validation, namespaced storage)', () => {
  let svc: HeidiReviewService;
  const hamletSnapshot = JSON.stringify({ 'A1-S1-D001': { status: 'reviewed', reviewer: 'hamlet expert' } });

  beforeEach(() => {
    localStorage.removeItem(HEIDI_REVIEW_STORAGE_KEY);
    localStorage.setItem(HAMLET_KEY, hamletSnapshot);
    TestBed.configureTestingModule({});
    svc = TestBed.inject(HeidiReviewService);
    svc.reload();
  });

  afterEach(() => {
    localStorage.removeItem(HEIDI_REVIEW_STORAGE_KEY);
    localStorage.removeItem(HAMLET_KEY);
  });

  it('uses the heidi_analysis_reviews_v2 key and never touches Hamlet review data', () => {
    expect(HEIDI_REVIEW_STORAGE_KEY).toBe('heidi_analysis_reviews_v2');
    const r = svc.blank('ch01-a001');
    r.alignment.decision = 'accept';
    r.commentary = 'Pairing verified against both PDFs.';
    svc.save(r, 'Reviewer A');
    expect(localStorage.getItem(HAMLET_KEY)).toBe(hamletSnapshot);
    const stored = JSON.parse(localStorage.getItem(HEIDI_REVIEW_STORAGE_KEY)!);
    expect(stored['ch01-a001'].reviewer).toBe('Reviewer A');
    expect(stored['ch01-a001'].reviewed_at).toBeTruthy();
    expect(stored['A1-S1-D001']).toBeUndefined();
  });

  it('persists across service instances (reload)', () => {
    const r = svc.blank('ch02-a003');
    r.omission_addition = 'omission';
    svc.save(r, 'B');
    const fresh = new HeidiReviewService();
    expect(fresh.get('ch02-a003')?.omission_addition).toBe('omission');
    expect(fresh.isReviewed('ch02-a003')).toBeTrue();
  });

  it('override changes the displayed score but preserves automated score and provenance', () => {
    const p = scored('ch01-a002', 72);
    expect(svc.effectiveScore(p, 'semantic')).toEqual(jasmine.objectContaining({ score: 72, provenance: 'automated_heuristic', automatedScore: 72 }));
    const r = svc.blank(p.passage_id);
    r.dimensions.semantic = { decision: 'override', score_override: 55, comment: 'Stork condenses the clause.' };
    svc.save(r, 'C');
    const e = svc.effectiveScore(p, 'semantic');
    expect(e.score).toBe(55);
    expect(e.provenance).toBe('expert_override');
    expect(e.automatedScore).toBe(72);
    expect(e.method).toBe('automated_heuristic_v1');
    expect(p.analysis.dimensions.semantic!.score).toBe(72);
  });

  it('accepting a score keeps the automated value with expert provenance', () => {
    const p = scored('ch01-a003', 64);
    const r = svc.blank(p.passage_id);
    r.dimensions.semantic = { decision: 'accept', score_override: null, comment: null };
    svc.save(r, 'D');
    expect(svc.effectiveScore(p, 'semantic')).toEqual(jasmine.objectContaining({ score: 64, provenance: 'expert_accepted' }));
  });

  it('corrected RTT semantic score overrides semantic display only', () => {
    const p = scored('ch01-a004', 90);
    const r = svc.blank(p.passage_id);
    r.rtt_inaccurate = true;
    r.rtt_corrected_semantic_score = 70;
    svc.save(r, 'E');
    expect(svc.effectiveScore(p, 'semantic').score).toBe(70);
  });

  it('never converts missing / not-assessed scores to 0', () => {
    const p = scored('ch01-a005', null);
    expect(svc.effectiveScore(p, 'semantic').score).toBeNull();
    expect(svc.effectiveScore(p, 'wordplay').score).toBeNull();
    expect(svc.effectiveScore(p, 'emotion').score).toBeNull();
  });

  it('alignment decisions drive verified / rejected state', () => {
    const r = svc.blank('P');
    r.alignment.decision = 'reject';
    svc.save(r, 'F');
    expect(svc.alignmentRejected('P')).toBeTrue();
    expect(svc.alignmentVerified('P')).toBeFalse();
    r.alignment.decision = 'correct';
    svc.save(r, 'F');
    expect(svc.alignmentVerified('P')).toBeTrue();
  });
});
