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
import { HeidiAlignmentService } from './services/heidi-alignment.service';
import { HEIDI_REVIEW_STORAGE_KEY, HEIDI_RTT_STORAGE_KEY, HeidiDataset, HeidiPassage } from './models/heidi.models';
import { APP_ROUTES } from '../app-routing.module';

const EXPECTED_TITLES_DE = [
  'Zum Alm-Öhi hinauf', 'Beim Großvater', 'Auf der Weide', 'Bei der Großmutter',
  'Es kommt ein Besuch und dann noch einer, der mehr Folgen hat', 'Ein neues Kapitel und lauter neue Dinge',
  'Fräulein Rottenmeier hat einen unruhigen Tag', "Im Hause Sesemann geht's unruhig zu",
  'Der Hausherr hört allerlei in seinem Hause, das er noch nicht gehört hat', 'Eine Großmama',
  'Heidi nimmt auf einer Seite zu und auf der anderen ab', "Im Hause Sesemann spukt's",
  'Am Sommerabend die Alm hinan', "Am Sonntag, wenn's läutet",
];

let DATASET: HeidiDataset;

async function loadDataset(): Promise<HeidiDataset> {
  for (const url of ['/assets/data/heidi_aligned_chapters_1_14.json', '/_karma_webpack_/assets/data/heidi_aligned_chapters_1_14.json']) {
    const r = await fetch(url);
    if (r.ok) { return r.json(); }
  }
  throw new Error('Heidi dataset not served to Karma');
}

const all = (d: HeidiDataset): HeidiPassage[] => d.parts.flatMap(p => p.chapters.flatMap(c => c.passages));

describe('Heidi dataset integrity (src/assets/data/heidi_aligned_chapters_1_14.json)', () => {
  beforeAll(async () => { DATASET = await loadDataset(); });

  it('contains Part I with exactly the 14 chapters, in order, with the specified German titles', () => {
    expect(DATASET.project_id).toBe('heidi');
    expect(DATASET.parts.length).toBe(1);
    const chs = DATASET.parts[0].chapters;
    expect(chs.map(c => c.chapter_number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]);
    expect(chs.map(c => c.title_de)).toEqual(EXPECTED_TITLES_DE);
    expect(chs.every(c => c.passages.length > 0)).toBeTrue();
  });

  it('every passage belongs to its chapter and IDs are unique and stable', () => {
    const ids = new Set<string>();
    for (const ch of DATASET.parts[0].chapters) {
      const prefix = `HEIDI-P1-C${String(ch.chapter_number).padStart(2, '0')}-P`;
      ch.passages.forEach((p, i) => {
        expect(p.passage_id.startsWith(prefix)).withContext(p.passage_id).toBeTrue();
        expect(p.chapter_id).toBe(ch.chapter_id);
        expect(p.sequence).toBe(i + 1);
        expect(p.passage_id).toBe(prefix + String(i + 1).padStart(4, '0'));
        ids.add(p.passage_id);
      });
    }
    expect(ids.size).toBe(all(DATASET).length);
  });

  it('preserves source order in both languages and uses every extracted paragraph exactly once', () => {
    for (const ch of DATASET.parts[0].chapters) {
      const de = ch.passages.flatMap(p => p.source.de_paragraph_indices);
      const en = ch.passages.flatMap(p => p.source.en_paragraph_indices);
      expect(de).toEqual(Array.from({ length: ch.source_paragraphs.de }, (_, i) => i));
      expect(en).toEqual(Array.from({ length: ch.source_paragraphs.en }, (_, i) => i));
    }
  });

  it('keeps unmatched passages visible and flagged, never scored', () => {
    const unmatched = all(DATASET).filter(p => p.alignment.status === 'unmatched_de' || p.alignment.status === 'unmatched_en');
    expect(unmatched.length).toBeGreaterThan(0);
    for (const p of unmatched) {
      expect(!!p.german_text !== !!p.english_text).toBeTrue();
      expect(Object.keys(p.analysis.dimensions).length).toBe(0);
    }
  });

  it('only automatically aligned pairs carry (provisional, labelled) scores; null is never 0 for wordplay', () => {
    for (const p of all(DATASET)) {
      const dims = p.analysis.dimensions;
      if (p.alignment.status !== 'aligned') {
        expect(Object.keys(dims).length).withContext(p.passage_id).toBe(0);
      } else {
        expect(p.analysis.method).toBe('automated_heuristic_v1');
        expect(dims.wordplay!.score).toBeNull();
        Object.values(dims).forEach(d => {
          expect(d!.provisional).toBeTrue();
          if (d!.status !== 'scored') { expect(d!.score).toBeNull(); }
        });
      }
    }
  });

  it('preserves German characters (ä, ö, ü, ß)', () => {
    const de = all(DATASET).map(p => p.german_text || '').join(' ');
    for (const c of ['ä', 'ö', 'ü', 'ß', 'Ö']) { expect(de).toContain(c); }
  });

  it('evidence spans point at the exact text they quote', () => {
    for (const p of all(DATASET).slice(0, 200)) {
      for (const d of Object.values(p.analysis.dimensions)) {
        for (const s of d!.evidence_de) { expect(p.german_text!.substring(s.start, s.end)).toBe(s.text); }
        for (const s of d!.evidence_en) { expect(p.english_text!.substring(s.start, s.end)).toBe(s.text); }
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

  it('TOC shows Part → Chapter → Passage with "Chapter N" labels and 7 dimension indicators per chapter', () => {
    expect(el.querySelector('.toc-act-title')!.textContent).toContain('Part I');
    const cards = el.querySelectorAll('.toc-scene-card');
    expect(cards.length).toBe(14);
    expect(cards[0].querySelector('.toc-scene-canonical-label')!.textContent!.trim()).toBe('Chapter 1');
    expect(cards[0].querySelector('.toc-scene-short-title')!.textContent).toContain('Going up to the Alm-Uncle');
    cards.forEach(c => {
      const labels = Array.from(c.querySelectorAll('.toc-scene-dim-bar-lbl')).map(x => x.textContent!.trim());
      expect(labels).toEqual(['SEM', 'EMO', 'MET', 'TON', 'VOI', 'CUL', 'OMI']);
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
    expect(enCells()[0].getAttribute('data-passage-id')).toBe('HEIDI-P1-C07-P0001');
  });

  it('renders English on the left and German on the right in synchronised rows', () => {
    const heads = el.querySelectorAll('.hd-cell--head .reader-lang-title');
    expect(heads[0].textContent).toContain('Human English Translation');
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
    expect(tabs).toEqual(['Semantic', 'Emotion', 'Metaphor', 'Tone', 'Voice', 'Cultural', 'Omissions']);
  });

  it('dimension tabs show real chapter scores and selection updates highlights and inspector', () => {
    const ch = component.chapter!;
    const semTab = el.querySelector('[data-test="tab-semantic"] .tab-score-pill')!;
    expect(semTab.textContent!.trim()).toBe(component.chapterDimMean(ch, 'semantic')!.toFixed(1));
    component.showAnalysis = true;
    const p = ch.passages.find(x => x.alignment.status === 'aligned' && (x.analysis.dimensions.cultural?.phrase_evidence.length || 0) > 0)!;
    const sem = component.spans(p, 'de');
    (el.querySelector('[data-test="tab-cultural"]') as HTMLElement).click();
    fixture.detectChanges();
    expect(component.selectedDimension).toBe('cultural');
    expect(el.querySelector('[data-test="tab-cultural"]')!.classList).toContain('reader-dimension-tab-btn--active');
    const cul = component.spans(p, 'de');
    expect(cul).not.toEqual(sem);
    const ev = p.analysis.dimensions.cultural!.phrase_evidence.filter(e => e.de);
    expect(cul.map(s => s.start)).toEqual(ev.map(e => e.de!.start).sort((a, b) => a - b));
    component.selectPassage(p);
    fixture.detectChanges();
    expect(el.querySelector('.inspector-dim-badge')!.textContent).toContain('Cultural');
  });

  it('Show analysis toggles phrase highlighting and the phrase legend', () => {
    const p = component.chapter!.passages.find(x => x.alignment.status === 'aligned')!;
    expect(component.spans(p, 'en').length).toBe(0);
    expect(el.querySelectorAll('.ev-span').length).toBe(0);
    expect(el.querySelector('[data-test="analysis-bar"]')).toBeNull();
    (el.querySelector('[data-test="show-analysis"]') as HTMLInputElement).click();
    fixture.detectChanges();
    expect(component.showAnalysis).toBeTrue();
    expect(el.querySelector('[data-test="analysis-bar"]')!.textContent).toContain('Preserved');
    expect(el.querySelectorAll('.ev-span').length).toBeGreaterThan(0);
    // passages awaiting alignment review never get highlights
    const blocked = component.chapters.flatMap(c => c.passages).find(x => x.alignment.status === 'needs_review')!;
    expect(component.spans(blocked, 'en').length).toBe(0);
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
    component.selectChapter(10);
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

  it('RTT card shows "—" (not 0) and Not Run before generation; coverage counts only completed results', () => {
    const p = component.chapter!.passages.find(x => x.alignment.status === 'aligned')!;
    component.selectPassage(p);
    component.rttExpanded = true;
    fixture.detectChanges();
    expect(el.querySelector('[data-test="rtt-score"]')!.textContent!.trim()).toBe('—');
    expect(el.querySelector('[data-test="rtt-status"]')!.textContent).toContain('Not Run');
    expect(el.querySelector('[data-test="rtt-coverage"]')!.textContent).toContain('RTT verified: 0 of');
    const rtt = TestBed.inject(HeidiRttService);
    rtt.evaluate(p.passage_id, p.german_text!, p.german_text!, 100, 'h');
    fixture.detectChanges();
    expect(el.querySelector('[data-test="rtt-coverage"]')!.textContent).toContain('RTT verified: 1 of');
    expect(el.querySelector('[data-test="rtt-score"]')!.textContent!.trim()).toBe('100');
    expect(el.querySelector('[data-test="rtt-bt"]')!.textContent).toContain(p.german_text!.slice(0, 20));
  });

  it('RTT generation is disabled with an explanation for passages that need alignment review', () => {
    const p = component.chapters.flatMap(c => c.passages).find(x => x.alignment.status === 'low_confidence')!;
    expect(component.rttDisabledReason(p)).toContain('Alignment not yet verified');
    const u = component.chapters.flatMap(c => c.passages).find(x => x.alignment.status === 'unmatched_de')!;
    expect(component.rttDisabledReason(u)).toContain('Unmatched');
  });

  it('expert review is stored under the Heidi key, persists, and updates the displayed score', () => {
    const p = component.chapter!.passages.find(x => x.alignment.status === 'aligned')!;
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
    expect(String(spy.calls.argsFor(0)[1])).toContain('HEIDI-P1-C01-P0001');
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
      const ch = Number(id.slice(10, 12));
      if (!component.isChapterExpanded(component.chapters[ch - 1])) {
        (el.querySelector(`[data-test="toc-expand-${ch}"]`) as HTMLElement).click();
        fixture.detectChanges();
      }
      (el.querySelector(`[data-test="toc-p-${id}"]`) as HTMLElement).click();
      fixture.detectChanges();
    };

    it('opens the full card in the centre panel from the TOC, highlights the row and hides the side inspector', () => {
      const p = component.chapters[0].passages[3];
      openFromToc(p.passage_id);
      expect(component.viewMode).toBe('passage');
      const card = el.querySelector('[data-test="passage-card"]')!;
      expect(card).toBeTruthy();
      expect(el.querySelector('.ha-col-workspace [data-test="passage-card"]')).toBeTruthy();
      expect(el.querySelector('[data-test="inspector-panel"]')).toBeNull();
      expect(el.querySelector('[data-test="sync-grid"]')).toBeNull();
      expect(el.querySelector('.ha-col-toc')).toBeTruthy();
      expect(el.querySelector(`[data-test="toc-p-${p.passage_id}"]`)!.classList).toContain('toc-dialogue-row--selected');
      const head = el.querySelector('.v15-dialogue-head')!.textContent!;
      expect(head).toContain(p.passage_id);
      expect(head).toContain('Part I, Chapter 1');
      expect(head).toContain('Dimension: Semantic');
      expect(el.querySelector('[data-test="card-score"]')!.textContent!.trim()).toBe(String(component.eff(p, 'semantic').score));
      expect(el.querySelector('[data-test="card-en"]')!.textContent!.replace(/\s+/g, ' ')).toContain(p.english_text!.replace(/\s+/g, ' ').slice(0, 40));
      expect(el.querySelector('[data-test="card-de"]')!.textContent!.replace(/\s+/g, ' ')).toContain(p.german_text!.replace(/\s+/g, ' ').slice(0, 40));
      const en = el.querySelector('[data-test="card-en"]')!.getBoundingClientRect();
      const de = el.querySelector('[data-test="card-de"]')!.getBoundingClientRect();
      expect(Math.abs(en.width - de.width)).toBeLessThan(2);
      expect(en.left).toBeLessThanOrEqual(de.left);
      expect(el.querySelector('[data-test="card-review"]')).toBeTruthy();
      expect(el.querySelector('[data-test="card-explanation"]')).toBeTruthy();
      expect(el.querySelector('[data-test="card-evidence"]')).toBeTruthy();
    });

    it('highlights only the selected dimension evidence in the card', () => {
      const p = component.chapters.flatMap(c => c.passages).find(x => x.alignment.status === 'aligned' && (x.analysis.dimensions.cultural?.phrase_evidence.length || 0) > 0)!;
      component.openPassageCard(p);
      fixture.detectChanges();
      const sem = component.cardSpans(p, 'de').map(s => s.start);
      expect(sem).toEqual(p.analysis.dimensions.semantic!.phrase_evidence.filter(e => e.de).map(e => e.de!.start).sort((a, b) => a - b));
      (el.querySelector('[data-test="card-tab-cultural"]') as HTMLElement).click();
      fixture.detectChanges();
      const cul = component.cardSpans(p, 'de');
      expect(cul.map(s => s.start)).toEqual(p.analysis.dimensions.cultural!.phrase_evidence.filter(e => e.de).map(e => e.de!.start).sort((a, b) => a - b));
      expect(el.querySelectorAll('[data-test="card-de"] .ev-span').length).toBe(cul.length);
      const blocked = component.chapters.flatMap(c => c.passages).find(x => x.alignment.status === 'needs_review')!;
      component.openPassageCard(blocked);
      fixture.detectChanges();
      expect(component.cardSpans(blocked, 'en').length).toBe(0);
      expect(el.querySelector('[data-test="card-align-notice"]')).toBeTruthy();
    });

    it('RTT table defaults to Compare Both, shows RTT Not Run, and computes signed differences from real data', () => {
      const p = component.chapters[0].passages.find(x => x.alignment.status === 'aligned')!;
      component.openPassageCard(p);
      fixture.detectChanges();
      expect(component.rttViewMode).toBe('compare');
      const heads = Array.from(el.querySelectorAll('[data-test="rtt-table"] th')).map(t => t.textContent!.trim());
      expect(heads).toEqual(['Dimension', 'Direct Assessment', 'Round Trip', 'Difference', 'Status', 'Evidence Action']);
      expect(el.querySelector('[data-test="rtt-not-run"]')!.textContent).toContain('RTT Not Run');
      let rows = component.rttRows(p);
      expect(rows.length).toBe(7);
      expect(rows.every(r => r.diff === null)).toBeTrue();
      const direct = component.eff(p, 'semantic').score!;
      TestBed.inject(HeidiRttService).evaluate(p.passage_id, p.german_text!, p.german_text!, direct, 'h');
      fixture.detectChanges();
      rows = component.rttRows(p);
      const sem = rows.find(r => r.key === 'semantic')!;
      expect(sem.rtt).toBe(100);
      expect(sem.diff).toBe(Math.round((100 - direct) * 10) / 10);
      expect(sem.exceeds).toBe(Math.abs(100 - direct) >= 15);
      expect(rows.find(r => r.key === 'emotion')!.diff).toBeNull();
      expect(el.querySelector('[data-test="rtt-not-run"]')).toBeNull();
      (el.querySelector('[data-test="rtt-row-tone"] .v15-rtt-inspect-btn') as HTMLElement).click();
      fixture.detectChanges();
      expect(component.selectedDimension).toBe('tone');
      expect(el.querySelector('[data-test="rtt-row-tone"]')!.classList).toContain('v15-rtt-row--active');
      (el.querySelector('[data-test="rtt-mode-original"]') as HTMLElement).click();
      fixture.detectChanges();
      expect(Array.from(el.querySelectorAll('[data-test="rtt-table"] th')).map(t => t.textContent!.trim())).not.toContain('Round Trip');
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
      (el.querySelector('[data-test="card-close"]') as HTMLElement).click();
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

    it('saves verdicts and overrides, and imports review JSON exported by the page', () => {
      const p = component.chapters[0].passages.find(x => x.alignment.status === 'aligned')!;
      component.openPassageCard(p);
      fixture.detectChanges();
      component.setVerdict('revise');
      component.setOverride(55);
      component.reviewerName = 'Dr. R';
      (el.querySelector('[data-test="card-save"]') as HTMLElement).click();
      expect(component.hasUnsavedDraft()).toBeFalse();
      expect(component.eff(p, 'semantic').score).toBe(55);
      const reviews = TestBed.inject(HeidiReviewService);
      const json = reviews.exportJson();
      reviews.clear(p.passage_id);
      expect(reviews.get(p.passage_id)).toBeNull();
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
    const r = reviews.blank('HEIDI-P1-C01-P0001');
    r.commentary = 'x';
    reviews.save(r, 'R');
    const fresh = new HeidiReviewService();
    expect(fresh.get('HEIDI-P1-C01-P0001')?.commentary).toBe('x');
    expect(localStorage.getItem('hamlet_v5_expert_reviews')).toBe(hamlet);
    localStorage.removeItem('hamlet_v5_expert_reviews');
    localStorage.removeItem(HEIDI_REVIEW_STORAGE_KEY);
  });
});
