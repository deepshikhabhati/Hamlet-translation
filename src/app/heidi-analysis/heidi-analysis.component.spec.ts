import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { Router } from '@angular/router';
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeidiAnalysisComponent, categorizeEvidence, hamletScoreClass } from './heidi-analysis.component';
import { HeidiDataService } from './services/heidi-data.service';
import { HeidiReviewService } from './services/heidi-review.service';
import { HeidiRttService } from './services/heidi-rtt.service';
import { HeidiAlignmentService, isAlignmentUsable } from './services/heidi-alignment.service';
import { SideBySideFile } from './services/heidi-data.service';
import { HttpTestingController } from '@angular/common/http/testing';
import { HEIDI_ALIGNMENT_URL } from './models/heidi.models';
import { EvidenceReviewService } from '../shared/analysis/evidence-review.service';
import { HEIDI_REVIEW_STORAGE_KEY, HEIDI_RTT_STORAGE_KEY, HeidiDataset, HeidiPassage } from './models/heidi.models';
import { APP_ROUTES } from '../app-routing.module';
import { buildSegments } from './components/heidi-reader-text.component';
import { HEIDI_LITERARY_URL, LitFile, mapDimension, mapPassageAnalysis } from './literary/heidi-literary';

const EXPECTED_TITLES_DE = [
  'Zum Alm-Öhi hinauf', 'Beim Großvater', 'Auf der Weide', 'Bei der Großmutter',
  'Es kommt ein Besuch und dann noch einer, der mehr Folgen hat', 'Ein neues Kapitel und lauter neue Dinge',
  'Fräulein Rottenmeier hat einen unruhigen Tag', "Im Hause Sesemann geht's unruhig zu",
  'Der Hausherr hört allerlei in seinem Hause, das er noch nicht gehört hat', 'Eine Großmama',
  'Heidi nimmt auf einer Seite zu und auf der anderen ab', "Im Hause Sesemann spukt's",
  'Am Sommerabend die Alm hinan', "Am Sonntag, wenn's läutet",
];

let DATASET: HeidiDataset;

let SBS: SideBySideFile;
let LIT: LitFile;

async function fetchAsset<T>(name: string): Promise<T> {
  for (const url of [`/assets/data/${name}`, `/_karma_webpack_/assets/data/${name}`]) {
    const r = await fetch(url);
    if (r.ok) { return r.json(); }
  }
  throw new Error(`${name} not served to Karma`);
}

/** Texts come from the curated side-by-side file; scores and evidence from the literary analysis file (no browser scoring). */
async function loadDataset(): Promise<HeidiDataset> {
  SBS = SBS || await fetchAsset<SideBySideFile>('heidi_part1_side_by_side.json');
  LIT = LIT || await fetchAsset<LitFile>('heidi_literary_analysis.json');
  return new HeidiDataService(null as any).compose(SBS, LIT);
}

const all = (d: HeidiDataset): HeidiPassage[] => d.parts.flatMap(p => p.chapters.flatMap(c => c.passages));

describe('Heidi dataset integrity (side-by-side text + literary analysis)', () => {
  beforeAll(async () => { DATASET = await loadDataset(); });

  it('contains Part I with exactly the 14 chapters, in order, with the specified German titles', () => {
    expect(DATASET.project_id).toBe('heidi');
    expect(DATASET.parts.length).toBe(1);
    const chs = DATASET.parts[0].chapters;
    expect(chs.map(c => c.chapter_number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]);
    expect(chs.map(c => c.title_de)).toEqual(EXPECTED_TITLES_DE);
    expect(chs.every(c => c.passages.length > 0)).toBeTrue();
  });

  it('preserves the chapter, alignment-group and paragraph IDs of the curated file (texts unchanged)', () => {
    const ids = new Set<string>();
    SBS.chapters.forEach((ch, ci) => {
      const passages = DATASET.parts[0].chapters[ci].passages;
      expect(passages.length).toBe(ch.rows.length);
      ch.rows.forEach((r, i) => {
        const p = passages[i];
        expect(p.passage_id).toBe(r.id);
        expect(p.chapter_id).toBe(ch.id);
        expect(p.source.en_paragraph_ids).toEqual(r.en.map(x => x.id));
        expect(p.source.de_paragraph_ids).toEqual(r.de.map(x => x.id));
        expect(p.english_text).toBe(r.en.map(x => x.text).join('\n\n') || null);
        expect(p.german_text).toBe(r.de.map(x => x.text).join('\n\n') || null);
        ids.add(p.passage_id);
      });
    });
    expect(ids.size).toBe(all(DATASET).length);
  });

  it('only Chapter 1 is labelled verified; every other chapter is automatic (never silently verified)', () => {
    for (const ch of DATASET.parts[0].chapters) {
      expect(ch.alignment_status).toBe(ch.chapter_number === 1 ? 'verified' : 'automatic');
      for (const p of ch.passages) {
        if (ch.chapter_number !== 1) { expect(p.alignment.status).not.toBe('verified'); }
        if (p.alignment.status === 'verified') { expect(p.alignment.confidence_label).toBe('verified'); }
      }
    }
    expect(all(DATASET).filter(p => p.alignment.status === 'verified').length).toBeGreaterThan(0);
  });

  it('keeps unmatched passages visible and flagged, never scored', () => {
    const unmatched = all(DATASET).filter(p => p.alignment.status === 'unmatched_de' || p.alignment.status === 'unmatched_en');
    expect(unmatched.length).toBeGreaterThan(0);
    for (const p of unmatched) {
      expect(!!p.german_text !== !!p.english_text).toBeTrue();
      expect(Object.keys(p.analysis.dimensions).length).toBe(0);
    }
  });

  it('only verified or high-confidence groups carry literary scores; disputed groups are withheld; N/A is never 0', () => {
    for (const p of all(DATASET)) {
      const dims = p.analysis.dimensions;
      if (!isAlignmentUsable(p)) {
        expect(Object.keys(dims).length).withContext(p.passage_id).toBe(0);
      } else {
        expect(p.analysis.status).withContext(p.passage_id).toBe('literary_provisional');
        Object.values(dims).forEach(d => {
          expect(d!.provisional).toBeTrue();
          if (d!.status !== 'scored') { expect(d!.score).withContext(p.passage_id).toBeNull(); }
          if (d!.status === 'scored') { expect(d!.score).toBeGreaterThanOrEqual(0); expect(d!.score).toBeLessThanOrEqual(100); }
        });
      }
    }
  });

  it('loads the side-by-side text and the literary analysis, and mutates neither', () => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    const svc = TestBed.inject(HeidiDataService);
    const http = TestBed.inject(HttpTestingController);
    const before = JSON.stringify(SBS);
    const litBefore = JSON.stringify(LIT.passages['ch01-a002']);
    let ds: HeidiDataset | null = null;
    svc.load().subscribe(d => ds = d);
    http.expectOne(HEIDI_ALIGNMENT_URL).flush(JSON.parse(before));
    http.expectOne(HEIDI_LITERARY_URL).flush(LIT);
    http.verify();
    expect(ds).toBeTruthy();
    expect(JSON.stringify(SBS)).toBe(before);
    expect(JSON.stringify(LIT.passages['ch01-a002'])).toBe(litBefore);
  });

  it('without the analysis file nothing is scored (Not evaluated, never 0)', () => {
    const ds = new HeidiDataService(null as any).compose(SBS, null);
    expect(all(ds).every(p => Object.keys(p.analysis.dimensions).length === 0)).toBeTrue();
    expect(all(ds).some(p => p.analysis.status === 'awaiting_analysis')).toBeTrue();
  });

  it('covers all 14 chapters: every verified / high-confidence group is analysed or explicitly disputed', () => {
    const ps = all(DATASET);
    expect(ps.length).toBe(581);
    const analysed = ps.filter(p => p.analysis.status === 'literary_provisional');
    const disputed = ps.filter(p => p.analysis.status === 'alignment_disputed');
    expect(analysed.length + disputed.length).toBe(434);
    expect(disputed.every(p => p.alignment.status === 'disputed' && !!p.alignment.note)).toBeTrue();
    for (let n = 1; n <= 14; n++) {
      expect(analysed.some(p => p.chapter_id === `ch${String(n).padStart(2, '0')}`)).withContext('chapter ' + n).toBeTrue();
    }
    expect(ps.filter(p => p.alignment.status === 'needs_review').length).toBe(106);
    expect(ps.filter(p => p.alignment.status === 'low_confidence').length).toBe(39);
    expect(analysed.every(p => p.analysis.dimensions.semantic!.status === 'scored')).toBeTrue();
    expect(LIT.coverage['unlocated_evidence']).toBe(0);
  });

  it('ch01-a002 audit: emotion is N/A (heat, not feeling) rather than 0, and reference evidence is present', () => {
    const p = all(DATASET).find(x => x.passage_id === 'ch01-a002')!;
    const d = p.analysis.dimensions;
    expect(d.emotion!.status).toBe('not_applicable');
    expect(d.emotion!.score).toBeNull();
    expect(d.emotion!.phrase_evidence.some(e => e.label === 'Uncertain' && e.de?.text === 'dessen Wangen so glühend waren')).toBeTrue();
    expect(d.semantic!.score).toBeLessThan(100);
    expect(d.omissions!.phrase_evidence.some(e => e.label === 'Lost' && e.de?.text === 'um und um gebunden')).toBeTrue();
    expect(d.imagery!.phrase_evidence.some(e => e.label === 'Changed' && e.de?.text === 'flammend rot durchleuchteten')).toBeTrue();
    expect(d.tone!.phrase_evidence.some(e => e.label === 'Changed' && /Wart einen Augenblick, Dete/.test(e.de?.text || '') && /please/.test(e.en?.text || ''))).toBeTrue();
    expect(d.cultural!.phrase_evidence.some(e => /Dörfli/.test(e.de?.text || '') && /Little Village/.test(e.en?.text || ''))).toBeTrue();
    expect(d.wordplay!.status).toBe('not_applicable');
  });

  it('evidence IDs follow HEIDI-CHnn-Annn-DIM-nnn; Lost has no English and Added no German phrase', () => {
    for (const lp of Object.values(LIT.passages)) {
      for (const e of lp.evidence || []) {
        expect(e.evidence_id).toMatch(/^HEIDI-CH\d\d-A\d{3}-(SEM|EMO|IMG|TON|VOI|CUL|OMI|WPL)-\d{3}$/);
        if (e.category === 'lost') { expect(e.target_phrase).withContext(e.evidence_id).toBeNull(); }
        if (e.category === 'added') { expect(e.source_phrase).withContext(e.evidence_id).toBeNull(); }
        if (e.category === 'preserved' || e.category === 'changed') {
          expect(!!e.source_phrase === !!e.target_phrase).withContext(e.evidence_id).toBeTrue();
        }
        expect(e.provenance).toContain('model_assisted');
      }
    }
  });

  it('a highlight never covers a whole multi-sentence passage', () => {
    for (const p of all(DATASET)) {
      for (const d of Object.values(p.analysis.dimensions)) {
        for (const e of d!.phrase_evidence) {
          if (e.de && p.german_text && p.german_text.length > 200) { expect(e.de.text.length).withContext(e.id).toBeLessThan(p.german_text.length); }
          if (e.en && p.english_text && p.english_text.length > 200) { expect(e.en.text.length).withContext(e.id).toBeLessThan(p.english_text.length); }
        }
      }
    }
  });

  it('a span that does not match the displayed text is not highlighted and is reported as unlocated', () => {
    const lit = JSON.parse(JSON.stringify(LIT.passages['ch01-a002']));
    lit.evidence[0].source_span = { start: 0, end: 5, text: 'XXXXX' };
    const p = all(DATASET).find(x => x.passage_id === 'ch01-a002')!;
    const m = mapPassageAnalysis(lit, p.german_text, p.english_text);
    const ev = m.analysis.dimensions.semantic!.phrase_evidence[0];
    expect(ev.de).toBeNull();
    expect(m.unlocated.some(u => u.evidence_id === lit.evidence[0].evidence_id)).toBeTrue();
  });

  it('Unicode: spans are code-point offsets (umlauts / ß / typographic quotes)', () => {
    const text = 'Großmütterchen „Grüß Gott“ sagte';
    const dim = { applicability: 'evaluated', score: 100, confidence: 'high', method: 'm', evidence_count: 1,
      category_counts: { preserved: 1, changed: 0, lost: 0, added: 0, uncertain: 0 }, explanation: '', review_status: 'machine_provisional' } as any;
    const e = { evidence_id: 'HEIDI-CH01-A001-CUL-001', passage_id: 'ch01-a001', dimension: 'cultural', category: 'preserved', weight: 1,
      source_language: 'de', source_phrase: '„Grüß Gott“', target_language: 'en', target_phrase: null,
      source_span: { start: 15, end: 26, text: '„Grüß Gott“' }, target_span: null, span_status: 'located', sentence_alignment_verified: true,
      explanation: '', confidence: 'high', requires_expert_review: false, provenance: 'model_assisted_provisional:test' } as any;
    const u: any[] = [];
    const a = mapDimension(dim, [e], text, 'x', u);
    expect(a.phrase_evidence[0].de).toEqual({ start: 15, end: 26, text: '„Grüß Gott“' });
    expect(u.length).toBe(0);
  });

  it('N/A dimensions stay N/A and not-evaluated dimensions are never turned into 0', () => {
    const base = { score: null, confidence: null, method: 'm', evidence_count: 0,
      category_counts: { preserved: 0, changed: 0, lost: 0, added: 0, uncertain: 0 }, explanation: 'x', review_status: 'machine_provisional' } as any;
    expect(mapDimension({ ...base, applicability: 'not_applicable' }, [], 'a', 'b', []).status).toBe('not_applicable');
    expect(mapDimension({ ...base, applicability: 'not_evaluated' }, [], 'a', 'b', []).status).toBe('not_assessed');
    expect(mapDimension({ ...base, applicability: 'not_evaluated', score: 0 }, [], 'a', 'b', []).score).toBeNull();
  });

  it('preserves German characters (ä, ö, ü, ß)', () => {
    const de = all(DATASET).map(p => p.german_text || '').join(' ');
    for (const c of ['ä', 'ö', 'ü', 'ß', 'Ö']) { expect(de).toContain(c); }
  });

  it('evidence spans point at the exact displayed text they quote (code points)', () => {
    const cp = (t: string, a: number, b: number) => Array.from(t).slice(a, b).join('');
    for (const p of all(DATASET)) {
      for (const d of Object.values(p.analysis.dimensions)) {
        for (const e of d!.phrase_evidence) {
          if (e.de) { expect(cp(p.german_text!, e.de.start, e.de.end)).toBe(e.de.text); }
          if (e.en) { expect(cp(p.english_text!, e.en.start, e.en.end)).toBe(e.en.text); }
        }
      }
    }
  });
});

describe('HeidiAnalysisComponent (Hamlet v1.5 UI)', () => {
  let fixture: ComponentFixture<HeidiAnalysisComponent>;
  let component: HeidiAnalysisComponent;
  let el: HTMLElement;

  const enCells = () => Array.from(el.querySelectorAll<HTMLElement>('.hd-cell--en.reader-speech-row'));
  const deCells = () => Array.from(el.querySelectorAll<HTMLElement>('.hd-cell--de.reader-speech-row'));

  beforeAll(async () => { DATASET = DATASET || await loadDataset(); });

  beforeEach(async () => {
    localStorage.removeItem(HEIDI_REVIEW_STORAGE_KEY);
    localStorage.removeItem(HEIDI_RTT_STORAGE_KEY);
    await TestBed.configureTestingModule({
      imports: [HeidiAnalysisComponent, HttpClientTestingModule, RouterTestingModule],
    }).compileComponents();
    TestBed.inject(HeidiDataService).setDataset(DATASET);
    TestBed.inject(HeidiReviewService).reload();
    fixture = TestBed.createComponent(HeidiAnalysisComponent);
    component = fixture.componentInstance;
    component.inspectorCollapsed = false;
    el = fixture.nativeElement;
    el.style.display = 'block';
    el.style.height = '900px';
    fixture.detectChanges();
  });

  afterEach(() => {
    localStorage.removeItem(HEIDI_REVIEW_STORAGE_KEY);
    localStorage.removeItem(HEIDI_RTT_STORAGE_KEY);
  });

  it('uses the same three-column Hamlet layout (TOC | reader | inspector) and header', () => {
    expect(el.querySelector('.v15-header .v15-title')!.textContent).toContain('Heidi Translation Analysis');
    const layout = el.querySelector('.ha-layout-three-col')!;
    expect(layout.querySelector(':scope > .ha-col-toc')).toBeTruthy();
    expect(layout.querySelector(':scope > .ha-col-workspace')).toBeTruthy();
    expect(layout.querySelector(':scope > .ha-col-inspector')).toBeTruthy();
    expect(el.querySelector('.inspector-empty-state .inspector-empty-title')!.textContent).toContain('Evidence Inspector');
    expect(el.querySelector('.reader-main-title')!.textContent).toContain('Heidi, side by side');
    expect(el.querySelector('[data-test="reader-location"]')!.textContent).toContain('Part I · Chapter 1');
  });

  it('TOC shows Part → Chapter → Passage with "Chapter N" labels and 8 dimension indicators per chapter', () => {
    expect(el.querySelector('.toc-act-title')!.textContent).toContain('Part I');
    const cards = el.querySelectorAll('.toc-scene-card');
    expect(cards.length).toBe(14);
    expect(cards[0].querySelector('.toc-scene-canonical-label')!.textContent!.trim()).toBe('Chapter 1');
    expect(cards[0].querySelector('.toc-scene-short-title')!.textContent).toContain('Going up to the Alm-Uncle');
    cards.forEach(c => {
      const labels = Array.from(c.querySelectorAll('.toc-scene-dim-bar-lbl')).map(x => x.textContent!.trim());
      expect(labels).toEqual(['SEM', 'EMO', 'MET', 'TON', 'VOI', 'CUL', 'OMI', 'WPL']);
    });
    // indicator colour reflects the real chapter mean (or neutral when missing)
    const ch1 = component.chapters[0];
    const bars = component.chapterDimBars(ch1);
    expect(bars[0].score).toBe(component.chapterDimMean(ch1, 'semantic'));
    (el.querySelector('[data-test="toc-expand-2"]') as HTMLElement).click();
    fixture.detectChanges();
    expect(el.querySelectorAll('.toc-dialogue-row').length).toBe(component.chapters[1].passages.length);
    (el.querySelector('[data-test="toc-ch-7"]') as HTMLElement).click();
    fixture.detectChanges();
    expect(component.selectedChapterNumber).toBe(7);
    expect(enCells()[0].getAttribute('data-passage-id')).toBe('ch07-a001');
  });

  it('renders English on the left and German on the right in synchronised rows', () => {
    const heads = el.querySelectorAll('.hd-cell--head .reader-lang-title');
    expect(heads[0].textContent).toContain('Human English — Elisabeth P. Stork');
    expect(heads[1].textContent).toContain('German Original');
    const en = enCells(), de = deCells();
    expect(en.length).toBe(component.chapter!.passages.length);
    expect(de.length).toBe(en.length);
    for (let i = 0; i < Math.min(12, en.length); i++) {
      const a = en[i].getBoundingClientRect(), b = de[i].getBoundingClientRect();
      expect(Math.abs(a.top - b.top)).withContext('row ' + i + ' top').toBeLessThan(1);
      expect(Math.abs(a.height - b.height)).withContext('row ' + i + ' height').toBeLessThan(1);
      expect(a.left).toBeLessThan(b.left);
      expect(en[i].getAttribute('data-passage-id')).toBe(component.chapter!.passages[i].passage_id);
    }
  });

  it('long passages are fully visible (no clipping / fixed heights)', () => {
    const longest = [...component.chapter!.passages].sort((a, b) => (b.german_text || '').length - (a.german_text || '').length)[0];
    const i = component.chapter!.passages.indexOf(longest);
    const cell = deCells()[i];
    const body = cell.querySelector('.reader-dialogue-body') as HTMLElement;
    expect(body.textContent!.replace(/\s+/g, ' ').trim()).toBe(longest.german_text!.replace(/\s+/g, ' ').trim());
    expect(body.scrollHeight).toBeLessThanOrEqual(body.clientHeight + 1);
    expect(getComputedStyle(cell).maxHeight).toBe('none');
  });

  it('reader header and dimension bar do not overlap', () => {
    const h = el.querySelector('[data-test="reader-header"]')!.getBoundingClientRect();
    const d = el.querySelector('[data-test="dim-tabs"]')!.getBoundingClientRect();
    expect(h.bottom).toBeLessThanOrEqual(d.top + 0.5);
    const tabs = Array.from(el.querySelectorAll('[data-test="dim-tabs"] .reader-dimension-tab-btn')).map(b => b.querySelector('.tab-label')!.textContent!.trim());
    expect(tabs).toEqual(['Semantic', 'Emotion', 'Metaphor', 'Tone', 'Voice', 'Cultural', 'Omissions', 'Wordplay']);
  });

  it('dimension tabs show real chapter scores and selection updates highlights and inspector', () => {
    const ch = component.chapter!;
    const semTab = el.querySelector('[data-test="tab-semantic"] .tab-score-pill')!;
    expect(semTab.textContent!.trim()).toBe(component.chapterDimMean(ch, 'semantic')!.toFixed(1));
    component.showAnalysis = true;
    const p = ch.passages.find(x => isAlignmentUsable(x) && (x.analysis.dimensions.cultural?.phrase_evidence || []).some(e => e.de))!;
    const sem = component.phraseHl(p, 'de');
    (el.querySelector('[data-test="tab-cultural"]') as HTMLElement).click();
    fixture.detectChanges();
    expect(component.selectedDimension).toBe('cultural');
    expect(el.querySelector('[data-test="tab-cultural"]')!.classList).toContain('reader-dimension-tab-btn--active');
    const cul = component.phraseHl(p, 'de');
    expect(cul).not.toEqual(sem);
    const ev = p.analysis.dimensions.cultural!.phrase_evidence.filter(e => e.de);
    expect(cul.map(s => s.start)).toEqual(ev.map(e => e.de!.start).sort((a, b) => a - b));
    // the sentence layer is a Semantic feature only
    expect(component.sentenceHl(p, 'de').length).toBe(0);
    component.selectPassage(p);
    fixture.detectChanges();
    expect(el.querySelector('[data-test="inspector-id"]')!.textContent).toContain('Cultural');
  });

  it('Show analysis toggles sentence/phrase highlighting and the legend', () => {
    expect(el.querySelectorAll('[data-test="sync-grid"] .hrt-seg').length).toBe(0);
    expect(el.querySelector('[data-test="analysis-bar"]')).toBeNull();
    (el.querySelector('[data-test="show-analysis"]') as HTMLInputElement).click();
    fixture.detectChanges();
    expect(component.showAnalysis).toBeTrue();
    expect(el.querySelector('[data-test="analysis-bar"]')!.textContent).toContain('Preserved');
    expect(el.querySelectorAll('[data-test="sync-grid"] .hrt-seg').length).toBeGreaterThan(0);
    // passages awaiting alignment review never get highlights
    const blocked = component.chapters.flatMap(c => c.passages).find(x => x.alignment.status === 'needs_review')!;
    expect(component.phraseHl(blocked, 'en').length).toBe(0);
    expect(component.sentenceHl(blocked, 'en').length).toBe(0);
  });

  it('dialogue and narration filters work', () => {
    (el.querySelector('[data-test="type-narration"]') as HTMLElement).click();
    fixture.detectChanges();
    expect(component.visiblePassages.every(p => p.passage_type === 'narration')).toBeTrue();
    expect(enCells().length).toBe(component.visiblePassages.length);
    (el.querySelector('[data-test="type-dialogue"]') as HTMLElement).click();
    fixture.detectChanges();
    expect(component.visiblePassages.length).toBeGreaterThan(0);
    expect(component.visiblePassages.every(p => p.passage_type !== 'narration')).toBeTrue();
  });

  it('alignment-status filter isolates unmatched passages with an explicit missing-counterpart notice', () => {
    component.selectChapter(14);
    component.filters.alignment = 'unmatched';
    fixture.detectChanges();
    expect(component.visiblePassages.length).toBeGreaterThan(0);
    expect(el.querySelector('.hd-missing')!.textContent).toContain('No English counterpart');
    expect(el.querySelector('.hd-align-badge')!.textContent).toContain('Needs Alignment Review');
  });

  it('searches both languages', () => {
    component.filters.search = 'Geißenpeter';
    component.runGlobalSearch();
    fixture.detectChanges();
    expect(component.visiblePassages.every(p => (p.german_text || '').includes('Geißenpeter'))).toBeTrue();
    component.filters.search = 'goat';
    fixture.detectChanges();
    expect(component.visiblePassages.length).toBeGreaterThan(0);
  });

  it('selecting a passage opens the inspector for exactly that passage without replacing the reader', () => {
    const cell = enCells()[3];
    cell.click();
    fixture.detectChanges();
    const id = cell.getAttribute('data-passage-id');
    expect(component.selectedPassageId).toBe(id);
    expect(el.querySelector('[data-test="inspector-id"]')!.textContent).toContain(id!);
    expect(el.querySelector('[data-test="sync-grid"]')).toBeTruthy();
    expect(enCells().length).toBe(component.chapter!.passages.length);
    expect(component.tab).toBe('read');
    expect(cell.classList).toContain('reader-speech-row--active');
  });

  it('heatmap passage cell selects the corresponding passage in Read and analyze', () => {
    component.setTab('heatmap');
    component.heatmapChapterNumber = 3;
    fixture.detectChanges();
    expect(el.querySelectorAll('.v15-hm-row').length).toBe(14);
    const cell = el.querySelectorAll<HTMLElement>('.hd-cell-btn')[5];
    const id = cell.getAttribute('data-passage-id')!;
    cell.click();
    fixture.detectChanges();
    expect(component.tab).toBe('read');
    expect(component.selectedChapterNumber).toBe(3);
    expect(component.selectedPassageId).toBe(id);
    expect(component.viewMode).toBe('passage');
    expect(el.querySelector('[data-test="card-id"]')!.textContent).toContain(id);
  });

  it('chapter summaries exclude missing scores and show the denominator', () => {
    const align = TestBed.inject(HeidiAlignmentService);
    const ch = component.chapters[0];
    const s = align.chapterSummary(ch, 'wordplay');
    expect(s.mean).toBeNull();
    expect(s.n).toBe(0);
    expect(s.total).toBe(ch.passages.length);
    const sem = align.chapterSummary(ch, 'semantic');
    const vals = ch.passages.map(p => p.analysis.dimensions.semantic?.score).filter((v): v is number => v !== null && v !== undefined);
    expect(sem.n).toBe(vals.length);
    expect(sem.mean).toBe(Math.round(vals.reduce((a, b) => a + b, 0) / vals.length));
    expect(component.chapterDimMean(ch, 'wordplay')).toBeNull();
  });

  it('validation queue (Hamlet styling) opens the passage and expands the relevant section', () => {
    component.setTab('queue');
    component.queueFilter = 'unmatched';
    fixture.detectChanges();
    expect(el.querySelector('.queue-card .queue-title')!.textContent).toContain('Validation Queue');
    const item = component.queueItems[0];
    (el.querySelector(`[data-test="q-${item.passage.passage_id}"]`) as HTMLElement).click();
    fixture.detectChanges();
    expect(component.tab).toBe('read');
    expect(component.selectedPassageId).toBe(item.passage.passage_id);
    expect(component.reviewExpanded).toBeTrue();
    component.setTab('queue');
    component.queueFilter = 'low_semantic';
    const sem = component.queueItems[0];
    component.openPassage(sem.passage, sem.focus);
    expect(component.selectedDimension).toBe('semantic');
    expect(component.evidenceExpanded).toBeTrue();
  });

  it('queue filters and sorts cover the required categories', () => {
    for (const f of ['low_semantic', 'emotion_shift', 'cultural_issue', 'omissions', 'low_alignment', 'unmatched'] as const) {
      expect(component.queueCount(f)).withContext(f).toBeGreaterThan(0);
    }
    component.queueSort = 'alignment_confidence';
    const q = component.queueItems;
    for (let i = 1; i < q.length; i++) { expect(q[i - 1].passage.alignment.confidence).toBeLessThanOrEqual(q[i].passage.alignment.confidence); }
    component.queueSort = 'lowest_score';
    const scores = component.queueItems.map(i => i.score).filter(s => s !== null) as number[];
    expect(scores).toEqual([...scores].sort((a, b) => a - b));
  });

  it('RTT section is collapsed, shows neutral statuses and "—" (not 0) before generation; coverage counts only completed results', () => {
    const p = component.chapter!.passages.find(x => isAlignmentUsable(x))!;
    component.openPassageCard(p);
    fixture.detectChanges();
    expect(el.querySelector('[data-test="rtt-body"]')).toBeNull();
    expect(el.querySelector('[data-test="rtt-status"]')!.textContent!.trim()).toBe('Not evaluated');
    (el.querySelector('[data-test="rtt-toggle"]') as HTMLElement).click();
    fixture.detectChanges();
    expect(el.querySelector('[data-test="rtt-sim"]')!.textContent!.trim()).toBe('—');
    const rtt = TestBed.inject(HeidiRttService);
    component.setRttThreshold(15);
    rtt.evaluate(p.passage_id, p.english_text!, p.english_text!, 100, 'h');
    fixture.detectChanges();
    expect(el.querySelector('[data-test="rtt-sim"]')!.textContent!.trim()).toBe('100');
    expect(el.querySelector('[data-test="rtt-status"]')!.textContent!.trim()).toBe('Evaluated');
    expect(el.querySelector('[data-test="rtt-section"]')!.textContent).not.toContain('Agreement');
    expect(el.querySelector('[data-test="rtt-ai-en"]')!.textContent).toContain(p.english_text!.slice(0, 20));
    component.closePassageCard();
    fixture.detectChanges();
    expect(el.querySelector('[data-test="rtt-coverage"]')!.textContent).toContain('RTT verified: 1 of');
  });

  it('RTT generation is disabled with an explanation for passages that need alignment review', () => {
    const p = component.chapters.flatMap(c => c.passages).find(x => x.alignment.status === 'low_confidence')!;
    expect(component.rttDisabledReason(p)).toContain('Alignment not yet verified');
    const u = component.chapters.flatMap(c => c.passages).find(x => x.alignment.status === 'unmatched_de')!;
    expect(component.rttDisabledReason(u)).toContain('Unmatched');
  });

  it('expert review is stored under the Heidi key, persists, and updates the displayed score', () => {
    const p = component.chapter!.passages.find(x => isAlignmentUsable(x))!;
    component.selectPassage(p);
    component.reviewerName = 'Dr. Test';
    component.selectedDimension = 'semantic';
    const dr = component.dimReview('semantic')!;
    dr.decision = 'override';
    dr.score_override = 42;
    component.reviewDraft!.alignment.decision = 'accept';
    component.saveReview();
    const stored = JSON.parse(localStorage.getItem(HEIDI_REVIEW_STORAGE_KEY)!);
    expect(stored[p.passage_id].reviewer).toBe('Dr. Test');
    expect(component.eff(p, 'semantic').score).toBe(42);
    expect(component.eff(p, 'semantic').automatedScore).toBe(p.analysis.dimensions.semantic!.score);
    expect(new HeidiReviewService().get(p.passage_id)?.alignment.decision).toBe('accept');
  });

  it('export menu still produces chapter, all-passage, queue and review downloads', () => {
    const spy = spyOn<any>(component, 'download');
    (el.querySelector('[data-test="export-toggle"]') as HTMLElement).click();
    fixture.detectChanges();
    (el.querySelector('[data-test="export-chapter"]') as HTMLElement).click();
    component.exportPassages('all');
    component.exportQueue();
    component.exportReviews();
    const names = spy.calls.allArgs().map(a => a[0]);
    expect(names).toEqual(['heidi_chapter_01_passages.csv', 'heidi_all_passages.csv', 'heidi_validation_queue.csv', 'heidi_expert_reviews.json']);
    expect(String(spy.calls.argsFor(0)[1])).toContain('ch01-a001');
  });

  it('Hide TOC collapses the navigator, keeps the inspector usable and expands the reader', () => {
    const before = el.querySelector('.ha-col-workspace')!.getBoundingClientRect().width;
    (el.querySelector('[data-test="toc-toggle"]') as HTMLElement).click();
    fixture.detectChanges();
    expect(el.querySelector('.ha-layout-three-col')!.classList).toContain('ha-toc-collapsed');
    expect(el.querySelector('[data-test="toc-toggle"]')!.textContent).toContain('Show TOC');
    expect(el.querySelector('.ha-col-inspector')).toBeTruthy();
    return new Promise<void>(resolve => setTimeout(() => {
      expect(el.querySelector('.ha-col-workspace')!.getBoundingClientRect().width).toBeGreaterThanOrEqual(before);
      expect(component.tocCollapsed).toBeTrue();
      resolve();
    }, 400));
  });

  it('remains usable at the current viewport (no horizontal page overflow in the reader)', () => {
    const main = el.querySelector('.ha-col-workspace') as HTMLElement;
    expect(main.scrollWidth).toBeLessThanOrEqual(main.clientWidth + 1);
    expect(main.getBoundingClientRect().width).toBeGreaterThan(300);
  });

  describe('selected-passage analysis card', () => {
    const openFromToc = (id: string) => {
      const ch = Number(id.slice(2, 4));
      if (!component.isChapterExpanded(component.chapters[ch - 1])) {
        (el.querySelector(`[data-test="toc-expand-${ch}"]`) as HTMLElement).click();
        fixture.detectChanges();
      }
      (el.querySelector(`[data-test="toc-p-${id}"]`) as HTMLElement).click();
      fixture.detectChanges();
    };

    it('opens the simplified passage view: selector, score line, legend, two columns, collapsed RTT, actions; no technical cards', () => {
      const p = component.chapters[0].passages[3];
      openFromToc(p.passage_id);
      expect(component.viewMode).toBe('passage');
      expect(el.querySelector('.ha-col-workspace [data-test="passage-card"]')).toBeTruthy();
      expect(el.querySelector('[data-test="inspector-panel"]')).toBeTruthy();
      expect(el.querySelector('[data-test="sync-grid"]')).toBeNull();
      expect(el.querySelector(`[data-test="toc-p-${p.passage_id}"]`)!.classList).toContain('toc-dialogue-row--selected');
      expect(el.querySelector('[data-test="card-id"]')!.textContent).toContain(p.passage_id);
      expect(el.querySelector('[data-test="card-score"]')!.textContent!.trim()).toBe(component.eff(p, 'semantic').score + '/100');
      expect(el.querySelector('[data-test="card-legend"]')!.textContent).toContain('Uncertain');
      expect(el.querySelector('[data-test="card-en"]')!.textContent!.replace(/\s+/g, ' ')).toContain(p.english_text!.replace(/\s+/g, ' ').slice(0, 40));
      expect(el.querySelector('[data-test="card-de"]')!.textContent!.replace(/\s+/g, ' ')).toContain(p.german_text!.replace(/\s+/g, ' ').slice(0, 40));
      const en = el.querySelector('[data-test="card-en"]')!.getBoundingClientRect();
      const de = el.querySelector('[data-test="card-de"]')!.getBoundingClientRect();
      expect(Math.abs(en.width - de.width)).toBeLessThan(2);
      expect(en.left).toBeLessThanOrEqual(de.left);
      // order: selector → score line → reader → RTT → actions → research details
      const order = ['card-dim-tabs', 'card-scoreline', 'passage-card', 'rtt-section', 'card-actions', 'research-details']
        .map(t => el.querySelector(`[data-test="${t}"]`)!.getBoundingClientRect().top);
      expect(order).toEqual([...order].sort((a, b) => a - b));
      // technical details are not in the default view
      for (const gone of ['card-review', 'card-explanation', 'card-evidence', 'card-rtt-verification', 'rtt-threshold']) {
        const n = el.querySelector(`[data-test="${gone}"]`);
        expect(!n || !!n.closest('details:not([open])')).withContext(gone).toBeTrue();
      }
      const visible = (el.querySelector('.ha-col-workspace') as HTMLElement).innerText;
      expect(visible).not.toMatch(/HEIDI-CH\d\d|rubric_v1|heidi_analysis_r|MyMemory|weight \d/);
      expect((el.querySelector('[data-test="research-details"]') as HTMLDetailsElement).open).toBeFalse();
    });

    it('Semantic accounts for every sentence; other dimensions show only their phrase evidence', () => {
      const p = component.chapters[0].passages.find(x => x.passage_id === 'ch01-a002')!;
      component.openPassageCard(p);
      fixture.detectChanges();
      const recs = p.analysis.sentence_alignments!;
      const deIdx = recs.flatMap(r => r.source_sentences).sort((a, b) => a - b);
      const enIdx = recs.flatMap(r => r.target_sentences).sort((a, b) => a - b);
      expect(deIdx).toEqual(p.analysis.sentences!.de.map((_, i) => i));
      expect(enIdx).toEqual(p.analysis.sentences!.en.map((_, i) => i));
      expect(component.sentenceHl(p, 'de').length).toBe(p.analysis.sentences!.de.length);
      // Continuous phrase/clause highlighting across the paragraph without sentence buttons
      expect(el.querySelectorAll('.hd-sent-ind').length).toBe(0);
      expect(el.querySelectorAll('[data-test="card-de"] .hrt-seg[data-phrase]').length).toBeGreaterThan(0);
      (el.querySelector('[data-test="card-tab-cultural"]') as HTMLElement).click();
      fixture.detectChanges();
      expect(el.querySelectorAll('.hd-sent-ind').length).toBe(0);
      const cul = component.phraseHl(p, 'de');
      expect(cul.map(s => s.start)).toEqual(p.analysis.dimensions.cultural!.phrase_evidence.filter(e => e.de).map(e => e.de!.start).sort((a, b) => a - b));
      expect(el.querySelectorAll('[data-test="card-de"] .hrt-seg[data-phrase]').length).toBe(cul.length);
      const blocked = component.chapters.flatMap(c => c.passages).find(x => x.alignment.status === 'needs_review')!;
      component.openPassageCard(blocked);
      fixture.detectChanges();
      expect(component.phraseHl(blocked, 'en').length).toBe(0);
      expect(el.querySelector('[data-test="card-align-notice"]')).toBeTruthy();
    });

    it('RTT workflows sit behind one selector; the AI German is never labelled as Spyri; RTT never feeds other dimensions', () => {
      const p = component.chapters[0].passages.find(x => isAlignmentUsable(x) && component.eff(x, 'semantic').score !== null)!;
      component.openPassageCard(p);
      fixture.detectChanges();
      (el.querySelector('[data-test="rtt-toggle"]') as HTMLElement).click();
      fixture.detectChanges();
      expect(el.querySelector('[data-test="rtt-mode-de"]')!.textContent).toContain('German original → AI English');
      (el.querySelector('[data-test="rtt-mode-en"]') as HTMLElement).click();
      fixture.detectChanges();
      const body = el.querySelector('[data-test="rtt-body"]')!.textContent!;
      expect(body).toContain('AI German (machine translation of Stork — not Spyri\'s original)');
      expect(body).not.toContain('Workflow A');
      const direct = component.eff(p, 'semantic').score!;
      TestBed.inject(HeidiRttService).evaluate(p.passage_id, p.english_text!, p.english_text!, direct, 'h');
      const rows = component.rttRows(p);
      expect(rows.find(r => r.key === 'semantic')!.rtt).toBe(100);
      expect(rows.filter(r => r.key !== 'semantic').every(r => r.rtt === null && r.diff === null)).toBeTrue();
    });

    it('Next Review moves to the next flagged, unreviewed passage and updates the TOC selection', () => {
      const first = component.chapters[0].passages[0];
      component.openPassageCard(first);
      fixture.detectChanges();
      const expected = component.nextReviewPassage()!;
      expect(expected).toBeTruthy();
      expect(component.passageNeedsReview(expected)).toBeTrue();
      (el.querySelector('[data-test="next-review"]') as HTMLElement).click();
      fixture.detectChanges();
      expect(component.selectedPassageId).toBe(expected.passage_id);
      expect(el.querySelector('[data-test="card-id"]')!.textContent).toContain(expected.passage_id);
      expect(el.querySelector(`[data-test="toc-p-${expected.passage_id}"]`)!.classList).toContain('toc-dialogue-row--selected');
      component.filters.type = 'narration';
      const n = component.nextReviewPassage();
      if (n) { expect(n.passage_type).toBe('narration'); }
    });

    it('Close returns to the reader with chapter, dimension, filters and Show analysis preserved', () => {
      component.selectChapter(4);
      component.showAnalysis = true;
      component.filters.type = 'dialogue';
      component.selectDimension('emotion');
      fixture.detectChanges();
      const p = component.visiblePassages[2];
      component.openPassageCard(p);
      fixture.detectChanges();
      (el.querySelector('[data-test="back-to-chapter"]') as HTMLElement).click();
      fixture.detectChanges();
      expect(component.viewMode).toBe('reader');
      expect(el.querySelector('[data-test="sync-grid"]')).toBeTruthy();
      expect(component.selectedChapterNumber).toBe(4);
      expect(component.selectedDimension).toBe('emotion');
      expect(component.filters.type).toBe('dialogue');
      expect(component.showAnalysis).toBeTrue();
    });

    it('asks before discarding unsaved expert-review edits', () => {
      const [a, b] = component.chapters[0].passages;
      component.openPassageCard(a);
      fixture.detectChanges();
      component.reviewDraft!.commentary = 'unsaved';
      const confirmSpy = spyOn(window, 'confirm').and.returnValue(false);
      component.openPassageCard(b);
      expect(confirmSpy).toHaveBeenCalled();
      expect(component.selectedPassageId).toBe(a.passage_id);
      component.closePassageCard();
      expect(component.viewMode).toBe('passage');
      confirmSpy.and.returnValue(true);
      component.openPassageCard(b);
      expect(component.selectedPassageId).toBe(b.passage_id);
    });

    it('Expert Feedback opens on demand, cancels without saving, saves decisions and keeps export/import working', () => {
      const p = component.chapters[0].passages.find(x => isAlignmentUsable(x))!;
      component.openPassageCard(p);
      fixture.detectChanges();
      expect(el.querySelector('[data-test="feedback-drawer"]')).toBeNull();
      (el.querySelector('[data-test="open-feedback"]') as HTMLElement).click();
      fixture.detectChanges();
      const drawer = () => fixture.debugElement.query(d => d.name === 'app-heidi-expert-feedback').componentInstance;
      expect(el.querySelector('[data-test="feedback-drawer"]')).toBeTruthy();
      expect(el.querySelectorAll('[data-test="fb-score-input"]').length).toBe(1);
      drawer().decision = 'revise';
      drawer().dim.score_override = 55;
      (el.querySelector('[data-test="fb-cancel"]') as HTMLElement).click();
      fixture.detectChanges();
      expect(el.querySelector('[data-test="feedback-drawer"]')).toBeNull();
      expect(component.eff(p, 'semantic').score).toBe(p.analysis.dimensions.semantic!.score);
      (el.querySelector('[data-test="open-feedback"]') as HTMLElement).click();
      fixture.detectChanges();
      drawer().dim.score_override = 140;
      drawer().submit();
      fixture.detectChanges();
      expect(el.querySelector('[data-test="fb-error"]')).toBeTruthy();
      drawer().decision = 'revise';
      drawer().dim.score_override = 55;
      drawer().dim.revised_classification = 'Changed';
      drawer().dim.comment = 'Nuance shifts.';
      drawer().reviewerName = 'Dr. R';
      (el.querySelector('[data-test="fb-save"]') as HTMLElement).click();
      fixture.detectChanges();
      expect(el.querySelector('[data-test="feedback-drawer"]')).toBeNull();
      expect(component.eff(p, 'semantic').score).toBe(55);
      expect(component.eff(p, 'semantic').automatedScore).toBe(p.analysis.dimensions.semantic!.score);
      const reviews = TestBed.inject(HeidiReviewService);
      const saved = reviews.get(p.passage_id)!;
      expect(saved.reviewer).toBe('Dr. R');
      expect(saved.reviewed_at).toBeTruthy();
      expect(saved.dimensions.semantic!.revised_classification).toBe('Changed');
      const json = reviews.exportJson();
      reviews.clear(p.passage_id);
      expect(reviews.importJson(json)).toBe(1);
      expect(reviews.get(p.passage_id)!.reviewer).toBe('Dr. R');
      expect(() => reviews.importJson(JSON.stringify({ project_id: 'hamlet', reviews: {} }))).toThrow();
    });

    it('mirrors the open card in the URL for browser Back/Forward', () => {
      const router = TestBed.inject(Router);
      const spy = spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
      const p = component.chapters[0].passages[1];
      component.openPassageCard(p);
      expect(spy).toHaveBeenCalled();
      expect((spy.calls.mostRecent().args[1] as any).queryParams).toEqual({ passage: p.passage_id, dim: 'semantic' });
      component.closePassageCard();
      expect((spy.calls.mostRecent().args[1] as any).queryParams).toEqual({ passage: null, dim: null });
    });
  });

  describe('Phase 6 — dimension highlighting, evidence inspector and RTT (Heidi)', () => {
    beforeEach(() => {
      localStorage.removeItem('heidi_evidence_reviews_v1');
      TestBed.inject(EvidenceReviewService).reload('heidi');
    });
    afterEach(() => localStorage.removeItem('heidi_evidence_reviews_v1'));

    /** A verified passage with ≥2 located, paired semantic evidence items whose first item is Preserved; wordplay N/A. */
    const verifiedWithEvidence = () => component.chapters[0].passages.find(x => x.alignment.status === 'verified'
      && x.analysis.dimensions.wordplay?.status === 'not_applicable'
      && (x.analysis.dimensions.semantic?.phrase_evidence || []).filter(e => e.de && e.en).length > 1
      && x.analysis.dimensions.semantic!.phrase_evidence[0].label === 'Preserved' && !!x.analysis.dimensions.semantic!.phrase_evidence[0].de)!;

    it('shows all eight dimensions with N/A (not 0) for unassessed ones, e.g. Wordplay', () => {
      const p = verifiedWithEvidence();
      component.openPassageCard(p);
      fixture.detectChanges();
      const pills = Array.from(el.querySelectorAll('[data-test="card-dim-tabs"] button')).map(b => b.querySelector('.tab-label')!.textContent!.trim() + ' ' + b.querySelector('.tab-score-pill')!.textContent!.trim());
      expect(pills.length).toBe(8);
      expect(pills[7]).toBe('Wordplay N/A');
      component.selectDimension('wordplay');
      fixture.detectChanges();
      expect(el.querySelector('[data-test="card-score"]')!.textContent!.trim()).toBe('N/A');
      expect(el.querySelector('[data-test="card-dim-note"]')!.textContent).toContain('N/A');
      expect(el.querySelectorAll('[data-test="card-de"] .hrt-seg').length).toBe(0);
    });

    it('clicking a phrase links both languages and fills the inspector without scrolling the reader', () => {
      const p = verifiedWithEvidence();
      component.openPassageCard(p);
      fixture.detectChanges();
      const de = component.phraseHl(p, 'de'), en = component.phraseHl(p, 'en');
      const code = 'HEIDI-' + p.passage_id.toUpperCase() + '-SEM-';
      expect(de.every(s => s.id.startsWith(code))).toBeTrue();
      const shared = de.find(s => en.some(e => e.id === s.id))!;
      const scroller = el.querySelector('.ha-col-workspace') as HTMLElement;
      const top = scroller.scrollTop;
      (el.querySelector(`[data-test="card-de"] [data-phrase="${shared.id}"]`) as HTMLElement).click();
      fixture.detectChanges();
      expect(component.selectedEvidenceId).toBe(shared.id);
      expect(el.querySelectorAll('[data-test="card-de"] .hrt-active').length).toBeGreaterThan(0);
      expect(el.querySelectorAll('[data-test="card-en"] .hrt-active').length).toBeGreaterThan(0);
      expect(el.querySelector('[data-test="inspector-category"]')!.textContent!.trim()).toBe('Preserved');
      expect(el.querySelector('[data-test="inspector-item"]')!.textContent).toContain(p.analysis.dimensions.semantic!.phrase_evidence.find(e => e.id === shared.id)!.explanation);
      expect(scroller.scrollTop).toBe(top);
    });

    it('clicking a sentence selects its aligned group in both languages; Lost/Added explain the absent side', () => {
      const p = component.chapters[0].passages.find(x => x.passage_id === 'ch01-a025')!;
      component.openPassageCard(p);
      fixture.detectChanges();
      const lost = p.analysis.sentence_alignments!.find(r => r.classification === 'lost')!;
      component.onPick(p, { sentenceId: lost.sentence_alignment_id, phraseId: null });
      fixture.detectChanges();
      expect(el.querySelector('[data-test="inspector-category"]')!.textContent!.trim()).toBe('Lost');
      expect(el.querySelector('[data-test="inspector-item"]')!.textContent).toContain('Absent from the English translation.');
      const pres = p.analysis.sentence_alignments!.find(r => r.classification === 'preserved' && r.source_sentences.length && r.target_sentences.length)!;
      component.onPick(p, { sentenceId: pres.sentence_alignment_id, phraseId: null });
      fixture.detectChanges();
      // Sentence selection updates the inspector without blue rectangular outlines in the reader
      expect(el.querySelectorAll('.hrt-active[data-sentence]').length).toBe(0);
      if (pres.phrase_evidence_ids.length) {
        component.pickPhrase(p, pres.phrase_evidence_ids[0]);
        fixture.detectChanges();
        expect(el.querySelectorAll('[data-test="card-de"] .hrt-active').length).toBeGreaterThan(0);
      }
    });

    it('Chapter 1 Passages 001 and 002 have continuous full-paragraph clause coverage with multiple colors', () => {
      const p1 = component.chapters[0].passages.find(x => x.passage_id === 'ch01-a001')!;
      const p2 = component.chapters[0].passages.find(x => x.passage_id === 'ch01-a002')!;
      expect(p1).toBeTruthy();
      expect(p2).toBeTruthy();

      // Check p1 clauses (Preserved and Changed)
      const p1Sem = p1.analysis.dimensions.semantic!.phrase_evidence;
      expect(p1Sem.length).toBeGreaterThanOrEqual(10);
      expect(p1Sem.some(e => e.label === 'Preserved' && e.de?.text.includes('führt ein Fußweg'))).toBeTrue();
      expect(p1Sem.some(e => e.label === 'Changed' && e.de?.text.includes('Dorfe Maienfeld'))).toBeTrue();
      expect(p1Sem.some(e => e.label === 'Changed' && e.de?.text.includes('Bergkräutern'))).toBeTrue();

      // Check p2 clauses (Preserved, Changed, Lost on German, Added on English)
      const p2Sem = p2.analysis.dimensions.semantic!.phrase_evidence;
      expect(p2Sem.length).toBeGreaterThanOrEqual(30);
      expect(p2Sem.some(e => e.label === 'Preserved')).toBeTrue();
      expect(p2Sem.some(e => e.label === 'Changed')).toBeTrue();
      expect(p2Sem.some(e => e.label === 'Lost' && e.de?.text.includes('um und um gebunden') && e.en === null)).toBeTrue();
      expect(p2Sem.some(e => e.label === 'Added' && e.en?.text.includes('around her shoulders') && e.de === null)).toBeTrue();

      // Test reader DOM when open
      component.openPassageCard(p1);
      fixture.detectChanges();
      expect(el.querySelectorAll('.hd-sent-ind').length).toBe(0); // S1, S2... buttons removed
      expect(el.querySelectorAll('[data-test="card-de"] .p-preserved').length).toBeGreaterThan(0);
      expect(el.querySelectorAll('[data-test="card-de"] .p-changed').length).toBeGreaterThan(0);

      component.openPassageCard(p2);
      fixture.detectChanges();
      expect(el.querySelectorAll('.hd-sent-ind').length).toBe(0);
      expect(el.querySelectorAll('[data-test="card-de"] .p-lost').length).toBeGreaterThan(0);
      expect(el.querySelectorAll('[data-test="card-en"] .p-added').length).toBeGreaterThan(0);
    });

    it('a revised classification saved through Expert Feedback changes the highlight but keeps the machine category', () => {
      const p = verifiedWithEvidence();
      component.openPassageCard(p);
      const id = component.phraseHl(p, 'de')[0].id;
      component.pickPhrase(p, id);
      component.openFeedback();
      fixture.detectChanges();
      const d = fixture.debugElement.query(x => x.name === 'app-heidi-expert-feedback').componentInstance;
      expect(d.selection.id).toBe(id);
      d.decision = 'revise';
      d.dim.revised_classification = 'Lost';
      d.submit();
      fixture.detectChanges();
      expect(component.phraseHl(p, 'de').find(s => s.id === id)!.label).toBe('lost');
      expect(component.evidenceItems(p, 'semantic').find(x => x.id === id)!.machineCategory).toBe(
        p.analysis.dimensions.semantic!.phrase_evidence.find(e => e.id === id)!.label as any);
      expect(TestBed.inject(EvidenceReviewService).get('heidi', id)!.original.category).toBeTruthy();
    });

    it('highlights only the selected dimension: switching dimension never shows another dimension\'s evidence', () => {
      const p = verifiedWithEvidence();
      component.openPassageCard(p);
      for (const k of ['semantic', 'imagery', 'tone', 'cultural', 'omissions'] as const) {
        component.selectDimension(k);
        const code = { semantic: 'SEM', imagery: 'IMG', tone: 'TON', cultural: 'CUL', omissions: 'OMI' }[k];
        for (const side of ['de', 'en'] as const) {
          expect(component.cardSpans(p, side).every(sp => (sp.linkId || '').includes('-' + code + '-'))).withContext(k).toBeTrue();
        }
      }
    });


    it('mixed sentences split into sentence tint + phrase underline segments with exact code-point text', () => {
      const text = 'Grüß Gott, sagte der Öhi. Dann ging er.';
      const segs = buildSegments(text, [
        { start: 0, end: 25, label: 'changed', id: 'S1' }, { start: 26, end: 39, label: 'preserved', id: 'S2' }],
        [{ start: 0, end: 9, label: 'changed', id: 'P1' }, { start: 21, end: 24, label: 'lost', id: 'P2' }, { start: 5, end: 12, label: 'added', id: 'Px' }]);
      expect(segs.map(x => x.text).join('')).toBe(text);
      expect(segs[0]).toEqual(jasmine.objectContaining({ text: 'Grüß Gott' }));
      expect(segs[0].phrase!.id).toBe('P1');
      expect(segs[0].sent!.id).toBe('S1');
      expect(segs.find(x => x.text === 'Öhi')!.phrase!.label).toBe('lost');
      expect(segs.some(x => x.phrase?.id === 'Px')).toBeFalse(); // overlapping phrase dropped, never merged
      expect(segs.find(x => x.text === 'Dann ging er.')!.sent!.label).toBe('preserved');
      expect(buildSegments(text, [{ start: 30, end: 99, label: 'lost', id: 'bad' }], []).every(x => !x.sent)).toBeTrue();
    });

    it('chapter score tracks share one width; the fill is the score out of 100 and N/A has no red bar', () => {
      fixture.detectChanges();
      const tracks = Array.from(el.querySelectorAll('[data-test="toc-ch-track"]')) as HTMLElement[];
      expect(tracks.length).toBe(14);
      const w = tracks[0].getBoundingClientRect().width;
      expect(tracks.every(t => Math.abs(t.getBoundingClientRect().width - w) < 0.5)).toBeTrue();
      component.chapters.forEach((ch, i) => {
        const fill = tracks[i].querySelector('.hd-track-fill') as HTMLElement | null;
        const sc = component.chapterScore(ch);
        if (sc === null) { expect(fill).toBeNull(); } else {
          expect(parseFloat(fill!.style.width)).toBeCloseTo(sc, 5);
        }
      });
      expect(el.querySelector('[data-test="toc-ch-score"]')!.textContent).toMatch(/\/100/);
      const na = el.querySelectorAll('.hd-vbar--na');
      na.forEach(n => expect(n.querySelector('.hd-vbar-fill')).toBeNull());
    });

    it('assistant proposals stay separate; "Use as proposed correction" only prefills Expert Feedback until saved', () => {
      const http = TestBed.inject(HttpTestingController);
      const p = component.chapters[0].passages.find(x => x.passage_id === 'ch01-a002')!;
      component.openPassageCard(p);
      fixture.detectChanges();
      component.openAssistant();
      fixture.detectChanges();
      http.match('assets/config/heidi-assistant.json').forEach(r => r.flush({ endpoint: 'https://assistant.example.org/heidi-assistant' }));
      fixture.detectChanges();
      const ai = fixture.debugElement.query(x => x.name === 'app-heidi-assistant').componentInstance;
      ai.ask('Suggest a more faithful English translation.');
      const req = http.expectOne('https://assistant.example.org/heidi-assistant');
      expect(req.request.body.context.german_original).toBe(p.german_text);
      expect(JSON.stringify(req.request.body)).not.toMatch(/api[_-]?key|sk-/i);
      req.flush({ answer: 'The shawl is wound round and round.', proposed_translation: 'a large red cotton shawl wound round and round her', caveats: null });
      fixture.detectChanges();
      expect(el.querySelector('[data-test="assistant-proposal"]')!.textContent).toContain('not the published translation');
      expect(el.querySelector('[data-test="card-en"]')!.textContent).not.toContain('wound round and round her');
      (el.querySelector('[data-test="assistant-use"]') as HTMLElement).click();
      fixture.detectChanges();
      const fb = fixture.debugElement.query(x => x.name === 'app-heidi-expert-feedback').componentInstance;
      expect(fb.dim.corrected_translation).toBe('a large red cotton shawl wound round and round her');
      expect(TestBed.inject(HeidiReviewService).get(p.passage_id)).toBeNull();
      fb.submit();
      expect(TestBed.inject(HeidiReviewService).get(p.passage_id)!.dimensions.semantic!.corrected_translation_source).toBe('ai_assistant_approved');
    });

    it('dimension selector shows badges, indicator bars and a review dot', () => {
      const p = component.chapters[0].passages.find(x => x.passage_id === 'ch01-a002')!;
      component.openPassageCard(p);
      fixture.detectChanges();
      expect(el.querySelectorAll('[data-test="card-dim-tabs"] .hd-dimsel-bar').length).toBe(8);
      expect(el.querySelector('[data-test="card-tab-score-emotion"]')!.textContent!.trim()).toBe('N/A');
      expect(el.querySelector('[data-test="card-tab-score-semantic"]')!.textContent!.trim()).toBe(String(p.analysis.dimensions.semantic!.score));
      expect(el.querySelectorAll('[data-test="tab-review-dot"]').length).toBeGreaterThan(0);
    });

    it('Ask Assistant AI reports unavailability without inventing answers when no backend is configured', () => {
      const http = TestBed.inject(HttpTestingController);
      const p = component.chapters[0].passages.find(x => x.passage_id === 'ch01-a002')!;
      component.openPassageCard(p);
      component.pickPhrase(p, component.phraseHl(p, 'de')[0].id);
      fixture.detectChanges();
      (el.querySelector('[data-test="open-assistant"]') as HTMLElement).click();
      fixture.detectChanges();
      http.match('assets/config/heidi-assistant.json').forEach(r => r.flush({ endpoint: null }));
      fixture.detectChanges();
      expect(el.querySelector('[data-test="assistant-drawer"]')).toBeTruthy();
      expect(el.querySelector('[data-test="assistant-unavailable"]')!.textContent).toContain('Assistant unavailable');
      expect(el.querySelector('[data-test="assistant-answer"]')).toBeNull();
      const ctx = component.assistantCtx!;
      expect(ctx.german_original).toBe(p.german_text);
      expect(ctx.human_english).toBe(p.english_text);
      expect(ctx.dimension).toBe('Semantic Preservation');
      expect(ctx.selection).toBeTruthy();
      expect(ctx.evidence.length).toBeGreaterThan(0);
      expect((el.querySelector('[data-test="assistant-ask"]') as HTMLButtonElement).disabled).toBeTrue();
    });

    it('sidebar shows chapter coverage and passage status; disputed groups are labelled', () => {
      fixture.detectChanges();
      expect(el.querySelector('[data-test="toc-coverage"]')!.textContent).toMatch(/\d+\/\d+ analysed/);
      const d = component.chapters.flatMap(c => c.passages).find(x => x.analysis.status === 'alignment_disputed')!;
      expect(component.passageStatusShort(d)).toBe('Alignment disputed');
      expect(component.align.needsAlignmentReview(d)).toBeTrue();
      expect(component.tabBadge(d, 'semantic').text).toBe('Alignment disputed');
    });

    it('single-side evidence (and omissions/additions) are highlighted on one side only', () => {
      // Literary analysis: an Added item exists only in English, a Lost item only in German.
      const added = component.chapters.flatMap(c => c.passages).find(x => isAlignmentUsable(x)
        && (x.analysis.dimensions.omissions?.phrase_evidence || []).some(e => e.label === 'Added' && !!e.en))!;
      const ev = added.analysis.dimensions.omissions!.phrase_evidence.find(e => e.label === 'Added' && !!e.en)!;
      component.openPassageCard(added);
      component.selectDimension('omissions');
      fixture.detectChanges();
      expect(ev.de).toBeNull();
      expect(component.cardSpans(added, 'en').some(s => s.linkId === ev.id && s.status === 'Added')).toBeTrue();
      expect(component.cardSpans(added, 'de').some(s => s.linkId === ev.id)).toBeFalse();
      const om = component.chapters.flatMap(c => c.passages).find(x => isAlignmentUsable(x)
        && (x.analysis.dimensions.omissions?.phrase_evidence || []).some(e => !e.en || !e.de));
      if (om) {
        component.openPassageCard(om);
        component.selectDimension('omissions');
        for (const e of om.analysis.dimensions.omissions!.phrase_evidence.filter(x => !x.en || !x.de)) {
          const id = component.evLink(om, e);
          expect(component.cardSpans(om, e.en ? 'de' : 'en').some(s => s.linkId === id)).toBeFalse();
        }
      }
    });

    it('low-confidence evidence is shown as Uncertain and medium/low alignments withhold highlights', () => {
      const all = component.chapters.flatMap(c => c.passages);
      const p = all.find(x => isAlignmentUsable(x) && Object.values(x.analysis.dimensions).some(d => d!.phrase_evidence.some(e => e.confidence === 'low')));
      if (p) {
        const [k, d] = Object.entries(p.analysis.dimensions).find(([, d]) => d!.phrase_evidence.some(e => e.confidence === 'low'))!;
        const low = d!.phrase_evidence.find(e => e.confidence === 'low')!;
        expect(component.evidenceItems(p, k as any).find(x => x.id === component.evLink(p, low))!.category).toBe('Uncertain');
      }
      const medium = all.find(x => x.alignment.status === 'needs_review')!;
      expect(component.cardSpans(medium, 'en').length).toBe(0);
      expect(medium.alignment.confidence_label).toBe('medium');
    });

    it('evidence whose offsets do not match the displayed text is listed as Unlocated evidence and not highlighted', () => {
      const p = JSON.parse(JSON.stringify(verifiedWithEvidence())) as HeidiPassage;
      p.passage_id = p.passage_id; // same id, cloned data
      p.analysis.dimensions.semantic!.phrase_evidence[0].de!.text = 'NICHT-IM-TEXT';
      const items = component.evidenceItems({ ...p, passage_id: p.passage_id + '-clone' }, 'semantic');
      expect(items[0].located).toBeFalse();
      expect(component.cardSpans({ ...p, passage_id: p.passage_id + '-clone' }, 'de').some(s => s.linkId === items[0].id)).toBeFalse();
      expect(component.unlocatedFor({ ...p, passage_id: p.passage_id + '-clone' }).length).toBeGreaterThan(0);
    });

    it('keeps the active dimension across Previous / Next passage navigation', () => {
      const p = component.chapters[0].passages[2];
      component.openPassageCard(p);
      component.selectDimension('voice');
      component.stepCard(1);
      expect(component.selectedPassageId).toBe(component.chapters[0].passages[3].passage_id);
      expect(component.selectedDimension).toBe('voice');
      component.stepCard(-1);
      expect(component.selectedPassageId).toBe(p.passage_id);
      expect(component.selectedDimension).toBe('voice');
      expect(component.hasAdjacent(component.chapters[0].passages[0], -1)).toBeFalse();
    });

    it('RTT disagreements above the configurable threshold enter the validation queue as potential disagreements', () => {
      const p = component.chapters.flatMap(c => c.passages).find(x => isAlignmentUsable(x) && (component.eff(x, 'semantic').score ?? 0) >= 90)!;
      const rtt = TestBed.inject(HeidiRttService);
      component.setRttThreshold(15);
      rtt.evaluate(p.passage_id, 'Completely unrelated words about Frankfurt rain.', p.english_text!, component.eff(p, 'semantic').score, 'h');
      component.rebuildQueue();
      const q = component.queueItems.filter(i => i.passage.passage_id === p.passage_id && i.issue === 'rtt_disagreement');
      expect(q.length).toBe(1);
      expect(q[0].issueLabel).toBe('Potential disagreement — review recommended');
      // the direct score is never overwritten or averaged
      expect(component.eff(p, 'semantic').score).toBe(p.analysis.dimensions.semantic!.score);
    });

    it('evidence-based highlighting: Ch 1 Passage 001 and 002 have exact phrase evidence without blanket sentence orange', () => {
      const p1 = component.chapters[0].passages[0];
      expect(p1.passage_id).toBe('ch01-a001');

      component.selectDimension('semantic');
      const phrasesDe = component.phraseHl(p1, 'de');
      const phrasesEn = component.phraseHl(p1, 'en');

      // 1. Five expected units in ch01-a001
      // Vom freundlichen Dorfe Maienfeld / The little old town of Mayenfeld is charmingly situated -> Changed
      const maienfeldDe = phrasesDe.find(x => p1.german_text!.slice(x.start, x.end) === 'Vom freundlichen Dorfe Maienfeld');
      const maienfeldEn = phrasesEn.find(x => p1.english_text!.slice(x.start, x.end) === 'The little old town of Mayenfeld is charmingly situated.');
      expect(maienfeldDe?.label).toBe('changed');
      expect(maienfeldEn?.label).toBe('changed');

      // führt ein Fußweg / From it a footpath leads -> Preserved
      const fusswegDe = phrasesDe.find(x => p1.german_text!.slice(x.start, x.end) === 'führt ein Fußweg');
      const fusswegEn = phrasesEn.find(x => p1.english_text!.slice(x.start, x.end) === 'From it a footpath leads');
      expect(fusswegDe?.label).toBe('preserved');
      expect(fusswegEn?.label).toBe('preserved');

      // durch grüne, baumreiche Fluren / through green, well-wooded stretches -> Preserved
      const flurenDe = phrasesDe.find(x => p1.german_text!.slice(x.start, x.end) === 'durch grüne, baumreiche Fluren');
      const flurenEn = phrasesEn.find(x => p1.english_text!.slice(x.start, x.end) === 'through green, well-wooded stretches');
      expect(flurenDe?.label).toBe('preserved');
      expect(flurenEn?.label).toBe('preserved');

      // bis zum Fuße der Höhen / to the foot of the heights -> Preserved
      const hoehenDe = phrasesDe.find(x => p1.german_text!.slice(x.start, x.end) === 'bis zum Fuße der Höhen');
      const hoehenEn = phrasesEn.find(x => p1.english_text!.slice(x.start, x.end) === 'to the foot of the heights');
      expect(hoehenDe?.label).toBe('preserved');
      expect(hoehenEn?.label).toBe('preserved');

      // kräftigen Bergkräutern / pungent herbage -> Changed
      const kraeuterDe = phrasesDe.find(x => p1.german_text!.slice(x.start, x.end) === 'kräftigen Bergkräutern');
      const kraeuterEn = phrasesEn.find(x => p1.english_text!.slice(x.start, x.end) === 'pungent herbage');
      expect(kraeuterDe?.label).toBe('changed');
      expect(kraeuterEn?.label).toBe('changed');

      // 2. Ch 1 Passage 002 phrase evidence
      const p2 = component.chapters[0].passages[1];
      expect(p2.passage_id).toBe('ch01-a002');
      const p2PhrasesDe = component.phraseHl(p2, 'de');
      expect(p2PhrasesDe.some(x => x.label === 'preserved')).toBeTrue();
      expect(p2PhrasesDe.some(x => x.label === 'changed')).toBeTrue();

      // 3. buildSegments renders phrase highlights without blanket sentence background
      const segs = buildSegments(p1.german_text!, component.sentenceHl(p1, 'de'), phrasesDe);
      const unassessedSeg = segs.find(s => s.phrase === null);
      expect(unassessedSeg).toBeTruthy();
      expect(unassessedSeg!.phrase).toBeNull();

      // 4. Evidence Inspector displays phrase details including confidence
      component.onPick(p1, { sentenceId: null, phraseId: fusswegDe!.id });
      const insp = component.inspectorItem(p1);
      expect(insp).toBeTruthy();
      expect(insp!.kind).toBe('phrase');
      expect(insp!.label).toBe('Preserved');
      expect(insp!.confidence).toBeTruthy();
      expect(insp!.german).toContain('führt ein Fußweg');
      expect(insp!.english).toContain('From it a footpath leads');
    });

    it('dimension-specific highlighting filters evidence strictly to the active dimension and leaves other text neutral', () => {
      const p1 = component.chapters[0].passages[0];

      // Semantic
      component.selectDimension('semantic');
      const semHl = component.phraseHl(p1, 'de');
      expect(semHl.length).toBeGreaterThan(0);
      expect(semHl.every(h => h.id.includes('-SEM-'))).toBeTrue();

      // Metaphor / Imagery
      component.selectDimension('imagery');
      const imgHl = component.phraseHl(p1, 'de');
      expect(imgHl.length).toBeGreaterThan(0);
      expect(imgHl.every(h => h.id.includes('-IMG-'))).toBeTrue();

      // Tone
      component.selectDimension('tone');
      const tonHl = component.phraseHl(p1, 'de');
      expect(tonHl.length).toBeGreaterThan(0);
      expect(tonHl.every(h => h.id.includes('-TON-'))).toBeTrue();

      // Voice (Narration only -> N/A)
      component.selectDimension('voice');
      const voiHl = component.phraseHl(p1, 'de');
      expect(voiHl.length).toBe(0); // visually neutral
    });
  });

  it('maps dataset evidence kinds onto Hamlet phrase categories and score bands', () => {
    const ev = (kind: string) => ({ id: 'x', de: null, en: null, kind, explanation: '', confidence: 'low' as const });
    expect(categorizeEvidence('semantic', ev('lexical_correspondence'))).toBe('Preserved');
    expect(categorizeEvidence('cultural', ev('cultural_adapted'))).toBe('Changed');
    expect(categorizeEvidence('cultural', ev('cultural_omitted'))).toBe('Lost');
    expect(categorizeEvidence('imagery', ev('imagery_not_rendered'))).toBe('Lost');
    expect(categorizeEvidence('omissions', ev('possible_addition'))).toBe('Added');
    expect(hamletScoreClass(null)).toBe('score-cell-na');
    expect(hamletScoreClass(59)).toBe('score-band-1');
    expect(hamletScoreClass(97)).toBe('score-band-5');
  });
});

@Component({ standalone: true, imports: [RouterOutlet], template: '<router-outlet></router-outlet>' })
class OutletHostComponent {}

describe('Project routes (Hamlet v1.5 | Heidi v1.0)', () => {
  beforeAll(async () => { DATASET = DATASET || await loadDataset(); });

  it('resolves /hamlet-analysis, lazy-loads /heidi-analysis and keeps the empty path on Hamlet', async () => {
    await TestBed.configureTestingModule({
      imports: [OutletHostComponent, HttpClientTestingModule, RouterTestingModule.withRoutes(APP_ROUTES)],
    }).compileComponents();
    const router = TestBed.inject(Router);
    const f = TestBed.createComponent(OutletHostComponent);
    await router.navigateByUrl('/');
    expect(router.url).toBe('/hamlet-analysis');
    const hamletRoute = APP_ROUTES.find(r => r.path === 'hamlet-analysis')!;
    expect((hamletRoute.component as any).name).toContain('HamletAnalysisComponent');
    const heidiRoute = APP_ROUTES.find(r => r.path === 'heidi-analysis')!;
    const loaded: any = await (heidiRoute.loadComponent as any)();
    expect(loaded).toBe(HeidiAnalysisComponent);
    TestBed.inject(HeidiDataService).setDataset(DATASET);
    await router.navigateByUrl('/heidi-analysis');
    f.detectChanges();
    expect(router.url).toBe('/heidi-analysis');
    expect(f.nativeElement.querySelector('app-heidi-analysis')).toBeTruthy();
    await router.navigateByUrl('/does-not-exist');
    expect(router.url).toBe('/hamlet-analysis');
  });

  it('switching projects does not reset or corrupt either project\'s review data', async () => {
    const hamlet = JSON.stringify({ 'A1-S1-D001': { status: 'reviewed' } });
    localStorage.setItem('hamlet_v5_expert_reviews', hamlet);
    TestBed.configureTestingModule({});
    const reviews = TestBed.inject(HeidiReviewService);
    reviews.reload();
    const r = reviews.blank('ch01-a001');
    r.commentary = 'x';
    reviews.save(r, 'R');
    const fresh = new HeidiReviewService();
    expect(fresh.get('ch01-a001')?.commentary).toBe('x');
    expect(localStorage.getItem('hamlet_v5_expert_reviews')).toBe(hamlet);
    localStorage.removeItem('hamlet_v5_expert_reviews');
    localStorage.removeItem(HEIDI_REVIEW_STORAGE_KEY);
  });
});
