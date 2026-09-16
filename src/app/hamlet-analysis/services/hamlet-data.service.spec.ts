import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HamletDataService } from './hamlet-data.service';

describe('HamletDataService phrase evidence', () => {
  let service: HamletDataService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });
    service = TestBed.inject(HamletDataService);
    http = TestBed.inject(HttpTestingController);
    localStorage.removeItem('hamlet_phrase_evidence_validations');
  });

  afterEach(() => {
    http.verify();
    localStorage.removeItem('hamlet_phrase_evidence_validations');
  });

  it('loads phrase evidence JSON and finds passage by id', () => {
    let result: any;
    service.getPhraseEvidenceData().subscribe((d) => (result = d));
    const req = http.expectOne('assets/data/hamlet_phrase_alignment_ui.json');
    req.flush({
      passages: [{ passage_id: 'A1-01', phrase_alignments: [] }],
      overview_heatmap: { cells: [] },
      validation_options: ['Agree'],
    });
    expect(result.passages.length).toBe(1);
    expect(service.getPhrasePassageById('A1-01')?.passage_id).toBe('A1-01');
    expect(service.getPhrasePassageById('missing')).toBeNull();
  });

  it('reads evidence for target version and dimension', () => {
    const alignment = {
      alignment_id: 'AL-1',
      targets: {
        context_ai_german: {
          phrase_id: 'p1',
          text: 'Hallo',
          evidence: [
            {
              dimension: 'semantic',
              applicable: true,
              score: 94,
              status: 'Preserved',
              rules: ['R1'],
              source_features: [],
              target_features: [],
              explanation: 'ok',
            },
          ],
        },
      },
    };
    const ev = service.getEvidence(alignment, 'context_ai_german', 'semantic');
    expect(ev?.score).toBe(94);
    expect(service.getEvidence(alignment, 'context_ai_german', 'wordplay')).toBeNull();
  });

  it('stores validation without overwriting original score field', () => {
    service.saveValidation({
      passage_id: 'A1-01',
      alignment_id: 'AL-1',
      target_version: 'ai_german',
      dimension: 'semantic',
      decision: 'Agree',
      original_score: 80,
      corrected_score: 90,
      comment: 'fine',
      reviewer: 'tester',
      reviewed_at: null,
    });
    const saved = service.getValidation('A1-01', 'AL-1', 'ai_german', 'semantic');
    expect(saved?.original_score).toBe(80);
    expect(saved?.corrected_score).toBe(90);
    expect(saved?.decision).toBe('Agree');
  });

  it('formats null scores as N/A not zero', () => {
    expect(service.formatScore(null)).toBe('N/A');
    expect(service.formatScore(undefined)).toBe('N/A');
    expect(service.formatScore(0)).toBe('0');
  });
});
