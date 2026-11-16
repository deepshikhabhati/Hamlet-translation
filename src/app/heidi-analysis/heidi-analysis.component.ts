import { ChangeDetectorRef, Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';
import {
  HEIDI_DIMENSIONS,
  HeidiChapter,
  HeidiDataset,
  HeidiDimensionAssessment,
  HeidiDimensionKey,
  HeidiDimensionMeta,
  HeidiPassage,
  HeidiPassageReview,
  HeidiPhraseEvidence,
  HeidiSpan,
  RTT_STATUS_LABELS,
} from './models/heidi.models';
import { HeidiDataService } from './services/heidi-data.service';
import { EffectiveScore, HeidiReviewService } from './services/heidi-review.service';
import { HEIDI_SIMILARITY_MODEL, HEIDI_TRANSLATION_MODEL, HeidiRttService, RttRecord } from './services/heidi-rtt.service';
import {
  HeidiAlignmentService,
  HeidiQueueFilter,
  HeidiQueueItem,
  HeidiQueueSort,
  HeidiReaderFilters,
} from './services/heidi-alignment.service';
import { getHeatmapThreshold, formatHumanScore } from '../hamlet-analysis/models/heatmap-config';
import { EvidenceHighlightedTextComponent } from '../hamlet-analysis/components/evidence-highlighted-text/evidence-highlighted-text.component';

export type HeidiTab = 'read' | 'heatmap' | 'queue';
export type HeidiViewMode = 'reader' | 'passage';

export interface RttTableRow {
  key: HeidiDimensionKey;
  name: string;
  direct: number | null;
  rtt: number | null;
  /** signed: RTT − direct; null when either score is missing */
  diff: number | null;
  exceeds: boolean;
  status: string;
}
export type PhraseCategory = 'Preserved' | 'Changed' | 'Lost' | 'Added';

/** Span shape consumed by the shared Hamlet <app-ha-evidence-highlighted-text>. */
export interface ReaderSpan {
  start: number;
  end: number;
  status: PhraseCategory;
  isSource: boolean;
  linkId?: string;
  needs_review?: boolean;
}

export interface SelectedPhrase {
  passageId: string;
  dimension: HeidiDimensionKey;
  category: PhraseCategory;
  english: string | null;
  german: string | null;
  explanation: string;
  evidenceId: string;
  confidence: string | null;
}

export interface ChapterDimBar { key: HeidiDimensionKey; label: string; score: number | null; color: string; tooltip: string; }
export interface PassageIndicator { key: HeidiDimensionKey; letter: string; name: string; score: number | null; status: 'green' | 'amber' | 'red' | 'gray'; symbol: string; tooltip: string; }

/** Hamlet v1.5 TOC dimension bars use these thresholds (HamletAggregationService.getDonutColor). */
export function hamletDonutColor(score: number | null | undefined): string {
  if (score === null || score === undefined || isNaN(score)) { return '#94a3b8'; }
  if (score >= 85) { return '#16a34a'; }
  if (score >= 70) { return '#d97706'; }
  return '#dc2626';
}

/** Hamlet v1.5 heatmap banding (HamletAnalysisComponent.getScoreClass). */
export function hamletScoreClass(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) { return 'score-cell-na'; }
  if (val < 60) { return 'score-band-1'; }
  if (val < 85) { return 'score-band-2'; }
  if (val < 93) { return 'score-band-3'; }
  if (val < 97) { return 'score-band-4'; }
  return 'score-band-5';
}

/**
 * Classify one piece of Heidi evidence into Hamlet's phrase categories.
 * Derived only from existing dataset fields (no data is changed or invented).
 */
export function categorizeEvidence(dim: HeidiDimensionKey, ev: HeidiPhraseEvidence): PhraseCategory {
  switch (ev.kind) {
    case 'lexical_correspondence':
    case 'imagery_preserved':
    case 'cultural_retained':
      return 'Preserved';
    case 'cultural_adapted':
      return 'Changed';
    case 'imagery_not_rendered':
    case 'cultural_omitted':
    case 'possible_omission':
      return 'Lost';
    case 'possible_addition':
      return 'Added';
    default:
      return 'Changed';
  }
}

const TOC_DIMS: { key: HeidiDimensionKey; label: string; letter: string }[] = [
  { key: 'semantic', label: 'SEM', letter: 'S' },
  { key: 'emotion', label: 'EMO', letter: 'E' },
  { key: 'imagery', label: 'MET', letter: 'M' },
  { key: 'tone', label: 'TON', letter: 'T' },
  { key: 'voice', label: 'VOI', letter: 'V' },
  { key: 'cultural', label: 'CUL', letter: 'C' },
  { key: 'omissions', label: 'OMI', letter: 'O' },
];

@Component({
  selector: 'app-heidi-analysis',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, EvidenceHighlightedTextComponent],
  templateUrl: './heidi-analysis.component.html',
  // Hamlet v1.5 stylesheets are reused verbatim so both projects share one design system.
  styleUrls: [
    '../hamlet-analysis/hamlet-analysis.component.scss',
    '../hamlet-analysis/components/full-book-navigator/full-book-navigator.component.css',
    '../hamlet-analysis/components/validation-queue/validation-queue.component.css',
    './heidi-analysis.component.scss',
  ],
})
export class HeidiAnalysisComponent implements OnInit, OnDestroy {
  @ViewChild('readerScroll') readerScroll?: ElementRef<HTMLElement>;

  readonly dims: HeidiDimensionMeta[] = HEIDI_DIMENSIONS;
  readonly tocDims = TOC_DIMS;
  readonly rttLabels = RTT_STATUS_LABELS;
  readonly translationModel = HEIDI_TRANSLATION_MODEL;
  readonly similarityModel = HEIDI_SIMILARITY_MODEL;
  readonly dimShort: Record<HeidiDimensionKey, string> = {
    semantic: 'Semantic', emotion: 'Emotion', imagery: 'Metaphor', tone: 'Tone', voice: 'Voice',
    cultural: 'Cultural', omissions: 'Omissions', wordplay: 'Wordplay',
  };

  loading = true;
  error: string | null = null;
  data: HeidiDataset | null = null;
  chapters: HeidiChapter[] = [];

  tab: HeidiTab = 'read';
  /** 'reader' = side-by-side chapter; 'passage' = full selected-passage analysis card in the centre panel. */
  viewMode: HeidiViewMode = 'reader';
  rttViewMode: 'original' | 'rtt' | 'compare' = 'compare';
  inlineBtOpen = false;
  importMessage: string | null = null;
  private readerScrollTop = 0;
  private draftSnapshot: string | null = null;
  private applyingRoute = false;
  selectedPartId = 'P1';
  selectedChapterNumber = 1;
  selectedPassageId: string | null = null;
  selectedDimension: HeidiDimensionKey = 'semantic';
  selectedPhrase: SelectedPhrase | null = null;
  activeLinkId: string | null = null;
  showAnalysis = false;
  /** Inspector panel content: open after a passage is chosen; the column itself is always visible. */
  inspectorOpen = false;
  tocCollapsed = false;
  rttExpanded = false;
  reviewExpanded = false;
  evidenceExpanded = true;
  exportMenuOpen = false;

  // TOC
  tocColorBy: HeidiDimensionKey | 'overall' = 'semantic';
  tocFilter: 'review' | 'diff' | null = null;
  tocSearch = '';
  partExpanded = true;
  expandedChapters = new Set<number>();

  // Reader filters
  filters: HeidiReaderFilters = { type: 'all', alignment: 'all', search: '' };
  phraseFilter: 'all' | 'review' | 'diff' = 'all';
  globalSearchResults: HeidiPassage[] = [];

  // Queue
  queueFilter: HeidiQueueFilter = 'all';
  queueSort: HeidiQueueSort = 'order';
  queueChapter: number | 'all' = 'all';
  queueStatus: 'open' | 'done' | 'all' = 'all';
  private queueCache: HeidiQueueItem[] = [];

  // Heatmap
  heatmapDimension: HeidiDimensionKey = 'semantic';
  heatmapType: HeidiReaderFilters['type'] = 'all';
  heatmapChapterNumber = 1;
  heatmapMax: 'all' | '85' | '70' = 'all';

  // Review
  reviewDraft: HeidiPassageReview | null = null;
  reviewerName = '';
  reviewSavedAt: string | null = null;
  saveMessage: string | null = null;

  rttBusy = false;
  rttError: string | null = null;

  private spanCache = new Map<string, ReaderSpan[]>();
  private sub?: Subscription;

  constructor(
    private dataService: HeidiDataService,
    public reviews: HeidiReviewService,
    public rtt: HeidiRttService,
    public align: HeidiAlignmentService,
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    try { this.reviewerName = localStorage.getItem('heidi_analysis_reviewer_v1') || ''; } catch { /* ignore */ }
    this.sub = this.dataService.load().subscribe({
      next: d => {
        this.data = d;
        this.chapters = this.dataService.chapters(d);
        this.loading = false;
        this.rebuildQueue();
        this.loadPipelineRtt();
        this.subscribeToRoute();
        this.cdr.markForCheck();
      },
      error: e => {
        this.loading = false;
        this.error = `Could not load the Heidi dataset (${e?.status || ''} ${e?.message || e}).`;
      },
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.routeSub?.unsubscribe();
  }

  private routeSub?: Subscription;

  /** Browser Back/Forward support: ?passage=<id>&dim=<dimension> mirrors the open passage card. */
  private subscribeToRoute(): void {
    this.routeSub = this.route.queryParamMap.subscribe(q => {
      const id = q.get('passage');
      const dim = q.get('dim') as HeidiDimensionKey | null;
      if (dim && this.dims.some(d => d.key === dim)) { this.selectedDimension = dim; }
      this.applyingRoute = true;
      try {
        if (id && id !== (this.viewMode === 'passage' ? this.selectedPassageId : null)) {
          const p = this.dataService.getPassage(id);
          if (p) { this.openPassageCard(p, undefined, false); }
        } else if (!id && this.viewMode === 'passage') {
          this.closePassageCard(false);
        }
      } finally {
        this.applyingRoute = false;
      }
    });
  }

  private syncUrl(): void {
    if (this.applyingRoute) { return; }
    const queryParams = this.viewMode === 'passage' && this.selectedPassageId
      ? { passage: this.selectedPassageId, dim: this.selectedDimension }
      : { passage: null, dim: null };
    this.router.navigate([], { relativeTo: this.route, queryParams, queryParamsHandling: 'merge' }).catch(() => undefined);
  }

  @HostListener('document:keydown.escape')
  onEsc(): void {
    this.exportMenuOpen = false;
    if (this.viewMode === 'passage') { this.closePassageCard(); return; }
    if (this.inspectorOpen) { this.closeInspector(); }
  }

  private loadPipelineRtt(): void {
    this.http.get<any>('assets/data/heidi_rtt_research_evaluation.json').subscribe({
      next: r => { this.rtt.mergePipelineResults(r?.results || []); this.rebuildQueue(); },
      error: () => { /* optional file */ },
    });
  }

  // ------------------------------------------------------------- selection
  get chapter(): HeidiChapter | undefined {
    return this.chapters.find(c => c.chapter_number === this.selectedChapterNumber);
  }

  /** Passages shown in the reader: chapter → type/alignment/search filters → analysis shortcut filter. */
  get visiblePassages(): HeidiPassage[] {
    const ch = this.chapter;
    if (!ch) { return []; }
    let list = ch.passages.filter(p => this.align.matchesFilters(p, this.filters));
    if (this.phraseFilter === 'review') {
      list = list.filter(p => this.passageNeedsReview(p));
    } else if (this.phraseFilter === 'diff') {
      list = list.filter(p => this.isDifference(p)).sort((a, b) =>
        (this.eff(a, this.selectedDimension).score ?? 101) - (this.eff(b, this.selectedDimension).score ?? 101));
    }
    return list;
  }

  get selectedPassage(): HeidiPassage | null {
    return this.selectedPassageId ? this.dataService.getPassage(this.selectedPassageId) ?? null : null;
  }

  selectChapter(n: number): void {
    if (this.viewMode === 'passage') {
      if (!this.confirmDiscardDraft()) { return; }
      this.viewMode = 'reader';
      this.syncUrl();
    }
    this.selectedChapterNumber = Number(n);
    this.heatmapChapterNumber = Number(n);
    this.selectedPhrase = null;
    this.activeLinkId = null;
    this.readerScroll?.nativeElement.scrollTo({ top: 0 });
  }

  selectDimension(k: HeidiDimensionKey): void {
    this.selectedDimension = k;
    this.selectedPhrase = null;
    this.activeLinkId = null;
    if (k !== 'wordplay') { this.tocColorBy = k; }
    if (this.viewMode === 'passage') { this.syncUrl(); }
  }

  /** Select a passage and open the inspector WITHOUT moving the reading position or leaving the reader. */
  selectPassage(p: HeidiPassage, focus?: HeidiQueueItem['focus']): void {
    if (this.selectedPassageId !== p.passage_id && !this.confirmDiscardDraft()) { return; }
    if (this.selectedPassageId !== p.passage_id) { this.selectedPhrase = null; this.activeLinkId = null; this.inlineBtOpen = false; }
    this.selectedPassageId = p.passage_id;
    this.inspectorOpen = true;
    if (!this.reviewDraft || this.reviewDraft.passage_id !== p.passage_id) {
      this.reviewDraft = this.reviews.getOrBlank(p.passage_id);
      this.draftSnapshot = this.draftSignature();
    }
    this.reviewSavedAt = this.reviewDraft.reviewed_at;
    this.saveMessage = null;
    this.rttError = null;
    if (focus === 'rtt') { this.rttExpanded = true; }
    else if (focus === 'alignment') { this.reviewExpanded = true; }
    else if (focus) { this.selectedDimension = focus; this.evidenceExpanded = true; }
  }

  /** Open the full selected-passage analysis card in the centre panel (TOC / heatmap / queue / Next Review). */
  openPassageCard(p: HeidiPassage, focus?: HeidiQueueItem['focus'], pushUrl = true): void {
    if (this.selectedPassageId !== p.passage_id && !this.confirmDiscardDraft()) { return; }
    if (this.viewMode === 'reader' && this.tab === 'read') {
      this.readerScrollTop = this.readerScroll?.nativeElement.scrollTop ?? 0;
    }
    const chNum = Number(p.chapter_id.slice(-2));
    this.tab = 'read';
    this.selectedChapterNumber = chNum;
    this.heatmapChapterNumber = chNum;
    this.expandedChapters.add(chNum);
    this.partExpanded = true;
    this.selectPassage(p, focus);
    this.inspectorOpen = false;
    this.viewMode = 'passage';
    if (focus === 'alignment') { this.reviewExpanded = true; }
    if (pushUrl) { this.syncUrl(); }
    setTimeout(() => {
      this.readerScroll?.nativeElement.scrollTo({ top: 0 });
      const row = typeof document !== 'undefined' ? document.getElementById('heidi-toc-' + p.passage_id) : null;
      row?.scrollIntoView({ block: 'nearest' });
    }, 0);
  }

  /** Close the card and return to the side-by-side reader, keeping chapter, dimension, filters, Show analysis and scroll. */
  closePassageCard(pushUrl = true): void {
    if (this.viewMode !== 'passage') { return; }
    if (!this.confirmDiscardDraft()) {
      if (!pushUrl) { this.syncUrl(); }
      return;
    }
    const id = this.selectedPassageId;
    this.viewMode = 'reader';
    this.inlineBtOpen = false;
    if (pushUrl) { this.syncUrl(); }
    setTimeout(() => {
      const el = this.readerScroll?.nativeElement;
      if (el) { el.scrollTop = this.readerScrollTop; }
      if (id && el && !this.readerScrollTop) { this.scrollToPassage(id); }
    }, 0);
  }

  /** Next eligible review item (flagged, not yet expert-reviewed) after the current passage, respecting active filters. */
  nextReviewPassage(): HeidiPassage | null {
    const all = this.chapters.flatMap(c => c.passages).filter(p => this.align.matchesFilters(p, this.filters));
    const eligible = (p: HeidiPassage) => this.passageNeedsReview(p) && (this.phraseFilter !== 'diff' || this.isDifference(p));
    const cur = this.selectedPassageId ? all.findIndex(p => p.passage_id === this.selectedPassageId) : -1;
    return all.slice(cur + 1).find(eligible) || all.slice(0, Math.max(0, cur)).find(eligible) || null;
  }

  nextReview(): void {
    const n = this.nextReviewPassage();
    if (n) { this.openPassageCard(n); }
  }

  // ----- unsaved-draft protection
  /** Normalised review-form state (empty per-dimension stubs created by the form are ignored). */
  private draftSignature(): string {
    if (!this.reviewDraft) { return 'null'; }
    const dims: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(this.reviewDraft.dimensions || {})) {
      if (v && (v.decision !== null || (v.score_override !== null && v.score_override !== undefined) || (v.comment ?? '') !== '')) { dims[k] = v; }
    }
    const r = this.reviewDraft;
    return JSON.stringify([r.alignment?.decision ?? null, r.alignment?.correction_note || '', r.omission_addition ?? null, dims,
      !!r.rtt_inaccurate, r.rtt_corrected_semantic_score ?? null, r.commentary || '']);
  }

  hasUnsavedDraft(): boolean {
    return !!this.reviewDraft && this.draftSnapshot !== null && this.draftSignature() !== this.draftSnapshot;
  }

  confirmDiscardDraft(): boolean {
    if (!this.hasUnsavedDraft()) { return true; }
    const ok = typeof window !== 'undefined' && typeof window.confirm === 'function'
      ? window.confirm(`You have unsaved expert-review changes for ${this.reviewDraft?.passage_id}. Discard them?`)
      : true;
    if (ok) { this.reviewDraft = null; this.draftSnapshot = null; }
    return ok;
  }

  /** Open a passage in the reader (side-by-side) and scroll to it. */
  openPassage(p: HeidiPassage, focus?: HeidiQueueItem['focus']): void {
    if (this.viewMode === 'passage') {
      if (!this.confirmDiscardDraft()) { return; }
      this.viewMode = 'reader';
      this.syncUrl();
    }
    const chNum = Number(p.chapter_id.slice(-2));
    this.tab = 'read';
    if (chNum !== this.selectedChapterNumber) { this.selectedChapterNumber = chNum; }
    if (!this.align.matchesFilters(p, this.filters)) { this.filters = { type: 'all', alignment: 'all', search: '' }; }
    if (this.phraseFilter !== 'all' && !this.visiblePassages.some(x => x.passage_id === p.passage_id)) { this.phraseFilter = 'all'; }
    this.selectPassage(p, focus);
    setTimeout(() => this.scrollToPassage(p.passage_id), 0);
  }

  scrollToPassage(id: string): void {
    const el = typeof document !== 'undefined' ? document.getElementById('heidi-en-' + id) : null;
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  step(delta: number): void {
    const list = this.visiblePassages;
    if (!list.length) { return; }
    const i = this.selectedPassageId ? list.findIndex(p => p.passage_id === this.selectedPassageId) : -1;
    const next = list[Math.max(0, Math.min(list.length - 1, i + delta))];
    this.selectPassage(next);
    setTimeout(() => this.scrollToPassage(next.passage_id), 0);
  }

  closeInspector(): void {
    this.inspectorOpen = false;
    this.selectedPhrase = null;
    this.activeLinkId = null;
  }

  toggleToc(): void {
    this.tocCollapsed = !this.tocCollapsed;
  }

  setTab(t: HeidiTab): void {
    this.tab = t;
    this.exportMenuOpen = false;
    if (t === 'queue') { this.rebuildQueue(); }
  }

  // ------------------------------------------------------------- TOC (Part → Chapter → Passage)
  tocDimensionLabel(): string {
    return this.tocColorBy === 'overall' ? 'Overall' : this.align.dimensionLabel(this.tocColorBy);
  }

  /** Chapter score for the "Color chapters by" dimension (mean of available scores; overall = mean of core dimension means). */
  chapterScore(ch: HeidiChapter): number | null {
    if (this.tocColorBy !== 'overall') { return this.chapterDimMean(ch, this.tocColorBy); }
    const means = TOC_DIMS.map(d => this.chapterDimMean(ch, d.key)).filter((v): v is number => v !== null);
    return means.length ? Math.round((means.reduce((a, b) => a + b, 0) / means.length) * 10) / 10 : null;
  }

  /** One-decimal mean of available effective scores; null when none (never 0). */
  chapterDimMean(ch: HeidiChapter, k: HeidiDimensionKey): number | null {
    const vals = ch.passages.map(p => this.eff(p, k).score).filter((v): v is number => v !== null);
    return vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : null;
  }

  chapterDimDisplay(ch: HeidiChapter | undefined, k: HeidiDimensionKey): string {
    if (!ch) { return '—'; }
    const v = this.chapterDimMean(ch, k);
    return v === null ? '—' : v.toFixed(1);
  }

  chapterDimBars(ch: HeidiChapter): ChapterDimBar[] {
    return TOC_DIMS.map(d => {
      const score = this.chapterDimMean(ch, d.key);
      const n = ch.passages.filter(p => this.eff(p, d.key).score !== null).length;
      return {
        key: d.key, label: d.label, score, color: hamletDonutColor(score),
        tooltip: `${this.align.dimensionLabel(d.key)}: ${score === null ? 'N/A' : score + '%'} (${n}/${ch.passages.length} scored passages)`,
      };
    });
  }

  getDimBarHeight(score: number | null): number {
    if (score === null || isNaN(score)) { return 3; }
    return Math.max(3, Math.min(14, Math.round(((score - 40) / 60) * 14)));
  }

  /** A passage is flagged when its alignment needs review, any core score < 60, or RTT disagrees — and no expert has reviewed it. */
  passageNeedsReview(p: HeidiPassage): boolean {
    if (this.reviews.isReviewed(p.passage_id)) { return false; }
    if (this.align.needsAlignmentReview(p)) { return true; }
    if (TOC_DIMS.some(d => { const s = this.eff(p, d.key).score; return s !== null && s < 60; })) { return true; }
    return this.rtt.get(p.passage_id)?.status === 'disagreement';
  }

  isDifference(p: HeidiPassage): boolean {
    const s = this.eff(p, this.selectedDimension).score;
    return s !== null && s < 85;
  }

  chapterFlagged(ch: HeidiChapter): number {
    return ch.passages.filter(p => this.passageNeedsReview(p)).length;
  }

  chapterStatusIcon(ch: HeidiChapter): 'flag' | 'warn' | 'check' {
    const score = this.chapterScore(ch);
    const flagged = this.chapterFlagged(ch);
    if (flagged >= 20 || (score !== null && score < 79)) { return 'flag'; }
    if (flagged > 0 || (score !== null && score < 85)) { return 'warn'; }
    return 'check';
  }

  isLowestInPart(ch: HeidiChapter): boolean {
    const scores = this.chapters.map(c => this.chapterScore(c)).filter((v): v is number => v !== null);
    if (scores.length < 2) { return false; }
    const s = this.chapterScore(ch);
    return s !== null && s === Math.min(...scores) && this.chapters.find(c => this.chapterScore(c) === s) === ch;
  }

  partScoredCount(): number {
    return this.chapters.reduce((n, c) => n + c.passages.filter(p => p.analysis.status === 'automated_provisional').length, 0);
  }

  /** Chapters shown in the TOC after search / pills. */
  tocChapters(): HeidiChapter[] {
    const q = this.tocSearch.trim().toLowerCase();
    let list = this.chapters;
    if (q) {
      list = list.filter(c => `chapter ${c.chapter_number} ${c.title_en} ${c.title_de}`.toLowerCase().includes(q) || this.tocPassages(c).length > 0);
    }
    if (this.tocFilter === 'review') { list = list.filter(c => this.chapterFlagged(c) > 0); }
    if (this.tocFilter === 'diff') {
      list = [...list].sort((a, b) => (this.chapterScore(a) ?? 101) - (this.chapterScore(b) ?? 101));
    }
    return list;
  }

  tocPassages(ch: HeidiChapter): HeidiPassage[] {
    const q = this.tocSearch.trim().toLowerCase();
    let list = ch.passages;
    if (q) {
      list = list.filter(p => `${p.passage_id} ${p.speaker_label || ''} ${p.english_text || ''} ${p.german_text || ''}`.toLowerCase().includes(q));
    }
    if (this.tocFilter === 'review') { list = list.filter(p => this.passageNeedsReview(p)); }
    return list;
  }

  isChapterExpanded(ch: HeidiChapter): boolean {
    return this.expandedChapters.has(ch.chapter_number) || (!!this.tocSearch.trim() && this.tocPassages(ch).length > 0);
  }

  toggleChapter(ch: HeidiChapter, ev?: Event): void {
    ev?.stopPropagation();
    if (this.expandedChapters.has(ch.chapter_number)) { this.expandedChapters.delete(ch.chapter_number); }
    else { this.expandedChapters.add(ch.chapter_number); }
  }

  onTocFilter(f: 'review' | 'diff'): void {
    this.tocFilter = this.tocFilter === f ? null : f;
    this.phraseFilter = this.tocFilter ?? 'all';
    if (this.tocFilter) { this.showAnalysis = true; }
  }

  onTocColorBy(v: HeidiDimensionKey | 'overall'): void {
    this.tocColorBy = v;
    if (v !== 'overall') { this.selectDimension(v); }
  }

  onChapterBarClick(ch: HeidiChapter, k: HeidiDimensionKey, ev: Event): void {
    ev.stopPropagation();
    this.selectChapter(ch.chapter_number);
    this.selectDimension(k);
  }

  passageIndicators(p: HeidiPassage): PassageIndicator[] {
    const blocked = this.align.needsAlignmentReview(p);
    return TOC_DIMS.map(d => {
      const score = this.eff(p, d.key).score;
      let status: PassageIndicator['status'] = 'gray';
      let symbol = '–';
      if (score === null) { status = 'gray'; symbol = '–'; }
      else if (score >= 80) { status = 'green'; symbol = '●'; }
      else if (score >= 60) { status = 'amber'; symbol = '●'; }
      else { status = 'red'; symbol = '!'; }
      const desc = score === null ? (blocked ? 'Pending alignment review' : 'Not applicable') : status === 'green' ? 'Strong preservation' : status === 'amber' ? 'Potential issue' : 'Serious concern';
      return { key: d.key, letter: d.letter, name: this.align.dimensionLabel(d.key), score, status, symbol,
        tooltip: `${this.align.dimensionLabel(d.key)} (${d.letter}): ${score === null ? 'N/A' : score + '%'} — ${desc}` };
    });
  }

  onIndicatorClick(p: HeidiPassage, k: HeidiDimensionKey, ev: Event): void {
    ev.stopPropagation();
    this.selectDimension(k);
    this.openPassageCard(p, k);
  }

  shortId(p: HeidiPassage): string {
    return p.passage_id.replace(/^HEIDI-P1-C\d\d-/, '');
  }

  preview(p: HeidiPassage): string {
    const t = p.english_text || p.german_text || '';
    return t.length > 55 ? t.substring(0, 52) + '…' : t;
  }

  // ------------------------------------------------------------- reader helpers
  speakerLine(p: HeidiPassage): string {
    if (p.passage_type === 'narration') { return 'Narration'; }
    if (p.passage_type === 'mixed') { return p.speaker_label ? `Narration with speech · ${p.speaker_label}` : 'Narration with speech'; }
    return p.speaker_label || 'Dialogue';
  }

  alignmentBadgeClass(p: HeidiPassage): string {
    if (this.reviews.alignmentRejected(p.passage_id)) { return 'hd-align-badge--bad'; }
    if (this.reviews.alignmentVerified(p.passage_id)) { return 'hd-align-badge--verified'; }
    switch (p.alignment.status) {
      case 'aligned': return 'hd-align-badge--ok';
      case 'needs_review': return 'hd-align-badge--warn';
      case 'low_confidence': return 'hd-align-badge--bad';
      default: return 'hd-align-badge--unmatched';
    }
  }

  eff(p: HeidiPassage, k: HeidiDimensionKey): EffectiveScore {
    return this.reviews.effectiveScore(p, k);
  }

  assessment(p: HeidiPassage | null, k: HeidiDimensionKey): HeidiDimensionAssessment | undefined {
    return p?.analysis?.dimensions?.[k];
  }

  /** Hamlet heatmap palette colour for a score. */
  scoreColor(score: number | null | undefined): string {
    const t = getHeatmapThreshold(score);
    return t ? t.color : '#94a3b8';
  }

  scoreBand(score: number | null | undefined): string {
    return hamletScoreClass(score);
  }

  fmt(score: number | null | undefined): string {
    return formatHumanScore(score);
  }

  /** Whether the dataset supports the optional Wordplay dimension anywhere (currently: no scored passages). */
  get wordplaySupported(): boolean {
    return this.chapters.some(c => c.passages.some(p => p.analysis.dimensions.wordplay?.score !== null && p.analysis.dimensions.wordplay?.score !== undefined));
  }

  get tabDims(): HeidiDimensionMeta[] {
    return this.dims.filter(d => !d.optional || (d.key === 'wordplay' && this.wordplaySupported));
  }

  provenanceLabel(e: EffectiveScore): string {
    switch (e.provenance) {
      case 'expert_override': return `Expert override (automated: ${e.automatedScore ?? '—'})`;
      case 'expert_accepted': return 'Expert-accepted automated score';
      case 'automated_heuristic': return 'Machine-Generated Initial Assessment (Provisional)';
      default: return '';
    }
  }

  statusText(p: HeidiPassage, k: HeidiDimensionKey): string {
    const a = this.assessment(p, k);
    if (!a) {
      return p.analysis.status === 'blocked_alignment_review' ? 'Pending alignment review'
        : p.analysis.status === 'not_applicable_unmatched' ? 'Unmatched' : 'Not run';
    }
    if (a.status === 'not_applicable') { return 'N/A'; }
    if (a.status === 'not_assessed') { return 'Not assessed'; }
    return '';
  }

  /** Preservation category of a whole passage for one dimension (Hamlet-style label). */
  passageCategory(p: HeidiPassage, k: HeidiDimensionKey): string {
    if (this.selectedPhrase && this.selectedPhrase.passageId === p.passage_id && this.selectedPhrase.dimension === k) {
      return this.selectedPhrase.category;
    }
    const s = this.eff(p, k).score;
    if (s === null) { return 'N/A'; }
    if (k === 'omissions') {
      const a = this.assessment(p, k);
      if ((a?.possible_additions || 0) > 0 && !(a?.possible_omissions)) { return 'Added'; }
      if ((a?.possible_omissions || 0) > 0) { return 'Lost'; }
    }
    if (s >= 85) { return 'Preserved'; }
    if (s >= 60) { return 'Changed'; }
    return 'Lost';
  }

  /**
   * Phrase-level highlight spans for the selected dimension only, built from the
   * dataset's evidence. Nothing is shown for passages whose alignment is unverified.
   */
  spans(p: HeidiPassage, lang: 'en' | 'de'): ReaderSpan[] {
    if (!this.showAnalysis) { return []; }
    return this.cardSpans(p, lang);
  }

  /** Spans for the selected-passage card (always shown there, independent of the reader's Show analysis toggle). */
  cardSpans(p: HeidiPassage, lang: 'en' | 'de'): ReaderSpan[] {
    if (this.align.needsAlignmentReview(p)) { return []; }
    const key = `${p.passage_id}|${this.selectedDimension}|${lang}`;
    const hit = this.spanCache.get(key);
    if (hit) { return hit; }
    const a = this.assessment(p, this.selectedDimension);
    const text = lang === 'en' ? p.english_text : p.german_text;
    const out: ReaderSpan[] = [];
    if (a && text) {
      const valid = (s: HeidiSpan | null | undefined): s is HeidiSpan => !!s && s.end > s.start && text.substring(s.start, s.end) === s.text;
      if (a.phrase_evidence.length) {
        for (const ev of a.phrase_evidence) {
          const s = lang === 'en' ? ev.en : ev.de;
          if (valid(s)) {
            out.push({ start: s.start, end: s.end, status: categorizeEvidence(this.selectedDimension, ev), isSource: lang === 'de', linkId: `${p.passage_id}:${ev.id}` });
          }
        }
      } else {
        // dimensions without paired evidence (emotion, tone, voice): span lists per language
        const list = lang === 'en' ? a.evidence_en : a.evidence_de;
        const shifted = new Set(a.shift_categories || []);
        const status: PhraseCategory = (a.score ?? 0) >= 85 ? 'Preserved' : 'Changed';
        for (const s of list) {
          if (valid(s)) {
            out.push({ start: s.start, end: s.end, status: s.category && shifted.has(s.category) ? 'Changed' : status, isSource: lang === 'de' });
          }
        }
      }
    }
    out.sort((x, y) => x.start - y.start);
    const dedup = out.filter((s, i) => i === 0 || s.start >= out[i - 1].end);
    this.spanCache.set(key, dedup);
    return dedup;
  }

  onSegmentClick(evt: { segment: any }, p: HeidiPassage): void {
    this.selectPassage(p);
    const linkId: string | undefined = evt?.segment?.linkId;
    const a = this.assessment(p, this.selectedDimension);
    const evId = linkId ? linkId.split(':').pop() : null;
    const ev = evId ? a?.phrase_evidence.find(e => e.id === evId) : undefined;
    this.activeLinkId = linkId || null;
    this.evidenceExpanded = true;
    this.selectedPhrase = {
      passageId: p.passage_id,
      dimension: this.selectedDimension,
      category: (evt?.segment?.status as PhraseCategory) || 'Changed',
      english: ev ? ev.en?.text ?? null : (evt.segment?.isSource ? null : evt.segment?.text),
      german: ev ? ev.de?.text ?? null : (evt.segment?.isSource ? evt.segment?.text : null),
      explanation: ev?.explanation || a?.explanation || '',
      evidenceId: ev ? `${p.passage_id}:${ev.id}` : p.passage_id,
      confidence: ev?.confidence ?? a?.confidence ?? null,
    };
  }

  /** Per-dimension direct vs round-trip comparison for the passage card. Only Semantic has an RTT score in Heidi. */
  rttRows(p: HeidiPassage): RttTableRow[] {
    const rec = this.rtt.get(p.passage_id);
    return this.tabDims.map(d => {
      const direct = d.key === 'semantic' && rec?.direct_semantic_score !== null && rec?.direct_semantic_score !== undefined && rec.rtt_semantic_score !== null
        ? rec.direct_semantic_score : this.eff(p, d.key).score;
      const rtt = d.key === 'semantic' ? (rec?.rtt_semantic_score ?? null) : null;
      const diff = direct !== null && rtt !== null ? Math.round((rtt - direct) * 10) / 10 : null;
      const exceeds = diff !== null && Math.abs(diff) >= this.rtt.threshold;
      let status: string;
      if (direct === null) {
        status = this.align.needsAlignmentReview(p) ? 'Pending Review' : 'Not Applicable';
      } else if (exceeds) {
        status = 'Disagreement';
      } else {
        status = this.passageCategory(p, d.key);
      }
      return { key: d.key, name: d.label, direct, rtt, diff, exceeds, status };
    });
  }

  chipClass(status: string): string {
    const s = status.toLowerCase();
    if (['preserved', 'changed', 'lost', 'added'].includes(s)) { return 'v15-chip--' + s; }
    return 'hd-chip--' + s.replace(/\s+/g, '-');
  }

  rttDimExplanation(p: HeidiPassage, k: HeidiDimensionKey): string {
    const rec = this.rtt.get(p.passage_id);
    if (k !== 'semantic') {
      return 'No round-trip assessment exists for this dimension: Heidi RTT compares the AI back-translated German with the original German for semantic similarity only.';
    }
    if (!rec || rec.rtt_semantic_score === null) {
      return 'RTT Not Run — no back-translation has been generated for this passage yet.';
    }
    return `Back-translated German compared with Spyri's original using ${rec.similarity_model}: ${rec.rtt_semantic_score}/100 vs direct ${rec.direct_semantic_score ?? '—'}/100 (|Δ| ${rec.disagreement ?? '—'}; threshold ${this.rtt.threshold}). The similarity scale is not calibrated against the direct heuristic.`;
  }

  /** Reverse-translation action for the English card: runs the existing English → German RTT and shows it inline. */
  toggleInlineBackTranslation(p: HeidiPassage): void {
    this.inlineBtOpen = !this.inlineBtOpen;
    if (this.inlineBtOpen && !this.rtt.get(p.passage_id)?.back_translated_german && !this.rttDisabledReason(p)) {
      this.generateRtt(p);
    }
  }

  passageStatusLabel(p: HeidiPassage): string {
    if (this.reviews.isReviewed(p.passage_id)) { return 'Expert Reviewed'; }
    if (this.align.needsAlignmentReview(p)) { return 'Needs Alignment Review'; }
    if (this.passageNeedsReview(p)) { return 'Needs Review'; }
    return 'Initial Assessment';
  }

  setVerdict(v: 'accept' | 'reject' | 'revise'): void {
    const dr = this.dimReview(this.selectedDimension);
    if (dr) { dr.decision = v; }
  }

  verdict(): string | null {
    return this.reviewDraft?.dimensions?.[this.selectedDimension]?.decision ?? null;
  }

  setOverride(v: number | string | null): void {
    const dr = this.dimReview(this.selectedDimension);
    if (!dr) { return; }
    dr.score_override = v === null || v === '' ? null : Number(v);
    if (dr.score_override !== null) { dr.decision = 'override'; }
  }

  importReviews(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) { return; }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const n = this.reviews.importJson(String(reader.result));
        this.importMessage = `Imported ${n} Heidi review decision(s).`;
        if (this.selectedPassageId) { this.reviewDraft = this.reviews.getOrBlank(this.selectedPassageId); this.draftSnapshot = this.draftSignature(); }
        this.rebuildQueue();
      } catch (e: any) {
        this.importMessage = `Import failed: ${e?.message || e}`;
      }
      input.value = '';
      this.cdr.markForCheck();
    };
    reader.readAsText(file);
  }

  categorizeEv(ev: HeidiPhraseEvidence): PhraseCategory {
    return categorizeEvidence(this.selectedDimension, ev);
  }

  onLinkClick(linkId: string): void {
    this.activeLinkId = linkId;
  }

  pages(list: number[]): string {
    if (!list?.length) { return '—'; }
    return list.length > 1 ? `${list[0]}–${list[list.length - 1]}` : `${list[0]}`;
  }

  pct(v: number | null | undefined): string {
    return v === null || v === undefined ? '—' : `${Math.round(v * 100)}%`;
  }

  analysisCounts() {
    const ch = this.chapter;
    const base = ch ? ch.passages.filter(p => this.align.matchesFilters(p, this.filters)) : [];
    return { all: base.length, review: base.filter(p => this.passageNeedsReview(p)).length, diff: base.filter(p => this.isDifference(p)).length };
  }

  // ------------------------------------------------------------- coverage
  chapterStats(ch: HeidiChapter | undefined) {
    if (!ch) { return { total: 0, aligned: 0, verified: 0, review: 0, unmatched: 0, scored: 0, rtt: 0, eligible: 0 }; }
    const ids = new Set(ch.passages.map(p => p.passage_id));
    const aligned = ch.passages.filter(p => p.alignment.status === 'aligned').length;
    return {
      total: ch.passages.length,
      aligned,
      verified: ch.passages.filter(p => this.reviews.alignmentVerified(p.passage_id)).length,
      review: ch.passages.filter(p => p.alignment.status === 'needs_review' || p.alignment.status === 'low_confidence').length,
      unmatched: ch.passages.filter(p => this.align.isUnmatched(p)).length,
      scored: ch.passages.filter(p => p.analysis.status === 'automated_provisional').length,
      rtt: this.rtt.completedCount(ids),
      eligible: aligned,
    };
  }

  // ------------------------------------------------------------- heatmap
  get heatmapChapter(): HeidiChapter | undefined {
    return this.chapters.find(c => c.chapter_number === this.heatmapChapterNumber);
  }

  heatmapPassages(): HeidiPassage[] {
    const ch = this.heatmapChapter;
    return ch ? ch.passages.filter(p => this.align.matchesFilters(p, { type: this.heatmapType, alignment: 'all', search: '' })) : [];
  }

  heatDimmed(score: number | null): boolean {
    if (this.heatmapMax === 'all' || score === null) { return false; }
    return score >= Number(this.heatmapMax);
  }

  heatCellTitle(p: HeidiPassage, k: HeidiDimensionKey): string {
    const e = this.eff(p, k);
    return `${p.passage_id} · ${this.align.dimensionLabel(k)}: ${e.score ?? (this.statusText(p, k) || 'no score')} · alignment ${this.pct(p.alignment.confidence)}`;
  }

  openChapterFromHeatmap(ch: HeidiChapter, k?: HeidiDimensionKey): void {
    this.selectChapter(ch.chapter_number);
    if (k) { this.selectDimension(k); }
    this.tab = 'read';
  }

  // ------------------------------------------------------------- queue
  rebuildQueue(): void {
    this.queueCache = this.align.buildQueue(this.chapters);
  }

  get queueItems(): HeidiQueueItem[] {
    let items = this.queueCache;
    if (this.queueChapter !== 'all') { items = items.filter(i => i.chapterNumber === Number(this.queueChapter)); }
    if (this.queueStatus === 'open') { items = items.filter(i => !i.reviewed); }
    if (this.queueStatus === 'done') { items = items.filter(i => i.reviewed); }
    return this.align.sortQueue(this.align.filterQueue(items, this.queueFilter), this.queueSort);
  }

  get queueOpenCount(): number {
    return this.queueCache.filter(i => !i.reviewed).length;
  }

  get queueDoneCount(): number {
    return this.queueCache.filter(i => i.reviewed).length;
  }

  get queueUniquePassages(): number {
    return new Set(this.queueCache.map(i => i.passage.passage_id)).size;
  }

  get queueRttCount(): number {
    return this.queueCache.filter(i => i.issue === 'rtt_disagreement').length;
  }

  queueCount(f: HeidiQueueFilter): number {
    return this.align.filterQueue(this.queueCache, f).length;
  }

  queuePriority(i: HeidiQueueItem): number {
    if (i.issue === 'unmatched' || i.issue === 'low_alignment' || i.issue === 'rtt_disagreement') { return 3; }
    if (i.issue === 'low_semantic' || i.issue === 'cultural_issue' || i.issue === 'omissions') { return 2; }
    return 1;
  }

  priorityLabel(n: number): string {
    return n === 3 ? 'High' : n === 2 ? 'Med' : 'Low';
  }

  focusLabel(i: HeidiQueueItem): string {
    return i.focus === 'alignment' ? 'Alignment' : i.focus === 'rtt' ? 'RTT' : this.dimShort[i.focus];
  }

  // ------------------------------------------------------------- RTT
  rttRecord(p: HeidiPassage): RttRecord | null {
    return this.rtt.get(p.passage_id);
  }

  rttStatus(p: HeidiPassage): string {
    const r = this.rttRecord(p);
    return this.rttLabels[r?.status ?? 'not_run'];
  }

  rttStatusClass(p: HeidiPassage): string {
    const s = this.rttRecord(p)?.status ?? 'not_run';
    return 'hd-rtt--' + s;
  }

  rttEligible(p: HeidiPassage): boolean {
    return !!p.english_text && !!p.german_text &&
      (p.alignment.status === 'aligned' || this.reviews.alignmentVerified(p.passage_id)) &&
      !this.reviews.alignmentRejected(p.passage_id);
  }

  rttDisabledReason(p: HeidiPassage): string | null {
    if (!this.rtt.liveGenerationEnabled) { return 'Live back-translation is disabled for this deployment (no translation endpoint configured).'; }
    if (!p.english_text || !p.german_text) { return 'Unmatched passage — RTT needs both the English translation and the German reference.'; }
    if (!this.rttEligible(p)) { return 'Alignment not yet verified — accept the alignment in the expert review first.'; }
    if (this.eff(p, 'semantic').score === null) { return 'No direct semantic score exists for this passage yet, so an RTT comparison is not possible.'; }
    return null;
  }

  generateRtt(p: HeidiPassage): void {
    if (this.rttDisabledReason(p)) { return; }
    this.rttBusy = true;
    this.rttError = null;
    this.rttExpanded = true;
    const direct = this.eff(p, 'semantic').score;
    this.rtt.generate(p, direct).subscribe({
      next: rec => {
        this.rttBusy = false;
        if (rec.status === 'failed') { this.rttError = rec.error || 'Back-translation failed.'; }
        this.rebuildQueue();
        this.cdr.markForCheck();
      },
      error: e => { this.rttBusy = false; this.rttError = String(e?.message || e); },
    });
  }

  // ------------------------------------------------------------- expert review
  dimReview(k: HeidiDimensionKey) {
    if (!this.reviewDraft) { return null; }
    if (!this.reviewDraft.dimensions[k]) { this.reviewDraft.dimensions[k] = { decision: null, score_override: null, comment: null }; }
    return this.reviewDraft.dimensions[k]!;
  }

  saveReview(): void {
    const p = this.selectedPassage;
    if (!p || !this.reviewDraft) { return; }
    for (const k of Object.keys(this.reviewDraft.dimensions) as HeidiDimensionKey[]) {
      const d = this.reviewDraft.dimensions[k]!;
      if (d.score_override !== null && d.score_override !== undefined && (d.score_override as unknown) !== '') {
        d.score_override = Math.max(0, Math.min(100, Number(d.score_override)));
      } else { d.score_override = null; }
    }
    const c = this.reviewDraft.rtt_corrected_semantic_score as unknown;
    this.reviewDraft.rtt_corrected_semantic_score = c === null || c === undefined || c === '' ? null : Math.max(0, Math.min(100, Number(c)));
    try { localStorage.setItem('heidi_analysis_reviewer_v1', this.reviewerName); } catch { /* ignore */ }
    const saved = this.reviews.save(this.reviewDraft, this.reviewerName);
    if (saved.rtt_inaccurate || saved.rtt_corrected_semantic_score !== null) { this.rtt.markExpertReviewed(p.passage_id); }
    this.reviewDraft = this.reviews.getOrBlank(p.passage_id);
    this.draftSnapshot = this.draftSignature();
    this.reviewSavedAt = saved.reviewed_at;
    this.saveMessage = `Saved by ${saved.reviewer} — stored under heidi_analysis_reviews_v1.`;
    this.rebuildQueue();
  }

  resetReview(): void {
    const p = this.selectedPassage;
    if (!p) { return; }
    this.reviews.clear(p.passage_id);
    this.reviewDraft = this.reviews.blank(p.passage_id);
    this.draftSnapshot = this.draftSignature();
    this.reviewSavedAt = null;
    this.saveMessage = null;
    this.rebuildQueue();
  }

  // ------------------------------------------------------------- exports
  private download(name: string, content: string, mime: string): void {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  private csv(rows: (string | number | null | undefined)[][]): string {
    const esc = (v: string | number | null | undefined) => {
      if (v === null || v === undefined) { return ''; }
      const s = String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    return '﻿' + rows.map(r => r.map(esc).join(',')).join('\n');
  }

  passagesCsv(scope: 'chapter' | 'all'): string {
    const list = scope === 'chapter' ? (this.chapter?.passages || []) : (this.data ? this.dataService.allPassages(this.data) : []);
    const header = ['passage_id', 'chapter_id', 'sequence', 'passage_type', 'speaker', 'alignment_status', 'alignment_confidence', 'bead',
      'source_pages_en', 'source_pages_de', 'analysis_status',
      ...this.dims.flatMap(d => [`${d.key}_score`, `${d.key}_provenance`]),
      'rtt_status', 'rtt_semantic_score', 'rtt_disagreement', 'expert_reviewed', 'english_text', 'german_text'];
    const rows = list.map(p => {
      const r = this.rttRecord(p);
      return [p.passage_id, p.chapter_id, p.sequence, p.passage_type, p.speaker_label, p.alignment.status, p.alignment.confidence, p.alignment.bead,
        p.alignment.source_pages_en.join(' '), p.alignment.source_pages_de.join(' '), p.analysis.status,
        ...this.dims.flatMap(d => { const e = this.eff(p, d.key); return [e.score, e.provenance === 'none' ? this.statusText(p, d.key) : e.provenance]; }),
        r?.status ?? 'not_run', r?.rtt_semantic_score ?? null, r?.disagreement ?? null, this.reviews.isReviewed(p.passage_id) ? 'yes' : 'no',
        p.english_text, p.german_text];
    });
    return this.csv([header, ...rows]);
  }

  exportPassages(scope: 'chapter' | 'all'): void {
    this.exportMenuOpen = false;
    const name = scope === 'chapter' ? `heidi_chapter_${String(this.selectedChapterNumber).padStart(2, '0')}_passages.csv` : 'heidi_all_passages.csv';
    this.download(name, this.passagesCsv(scope), 'text/csv;charset=utf-8');
  }

  exportQueue(): void {
    this.exportMenuOpen = false;
    const rows = this.queueItems.map(i => [i.passage.passage_id, i.chapterNumber, i.issueLabel, i.focus, i.score, i.detail, i.reviewed ? 'yes' : 'no']);
    this.download('heidi_validation_queue.csv', this.csv([['passage_id', 'chapter', 'issue', 'focus', 'score', 'detail', 'reviewed'], ...rows]), 'text/csv;charset=utf-8');
  }

  exportReviews(): void {
    this.exportMenuOpen = false;
    this.download('heidi_expert_reviews.json', this.reviews.exportJson(), 'application/json');
  }

  // ------------------------------------------------------------- global search (reader)
  runGlobalSearch(): void {
    const q = this.filters.search.trim().toLowerCase();
    if (q.length < 3 || !this.data) { this.globalSearchResults = []; return; }
    this.globalSearchResults = this.dataService.allPassages(this.data)
      .filter(p => `${p.english_text || ''}\n${p.german_text || ''}`.toLowerCase().includes(q))
      .slice(0, 50);
  }

  otherChapterHits(): HeidiPassage[] {
    return this.globalSearchResults.filter(p => p.chapter_id !== this.chapter?.chapter_id);
  }

  trackById(_: number, p: HeidiPassage): string {
    return p.passage_id;
  }

  trackByChapter(_: number, c: HeidiChapter): string {
    return c.chapter_id;
  }

  trackByKey(_: number, i: HeidiQueueItem): string {
    return i.key;
  }
}
