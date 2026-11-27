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
  normalizeDimensionKey,
} from './models/heidi.models';
import { HeidiDataService } from './services/heidi-data.service';
import { EffectiveScore, HeidiReviewService } from './services/heidi-review.service';
import { EnRoundTripRecord, HEIDI_SIMILARITY_MODEL, HEIDI_TRANSLATION_MODEL, HeidiRttService, RttRecord } from './services/heidi-rtt.service';
import { categoryTotals, LitSentenceAlignment, SENTENCE_LABEL } from './literary/heidi-literary';
import { HeidiHl, HeidiReaderTextComponent } from './components/heidi-reader-text.component';
import { BertScoreRecord, HeidiRttSectionComponent, rttStatusLabel } from './components/heidi-rtt-section.component';
import { FeedbackSaveEvent, FeedbackSelection, HeidiExpertFeedbackComponent } from './components/heidi-expert-feedback.component';
import { HeidiAssistantComponent } from './components/heidi-assistant.component';
import { AssistantContext } from './services/heidi-assistant.service';
import {
  isAlignmentUsable,
  HeidiAlignmentService,
  HeidiQueueFilter,
  HeidiQueueItem,
  HeidiQueueSort,
  HeidiReaderFilters,
} from './services/heidi-alignment.service';
import { getHeatmapThreshold, formatHumanScore } from '../hamlet-analysis/models/heatmap-config';
import { EvidenceHighlightedTextComponent } from '../hamlet-analysis/components/evidence-highlighted-text/evidence-highlighted-text.component';
import { DimensionSummaryComponent, ScoreProvenance } from '../shared/analysis/dimension-summary.component';
import { RttComparePanelComponent, RttPanelRow, RttPanelText, RttProvenance } from '../shared/analysis/rtt-compare-panel.component';
import { EvidenceDetailComponent, EvidenceVm } from '../shared/analysis/evidence-detail.component';
import { EvidenceReviewService } from '../shared/analysis/evidence-review.service';
import { PhraseCategory as SharedPhraseCategory, locateSpan } from '../shared/analysis/phrase-categories';

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
export type PhraseCategory = SharedPhraseCategory;

/** One inspectable evidence item of a passage for one dimension (paired phrase evidence or single-side term). */
export interface HeidiEvidenceItem {
  id: string;
  category: PhraseCategory;
  machineCategory: PhraseCategory;
  de: HeidiSpan | null;
  en: HeidiSpan | null;
  explanation: string;
  confidence: string | null;
  located: boolean;
  /** Literary evidence that concerns the passage as a whole (scored, not highlighted). */
  passageLevel?: boolean;
  needsReview?: boolean;
  raw?: HeidiPhraseEvidence;
}

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
  if (ev.kind.startsWith('lit:')) {
    // Literary analysis: the assessor's category is used as-is (a low confidence flags review; it does not recategorise).
    const c = ev.kind.slice(4);
    return (c.charAt(0).toUpperCase() + c.slice(1)) as PhraseCategory;
  }
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

const EMPTY_HL: HeidiHl[] = [];

const TOC_DIMS: { key: HeidiDimensionKey; label: string; letter: string }[] = [
  { key: 'semantic', label: 'SEM', letter: 'S' },
  { key: 'emotion', label: 'EMO', letter: 'E' },
  { key: 'imagery', label: 'MET', letter: 'M' },
  { key: 'tone', label: 'TON', letter: 'T' },
  { key: 'voice', label: 'VOI', letter: 'V' },
  { key: 'cultural', label: 'CUL', letter: 'C' },
  { key: 'omissions', label: 'OMI', letter: 'O' },
  { key: 'wordplay', label: 'WPL', letter: 'W' },
];

@Component({
  selector: 'app-heidi-analysis',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, HeidiReaderTextComponent, HeidiRttSectionComponent, HeidiExpertFeedbackComponent, HeidiAssistantComponent],
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
  private evidenceCache = new Map<string, HeidiEvidenceItem[]>();
  private evidenceVmCache: { key: string; vm: EvidenceVm | null } | null = null;
  private rttPanelCache: { key: string; rows: RttPanelRow[] } | null = null;
  selectedEvidenceId: string | null = null;
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
    private evidenceReviews: EvidenceReviewService,
  ) {}

  ngOnInit(): void {
    try { this.reviewerName = localStorage.getItem('heidi_analysis_reviewer_v1') || ''; } catch { /* ignore */ }
    // Optional, precomputed BERTScore results (scripts/heidi_rtt_bertscore.py); absent until that script has been run.
    this.http.get<{ results: Record<string, BertScoreRecord> }>('assets/data/heidi_rtt_bertscore.json').subscribe({
      next: r => { this.bertScores = r?.results || {}; this.cdr.markForCheck(); },
      error: () => { this.bertScores = {}; },
    });
    this.sub = this.dataService.load().subscribe({
      next: d => {
        this.data = d;
        this.chapters = this.dataService.chapters(d);
        // Cached RTT records keep their AI text and similarity; only the difference is re-based on the literary score.
        for (const p of this.dataService.allPassages(d)) {
          if (this.rtt.get(p.passage_id)) { this.rtt.rebase(p.passage_id, p.analysis.dimensions.semantic?.score ?? null); }
        }
        this.loading = false;
        this.rebuildQueue();
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

  selectDimension(k: string | HeidiDimensionKey): void {
    const normKey = normalizeDimensionKey(k);
    this.selectedDimension = normKey;
    this.selectedPhrase = null;
    this.activeLinkId = null;
    this.selectedEvidenceId = null;
    this.selectedSentenceId = null;
    if (normKey !== 'wordplay') { this.tocColorBy = normKey; }
    if (this.viewMode === 'passage') { this.syncUrl(); }
  }

  /** Select a passage and open the inspector WITHOUT moving the reading position or leaving the reader. */
  selectPassage(p: HeidiPassage, focus?: HeidiQueueItem['focus']): void {
    if (this.selectedPassageId !== p.passage_id && !this.confirmDiscardDraft()) { return; }
    if (this.selectedPassageId !== p.passage_id) { this.selectedPhrase = null; this.activeLinkId = null; this.inlineBtOpen = false; this.selectedEvidenceId = null; this.selectedSentenceId = null; }
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
    const means = TOC_DIMS.filter(d => d.key !== 'wordplay').map(d => this.chapterDimMean(ch, d.key)).filter((v): v is number => v !== null);
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
        tooltip: `${this.align.dimensionLabel(d.key)}: ${score === null ? 'N/A (not evaluated or not applicable)' : score + '/100'} (${n}/${ch.passages.length} passages scored)`,
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
    if (TOC_DIMS.some(d => { const s = this.eff(p, d.key).score; return d.key !== 'wordplay' && s !== null && s < 60; })) { return true; }
    if (this.hasUncertainEvidence(p)) { return true; }
    return this.rtt.get(p.passage_id)?.status === 'disagreement';
  }

  /** Any dimension whose only evidence is uncertain, or any Uncertain evidence item (literary analysis). */
  hasUncertainEvidence(p: HeidiPassage, k?: HeidiDimensionKey): boolean {
    const list = k ? [p.analysis.dimensions[k]] : Object.values(p.analysis.dimensions);
    return list.some(a => !!a && (a.status === 'uncertain' || (a.category_counts?.['uncertain'] || 0) > 0));
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
    return this.chapters.reduce((n, c) => n + c.passages.filter(p => p.analysis.status === 'literary_provisional').length, 0);
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
    return p.passage_id.replace(/^ch\d\d-/, '');
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
      case 'verified': return 'hd-align-badge--verified';
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

  /** All eight dimensions are always selectable; unassessed ones (e.g. Wordplay) show N/A rather than being hidden. */
  get tabDims(): HeidiDimensionMeta[] {
    return this.dims;
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
        : p.analysis.status === 'alignment_disputed' ? 'Alignment disputed'
          : p.analysis.status === 'not_applicable_unmatched' ? 'Unmatched' : 'Not evaluated';
    }
    if (a.status === 'not_applicable') { return 'N/A'; }
    if (a.status === 'not_assessed') { return 'Not evaluated'; }
    if (a.status === 'uncertain') { return 'Uncertain'; }
    return '';
  }

  /** Preservation category of a whole passage for one dimension (Hamlet-style label). */
  passageCategory(p: HeidiPassage, k: HeidiDimensionKey): string {
    if (this.selectedPhrase && this.selectedPhrase.passageId === p.passage_id && this.selectedPhrase.dimension === k) {
      return this.selectedPhrase.category;
    }
    const s = this.eff(p, k).score;
    if (s === null) { return this.assessment(p, k)?.status === 'uncertain' ? 'Uncertain' : 'N/A'; }
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
    const out: ReaderSpan[] = [];
    for (const it of this.evidenceItems(p, this.selectedDimension)) {
      if (!it.located || this.evidenceReviews.isRejected('heidi', it.id)) { continue; }
      const s = lang === 'en' ? it.en : it.de;
      if (!s) { continue; } // omissions / additions are highlighted on one side only
      out.push({ start: s.start, end: s.end, status: it.category, isSource: lang === 'de', linkId: it.id, needs_review: it.category === 'Uncertain' || !!it.needsReview });
    }
    out.sort((x, y) => x.start - y.start);
    const dedup = out.filter((s, i) => i === 0 || s.start >= out[i - 1].end);
    this.spanCache.set(key, dedup);
    return dedup;
  }

  /** Stable link/evidence ID (v2 evidence IDs are already group-qualified: chCC-aGGG:dim:id). */
  evLink(p: HeidiPassage, ev: HeidiPhraseEvidence): string {
    // Literary evidence IDs (HEIDI-CHnn-Annn-DIM-nnn) are already globally unique.
    return ev.id.startsWith(p.passage_id + ':') || ev.id.startsWith('HEIDI-') ? ev.id : `${p.passage_id}:${ev.id}`;
  }

  /**
   * Every evidence item for one passage & dimension, validated against the displayed text (code points).
   * Paired phrase evidence links both languages; single-side terms (emotion/tone/voice lists) appear on one side only.
   */
  evidenceItems(p: HeidiPassage, k: HeidiDimensionKey): HeidiEvidenceItem[] {
    const ck = `${p.passage_id}|${k}`;
    const hit = this.evidenceCache.get(ck);
    if (hit) { return hit; }
    const a = this.assessment(p, k);
    const out: HeidiEvidenceItem[] = [];
    if (a && (a.status === 'scored' || a.phrase_evidence.length)) {
      const ok = (s: HeidiSpan | null | undefined, text: string | null) => !s || !!locateSpan(text, s.start, s.end, s.text);
      if (a.phrase_evidence.length) {
        for (const ev of a.phrase_evidence) {
          const id = this.evLink(p, ev);
          const lit = ev.kind.startsWith('lit:');
          const machine: PhraseCategory = !lit && ev.confidence === 'low' ? 'Uncertain' : categorizeEvidence(k, ev);
          const located = lit
            ? ev.span_status !== 'unlocated' && (ev.passage_level || ((!ev.source_phrase || !!ev.de) && (!ev.target_phrase || !!ev.en)))
              && ok(ev.de, p.german_text) && ok(ev.en, p.english_text)
            : ok(ev.de, p.german_text) && ok(ev.en, p.english_text) && !!(ev.de || ev.en);
          out.push({ id, machineCategory: machine, category: this.evidenceReviews.effectiveCategory('heidi', id, machine),
            de: ev.de, en: ev.en, explanation: ev.explanation, confidence: ev.confidence, located,
            passageLevel: !!ev.passage_level, needsReview: !!ev.requires_expert_review, raw: ev });
        }
      } else {
        const shifted = new Set(a.shift_categories || []);
        const base: PhraseCategory = (a.score ?? 0) >= 85 ? 'Preserved' : 'Changed';
        const add = (list: HeidiSpan[], side: 'en' | 'de') => list.forEach((sp, i) => {
          const id = `${p.passage_id}:${k}:${side}-${i + 1}`;
          const machine: PhraseCategory = a.confidence === 'low' ? 'Uncertain' : (sp.category && shifted.has(sp.category) ? 'Changed' : base);
          out.push({ id, machineCategory: machine, category: this.evidenceReviews.effectiveCategory('heidi', id, machine),
            de: side === 'de' ? sp : null, en: side === 'en' ? sp : null,
            explanation: `${this.dimLabel(k)} cue “${sp.text}”${sp.category ? ` (${sp.category})` : ''} — single-side evidence; no paired counterpart recorded.`,
            confidence: a.confidence, located: ok(sp, side === 'en' ? p.english_text : p.german_text) });
        });
        add(a.evidence_de, 'de');
        add(a.evidence_en, 'en');
      }
    }
    this.evidenceCache.set(ck, out);
    return out;
  }

  onSegmentClick(evt: { segment: any }, p: HeidiPassage): void {
    this.selectPassage(p);
    const linkId: string | undefined = evt?.segment?.linkId;
    const a = this.assessment(p, this.selectedDimension);
    const item = linkId ? this.evidenceItems(p, this.selectedDimension).find(x => x.id === linkId) : undefined;
    this.activeLinkId = linkId || null;
    this.selectedEvidenceId = item?.id ?? null;
    this.evidenceExpanded = true;
    this.selectedPhrase = {
      passageId: p.passage_id,
      dimension: this.selectedDimension,
      category: item?.category || (evt?.segment?.status as PhraseCategory) || 'Changed',
      english: item ? item.en?.text ?? null : (evt.segment?.isSource ? null : evt.segment?.text),
      german: item ? item.de?.text ?? null : (evt.segment?.isSource ? evt.segment?.text : null),
      explanation: item?.explanation || a?.explanation || '',
      evidenceId: item?.id || p.passage_id,
      confidence: item?.confidence ?? a?.confidence ?? null,
    };
  }

  selectEvidence(p: HeidiPassage, ev: HeidiPhraseEvidence): void {
    const id = this.evLink(p, ev);
    this.activeLinkId = id;
    this.selectedEvidenceId = id;
  }

  clearEvidence(): void {
    this.selectedEvidenceId = null;
    this.activeLinkId = null;
  }

  stepEvidence(p: HeidiPassage, delta: number): void {
    const items = this.evidenceItems(p, this.selectedDimension);
    if (!items.length) { return; }
    const i = items.findIndex(x => x.id === this.selectedEvidenceId);
    const next = items[i < 0 ? 0 : Math.max(0, Math.min(items.length - 1, i + delta))];
    this.selectedEvidenceId = next.id;
    this.activeLinkId = next.id;
  }

  heidiEvidenceIndex(p: HeidiPassage): { i: number; n: number } {
    const items = this.evidenceItems(p, this.selectedDimension);
    return { i: items.findIndex(x => x.id === this.selectedEvidenceId), n: items.length };
  }

  /** Expert decision saved: recompute effective categories / highlights (the machine assessment is preserved). */
  onEvidenceDecided(): void {
    this.hlCache.clear();
    this.spanCache.clear();
    this.evidenceCache.clear();
    this.evidenceVmCache = null;
  }

  heidiEvidenceVm(p: HeidiPassage): EvidenceVm | null {
    if (!this.selectedEvidenceId) { return null; }
    const rec = this.rttRecord(p);
    const ck = `${p.passage_id}|${this.selectedDimension}|${this.selectedEvidenceId}|${rec?.generated_at}`;
    if (this.evidenceVmCache?.key === ck) { return this.evidenceVmCache.vm; }
    const it = this.evidenceItems(p, this.selectedDimension).find(x => x.id === this.selectedEvidenceId);
    const a = this.assessment(p, this.selectedDimension);
    const vm: EvidenceVm | null = it ? {
      project: 'heidi',
      evidenceId: it.id,
      dimensionKey: this.selectedDimension,
      dimensionLabel: this.dimLabel(this.selectedDimension),
      location: `Part I, Chapter ${Number(p.chapter_id.slice(-2))} · ${p.passage_id} · EN ${(p.source.en_paragraph_ids || []).join(', ') || '—'} · DE ${(p.source.de_paragraph_ids || []).join(', ') || '—'}`,
      sourceLabel: 'German Original (Spyri)',
      sourcePhrase: it.de?.text ?? null,
      translationLabel: 'Human English (Stork)',
      translationPhrase: it.en?.text ?? null,
      backTranslationPhrase: rec?.back_translated_english ?? null,
      category: it.machineCategory,
      directScore: this.eff(p, this.selectedDimension).score,
      rttScore: this.selectedDimension === 'semantic' ? (rec?.rtt_semantic_score ?? null) : null,
      explanation: it.explanation,
      alignmentConfidence: `${p.alignment.confidence_label || '—'} (${this.align.statusLabel(p)})`,
      method: a?.method || null,
      provenance: it.raw?.provenance
        ? `${it.raw.provenance} · evidence confidence ${it.confidence || '—'}`
        : `Machine-generated initial assessment (provisional) · evidence confidence ${it.confidence || '—'}`,
      unlocated: !it.located,
      notice: it.passageLevel ? 'Passage-level evidence: applies to the whole passage, so no phrase is highlighted. It still counts in the rubric score.' : null,
      details: it.raw ? [
        { label: 'Evidence weight', value: String(it.raw.weight ?? '—') },
        { label: 'Span status', value: (it.raw.span_status || '—').replace(/_/g, ' ') },
        { label: 'Sentence alignment', value: it.raw.sentence_alignment_verified === null || it.raw.sentence_alignment_verified === undefined ? '—' : it.raw.sentence_alignment_verified ? 'verified' : 'unverified — check' },
        { label: 'Expert review', value: it.raw.requires_expert_review ? 'Required' : 'Not required' },
      ] : undefined,
    } : null;
    this.evidenceVmCache = { key: ck, vm };
    return vm;
  }

  unlocatedFor(p: HeidiPassage): { dimension: string; side: string; text: string }[] {
    const fromData = this.dataService.unlocatedEvidence(p.passage_id);
    const fromUi = this.evidenceItems(p, this.selectedDimension).filter(x => !x.located)
      .map(x => ({ dimension: this.selectedDimension as string,
        side: x.raw ? (x.raw.source_phrase && !x.de ? 'de' : 'en') : (x.en ? 'en' : 'de'),
        text: x.raw ? (x.raw.source_phrase && !x.de ? x.raw.source_phrase : x.raw.target_phrase || '') || x.id : (x.en || x.de)?.text || x.id }));
    if (p.analysis.status === 'literary_provisional') { return fromUi; }
    return [...fromData.filter(u => u.dimension === this.selectedDimension), ...fromUi];
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
      return `${this.dimLabel(k)}: RTT not evaluated. Heidi's reverse-translation check yields a semantic similarity only; it is not reused for other dimensions and does not validate emotion, imagery, tone or voice.`;
    }
    if (!rec || rec.rtt_semantic_score === null) {
      return 'RTT Not Run — no AI back-translation of the German original exists for this passage yet.';
    }
    return `AI back-translated English compared with Stork's English using ${rec.similarity_model}: ${rec.rtt_semantic_score}/100 vs direct ${rec.direct_semantic_score ?? '—'}/100 (|Δ| ${rec.disagreement ?? '—'}; threshold ${this.rtt.threshold}, not calibrated). This is a reverse-translation consistency check against the human English translation, not an evaluation of a translation of English.`;
  }

  /** Shows the BT English panel and generates the German original → AI English back-translation if needed. */
  toggleInlineBackTranslation(p: HeidiPassage): void {
    this.inlineBtOpen = !this.inlineBtOpen;
    if (this.inlineBtOpen && !this.rtt.get(p.passage_id)?.back_translated_english && !this.rttDisabledReason(p)) {
      this.generateRtt(p);
    }
  }

  // ---------- shared panel adapters ----------

  dimLabel(k: HeidiDimensionKey): string {
    return this.dims.find(d => d.key === k)?.label ?? k;
  }

  heidiRttTexts(p: HeidiPassage): RttPanelText[] {
    return [
      { label: 'Human English', sublabel: 'Stork — comparison reference', text: p.english_text, lang: 'en' },
      { label: 'German Original', sublabel: 'Spyri — sent to the model', text: p.german_text, lang: 'de' },
      { label: 'AI Back-Translated English', text: this.rttRecord(p)?.back_translated_english ?? null, lang: 'en', ai: true },
    ];
  }

  heidiRttPanelRows(p: HeidiPassage): RttPanelRow[] {
    const rec = this.rttRecord(p);
    const key = `${p.passage_id}|${rec?.generated_at}|${rec?.rtt_semantic_score}|${this.reviews.get(p.passage_id)?.reviewed_at}`;
    if (this.rttPanelCache?.key === key) { return this.rttPanelCache.rows; }
    const rows = this.tabDims.map(d => ({
      key: d.key,
      name: d.label,
      direct: this.eff(p, d.key).score,
      rtt: d.key === 'semantic' ? (rec?.rtt_semantic_score ?? null) : null,
      rttMethod: d.key === 'semantic' ? (rec?.similarity_model ?? null) : null,
    }));
    this.rttPanelCache = { key, rows };
    return rows;
  }

  heidiRttProvenance(p: HeidiPassage): RttProvenance {
    const r = this.rttRecord(p);
    return {
      translationModel: r?.translation_model || this.translationModel,
      similarityModel: r?.similarity_model || this.similarityModel,
      generatedAt: r?.generated_at || null,
      source: r?.back_translated_english ? 'generated in this browser (cached)' : null,
    };
  }

  setRttThreshold(v: number): void {
    if (!(v > 0 && v <= 100)) { return; }
    this.rtt.setThreshold(v);
    this.rttPanelCache = null;
    this.rebuildQueue();
  }

  summaryProvenance(p: HeidiPassage): ScoreProvenance {
    const e = this.eff(p, this.selectedDimension);
    if (e.provenance === 'expert_override') { return 'expert_override'; }
    if (e.provenance === 'expert_accepted') { return 'expert_validated'; }
    if (e.score === null) { return 'none'; }
    return 'automated_heuristic';
  }

  summaryProvenanceLabel(p: HeidiPassage): string {
    const e = this.eff(p, this.selectedDimension);
    if (e.score === null) { return this.statusText(p, this.selectedDimension) || 'Not evaluated'; }
    return this.provenanceLabel(e) || 'Machine-Generated Initial Assessment (Provisional)';
  }

  summaryNote(p: HeidiPassage): string | null {
    if (this.align.needsAlignmentReview(p)) { return `${this.align.statusLabel(p)} — scores are withheld until the alignment is verified.`; }
    const a = this.assessment(p, this.selectedDimension);
    if (p.analysis.status !== 'literary_provisional') { return p.analysis.note || 'Not evaluated.'; }
    if (a?.status === 'not_assessed') { return `${this.dimLabel(this.selectedDimension)}: not evaluated for this passage (no evidence recorded; shown as “Not evaluated”, never 0).`; }
    if (a?.status === 'not_applicable') { return `${this.dimLabel(this.selectedDimension)}: N/A — ${a.explanation}`; }
    if (a?.status === 'uncertain') { return `${this.dimLabel(this.selectedDimension)}: uncertain — only uncertain evidence; no score until an expert decides.`; }
    return p.alignment.status === 'verified' ? 'Alignment verified (Chapter 1).' : 'Automatic high-confidence alignment — unreviewed.';
  }

  // ---------- Previous / next passage in the card ----------

  hasAdjacent(p: HeidiPassage, delta: number): boolean {
    const list = this.chapter?.passages || [];
    const i = list.findIndex(x => x.passage_id === p.passage_id);
    return i >= 0 && !!list[i + delta];
  }

  stepCard(delta: number): void {
    const list = this.chapter?.passages || [];
    const i = list.findIndex(x => x.passage_id === this.selectedPassageId);
    const t = list[i + delta];
    if (t) { this.openPassageCard(t); }
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

  // ------------------------------------------------------------- sentence + phrase highlighting (literary analysis)
  selectedSentenceId: string | null = null;
  /** Collapsed by default on narrow screens, where the inspector is an overlay. */
  inspectorCollapsed = typeof window !== 'undefined' && window.innerWidth <= 1024;
  feedbackOpen = false;
  feedbackSelection: FeedbackSelection | null = null;
  proposedCorrection: string | null = null;
  assistantOpen = false;
  assistantCtx: AssistantContext | null = null;
  private hlCache = new Map<string, HeidiHl[]>();
  private bertScores: Record<string, BertScoreRecord> = {};

  get activeIds(): (string | null)[] {
    return [this.activeLinkId];
  }

  /** Sentence layer — Semantic only: every sentence of the passage is in one alignment record. */
  sentenceHl(p: HeidiPassage, lang: 'en' | 'de'): HeidiHl[] {
    if (this.selectedDimension !== 'semantic' || this.align.needsAlignmentReview(p)) { return EMPTY_HL; }
    const key = `${p.passage_id}|s|${lang}`;
    let hit = this.hlCache.get(key);
    if (!hit) {
      hit = [];
      for (const r of p.analysis.sentence_alignments || []) {
        for (const sp of lang === 'de' ? r.source_spans : r.target_spans) {
          hit.push({ start: sp.start, end: sp.end, label: r.classification, id: r.sentence_alignment_id });
        }
      }
      hit.sort((a, b) => a.start - b.start);
      this.hlCache.set(key, hit);
    }
    return hit;
  }

  /** Phrase layer for the selected dimension (located evidence only; expert-rejected evidence hidden). */
  phraseHl(p: HeidiPassage, lang: 'en' | 'de'): HeidiHl[] {
    if (this.align.needsAlignmentReview(p)) { return EMPTY_HL; }
    const key = `${p.passage_id}|p|${this.selectedDimension}|${lang}`;
    let hit = this.hlCache.get(key);
    if (!hit) {
      hit = [];
      for (const it of this.evidenceItems(p, this.selectedDimension)) {
        if (!it.located || this.evidenceReviews.isRejected('heidi', it.id)) { continue; }
        const sp = lang === 'en' ? it.en : it.de;
        if (sp) { hit.push({ start: sp.start, end: sp.end, label: it.category.toLowerCase(), id: it.id }); }
      }
      hit.sort((a, b) => a.start - b.start);
      this.hlCache.set(key, hit);
    }
    return hit;
  }

  /** Click on a highlight: select it, link its counterpart, open the inspector. The reader does not scroll. */
  onPick(p: HeidiPassage, ev: { sentenceId: string | null; phraseId: string | null }): void {
    if (this.selectedPassageId !== p.passage_id) { this.selectPassage(p); }
    this.inspectorOpen = true;
    this.inspectorCollapsed = false;
    this.selectedSentenceId = ev.phraseId ? null : ev.sentenceId;
    this.selectedEvidenceId = ev.phraseId;
    this.activeLinkId = ev.phraseId;
  }

  pickPhrase(p: HeidiPassage, id: string): void {
    this.onPick(p, { sentenceId: null, phraseId: id });
  }

  pickSentence(p: HeidiPassage, sentenceId: string, ev?: Event): void {
    ev?.stopPropagation();
    this.onPick(p, { sentenceId, phraseId: null });
  }

  private sentenceRecord(p: HeidiPassage, id: string | null): LitSentenceAlignment | null {
    return id ? (p.analysis.sentence_alignments || []).find(r => r.sentence_alignment_id === id) ?? null : null;
  }

  /** What the Evidence Inspector shows for the current selection. */
  inspectorItem(p: HeidiPassage): {
    kind: 'phrase' | 'sentence'; id: string; label: string; english: string | null; german: string | null; explanation: string;
    phrases: { id: string; label: string; text: string }[]; needsReview: boolean; confidence: string | null; expert: string | null;
  } | null {
    if (this.selectedEvidenceId) {
      const it = this.evidenceItems(p, this.selectedDimension).find(x => x.id === this.selectedEvidenceId);
      if (!it) { return null; }
      const rev = this.evidenceReviews.get('heidi', it.id);
      return { kind: 'phrase', id: it.id, label: it.category,
        english: it.en?.text ?? it.raw?.target_phrase ?? null, german: it.de?.text ?? it.raw?.source_phrase ?? null,
        explanation: rev?.corrected_explanation || it.explanation, phrases: [], needsReview: !!it.needsReview,
        confidence: it.confidence || (p.alignment.status === 'verified' ? 'High' : 'Medium'),
        expert: rev ? rev.decision + (rev.corrected_category ? ' → ' + rev.corrected_category : '') : null };
    }
    const r = this.sentenceRecord(p, this.selectedSentenceId);
    if (!r) { return null; }
    const items = this.evidenceItems(p, 'semantic').filter(x => r.phrase_evidence_ids.includes(x.id));
    return { kind: 'sentence', id: r.sentence_alignment_id, label: SENTENCE_LABEL[r.classification],
      english: r.target_spans.map(s => s.text).join(' ') || null, german: r.source_spans.map(s => s.text).join(' ') || null,
      explanation: r.basis === 'unassessed' ? 'This sentence has not been individually assessed yet; no classification is assumed.'
        : r.explanation + (r.basis === 'derived' ? ' (Derived from the phrase evidence in this sentence.)' : ''),
      phrases: items.map(x => ({ id: x.id, label: x.category, text: x.de?.text || x.en?.text || x.raw?.source_phrase || x.raw?.target_phrase || '' })),
      confidence: r.confidence || (p.alignment.status === 'verified' ? 'High' : 'Medium'),
      needsReview: r.review_status === 'requires_expert_review', expert: null };
  }

  /** One short line under the score explaining N/A / not evaluated / uncertain (never shown as 0). */
  dimNote(p: HeidiPassage): string | null {
    if (p.analysis.status !== 'literary_provisional') { return null; }
    const a = this.assessment(p, this.selectedDimension);
    if (!a) { return null; }
    if (a.status === 'not_applicable') { return `N/A — ${a.explanation}`; }
    if (a.status === 'not_assessed') { return 'Not evaluated for this passage.'; }
    if (a.status === 'uncertain') { return 'Uncertain — only uncertain evidence; needs expert judgement.'; }
    return null;
  }

  sentenceStats(p: HeidiPassage): { de: number; en: number; groups: number; types: string; assessed: number; derived: number; unassessed: number } | null {
    const recs = p.analysis.sentence_alignments || [];
    if (!recs.length) { return null; }
    const t: Record<string, number> = {};
    recs.forEach(r => t[r.alignment_type] = (t[r.alignment_type] || 0) + 1);
    return {
      de: p.analysis.sentences?.de.length ?? 0, en: p.analysis.sentences?.en.length ?? 0, groups: recs.length,
      types: Object.entries(t).map(([k, v]) => `${v}× ${k}`).join(', '),
      assessed: recs.filter(r => r.basis === 'assessed').length, derived: recs.filter(r => r.basis === 'derived').length,
      unassessed: recs.filter(r => r.basis === 'unassessed').length,
    };
  }

  bertScore(p: HeidiPassage): BertScoreRecord | null {
    return this.bertScores[p.passage_id] ?? null;
  }

  // ------------------------------------------------------------- Expert Feedback drawer
  currentAssessmentText(): string {
    const p = this.selectedPassage;
    if (!p) { return '—'; }
    const it = this.inspectorItem(p);
    const st = this.statusText(p, this.selectedDimension);
    const base = st || (this.eff(p, this.selectedDimension).score === null ? 'Not evaluated' : 'Evaluated');
    return it ? `${it.label} (selected ${it.kind})` : base;
  }

  openFeedback(): void {
    const p = this.selectedPassage;
    if (!p) { return; }
    if (!this.reviewDraft || this.reviewDraft.passage_id !== p.passage_id) {
      this.reviewDraft = this.reviews.getOrBlank(p.passage_id);
      this.draftSnapshot = this.draftSignature();
    }
    const it = this.inspectorItem(p);
    this.feedbackSelection = it ? { kind: it.kind, id: it.id, label: it.label, german: it.german, english: it.english, explanation: it.explanation } : null;
    this.assistantOpen = false;
    this.feedbackOpen = true;
  }

  closeFeedback(): void {
    this.feedbackOpen = false;
    this.proposedCorrection = null;
  }

  onFeedbackSave(ev: FeedbackSaveEvent): void {
    const p = this.selectedPassage;
    if (!p) { return; }
    this.reviewDraft = ev.review;
    this.reviewerName = ev.reviewer;
    this.saveReview();
    const dr = ev.review.dimensions[this.selectedDimension];
    // A phrase-level decision is also recorded against the evidence item (machine result preserved).
    if (ev.selection?.kind === 'phrase' && dr) {
      const it = this.evidenceItems(p, this.selectedDimension).find(x => x.id === ev.selection!.id);
      if (it) {
        this.evidenceReviews.record({
          evidence_id: it.id, project: 'heidi', location: `${p.passage_id}`, dimension: this.selectedDimension,
          decision: dr.decision === 'reject' ? 'reject' : dr.revised_classification || dr.decision === 'revise' ? 'revise' : 'accept',
          corrected_category: dr.revised_classification ?? null, corrected_source_phrase: null,
          corrected_target_phrase: dr.corrected_translation ?? null, corrected_explanation: dr.comment ?? null,
          corrected_score: dr.score_override ?? null, note: dr.comment ?? null, reviewer: ev.reviewer || null,
          original: { category: it.machineCategory, source_phrase: it.de?.text ?? it.raw?.source_phrase ?? null,
            target_phrase: it.en?.text ?? it.raw?.target_phrase ?? null, method: this.assessment(p, this.selectedDimension)?.method ?? null },
        });
        this.onEvidenceDecided();
      }
    }
    this.feedbackOpen = false;
    this.proposedCorrection = null;
  }

  // ------------------------------------------------------------- Ask Assistant AI
  openAssistant(): void {
    const p = this.selectedPassage;
    if (!p) { return; }
    const it = this.inspectorItem(p);
    const dr = this.reviews.get(p.passage_id)?.dimensions?.[this.selectedDimension];
    this.assistantCtx = {
      passage_id: p.passage_id,
      chapter: Number(p.chapter_id.slice(-2)),
      german_original: p.german_text,
      human_english: p.english_text,
      translator: 'Elisabeth P. Stork',
      dimension: this.dimLabel(this.selectedDimension),
      selection: it ? { kind: it.kind, german: it.german, english: it.english } : null,
      classification: it?.label ?? null,
      score: this.eff(p, this.selectedDimension).score,
      evidence: this.evidenceItems(p, this.selectedDimension).slice(0, 40).map(x => ({
        category: x.category, german: x.de?.text ?? x.raw?.source_phrase ?? null, english: x.en?.text ?? x.raw?.target_phrase ?? null, explanation: x.explanation })),
      expert_feedback: dr?.comment || null,
    };
    this.feedbackOpen = false;
    this.assistantOpen = true;
  }

  /** "Use as proposed correction": opens Expert Feedback prefilled; nothing is stored until the scholar saves. */
  onAssistantUse(text: string): void {
    this.proposedCorrection = text;
    this.assistantOpen = false;
    this.openFeedback();
  }

  /** "Attach to expert feedback": adds the proposal to the draft justification (unsaved). */
  onAssistantAttach(text: string): void {
    const p = this.selectedPassage;
    if (!p) { return; }
    if (!this.reviewDraft || this.reviewDraft.passage_id !== p.passage_id) { this.reviewDraft = this.reviews.getOrBlank(p.passage_id); }
    const dr = this.dimReview(this.selectedDimension)!;
    dr.comment = `${dr.comment ? dr.comment + '\n\n' : ''}AI assistant proposal (not the published translation): ${text}`;
    this.assistantOpen = false;
    this.openFeedback();
  }

  // ------------------------------------------------------------- literary analysis summaries
  /** Evidence category counts for one passage (selected dimension, or all dimensions). */
  dimCounts(p: HeidiPassage, k?: HeidiDimensionKey): Record<PhraseCategory, number> {
    return categoryTotals(p.analysis, k);
  }

  chapterDimCounts(ch: HeidiChapter | undefined, k: HeidiDimensionKey): Record<PhraseCategory, number> {
    const out: Record<PhraseCategory, number> = { Preserved: 0, Changed: 0, Lost: 0, Added: 0, Uncertain: 0 };
    for (const p of ch?.passages || []) {
      const c = categoryTotals(p.analysis, k);
      (Object.keys(out) as PhraseCategory[]).forEach(key => out[key] += c[key]);
    }
    return out;
  }

  /** Selector badge for one dimension: a passage (card) or a chapter mean (reader). Missing values are never 0. */
  tabBadge(p: HeidiPassage | null, k: HeidiDimensionKey): { text: string; score: number | null; review: boolean; title: string } {
    if (p) {
      const score = this.eff(p, k).score;
      const st = score === null ? (this.statusText(p, k) || 'Not evaluated') : String(score);
      const review = this.hasUncertainEvidence(p, k) || (p.analysis.dimensions[k]?.phrase_evidence || []).some(e => e.requires_expert_review);
      return { text: st, score, review, title: `${this.dimLabel(k)}: ${st}${review ? ' · evidence needs expert review' : ''}` };
    }
    const ch = this.chapter;
    const score = ch ? this.chapterDimMean(ch, k) : null;
    const n = ch ? ch.passages.filter(x => this.eff(x, k).score !== null).length : 0;
    const review = !!ch && ch.passages.some(x => this.hasUncertainEvidence(x, k));
    return { text: score === null ? 'N/A' : score.toFixed(1), score, review,
      title: `${this.dimLabel(k)} — chapter mean of ${n} evaluated passage(s); N/A and not-evaluated passages are excluded, never counted as 0.` };
  }

  /** Coverage of the literary analysis for one chapter (sidebar). */
  chapterCoverage(ch: HeidiChapter): { analysed: number; total: number; pending: number; disputed: number } {
    const total = ch.passages.length;
    const analysed = ch.passages.filter(p => p.analysis.status === 'literary_provisional').length;
    const disputed = ch.passages.filter(p => p.analysis.status === 'alignment_disputed').length;
    return { analysed, total, disputed, pending: total - analysed - disputed };
  }

  passageStatusShort(p: HeidiPassage): string {
    if (this.reviews.isReviewed(p.passage_id)) { return 'Reviewed'; }
    switch (p.analysis.status) {
      case 'literary_provisional': return this.passageNeedsReview(p) ? 'Needs review' : 'Analysed';
      case 'alignment_disputed': return 'Alignment disputed';
      case 'blocked_alignment_review': return 'Awaiting alignment';
      case 'not_applicable_unmatched': return 'Unmatched';
      default: return 'Not evaluated';
    }
  }

  readonly catKeys: PhraseCategory[] = ['Preserved', 'Changed', 'Lost', 'Added', 'Uncertain'];

  // ------------------------------------------------------------- RTT workflow B (Human English → AI German → AI English)
  enRttBusy = false;
  enRtt(p: HeidiPassage): EnRoundTripRecord | null {
    return this.rtt.getEnRoundTrip(p.passage_id);
  }

  runEnRtt(p: HeidiPassage): void {
    if (!p.english_text || this.enRttBusy) { return; }
    this.enRttBusy = true;
    this.rtt.generateEnglishRoundTrip(p).subscribe({
      next: () => { this.enRttBusy = false; this.cdr.markForCheck(); },
      error: () => { this.enRttBusy = false; this.cdr.markForCheck(); },
    });
  }

  analysisCounts() {
    const ch = this.chapter;
    const base = ch ? ch.passages.filter(p => this.align.matchesFilters(p, this.filters)) : [];
    return { all: base.length, review: base.filter(p => this.passageNeedsReview(p)).length, diff: base.filter(p => this.isDifference(p)).length };
  }

  // ------------------------------------------------------------- chapter RTT batch
  chapterRttBusy = false;
  chapterRttProgress: { done: number; total: number; failed: number; stopped: string | null } | null = null;
  private chapterRttCancel = false;

  /** Passages of a chapter that can be back-translated and have no completed RTT yet. */
  chapterRttPending(ch: HeidiChapter | undefined): HeidiPassage[] {
    return (ch?.passages || []).filter(p => !this.rttDisabledReason(p) && this.rttRecord(p)?.rtt_semantic_score == null);
  }

  /**
   * Generate the German original → AI English back-translation for every eligible passage of the chapter,
   * one request at a time (cached per passage). Stops at the first service error (e.g. the free daily quota).
   */
  async runChapterRtt(ch: HeidiChapter | undefined): Promise<void> {
    const todo = this.chapterRttPending(ch);
    if (!todo.length || this.chapterRttBusy) { return; }
    this.chapterRttBusy = true;
    this.chapterRttCancel = false;
    this.chapterRttProgress = { done: 0, total: todo.length, failed: 0, stopped: null };
    for (const p of todo) {
      if (this.chapterRttCancel) { this.chapterRttProgress.stopped = 'Stopped by the reviewer.'; break; }
      const rec = await new Promise<any>(resolve => this.rtt.generate(p, this.eff(p, 'semantic').score)
        .subscribe({ next: resolve, error: e => resolve({ status: 'failed', error: String(e?.message || e) }) }));
      if (rec.status === 'failed') {
        this.chapterRttProgress.failed++;
        this.chapterRttProgress.stopped = `Stopped: ${rec.error || 'back-translation failed'}`;
        break;
      }
      this.chapterRttProgress.done++;
      this.cdr.markForCheck();
    }
    this.chapterRttBusy = false;
    this.rttPanelCache = null;
    this.rebuildQueue();
    this.cdr.markForCheck();
  }

  cancelChapterRtt(): void {
    this.chapterRttCancel = true;
  }

  // ------------------------------------------------------------- coverage
  chapterStats(ch: HeidiChapter | undefined) {
    if (!ch) { return { total: 0, aligned: 0, verified: 0, review: 0, unmatched: 0, scored: 0, rtt: 0, eligible: 0 }; }
    const ids = new Set(ch.passages.map(p => p.passage_id));
    const aligned = ch.passages.filter(p => isAlignmentUsable(p)).length;
    return {
      total: ch.passages.length,
      aligned,
      verified: ch.passages.filter(p => this.reviews.alignmentVerified(p.passage_id)).length,
      review: ch.passages.filter(p => p.alignment.status === 'needs_review' || p.alignment.status === 'low_confidence').length,
      unmatched: ch.passages.filter(p => this.align.isUnmatched(p)).length,
      scored: ch.passages.filter(p => p.analysis.status === 'literary_provisional').length,
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
    return rttStatusLabel(this.rttRecord(p));
  }

  rttStatusClass(p: HeidiPassage): string {
    const s = this.rttRecord(p)?.status ?? 'not_run';
    return 'hd-rtt--' + s;
  }

  rttEligible(p: HeidiPassage): boolean {
    return !!p.english_text && !!p.german_text &&
      (isAlignmentUsable(p) || this.reviews.alignmentVerified(p.passage_id)) &&
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
        rec = this.rtt.rebase(p.passage_id, direct) ?? rec;
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
