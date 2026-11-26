import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, shareReplay, switchMap } from 'rxjs/operators';

/** Runtime config served as a static asset. It holds only a backend URL — never an API key. */
export const HEIDI_ASSISTANT_CONFIG_URL = 'assets/config/heidi-assistant.json';

export interface AssistantContext {
  passage_id: string;
  chapter: number;
  german_original: string | null;
  human_english: string | null;
  translator: string;
  dimension: string;
  selection: { kind: 'phrase' | 'sentence' | 'passage'; german: string | null; english: string | null } | null;
  classification: string | null;
  score: number | null;
  evidence: { category: string; german: string | null; english: string | null; explanation: string }[];
  expert_feedback: string | null;
}

export interface AssistantReply {
  answer: string;
  proposed_translation: string | null;
  caveats: string | null;
  model: string | null;
}

export type AssistantStatus = { available: true; endpoint: string } | { available: false; reason: string };

/**
 * Talks to a server-side assistant (server/heidi-assistant). The browser never sees an API key:
 * the backend holds it and calls the model. Without a configured backend the assistant reports itself unavailable.
 */
@Injectable({ providedIn: 'root' })
export class HeidiAssistantService {
  private status$?: Observable<AssistantStatus>;

  constructor(private http: HttpClient) {}

  status(): Observable<AssistantStatus> {
    if (!this.status$) {
      this.status$ = this.http.get<{ endpoint: string | null }>(HEIDI_ASSISTANT_CONFIG_URL).pipe(
        map(c => c?.endpoint && /^https:\/\/|^http:\/\/localhost/.test(c.endpoint)
          ? { available: true as const, endpoint: c.endpoint }
          : { available: false as const, reason: 'No assistant backend is configured for this deployment.' }),
        catchError(() => of({ available: false as const, reason: 'The assistant configuration could not be loaded.' })),
        shareReplay(1),
      );
    }
    return this.status$;
  }

  ask(context: AssistantContext, question: string, previousProposal: string | null = null): Observable<AssistantReply> {
    return this.status().pipe(
      switchMap(st => {
        if (!st.available) { return throwError(() => new Error(st.reason)); }
        return this.http.post<any>(st.endpoint, { project: 'heidi', context, question, previous_proposal: previousProposal }).pipe(
          map(r => {
            if (!r || typeof r.answer !== 'string') { throw new Error('The assistant returned an unexpected response.'); }
            return { answer: r.answer, proposed_translation: r.proposed_translation ?? null, caveats: r.caveats ?? null, model: r.model ?? null };
          }),
          catchError(e => throwError(() => new Error(e?.error?.error || e?.message || 'The assistant request failed.'))),
        );
      }),
    );
  }
}
