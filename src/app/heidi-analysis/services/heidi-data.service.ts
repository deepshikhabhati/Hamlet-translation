import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map, shareReplay, tap } from 'rxjs/operators';
import {
  HEIDI_ALIGNMENT_URL,
  HeidiChapter,
  HeidiDataset,
  HeidiPassage,
} from '../models/heidi.models';
import { HEIDI_JOIN, ScoredGroup, SideBySideFile, structureOf } from '../scoring/heidi-scoring';
import { HEIDI_LITERARY_SCHEMA, HEIDI_LITERARY_URL, LIT_METHOD, LitFile, mapPassageAnalysis } from '../literary/heidi-literary';

export type { SideBySideFile, SideBySideChapter, SideBySideRow, SideBySideParagraph } from '../scoring/heidi-scoring';

const CONFIDENCE_ORDINAL: Record<string, number> = { verified: 1, high: 0.8, medium: 0.5, low: 0.2, unmatched: 0 };
export { HEIDI_JOIN };

/**
 * Builds the Heidi dataset from two files:
 *  - heidi_part1_side_by_side.json (curated, immutable): ALL texts, chapter / group / paragraph IDs, alignment confidence;
 *  - heidi_literary_analysis.json (generated outside Angular by scripts/heidi_literary_pipeline.py): eight-dimension
 *    phrase-level evidence and rubric scores. It contains no passage text; spans are validated against the text here.
 * No score is computed in the browser. If the analysis file is missing, every passage shows "Not evaluated".
 */
@Injectable({ providedIn: 'root' })
export class HeidiDataService {
  private cache$: Observable<HeidiDataset> | null = null;
  private index = new Map<string, HeidiPassage>();
  private unlocated = new Map<string, ScoredGroup['unlocated_evidence']>();
  sourceMeta: any = null;
  /** The literary analysis file as loaded (coverage, rubric), or null when unavailable. */
  literary: LitFile | null = null;

  constructor(private http: HttpClient) {}

  load(): Observable<HeidiDataset> {
    if (!this.cache$) {
      this.cache$ = forkJoin({
        sbs: this.http.get<SideBySideFile>(HEIDI_ALIGNMENT_URL),
        lit: this.http.get<LitFile>(HEIDI_LITERARY_URL).pipe(catchError(() => of(null))),
      }).pipe(
        map(({ sbs, lit }) => this.compose(sbs, lit)),
        tap(d => this.buildIndex(d)),
        shareReplay(1),
      );
    }
    return this.cache$;
  }

  /** Pure composition step (exported for tests): side-by-side text + literary analysis → dataset. Inputs are never mutated. */
  compose(sbs: SideBySideFile, lit: LitFile | null = null): HeidiDataset {
    const litOk = !!lit && lit.schema === HEIDI_LITERARY_SCHEMA;
    this.literary = litOk ? lit : null;
    this.sourceMeta = { ...sbs.meta, analysis: litOk ? LIT_METHOD : 'Literary analysis file not available — nothing is scored.' };
    const chapters: HeidiChapter[] = sbs.chapters.map(ch => {
      const passages: HeidiPassage[] = ch.rows.map((r, i) => {
        const g: ScoredGroup = structureOf(ch, r, i + 1);
        const en = r.en.map(p => p.text).join(HEIDI_JOIN) || null;
        const de = r.de.map(p => p.text).join(HEIDI_JOIN) || null;
        const ord = (pid: string) => Number(pid.split('-').pop());
        const mapped = mapPassageAnalysis(litOk ? lit!.passages[r.id] : undefined, de, en);
        this.unlocated.set(r.id, mapped.unlocated);
        if (mapped.disputed) { g.alignment.status = 'disputed'; }
        return {
          passage_id: r.id,
          part_id: 'P1',
          chapter_id: ch.id,
          section_id: null,
          sequence: i + 1,
          passage_type: g.passage_type,
          speaker: g.speaker,
          speaker_label: g.speaker_label,
          speaker_conflict: g.speaker_conflict,
          german_text: de,
          english_text: en,
          source: {
            de_paragraph_indices: r.de.map(p => ord(p.id)),
            en_paragraph_indices: r.en.map(p => ord(p.id)),
            de_offsets: [], en_offsets: [],
            de_paragraph_ids: r.de.map(p => p.id),
            en_paragraph_ids: r.en.map(p => p.id),
          },
          alignment: {
            status: g.alignment.status,
            bead: g.alignment.bead,
            confidence: CONFIDENCE_ORDINAL[r.confidence] ?? 0,
            confidence_label: r.confidence,
            chapter_alignment_status: ch.alignment_status,
            note: mapped.disputed ?? r.note ?? null,
            components: {},
            structurally_supported: false,
            method: ch.alignment_status === 'verified' ? 'curated: verified by reading every paragraph' : 'curated: automatic (length, dialogue, names, keywords)',
            source_pages_de: [],
            source_pages_en: [],
            print_pages_en: [],
          },
          analysis: mapped.analysis,
          round_trip_verification: {
            status: 'not_run', back_translated_german: null, back_translated_english: null, translation_model: null, similarity_model: null,
            direct_semantic_score: mapped.analysis.dimensions.semantic?.score ?? null, rtt_semantic_score: null, disagreement: null,
            requires_expert_review: false, generated_at: null, input_hash: null,
          },
          expert_review: { status: 'pending' },
        };
      });
      return {
        chapter_id: ch.id,
        chapter_number: ch.number,
        title_en: ch.title.en,
        title_de: ch.title.de,
        editorial_sections: null,
        source_paragraphs: { de: ch.rows.reduce((n, r) => n + r.de.length, 0), en: ch.rows.reduce((n, r) => n + r.en.length, 0) },
        chapter_char_ratio_en_de: 0,
        alignment_status: ch.alignment_status,
        passages,
      } as HeidiChapter;
    });
    return {
      project_id: 'heidi',
      version: '2.0',
      generated_at: new Date().toISOString(),
      author: 'Johanna Spyri',
      original_language: 'de',
      translation_language: 'en',
      translator: 'Elisabeth P. Stork',
      sources: sbs.meta?.sources ?? {},
      scope: { part: 1, chapter_start: 1, chapter_end: 14 },
      methods: { alignment: 'heidi_part1_side_by_side.json (curated)', analysis: litOk ? LIT_METHOD : 'not available' },
      editorial_notes: [],
      parts: [{ part_id: 'P1', title_en: "Heidi's Years of Learning and Travel", title_de: 'Heidis Lehr- und Wanderjahre', chapters }],
    };
  }

  /** For tests / offline injection. */
  setDataset(d: HeidiDataset): void {
    this.buildIndex(d);
    this.cache$ = of(d);
  }

  private buildIndex(d: HeidiDataset): void {
    this.index.clear();
    for (const part of d.parts) {
      for (const ch of part.chapters) {
        for (const p of ch.passages) {
          this.index.set(p.passage_id, p);
        }
      }
    }
  }

  getPassage(id: string): HeidiPassage | undefined {
    return this.index.get(id);
  }

  unlocatedEvidence(id: string): ScoredGroup['unlocated_evidence'] {
    return this.unlocated.get(id) ?? [];
  }

  chapters(d: HeidiDataset): HeidiChapter[] {
    return d.parts.flatMap(p => p.chapters);
  }

  allPassages(d: HeidiDataset): HeidiPassage[] {
    return this.chapters(d).flatMap(c => c.passages);
  }

  chapters$(): Observable<HeidiChapter[]> {
    return this.load().pipe(map(d => this.chapters(d)));
  }
}
