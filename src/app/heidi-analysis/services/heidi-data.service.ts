import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, shareReplay, tap } from 'rxjs/operators';
import { HEIDI_DATA_URL, HeidiChapter, HeidiDataset, HeidiPassage } from '../models/heidi.models';

/**
 * Loads the Heidi dataset lazily (only when the Heidi route is opened).
 * Independent of HamletDataService; never touches Hamlet assets or state.
 */
@Injectable({ providedIn: 'root' })
export class HeidiDataService {
  private cache$: Observable<HeidiDataset> | null = null;
  private index = new Map<string, HeidiPassage>();

  constructor(private http: HttpClient) {}

  load(): Observable<HeidiDataset> {
    if (!this.cache$) {
      this.cache$ = this.http.get<HeidiDataset>(HEIDI_DATA_URL).pipe(
        tap(d => this.buildIndex(d)),
        shareReplay(1),
      );
    }
    return this.cache$;
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
