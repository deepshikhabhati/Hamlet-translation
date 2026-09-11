import { Component, ElementRef, ViewChild, HostListener, AfterViewChecked, OnInit, Input, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { OpenaiService } from '../openai.service';
import { EmbeddingComparisonState } from '../models/embedding-comparison.interface';
import { summary } from 'src/assets/summary';
import * as pdfjsLib from 'pdfjs-dist';

(pdfjsLib as any).GlobalWorkerOptions.workerSrc = '/assets/pdfjs/pdf.worker.min.js';

@Component({
  selector: 'app-dual-view-content',
  templateUrl: './dual-view-content.component.html',
  styleUrls: ['./dual-view-content.component.css']
})
export class DualViewContentComponent implements OnInit, AfterViewChecked, OnChanges {
  // Input properties for making component reusable
  @Input() chartData1: any = null;
  @Input() chartData2: any = null;
  @Input() queryResults1: any[] = [];
  @Input() queryResults2: any[] = [];
  @Input() pdfSource1: string = '/assets/WilliamShakespear1.pdf';
  @Input() pdfSource2: string = '/assets/William_Shakespeare.pdf';
  @Input() questions: string[] = []; // Optional: array of questions/queries
  @Input() apiQuestions1: string[] = [];
  @Input() apiQuestions2: string[] = [];
  @Input() queryApi1: 'default' | 'hamlet' | 'german' = 'default';
  @Input() queryApi2: 'default' | 'hamlet' | 'german' = 'default';
  @Input() versionLabel1 = 'Table of Contents Version 1';
  @Input() versionLabel2 = 'Table of Contents Version 2';
  @Input() showSecondVersionInitially = false;
  
  // Version-specific topic and chart data
  topicData1: any[] = [];
  topicData2: any[] = [];
  // Keep topicData and chartData for backward compatibility (defaulting to version 1)
  topicData: any[] = [];
  chartData: any = null;
  intersection: any = 0
  nodeName: any = ''
  barChartValue: any = []
  barChartValue2: any = []
  barChartValue3: any = []
  chatMessages: any[] = [];
  moduleDetailsTab: 'summary' | 'embedding' = 'summary';

  // Getter to return chat messages in reverse order (latest first)
  get reversedChatMessages(): any[] {
    return [...this.chatMessages].reverse();
  }
  querysent: boolean = false;
  selectedForComparison: any = [];
  userMessage: any = ''
  heatmapdata: any = [];
  selectednodes: any = []
  activeTab: number = 0;
  view: 'tree' | 'packing' = 'tree';
  activeChartTab: 'circle-tree' | 'sunburst' = 'circle-tree';
  
  // Floating chart windows properties - Version 1
  showCircleTreeWindow: boolean = false;
  circleTreeExpanded: boolean = true;
  circleTreePosition = { x: 100, y: 100 };
  circleTreeSize = { width: 500, height: 400 };
  
  // Floating chart windows properties - Version 2
  showCircleTreeWindow2: boolean = false;
  circleTreeExpanded2: boolean = true;
  circleTreePosition2 = { x: 500, y: 100 };
  circleTreeSize2 = { width: 500, height: 400 };
  
  isDraggingWindow: boolean = false;
  draggingWindow: 'circle-tree' | 'circle-tree2' | null = null;
  windowDragOffset = { x: 0, y: 0 };
  isResizingWindow: boolean = false;
  resizingWindow: 'circle-tree' | 'circle-tree2' | null = null;
  windowResizeStart = { x: 0, y: 0, width: 0, height: 0 };
  windowResizeUpdateTimer: any = null;
  barChartData: any = []
  selectedname: any = []
    showChunkPopup: boolean = false;
    numberOfChunks: any = 100;
  selectedUSerMessage: any;
  selectedUSerMessage2: any;
  selectedUSerMessage3: any;
  
  // Map to track which actual query index is mapped to each Q1/Q2/Q3 slot
  queryIndexMapping: { [structureQuery: string]: number } = {};
  /** Reverse map: actual query index -> structure slot ('1'|'2'|'3') - same as main-content */
  private queryIndexToStructureSlot: { [queryIndex: number]: '1' | '2' | '3' } = {};
  fuzzyPopup: boolean = false;
  CommonBarData: { label: string; value: number; }[] = [];
  selectedTopicContents: any[] = [];
  selectedTopic: any;
  paragraphToHighlight: any;
  
  // Separate state for each PDF viewer and topic-list
  paragraphToHighlight1: any;
  paragraphToHighlight2: any;
  nodeName1: any = '';
  nodeName2: any = '';
  nodePath1: any = '';
  nodePath2: any = '';
  selectedTopicContents1: any[] = [];
  selectedTopicContents2: any[] = [];
  selectednodes1: any = [];
  selectednodes2: any = [];
  // PDF sources are now @Input() properties
  
  // Tab state for switching between Reader and Circle Tree
  activeViewTab1: 'reader' | 'circleTree' = 'reader';
  activeViewTab2: 'reader' | 'circleTree' = 'reader';

  // Toggle between topic list and PDF within each version column
  contentPanel1: 'topics' | 'pdf' = 'topics';
  contentPanel2: 'topics' | 'pdf' = 'topics';

  setContentPanel(version: 1 | 2, panel: 'topics' | 'pdf'): void {
    if (version === 1) this.contentPanel1 = panel;
    else this.contentPanel2 = panel;
  }

  // Version visibility (like hamlet-triple-view: V1 on by default, V2 off; add via edge buttons)
  showVersion1 = true;
  showVersion2 = false;

  addVersion1(): void {
    this.showVersion1 = true;
  }
  addVersion2(): void {
    this.showVersion2 = true;
  }
  toggleVersionVisibility(version: 1 | 2): void {
    if (version === 1) this.showVersion1 = !this.showVersion1;
    else this.showVersion2 = !this.showVersion2;
  }
  /** True when exactly one version is on. Show PDF in 2nd column like Hamlet. */
  get onlyOneVersionOn(): boolean {
    const n = (this.showVersion1 ? 1 : 0) + (this.showVersion2 ? 1 : 0);
    return n === 1;
  }
  /** When only one version is on, returns 1 or 2. */
  get whichSingleVersion(): 1 | 2 | null {
    if (!this.onlyOneVersionOn) return null;
    return this.showVersion1 ? 1 : 2;
  }

  donutChartOptions: any = {
    responsive: true,
    cutout: '70%', // donut thickness
    plugins: {
      legend: { display: false }
    }
  };

  donutChartColors = [
    {
      backgroundColor: ['#2563eb', '#e2e8f0']
    }
  ];
  showColorOptions: any = null;

  getDonutChartData(score: number) {
    const safeScore = Math.max(0, Math.min(100, score)); // Clamp between 0-100
    return [safeScore, 100 - safeScore];
  }
  constructor(private openaiService: OpenaiService, private sanitizer: DomSanitizer, private cdr: ChangeDetectorRef) {
    // Initialize default background colors
    this.initializeDefaultColors();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Update data when inputs change
    if (changes['chartData1'] && this.chartData1) {
      this.topicData1 = this.chartData1.children || [];
      this.topicData = this.topicData1;
      this.chartData = this.chartData1;
    }
    
    if (changes['chartData2'] && this.chartData2) {
      this.topicData2 = this.chartData2.children || [];
    }
    if (changes['questions']) {
      this.seedQueryColorsFromPalette();
    }
  }

  ngOnInit(): void {
    this.showVersion2 = this.showSecondVersionInitially;

    // Initialize data from inputs if available
    if (this.chartData1) {
      this.topicData1 = this.chartData1.children || [];
      this.topicData = this.topicData1;
      this.chartData = this.chartData1;
    }
    
    if (this.chartData2) {
      this.topicData2 = this.chartData2.children || [];
    }

    function cleanTree(node: any): any {
      const cleanedNode: any = { name: node.name };
    
      if (Array.isArray(node.children) && node.children.length > 0) {
        cleanedNode.children = node.children.map((child: any) => cleanTree(child));
      }
    
      return cleanedNode;
    }

    if (this.chartData1) {
      console.log(cleanTree(this.chartData1), 1);
    }
    console.log("🔥 Initial bins:", this.bins);
    console.log("🔥 Initial bins2:", this.bins2);
    console.log("🔥 Initial selectedBinIndex:", this.selectedBinIndex);

    let cotnet: any = `in 1955, allen newell and future nobel laureate herbert a. simon created the 'logic theorist', with help from j. c. shaw. the program would eventually prove 38 of the first 52 theorems in russell and whitehead's principia mathematica, and find new and more elegant proofs for some.[78] simon said that they had 'solved the venerable mind/body problem, explaining how a system composed of matter can have the properties of mind.'[79][c] the symbolic reasoning paradigm they introduced would dominate ai research and funding until the middle 90s, as well as inspire the cognitive revolution.`
    this.openaiService.extract_paragraph(cotnet).subscribe((res: any) => {  
      console.log(res)
    });

    function cleanTreeArray(dataArray: any[]): any[] {
      return dataArray.map((node: any) => cleanTree(node));
    }

    function flattenTreeWithPaths(data: any[]): Record<string, number> {
      const result: Record<string, number> = {};
      let counter = 1;
    
      function traverse(node: any, path: string = "") {
        const currentPath = path ? `${path}/${node.name}` : node.name;
        result[currentPath] = counter++;
        
        if (node.children && node.children.length) {
          node.children.forEach((child: any) => traverse(child, currentPath));
        }
      }
    
      data.forEach(root => traverse(root));
      return result;
    }

    // Expand all topics for word cloud functionality
    if (this.topicData && this.topicData.length > 0) {
      this.expandAllTopics(this.topicData1);
    }

    if (this.topicData2 && this.topicData2.length > 0) {
      this.expandAllTopics(this.topicData2);
    }

    this.seedQueryColorsFromPalette();

    console.log(this.topicData1, this.topicData2, 133)
  }

  private seedQueryColorsFromPalette(): void {
    this.questions?.forEach((_, index) => {
      if (!this.queryColors[index]) {
        this.queryColors[index] = this.colorPalette[index % this.colorPalette.length];
      }
    });
  }

  private initializeDefaultColors() {
    // Set default colors on initialization
    document.documentElement.style.setProperty('--q1-color', this.q1Color);
    document.documentElement.style.setProperty('--q1-bg-color', this.generateBackgroundColor(this.q1Color));
    document.documentElement.style.setProperty('--q2-color', this.q2Color);
    document.documentElement.style.setProperty('--q2-bg-color', this.generateBackgroundColor(this.q2Color));
    document.documentElement.style.setProperty('--q3-color', this.q3Color);
    document.documentElement.style.setProperty('--q3-bg-color', this.generateBackgroundColor(this.q3Color));
  }

  openChunkPopup() {
    this.showChunkPopup = true;
  }
  
  deleteTopic(topic: any, viewIndex: number = 1) {
    if (viewIndex === 1) {
      this.selectedTopicContents1 = this.selectedTopicContents1.filter(t => t !== topic);
    } else {
      this.selectedTopicContents2 = this.selectedTopicContents2.filter(t => t !== topic);
    }
    this.selectedTopicContents = this.selectedTopicContents.filter(t => t !== topic);
  }

  toggleExpand(topic: any) {
    topic.expanded = !topic.expanded;
  }


  selectTopic(topic: any) {
    this.selectedTopic = topic;
    console.log(topic,133)
  }
  // Word cloud colors - use current query color
  wordCloudColors = [
    '#E74C3C', '#3498DB', '#2ECC71', '#F39C12',
    '#9B59B6', '#1ABC9C', '#E67E22', '#34495E',
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'
  ];

  // Get color for a specific message based on its query
  getMessageColor(messageNo: string): string {
    if (messageNo === 'Q 1') {
      return this.q1Color;
    } else if (messageNo === 'Q 2') {
      return this.q2Color;
    } else if (messageNo === 'Q 3') {
      return this.q3Color;
    }
    return this.q1Color; // default
  }

  highlightText(text: string, keywords: string[], color?: string): SafeHtml {
    if (!text || !keywords?.length) {
      return this.sanitizer.sanitize(1, text) || text;
    }
  
    // Use provided color or fall back to current query color
    const highlightColor = color || this.getCurrentQueryColor();
    let result = text;
    keywords.forEach((keyword) => {
      // Escape special regex characters in keyword
      const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b(${escapedKeyword})\\b`, 'gi');
      result = result.replace(regex, `<mark style="background-color: ${highlightColor}; color: white; font-weight: 600; padding: 2px 4px; border-radius: 3px; border: none;">$1</mark>`);
    });
    return this.sanitizer.bypassSecurityTrustHtml(result);
  }
  
  // Helper method to get keywords for a topic (generates if not exists)
  getTopicKeywords(topic: any): string[] {
    if (!topic.generatedKeys || topic.generatedKeys.length === 0) {
      if (topic.summary && typeof topic.summary === 'string') {
        topic.generatedKeys = this.extractKeywordsFromContent(topic.summary, 15);
        console.log(`Generated keywords on-demand for topic: ${topic.name}`, topic.generatedKeys);
      }
    }
    return topic.generatedKeys || [];
  }

  // Enhanced word cloud chart rendering method
  renderWordCloudChart(canvasId: string, keywords: string[], color?: string): void {
    console.log('renderWordCloudChart called with:', canvasId, keywords);
    
    if (!keywords || keywords.length === 0) {
      console.log('No keywords provided');
      return;
    }

    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!canvas) {
      console.log('Canvas not found:', canvasId);
      return;
    }

    console.log('Canvas found:', canvas, 'Size:', canvas.offsetWidth, 'x', canvas.offsetHeight);

    // Set canvas size - use smaller size for compact card
    canvas.width = canvas.offsetWidth || 400;
    canvas.height = canvas.offsetHeight || 200;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.log('Canvas context not available');
      return;
    }

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Prepare word data with better size distribution for compact card layout
    const maxWords = Math.min(15, keywords.length);
    const wordData = keywords.slice(0, maxWords).map((word, index) => {
      // Create more varied sizes based on position - optimized for compact card layout
      const importance = (maxWords - index) / maxWords;
      const baseSize = 12;
      const maxSize = 20;
      const size = Math.round(baseSize + (maxSize - baseSize) * importance);
      
      return {
        text: word.length > 12 ? word.substring(0, 12) + '...' : word,
        size: size,
        color: color || this.getCurrentQueryColor(),
        x: 0,
        y: 0,
        bounds: null as any
      };
    });

    // Improved word cloud layout algorithm
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const placedWords: any[] = [];

    // Set context properties for better text rendering
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    wordData.forEach((word, index) => {
      ctx.font = `${word.size}px 'Segoe UI', Arial, sans-serif`;
      ctx.fillStyle = word.color;
      
      const metrics = ctx.measureText(word.text);
      const textWidth = metrics.width;
      const textHeight = word.size;

      // Try to place word without overlapping
      let placed = false;
      let attempts = 0;
      const maxAttempts = 80;

      while (!placed && attempts < maxAttempts) {
        let x, y;
        
        if (attempts < 8) {
          // First try to place near center - optimized for compact card layout
          x = centerX + (Math.random() - 0.5) * (canvas.width * 0.5);
          y = centerY + (Math.random() - 0.5) * (canvas.height * 0.5);
        } else {
          // Use improved spiral positioning for compact card layout
          const angle = attempts * 0.4;
          const radius = Math.sqrt(attempts - 8) * 6;
          
          x = centerX + Math.cos(angle) * radius;
          y = centerY + Math.sin(angle) * radius;
        }

        // Check canvas bounds
        const halfWidth = textWidth / 2;
        const halfHeight = textHeight / 2;
        
        if (x - halfWidth >= 5 && x + halfWidth <= canvas.width - 5 && 
            y - halfHeight >= 5 && y + halfHeight <= canvas.height - 5) {
          
          // Create word bounds for collision detection
          const wordBounds = {
            left: x - halfWidth - 3,
            right: x + halfWidth + 3,
            top: y - halfHeight - 3,
            bottom: y + halfHeight + 3,
            centerX: x,
            centerY: y
          };

          // Check for collisions
          const collision = placedWords.some(placed => {
            return !(wordBounds.right < placed.left || 
                    wordBounds.left > placed.right || 
                    wordBounds.bottom < placed.top || 
                    wordBounds.top > placed.bottom);
          });

          if (!collision) {
            // Add subtle shadow for better readability
            ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
            ctx.shadowBlur = 1;
            ctx.shadowOffsetX = 1;
            ctx.shadowOffsetY = 1;
            
            // Place the word
            ctx.fillText(word.text, x, y);
            
            // Reset shadow
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
            
            placedWords.push(wordBounds);
            (word as any).bounds = wordBounds;
            placed = true;
          }
        }
        attempts++;
      }

      // Fallback placement if optimal placement fails - optimized for row layout
      if (!placed) {
        const safeX = canvas.width * 0.1 + Math.random() * canvas.width * 0.8;
        const safeY = canvas.height * 0.25 + Math.random() * canvas.height * 0.5;
        
        ctx.globalAlpha = 0.7; // Make fallback words slightly transparent
        ctx.fillText(word.text, safeX, safeY);
        ctx.globalAlpha = 1;
      }
    });
  }

  // Render word clouds after view updates
  ngAfterViewChecked(): void {
    // Render word clouds using canvas
    setTimeout(() => {
      // Render for both views
      [...this.selectedTopicContents1, ...this.selectedTopicContents2].forEach(topic => {
        const canvasId = `wordcloud-canvas-${this.sanitizeTopicName(topic.name)}`;
        const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
        
        if (canvas && !canvas.dataset['rendered']) {
          const keywords = this.getTopicKeywords(topic);
          if (keywords.length > 0) {
            this.renderBeautifulWordCloud(canvasId, keywords);
            canvas.dataset['rendered'] = 'true';
          }
        }
      });
    }, 100);
  }

  // Extract keywords from text (summary or content)
  extractKeywordsFromContent(content: string, topN: number = 15): string[] {
    if (!content || typeof content !== 'string') {
      return [];
    }

    // Common stop words to filter out
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 
      'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be', 
      'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 
      'would', 'should', 'could', 'may', 'might', 'must', 'can', 'this', 
      'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
      'what', 'which', 'who', 'when', 'where', 'why', 'how', 'all', 'each',
      'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such', 'than',
      'too', 'very', 'into', 'through', 'during', 'before', 'after', 'above',
      'below', 'between', 'under', 'again', 'further', 'then', 'once'
    ]);

    // Clean and tokenize the content
    const words = content
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Remove punctuation
      .split(/\s+/) // Split by whitespace
      .filter(word => 
        word.length > 3 && // At least 4 characters
        !stopWords.has(word) && // Not a stop word
        !/^\d+$/.test(word) // Not just numbers
      );

    // Count word frequency
    const wordFrequency = new Map<string, number>();
    words.forEach(word => {
      wordFrequency.set(word, (wordFrequency.get(word) || 0) + 1);
    });

    // Sort by frequency and get top N words
    const sortedWords = Array.from(wordFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, topN)
      .map(entry => entry[0]);

    return sortedWords;
  }

  // CSS-based word cloud - no manual rendering needed
  // Old canvas methods kept for reference but not used
  
  renderTopicWordCloud(topic: any): void {
    // Not needed anymore - CSS word cloud renders automatically
    // Just ensure keywords are generated
    if (!topic.generatedKeys && topic.summary && typeof topic.summary === 'string') {
      topic.generatedKeys = this.extractKeywordsFromContent(topic.summary, 15);
    }
  }

  renderWordCloudWithRetry(cloudId: string, keywords: string[], attempt: number): void {
    // Not used - CSS word cloud renders automatically
  }

  clearRenderedWordClouds(): void {
    // Not used - CSS word cloud doesn't need tracking
  }

  forceRenderAllWordClouds(): void {
    // Not needed - CSS word cloud renders automatically
  }

  // Manual trigger for testing word cloud rendering
  triggerWordCloudTest(): void {
    console.log('Manually triggering word cloud test...');
    if (this.selectedTopicContents.length > 0) {
      this.forceRenderAllWordClouds();
    } else {
      console.log('No topics available for word cloud rendering');
    }
  }

  // Debug method - CSS word cloud version
  debugCanvasAvailability(): void {
    console.log('=== Word Cloud Debug (CSS-based) ===');
    console.log('Selected topic contents:', this.selectedTopicContents);
    
    this.selectedTopicContents.forEach(topic => {
      console.log(`Topic: ${topic.name}`);
      console.log(`  Has summary: ${!!topic.summary}`);
      console.log(`  Generated keywords: ${topic.generatedKeys?.length || 0}`);
      console.log(`  Keywords:`, topic.generatedKeys);
      console.log('---');
    });
  }

  // Handle topic click from topic-list component - calls both setTopic and selectedData
  onTopicClicked(topic: any, viewIndex: number = 1): void {
    console.log('Topic clicked:', topic.name, 'Selected Query Rank:', this.selectedQueryRank, 'View:', viewIndex);
    
    // First call setTopic to handle UI updates (selection, nodeName, paragraph) – always run so node gets selected
    this.setTopic(topic, viewIndex);
    
    // Then call selectedData if there's an active query (predefined or added – getCurrentQueryMessage covers both)
    const hasActiveQuery = !!this.getCurrentQueryMessage();
    
    if (hasActiveQuery) {
      this.selectedData(topic, viewIndex);
    }
  }

  /** Find content for a node by name in the chart tree (for sunburst clicks where node may not have content). */
  private getContentFromChartByName(chartData: any, name: string): string {
    if (!chartData || !name) return '';
    const firstLeafContent = (node: any): string => {
      const c = node?.content ?? node?.value ?? '';
      if (c && typeof c === 'string') return c;
      if (node?.children?.length) {
        for (const child of node.children) {
          const found = firstLeafContent(child);
          if (found) return found;
        }
      }
      return '';
    };
    const find = (node: any): string => {
      if (!node) return '';
      if ((node.name || '') === name) {
        const c = node.content ?? node.value ?? '';
        if (c && typeof c === 'string') return c;
        return firstLeafContent(node) || '';
      }
      if (node.children?.length) {
        for (const child of node.children) {
          const found = find(child);
          if (found) return found;
        }
      }
      return '';
    };
    const roots = chartData?.children ?? (Array.isArray(chartData) ? chartData : [chartData]);
    if (!Array.isArray(roots)) return find(chartData) || '';
    for (const root of roots) {
      const found = find(root);
      if (found) return found;
    }
    return '';
  }

  // Handle topic selection from topic-list component
  setTopic(topic: any, viewIndex: number = 1): void {
    // Generate keywords from summary immediately
    if (topic.summary && typeof topic.summary === 'string') {
      topic.generatedKeys = this.extractKeywordsFromContent(topic.summary, 15);
      console.log(`Generated keywords for topic "${topic.name}":`, topic.generatedKeys);
    }
    
    // Use the appropriate array based on viewIndex
    const targetArray = viewIndex === 1 ? this.selectedTopicContents1 : this.selectedTopicContents2;
    const nodeNameProp = viewIndex === 1 ? 'nodeName1' : 'nodeName2';
    const nodePathProp = viewIndex === 1 ? 'nodePath1' : 'nodePath2';
    const paragraphProp = viewIndex === 1 ? 'paragraphToHighlight1' : 'paragraphToHighlight2';
    const topicPath = topic.path || topic.name;
    
    // Check if topic is already in the array
    const existingIndex = targetArray.findIndex(t => (t.path || t.name) === topicPath);
    
    if (existingIndex === -1) {
      // Add new topic
      targetArray.push(topic);
    } else {
      // Update existing topic
      targetArray[existingIndex] = topic;
    }
    
    // Set active tab to the newly selected topic
    this.activeTab = existingIndex === -1 ? targetArray.length - 1 : existingIndex;
    
    // Paragraph to highlight: use topic content, or resolve from chart when missing (e.g. sunburst click)
    let paragraphToSet = topic.content ?? topic.value ?? '';
    if (!paragraphToSet && topic.name) {
      const chart = viewIndex === 1 ? this.chartData1 : this.chartData2;
      paragraphToSet = this.getContentFromChartByName(chart, topic.name);
    }
    if (!paragraphToSet && existingIndex >= 0 && targetArray[existingIndex]?.content) {
      paragraphToSet = targetArray[existingIndex].content ?? targetArray[existingIndex].value ?? '';
    }
    
    // Update node name and paragraph to highlight (topic-list, PDF viewer)
    (this as any)[nodeNameProp] = topic.name;
    (this as any)[nodePathProp] = topicPath;
    (this as any)[paragraphProp] = paragraphToSet;
    // Keep selectednodes in sync so topic-list highlighting works for added queries too
    const selectedNodesArray = viewIndex === 1 ? this.selectednodes1 : this.selectednodes2;
    const nameStr = topic?.name ? String(topic.name).trim() : '';
    if (nameStr && !selectedNodesArray.includes(nameStr)) {
      selectedNodesArray.push(nameStr);
      if (viewIndex === 1) {
        this.selectednodes1 = [...this.selectednodes1];
      } else {
        this.selectednodes2 = [...this.selectednodes2];
      }
    }
    this.cdr.markForCheck(); // so pdf-highlighter receives new [text] and updates highlight
    
    // Update chat message path when topic has path (e.g. from sunburst click)
    if (topic.path) {
      const msg = this.chatMessages.find((m: any) => m.role === 'assistant' && m.name === topic.name);
      if (msg) {
        msg.path = topic.path;
      }
    }
    
    // Trigger word cloud rendering for this topic with retry mechanism
    setTimeout(() => {
      this.renderTopicWordCloud(topic);
    }, 150); // Slightly longer initial delay
    
    console.log('Topic selected:', topic, 'View:', viewIndex);
    console.log('Selected topic contents:', targetArray);
    console.log('selectedTopicContents1 length:', this.selectedTopicContents1.length);
    console.log('selectedTopicContents1 data:', this.selectedTopicContents1);
    console.log('paragraphToHighlight1:', this.paragraphToHighlight1);
  }

  // Handle PDF opening for selected topic
  openPdf(topic: any): void {
    // Add logic to open PDF viewer or highlight paragraph
    if (topic && topic.content) {
      // Set paragraph to highlight in PDF viewer
      this.paragraphToHighlight = topic.content;
      console.log('Opening PDF for topic:', topic.name);
    }
  }

  selectedQuery: string = '';

  // Calculate font size for word cloud based on position - varied sizes for cloud effect
  getWordSize(index: number, totalWords: number): number {
    const maxSize = 24;
    const minSize = 11;
    const importance = (totalWords - index) / totalWords;
    // Add some variation for more organic look
    const baseSize = minSize + (maxSize - minSize) * importance;
    const variation = Math.sin(index * 2) * 2; // Add slight variation
    return Math.round(baseSize + variation);
  }

  // Beautiful word cloud renderer with true cloud appearance
  renderBeautifulWordCloud(canvasId: string, keywords: string[]): void {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!canvas) return;

    const container = canvas.parentElement;
    if (container) {
      canvas.width = container.offsetWidth;
      canvas.height = 150;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Prepare word data with varied sizes
    const wordData = keywords.slice(0, 15).map((word, index) => {
      const importance = (keywords.length - index) / keywords.length;
      const fontSize = Math.round(12 + importance * 20);
      return {
        text: word,
        size: fontSize,
        color: this.wordCloudColors[index % this.wordCloudColors.length],
        angle: (Math.random() > 0.7) ? (Math.random() > 0.5 ? -15 : 15) : 0,
        x: 0,
        y: 0,
        width: 0,
        height: 0
      };
    });

    // Calculate text dimensions
    wordData.forEach(word => {
      ctx.font = `bold ${word.size}px Arial, sans-serif`;
      const metrics = ctx.measureText(word.text);
      word.width = metrics.width + 16;
      word.height = word.size + 8;
    });

    // Simple spiral placement algorithm
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const placedWords: typeof wordData = [];

    wordData.forEach((word, index) => {
      let placed = false;
      let angle = 0;
      let radius = 0;

      // Try spiral placement
      for (let i = 0; i < 500 && !placed; i++) {
        angle += 0.3;
        radius = 3 * angle;

        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);

        // Check if word fits in canvas
        if (x - word.width/2 < 0 || x + word.width/2 > canvas.width ||
            y - word.height/2 < 0 || y + word.height/2 > canvas.height) {
          continue;
        }

        // Check collision with other words
        let hasCollision = false;
        for (const placed of placedWords) {
          const dx = Math.abs(x - placed.x);
          const dy = Math.abs(y - placed.y);
          if (dx < (word.width + placed.width) / 2 + 5 &&
              dy < (word.height + placed.height) / 2 + 5) {
            hasCollision = true;
            break;
          }
        }

        if (!hasCollision) {
          word.x = x;
          word.y = y;
          placed = true;
          placedWords.push(word);
        }
      }

      // If still not placed, force placement
      if (!placed) {
        word.x = centerX + (Math.random() - 0.5) * 100;
        word.y = centerY + (Math.random() - 0.5) * 60;
        placedWords.push(word);
      }
    });

    // Draw words
    placedWords.forEach(word => {
      ctx.save();
      ctx.translate(word.x, word.y);
      ctx.rotate((word.angle * Math.PI) / 180);
      
      ctx.font = `bold ${word.size}px Arial, sans-serif`;
      ctx.fillStyle = word.color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Add shadow for depth
      ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;
      
      ctx.fillText(word.text, 0, 0);
      ctx.restore();
    });
  }


  // Sanitize topic name for use as canvas ID
  sanitizeTopicName(topicName: string): string {
    if (!topicName) return 'unknown-topic';
    
    // Replace special characters and spaces with safe alternatives
    return topicName
      .replace(/[^a-zA-Z0-9\s-]/g, '') // Remove special chars except spaces and hyphens
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .trim()
      .toLowerCase();
  }

    // Expand first-level topics and their direct children (subtopics) only
    expandAllTopics(topics: any[]): void {
      if (!topics || topics.length === 0) return;
      
      topics.forEach((topic: any) => {
        // Expand first-level topic
        topic.expanded = true;
        topic.expanded2 = true;
        topic.selected = true;
        
        // Expand direct children (subtopics) but NOT their children (sub-subtopics)
        if (topic.children && topic.children.length > 0) {
          topic.children.forEach((subtopic: any) => {
            subtopic.rexpanded = true;
            subtopic.rexpanded2 = true;
            subtopic.selected = true;
            // Do NOT expand children of subtopics (sub-subtopics)
  
            if (subtopic.children && subtopic.children.length > 0) {
              subtopic.children.forEach((subSubtopic: any) => {
                subSubtopic.rexpanded = true;
                subSubtopic.rexpanded2 = true;
                subSubtopic.selected = true;
                // Do NOT expand children of subtopics (sub-subtopics)

                if (subSubtopic.children && subSubtopic.children.length > 0) {
                  subSubtopic.children.forEach((subSubSubtopic: any) => {
                    subSubSubtopic.rexpanded = true;
                    subSubSubtopic.rexpanded2 = true;
                    subSubSubtopic.selected = true;
                    // Do NOT expand children of subtopics (sub-subtopics)
                  });
                }
              });
            }
          });
        }
      });
    }
  
  predefinedQueries: string[] = [
    'When and where was William Shakespeare born?',
    "Who were Shakespeare's parents, and what is known about his family background?",
    'Whom did Shakespeare marry, and how many children did he have?',
    'What are some of Shakespeare\'s most notable works?',
    'When did Shakespeare die, and where is he buried?',
    
]

  
  colors = [
    { bg: '#fef3c7', text: '#92400e' },
    { bg: '#dbeafe', text: '#1e40af' },
    { bg: '#fed7d7', text: '#c53030' },
    { bg: '#d1fae5', text: '#065f46' },
    { bg: '#fce7f3', text: '#be185d' },
  ];
  
  // function to return style for keyword
  getKeywordStyle(index: number) {
    const color = this.colors[index % this.colors.length]; // cycle colors
    return {
      background: `linear-gradient(135deg, ${color.bg} 0%, ${color.bg}f0 100%)`,
      color: color.text,
      padding: '2px 4px',
      borderRadius: '3px',
      fontSize: '0.85rem',
      fontWeight: '600',
      transition: 'all 0.2s ease',
      cursor: 'pointer'
    };
  }
  

  pdfVisible = false;
  pdfSrc: string | null = null;
  pdfTerms: string[] = [];


  closePdf() {
    this.pdfVisible = false;
  }

  getWordCount(text: string): number {
    if (!text) return 0;
    return text.trim().split(/\s+/).length;
  }
  
  addNote(topic: any) {
    if (topic.newNote && topic.newNote.trim() !== '') {
      if (!topic.notes) {
        topic.notes = [];
      }
      topic.notes.push(topic.newNote.trim());
      topic.newNote = '';
    }
  }
  
  deleteNote(topic: any, index: number) {
    if (topic.notes && topic.notes.length > index) {
      topic.notes.splice(index, 1);
    }
  }
  
  editNote(topic: any, index: number) {
    const updated = prompt('Edit note:', topic.notes[index]);
    if (updated !== null && updated.trim() !== '') {
      topic.notes[index] = updated.trim();
    }
  }

  hasNotes(topic: any): boolean {
    return topic.notes && Array.isArray(topic.notes) && topic.notes.length > 0;
  }

  // Switch query method with default first range selection
  switchToQuery(queryRank: string): void {
    this.selectedQueryRank = queryRank;
    
    // Auto-select first range if this query has no selection but has data
    if (this.selectedBinIndices[queryRank] === null) {
      let hasData = false;
      if (queryRank === '1' && this.hasBinsData()) {
        hasData = true;
      } else if (queryRank === '2' && this.hasBins2Data()) {
        hasData = true;
      } else if (queryRank === '3' && this.hasBins3Data()) {
        hasData = true;
      }
      
      if (hasData) {
        this.selectedBinIndices[queryRank] = 0; // Select first range
        this.selectedBinIndex = 0;
      } else {
        this.selectedBinIndex = null;
      }
    } else {
      // Use existing selection
      this.selectedBinIndex = this.selectedBinIndices[queryRank];
    }
    
    this.applyMultiRangeFilter();
  }

  // Combined method for switching query and selecting bin
  onBinClickWithQuery(queryRank: string, bin: any, index: number, event: Event): void {
    event.stopPropagation();
    
    // Switch to the query first
    this.selectedQueryRank = queryRank;
    
    // Toggle selection for this query
    const currentSelection = this.selectedBinIndices[queryRank];
    if (currentSelection === index) {
      // Deselect if clicking on already selected bin - use same functionality as clear selection
      this.clearQuerySelections(queryRank);
    } else {
      // Select new bin for this query
      this.selectedBinIndices[queryRank] = index;
      this.selectedBinIndex = index;
      this.applyMultiRangeFilter();
    }
  }

  // Single selection method - one selection per query
  onBinClick(bin: any, index: number, event: Event): void {
    event.stopPropagation();
    
    // Toggle selection for current query
    const currentSelection = this.selectedBinIndices[this.selectedQueryRank];
    if (currentSelection === index) {
      // Deselect if clicking on already selected bin - use same functionality as clear selection
      this.clearQuerySelections(this.selectedQueryRank);
    } else {
      // Select new bin for current query
      this.selectedBinIndices[this.selectedQueryRank] = index;
      this.selectedBinIndex = index;
      this.applyMultiRangeFilter();
    }
  }

  isBinSelected(index: number, queryRank: string): boolean {
    return this.selectedBinIndices[queryRank] === index;
  }

  getSelectedRangesCount(queryRank: string): number {
    return this.selectedBinIndices[queryRank] !== null ? 1 : 0;
  }

  getSelectedRangesText(queryRank: string): string {
    return this.selectedBinIndices[queryRank] !== null ? '1 range' : '';
  }

  clearQuerySelections(queryRank: string): void {
    this.selectedBinIndices[queryRank] = null;
    if (this.selectedQueryRank === queryRank) {
      this.selectedBinIndex = null;
      this.selectedColor = ''; // Clear the selected color
    }
    
    // Clear the tree expansion and scores for this query
    this.clearTreeDataForQuery(queryRank);
    
    // Clear filtered data and selected nodes
    this.filteredData = [];
    this.selectednodes = [];
    
    // Refresh chart data
    this.chartData = {...this.chartData};
  }

  clearAllSelections(): void {
    this.selectedBinIndices = { '1': null, '2': null, '3': null };
    this.selectedBinIndex = null;
    this.selectedColor = ''; // Clear the selected color
    
    // Clear all tree data
    this.clearTreeDataForQuery('1');
    this.clearTreeDataForQuery('2');
    this.clearTreeDataForQuery('3');
    
    // Clear filtered data and selected nodes
    this.filteredData = [];
    this.selectednodes = [];
    
    // Refresh chart data
    this.chartData = {...this.chartData};
  }
  
  private clearTreeDataForQuery(queryRank: string): void {
    const clearNodes = (nodes: any[]) => {
      nodes.forEach((node: any) => {
        // Clear expansion state based on query
        if (queryRank === '1') {
          node.expanded = false;
          node.selected = false;
          // Clear scores and rank to remove colors
          node.similarity_score = undefined;
          node.rank = undefined;
        } else if (queryRank === '2') {
          node.expanded2 = false;
          // Clear scores and rank to remove colors
          node.similarity_score2 = undefined;
          node.rank2 = undefined;
        } else if (queryRank === '3') {
          node.expanded3 = false;
          // Clear scores and rank to remove colors
          node.similarity_score3 = undefined;
          node.rank3 = undefined;
        }
        
        // Recursively clear children
        if (node.children && node.children.length > 0) {
          clearNodes(node.children);
        }
      });
    };
    
    if (this.chartData && this.chartData.children) {
      clearNodes(this.chartData.children);
    }
  }

  applyMultiRangeFilter(): void {
    let selectedData: any[] = [];
    const dataByPath = new Map<string, any>();

    // Collect data from Q1 if selected
    if (this.selectedBinIndices['1'] !== null && this.selectedQueryRank === '1') {
      const q1Data = [...this.bins[this.selectedBinIndices['1']].data];
      q1Data.forEach(item => {
        const key = item.topic_path || item.name;
        if (!dataByPath.has(key)) {
          dataByPath.set(key, { ...item, queries: ['1'] });
        } else {
          dataByPath.get(key).queries.push('1');
        }
      });
    }

    // Collect data from Q2 if selected
    if (this.selectedBinIndices['2'] !== null && this.selectedQueryRank === '2') {
      const q2Data = [...this.bins2[this.selectedBinIndices['2']].data];
      q2Data.forEach(item => {
        const key = item.topic_path || item.name;
        if (!dataByPath.has(key)) {
          dataByPath.set(key, { ...item, queries: ['2'] });
        } else {
          dataByPath.get(key).queries.push('2');
        }
      });
    }

    // Collect data from Q3 if selected
    if (this.selectedBinIndices['3'] !== null) {
      const q3Data = [...this.bins3[this.selectedBinIndices['3']].data];
      q3Data.forEach(item => {
        const key = item.topic_path || item.name;
        if (!dataByPath.has(key)) {
          dataByPath.set(key, { ...item, queries: ['3'] });
        } else {
          dataByPath.get(key).queries.push('3');
        }
      });
    }

    // Convert map to array
    selectedData = Array.from(dataByPath.values());

    // If no data selected, return early
    if (selectedData.length === 0) {
      this.filteredData = [];
      return;
    }

    // Set color based on current selected query
    if (this.selectedQueryRank === '1' && this.selectedBinIndex !== null) {
      this.selectedColor = this.bins[this.selectedBinIndex].color;
    } else if (this.selectedQueryRank === '2' && this.selectedBinIndex !== null) {
      this.selectedColor = this.bins2[this.selectedBinIndex].color;
    } else if (this.selectedQueryRank === '3' && this.selectedBinIndex !== null) {
      this.selectedColor = this.bins3[this.selectedBinIndex].color;
    }

    // Sort by similarity score and take top N
    this.filteredData = selectedData
      .sort((a: any, b: any) => {
        const scoreA = a.similarity_score || 0;
        const scoreB = b.similarity_score || 0;
        return scoreB - scoreA;
      })
      .slice(0, this.selectedTopN);

    console.log('Filtered data:', this.filteredData.length, 'items from queries:', 
                Array.from(new Set(selectedData.flatMap(d => d.queries))).join(', '));
    
                console.log(this.selectedBinIndices,this.selectedQueryRank,this.selectedBinIndex,154)
    // Update tree with data from all selected queries
    if (this.selectedBinIndices['1'] !== null && this.selectedQueryRank === '1') {
      const q1FilteredData = this.filteredData.filter(d => d.queries.includes('1'));
      this.updateSimilarityScores(this.chartData.children, q1FilteredData, '1');
    }
    if (this.selectedBinIndices['2'] !== null && this.selectedQueryRank === '2') {
      const q2FilteredData = this.filteredData.filter(d => d.queries.includes('2'));
      this.updateSimilarityScores(this.chartData.children, q2FilteredData, '2');
    }
    if (this.selectedBinIndices['3'] !== null) {
      const q3FilteredData = this.filteredData.filter(d => d.queries.includes('3'));
      this.updateSimilarityScores(this.chartData.children, q3FilteredData, '3');
    }
    
    this.chartData = {...this.chartData};
  }

  // Helper methods for template
  getQueryText(queryNumber: number): string {
    return `Query ${queryNumber}`;
  }

  getCurrentQueryMessage(): string {
    switch(this.selectedQueryRank) {
      case '1':
        return this.selectedUSerMessage || '';
      case '2':
        return this.selectedUSerMessage2 || '';
      case '3':
        return this.selectedUSerMessage3 || '';
      default:
        return this.selectedUSerMessage || '';
    }
  }

  /** Names to pass to sunburst for highlighting (e.g. top-5 for added queries). */
  getScoredNodeNamesForSunburst(viewIndex: 1 | 2): string[] {
    const list = viewIndex === 1 ? this.selectedTopicContents1 : this.selectedTopicContents2;
    if (!list || !Array.isArray(list)) return [];
    return list.map((t: any) => (t && t.name != null) ? String(t.name).trim() : '').filter((n: string) => n.length > 0);
  }

  /** Get structure slot already assigned to this query index (same as main-content). */
  private getStructureSlotForQueryIndex(queryIndex: number): '1' | '2' | '3' | null {
    const existing = this.queryIndexToStructureSlot[queryIndex];
    if (existing) return existing;
    const entry = Object.entries(this.queryIndexMapping).find(([, idx]) => idx === queryIndex);
    if (!entry) return null;
    const slot = entry[0];
    if (slot === '1' || slot === '2' || slot === '3') return slot;
    return null;
  }

  /** Assign a structure slot (Q1/Q2/Q3) for this query index; returns null if all slots taken (same as main-content). */
  private assignStructureSlotForQueryIndex(queryIndex: number): '1' | '2' | '3' | null {
    const existing = this.getStructureSlotForQueryIndex(queryIndex);
    if (existing) {
      this.queryIndexToStructureSlot[queryIndex] = existing;
      this.queryIndexMapping[existing] = queryIndex;
      return existing;
    }
    const slots: Array<'1' | '2' | '3'> = ['1', '2', '3'];
    const freeSlot = slots.find(s => this.queryIndexMapping[s] === undefined || this.queryIndexMapping[s] === null);
    if (!freeSlot) return null;
    this.queryIndexToStructureSlot[queryIndex] = freeSlot;
    this.queryIndexMapping[freeSlot] = queryIndex;
    return freeSlot;
  }

  /** Release structure slot when a query is deselected (same as main-content). */
  private releaseStructureSlotForQueryIndex(queryIndex: number): void {
    const slot = this.getStructureSlotForQueryIndex(queryIndex);
    if (slot) {
      delete this.queryIndexMapping[slot];
    }
    delete this.queryIndexToStructureSlot[queryIndex];
  }

  getCurrentQueryColor(): string {
    switch(this.selectedQueryRank) {
      case '1':
        return this.q1Color;
      case '2':
        return this.q2Color;
      case '3':
        return this.q3Color;
      default:
        return this.q1Color;
    }
  }



  hasAnyQueryData(): boolean {
    return this.hasBinsData() || this.hasBins2Data() || this.hasBins3Data();
  }

  hasBinsData(): boolean {
    const result = this.bins && this.bins.some((bin: any) => bin.count > 0);
    return result;
  }

  hasBins2Data(): boolean {
    const result = this.bins2 && this.bins2.some((bin: any) => bin.count > 0);
    if (this.bins2?.length) {
    }
    return result;
  }

  hasBins3Data(): boolean {
    const result = this.bins3 && this.bins3.some((bin: any) => bin.count > 0);
    if (this.bins3?.length) {
    }
    return result;
  }

  // Filter-related properties and methods
  selectedTopN: number = 5;
  topNOptions: number[] = [5, 10, 20];
  filteredData: any[] = [];
  
  // Score range selection - per query
  q1MinScore: number = 0;
  q1MaxScore: number = 100;
  q2MinScore: number = 0;
  q2MaxScore: number = 100;
  q3MinScore: number = 0;
  q3MaxScore: number = 100;
  topN: number = 5;
  
  // Filter enable/disable checkboxes
  q1FilterEnabled: boolean = true;
  q2FilterEnabled: boolean = true;
  q3FilterEnabled: boolean = true;

  // Update query range for a specific query - no auto-apply, wait for Apply button
  updateQueryRange(queryRank: string): void {
    // Ensure min is not greater than max
    if (queryRank === '1') {
      if (this.q1MinScore > this.q1MaxScore) {
        this.q1MinScore = this.q1MaxScore;
      }
    } else if (queryRank === '2') {
      if (this.q2MinScore > this.q2MaxScore) {
        this.q2MinScore = this.q2MaxScore;
      }
    } else if (queryRank === '3') {
      if (this.q3MinScore > this.q3MaxScore) {
        this.q3MinScore = this.q3MaxScore;
      }
    }
  }

  // Apply score range filter for a specific query
  applyScoreRangeFilter(queryRank: string): void {
    // Check if filter is enabled for this query
    const isEnabled = queryRank === '1' ? this.q1FilterEnabled :
                      queryRank === '2' ? this.q2FilterEnabled :
                      this.q3FilterEnabled;
    
    if (!isEnabled) {
      console.log(`Filter for Q${queryRank} is disabled, skipping`);
      return;
    }
    
    let minScore = 0;
    let maxScore = 100;
    
    // Get the min/max for the specific query
    if (queryRank === '1') {
      minScore = this.q1MinScore;
      maxScore = this.q1MaxScore;
    } else if (queryRank === '2') {
      minScore = this.q2MinScore;
      maxScore = this.q2MaxScore;
    } else if (queryRank === '3') {
      minScore = this.q3MinScore;
      maxScore = this.q3MaxScore;
    }
    
    // Ensure min is not greater than max
    if (minScore > maxScore) {
      if (queryRank === '1') {
        this.q1MinScore = this.q1MaxScore;
      } else if (queryRank === '2') {
        this.q2MinScore = this.q2MaxScore;
      } else if (queryRank === '3') {
        this.q3MinScore = this.q3MaxScore;
      }
      minScore = maxScore;
    }
    
    // Update the selectedTopN with the user's choice
    this.selectedTopN = this.topN;
    
    // Apply the filter based on the score range
    this.applyScoreRangeFilterToData(queryRank, minScore, maxScore);
    
    console.log(`Applying score range filter for Q${queryRank} between ${minScore} and ${maxScore}`);
  }

  // Apply score range filter to data
  applyScoreRangeFilterToData(queryRank: string, minScore: number, maxScore: number): void {
    // First, clear all previous selections
    this.clearPreviousSelections();
    
    // Get data based on query
    let data: any[] = [];
    
    if (queryRank === '1' && this.bins.length > 0) {
      data = this.bins.flatMap((bin: any) => bin.data || []);
    } else if (queryRank === '2' && this.bins2.length > 0) {
      data = this.bins2.flatMap((bin: any) => bin.data || []);
    } else if (queryRank === '3' && this.bins3.length > 0) {
      data = this.bins3.flatMap((bin: any) => bin.data || []);
    }
    
    // Filter data based on score range
    const filteredData = data.filter(item => {
      const score = queryRank === '1' ? item.similarity_score : 
                    queryRank === '2' ? item.similarity_score2 : 
                    item.similarity_score3;
      return score >= minScore && score <= maxScore;
    });
    
    // Sort by score and take top N
    const sortedData = filteredData.sort((a, b) => {
      const scoreA = queryRank === '1' ? a.similarity_score : 
                     queryRank === '2' ? a.similarity_score2 : 
                     a.similarity_score3;
      const scoreB = queryRank === '1' ? b.similarity_score : 
                     queryRank === '2' ? b.similarity_score2 : 
                     b.similarity_score3;
      return scoreB - scoreA;
    }).slice(0, this.topN);
    
    console.log(`Filtered data for Q${queryRank}:`, sortedData.length, 'items');
    
    // Update the structure view with filtered data
    this.filteredData = sortedData;
    this.updateSimilarityScores(this.chartData.children, this.filteredData, queryRank);
  }

  // Clear previous selections from structure view
  clearPreviousSelections(): void {
    // Clear all bin selections
    this.selectedBinIndices = { '1': null, '2': null, '3': null };
    this.selectedBinIndex = null;
    this.selectedColor = '';
    
    // Clear tree data for all queries
    this.clearTreeDataForQuery('1');
    this.clearTreeDataForQuery('2');
    this.clearTreeDataForQuery('3');
    
    console.log('Previous selections cleared');
  }

  // Drag and drop handlers for reordering messages
  draggedIndex: number | null = null;

  onDragStart(event: DragEvent, index: number): void {
    this.draggedIndex = index;
    event.dataTransfer!.effectAllowed = 'move';
    (event.target as HTMLElement).classList.add('dragging');
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.dataTransfer!.dropEffect = 'move';
  }

  onDrop(event: DragEvent, dropIndex: number): void {
    event.preventDefault();
    
    if (this.draggedIndex === null || this.draggedIndex === dropIndex) {
      return;
    }

    // Reorder the array
    const messages = [...this.chatMessages];
    const draggedMessage = messages[this.draggedIndex];
    
    // Remove the dragged item
    messages.splice(this.draggedIndex, 1);
    
    // Insert at new position
    messages.splice(dropIndex, 0, draggedMessage);
    
    // Update the array
    this.chatMessages = messages;
    this.draggedIndex = null;
    
    console.log('Messages reordered:', this.chatMessages.length);
  }

  onDragEnd(event: DragEvent): void {
    (event.target as HTMLElement).classList.remove('dragging');
    this.draggedIndex = null;
  }

  // Toggle query filter on/off
  toggleQueryFilter(queryRank: string): void {
    const isEnabled = queryRank === '1' ? this.q1FilterEnabled :
                      queryRank === '2' ? this.q2FilterEnabled :
                      this.q3FilterEnabled;
    
    if (!isEnabled) {
      // Filter is being disabled, clear its effect
      this.clearTreeDataForQuery(queryRank);
      console.log(`Q${queryRank} filter disabled`);
    } else {
      // Filter is being enabled, apply it if there's a current range
      const minScore = queryRank === '1' ? this.q1MinScore :
                       queryRank === '2' ? this.q2MinScore :
                       this.q3MaxScore;
      const maxScore = queryRank === '1' ? this.q1MaxScore :
                       queryRank === '2' ? this.q2MaxScore :
                       this.q3MaxScore;
      
      // Apply the filter with current range
      this.applyScoreRangeFilterToData(queryRank, minScore, maxScore);
      console.log(`Q${queryRank} filter enabled`);
    }
  }


  

escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // escape special regex chars
}

  confirmChunks() {
    // Handle chunk confirmation logic
    console.log(`Selected ${this.numberOfChunks} chunks`);
    this.showChunkPopup = false;
  }

   buildHierarchy(data: any[]): any {
    const root: any = { name: 'root', children: [] };
  
    for (const item of data) {
      const pathParts = item.topic_path.split('/');
      let currentLevel = root;
  
      for (let i = 0; i < pathParts.length; i++) {
        const nodeName: any = pathParts[i];
        if (!currentLevel.children) currentLevel.children = [];
  
        let existingNode: any = currentLevel.children.find((child: any) => child.name === nodeName);
        if (!existingNode) {
          existingNode = { name: nodeName };
          currentLevel.children.push(existingNode);
        }
  
        currentLevel = existingNode;
  
        // If it's the last part (leaf), add value
        if (i === pathParts.length - 1) {
          existingNode.value = item.similarity_score; // or item.rank
        }
      }
    }
  
    return root;
  }

    bins: any = [
    { label: '75 - 100', count: 0, data: [], color: 'green'},
    { label: '65 - 75', count: 0, data: [], color: 'orange'},
    { label: '0 - 65', count: 0, data: [], color: 'red'}
  ];


    bins2: any = [
    { label: '75 - 100', count: 0, data: [], color: 'green'},
    { label: '65 - 75', count: 0, data: [], color: 'orange'},
    { label: '0 - 65', count: 0, data: [], color: 'red'}
  ];

    bins3: any = [
    { label: '75 - 100', count: 0, data: [], color: 'green'},
    { label: '65 - 75', count: 0, data: [], color: 'orange'},
    { label: '0 - 65', count: 0, data: [], color: 'red'}
  ];

  // Dynamic bins structure for queries beyond the first 3
  allBins: { [queryIndex: number]: any[] } = {};


  showTreeMap: boolean = false;

toggleChartView() {
  this.showTreeMap = !this.showTreeMap;
}

private getApiQuestion(queryIndex: number, viewIndex: 1 | 2): string {
  const apiQuestions = viewIndex === 1 ? this.apiQuestions1 : this.apiQuestions2;
  return apiQuestions[queryIndex] || this.questions[queryIndex] || '';
}

private getApiQuestionForDisplayQuery(query: string, viewIndex: 1 | 2): string {
  const queryIndex = this.questions.indexOf(query);
  return queryIndex >= 0 ? this.getApiQuestion(queryIndex, viewIndex) : query;
}

private getActiveApiQuestion(viewIndex: 1 | 2): string {
  const mappedQueryIndex = this.queryIndexMapping[this.selectedQueryRank];
  if (mappedQueryIndex !== undefined && mappedQueryIndex !== null) {
    return this.getApiQuestion(mappedQueryIndex, viewIndex);
  }

  let displayQuery = this.selectedUSerMessage;
  if (this.selectedQueryRank === '2' && this.selectedUSerMessage2) {
    displayQuery = this.selectedUSerMessage2;
  } else if (this.selectedQueryRank === '3' && this.selectedUSerMessage3) {
    displayQuery = this.selectedUSerMessage3;
  }

  return this.getApiQuestionForDisplayQuery(displayQuery || '', viewIndex);
}

private getAskQueryOptions(viewIndex: 1 | 2): { german?: boolean; language?: string } | undefined {
  // Request bilingual summaries whenever German comparison mode is active
  if (this.queryApi2 === 'german') {
    return { german: true, language: 'german' };
  }
  const queryApi = viewIndex === 1 ? this.queryApi1 : this.queryApi2;
  return queryApi === 'german' ? { german: true, language: 'german' } : undefined;
}

private sendSimilarityQueryForView(msg: string, viewIndex: 1 | 2) {
  const queryApi = viewIndex === 1 ? this.queryApi1 : this.queryApi2;
  if (queryApi === 'german') {
    return this.openaiService.sendQueryGerman(msg, this.numberOfChunks);
  }
  if (queryApi === 'hamlet') {
    return viewIndex === 1
      ? this.openaiService.findSimilarHamlet1(msg, this.numberOfChunks)
      : this.openaiService.findSimilarHamlet2(msg, this.numberOfChunks);
  }
  return viewIndex === 1
    ? this.openaiService.sendQuery(msg, this.numberOfChunks)
    : this.openaiService.sendQuery2(msg, this.numberOfChunks);
}

private parseBilingualSummary(content: string, _viewIndex?: 1 | 2): { english: string; german: string } | null {
  if (!content?.trim()) return null;

  const text = content.trim();
  const englishMatch = text.match(
    /(?:^|\n)\s*(?:\*\*|__)?(?:English|Englisch)(?:\s+Summary)?(?:\*\*|__)?\s*:?\s*([\s\S]*?)(?=\n\s*(?:\*\*|__)?(?:German|Deutsch|Deutsche)(?:\s+Summary)?(?:\*\*|__)?\s*:?|$)/i
  );
  const germanMatch = text.match(
    /(?:^|\n)\s*(?:\*\*|__)?(?:German|Deutsch|Deutsche(?:\s+Übersetzung)?)(?:\s+Summary)?(?:\*\*|__)?\s*:?\s*([\s\S]*)/i
  );

  const english = englishMatch?.[1]?.trim().replace(/^\*\*|\*\*$/g, '') || '';
  const german = germanMatch?.[1]?.trim().replace(/^\*\*|\*\*$/g, '') || '';

  if (!english && !german) return null;
  return { english, german };
}

hasBilingualTabs(message: { summaryByLanguage?: { english?: string; german?: string } | null }): boolean {
  const summary = message?.summaryByLanguage;
  return !!(summary && (summary.english || summary.german));
}

getDefaultSummaryLanguage(summaryByLanguage: { english?: string; german?: string } | null): 'english' | 'german' {
  if (!summaryByLanguage) return 'english';
  if (summaryByLanguage.english) return 'english';
  if (summaryByLanguage.german) return 'german';
  return 'english';
}

setSummaryLanguage(message: { summaryLanguage?: string; summaryByLanguage?: { english?: string; german?: string } }, language: 'english' | 'german'): void {
  if (language === 'german' && !message.summaryByLanguage?.german) return;
  if (language === 'english' && !message.summaryByLanguage?.english) return;
  message.summaryLanguage = language;
}

getSummaryText(message: {
  content?: string;
  summaryLanguage?: string;
  summaryByLanguage?: { english?: string; german?: string } | null;
}): string {
  if (!message.summaryByLanguage) return message.content || '';

  const isGerman = message.summaryLanguage === 'german';
  const primary = isGerman ? message.summaryByLanguage.german : message.summaryByLanguage.english;
  if (primary) return primary;

  const fallback = isGerman ? message.summaryByLanguage.english : message.summaryByLanguage.german;
  return fallback || message.content || '';
}

  sendMessage(msg: any) {
    if (this.userMessage.trim() || this.selectedQuery) {
      // Check if this is a new query (not in predefinedQueries)
      const isNewQuery = !this.questions.includes(msg.trim());
      
      // If it's a new query, add it to predefinedQueries at the end
      if (isNewQuery) {
        this.questions.push(msg.trim());
        this.apiQuestions1.push(msg.trim());
        this.apiQuestions2.push(msg.trim());
        const newQueryIndex = this.questions.length - 1;
        
        // Assign a default color from the colorPalette
        if (!this.queryColors[newQueryIndex]) {
          this.queryColors[newQueryIndex] = this.colorPalette[newQueryIndex % this.colorPalette.length];
        }
        
        // Initialize bins for the new query (will be populated after API response)
        if (!this.allBins[newQueryIndex]) {
          this.allBins[newQueryIndex] = [
            { label: "75 - 100", count: 0, data: [], color: 'green' },
            { label: "65 - 75", count: 0, data: [], color: 'orange' },
            { label: "0 - 65", count: 0, data: [], color: 'red' }
          ];
        }
      }
      
      // Get response from OpenAI
      if(this.selectedUSerMessage && this.selectedUSerMessage2) {
        this.selectedUSerMessage3 = msg;
      } else if(this.selectedUSerMessage) {
        this.selectedUSerMessage2 = msg;
        // this.fuzzyPopup = true
      } else {
        this.selectedUSerMessage = msg
      }
      // let msg: any = this.selectedUSerMessage3 ? this.selectedUSerMessage3 : (this.selectedUSerMessage2 ? this.selectedUSerMessage2 : this.selectedUSerMessage)
      let query = this.selectedUSerMessage3 ? 'Q 3' : (this.selectedUSerMessage2 ? 'Q 2' : 'Q 1')
      // this.chatMessages.push({ role: 'user', content: msg,no: query });
      this.selectednodes = []
      const displayQuery = msg.trim();
      const apiMessage1 = this.getApiQuestionForDisplayQuery(displayQuery, 1);
      const apiMessage2 = this.getApiQuestionForDisplayQuery(displayQuery, 2);
      // if(!this.fuzzyPopup) {
        console.log(this.selectedUSerMessage2, this.selectedUSerMessage3,this.selectedUSerMessage,1105)
      if(!this.selectedUSerMessage2 && !this.selectedUSerMessage3) {
        
        // First API call for view 1
        this.sendSimilarityQueryForView(apiMessage1, 1).subscribe((response: any) => {
            this.querysent = true
            console.log(this.buildHierarchy(response.results))
            this.heatmapdata = this.buildHierarchy(response.results);

            const buckets: any = {
  "75-100": [],
  "65-75": [],
  "0-65": []
};

this.bins[0] = {
  label: "75 - 100",
  count: response.results.filter((d: any) => d.similarity_score >= 75 && d.similarity_score <= 100).length,
  data: response.results.filter((d: any) => d.similarity_score >= 75 && d.similarity_score <= 100),
  color: 'green'
};

this.bins[1] = {
  label: "65 - 75",
  count: response.results.filter((d: any) => d.similarity_score >= 65 && d.similarity_score < 75).length,
  data: response.results.filter((d: any) => d.similarity_score >= 65 && d.similarity_score < 75),
  color: 'orange'
};

this.bins[2] = {
  label: "0 - 65",
  count: response.results.filter((d: any) => d.similarity_score >= 0 && d.similarity_score < 65).length,
  data: response.results.filter((d: any) => d.similarity_score >= 0 && d.similarity_score < 65),
  color: 'red'
};

// If it's a new query, initialize or update the allBins structure with view 1 data (tag with _sourceVersion: 1 for top-5-per-version)
if (isNewQuery) {
  const newQueryIndex = this.questions.length - 1;
  const tagV1 = (d: any) => ({ ...d, _sourceVersion: 1 });
  if (!this.allBins[newQueryIndex]) {
    this.allBins[newQueryIndex] = [
      {
        label: "75 - 100",
        count: response.results.filter((d: any) => d.similarity_score >= 75 && d.similarity_score <= 100).length,
        data: response.results.filter((d: any) => d.similarity_score >= 75 && d.similarity_score <= 100).map(tagV1),
        color: 'green'
      },
      {
        label: "65 - 75",
        count: response.results.filter((d: any) => d.similarity_score >= 65 && d.similarity_score < 75).length,
        data: response.results.filter((d: any) => d.similarity_score >= 65 && d.similarity_score < 75).map(tagV1),
        color: 'orange'
      },
      {
        label: "0 - 65",
        count: response.results.filter((d: any) => d.similarity_score >= 0 && d.similarity_score < 65).length,
        data: response.results.filter((d: any) => d.similarity_score >= 0 && d.similarity_score < 65).map(tagV1),
        color: 'red'
      }
    ];
  } else {
    const view1Bin0 = response.results.filter((d: any) => d.similarity_score >= 75 && d.similarity_score <= 100).map(tagV1);
    const view1Bin1 = response.results.filter((d: any) => d.similarity_score >= 65 && d.similarity_score < 75).map(tagV1);
    const view1Bin2 = response.results.filter((d: any) => d.similarity_score >= 0 && d.similarity_score < 65).map(tagV1);
    const mergeData = (existing: any[], newData: any[]) => {
      const merged = [...existing];
      const existingPaths = new Set(existing.map((d: any) => d.topic_path || d.content));
      newData.forEach((item: any) => {
        const path = item.topic_path || item.content;
        if (!existingPaths.has(path)) {
          merged.push(item);
          existingPaths.add(path);
        }
      });
      return merged;
    };
    this.allBins[newQueryIndex][0].data = mergeData(this.allBins[newQueryIndex][0].data, view1Bin0);
    this.allBins[newQueryIndex][0].count = this.allBins[newQueryIndex][0].data.length;
    this.allBins[newQueryIndex][1].data = mergeData(this.allBins[newQueryIndex][1].data, view1Bin1);
    this.allBins[newQueryIndex][1].count = this.allBins[newQueryIndex][1].data.length;
    this.allBins[newQueryIndex][2].data = mergeData(this.allBins[newQueryIndex][2].data, view1Bin2);
    this.allBins[newQueryIndex][2].count = this.allBins[newQueryIndex][2].data.length;
  }
}

console.log(buckets);

      //  this.switchToQuery('1');

        // this.updateSimilarityScores(this.chartData.children, response.results, false )
        this.chartData1 = {...this.chartData1}
        this.chartData = {...this.chartData1}
        console.log(this.chartData)
  
        this.barChartValue = response.results;
        // this.queryResults1 = response.results || [];
        const value = this.groupScoresByPath(response.results)
        console.log(this.barChartValue,value)
        this.userMessage = ''; // Clear input
        });

        // Second API call for view 2
        this.sendSimilarityQueryForView(apiMessage2, 2).subscribe((response2: any) => {
          this.querysent = true
          console.log(this.buildHierarchy(response2.results))
          this.heatmapdata = this.buildHierarchy(response2.results);

          const buckets: any = {
"75-100": [],
"65-75": [],
"0-65": []
};

this.bins[0] = {
label: "75 - 100",
count: response2.results.filter((d: any) => d.similarity_score >= 75 && d.similarity_score <= 100).length,
data: response2.results.filter((d: any) => d.similarity_score >= 75 && d.similarity_score <= 100),
color: 'green'
};

this.bins[1] = {
label: "65 - 75",
count: response2.results.filter((d: any) => d.similarity_score >= 65 && d.similarity_score < 75).length,
data: response2.results.filter((d: any) => d.similarity_score >= 65 && d.similarity_score < 75),
color: 'orange'
};

this.bins[2] = {
label: "0 - 65",
count: response2.results.filter((d: any) => d.similarity_score >= 0 && d.similarity_score < 65).length,
data: response2.results.filter((d: any) => d.similarity_score >= 0 && d.similarity_score < 65),
color: 'red'
};

// If it's a new query, append view 2 data with _sourceVersion: 2 (top-5-per-version)
if (isNewQuery) {
const newQueryIndex = this.questions.length - 1;
if (this.allBins[newQueryIndex]) {
  const tagV2 = (d: any) => ({ ...d, _sourceVersion: 2 });
  const view2Bin0 = response2.results.filter((d: any) => d.similarity_score >= 75 && d.similarity_score <= 100).map(tagV2);
  const view2Bin1 = response2.results.filter((d: any) => d.similarity_score >= 65 && d.similarity_score < 75).map(tagV2);
  const view2Bin2 = response2.results.filter((d: any) => d.similarity_score >= 0 && d.similarity_score < 65).map(tagV2);
  this.allBins[newQueryIndex][0].data = [...this.allBins[newQueryIndex][0].data, ...view2Bin0];
  this.allBins[newQueryIndex][0].count = this.allBins[newQueryIndex][0].data.length;
  this.allBins[newQueryIndex][1].data = [...this.allBins[newQueryIndex][1].data, ...view2Bin1];
  this.allBins[newQueryIndex][1].count = this.allBins[newQueryIndex][1].data.length;
  this.allBins[newQueryIndex][2].data = [...this.allBins[newQueryIndex][2].data, ...view2Bin2];
  this.allBins[newQueryIndex][2].count = this.allBins[newQueryIndex][2].data.length;
} else {
  const tagV2Init = (d: any) => ({ ...d, _sourceVersion: 2 });
  this.allBins[newQueryIndex] = [
    {
      label: "75 - 100",
      count: response2.results.filter((d: any) => d.similarity_score >= 75 && d.similarity_score <= 100).length,
      data: response2.results.filter((d: any) => d.similarity_score >= 75 && d.similarity_score <= 100).map(tagV2Init),
      color: 'green'
    },
    {
      label: "65 - 75",
      count: response2.results.filter((d: any) => d.similarity_score >= 65 && d.similarity_score < 75).length,
      data: response2.results.filter((d: any) => d.similarity_score >= 65 && d.similarity_score < 75).map(tagV2Init),
      color: 'orange'
    },
    {
      label: "0 - 65",
      count: response2.results.filter((d: any) => d.similarity_score >= 0 && d.similarity_score < 65).length,
      data: response2.results.filter((d: any) => d.similarity_score >= 0 && d.similarity_score < 65).map(tagV2Init),
      color: 'red'
    }
  ];
}
}

console.log(buckets);

      //  this.switchToQuery('1');

      // this.updateSimilarityScores(this.chartData.children, response.results, false )
      this.chartData2 = {...this.chartData2}
      console.log(this.chartData)

      this.barChartValue = response2.results;
      // this.queryResults2 = response2.results || [];
      const value = this.groupScoresByPath(response2.results)
      console.log(this.barChartValue,value)
      this.userMessage = ''; // Clear input
      });
      } else if (this.selectedUSerMessage2 && !this.selectedUSerMessage3) {
        // First API call for view 1
        this.sendSimilarityQueryForView(apiMessage1, 1).subscribe((response: any) => {

          this.bins2[0] = {
  label: "75 - 100",
  count: response.results.filter((d: any) => d.similarity_score >= 75 && d.similarity_score <= 100).length,
  data: response.results.filter((d: any) => d.similarity_score >= 75 && d.similarity_score <= 100),
  color: 'green'
};

this.bins2[1] = {
  label: "65 - 75",
  count: response.results.filter((d: any) => d.similarity_score >= 65 && d.similarity_score < 75).length,
  data: response.results.filter((d: any) => d.similarity_score >= 65 && d.similarity_score < 75),
  color: 'orange'
};

this.bins2[2] = {
  label: "0 - 65",
  count: response.results.filter((d: any) => d.similarity_score >= 0 && d.similarity_score < 65).length,
  data: response.results.filter((d: any) => d.similarity_score >= 0 && d.similarity_score < 65),
  color: 'red'
};

if (isNewQuery) {
  const newQueryIndex = this.questions.length - 1;
  const tagV1 = (d: any) => ({ ...d, _sourceVersion: 1 });
  if (!this.allBins[newQueryIndex]) {
    this.allBins[newQueryIndex] = [
      {
        label: "75 - 100",
        count: response.results.filter((d: any) => d.similarity_score >= 75 && d.similarity_score <= 100).length,
        data: response.results.filter((d: any) => d.similarity_score >= 75 && d.similarity_score <= 100).map(tagV1),
        color: 'green'
      },
      {
        label: "65 - 75",
        count: response.results.filter((d: any) => d.similarity_score >= 65 && d.similarity_score < 75).length,
        data: response.results.filter((d: any) => d.similarity_score >= 65 && d.similarity_score < 75).map(tagV1),
        color: 'orange'
      },
      {
        label: "0 - 65",
        count: response.results.filter((d: any) => d.similarity_score >= 0 && d.similarity_score < 65).length,
        data: response.results.filter((d: any) => d.similarity_score >= 0 && d.similarity_score < 65).map(tagV1),
        color: 'red'
      }
    ];
  } else {
    const view1Bin0 = response.results.filter((d: any) => d.similarity_score >= 75 && d.similarity_score <= 100).map(tagV1);
    const view1Bin1 = response.results.filter((d: any) => d.similarity_score >= 65 && d.similarity_score < 75).map(tagV1);
    const view1Bin2 = response.results.filter((d: any) => d.similarity_score >= 0 && d.similarity_score < 65).map(tagV1);
    const mergeData = (existing: any[], newData: any[]) => {
      const merged = [...existing];
      const existingPaths = new Set(existing.map((d: any) => d.topic_path || d.content));
      newData.forEach((item: any) => {
        const path = item.topic_path || item.content;
        if (!existingPaths.has(path)) {
          merged.push(item);
          existingPaths.add(path);
        }
      });
      return merged;
    };
    this.allBins[newQueryIndex][0].data = mergeData(this.allBins[newQueryIndex][0].data, view1Bin0);
    this.allBins[newQueryIndex][0].count = this.allBins[newQueryIndex][0].data.length;
    this.allBins[newQueryIndex][1].data = mergeData(this.allBins[newQueryIndex][1].data, view1Bin1);
    this.allBins[newQueryIndex][1].count = this.allBins[newQueryIndex][1].data.length;
    this.allBins[newQueryIndex][2].data = mergeData(this.allBins[newQueryIndex][2].data, view1Bin2);
    this.allBins[newQueryIndex][2].count = this.allBins[newQueryIndex][2].data.length;
  }
}

        // this.switchToQuery('2');
        this.chartData1 = {...this.chartData1}
        this.chartData = {...this.chartData1}
        this.heatmapdata = this.buildHierarchy(response.results);
        console.log(this.chartData)
        this.barChartValue2 = response.results
        this.queryResults1 = response.results || [];
        console.log(this.barChartValue)
  
        this.userMessage = ''; // Clear input
         });

        // Second API call for view 2
        this.sendSimilarityQueryForView(apiMessage2, 2).subscribe((response2: any) => {
          // Store version 2 results in queryResults2
          // this.queryResults2 = response2.results || [];
          
          // If it's a new query, append view 2 data with _sourceVersion: 2 (top-5-per-version)
          if (isNewQuery) {
            const newQueryIndex = this.questions.length - 1;
            if (this.allBins[newQueryIndex]) {
              const tagV2 = (d: any) => ({ ...d, _sourceVersion: 2 });
              const view2Bin0 = response2.results.filter((d: any) => d.similarity_score >= 75 && d.similarity_score <= 100).map(tagV2);
              const view2Bin1 = response2.results.filter((d: any) => d.similarity_score >= 65 && d.similarity_score < 75).map(tagV2);
              const view2Bin2 = response2.results.filter((d: any) => d.similarity_score >= 0 && d.similarity_score < 65).map(tagV2);
              this.allBins[newQueryIndex][0].data = [...this.allBins[newQueryIndex][0].data, ...view2Bin0];
              this.allBins[newQueryIndex][0].count = this.allBins[newQueryIndex][0].data.length;
              this.allBins[newQueryIndex][1].data = [...this.allBins[newQueryIndex][1].data, ...view2Bin1];
              this.allBins[newQueryIndex][1].count = this.allBins[newQueryIndex][1].data.length;
              this.allBins[newQueryIndex][2].data = [...this.allBins[newQueryIndex][2].data, ...view2Bin2];
              this.allBins[newQueryIndex][2].count = this.allBins[newQueryIndex][2].data.length;
            }
          }
          
          // Update version 2 chart data if needed
          if (response2.results && response2.results.length > 0) {
            this.heatmapdata = this.buildHierarchy(response2.results);
            this.chartData2 = {...this.chartData2};
          }
          
          console.log('Version 2 query results:', this.queryResults2);
         });
      } else if (this.selectedUSerMessage3) {
        // First API call for view 1
        this.sendSimilarityQueryForView(apiMessage1, 1).subscribe((response: any) => {

          this.bins3[0] = {
  label: "75 - 100",
  count: response.results.filter((d: any) => d.similarity_score >= 75 && d.similarity_score <= 100).length,
  data: response.results.filter((d: any) => d.similarity_score >= 75 && d.similarity_score <= 100),
  color: 'green'
};

this.bins3[1] = {
  label: "65 - 75",
  count: response.results.filter((d: any) => d.similarity_score >= 65 && d.similarity_score < 75).length,
  data: response.results.filter((d: any) => d.similarity_score >= 65 && d.similarity_score < 75),
  color: 'orange'
};

this.bins3[2] = {
  label: "0 - 65",
  count: response.results.filter((d: any) => d.similarity_score >= 0 && d.similarity_score < 65).length,
  data: response.results.filter((d: any) => d.similarity_score >= 0 && d.similarity_score < 65),
  color: 'red'
};

if (isNewQuery) {
  const newQueryIndex = this.questions.length - 1;
  const tagV1 = (d: any) => ({ ...d, _sourceVersion: 1 });
  if (!this.allBins[newQueryIndex]) {
    this.allBins[newQueryIndex] = [
      {
        label: "75 - 100",
        count: response.results.filter((d: any) => d.similarity_score >= 75 && d.similarity_score <= 100).length,
        data: response.results.filter((d: any) => d.similarity_score >= 75 && d.similarity_score <= 100).map(tagV1),
        color: 'green'
      },
      {
        label: "65 - 75",
        count: response.results.filter((d: any) => d.similarity_score >= 65 && d.similarity_score < 75).length,
        data: response.results.filter((d: any) => d.similarity_score >= 65 && d.similarity_score < 75).map(tagV1),
        color: 'orange'
      },
      {
        label: "0 - 65",
        count: response.results.filter((d: any) => d.similarity_score >= 0 && d.similarity_score < 65).length,
        data: response.results.filter((d: any) => d.similarity_score >= 0 && d.similarity_score < 65).map(tagV1),
        color: 'red'
      }
    ];
  } else {
    const view1Bin0 = response.results.filter((d: any) => d.similarity_score >= 75 && d.similarity_score <= 100).map(tagV1);
    const view1Bin1 = response.results.filter((d: any) => d.similarity_score >= 65 && d.similarity_score < 75).map(tagV1);
    const view1Bin2 = response.results.filter((d: any) => d.similarity_score >= 0 && d.similarity_score < 65).map(tagV1);
    const mergeData = (existing: any[], newData: any[]) => {
      const merged = [...existing];
      const existingPaths = new Set(existing.map((d: any) => d.topic_path || d.content));
      newData.forEach((item: any) => {
        const path = item.topic_path || item.content;
        if (!existingPaths.has(path)) {
          merged.push(item);
          existingPaths.add(path);
        }
      });
      return merged;
    };
    this.allBins[newQueryIndex][0].data = mergeData(this.allBins[newQueryIndex][0].data, view1Bin0);
    this.allBins[newQueryIndex][0].count = this.allBins[newQueryIndex][0].data.length;
    this.allBins[newQueryIndex][1].data = mergeData(this.allBins[newQueryIndex][1].data, view1Bin1);
    this.allBins[newQueryIndex][1].count = this.allBins[newQueryIndex][1].data.length;
    this.allBins[newQueryIndex][2].data = mergeData(this.allBins[newQueryIndex][2].data, view1Bin2);
    this.allBins[newQueryIndex][2].count = this.allBins[newQueryIndex][2].data.length;
  }
}


        // this.switchToQuery('3');
        this.chartData1 = {...this.chartData1}
        this.chartData = {...this.chartData1}
        this.heatmapdata = this.buildHierarchy(response.results);
        console.log(this.chartData)
        this.barChartValue3 = response.results
        // this.queryResults1 = response.results || [];
        console.log(this.barChartValue)
  
        this.userMessage = ''; // Clear input
         });

        // Second API call for view 2
        this.sendSimilarityQueryForView(apiMessage2, 2).subscribe((response2: any) => {
          // Store version 2 results in queryResults2
          // this.queryResults2 = response2.results || [];
          
          // If it's a new query, append view 2 data with _sourceVersion: 2 (top-5-per-version)
          if (isNewQuery) {
            const newQueryIndex = this.questions.length - 1;
            if (this.allBins[newQueryIndex]) {
              const tagV2 = (d: any) => ({ ...d, _sourceVersion: 2 });
              const view2Bin0 = response2.results.filter((d: any) => d.similarity_score >= 75 && d.similarity_score <= 100).map(tagV2);
              const view2Bin1 = response2.results.filter((d: any) => d.similarity_score >= 65 && d.similarity_score < 75).map(tagV2);
              const view2Bin2 = response2.results.filter((d: any) => d.similarity_score >= 0 && d.similarity_score < 65).map(tagV2);
              this.allBins[newQueryIndex][0].data = [...this.allBins[newQueryIndex][0].data, ...view2Bin0];
              this.allBins[newQueryIndex][0].count = this.allBins[newQueryIndex][0].data.length;
              this.allBins[newQueryIndex][1].data = [...this.allBins[newQueryIndex][1].data, ...view2Bin1];
              this.allBins[newQueryIndex][1].count = this.allBins[newQueryIndex][1].data.length;
              this.allBins[newQueryIndex][2].data = [...this.allBins[newQueryIndex][2].data, ...view2Bin2];
              this.allBins[newQueryIndex][2].count = this.allBins[newQueryIndex][2].data.length;
            }
          }
          
          // Update version 2 chart data if needed
          if (response2.results && response2.results.length > 0) {
            this.heatmapdata = this.buildHierarchy(response2.results);
            this.chartData2 = {...this.chartData2};
          }
          
          console.log('Version 2 query results:', this.queryResults2);
         });
      }
  
      // });
    // }
    

    // if(this.selectedUSerMessage2) {
    //   this.openaiService.findFuzzy(this.selectedUSerMessage,this.selectedUSerMessage2,this.numberOfChunks).subscribe((response: any) => {
    //     const data: any = response.results;
    //     const total = data.length;
    //     this.updateSimilarityScores2(this.chartData.children, data,true)
    //           this.chartData = {...this.chartData}
    //     const sumUnion = data.reduce((acc: any, item: any) => acc + item.fuzzy_union, 0);
    //     const sumIntersection = data.reduce((acc: any, item: any) => acc + item.fuzzy_intersection, 0);
        
    //     const avgUnion = sumUnion / total;
    //     const avgIntersection = sumIntersection / total;
    //     console.log("Average Fuzzy Union:", avgUnion);
    //     console.log("Average Fuzzy Intersection:", avgIntersection);
        
    //     this.CommonBarData = [
    //       { label: 'Fuzzy Union', value: avgUnion },
    //       { label: 'Fuzzy Intersection', value: avgIntersection },
    //     ]
    //     console.log(this.chartData)
    //   })


    // }
  }
}
  selectedBinIndex: number | null = 1;
  selectedQueryRank: string = '1';
  
  // Single selection per query support
  selectedBinIndices: { [queryRank: string]: number | null } = {
    '1': null,
    '2': null,
    '3': null
  };
  
  private clickTimeout: any = null;
  


  // Word cloud functionality with caching
  private wordCloudCache = new Map<string, any[]>();

  generateWordCloudData(keywords: string[]): any[] {
    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) return [];
    
    // Filter out null/undefined keywords and ensure they are strings
    const validKeywords = keywords.filter(keyword => keyword != null && typeof keyword === 'string' && keyword.trim() !== '');
    if (validKeywords.length === 0) return [];
    
    // Create cache key from keywords
    const cacheKey = validKeywords.join('|');
    
    // Return cached data if available
    if (this.wordCloudCache.has(cacheKey)) {
      return this.wordCloudCache.get(cacheKey)!;
    }
    
    // Create word cloud items with varying sizes and positions
    const wordCloudData = validKeywords.map((keyword, index) => {
      const frequency = Math.random() * 0.8 + 0.2; // Random frequency between 0.2-1.0
      const fontSize = Math.floor(12 + frequency * 20); // Font size between 12-32px
      const color = this.colors && this.colors.length > 0 ? this.colors[index % this.colors.length] : { bg: '#f0f0f0', text: '#333' };
      
      return {
        text: keyword,
        fontSize: fontSize,
        color: color.text || '#333',
        backgroundColor: color.bg || '#f0f0f0',
        weight: frequency
      };
    }).sort((a, b) => b.weight - a.weight); // Sort by weight (larger words first)
    
    // Cache the result
    this.wordCloudCache.set(cacheKey, wordCloudData);
    return wordCloudData;
  }

  private styleCache = new Map<string, any>();


  // Method to clear caches when needed
  clearWordCloudCaches() {
    this.wordCloudCache.clear();
    this.styleCache.clear();
  }

  // onBinClick(bin: any, index: number, event?: Event) {
  //   // Prevent event bubbling and default behavior
  //   if (event) {
  //     event.preventDefault();
  //     event.stopPropagation();
  //   }
    
  //   // Debounce to prevent double-clicks
  //   if (this.clickTimeout) {
  //     console.log("Debounced click ignored");
  //     return;
  //   }
    
  //   this.clickTimeout = setTimeout(() => {
  //     this.clickTimeout = null;
  //   }, 300); // 300ms debounce
    
  //   console.log("Clicked bin:", bin, "index:", index);
  //   this.selectedBinIndex = index;
    
  //   this.applyFilter();
  //   console.log(this.chartData);
  // }


  selectedColor: string = '';

  applyFilter() {
    if (this.selectedBinIndex === null) return;

    let selectedData: any[] = [];

    if(this.selectedQueryRank === '1') {
      selectedData = [...this.bins[this.selectedBinIndex].data];
      this.selectedColor = this.bins[this.selectedBinIndex].color;
    } else if(this.selectedQueryRank === '2') {
       selectedData = [...this.bins2[this.selectedBinIndex].data];
       this.selectedColor = this.bins2[this.selectedBinIndex].color;
    } else if(this.selectedQueryRank === '3') {
       selectedData = [...this.bins3[this.selectedBinIndex].data];
       this.selectedColor = this.bins3[this.selectedBinIndex].color;
    }

    this.filteredData = selectedData
      .sort((a: any, b: any) => b.similarity_score - a.similarity_score) // highest first
      .slice(0, this.selectedTopN);

    console.log(this.chartData, this.filteredData, selectedData);
    this.updateSimilarityScores(this.chartData.children, this.filteredData, this.selectedQueryRank);
    this.chartData = {...this.chartData};
  }

  fuzzyLogic(type: any): any {
    this.fuzzyPopup = false;
    this.openaiService.findFuzzy(this.selectedUSerMessage,this.selectedUSerMessage2,this.numberOfChunks,type).subscribe((response: any) => {
      this.querysent = true

      this.updateSimilarityScores2(this.chartData.children, response.results,true)
      this.chartData = {...this.chartData}
      console.log(this.chartData)

    })
  }


  selectedData(data: any, viewIndex: number = 1) {
    console.log('selectedData called with:', data, 'View:', viewIndex);
    
    // Don't add to selectedTopicContents here - setTopic already handles that
    // Just send the query to OpenAI
    
    if (!this.selectedUSerMessage && !this.selectedUSerMessage2 && !this.selectedUSerMessage3) {
      console.log('No query message available');
      return;
    }

    if (!data.content) {
      console.log('No content available for query');
      return;
    }

    // Determine which query message to use for the selected version.
    let queryMessage = this.getActiveApiQuestion(viewIndex as 1 | 2);
    
    // Update the appropriate node name based on viewIndex
    if (viewIndex === 1) {
      this.nodeName1 = data.name;
    } else {
      this.nodeName2 = data.name;
    }
    
    console.log(`Sending query (Q${this.selectedQueryRank}):`, queryMessage);
    
    this.openaiService.askQuery(queryMessage, data.content, this.getAskQueryOptions(viewIndex as 1 | 2)).subscribe((res: any) => {
      console.log('AI Response:', res);
      const aiResponse = res.response;
      const summaryByLanguage = this.parseBilingualSummary(aiResponse, viewIndex as 1 | 2);
      
      // Extract keywords from the AI response
      const keywords = this.extractKeywordsFromContent(aiResponse, 20);
      
      const queryIndex = this.resolveQueryIndexForCurrentSelection();

      this.chatMessages.push({ 
        role: 'assistant', 
        content: aiResponse,
        summaryByLanguage,
        summaryLanguage: this.getDefaultSummaryLanguage(summaryByLanguage),
        queryMessage: queryMessage,
        name: data.name,
        path: data.path ?? '',
        query: this.selectedQueryRank,
        queryIndex,
        notes: [], // Initialize notes array
        noteOpen: false,
        wordCloudOpen: false, // Initialize word cloud as closed
        newNote: '',
        activeTab: 'summary', // Default tab
        generatedKeywords: keywords // Store keywords for highlighting
      });
      
      // Generate word cloud for the new message
      setTimeout(() => {
        this.renderMessageWordCloud(this.chatMessages[this.chatMessages.length - 1], this.chatMessages.length - 1);
      }, 100);
    });
  }

  // Message notes functionality
  addMessageNote(message: any): void {
    if (message.newNote && message.newNote.trim()) {
      if (!message.notes) {
        message.notes = [];
      }
      message.notes.push(message.newNote.trim());
      message.newNote = '';
      
      // Also add the note to the corresponding topic in selectedTopicContents
      this.syncNoteToTopic(message);
    }
  }

  // Sync note from message to corresponding topic
  syncNoteToTopic(message: any): void {
    // Find the corresponding topic in selectedTopicContents
    const nodeName = this.nodeName1 || this.nodeName2 || this.nodeName;
    const topicIndex = this.selectedTopicContents.findIndex(topic => topic.name === nodeName);
    if (topicIndex !== -1) {
      const topic = this.selectedTopicContents[topicIndex];
      if (!topic.notes) {
        topic.notes = [];
      }
      
      // Add the latest note from the message to the topic
      if (message.notes && message.notes.length > 0) {
        const latestNote = message.notes[message.notes.length - 1];
        // Check if this note already exists in topic notes
        if (!topic.notes.includes(latestNote)) {
          topic.notes.push(latestNote);
        }
      }
      
      // Update the topic in the array to trigger change detection
      this.selectedTopicContents[topicIndex] = { ...topic };
      
      // Also update in view-specific arrays
      const topicIndex1 = this.selectedTopicContents1.findIndex(t => t.name === nodeName);
      if (topicIndex1 !== -1) {
        this.selectedTopicContents1[topicIndex1] = { ...this.selectedTopicContents[topicIndex] };
      }
      const topicIndex2 = this.selectedTopicContents2.findIndex(t => t.name === nodeName);
      if (topicIndex2 !== -1) {
        this.selectedTopicContents2[topicIndex2] = { ...this.selectedTopicContents[topicIndex] };
      }
    }
  }

  editMessageNote(message: any, noteIndex: number): void {
    const oldNote = message.notes[noteIndex];
    const newNote = prompt('Edit note:', message.notes[noteIndex]);
    if (newNote !== null) {
      message.notes[noteIndex] = newNote.trim();
      
      // Also update the note in the corresponding topic
      this.syncNoteEditToTopic(oldNote, newNote.trim());
    }
  }

  // Sync note edit to topic
  syncNoteEditToTopic(oldNote: string, newNote: string): void {
    const nodeName = this.nodeName1 || this.nodeName2 || this.nodeName;
    const topicIndex = this.selectedTopicContents.findIndex(topic => topic.name === nodeName);
    if (topicIndex !== -1) {
      const topic = this.selectedTopicContents[topicIndex];
      if (topic.notes) {
        const noteIndex = topic.notes.indexOf(oldNote);
        if (noteIndex !== -1) {
          topic.notes[noteIndex] = newNote;
          // Update the topic in the array to trigger change detection
          this.selectedTopicContents[topicIndex] = { ...topic };
          
          // Also update in view-specific arrays
          const topicIndex1 = this.selectedTopicContents1.findIndex(t => t.name === nodeName);
          if (topicIndex1 !== -1) {
            this.selectedTopicContents1[topicIndex1] = { ...this.selectedTopicContents[topicIndex] };
          }
          const topicIndex2 = this.selectedTopicContents2.findIndex(t => t.name === nodeName);
          if (topicIndex2 !== -1) {
            this.selectedTopicContents2[topicIndex2] = { ...this.selectedTopicContents[topicIndex] };
          }
        }
      }
    }
  }

  deleteMessageNote(message: any, noteIndex: number): void {
    if (confirm('Are you sure you want to delete this note?')) {
      const deletedNote = message.notes[noteIndex];
      message.notes.splice(noteIndex, 1);
      
      // Also remove the note from the corresponding topic
      this.syncNoteDeletionFromTopic(deletedNote);
    }
  }

  // Sync note deletion from topic
  syncNoteDeletionFromTopic(deletedNote: string): void {
    const nodeName = this.nodeName1 || this.nodeName2 || this.nodeName;
    const topicIndex = this.selectedTopicContents.findIndex(topic => topic.name === nodeName);
    if (topicIndex !== -1) {
      const topic = this.selectedTopicContents[topicIndex];
      if (topic.notes) {
        const noteIndex = topic.notes.indexOf(deletedNote);
        if (noteIndex !== -1) {
          topic.notes.splice(noteIndex, 1);
          // Update the topic in the array to trigger change detection
          this.selectedTopicContents[topicIndex] = { ...topic };
          
          // Also update in view-specific arrays
          const topicIndex1 = this.selectedTopicContents1.findIndex(t => t.name === nodeName);
          if (topicIndex1 !== -1) {
            this.selectedTopicContents1[topicIndex1] = { ...this.selectedTopicContents[topicIndex] };
          }
          const topicIndex2 = this.selectedTopicContents2.findIndex(t => t.name === nodeName);
          if (topicIndex2 !== -1) {
            this.selectedTopicContents2[topicIndex2] = { ...this.selectedTopicContents[topicIndex] };
          }
        }
      }
    }
  }

  // Activate word cloud tab and render word cloud
  activateWordCloudTab(message: any, messageIndex: number): void {
    message.activeTab = 'wordcloud';
    // Render word cloud after tab is activated
    setTimeout(() => {
      this.renderMessageWordCloud(message, messageIndex);
    }, 100);
  }

  // Toggle word cloud and render it when opened
  toggleWordCloud(message: any, messageIndex: number): void {
    message.wordCloudOpen = !message.wordCloudOpen;
    
    // If opening the word cloud, render it after a short delay to ensure DOM is updated
    if (message.wordCloudOpen) {
      setTimeout(() => {
        this.renderMessageWordCloud(message, messageIndex);
      }, 100);
    }
  }

  // Render word cloud for message content
  renderMessageWordCloud(message: any, messageIndex: number): void {
    if (!message.content) return;
    
    const canvasId = `wordcloud-canvas-message-${messageIndex}`;
    console.log('Rendering word cloud for canvas:', canvasId);
    
    console.log(message,87)
    // Extract keywords from message content
    const keywords = this.extractKeywordsFromContent(message.queryMessage, 200);
    console.log('Extracted keywords:', keywords);
    
    // Store keywords in message for highlighting
    message.generatedKeywords = keywords;
    
    // Get the color for this specific message
    const messageColor = message.no ? this.getMessageColor(message.no) : this.q1Color;
    
    this.renderWordCloudChart(canvasId, keywords, messageColor);
  }

  // Highlight keywords in message content
  highlightMessageText(message: any): SafeHtml {
    if (!message.content) {
      return this.sanitizer.sanitize(1, '') || '';
    }

    // Generate keywords if not already done
    if (!message.generatedKeywords || message.generatedKeywords.length === 0) {
      message.generatedKeywords = this.extractKeywordsFromContent(message.content, 200);
    }

    // Get the color for this specific message
    const messageColor = message.no ? this.getMessageColor(message.no) : this.q1Color;
    return this.highlightText(message.content, message.generatedKeywords, messageColor);
  }

  getRootPath(path: string): string {
    return path.split("/")[0];
  }
  
  groupScoresByPath(data: any[]): Record<string, { label: string, score: number }[]> {
    const grouped: Record<string, { label: string, score: number }[]> = {};
  
    data.forEach(item => {
      const root = this.getRootPath(item.topic_path);
      const label = item.topic_path.split("/").slice(1).join(" / "); // optional: subpath as label
  
      const score = item.similarity_score2 ?? item.similarity_score;
  
      if (!grouped[root]) {
        grouped[root] = [];
      }
  
      grouped[root].push({
        label: label || root,
        score: score ?? 0
      });
    });
  
    return grouped;
  }

  aggregateTopics(data: any[]): any[] {
    const topicMap: Record<string, { count: number, scoreSum: number }> = {};
  
    data.forEach(item => {
      const topLevel = item.topic_path.split('/')[0];
  
      if (!topicMap[topLevel]) {
        topicMap[topLevel] = { count: 0, scoreSum: 0 };
      }
  
      topicMap[topLevel].count++;
      topicMap[topLevel].scoreSum += item.similarity_score;
    });
  
    return Object.keys(topicMap).map(topic => ({
      topic,
      count: topicMap[topic].count,
      average_similarity: parseFloat(
        (topicMap[topic].scoreSum / topicMap[topic].count).toFixed(2)
      )
    }));
  }

  addnodes(data: any): any {
    console.log(data,87)
  this.selectednodes.push(data.name)
  }

  selectedChart(data: any): any {

    this.barChartData = [
      { label: 'Q1', value: data.similarity_score },
      { label: 'Q2', value: data.similarity_score2 },
      { label: 'Union', value: data.union }
    ];

    this.intersection = data.intersection

    this.nodeName = data.name

    console.log(data)
  }

  public updateSimilarityScores2(treeData: any[], similarityData: any[],query2: any) {
    let clickedNodes: any = []
      function searchAndUpdate(nodes: any[], pathSegments: string[], index: number, score: number,rank: number,intersection: any,union: any): boolean {
        if (index >= pathSegments.length) return false;
    
        for (const node of nodes) {
          if (node.key === pathSegments[index] || node.name === pathSegments[index]) {
            if (query2) {
             node.expanded2 = true
            } else {
             node.expanded = true;
            }
             if (index === pathSegments.length - 1) {
              if(query2) {
                // node.similarity_score2 = score;
                node.intersection = intersection;
                node.union = union;
                // node.rank2 = rank // Assign similarity score
              } else {
                // node.similarity_score = score;
                // node.rank = rank // Assign similarity score
              }
              //  node.similarity_score = score;
              //  node.rank = rank // Assign similarity score
              //  clickedNodes.push(node.name)
             
              return true;
            }
            if (node.children) {
              return searchAndUpdate(node.children, pathSegments, index + 1, score,rank,intersection,union);
            }
          }
        }
        return false;
      }
    
      similarityData.forEach(({ topic_path, similarity_q2,fuzzy_intersection,fuzzy_union,rank }) => {
        const pathSegments = topic_path.split("/");
        searchAndUpdate(treeData, pathSegments, 0, similarity_q2,rank,fuzzy_intersection,fuzzy_union);
      });
      this.selectednodes = [...this.selectednodes,...clickedNodes]
      
      console.log(this.selectednodes)
    }

    // Selected queries array for checkbox selection
    selectedQueries: string[] = [];

    // Track bin selections per query: { query: [binIndex1, binIndex2, ...] }
    queryBinSelections: { [query: string]: number[] } = {};

    embeddingComparisons: { [queryIndex: number]: EmbeddingComparisonState } = {};

    getSelectedQueryIndices(): number[] {
      return this.selectedQueries
        .map((q) => this.questions.indexOf(q))
        .filter((i) => i >= 0)
        .sort((a, b) => a - b);
    }

    getEmbeddingComparison(queryIndex: number): EmbeddingComparisonState | undefined {
      return this.embeddingComparisons[queryIndex];
    }

    private getTopEmbeddingResult(queryResults: any[], queryIndex: number): any | null {
      if (!queryResults?.length) return null;
      const scoreKey = `score${queryIndex + 1}`;
      const ranked = [...queryResults]
        .filter((item) => item?.content && item[scoreKey] != null)
        .sort((a, b) => (b[scoreKey] || 0) - (a[scoreKey] || 0));
      return ranked[0] || null;
    }

    private fetchEmbeddingComparison(queryIndex: number): void {
      const englishQuery = this.getApiQuestion(queryIndex, 1);
      const germanQuery = this.getApiQuestion(queryIndex, 2);
      const englishTop = this.getTopEmbeddingResult(this.queryResults1, queryIndex);
      const germanTop = this.getTopEmbeddingResult(this.queryResults2, queryIndex);

      if (!englishQuery || !germanQuery) {
        this.embeddingComparisons[queryIndex] = {
          error: 'English or German query text is missing for this row.',
        };
        this.cdr.markForCheck();
        return;
      }

      if (!englishTop?.content || !germanTop?.content) {
        this.embeddingComparisons[queryIndex] = {
          error: 'Could not find a top-ranked paragraph for English or German results.',
        };
        this.cdr.markForCheck();
        return;
      }

      this.embeddingComparisons[queryIndex] = {
        loading: true,
        englishQuery,
        germanQuery,
        englishTopicPath: englishTop.topic_path,
        germanTopicPath: germanTop.topic_path,
      };
      this.cdr.markForCheck();

      this.openaiService.compareEmbeddingResults({
        english_query: englishQuery,
        german_query: germanQuery,
        english_paragraph: englishTop.content,
        german_paragraph: germanTop.content,
      }).subscribe({
        next: (data) => {
          this.embeddingComparisons[queryIndex] = {
            data,
            englishQuery,
            germanQuery,
            englishTopicPath: englishTop.topic_path,
            germanTopicPath: germanTop.topic_path,
          };
          this.cdr.markForCheck();
        },
        error: (err) => {
          const detail = err?.error?.detail;
          this.embeddingComparisons[queryIndex] = {
            error: typeof detail === 'string' ? detail : (err?.message || 'Embedding comparison failed.'),
            englishQuery,
            germanQuery,
            englishTopicPath: englishTop.topic_path,
            germanTopicPath: germanTop.topic_path,
          };
          this.cdr.markForCheck();
        },
      });
    }

    private clearEmbeddingComparison(queryIndex: number): void {
      delete this.embeddingComparisons[queryIndex];
    }

    setModuleDetailsTab(tab: 'summary' | 'embedding'): void {
      this.moduleDetailsTab = tab;
    }

    hasAnyEmbeddingComparison(): boolean {
      return this.getSelectedQueryIndices().some((i) => {
        const state = this.embeddingComparisons[i];
        return !!(state?.loading || state?.data || state?.error);
      });
    }

    getMessageQueryIndex(message: any): number | null {
      if (message?.queryIndex != null && message.queryIndex >= 0) {
        return message.queryIndex;
      }
      if (message?.query != null) {
        const mapped = this.queryIndexMapping[String(message.query)];
        if (mapped != null && mapped >= 0) return mapped;
      }
      return null;
    }

    hasEmbeddingForMessage(message: any): boolean {
      const queryIndex = this.getMessageQueryIndex(message);
      return queryIndex != null && !!this.embeddingComparisons[queryIndex]?.data;
    }

    isEmbeddingLoadingForMessage(message: any): boolean {
      const queryIndex = this.getMessageQueryIndex(message);
      return queryIndex != null && !!this.embeddingComparisons[queryIndex]?.loading;
    }

    getEmbeddingErrorForMessage(message: any): string | null {
      const queryIndex = this.getMessageQueryIndex(message);
      return queryIndex != null ? (this.embeddingComparisons[queryIndex]?.error || null) : null;
    }

    setMessageTab(message: any, tab: 'summary' | 'embedding' | 'wordcloud'): void {
      message.activeTab = tab;
    }

    getScoreBadgeClass(score: number): string {
      if (score >= 75) return 'emb-score-high';
      if (score >= 50) return 'emb-score-mid';
      return 'emb-score-low';
    }

    private resolveQueryIndexForCurrentSelection(): number | null {
      const mapped = this.queryIndexMapping[this.selectedQueryRank];
      if (mapped != null && mapped >= 0) return mapped;
      if (this.selectedQueries.length === 1) {
        const idx = this.questions.indexOf(this.selectedQueries[0]);
        return idx >= 0 ? idx : null;
      }
      return null;
    }

    // Check if a query is selected
    isQuerySelected(query: string): boolean {
      return this.selectedQueries.includes(query);
    }

    // Toggle query selection
    toggleQuerySelection(query: string, event: any): void {
      if (event.target.checked) {
        // Check if maximum queries (3) are already selected
        if (this.selectedQueries.length >= 3) {
          event.target.checked = false;
          console.log('Maximum 3 queries allowed. Please deselect a query first.');
          return;
        }
        if (!this.selectedQueries.includes(query)) {
          this.selectedQueries.push(query);
          // Initialize bin selections for this query if not exists
          if (!this.queryBinSelections[query]) {
            this.queryBinSelections[query] = [];
          }
          const queryIndex = this.questions.indexOf(query);
          if (queryIndex >= 0) {
            this.fetchEmbeddingComparison(queryIndex);
          }
        }
      } else {
        const index = this.selectedQueries.indexOf(query);
        if (index > -1) {
          this.selectedQueries.splice(index, 1);
          // Clear bin selections when query is deselected
          delete this.queryBinSelections[query];
          const queryIndex = this.questions.indexOf(query);
          if (queryIndex >= 0) {
            this.clearEmbeddingComparison(queryIndex);
          }
        }
      }
    }

    // Check if query checkbox should be disabled (when max queries selected and this query is not selected)
    isQueryCheckboxDisabled(query: string): boolean {
      return this.selectedQueries.length >= 3 && !this.isQuerySelected(query);
    }

    // Get count of selected queries
    getSelectedQueriesCount(): number {
      return this.selectedQueries.length;
    }

    // Check if a bin is selected for a query
    isBinSelectedForQuery(query: string, binIndex: number): boolean {
      if (!this.queryBinSelections[query]) {
        return false;
      }
      return this.queryBinSelections[query].includes(binIndex);
    }

    // Toggle bin selection for a query (only one bin per query allowed)
    toggleBinSelectionForQuery(query: string, binIndex: number, event?: any): void {
      const queryIndex = this.questions.indexOf(query);
      if (queryIndex === -1) return;

      const isSelected = this.isBinSelectedForQuery(query, binIndex);

      console.log(isSelected,query,binIndex,queryIndex,87)
      
      if (isSelected) {
        // Deselect: clear the selection for this query
        this.queryBinSelections[query] = [];
        // Clear structure view data for this query
        this.clearQueryData(queryIndex);
      } else {
        // Select: replace any existing selection with the new one (only one bin allowed)
        this.queryBinSelections[query] = [binIndex];
        // Call sendMessage only for visible versions (like hamlet-triple-view)
        if (this.showVersion1) this.sendMessageForQuery(queryIndex, binIndex, 1);
        if (this.showVersion2) this.sendMessageForQuery(queryIndex, binIndex, 2);
      }
    }

    // Clear query data from structure view
    clearQueryData(queryIndex: number): void {
      const queryNumber = String(queryIndex + 1);
      const structureQueryNumber = this.getStructureSlotForQueryIndex(queryIndex);

      // For newly added queries (queryIndex >= 3), also clear allBins
      if (queryIndex >= 3 && this.allBins[queryIndex]) {
        this.allBins[queryIndex] = [
          { label: '75 - 100', count: 0, data: [], color: 'green'},
          { label: '65 - 75', count: 0, data: [], color: 'orange'},
          { label: '0 - 65', count: 0, data: [], color: 'red'}
        ];
      }
      
      // Clear bin data based on structure query number (only if this query had a slot)
      if (structureQueryNumber === '1') {
        this.selectedBinIndices['1'] = null;
        this.bins = [
          { label: '75 - 100', count: 0, data: [], color: 'green'},
          { label: '65 - 75', count: 0, data: [], color: 'orange'},
          { label: '0 - 65', count: 0, data: [], color: 'red'}
        ];
        this.clearTreeDataForQuery('1');
        this.selectedUSerMessage = null;
      } else if (structureQueryNumber === '2') {
        this.selectedBinIndices['2'] = null;
        this.bins2 = [
          { label: '75 - 100', count: 0, data: [], color: 'green'},
          { label: '65 - 75', count: 0, data: [], color: 'orange'},
          { label: '0 - 65', count: 0, data: [], color: 'red'}
        ];
        this.clearTreeDataForQuery('2');
        this.selectedUSerMessage2 = null;
      } else if (structureQueryNumber === '3') {
        this.selectedBinIndices['3'] = null;
        this.bins3 = [
          { label: '75 - 100', count: 0, data: [], color: 'green'},
          { label: '65 - 75', count: 0, data: [], color: 'orange'},
          { label: '0 - 65', count: 0, data: [], color: 'red'}
        ];
        this.clearTreeDataForQuery('3');
        this.selectedUSerMessage3 = null;
      }

      this.releaseStructureSlotForQueryIndex(queryIndex);
      
      // Update chart data
      this.chartData1 = {...this.chartData1};
      this.chartData2 = {...this.chartData2};
      this.chartData = {...this.chartData};
      this.filteredData = [];
      
      console.log(`Query ${queryNumber} (structure Q${structureQueryNumber ?? 'none'}) data cleared`);
    }

    // Process query and bin selection using queryResults data
    // viewIndex: 1 for Version1, 2 for Version2
    sendMessageForQuery(queryIndex: number, binIndex: number, viewIndex: number = 1): void {
      const queryNumber = String(queryIndex + 1);
      const scoreKey = `score${queryIndex + 1}`;
      const rankKey = `rank${queryIndex + 1}`;
      const chartData = viewIndex === 1 ? this.chartData1 : this.chartData2;

      console.log(`Processing Query ${queryNumber} (index ${queryIndex}), Bin ${binIndex}`);
      console.log(`Using scoreKey: ${scoreKey}, rankKey: ${rankKey}`);

      // Define bin ranges (for added query, per-version transformed data for updating both trees)
      let filteredData: any[] = [];
      let transformedData: any[] = [];
      let version1Transformed: any[] = [];
      let version2Transformed: any[] = [];
      
      // For added queries (beyond first 3): use top 5 per version from allBins
      if (queryIndex >= 3 && this.allBins[queryIndex] && this.allBins[queryIndex][binIndex]) {
        const fullBinData = [...this.allBins[queryIndex][binIndex].data];
        const byVersion1 = fullBinData.filter((d: any) => d._sourceVersion === 1);
        const byVersion2 = fullBinData.filter((d: any) => d._sourceVersion === 2);
        const top5 = (arr: any[]) => arr
          .sort((a: any, b: any) => (b.similarity_score || 0) - (a.similarity_score || 0))
          .slice(0, 5);
        const version1Top = top5(byVersion1);
        const version2Top = top5(byVersion2);
        const toTransformed = (item: any) => ({
          topic_path: item.topic_path || item.name || '',
          similarity_score: item.similarity_score || 0,
          rank: item.rank || null,
          content: item.content || '',
          name: item.name || (item.topic_path ? item.topic_path.split('/').pop() : '')
        });
        version1Transformed = version1Top.map(toTransformed);
        version2Transformed = version2Top.map(toTransformed);
        // Use current view's top 5 for filteredData/transformedData (bins display and current tree)
        filteredData = viewIndex === 1 ? version1Top : version2Top;
        transformedData = viewIndex === 1 ? version1Transformed : version2Transformed;
        // Populate both views' topic contents from top 5 per version (so topic list shows top 5 for each version)
        this.populateSelectedTopicContentsFromBinDataByVersion(version1Top, version2Top);
        console.log(`Added query: version1 top ${version1Top.length}, version2 top ${version2Top.length}`);
      } else {
        // Use version-specific query results for first 3 queries
        const queryResults = viewIndex === 1 ? this.queryResults1 : this.queryResults2;
        
        if (!queryResults || queryResults.length === 0) {
          console.log(`No queryResults data available for version ${viewIndex}`);
          return;
        }
        
        if (binIndex === 0) {
          // Bin 0: 75-100
          filteredData = queryResults.filter((item: any) => {
            const score = item[scoreKey];
            return score !== undefined && score !== null && score >= 75 && score <= 100;
          });
        } else if (binIndex === 1) {
          // Bin 1: 65-75
          filteredData = queryResults.filter((item: any) => {
            const score = item[scoreKey];
            return score !== undefined && score !== null && score >= 65 && score < 75;
          });
        } else if (binIndex === 2) {
          // Bin 2: 0-65
          filteredData = queryResults.filter((item: any) => {
            const score = item[scoreKey];
            return score !== undefined && score !== null && score >= 0 && score < 65;
          });
        }

        console.log(`Filtered ${filteredData.length} items for Query ${queryNumber}, Bin ${binIndex}`);

        // Sort by similarity score (descending) and take top 5
        filteredData = filteredData
          .sort((a: any, b: any) => {
            const scoreA = a[scoreKey] || 0;
            const scoreB = b[scoreKey] || 0;
            return scoreB - scoreA;
          })
          .slice(0, 5);

        console.log(`After sorting and slicing: ${filteredData.length} items`);

        // Transform data to match expected format
        transformedData = filteredData.map((item: any) => ({
          topic_path: item.topic_path,
          similarity_score: item[scoreKey],
          rank: item[rankKey],
          content: item.content,
          name: item.topic_path ? item.topic_path.split('/').pop() : ''
        }));
      }

      // Check if we have data to display
      if (transformedData.length === 0) {
        console.warn(`No data found for Query ${queryNumber}, Bin ${binIndex}`);
        if (queryIndex < 3) {
          const queryResults = viewIndex === 1 ? this.queryResults1 : this.queryResults2;
          console.log(`Sample queryResults item:`, queryResults && queryResults.length > 0 ? queryResults[0] : 'No data');
          console.log(`Looking for scoreKey: ${scoreKey}`);
        }
        return;
      }

      // Map query index to structure slot (same as main-content: assign slot 1/2/3, null if none free)
      const structureQueryNumber = this.assignStructureSlotForQueryIndex(queryIndex);
      if (!structureQueryNumber) {
        console.warn('No available structure slot for this query. Please deselect a query first.');
        return;
      }
      // Keep mapping in sync (assignStructureSlotForQueryIndex already sets it)
      this.queryIndexMapping[structureQueryNumber] = queryIndex;
      
      // Sync query color to Q1/Q2/Q3
      const queryColor = this.getQueryColorForIndex(queryIndex);
      if (structureQueryNumber === '1') {
        this.q1Color = queryColor;
        document.documentElement.style.setProperty('--q1-color', queryColor);
        document.documentElement.style.setProperty('--q1-bg-color', this.generateBackgroundColor(queryColor));
      } else if (structureQueryNumber === '2') {
        this.q2Color = queryColor;
        document.documentElement.style.setProperty('--q2-color', queryColor);
        document.documentElement.style.setProperty('--q2-bg-color', this.generateBackgroundColor(queryColor));
      } else if (structureQueryNumber === '3') {
        this.q3Color = queryColor;
        document.documentElement.style.setProperty('--q3-color', queryColor);
        document.documentElement.style.setProperty('--q3-bg-color', this.generateBackgroundColor(queryColor));
      }
      
      // Update bins for the query (always update based on structure query number)
      if (structureQueryNumber === '1') {
        this.bins[binIndex] = {
          label: binIndex === 0 ? '75 - 100' : (binIndex === 1 ? '65 - 75' : '0 - 65'),
          count: filteredData.length,
          data: transformedData,
          color: binIndex === 0 ? 'green' : (binIndex === 1 ? 'orange' : 'red')
        };
        this.selectedBinIndices['1'] = binIndex;
        this.selectedQueryRank = '1';
        this.selectedUSerMessage = this.questions[queryIndex];
      } else if (structureQueryNumber === '2') {
        this.bins2[binIndex] = {
          label: binIndex === 0 ? '75 - 100' : (binIndex === 1 ? '65 - 75' : '0 - 65'),
          count: filteredData.length,
          data: transformedData,
          color: binIndex === 0 ? 'green' : (binIndex === 1 ? 'orange' : 'red')
        };
        this.selectedBinIndices['2'] = binIndex;
        this.selectedQueryRank = '2';
        this.selectedUSerMessage2 = this.questions[queryIndex];
      } else if (structureQueryNumber === '3') {
        this.bins3[binIndex] = {
          label: binIndex === 0 ? '75 - 100' : (binIndex === 1 ? '65 - 75' : '0 - 65'),
          count: filteredData.length,
          data: transformedData,
          color: binIndex === 0 ? 'green' : (binIndex === 1 ? 'orange' : 'red')
        };
        this.selectedBinIndices['3'] = binIndex;
        this.selectedQueryRank = '3';
        this.selectedUSerMessage3 = this.questions[queryIndex];
      }

      // Build hierarchy and update structure view
      this.heatmapdata = this.buildHierarchy(transformedData);
      this.barChartValue = transformedData;

      console.log(`Updating similarity scores with structureQueryNumber: ${structureQueryNumber}`);
      console.log(`Transformed data count: ${transformedData.length}`);
      
      // Update similarity scores in the tree using structure query number
      this.updateSimilarityScores(chartData.children, transformedData, structureQueryNumber, viewIndex);
      if (viewIndex === 1) {
        this.chartData1 = {...chartData};
        this.chartData = {...chartData}; // Keep backward compatibility
      } else {
        this.chartData2 = {...chartData};
      }
      // For added query: also update the other version's tree with its top 5 (skip askQuery to avoid duplicate AI calls)
      if (queryIndex >= 3) {
        if (viewIndex === 1 && version2Transformed.length > 0 && this.chartData2?.children) {
          this.updateSimilarityScores(this.chartData2.children, version2Transformed, structureQueryNumber, 2, false);
          this.chartData2 = {...this.chartData2};
        } else if (viewIndex === 2 && version1Transformed.length > 0 && this.chartData1?.children) {
          this.updateSimilarityScores(this.chartData1.children, version1Transformed, structureQueryNumber, 1, false);
          this.chartData1 = {...this.chartData1};
          this.chartData = {...this.chartData1};
        }
      }

      // Update selected query rank
      this.selectedQueryRank = structureQueryNumber;
      this.selectedBinIndex = binIndex;

      console.log(`Query ${queryNumber} - Bin ${binIndex} selected with ${filteredData.length} items`);
      console.log(`Mapped to structure query: Q${structureQueryNumber}`);
      console.log(`Selected query message: ${this.questions[queryIndex]}`);
    }

    // Get number of bars for each bin
    getBinBarCount(binIndex: number): number {
      // Bin 1 (75-100) = 5 bars, Bin 2 (65-75) = 3 bars, Bin 3 (0-65) = 1 bar
      if (binIndex === 0) return 5; // 75-100
      if (binIndex === 1) return 3; // 65-75
      if (binIndex === 2) return 1; // 0-65
      return 0;
    }

    // Get array for ngFor to render bars
    getBinBarArray(binIndex: number): any[] {
      const count = this.getBinBarCount(binIndex);
      return Array(count).fill(0);
    }

    // Get antenna bars for header visualization
    getBinAntennaBars(binIndex: number): any[] {
      const count = this.getBinBarCount(binIndex);
      // Return array of bar objects with active property
      // For header, all bars are active by default
      return Array(count).fill(null).map((_, index) => ({
        active: true,
        index: index
      }));
    }

    // Get color for antenna bars in header
    getBinAntennaColor(binIndex: number): string {
      // Use a neutral color for header antenna bars
      const colors = ['#2563eb', '#7c3aed', '#0891b2'];
      return colors[binIndex] || '#2563eb';
    }

    // Get unique color for each query (8 different colors)
    getQueryColor(queryIndex: number): string {
      // First check if a custom color is stored
      if (this.queryColors[queryIndex]) {
        return this.queryColors[queryIndex];
      }
      
      // Fallback to default color palette
      const colors = [
        '#2563eb',
        '#7c3aed',
        '#0891b2',
        '#059669',
        '#d97706',
        '#dc2626',
        '#db2777',
        '#4f46e5'
      ];
      return colors[queryIndex % colors.length];
    }

    // Get darker shade for selected state
    getQueryColorDark(queryIndex: number): string {
      const darkColors = [
        '#1d4ed8',
        '#6d28d9',
        '#0e7490',
        '#047857',
        '#b45309',
        '#b91c1c',
        '#be185d',
        '#4338ca'
      ];
      return darkColors[queryIndex % darkColors.length];
    }

    // Get background color with opacity for selected bin
    getQueryColorWithOpacity(queryIndex: number): string {
      const color = this.getQueryColor(queryIndex);
      // Convert hex to rgba with 10% opacity
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, 0.1)`;
    }

    // Get bin count for a specific query and bin range
    getBinCountForQuery(queryIndex: number, binIndex: number, viewIndex: number = 1): number {
      // First check if we have bins in the allBins structure (for queries beyond first 3)
      if (this.allBins[queryIndex] && this.allBins[queryIndex][binIndex]) {
        return this.allBins[queryIndex][binIndex].count || 0;
      }
      
      // Fall back to queryResults for first 3 queries
      // Use version-specific query results
      const queryResults = viewIndex === 1 ? this.queryResults1 : this.queryResults2;
      
      if (!queryResults || queryResults.length === 0) {
        return 0;
      }

      const scoreKey = `score${queryIndex + 1}`;
      let count = 0;

      queryResults.forEach((item: any) => {
        const score = item[scoreKey];
        if (score !== undefined && score !== null) {
          if (binIndex === 0 && score >= 75 && score <= 100) {
            count++;
          } else if (binIndex === 1 && score >= 65 && score < 75) {
            count++;
          } else if (binIndex === 2 && score >= 0 && score < 65) {
            count++;
          }
        }
      });

      return count;
    }

  /** Strip leading Root segment; tree traversal starts at chartData.children. */
  private getPathSegmentsFromTopicPath(topicPath: string): string[] {
    const segments = String(topicPath || '').split('/').filter(Boolean);
    if (segments.length > 0 && segments[0].toLowerCase() === 'root') {
      return segments.slice(1);
    }
    return segments;
  }

  private getPathFromTopicPath(topicPath: string): string {
    return this.getPathSegmentsFromTopicPath(topicPath).join(' --> ');
  }

  /** Populate selectedTopicContents1/2 and related state from top-5-per-version bin data (for added queries). */
  private populateSelectedTopicContentsFromBinDataByVersion(version1Data: any[], version2Data: any[]): void {
    const buildTopic = (item: any) => ({
      name: item.name || (item.topic_path ? item.topic_path.split('/').pop() : '') || 'Unknown',
      path: this.getPathFromTopicPath(item.topic_path) || item.name || 'Unknown',
      content: item.content || '',
      keys: [],
      summary: item.content || '',
      generatedKeys: [],
      score: item.similarity_score || 0,
      score2: 0,
      score3: 0,
      wordCloudData: []
    });
    this.selectedTopicContents1 = (version1Data || []).map(buildTopic);
    this.selectedTopicContents2 = (version2Data || []).map(buildTopic);
    this.nodeName1 = version1Data?.length ? (version1Data[0].name || (version1Data[0].topic_path ? version1Data[0].topic_path.split('/').pop() : '') || '') : '';
    this.nodeName2 = version2Data?.length ? (version2Data[0].name || (version2Data[0].topic_path ? version2Data[0].topic_path.split('/').pop() : '') || '') : '';
    this.nodePath1 = version1Data?.length ? (this.getPathFromTopicPath(version1Data[0].topic_path) || this.nodeName1) : '';
    this.nodePath2 = version2Data?.length ? (this.getPathFromTopicPath(version2Data[0].topic_path) || this.nodeName2) : '';
    this.paragraphToHighlight1 = version1Data?.length ? (version1Data[0].content || '') : '';
    this.paragraphToHighlight2 = version2Data?.length ? (version2Data[0].content || '') : '';
    this.selectednodes1 = (version1Data || []).map((d: any) => this.getPathFromTopicPath(d.topic_path) || d.name || '');
    this.selectednodes2 = (version2Data || []).map((d: any) => this.getPathFromTopicPath(d.topic_path) || d.name || '');
    this.cdr.markForCheck();
  }

public updateSimilarityScores(treeData: any[], similarityData: any[], queryNumber: string, viewIndex: number = 1, triggerAskQuery: boolean = true) {
  let clickedNodes: any = [];
  let firstMatchedNode: any = null; 
  let selectedNodes: any = [];

  // Reset expansion first
  function resetExpansion(nodes: any[]) {
    for (const node of nodes) {
      if (queryNumber === '2') {
        node.expanded2 = false;
      } else if (queryNumber === '3') {
        node.expanded3 = false;
      } else {
        node.expanded = false;
        node.selected = false;
      }
      if (node.children) resetExpansion(node.children);
    }
  }

  function searchAndUpdate(
    nodes: any[],
    pathSegments: string[],
    index: number,
    score: number,
    rank: number,
    currentPath: string[] = []
  ): boolean {
    if (index >= pathSegments.length) return false;

    for (const node of nodes) {
      if (node.key === pathSegments[index] || node.name === pathSegments[index]) {
        if (queryNumber === '2') {
          node.expanded2 = true;
        } else if (queryNumber === '3') {
          node.expanded3 = true;
        } else {
          node.expanded = true;
        }

        const newPath = [...currentPath, node.name];  // build path step by step

        if (index === pathSegments.length - 1) {
          if (queryNumber === '2') {
            node.similarity_score2 = score;
            node.rank2 = rank;
          } else if (queryNumber === '3') {
            node.similarity_score3 = score;
            node.rank3 = rank;
          } else {
            node.similarity_score = score;
            node.rank = rank;
          }

          const selectedPath = newPath.join(" --> ");
          clickedNodes.push(selectedPath);
          selectedNodes.push({ ...node, path: selectedPath });

          if (!firstMatchedNode) {
            node.selected = true;
            firstMatchedNode = { ...node, path: selectedPath };
          }

          return true;
        }

        if (node.children) {
          return searchAndUpdate(node.children, pathSegments, index + 1, score, rank, newPath);
        }
      }
    }
    return false;
  }

  // Step 1: collapse everything first
  resetExpansion(treeData);
  
  // Clear previous selectedTopicContents
  if (queryNumber === '1') {
    this.selectedTopicContents = [];
  }
  if (viewIndex === 1) {
    this.selectedTopicContents1 = [];
    this.selectednodes1 = [];
  } else {
    this.selectedTopicContents2 = [];
    this.selectednodes2 = [];
  }

  console.log(treeData, similarityData, queryNumber, viewIndex, 877)
  // Step 2: expand only matched paths
  similarityData.forEach(({ topic_path, similarity_score, rank }) => {
    const pathSegments = this.getPathSegmentsFromTopicPath(topic_path);
    if (pathSegments.length > 0) {
      searchAndUpdate(treeData, pathSegments, 0, similarity_score, rank, []);
    }
  });

  console.log(this.selectednodes, clickedNodes);
  this.selectednodes = [...clickedNodes];
  if (viewIndex === 1) {
    this.selectednodes1 = [...clickedNodes];
  } else {
    this.selectednodes2 = [...clickedNodes];
  }
  console.log("First matched node:", firstMatchedNode, selectedNodes, "viewIndex:", viewIndex);
  console.log("selectedTopicContents1 before update:", this.selectedTopicContents1.length);
  console.log("selectedTopicContents2 before update:", this.selectedTopicContents2.length);

  if (firstMatchedNode) {
    if (viewIndex === 1) {
      this.paragraphToHighlight1 = firstMatchedNode.content || firstMatchedNode.value || '';
      this.nodeName1 = firstMatchedNode.name || 'Unknown';
      this.nodePath1 = firstMatchedNode.path || this.nodeName1;
      console.log("Updated paragraphToHighlight1:", this.paragraphToHighlight1);
      console.log("Updated nodeName1:", this.nodeName1);
    } else {
      this.paragraphToHighlight2 = firstMatchedNode.content || firstMatchedNode.value || '';
      this.nodeName2 = firstMatchedNode.name || 'Unknown';
      this.nodePath2 = firstMatchedNode.path || this.nodeName2;
      console.log("Updated paragraphToHighlight2:", this.paragraphToHighlight2);
      console.log("Updated nodeName2:", this.nodeName2);
    }
    
    // Also update the general paragraphToHighlight and nodeName for backward compatibility
    this.paragraphToHighlight = firstMatchedNode.content;
    this.nodeName = firstMatchedNode.name || 'Unknown';
  }

  selectedNodes.forEach((matchedNode: any) => {
    // Pre-generate word cloud data for performance
    const keys = matchedNode.keywords || [];
    const wordCloudData = Array.isArray(keys) ? this.generateWordCloudData(keys) : [];
    
    // Generate keywords from summary immediately
    const summary = matchedNode.summary || matchedNode.value || '';
    const generatedKeys = summary ? this.extractKeywordsFromContent(summary, 15) : [];
    
    const topicData = {
      name: matchedNode.name || 'Unknown',
      path: matchedNode.path,
      content: matchedNode.content || matchedNode.value || '',
      keys: keys,
      summary: summary,
      generatedKeys: generatedKeys,
      score: matchedNode.similarity_score || 0,
      score2: matchedNode.similarity_score2 || 0,
      score3: matchedNode.similarity_score3 || 0,
      wordCloudData: wordCloudData
    };
  
    this.selectedTopicContents.push(topicData);
    if (viewIndex === 1) {
      this.selectedTopicContents1.push(topicData);
      console.log("Added to selectedTopicContents1. New length:", this.selectedTopicContents1.length);
      console.log("selectedTopicContents1 contents:", this.selectedTopicContents1);
    } else {
      this.selectedTopicContents2.push(topicData);
      console.log("Added to selectedTopicContents2. New length:", this.selectedTopicContents2.length);
    }
  });

  console.log("After processing selectedNodes - selectedTopicContents1 length:", this.selectedTopicContents1.length);
  console.log("After processing selectedNodes - selectedTopicContents2 length:", this.selectedTopicContents2.length);

  if (this.selectedTopicContents.length > 0) {
    this.selectTopic(this.selectedTopicContents[0]);
  }
  
  // Get the correct query message for the selected version.
  const actualQueryIndex = this.queryIndexMapping[queryNumber] ?? this.queryIndexMapping[this.selectedQueryRank];
  let queryMessageForAI = actualQueryIndex !== undefined && actualQueryIndex !== null
    ? this.getApiQuestion(actualQueryIndex, viewIndex as 1 | 2)
    : this.getActiveApiQuestion(viewIndex as 1 | 2);
  
  if (triggerAskQuery && queryMessageForAI && firstMatchedNode) {
    this.openaiService.askQuery(
      queryMessageForAI,
      firstMatchedNode.content || firstMatchedNode.value,
      this.getAskQueryOptions(viewIndex as 1 | 2)
    ).subscribe((res: any) => {
      if (res.response) {
        const summaryByLanguage = this.parseBilingualSummary(res.response, viewIndex as 1 | 2);
        // Determine the query number
        const queryNum = this.selectedUSerMessage3 ? 'Q 3' : 
                         (this.selectedUSerMessage2 ? 'Q 2' : 'Q 1');
        const queryIndex = this.resolveQueryIndexForCurrentSelection();
        
        this.chatMessages.push({
          role: 'assistant',
          content: res.response,
          summaryByLanguage,
          summaryLanguage: this.getDefaultSummaryLanguage(summaryByLanguage),
          name: firstMatchedNode.name,
          activeTab: 'summary',
          path: firstMatchedNode.path,
          no: queryNum,
          query: this.selectedQueryRank,
          queryIndex,
          queryMessage: firstMatchedNode.content || firstMatchedNode.value,
          notes: [],
          noteOpen: false,
          wordCloudOpen: false,
          newNote: '',
          generatedKeywords: this.extractKeywordsFromContent(res.response, 20)
        });
      }
    });
  }

  this.cdr.markForCheck();
}


  ranks = [1, 2, 3, 4, 5];  // Example values
chunkSize = 5; // max rank scale (normalize rank/chunkSize)

getScaleBarGradient(): string {
  const color = this.selectedColor;
  return `linear-gradient(to right, #f0f0f0, ${color})`;
}


getBackgroundColor(rank: number | undefined): string {
  if (rank === undefined || rank === null) return '#f0f0f0'; // default gray

  // normalize rank 0–1
  const normalized = Math.min(1, Math.max(0, rank / this.chunkSize));

  // define start (light) and end (prime) colors
  const colorMap: any = {
    'rgb(83, 255, 188)':  { start: [200, 255, 230], end: [83, 255, 188] },   // rgb(83, 255, 188)
    'rgb(255, 255, 152)': { start: [255, 255, 210], end: [255, 255, 152] },  // rgb(255, 255, 152)
    'rgb(128, 235, 255)':   { start: [210, 245, 255], end: [128, 235, 255] },  // rgb(128, 235, 255)
    'rgb(255, 79, 95)':    { start: [255, 200, 210], end: [255, 79, 95] }     // rgb(255, 79, 95)
  };

  const { start, end } = colorMap[this.selectedColor] || colorMap['green'];

  // interpolate R,G,B
  const r = Math.round(start[0] + (end[0] - start[0]) * normalized);
  const g = Math.round(start[1] + (end[1] - start[1]) * normalized);
  const b = Math.round(start[2] + (end[2] - start[2]) * normalized);

  return `rgb(${r}, ${g}, ${b})`;
}


  showMatrix = false;
  activeColorPicker: 'Q1' | 'Q2' | 'Q3' | number | null = null; // Support both Q1-Q3 and query indices
  activeQueryColorPicker: number | null = null; // Track which query index has color picker open
  showWordCloud: boolean = true; // Toggle between word cloud and summary display
  q1Color: string = '#2563eb';
  q2Color: string = '#7c3aed';
  q3Color: string = '#0891b2';
  
  // Filter state for sunburst charts (per-version so Version 1 and Version 2 can have independent Q1/Q2/Q3 selection)
  selectAll: boolean = true;
  q1Selected: boolean = true;
  q2Selected: boolean = true;
  q3Selected: boolean = true;
  selectAll1: boolean = true;
  q1Selected1: boolean = true;
  q2Selected1: boolean = true;
  q3Selected1: boolean = true;
  selectAll2: boolean = true;
  q1Selected2: boolean = true;
  q2Selected2: boolean = true;
  q3Selected2: boolean = true;
  
  // Store colors for each query index
  queryColors: { [queryIndex: number]: string } = {};

  selectColorForQuery(color: string, query: 'Q1' | 'Q2' | 'Q3') {
    const bgColor = this.generateBackgroundColor(color);
    
    if (query === 'Q1') {
      this.q1Color = color;
      document.documentElement.style.setProperty('--q1-color', color);
      document.documentElement.style.setProperty('--q1-bg-color', bgColor);
    } else if (query === 'Q2') {
      this.q2Color = color;
      document.documentElement.style.setProperty('--q2-color', color);
      document.documentElement.style.setProperty('--q2-bg-color', bgColor);
    } else if (query === 'Q3') {
      this.q3Color = color;
      document.documentElement.style.setProperty('--q3-color', color);
      document.documentElement.style.setProperty('--q3-bg-color', bgColor);
    }
    this.showColorOptions = null;
  }

  // Handle filter button clicks for sunburst charts
  onSunburstSelectAll(): void {
    this.selectAll = true;
    this.q1Selected = true;
    this.q2Selected = true;
    this.q3Selected = true;
    this.selectAll1 = true;
    this.q1Selected1 = true;
    this.q2Selected1 = true;
    this.q3Selected1 = true;
    this.selectAll2 = true;
    this.q1Selected2 = true;
    this.q2Selected2 = true;
    this.q3Selected2 = true;
  }

  onSunburstQueryToggle(query: 'q1' | 'q2' | 'q3', version: 1 | 2 = 1): void {
    // Only show the card for the sunburst of the version that was clicked
    setTimeout(() => {
      if (version === 1 && this.sunburstChart) this.sunburstChart.showCard(query);
      if (version === 2 && this.sunburstChart2) this.sunburstChart2.showCard(query);
    }, 0);

    const sel = version === 1
      ? { selectAll: () => this.selectAll1, setSelectAll: (v: boolean) => this.selectAll1 = v, q1: () => this.q1Selected1, q2: () => this.q2Selected1, q3: () => this.q3Selected1, setQ1: (v: boolean) => this.q1Selected1 = v, setQ2: (v: boolean) => this.q2Selected1 = v, setQ3: (v: boolean) => this.q3Selected1 = v }
      : { selectAll: () => this.selectAll2, setSelectAll: (v: boolean) => this.selectAll2 = v, q1: () => this.q1Selected2, q2: () => this.q2Selected2, q3: () => this.q3Selected2, setQ1: (v: boolean) => this.q1Selected2 = v, setQ2: (v: boolean) => this.q2Selected2 = v, setQ3: (v: boolean) => this.q3Selected2 = v };

    if (sel.selectAll()) {
      sel.setSelectAll(false);
      sel.setQ1(false);
      sel.setQ2(false);
      sel.setQ3(false);
      if (query === 'q1') sel.setQ1(true);
      else if (query === 'q2') sel.setQ2(true);
      else if (query === 'q3') sel.setQ3(true);
    } else {
      if (query === 'q1') sel.setQ1(!sel.q1());
      else if (query === 'q2') sel.setQ2(!sel.q2());
      else if (query === 'q3') sel.setQ3(!sel.q3());
      if (sel.q1() && sel.q2() && sel.q3()) sel.setSelectAll(true);
      if (!sel.q1() && !sel.q2() && !sel.q3()) {
        sel.setSelectAll(true);
        sel.setQ1(true);
        sel.setQ2(true);
        sel.setQ3(true);
      }
    }
  }

  // Handle filter changes from sunburst component (version identifies which sunburst emitted)
  onSunburstFilterChanged(event: {selectAll: boolean, q1Selected: boolean, q2Selected: boolean, q3Selected: boolean}, version: 1 | 2): void {
    if (version === 1) {
      this.selectAll1 = event.selectAll;
      this.q1Selected1 = event.q1Selected;
      this.q2Selected1 = event.q2Selected;
      this.q3Selected1 = event.q3Selected;
    } else {
      this.selectAll2 = event.selectAll;
      this.q1Selected2 = event.q1Selected;
      this.q2Selected2 = event.q2Selected;
      this.q3Selected2 = event.q3Selected;
    }
  }

  private generateBackgroundColor(color: string): string {
    // Convert hex to RGB and create a lighter background color
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // Create a very light version for background (90% lighter)
    const lightR = Math.min(255, r + (255 - r) * 0.9);
    const lightG = Math.min(255, g + (255 - g) * 0.9);
    const lightB = Math.min(255, b + (255 - b) * 0.9);
    
    return `rgb(${Math.round(lightR)}, ${Math.round(lightG)}, ${Math.round(lightB)})`;
  }

  // Close color options when clicking outside
  @HostListener('document:click', ['$event'])
  closeColorPicker(event: MouseEvent) {
    const target = event.target as HTMLElement;
    // Check if clicking outside both Q1-Q3 color picker and query index color picker
    if (!target.closest('.color-display') && !target.closest('.color-picker-popup')) {
      this.activeColorPicker = null;
      this.activeQueryColorPicker = null;
    }
  }
  
  // Select color for a specific query index
  selectColorForQueryIndex(color: string, queryIndex: number): void {
    this.queryColors[queryIndex] = color;
    
    // Sync to Q1/Q2/Q3 if this query is currently mapped to one of them (same as main-content)
    const structureQueryNumber = this.getStructureSlotForQueryIndex(queryIndex);
    if (structureQueryNumber === '1') {
      this.q1Color = color;
      document.documentElement.style.setProperty('--q1-color', color);
      document.documentElement.style.setProperty('--q1-bg-color', this.generateBackgroundColor(color));
    } else if (structureQueryNumber === '2') {
      this.q2Color = color;
      document.documentElement.style.setProperty('--q2-color', color);
      document.documentElement.style.setProperty('--q2-bg-color', this.generateBackgroundColor(color));
    } else if (structureQueryNumber === '3') {
      this.q3Color = color;
      document.documentElement.style.setProperty('--q3-color', color);
      document.documentElement.style.setProperty('--q3-bg-color', this.generateBackgroundColor(color));
    }
    
    // Close the color picker
    this.activeQueryColorPicker = null;
  }
  
  // Get color for a query index (with fallback to default)
  getQueryColorForIndex(queryIndex: number): string {
    if (this.queryColors[queryIndex]) {
      return this.queryColors[queryIndex];
    }
    // Fallback to default color palette
    const colors = [
      '#2563eb',
      '#7c3aed',
      '#0891b2',
      '#059669',
      '#d97706',
      '#dc2626',
      '#db2777',
      '#4f46e5'
    ];
    return colors[queryIndex % colors.length];
  }
  
  // Toggle color picker for a query index
  toggleQueryColorPicker(queryIndex: number): void {
    if (this.activeQueryColorPicker === queryIndex) {
      this.activeQueryColorPicker = null;
    } else {
      this.activeQueryColorPicker = queryIndex;
      this.activeColorPicker = null; // Close other color pickers
    }
  }

// matrixColors = ['green', 'red', 'yellow', 'purple'];
colorPalette = [
  '#2563eb',
  '#7c3aed',
  '#0891b2',
  '#059669',
  '#d97706',
  '#dc2626',
  '#db2777',
  '#4f46e5'
];

  toggleMatrix() {
    this.showMatrix = !this.showMatrix;
  }

  toggleWordCloudDisplay() {
    this.showWordCloud = !this.showWordCloud;
  }

  selectColor(color: string) {
  this.selectedColor = color;
  this.showMatrix = false; // collapse back to single box
}


 selectedSegment: number | null = null;

  segments = [
    {
      color: 'rgb(83, 255, 188)', // Top-Left (0° to 90°)
      path: 'M50,50 L50,0 A50,50 0 0,1 100,50 Z'
    },
    {
      color: 'rgb(255, 79, 95)',  // Top-Right (90° to 180°)
      path: 'M50,50 L100,50 A50,50 0 0,1 50,100 Z'
    },
    {
      color: 'rgb(255, 255, 152)', // Bottom-Right (180° to 270°)
      path: 'M50,50 L50,100 A50,50 0 0,1 0,50 Z'
    },
    {
      color: 'rgb(128, 235, 255)', // Bottom-Left (270° to 360°)
      path: 'M50,50 L0,50 A50,50 0 0,1 50,0 Z'
    }
  ];

   onSvgClick(event: MouseEvent) {
    const target = event.target as SVGPathElement;
    const index = target.getAttribute('data-index');
    if (index !== null) {
      this.selectedSegment = +index;
      const selectedColor = this.segments[this.selectedSegment].color;
      this.selectedColor = selectedColor;
  this.showMatrix = false;
      console.log('Selected Color:', selectedColor);
    }
  }

  // Floating chart window methods (Circle Tree only)
  toggleFloatingChart(chartType: 'circle-tree', version: 1 | 2 = 1): void {
    if (version === 1) {
      this.showCircleTreeWindow = !this.showCircleTreeWindow;
      if (this.showCircleTreeWindow && !this.circleTreeExpanded) {
        this.circleTreeExpanded = true;
      }
    } else {
      this.showCircleTreeWindow2 = !this.showCircleTreeWindow2;
      if (this.showCircleTreeWindow2 && !this.circleTreeExpanded2) {
        this.circleTreeExpanded2 = true;
      }
    }
  }

  closeFloatingChart(chartType: 'circle-tree', version: 1 | 2 = 1): void {
    if (version === 1) {
      this.showCircleTreeWindow = false;
    } else {
      this.showCircleTreeWindow2 = false;
    }
  }

  toggleWindowExpand(chartType: 'circle-tree', version: 1 | 2 = 1): void {
    if (version === 1) {
      this.circleTreeExpanded = !this.circleTreeExpanded;
      if (this.circleTreeExpanded) {
        setTimeout(() => this.recalculateChartDimensions('circle-tree'), 200);
      }
    } else {
      this.circleTreeExpanded2 = !this.circleTreeExpanded2;
      if (this.circleTreeExpanded2) {
        setTimeout(() => this.recalculateChartDimensions('circle-tree2'), 200);
      }
    }
  }

  onWindowMouseDown(event: MouseEvent, windowType: 'circle-tree' | 'circle-tree2'): void {
    if (event.button !== 0) return;
    
    this.isDraggingWindow = true;
    this.draggingWindow = windowType;
    
    const currentPosition = windowType === 'circle-tree' ? this.circleTreePosition : this.circleTreePosition2;
    
    this.windowDragOffset = {
      x: event.clientX - currentPosition.x,
      y: event.clientY - currentPosition.y
    };
    
    event.preventDefault();
    document.addEventListener('mousemove', this.onWindowMouseMove);
    document.addEventListener('mouseup', this.onWindowMouseUp);
  }

  onWindowMouseMove = (event: MouseEvent): void => {
    if (this.isResizingWindow && this.resizingWindow) {
      const deltaX = event.clientX - this.windowResizeStart.x;
      const deltaY = event.clientY - this.windowResizeStart.y;
      
      const minWidth = 400;
      const minHeight = 300;
      const maxWidth = window.innerWidth - 50;
      const maxHeight = window.innerHeight - 50;
      
      let newWidth = Math.max(minWidth, Math.min(maxWidth, this.windowResizeStart.width + deltaX));
      let newHeight = Math.max(minHeight, Math.min(maxHeight, this.windowResizeStart.height + deltaY));
      
      if (this.resizingWindow === 'circle-tree') {
        if (this.circleTreeSize.width !== newWidth || this.circleTreeSize.height !== newHeight) {
          this.circleTreeSize = { width: newWidth, height: newHeight };
        }
      } else if (this.resizingWindow === 'circle-tree2') {
        if (this.circleTreeSize2.width !== newWidth || this.circleTreeSize2.height !== newHeight) {
          this.circleTreeSize2 = { width: newWidth, height: newHeight };
        }
      }
    } else if (this.isDraggingWindow && this.draggingWindow) {
      const windowWidth = this.draggingWindow === 'circle-tree' ? this.circleTreeSize.width : this.circleTreeSize2.width;
      const windowHeight = this.draggingWindow === 'circle-tree' ? this.circleTreeSize.height : this.circleTreeSize2.height;
      
      let newX = event.clientX - this.windowDragOffset.x;
      let newY = event.clientY - this.windowDragOffset.y;
      
      newX = Math.max(0, Math.min(newX, window.innerWidth - windowWidth));
      newY = Math.max(0, Math.min(newY, window.innerHeight - windowHeight));
      
      if (this.draggingWindow === 'circle-tree') {
        this.circleTreePosition = { x: newX, y: newY };
      } else {
        this.circleTreePosition2 = { x: newX, y: newY };
      }
    }
  }

  onWindowMouseUp = (): void => {
    const wasResizing = this.isResizingWindow && this.resizingWindow;
    const resizingWindow = this.resizingWindow;
    
    this.isDraggingWindow = false;
    this.draggingWindow = null;
    this.isResizingWindow = false;
    
    if (this.windowResizeUpdateTimer) {
      clearTimeout(this.windowResizeUpdateTimer);
      this.windowResizeUpdateTimer = null;
    }
    
    // Recalculate chart dimensions after resize
    if (wasResizing && resizingWindow) {
      setTimeout(() => {
        this.recalculateChartDimensions(resizingWindow);
      }, 100);
    }
    
    this.resizingWindow = null;
    
    document.removeEventListener('mousemove', this.onWindowMouseMove);
    document.removeEventListener('mouseup', this.onWindowMouseUp);
  }
  
  @ViewChild('circleTreeChart') circleTreeChart: any;
  @ViewChild('sunburstChart') sunburstChart: any;
  @ViewChild('circleTreeChart2') circleTreeChart2: any;
  @ViewChild('sunburstChart2') sunburstChart2: any;
  
  // Recalculate chart dimensions when window is resized
  private recalculateChartDimensions(windowType: 'circle-tree' | 'circle-tree2'): void {
    setTimeout(() => {
      if (windowType === 'circle-tree' && this.circleTreeChart) {
        this.circleTreeChart.recalculateDimensions();
      } else if (windowType === 'circle-tree2' && this.circleTreeChart2) {
        this.circleTreeChart2.recalculateDimensions();
      }
    }, 100);
  }

  onWindowResizeMouseDown(event: MouseEvent, windowType: 'circle-tree' | 'circle-tree2'): void {
    event.stopPropagation();
    event.preventDefault();
    
    this.isResizingWindow = true;
    this.resizingWindow = windowType;
    
    const currentSize = windowType === 'circle-tree' ? this.circleTreeSize : this.circleTreeSize2;
    
    this.windowResizeStart = {
      x: event.clientX,
      y: event.clientY,
      width: currentSize.width,
      height: currentSize.height
    };
    
    document.addEventListener('mousemove', this.onWindowMouseMove);
    document.addEventListener('mouseup', this.onWindowMouseUp);
  }
}

