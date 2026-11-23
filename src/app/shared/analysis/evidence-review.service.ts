import { Injectable } from '@angular/core';
import { PhraseCategory } from './phrase-categories';

export type EvidenceDecision = 'accept' | 'reject' | 'reclassify' | 'realign' | 'uncertain' | 'revise';
export type ProjectId = 'hamlet' | 'heidi';

/** Expert decision on one evidence item. The machine assessment is copied into `original` and never modified. */
export interface EvidenceReviewRecord {
  evidence_id: string;
  project: ProjectId;
  location: string;
  dimension: string;
  decision: EvidenceDecision;
  corrected_category: PhraseCategory | null;
  corrected_source_phrase: string | null;
  corrected_target_phrase: string | null;
  /** 'revise' only: corrected explanation and the expert's score for the evidence's dimension (0–100). */
  corrected_explanation?: string | null;
  corrected_score?: number | null;
  note: string | null;
  reviewer: string | null;
  reviewed_at: string;
  original: { category: string; source_phrase: string | null; target_phrase: string | null; method: string | null };
}

/**
 * Evidence-level expert decisions, stored per project under separate localStorage keys:
 *   hamlet_evidence_reviews_v1, heidi_evidence_reviews_v1.
 * Passage-level reviews (score overrides etc.) remain in each project's existing review store.
 */
@Injectable({ providedIn: 'root' })
export class EvidenceReviewService {
  private cache: Partial<Record<ProjectId, Record<string, EvidenceReviewRecord>>> = {};

  static storageKey(project: ProjectId): string {
    return `${project}_evidence_reviews_v1`;
  }

  private load(project: ProjectId): Record<string, EvidenceReviewRecord> {
    if (!this.cache[project]) {
      try {
        const raw = localStorage.getItem(EvidenceReviewService.storageKey(project));
        this.cache[project] = raw ? JSON.parse(raw) : {};
      } catch {
        this.cache[project] = {};
      }
    }
    return this.cache[project]!;
  }

  private save(project: ProjectId): void {
    try { localStorage.setItem(EvidenceReviewService.storageKey(project), JSON.stringify(this.load(project))); } catch { /* ignore */ }
  }

  reload(project: ProjectId): void {
    delete this.cache[project];
  }

  get(project: ProjectId, evidenceId: string): EvidenceReviewRecord | null {
    return this.load(project)[evidenceId] ?? null;
  }

  record(rec: Omit<EvidenceReviewRecord, 'reviewed_at'>): EvidenceReviewRecord {
    const full: EvidenceReviewRecord = { ...rec, reviewed_at: new Date().toISOString() };
    this.load(rec.project)[rec.evidence_id] = full;
    this.save(rec.project);
    return full;
  }

  clear(project: ProjectId, evidenceId: string): void {
    delete this.load(project)[evidenceId];
    this.save(project);
  }

  all(project: ProjectId): EvidenceReviewRecord[] {
    return Object.values(this.load(project));
  }

  /** Category to display: an expert reclassification or "uncertain" mark; otherwise the machine category. */
  effectiveCategory(project: ProjectId, evidenceId: string, machine: PhraseCategory): PhraseCategory {
    const r = this.get(project, evidenceId);
    if (!r) { return machine; }
    if ((r.decision === 'reclassify' || r.decision === 'revise') && r.corrected_category) { return r.corrected_category; }
    if (r.decision === 'uncertain') { return 'Uncertain'; }
    return machine;
  }

  isRejected(project: ProjectId, evidenceId: string): boolean {
    return this.get(project, evidenceId)?.decision === 'reject';
  }

  exportJson(project: ProjectId): string {
    return JSON.stringify({ project_id: project, storage_key: EvidenceReviewService.storageKey(project), evidence_reviews: this.load(project) }, null, 2);
  }
}
