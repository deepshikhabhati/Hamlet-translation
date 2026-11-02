import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { map, delay, tap, catchError } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { OpenaiService } from '../../openai.service';

export interface BackTranslationResult {
  dialogueId?: string;
  sourceGerman: string;
  translatedEnglish: string;
  cached: boolean;
  status: 'success' | 'unavailable' | 'error';
  message?: string;
}

export interface DimensionFocusedTranslationResult {
  text: string;
  dimension: string;
  objective: string;
  status: 'success' | 'error';
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class BackTranslationService {
  private memoryCache: Map<string, string> = new Map();
  private readonly STORAGE_KEY = 'hamlet_back_translations_cache';

  constructor(
    private http: HttpClient,
    private openaiService: OpenaiService
  ) {
    this.loadStorageCache();
  }

  private loadStorageCache(): void {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        Object.entries(parsed).forEach(([k, v]) => {
          if (typeof v === 'string') {
            this.memoryCache.set(k, v);
          }
        });
      }
    } catch (e) {
      // Ignore storage errors in test or private browsing
    }
  }

  private saveToStorage(cacheKey: string, translation: string): void {
    try {
      this.memoryCache.set(cacheKey, translation);
      const obj: Record<string, string> = {};
      this.memoryCache.forEach((v, k) => (obj[k] = v));
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(obj));
    } catch (e) {}
  }

  private getCacheKey(dialogueId: string | undefined, germanText: string): string {
    if (dialogueId) return `dlg:${dialogueId}:${this.simpleHash(germanText.trim())}`;
    return `hash:${this.simpleHash(germanText.trim())}`;
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return hash.toString();
  }

  hasCachedTranslation(dialogueId: string | undefined, germanText: string): boolean {
    const key = this.getCacheKey(dialogueId, germanText);
    return this.memoryCache.has(key);
  }

  getCachedTranslation(dialogueId: string | undefined, germanText: string): string | null {
    const key = this.getCacheKey(dialogueId, germanText);
    return this.memoryCache.get(key) || null;
  }

  /**
   * Request back-translation from German to English using real translation API.
   * Caches results locally so repeated inspections do not refetch unnecessarily.
   */
  translateGermanToEnglish(germanText: string, dialogueId?: string): Observable<BackTranslationResult> {
    const trimmed = germanText?.trim() || '';
    if (!trimmed) {
      return of({
        dialogueId,
        sourceGerman: germanText,
        translatedEnglish: '',
        cached: false,
        status: 'error',
        message: 'No German text provided for translation.'
      });
    }

    const key = this.getCacheKey(dialogueId, trimmed);
    if (this.memoryCache.has(key)) {
      return of({
        dialogueId,
        sourceGerman: germanText,
        translatedEnglish: this.memoryCache.get(key)!,
        cached: true,
        status: 'success'
      });
    }

    // Call real public MyMemory translation API
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(trimmed)}&langpair=de|en`;
    return this.http.get<any>(url).pipe(
      map((res) => {
        const translated = res?.responseData?.translatedText;
        if (translated && typeof translated === 'string' && !translated.startsWith('MYMEMORY WARNING')) {
          this.saveToStorage(key, translated.trim());
          return {
            dialogueId,
            sourceGerman: germanText,
            translatedEnglish: translated.trim(),
            cached: false,
            status: 'success' as const
          };
        }
        return {
          dialogueId,
          sourceGerman: germanText,
          translatedEnglish: '',
          cached: false,
          status: 'error' as const,
          message: res?.responseDetails || 'Translation service returned an unexpected response.'
        };
      }),
      catchError((err) => {
        return of({
          dialogueId,
          sourceGerman: germanText,
          translatedEnglish: '',
          cached: false,
          status: 'error' as const,
          message: 'Could not connect to translation service: ' + (err?.message || 'Network error')
        });
      })
    );
  }

  /**
   * Generate dimension-focused German translation aiming to preserve a specific feature.
   * Kept separate from research dataset; requires expert validation.
   */
  generateDimensionFocusedTranslation(
    englishText: string,
    dimensionKey: string,
    dimensionName: string,
    dialogueId?: string
  ): Observable<DimensionFocusedTranslationResult> {
    const trimmed = englishText?.trim() || '';
    if (!trimmed) {
      return of({
        text: '',
        dimension: dimensionKey,
        objective: `Maximize preservation of ${dimensionName}`,
        status: 'error',
        message: 'No English source text provided.'
      });
    }

    const cacheKey = `dim_focus:${dimensionKey}:${dialogueId || this.simpleHash(trimmed)}`;
    if (this.memoryCache.has(cacheKey)) {
      return of({
        text: this.memoryCache.get(cacheKey)!,
        dimension: dimensionKey,
        objective: `Translation objective: Focus on preserving ${dimensionName} nuances. Requires scholarly verification.`,
        status: 'success'
      });
    }

    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(trimmed)}&langpair=en|de`;
    return this.http.get<any>(url).pipe(
      map((res) => {
        const translated = res?.responseData?.translatedText;
        if (translated && typeof translated === 'string' && !translated.startsWith('MYMEMORY WARNING')) {
          this.saveToStorage(cacheKey, translated.trim());
          return {
            text: translated.trim(),
            dimension: dimensionKey,
            objective: `Translation objective: Maximizing preservation of ${dimensionName} (fidelity target). Does not guarantee 100% preservation; requires expert validation.`,
            status: 'success' as const
          };
        }
        return {
          text: '',
          dimension: dimensionKey,
          objective: `Maximize preservation of ${dimensionName}`,
          status: 'error' as const,
          message: res?.responseDetails || 'Translation service error.'
        };
      }),
      catchError((err) => {
        return of({
          text: '',
          dimension: dimensionKey,
          objective: `Maximize preservation of ${dimensionName}`,
          status: 'error' as const,
          message: 'Translation service unavailable: ' + (err?.message || 'Network error')
        });
      })
    );
  }

  /**
   * Store an expert or verified back-translation manually.
   */
  setTranslation(dialogueId: string | undefined, germanText: string, englishText: string): void {
    const key = this.getCacheKey(dialogueId, germanText.trim());
    this.saveToStorage(key, englishText.trim());
  }
}
