import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnChanges,
  SimpleChanges
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import {
  AnalysisScene,
  AnalysisDialogue,
  DIMENSION_DEFINITIONS,
  VERSION_DEFINITIONS,
  DimensionReview
} from '../../models/hamlet-analysis-v15.models';
import { ExpertReviewService } from '../../services/expert-review.service';
import { EvidenceHighlightedTextComponent, codePointLength } from '../evidence-highlighted-text/evidence-highlighted-text.component';

@Component({
  selector: 'app-scene-dialogue-table',
  standalone: true,
  imports: [CommonModule, FormsModule, EvidenceHighlightedTextComponent],
  templateUrl: './scene-dialogue-table.component.html',
  styleUrls: ['./scene-dialogue-table.component.scss']
})
export class SceneDialogueTableComponent implements OnInit, OnChanges {
  @Input() scene!: AnalysisScene;
  @Input() dimensions: Array<{ key: string; name: string; short: string }> = DIMENSION_DEFINITIONS;
  @Input() versions: Array<{ key: string; name: string; short: string }> = VERSION_DEFINITIONS;
  @Input() highlightedDialogueId: string | null = null;
  @Input() autoExpandDialogueId: string | null = null;

  @Output() inspectDialogue = new EventEmitter<string>();

  expandedDialogueIds = new Set<string>();
  dialogueLimit = 10;

  // View state per dialogue ID
  dialogueViewMode: Record<string, 'matrix' | 'chart'> = {};
  dialogueFocusVersion: Record<string, 'all' | 'human_german' | 'ai_german' | 'context_ai_german'> = {};
  dialogueActiveDim: Record<string, string> = {};
  dialogueActiveVer: Record<string, string> = {};
  dialogueEvidenceIdx: Record<string, number> = {};
  copiedFeedback: Record<string, string | null> = {};

  // Review draft state per dialogue ID
  reviewDrafts: Record<
    string,
    {
      decision: 'Accept' | 'Reject' | 'Needs Revision' | null;
      scoreOverride: number | null;
      comment: string;
      reviewer: string;
      successMsg?: string;
    }
  > = {};

  constructor(
    private sanitizer: DomSanitizer,
    private expertReviewService: ExpertReviewService
  ) {}

  ngOnInit(): void {
    if (this.autoExpandDialogueId) {
      this.expandedDialogueIds.add(this.autoExpandDialogueId);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['autoExpandDialogueId'] && this.autoExpandDialogueId) {
      this.expandedDialogueIds.add(this.autoExpandDialogueId);
    }
  }

  // --- Pagination ---
  getDisplayedDialogues(): AnalysisDialogue[] {
    if (!this.scene?.dialogues) return [];
    return this.scene.dialogues.slice(0, this.dialogueLimit);
  }

  showMoreDialogues(): void {
    if (!this.scene?.dialogues) return;
    this.dialogueLimit = Math.min(this.scene.dialogues.length, this.dialogueLimit + 10);
  }

  showAllDialogues(): void {
    if (!this.scene?.dialogues) return;
    this.dialogueLimit = this.scene.dialogues.length;
  }

  collapseDialogues(): void {
    this.dialogueLimit = 10;
  }

  getSceneAnalyzedCount(): number {
    if (!this.scene?.dialogues) return 0;
    if (this.scene.analyzed_count !== undefined) return this.scene.analyzed_count;
    return this.scene.dialogues.filter((d) => !!d && !!d.analysis && Object.keys(d.analysis).length > 0).length;
  }

  // --- Dialogue Expansion ---
  isDialogueExpanded(dialogueId: string): boolean {
    return this.expandedDialogueIds.has(dialogueId);
  }

  toggleDialogue(dialogueId: string): void {
    if (this.expandedDialogueIds.has(dialogueId)) {
      this.expandedDialogueIds.delete(dialogueId);
    } else {
      this.expandedDialogueIds.add(dialogueId);
      if (!this.dialogueActiveDim[dialogueId]) {
        this.dialogueActiveDim[dialogueId] = 'semantic';
      }
      if (!this.dialogueActiveVer[dialogueId]) {
        this.dialogueActiveVer[dialogueId] = 'human_german';
      }
      if (!this.dialogueViewMode[dialogueId]) {
        this.dialogueViewMode[dialogueId] = 'matrix';
      }
      if (!this.dialogueFocusVersion[dialogueId]) {
        this.dialogueFocusVersion[dialogueId] = 'all';
      }
      this.initReviewDraft(dialogueId);
    }
  }

  getDialogueShortId(fullId: string): string {
    if (!fullId) return '';
    const parts = fullId.split('-');
    return parts[parts.length - 1] || fullId;
  }

  // --- Dialogue Composite Scores ---
  getDialogueScore(d: AnalysisDialogue, verKey: string): number | null {
    const verObj = d.analysis?.[verKey];
    if (!verObj) return null;

    let sum = 0;
    let count = 0;

    for (const dim of this.dimensions) {
      const ana = verObj[dim.key];
      if (ana && ana.applicable && ana.score !== null && ana.score !== undefined && !isNaN(ana.score)) {
        let sc = Number(ana.score);
        const review = d.expert_review?.dimension_reviews?.[verKey]?.[dim.key];
        if (review && review.score_override !== null && review.score_override !== undefined && !isNaN(review.score_override)) {
          sc = Number(review.score_override);
        }
        sum += sc;
        count++;
      }
    }

    if (count === 0) return null;
    return Math.round((sum / count) * 10) / 10;
  }

  getDialogueSpread(d: AnalysisDialogue): string {
    const h = this.getDialogueScore(d, 'human_german');
    const a = this.getDialogueScore(d, 'ai_german');
    const c = this.getDialogueScore(d, 'context_ai_german');
    const valid = [h, a, c].filter((v): v is number => v !== null && !isNaN(v));
    if (valid.length < 2) return '—';
    const spread = Math.round((Math.max(...valid) - Math.min(...valid)) * 10) / 10;
    return spread.toString();
  }

  getDialogueComparisonSvg(d: AnalysisDialogue, minVal = 60, maxVal = 100, width = 130): SafeHtml {
    const h = this.getDialogueScore(d, 'human_german');
    const a = this.getDialogueScore(d, 'ai_german');
    const c = this.getDialogueScore(d, 'context_ai_german');

    const clamp = (v: number) => Math.max(minVal, Math.min(maxVal, v));
    const px = (v: number) => Math.round(Math.max(0, Math.min(width, (clamp(v) - minVal) / (maxVal - minVal) * width)) * 10) / 10;
    
    const valid = [h, a, c].filter((v): v is number => v !== null && !isNaN(v));
    const tick = width / 2;
    if (valid.length === 0) {
      const rawEmpty = `<svg width="${width}" height="22" viewBox="0 0 ${width} 22" role="img" aria-label="No data">
        <line x1="0" y1="11" x2="${width}" y2="11" stroke="#E2E8F0" stroke-width="1"></line>
        <text x="${tick}" y="15" text-anchor="middle" font-size="10" fill="#94A3B8">—</text>
      </svg>`;
      return this.sanitizer.bypassSecurityTrustHtml(rawEmpty);
    }

    const minS = Math.min(...valid);
    const maxS = Math.max(...valid);
    const minX = px(minS);
    const maxX = px(maxS);
    const hasH = h !== null && !isNaN(h);
    const hasA = a !== null && !isNaN(a);
    const hasC = c !== null && !isNaN(c);
    const hX = hasH ? px(h!) : -99;
    const aX = hasA ? px(a!) - 3 : -99;
    const cX = hasC ? px(c!) : -99;
    const cY = 17;
    const cPts = `${cX},${cY - 3.5} ${cX + 3.5},${cY} ${cX},${cY + 3.5} ${cX - 3.5},${cY}`;
    const spread = Math.round((maxS - minS) * 10) / 10;
    const label = `Human: ${h ?? 'N/A'}, AI: ${a ?? 'N/A'}, Context AI: ${c ?? 'N/A'} (Spread: ${spread})`;

    const raw = `<svg width="${width}" height="22" viewBox="0 0 ${width} 22" role="img" aria-label="${label}" style="display:block; overflow:visible">
      <title>${label}</title>
      <line x1="0" y1="11" x2="${width}" y2="11" stroke="#D8DCE3" stroke-width="1"></line>
      <line x1="${tick}" y1="7" x2="${tick}" y2="15" stroke="#CBD5E1" stroke-width="1"></line>
      <line x1="${minX}" y1="11" x2="${maxX}" y2="11" stroke="#9AA6BA" stroke-width="3" stroke-linecap="round"></line>
      ${hasH ? `<circle cx="${hX}" cy="5" r="3.5" fill="#B8500A" stroke="#FFFFFF" stroke-width="1"></circle>` : ''}
      ${hasA ? `<rect x="${aX}" y="8" width="6" height="6" fill="#384152" stroke="#FFFFFF" stroke-width="1"></rect>` : ''}
      ${hasC ? `<polygon points="${cPts}" fill="#2563eb" stroke="#FFFFFF" stroke-width="1"></polygon>` : ''}
    </svg>`;
    return this.sanitizer.bypassSecurityTrustHtml(raw);
  }

  // --- Dimension-Level Dialogue Data ---
  getDimScore(d: AnalysisDialogue, verKey: string, dimKey: string): number | null {
    const ana = d.analysis?.[verKey]?.[dimKey];
    if (!ana || !ana.applicable || ana.score === null || ana.score === undefined || isNaN(ana.score)) {
      return null;
    }
    const review = d.expert_review?.dimension_reviews?.[verKey]?.[dimKey];
    if (review && review.score_override !== null && review.score_override !== undefined && !isNaN(review.score_override)) {
      return Number(review.score_override);
    }
    return Number(ana.score);
  }

  getDimOriginalScore(d: AnalysisDialogue, verKey: string, dimKey: string): number | null {
    const ana = d.analysis?.[verKey]?.[dimKey];
    if (!ana || !ana.applicable || ana.score === null || ana.score === undefined || isNaN(ana.score)) {
      return null;
    }
    return Number(ana.score);
  }

  hasDimOverride(d: AnalysisDialogue, verKey: string, dimKey: string): boolean {
    const review = d.expert_review?.dimension_reviews?.[verKey]?.[dimKey];
    return !!(review && review.score_override !== null && review.score_override !== undefined);
  }

  getDimConfidence(d: AnalysisDialogue, verKey: string, dimKey: string): string {
    const conf = d.analysis?.[verKey]?.[dimKey]?.confidence;
    if (conf !== undefined && conf !== null) {
      return `${Math.round(conf * 100)}%`;
    }
    return 'N/A';
  }

  getDimStatus(d: AnalysisDialogue, verKey: string, dimKey: string): string {
    const ana = d.analysis?.[verKey]?.[dimKey];
    if (!ana || !ana.applicable) return 'Not Applicable';
    return ana.status || 'Preserved';
  }

  getDimSpread(d: AnalysisDialogue, dimKey: string): string {
    const h = this.getDimScore(d, 'human_german', dimKey);
    const a = this.getDimScore(d, 'ai_german', dimKey);
    const c = this.getDimScore(d, 'context_ai_german', dimKey);
    const valid = [h, a, c].filter((v): v is number => v !== null && !isNaN(v));
    if (valid.length < 2) return '—';
    return (Math.round((Math.max(...valid) - Math.min(...valid)) * 10) / 10).toString();
  }

  getScoreClass(val: number | null | undefined): string {
    if (val === null || val === undefined || isNaN(val)) return 'score-cell-na';
    if (val < 60) return 'score-band-1';
    if (val < 85) return 'score-band-2';
    if (val < 93) return 'score-band-3';
    if (val < 97) return 'score-band-4';
    return 'score-band-5';
  }

  formatScore(val: number | null | undefined): string {
    if (val === null || val === undefined || isNaN(val)) return '—';
    return (Math.round(val * 10) / 10).toString();
  }

  // --- Flags & Verification ---
  isDialogueFlaggedAny(d: AnalysisDialogue): boolean {
    if (!d.analysis) return false;
    for (const v of this.versions) {
      const verObj = d.analysis[v.key];
      if (!verObj) continue;
      for (const dim of this.dimensions) {
        const ana = verObj[dim.key];
        if (!ana || !ana.applicable) continue;
        if (ana.needs_review) return true;
        if (ana.confidence !== null && ana.confidence !== undefined && ana.confidence < 0.70) return true;
        if (ana.score !== null && ana.score !== undefined && ana.score < 70) return true;
        if (ana.evidence && ana.evidence.some((e) => e.valid === false || (e.span_validation && !e.span_validation.valid))) return true;
      }
    }
    return false;
  }

  getDialogueFlagCount(d: AnalysisDialogue): number {
    let count = 0;
    if (!d.analysis) return 0;
    for (const v of this.versions) {
      const verObj = d.analysis[v.key];
      if (!verObj) continue;
      for (const dim of this.dimensions) {
        const ana = verObj[dim.key];
        if (!ana || !ana.applicable) continue;
        if (ana.needs_review) count++;
        if (ana.confidence !== null && ana.confidence !== undefined && ana.confidence < 0.70) count++;
        if (ana.score !== null && ana.score !== undefined && ana.score < 70) count++;
        if (ana.evidence && ana.evidence.some((e) => e.valid === false || (e.span_validation && !e.span_validation.valid))) count++;
      }
    }
    return count;
  }

  getDialogueInvalidSpanCount(d: AnalysisDialogue): number {
    let count = 0;
    if (!d.analysis) return 0;
    for (const v of this.versions) {
      const verObj = d.analysis[v.key];
      if (!verObj) continue;
      for (const dim of this.dimensions) {
        const ana = verObj[dim.key];
        if (ana?.evidence) {
          count += ana.evidence.filter((e) => e.valid === false || (e.span_validation && !e.span_validation.valid)).length;
        }
      }
    }
    return count;
  }

  // --- Evidence Inspector Navigation ---
  getActiveDimension(dialogueId: string): string {
    return this.dialogueActiveDim[dialogueId] || 'semantic';
  }

  setActiveDimension(dialogueId: string, dimKey: string): void {
    this.dialogueActiveDim[dialogueId] = dimKey;
    this.dialogueEvidenceIdx[dialogueId] = 0;
  }

  getActiveVersion(dialogueId: string): string {
    return this.dialogueActiveVer[dialogueId] || 'human_german';
  }

  setActiveVersion(dialogueId: string, verKey: string): void {
    this.dialogueActiveVer[dialogueId] = verKey;
    this.dialogueEvidenceIdx[dialogueId] = 0;
    this.initReviewDraft(dialogueId);
  }

  getEvidenceList(d: AnalysisDialogue, verKey: string, dimKey: string): any[] {
    return d.analysis?.[verKey]?.[dimKey]?.evidence || [];
  }

  getCurrentEvidenceIndex(dialogueId: string): number {
    return this.dialogueEvidenceIdx[dialogueId] || 0;
  }

  prevEvidence(dialogueId: string, total: number): void {
    const cur = this.dialogueEvidenceIdx[dialogueId] || 0;
    this.dialogueEvidenceIdx[dialogueId] = cur > 0 ? cur - 1 : total - 1;
  }

  nextEvidence(dialogueId: string, total: number): void {
    const cur = this.dialogueEvidenceIdx[dialogueId] || 0;
    this.dialogueEvidenceIdx[dialogueId] = cur < total - 1 ? cur + 1 : 0;
  }

  // Highlight Spans calculation for dialogue parallel text
  getSourceSpans(d: AnalysisDialogue, dimKey: string): any[] {
    const ver = this.getActiveVersion(d.dialogue_id);
    const evList = this.getEvidenceList(d, ver, dimKey);
    const spans: any[] = [];
    evList.forEach((ev, i) => {
      if (ev.source_span && (ev.valid !== false && (!ev.span_validation || ev.span_validation.source_valid !== false))) {
        spans.push({
          start: ev.source_span.start,
          end: ev.source_span.end,
          status: ev.status || 'Preserved',
          isSource: true,
          evidence: ev,
          linkId: `ev-${d.dialogue_id}-${i}`
        });
      }
    });
    return spans;
  }

  getTargetSpans(d: AnalysisDialogue, verKey: string, dimKey: string): any[] {
    const evList = this.getEvidenceList(d, verKey, dimKey);
    const spans: any[] = [];
    evList.forEach((ev, i) => {
      if (ev.target_span && (ev.valid !== false && (!ev.span_validation || ev.span_validation.target_valid !== false))) {
        spans.push({
          start: ev.target_span.start,
          end: ev.target_span.end,
          status: ev.status || 'Preserved',
          isSource: false,
          evidence: ev,
          linkId: `ev-${d.dialogue_id}-${i}`
        });
      }
    });
    return spans;
  }

  // --- Copy Text Action ---
  copyText(text: string | undefined, label: string, dialogueId: string): void {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      this.copiedFeedback[dialogueId] = `Copied ${label}!`;
      setTimeout(() => {
        this.copiedFeedback[dialogueId] = null;
      }, 2000);
    });
  }

  // --- Review Actions ---
  private initReviewDraft(dialogueId: string): void {
    if (!this.reviewDrafts[dialogueId]) {
      this.reviewDrafts[dialogueId] = {
        decision: null,
        scoreOverride: null,
        comment: '',
        reviewer: 'Shakespeare Scholar'
      };
    }
  }

  saveReview(d: AnalysisDialogue): void {
    const draft = this.reviewDrafts[d.dialogue_id];
    if (!draft) return;
    const ver = this.getActiveVersion(d.dialogue_id);
    const dim = this.getActiveDimension(d.dialogue_id);

    const review: DimensionReview = {
      decision: draft.decision,
      score_override: draft.scoreOverride !== null && draft.scoreOverride !== undefined ? Number(draft.scoreOverride) : null,
      comment: draft.comment || null,
      reviewer: draft.reviewer || 'Scholar',
      reviewed_at: new Date().toISOString()
    };

    this.expertReviewService.saveReview(d, ver, dim, review);
    draft.successMsg = 'Expert review saved to local audit trail!';
    setTimeout(() => {
      draft.successMsg = undefined;
    }, 3000);
  }

  getProvenanceLabel(d: AnalysisDialogue, verKey: string, dimKey: string): string {
    const hasOver = this.hasDimOverride(d, verKey, dimKey);
    if (hasOver) return 'Expert-reviewed (Override)';
    const ana = d.analysis?.[verKey]?.[dimKey];
    if (!ana) return 'Unscored';
    if (!ana.applicable) return 'Not Applicable';
    if (ana.needs_review) return 'Provisional (Flagged)';
    return 'Model-assisted (V1.5)';
  }

  trackByDialogueId(index: number, dlg: AnalysisDialogue): string {
    return dlg.dialogue_id || index.toString();
  }
}
