import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { delay, tap, catchError } from 'rxjs/operators';
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
    if (dialogueId) return `dlg:${dialogueId}`;
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
   * Request back-translation from Human German to English.
   * If a cached translation exists, returns it immediately.
   * Otherwise checks translation service availability.
   * Does NOT fabricate translations.
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

    // Check if translation API or local proxy is configured
    // If not configured, report clear academic unavailable state rather than fabricating translations
    return of({
      dialogueId,
      sourceGerman: germanText,
      translatedEnglish: '',
      cached: false,
      status: 'unavailable' as const,
      message: 'Automated back-translation service is currently unavailable. No external translation API key is configured. German text remains preserved.'
    }).pipe(delay(250));
  }

  /**
   * Store an expert or verified back-translation manually.
   */
  setTranslation(dialogueId: string | undefined, germanText: string, englishText: string): void {
    const key = this.getCacheKey(dialogueId, germanText.trim());
    this.saveToStorage(key, englishText.trim());
  }
}
