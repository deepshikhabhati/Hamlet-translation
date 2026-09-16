import { Component, OnInit, OnDestroy, Input, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer } from '@angular/platform-browser';

@Component({
  selector: 'app-pdf-highlighter',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pdf-highlighter.component.html',
  styleUrls: ['./pdf-highlighter.component.css']
})
export class PdfHighlighterComponent implements OnInit, OnChanges, OnDestroy {
  @Input() text: any;
  @Input() nodeName: any;
  @Input() pdfSource: string = '/assets/History_of_artificial_intelligence.pdf';

  showPdf = false;
  pdfUrl = '';
  isLoading = false;
  loadError = '';

  /** Pending timeout for debounced openPdf */
  private openPdfTimeout: ReturnType<typeof setTimeout> | null = null;

  /** Max search string length — long topic content breaks PDF.js URL loading */
  private readonly maxSearchLength = 280;

  constructor(public sanitizer: DomSanitizer, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    if (this.pdfSource) {
      this.scheduleOpenPdf(this.text);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['text'] || changes['pdfSource']) {
      this.scheduleOpenPdf(this.text);
    }
  }

  ngOnDestroy(): void {
    if (this.openPdfTimeout) {
      clearTimeout(this.openPdfTimeout);
      this.openPdfTimeout = null;
    }
  }

  private scheduleOpenPdf(text: any): void {
    if (this.openPdfTimeout) {
      clearTimeout(this.openPdfTimeout);
      this.openPdfTimeout = null;
    }
    const textToUse = text;
    this.openPdfTimeout = setTimeout(() => {
      this.openPdfTimeout = null;
      if (!this.pdfSource) {
        this.pdfUrl = '';
        this.showPdf = false;
        this.isLoading = false;
        this.cdr.detectChanges();
        return;
      }
      this.openPdf(textToUse != null ? String(textToUse).trim() : '');
    }, 100);
  }

  private prepareSearchText(text: string): string {
    let cleaned = (text || '')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .trim();

    if (!cleaned) {
      return '';
    }

    const quoteIndex = Math.min(
      ...['"', "'"].map((q) => cleaned.indexOf(q)).filter((i) => i >= 0)
    );
    if (Number.isFinite(quoteIndex) && quoteIndex >= 0) {
      cleaned = cleaned.slice(0, quoteIndex).trim();
    }

    if (cleaned.length > this.maxSearchLength) {
      const chunk = cleaned.slice(0, this.maxSearchLength);
      const lastBreak = Math.max(
        chunk.lastIndexOf('\n'),
        chunk.lastIndexOf('. '),
        chunk.lastIndexOf('? '),
        chunk.lastIndexOf('! ')
      );
      cleaned = (lastBreak > 40 ? chunk.slice(0, lastBreak + 1) : chunk).trim();
    }

    return cleaned;
  }

  openPdf(text: string): void {
    const rawPdf = (this.pdfSource || 'assets/History_of_artificial_intelligence.pdf').split('#')[0];
    const pdfPath = this.resolveAssetUrl(rawPdf);
    const viewerHtml = this.resolveAssetUrl('assets/pdfjs/web/viewer.html');
    const cleaned = this.prepareSearchText(text);

    const encodedPdfPath = encodeURIComponent(pdfPath);
    const cacheBust = Date.now();
    const baseUrl = `${viewerHtml}?file=${encodedPdfPath}&_t=${cacheBust}`;

    let newUrl = baseUrl;
    if (cleaned) {
      let encoded = encodeURIComponent(cleaned)
        .replace(/%5B/g, '[')
        .replace(/%5D/g, ']');
      newUrl = `${baseUrl}#search=${encoded}&phrase=true&caseSensitive=false&highlightAll=true`;
    }

    this.pdfUrl = '';
    this.showPdf = true;
    this.isLoading = true;
    this.loadError = '';
    this.cdr.detectChanges();

    setTimeout(() => {
      this.pdfUrl = newUrl;
      this.cdr.detectChanges();
    }, 0);
  }

  /**
   * Resolve asset paths against the document base href so GitHub Pages
   * deployments under /Hamlet-translation/ load assets correctly.
   */
  private resolveAssetUrl(path: string): string {
    if (!path) {
      return path;
    }
    if (/^https?:\/\//i.test(path) || path.startsWith('blob:')) {
      return path;
    }
    const normalized = path.replace(/^\//, '');
    try {
      return new URL(normalized, document.baseURI).href;
    } catch {
      return normalized;
    }
  }

  onIframeLoad(): void {
    this.isLoading = false;
    this.cdr.detectChanges();
  }

  onIframeError(): void {
    this.isLoading = false;
    this.loadError = 'Unable to load PDF. Please check the file path.';
    this.cdr.detectChanges();
  }
}
