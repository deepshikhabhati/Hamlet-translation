import { TestBed } from '@angular/core/testing';
import { PHRASE_CATEGORIES, DISAGREEMENT_LABELS, categoryMeta, disagreementOf, locateSpan, normalizeCategory } from './phrase-categories';
import { EvidenceReviewService } from './evidence-review.service';
import { DimensionSummaryComponent } from './dimension-summary.component';
import { RttComparePanelComponent } from './rtt-compare-panel.component';
import { EvidenceDetailComponent, EvidenceVm } from './evidence-detail.component';
import { EvidenceHighlightedTextComponent } from '../../hamlet-analysis/components/evidence-highlighted-text/evidence-highlighted-text.component';

describe('Shared analysis — phrase categories, disagreement and span validation', () => {
  it('uses the specified colours: Preserved green, Changed amber, Lost red, Added purple, Uncertain gray dotted', () => {
    expect(PHRASE_CATEGORIES.map(c => c.key)).toEqual(['Preserved', 'Changed', 'Lost', 'Added', 'Uncertain']);
    expect(categoryMeta('Preserved').color).toBe('#16a34a');
    expect(categoryMeta('Changed').color).toBe('#d97706');
    expect(categoryMeta('Lost').color).toBe('#dc2626');
    expect(categoryMeta('Added').color).toBe('#9333ea');
    expect(categoryMeta('Uncertain').underline).toBe('dotted');
  });

  it('normalises dataset statuses and routes review / missing statuses to Uncertain', () => {
    expect(normalizeCategory('Preserved')).toBe('Preserved');
    expect(normalizeCategory('Partially preserved')).toBe('Changed');
    expect(normalizeCategory('Lost')).toBe('Lost');
    expect(normalizeCategory('Added')).toBe('Added');
    expect(normalizeCategory('Needs review')).toBe('Uncertain');
    expect(normalizeCategory(null)).toBe('Uncertain');
    expect(normalizeCategory('Preserved', true)).toBe('Uncertain');
  });

  it('computes |direct − RTT| against a configurable threshold and never treats a missing value as 0', () => {
    expect(disagreementOf(80, 60, 15)).toEqual({ diff: -20, abs: 20, status: 'potential_disagreement' });
    expect(disagreementOf(80, 70, 15)).toEqual({ diff: -10, abs: 10, status: 'agree' });
    expect(disagreementOf(80, 70, 10).status).toBe('potential_disagreement');
    expect(disagreementOf(null, 70, 15).status).toBe('not_evaluated');
    expect(disagreementOf(80, null, 15)).toEqual({ diff: null, abs: null, status: 'not_evaluated' });
    expect(DISAGREEMENT_LABELS.potential_disagreement).toBe('Potential disagreement — review recommended');
    expect(DISAGREEMENT_LABELS.not_evaluated).toBe('Not evaluated');
  });

  it('validates offsets in Unicode code points against the exact displayed text', () => {
    const t = 'Grüß Gott 👋 Heidi';
    expect(locateSpan(t, 0, 4, 'Grüß')).toEqual({ start: 0, end: 4 });
    expect(locateSpan(t, 12, 17, 'Heidi')).toEqual({ start: 12, end: 17 });
    expect(locateSpan(t, 0, 4, 'Gruss')).toBeNull();
    expect(locateSpan(t, 5, 100, null)).toBeNull();
    expect(locateSpan(t, 4, 4)).toBeNull();
    expect(locateSpan(null, 0, 1)).toBeNull();
  });
});

describe('EvidenceReviewService', () => {
  let svc: EvidenceReviewService;
  beforeEach(() => {
    localStorage.removeItem('hamlet_evidence_reviews_v1');
    localStorage.removeItem('heidi_evidence_reviews_v1');
    svc = new EvidenceReviewService();
  });
  afterEach(() => {
    localStorage.removeItem('hamlet_evidence_reviews_v1');
    localStorage.removeItem('heidi_evidence_reviews_v1');
  });

  it('stores decisions per project and preserves the original machine assessment', () => {
    svc.record({ evidence_id: 'e1', project: 'heidi', location: 'ch01-a001', dimension: 'semantic', decision: 'reclassify',
      corrected_category: 'Lost', corrected_source_phrase: null, corrected_target_phrase: null, note: 'n', reviewer: 'R',
      original: { category: 'Preserved', source_phrase: 'wenig', target_phrase: 'little', method: 'm' } });
    expect(svc.effectiveCategory('heidi', 'e1', 'Preserved')).toBe('Lost');
    expect(svc.get('heidi', 'e1')!.original.category).toBe('Preserved');
    expect(svc.get('hamlet', 'e1')).toBeNull();
    expect(JSON.parse(localStorage.getItem('heidi_evidence_reviews_v1')!).e1.decision).toBe('reclassify');
    expect(localStorage.getItem('hamlet_evidence_reviews_v1')).toBeNull();
    svc.record({ ...svc.get('heidi', 'e1')!, decision: 'reject', corrected_category: null });
    expect(svc.isRejected('heidi', 'e1')).toBeTrue();
    svc.record({ ...svc.get('heidi', 'e1')!, decision: 'uncertain' });
    expect(svc.effectiveCategory('heidi', 'e1', 'Preserved')).toBe('Uncertain');
    svc.clear('heidi', 'e1');
    expect(svc.effectiveCategory('heidi', 'e1', 'Preserved')).toBe('Preserved');
  });
});

describe('Shared analysis components', () => {
  beforeEach(async () => {
    localStorage.removeItem('heidi_evidence_reviews_v1');
    await TestBed.configureTestingModule({
      imports: [DimensionSummaryComponent, RttComparePanelComponent, EvidenceDetailComponent, EvidenceHighlightedTextComponent],
    }).compileComponents();
  });
  afterEach(() => localStorage.removeItem('heidi_evidence_reviews_v1'));

  it('DimensionSummary shows "Not evaluated" for missing scores (never 0) and the disagreement status', () => {
    const f = TestBed.createComponent(DimensionSummaryComponent);
    f.componentInstance.dimensionLabel = 'Emotion';
    f.componentInstance.direct = 82;
    f.componentInstance.rtt = null;
    f.detectChanges();
    const el: HTMLElement = f.nativeElement;
    expect(el.querySelector('[data-test="ds-direct"]')!.textContent).toContain('82/100');
    expect(el.querySelector('[data-test="ds-rtt"]')!.textContent).toBe('Not evaluated');
    expect(el.querySelector('[data-test="ds-status"]')!.textContent).toBe('Not evaluated');
    f.componentInstance.rtt = 60;
    f.componentInstance.threshold = 15;
    f.detectChanges();
    expect(el.querySelector('[data-test="ds-diff"]')!.textContent).toContain('22');
    expect(el.querySelector('[data-test="ds-status"]')!.textContent).toBe('Potential disagreement — review recommended');
  });

  it('RttComparePanel: tabs switch columns, "RTT Not Run" without RTT, threshold change is emitted', () => {
    const f = TestBed.createComponent(RttComparePanelComponent);
    const c = f.componentInstance;
    c.rows = [{ key: 'semantic', name: 'Semantic', direct: 90, rtt: null }, { key: 'emotion', name: 'Emotion', direct: null, rtt: null }];
    c.texts = [{ label: 'A', text: 'a', lang: 'en' }, { label: 'B', text: 'b', lang: 'de' }, { label: 'BT', text: null, lang: 'en', ai: true }];
    f.detectChanges();
    const el: HTMLElement = f.nativeElement;
    expect(el.querySelector('[data-test="rttp-not-run"]')).toBeTruthy();
    expect(el.querySelector('[data-test="rttp-bt"]')!.textContent).toContain('Not generated yet');
    expect(el.querySelector('[data-test="rttp-row-emotion"]')!.textContent).toContain('N/A');
    c.rows = [{ key: 'semantic', name: 'Semantic', direct: 90, rtt: 70 }, { key: 'emotion', name: 'Emotion', direct: 80, rtt: null }];
    f.detectChanges();
    expect(el.querySelector('[data-test="rttp-not-run"]')).toBeNull();
    expect(el.querySelector('[data-test="rttp-row-semantic"]')!.textContent).toContain('Potential disagreement — review recommended');
    expect(el.querySelector('[data-test="rttp-row-emotion"]')!.textContent).toContain('Not evaluated');
    (el.querySelector('[data-test="rttp-rtt"]') as HTMLElement).click();
    f.detectChanges();
    expect(Array.from(el.querySelectorAll('th')).map(t => t.textContent!.trim())).toEqual(['Dimension', 'RTT', 'Status', 'Evidence']);
    let emitted: number | null = null;
    c.thresholdChange.subscribe(v => emitted = v);
    const input = el.querySelector('[data-test="rttp-threshold"]') as HTMLInputElement;
    input.value = '25';
    input.dispatchEvent(new Event('input'));
    expect(emitted).toBe(25 as any);
  });

  it('EvidenceDetail records accept / reclassify / uncertain without changing the machine assessment, and Next emits', () => {
    const f = TestBed.createComponent(EvidenceDetailComponent);
    const c = f.componentInstance;
    const vm: EvidenceVm = { project: 'heidi', evidenceId: 'ch01-a001:semantic:sem-1', dimensionKey: 'semantic', dimensionLabel: 'Semantic',
      location: 'ch01-a001', sourceLabel: 'German', sourcePhrase: 'wenig', translationLabel: 'English', translationPhrase: 'little',
      backTranslationPhrase: null, category: 'Preserved', directScore: 100, rttScore: null, explanation: 'x', alignmentConfidence: 'verified',
      method: 'automated_heuristic_v1', provenance: 'p', unlocated: true };
    c.ev = vm;
    c.hasNext = true;
    c.ngOnChanges();
    f.detectChanges();
    const el: HTMLElement = f.nativeElement;
    expect(el.querySelector('[data-test="ed-unlocated"]')).toBeTruthy();
    (el.querySelector('[data-test="ed-accept"]') as HTMLElement).click();
    f.detectChanges();
    expect(el.querySelector('[data-test="ed-expert"]')!.textContent).toContain('Accepted');
    (el.querySelector('[data-test="ed-reclassify"]') as HTMLElement).click();
    f.detectChanges();
    c.category = 'Lost';
    (el.querySelector('[data-test="ed-save-reclassify"]') as HTMLElement).click();
    f.detectChanges();
    const svc = TestBed.inject(EvidenceReviewService);
    expect(svc.get('heidi', vm.evidenceId)!.corrected_category).toBe('Lost');
    expect(svc.get('heidi', vm.evidenceId)!.original.category).toBe('Preserved');
    expect(el.querySelector('[data-test="ed-machine-cat"]')!.textContent).toContain('Preserved');
    (el.querySelector('[data-test="ed-uncertain"]') as HTMLElement).click();
    expect(svc.effectiveCategory('heidi', vm.evidenceId, 'Preserved')).toBe('Uncertain');
    let next = false;
    c.next.subscribe(() => next = true);
    (el.querySelector('[data-test="ed-next"]') as HTMLElement).click();
    expect(next).toBeTrue();
  });

  it('highlighted text: amber Changed, gray dotted Uncertain, exact spans, stable DOM for identical inputs', () => {
    const f = TestBed.createComponent(EvidenceHighlightedTextComponent);
    const c = f.componentInstance;
    c.text = 'Der Großvater saß dort.';
    c.spans = [{ start: 4, end: 13, status: 'Changed', isSource: true, linkId: 'e1' }, { start: 14, end: 17, status: 'Preserved', isSource: true, needs_review: true, linkId: 'e2' }];
    c.ngOnChanges({ text: {} as any, spans: {} as any });
    f.detectChanges();
    const spans = Array.from((f.nativeElement as HTMLElement).querySelectorAll('.ev-span'));
    expect(spans.map(s => s.textContent)).toEqual(['Großvater', 'saß']);
    expect(spans[0].classList).toContain('ev-span-changed');
    expect(spans[0].getAttribute('data-category')).toBe('Changed');
    expect(spans[1].classList).toContain('ev-span-review');
    expect(spans[1].getAttribute('data-category')).toBe('Uncertain');
    expect(getComputedStyle(spans[1]).textDecorationStyle).toBe('dotted');
    const first = spans[0];
    c.spans = c.spans.map(s => ({ ...s }));
    c.ngOnChanges({ spans: {} as any });
    f.detectChanges();
    expect((f.nativeElement as HTMLElement).querySelector('.ev-span')).toBe(first);
  });
});
