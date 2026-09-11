import { Component, ElementRef, ViewChild, HostListener, AfterViewChecked, OnInit } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Version1 } from 'src/assets/Comp3_version1';
import { Version2 } from 'src/assets/Comp3_version2';
import { OpenaiService } from '../openai.service';
import { queryResults } from 'src/assets/Ai-QueryResults';
import * as pdfjsLib from 'pdfjs-dist';

(pdfjsLib as any).GlobalWorkerOptions.workerSrc = '/assets/pdfjs/pdf.worker.min.js';

@Component({
  selector: 'app-version-comparison',
  templateUrl: './version-comparison.component.html',
  styleUrls: ['./version-comparison.component.css']
})
export class VersionComparisonComponent implements OnInit, AfterViewChecked {
  // Topic data for both versions
  topicDataVersion1 = Version1.children;
  topicDataVersion2 = Version2.children;
  
  // PDF paths
  pdfPath1 = '/assets/William Shakespeare _ Plays, Poems, Biography, Quotes, & Facts _ Britannica.pdf';
  pdfPath2 = '/assets/William_Shakespeare.pdf';
  
  // Common properties (similar to main-content)
  intersection: any = 0;
  nodeName: any = '';
  barChartValue: any = [];
  barChartValue2: any = [];
  barChartValue3: any = [];
  chatMessages: any[] = [];
  
  // Getter to return chat messages in reverse order (latest first)
  get reversedChatMessages(): any[] {
    return [...this.chatMessages].reverse();
  }
  
  querysent: boolean = false;
  selectedForComparison: any = [];
  userMessage: any = '';
  heatmapdata: any = [];
  selectednodes: any = [];
  activeTab: number = 0;
  view: 'tree' | 'packing' = 'tree';
  barChartData: any = [];
  selectedname: any = [];
  showChunkPopup: boolean = false;
  numberOfChunks: any = 100;
  selectedUSerMessage: any;
  selectedUSerMessage2: any;
  selectedUSerMessage3: any;
  
  // Map to track which actual query index is mapped to each Q1/Q2/Q3 slot
  queryIndexMapping: { [structureQuery: string]: number } = {};
  fuzzyPopup: boolean = false;
  CommonBarData: { label: string; value: number; }[] = [];
  
  // Selected topics for both versions
  selectedTopicContentsVersion1: any[] = [];
  selectedTopicContentsVersion2: any[] = [];
  selectedTopicVersion1: any;
  selectedTopicVersion2: any;
  paragraphToHighlightVersion1: any;
  paragraphToHighlightVersion2: any;
  
  donutChartOptions: any = {
    responsive: true,
    cutout: '70%',
    plugins: {
      legend: { display: false }
    }
  };

  donutChartColors = [
    {
      backgroundColor: ['#7474e2', '#e0e0e0']
    }
  ];
  showColorOptions: any = null;

  // Query management (similar to main-content)
  predefinedQueries: any[] = [];
  selectedQueries: any[] = [];
  queryColors: { [key: number]: string } = {};
  q1Color: string = '#667eea';
  q2Color: string = '#f093fb';
  q3Color: string = '#4facfe';
  selectedQueryRank: number = 0;
  selectedColor: string = '#667eea';
  
  // Bin management
  bins: any = {};
  bins2: any = {};
  selectedBinIndex: number | null = null;
  
  // PDF rendering
  pdfDoc1: any = null;
  pdfDoc2: any = null;
  pageNum1: number = 1;
  pageNum2: number = 1;
  pageRendering1: boolean = false;
  pageRendering2: boolean = false;
  pageNumPending1: number | null = null;
  pageNumPending2: number | null = null;
  scale: number = 1.5;
  canvas1: any = null;
  canvas2: any = null;
  ctx1: any = null;
  ctx2: any = null;

  @ViewChild('pdfCanvas1') pdfCanvas1!: ElementRef<HTMLCanvasElement>;
  @ViewChild('pdfCanvas2') pdfCanvas2!: ElementRef<HTMLCanvasElement>;

  getDonutChartData(score: number) {
    const safeScore = Math.max(0, Math.min(100, score));
    return [safeScore, 100 - safeScore];
  }

  constructor(private openaiService: OpenaiService, private sanitizer: DomSanitizer) {
    this.initializeDefaultColors();
    this.initializeQueries();
  }

  ngOnInit() {
    this.loadPDF(this.pdfPath1, 1);
    this.loadPDF(this.pdfPath2, 2);
  }

  ngAfterViewChecked() {
    // Handle any view updates
  }

  private initializeDefaultColors() {
    document.documentElement.style.setProperty('--q1-color', this.q1Color);
    document.documentElement.style.setProperty('--q1-bg-color', this.generateBackgroundColor(this.q1Color));
    document.documentElement.style.setProperty('--q2-color', this.q2Color);
    document.documentElement.style.setProperty('--q2-bg-color', this.generateBackgroundColor(this.q2Color));
    document.documentElement.style.setProperty('--q3-color', this.q3Color);
    document.documentElement.style.setProperty('--q3-bg-color', this.generateBackgroundColor(this.q3Color));
  }

  private initializeQueries() {
    // Initialize with some default queries or load from service
    this.predefinedQueries = [
      { text: 'What is the main theme?', id: 0 },
      { text: 'Who are the key characters?', id: 1 },
      { text: 'What is the historical context?', id: 2 }
    ];
  }

  generateBackgroundColor(color: string): string {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, 0.1)`;
  }

  // PDF Loading Methods
  loadPDF(url: string, version: number) {
    pdfjsLib.getDocument(url).promise.then((pdf: any) => {
      if (version === 1) {
        this.pdfDoc1 = pdf;
        this.renderPage1(this.pageNum1);
      } else {
        this.pdfDoc2 = pdf;
        this.renderPage2(this.pageNum2);
      }
    }).catch((error: any) => {
      console.error('Error loading PDF:', error);
    });
  }

  renderPage1(num: number) {
    this.pageRendering1 = true;
    this.pdfDoc1.getPage(num).then((page: any) => {
      const viewport = page.getViewport({ scale: this.scale });
      this.canvas1 = this.pdfCanvas1.nativeElement;
      this.ctx1 = this.canvas1.getContext('2d');
      this.canvas1.height = viewport.height;
      this.canvas1.width = viewport.width;

      const renderContext = {
        canvasContext: this.ctx1,
        viewport: viewport
      };
      const renderTask = page.render(renderContext);

      renderTask.promise.then(() => {
        this.pageRendering1 = false;
        if (this.pageNumPending1 !== null) {
          this.renderPage1(this.pageNumPending1);
          this.pageNumPending1 = null;
        }
      });
    });
  }

  renderPage2(num: number) {
    this.pageRendering2 = true;
    this.pdfDoc2.getPage(num).then((page: any) => {
      const viewport = page.getViewport({ scale: this.scale });
      this.canvas2 = this.pdfCanvas2.nativeElement;
      this.ctx2 = this.canvas2.getContext('2d');
      this.canvas2.height = viewport.height;
      this.canvas2.width = viewport.width;

      const renderContext = {
        canvasContext: this.ctx2,
        viewport: viewport
      };
      const renderTask = page.render(renderContext);

      renderTask.promise.then(() => {
        this.pageRendering2 = false;
        if (this.pageNumPending2 !== null) {
          this.renderPage2(this.pageNumPending2);
          this.pageNumPending2 = null;
        }
      });
    });
  }

  queueRenderPage1(num: number) {
    if (this.pageRendering1) {
      this.pageNumPending1 = num;
    } else {
      this.renderPage1(num);
    }
  }

  queueRenderPage2(num: number) {
    if (this.pageRendering2) {
      this.pageNumPending2 = num;
    } else {
      this.renderPage2(num);
    }
  }

  onPrevPage1() {
    if (this.pageNum1 <= 1) return;
    this.pageNum1--;
    this.queueRenderPage1(this.pageNum1);
  }

  onNextPage1() {
    if (this.pageNum1 >= this.pdfDoc1.numPages) return;
    this.pageNum1++;
    this.queueRenderPage1(this.pageNum1);
  }

  onPrevPage2() {
    if (this.pageNum2 <= 1) return;
    this.pageNum2--;
    this.queueRenderPage2(this.pageNum2);
  }

  onNextPage2() {
    if (this.pageNum2 >= this.pdfDoc2.numPages) return;
    this.pageNum2++;
    this.queueRenderPage2(this.pageNum2);
  }

  // Topic selection methods for both versions
  onTopicClickedVersion1(event: any) {
    this.selectedTopicVersion1 = event;
    this.nodeName = event.name;
    // Handle topic selection for version 1
    if (event.value || event.content) {
      this.paragraphToHighlightVersion1 = event.value || event.content;
    }
  }

  onTopicClickedVersion2(event: any) {
    this.selectedTopicVersion2 = event;
    // Handle topic selection for version 2
    if (event.value || event.content) {
      this.paragraphToHighlightVersion2 = event.value || event.content;
    }
  }

  // Query management methods (similar to main-content)
  sendMessage(message: string) {
    if (!message.trim()) return;
    
    const newQuery = {
      text: message,
      id: this.predefinedQueries.length,
      role: 'user'
    };
    
    this.predefinedQueries.push(newQuery);
    this.chatMessages.push({
      role: 'user',
      content: message,
      timestamp: new Date()
    });
    
    this.userMessage = '';
  }

  isQuerySelected(query: any): boolean {
    return this.selectedQueries.some(q => q.id === query.id);
  }

  toggleQuerySelection(query: any, event?: any) {
    const index = this.selectedQueries.findIndex(q => q.id === query.id);
    if (index > -1) {
      this.selectedQueries.splice(index, 1);
    } else {
      if (this.selectedQueries.length < 3) {
        this.selectedQueries.push(query);
      }
    }
  }

  isQueryCheckboxDisabled(query: any): boolean {
    return !this.isQuerySelected(query) && this.selectedQueries.length >= 3;
  }

  getCurrentQueryMessage(): string {
    if (this.selectedQueries.length > 0) {
      return this.selectedQueries[0].text;
    }
    return '';
  }

  getQueryColor(queryIndex: number): string {
    if (this.queryColors[queryIndex]) {
      return this.queryColors[queryIndex];
    }
    
    const colors = [
      '#667eea', '#f093fb', '#4facfe', '#43e97b',
      '#fa709a', '#fee140', '#30cfd0', '#a8edea'
    ];
    return colors[queryIndex % colors.length];
  }

  getQueryColorWithOpacity(queryIndex: number): string {
    const color = this.getQueryColor(queryIndex);
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, 0.1)`;
  }

  onColorChange(queryIndex: number, event: Event) {
    const target = event.target as HTMLInputElement;
    if (target) {
      this.queryColors[queryIndex] = target.value;
    }
  }

  // Bin management methods (similar to main-content)
  getBinCountForQuery(queryIndex: number, binIndex: number): number {
    // Placeholder - implement based on your data structure
    return 0;
  }

  isBinSelectedForQuery(query: any, binIndex: number): boolean {
    // Placeholder - implement based on your data structure
    return false;
  }

  toggleBinSelectionForQuery(query: any, binIndex: number) {
    // Placeholder - implement based on your data structure
  }

  getBinBarCount(binIndex: number): number {
    if (binIndex === 0) return 5;
    if (binIndex === 1) return 3;
    if (binIndex === 2) return 1;
    return 0;
  }

  getBinAntennaBars(binIndex: number): any[] {
    const count = this.getBinBarCount(binIndex);
    return Array(count).fill(null).map((_, index) => ({
      active: true,
      index: index
    }));
  }

  getBinAntennaColor(binIndex: number): string {
    const colors = ['#667eea', '#4facfe', '#43e97b'];
    return colors[binIndex] || '#667eea';
  }

  // Helper methods
  highlightText(text: string, keywords: string[], color?: string): SafeHtml {
    if (!text || !keywords?.length) {
      return this.sanitizer.sanitize(1, text) || text;
    }
    
    const highlightColor = color || this.getCurrentQueryColor();
    let result = text;
    keywords.forEach((keyword) => {
      const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b(${escapedKeyword})\\b`, 'gi');
      result = result.replace(regex, `<mark style="background-color: ${highlightColor}; color: white; font-weight: 600; padding: 2px 4px; border-radius: 3px;">$1</mark>`);
    });
    return this.sanitizer.bypassSecurityTrustHtml(result);
  }

  getCurrentQueryColor(): string {
    if (this.selectedQueries.length > 0) {
      return this.getQueryColor(this.selectedQueries[0].id);
    }
    return this.q1Color;
  }

  deleteTopic(topic: any, version: number) {
    if (version === 1) {
      this.selectedTopicContentsVersion1 = this.selectedTopicContentsVersion1.filter(t => t !== topic);
    } else {
      this.selectedTopicContentsVersion2 = this.selectedTopicContentsVersion2.filter(t => t !== topic);
    }
  }

  selectTopic(topic: any, version: number) {
    if (version === 1) {
      this.selectedTopicVersion1 = topic;
    } else {
      this.selectedTopicVersion2 = topic;
    }
  }
}
