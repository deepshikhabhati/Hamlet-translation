import { Component, ElementRef, ViewChild, HostListener, AfterViewChecked, OnInit, AfterViewInit } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { AI } from 'src/assets/AI';
import { OpenaiService } from '../openai.service';
import { summary } from 'src/assets/summary';
import { queryResults } from 'src/assets/Ai-QueryResults';
import * as pdfjsLib from 'pdfjs-dist';

(pdfjsLib as any).GlobalWorkerOptions.workerSrc = '/assets/pdfjs/pdf.worker.min.js';

@Component({
  selector: 'app-main-content',
  templateUrl: './main-content.component.html',
  styleUrls: ['./main-content.component.css']
})
export class MainContentComponent implements OnInit, AfterViewChecked, AfterViewInit {
  topicData = AI.children
  chartData = AI
  intersection: any = 0
  nodeName: any = ''
  nodePath: any = ''
  barChartValue: any = []
  barChartValue2: any = []
  barChartValue3: any = []
  chatMessages: any[] = [];
  sizeScale: any;

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
  /** Reader card tab: 'pdf' or 'mindmap' */
  readerTab: 'pdf' | 'mindmap' = 'pdf';
  
  // Floating chart windows properties (Circle Tree only)
  showCircleTreeWindow: boolean = false;
  circleTreeExpanded: boolean = true;
  circleTreePosition = { x: 100, y: 100 };
  circleTreeSize = { width: 600, height: 400 };
  isDraggingWindow: boolean = false;
  draggingWindow: 'circle-tree' | null = null;
  windowDragOffset = { x: 0, y: 0 };
  isResizingWindow: boolean = false;
  resizingWindow: 'circle-tree' | null = null;
  windowResizeStart = { x: 0, y: 0, width: 0, height: 0 };
  windowResizeUpdateTimer: any = null;
  barChartData: any = []
  selectedname: any = []
    showChunkPopup: boolean = false;
    numberOfChunks: any = 100;
  selectedUSerMessage: any;
  selectedUSerMessage2: any;
  selectedUSerMessage3: any;
  selectedQueryNumber: number = 0;
  // Map to track which actual query index is mapped to each Q1/Q2/Q3 slot
  queryIndexMapping: { [structureQuery: string]: number } = {};
  // Reverse map: actual query index -> structure slot ('1'|'2'|'3')
  private queryIndexToStructureSlot: { [queryIndex: number]: '1' | '2' | '3' } = {};
  fuzzyPopup: boolean = false;
  CommonBarData: { label: string; value: number; }[] = [];
  selectedTopicContents: any[] = [];
  selectedTopic: any;
  paragraphToHighlight: any;
  donutChartOptions: any = {
    responsive: true,
    cutout: '70%', // donut thickness
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

  getDonutChartData(score: number) {
    const safeScore = Math.max(0, Math.min(100, score)); // Clamp between 0-100
    return [safeScore, 100 - safeScore];
  }
  constructor(private openaiService: OpenaiService, private sanitizer: DomSanitizer) {

   console.log(cleanTree(this.chartData), 1)
   console.log("🔥 Initial bins:", this.bins);
   console.log("🔥 Initial bins2:", this.bins2);
   console.log("🔥 Initial selectedBinIndex:", this.selectedBinIndex);
    function cleanTree(node: any): any {
      const cleanedNode: any = { name: node.name };
    
      if (Array.isArray(node.children) && node.children.length > 0) {
        cleanedNode.children = node.children.map((child: any) => cleanTree(child));
      }
    
      return cleanedNode;
    }


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

    // Initialize default background colors
    this.initializeDefaultColors();
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

  private getStructureSlotForQueryIndex(queryIndex: number): '1' | '2' | '3' | null {
    const existing = this.queryIndexToStructureSlot[queryIndex];
    if (existing) return existing;

    // Fallback: derive from queryIndexMapping if present
    const entry = Object.entries(this.queryIndexMapping).find(([, idx]) => idx === queryIndex);
    if (!entry) return null;
    const slot = entry[0];
    if (slot === '1' || slot === '2' || slot === '3') return slot;
    return null;
  }

  private assignStructureSlotForQueryIndex(queryIndex: number): '1' | '2' | '3' | null {
    const existing = this.getStructureSlotForQueryIndex(queryIndex);
    if (existing) {
      // Ensure both maps are kept in sync
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

  private releaseStructureSlotForQueryIndex(queryIndex: number): void {
    const slot = this.getStructureSlotForQueryIndex(queryIndex);
    if (slot) {
      delete this.queryIndexMapping[slot];
    }
    delete this.queryIndexToStructureSlot[queryIndex];
  }

  openChunkPopup() {
    this.showChunkPopup = true;
  }
  
  deleteTopic(topic: any) {
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
      this.selectedTopicContents.forEach(topic => {
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
  onTopicClicked(topic: any): void {
    console.log('Topic clicked:', topic.name, 'Selected Query Rank:', this.selectedQueryRank);
    
    // First call setTopic to handle UI updates
    this.setTopic(topic);
    
    // Then call selectedData if there's an active query selection
    // Check for any active query message based on the selected query rank
    const hasActiveQuery = (this.selectedQueryRank === '1' && this.selectedUSerMessage) ||
                           (this.selectedQueryRank === '2' && this.selectedUSerMessage2) ||
                           (this.selectedQueryRank === '3' && this.selectedUSerMessage3);
    
    if (hasActiveQuery) {
      this.selectedData(topic);
    }
  }

  // Handle topic selection from topic-list component
  setTopic(topic: any): void {
    // Generate keywords from summary immediately
    if (topic.summary && typeof topic.summary === 'string') {
      topic.generatedKeys = this.extractKeywordsFromContent(topic.summary, 15);
      console.log(`Generated keywords for topic "${topic.name}":`, topic.generatedKeys);
    }
    
    // Check if topic is already in the array
    const topicPath = topic.path || topic.name;
    const existingIndex = this.selectedTopicContents.findIndex(t => (t.path || t.name) === topicPath);
    
    if (existingIndex === -1) {
      // Add new topic
      this.selectedTopicContents.push(topic);
    } else {
      // Update existing topic
      this.selectedTopicContents[existingIndex] = topic;
    }
    
    // Set active tab to the newly selected topic
    this.activeTab = existingIndex === -1 ? this.selectedTopicContents.length - 1 : existingIndex;
    
    // Sync topic-list highlight and PDF viewer (for sunburst/topic-list/circle-tree clicks)
    this.nodeName = topic.name;
    this.nodePath = topicPath;
    this.paragraphToHighlight = topic.content ?? topic.value ?? '';
    
    // Trigger word cloud rendering for this topic with retry mechanism
    setTimeout(() => {
      this.renderTopicWordCloud(topic);
    }, 150); // Slightly longer initial delay
    
    console.log('Topic selected:', topic);
    console.log('Selected topic contents:', this.selectedTopicContents);
  }

  /** Handle click on a branch node in the mind map – select that topic and sync PDF/chat. */
  onMindMapNodeClicked(node: any): void {
    if (!node) return;
    const fullTopic = this.selectedTopicContents?.find((t: any) => t.name === node.name);
    const topicToSelect = fullTopic || node;
    this.selectTopic(topicToSelect);
    this.nodeName = node.name || '';
    this.paragraphToHighlight = (node.content ?? node.value ?? fullTopic?.content ?? fullTopic?.value ?? '').toString().trim();
    const idx = this.selectedTopicContents.findIndex((t: any) => t.name === node.name);
    if (idx >= 0) this.activeTab = idx;
  }

  /** Call cluster-ai API with current query and top 5 chunks from selected topic contents. */
  clusterAiResponse: any = null;
  clusterAiLoading = false;
  clusterAiError: string | null = null;

  sendClusterAi(): void {
    const query = this.getCurrentQueryMessage()?.trim() || '';
    const top5 = (this.selectedTopicContents || []).slice(0, 5);
    if (!query) {
      this.clusterAiError = 'No query selected.';
      return;
    }
    if (top5.length === 0) {
      this.clusterAiError = 'No topic results. Select a query and bins to get top results first.';
      return;
    }
    const chunks = top5.map((t: any) => ({
      name: t.name || '',
      value: (t.content ?? t.value ?? '').toString().trim()
    }));
    this.clusterAiError = null;
    this.clusterAiLoading = true;
    this.clusterAiResponse = null;
    this.openaiService.clusterAi(query, 5, chunks).subscribe({
      next: (res) => {
        this.clusterAiLoading = false;
        this.clusterAiResponse = res;
      },
      error: (err) => {
        this.clusterAiLoading = false;
        this.clusterAiError = err?.message || 'Cluster-ai request failed.';
      }
    });
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

  // Initialize component with test topic to show word cloud
  ngOnInit(): void {
    // Expand all topics and subtopics recursively
    if (this.topicData && this.topicData.length > 0) {
      this.expandAllTopics(this.topicData);
    }
    
    // Initialize circle tree position (convert percentage to pixels)
    setTimeout(() => {
      const cardElement = document.querySelector('.dashboard .card:first-child');
      if (cardElement) {
        const rect = cardElement.getBoundingClientRect();
        this.circleTreeTop = rect.height * 0.75;
        this.circleTreeLeft = rect.width * 0.60;
      }
    }, 100);
    
    // Add a test topic to demonstrate word cloud functionality
    if (this.selectedTopicContents.length === 0) {
      // const testTopic = {
      //   name: 'AI Development',
      //   keys: ['artificial', 'intelligence', 'machine', 'learning', 'algorithm', 'data', 'neural', 'network'],
      //   summary: 'This is a sample topic about artificial intelligence development and machine learning algorithms.',
      //   content: 'Sample content about AI and ML technologies.'
      // };
      // this.selectedTopicContents.push(testTopic);
      
      // Render word cloud for test topic with retry mechanism
      // setTimeout(() => {
      //   this.renderTopicWordCloud(testTopic);
      // }, 800); // Longer delay for initial load
    }
  }

  ngAfterViewInit(): void {
    // ViewChild references are available here
  }

  // Expand first-level topics and their direct children (subtopics) only
  expandAllTopics(topics: any[]): void {
    if (!topics || topics.length === 0) return;
    
    topics.forEach((topic: any) => {
      // Expand first-level topic
      topic.expanded = true;
      topic.expanded2 = true;
      topic.rexpanded = true;
      topic.rexpanded2 = true;
      topic.selected = true;
      
      // Expand direct children (subtopics) but NOT their children (sub-subtopics)
      if (topic.children && topic.children.length > 0) {
        topic.children.forEach((subtopic: any) => {
          subtopic.rexpanded = true;
          subtopic.rexpanded2 = true;
          subtopic.rselected = true;
          // Do NOT expand children of subtopics (sub-subtopics)

          if (subtopic.children && subtopic.children.length > 0) {
            subtopic.children.forEach((subSubtopic: any) => {
              subSubtopic.rexpanded = true;
              subSubtopic.rexpanded2 = true;
              subSubtopic.rselected = true;

              
              if (subSubtopic.children && subSubtopic.children.length > 0) {
                subSubtopic.children.forEach((subSubSubtopic: any) => {
                  subSubSubtopic.rexpanded = true;
                  subSubSubtopic.rexpanded2 = true;
                  subSubSubtopic.rselected = true;
                  // Do NOT expand children of subtopics (sub-subtopics)
                });
              }
              // Do NOT erxpand children of subtopics (sub-subtopics)
            });

            
          }
        });
      }
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

  predefinedQueries: string[] = [
'Where was artificial intelligence officially founded?',
'What early artificial intelligence trying to achieve?',
'Why was symbolic AI important in early artificial intelligence research?',
'Who first studied machine intelligence?',
'How did the Turing Test propose to evaluate whether a machine can think?',
'What is the Turing Test?',
'What is symbolic AI?','What is ELIZA, and why is it important?'
  ];
  
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
  topN: number = 15;
  
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
    { label: '50 - 100', count: 0, data: [], color: 'green'},
    { label: '25 - 50', count: 0, data: [], color: 'orange'},
    { label: '0 - 25', count: 0, data: [], color: 'red'}
  ];


    bins2: any = [
    { label: '50 - 100', count: 0, data: [], color: 'green'},
    { label: '25 - 50', count: 0, data: [], color: 'orange'},
    { label: '0 - 25', count: 0, data: [], color: 'red'}
  ];

    bins3: any = [
    { label: '50 - 100', count: 0, data: [], color: 'green'},
    { label: '25 - 50', count: 0, data: [], color: 'orange'},
    { label: '0 - 25', count: 0, data: [], color: 'red'}
  ];

  // Dynamic bins structure for queries beyond the first 3
  allBins: { [queryIndex: number]: any[] } = {};


  showTreeMap: boolean = false;

toggleChartView() {
  this.showTreeMap = !this.showTreeMap;
}
  sendMessage(msg: any) {
    if (this.userMessage.trim() || this.selectedQuery) {
      // Check if this is a new query (not in predefinedQueries)
      const isNewQuery = !this.predefinedQueries.includes(msg.trim());
      
      // If it's a new query, add it to predefinedQueries at the end
      if (isNewQuery) {
        this.predefinedQueries.push(msg.trim());
        const newQueryIndex = this.predefinedQueries.length - 1;
        
        // Assign color for new query
        if (!this.queryColors[newQueryIndex]) {
          this.queryColors[newQueryIndex] = '#FF6B6B';
          // Sync to Q1/Q2/Q3 slot if this new query fills that slot
          const newColor = this.queryColors[newQueryIndex];
          if (this.selectedUSerMessage && this.selectedUSerMessage2) {
            this.q3Color = newColor;
            document.documentElement.style.setProperty('--q3-color', newColor);
          } else if (this.selectedUSerMessage) {
            this.q2Color = newColor;
            document.documentElement.style.setProperty('--q2-color', newColor);
          } else {
            this.q1Color = newColor;
            document.documentElement.style.setProperty('--q1-color', newColor);
          }
        }
        
        // Initialize bins for the new query (will be populated after API response)
        if (!this.allBins[newQueryIndex]) {
          this.allBins[newQueryIndex] = [
            { label: "50 - 100", count: 0, data: [], color: 'green' },
            { label: "25 - 50", count: 0, data: [], color: 'orange' },
            { label: "0 - 25", count: 0, data: [], color: 'red' }
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
      // if(!this.fuzzyPopup) {
        console.log(this.selectedUSerMessage2, this.selectedUSerMessage3,this.selectedUSerMessage,1105)
      if(!this.selectedUSerMessage2 && !this.selectedUSerMessage3) {
        
        this.openaiService.sendQuery4(msg,this.numberOfChunks).subscribe((response: any) => {
            this.querysent = true
            console.log(this.buildHierarchy(response.results))
            this.heatmapdata = this.buildHierarchy(response.results);

            const buckets: any = {
  "50-100": [],
  "25-50": [],
  "0-25": []
};

this.bins[0] = {
  label: "50 - 100",
  count: response.results.filter((d: any) => d.similarity_score >= 50 && d.similarity_score <= 100).length,
  data: response.results.filter((d: any) => d.similarity_score >= 50 && d.similarity_score <= 100),
  color: 'green'
};

this.bins[1] = {
  label: "25 - 50",
  count: response.results.filter((d: any) => d.similarity_score >= 25 && d.similarity_score < 50).length,
  data: response.results.filter((d: any) => d.similarity_score >= 25 && d.similarity_score < 50),
  color: 'orange'
};

this.bins[2] = {
  label: "0 - 25",
  count: response.results.filter((d: any) => d.similarity_score >= 0 && d.similarity_score < 25).length,
  data: response.results.filter((d: any) => d.similarity_score >= 0 && d.similarity_score < 25),
  color: 'red'
};

// If it's a new query, also update the allBins structure
if (isNewQuery) {
  const newQueryIndex = this.predefinedQueries.length - 1;
  this.allBins[newQueryIndex] = [
    {
      label: "50 - 100",
      count: response.results.filter((d: any) => d.similarity_score >= 50 && d.similarity_score <= 100).length,
      data: response.results.filter((d: any) => d.similarity_score >= 50 && d.similarity_score <= 100),
      color: 'green'
    },
    {
      label: "25 - 50",
      count: response.results.filter((d: any) => d.similarity_score >= 25 && d.similarity_score < 50).length,
      data: response.results.filter((d: any) => d.similarity_score >= 25 && d.similarity_score < 50),
      color: 'orange'
    },
    {
      label: "0 - 25",
      count: response.results.filter((d: any) => d.similarity_score >= 0 && d.similarity_score < 25).length,
      data: response.results.filter((d: any) => d.similarity_score >= 0 && d.similarity_score < 25),
      color: 'red'
    }
  ];
}

console.log(buckets);

      //  this.switchToQuery('1');

        // this.updateSimilarityScores(this.chartData.children, response.results, false )
        this.chartData = {...this.chartData}
        console.log(this.chartData)
  
        this.barChartValue = response.results;
        const value = this.groupScoresByPath(response.results)
        console.log(this.barChartValue,value)
        this.userMessage = ''; // Clear input
        });
      } else if (this.selectedUSerMessage2 && !this.selectedUSerMessage3) {
        this.openaiService.sendQuery4(msg,this.numberOfChunks).subscribe((response: any) => {

          this.bins2[0] = {
  label: "50 - 100",
  count: response.results.filter((d: any) => d.similarity_score >= 50 && d.similarity_score <= 100).length,
  data: response.results.filter((d: any) => d.similarity_score >= 50 && d.similarity_score <= 100),
  color: 'green'
};

this.bins2[1] = {
  label: "25 - 50",
  count: response.results.filter((d: any) => d.similarity_score >= 25 && d.similarity_score < 50).length,
  data: response.results.filter((d: any) => d.similarity_score >= 25 && d.similarity_score < 50),
  color: 'orange'
};

this.bins2[2] = {
  label: "0 - 25",
  count: response.results.filter((d: any) => d.similarity_score >= 0 && d.similarity_score < 25).length,
  data: response.results.filter((d: any) => d.similarity_score >= 0 && d.similarity_score < 25),
  color: 'red'
};

if (isNewQuery) {
  const newQueryIndex = this.predefinedQueries.length - 1;
  this.allBins[newQueryIndex] = [
    {
      label: "50 - 100",
      count: response.results.filter((d: any) => d.similarity_score >= 50 && d.similarity_score <= 100).length,
      data: response.results.filter((d: any) => d.similarity_score >= 50 && d.similarity_score <= 100),
      color: 'green'
    },
    {
      label: "25 - 50",
      count: response.results.filter((d: any) => d.similarity_score >= 25 && d.similarity_score < 50).length,
      data: response.results.filter((d: any) => d.similarity_score >= 25 && d.similarity_score < 50),
      color: 'orange'
    },
    {
      label: "0 - 25",
      count: response.results.filter((d: any) => d.similarity_score >= 0 && d.similarity_score < 25).length,
      data: response.results.filter((d: any) => d.similarity_score >= 0 && d.similarity_score < 25),
      color: 'red'
    }
  ];
}

        // this.switchToQuery('2');
        this.chartData = {...this.chartData}
        this.heatmapdata = this.buildHierarchy(response.results);
        console.log(this.chartData)
        this.barChartValue2 = response.results
        console.log(this.barChartValue)
  
        this.userMessage = ''; // Clear input
         });
      } else if (this.selectedUSerMessage3) {
        this.openaiService.sendQuery4(msg,this.numberOfChunks).subscribe((response: any) => {

          this.bins3[0] = {
  label: "50 - 100",
  count: response.results.filter((d: any) => d.similarity_score >= 50 && d.similarity_score <= 100).length,
  data: response.results.filter((d: any) => d.similarity_score >= 50 && d.similarity_score <= 100),
  color: 'green'
};

this.bins3[1] = {
  label: "25 - 50",
  count: response.results.filter((d: any) => d.similarity_score >= 25 && d.similarity_score < 50).length,
  data: response.results.filter((d: any) => d.similarity_score >= 25 && d.similarity_score < 50),
  color: 'orange'
};

this.bins3[2] = {
  label: "0 - 25",
  count: response.results.filter((d: any) => d.similarity_score >= 0 && d.similarity_score < 25).length,
  data: response.results.filter((d: any) => d.similarity_score >= 0 && d.similarity_score < 25),
  color: 'red'
};

if (isNewQuery) {
  const newQueryIndex = this.predefinedQueries.length - 1;
  this.allBins[newQueryIndex] = [
    {
      label: "50 - 100",
      count: response.results.filter((d: any) => d.similarity_score >= 50 && d.similarity_score <= 100).length,
      data: response.results.filter((d: any) => d.similarity_score >= 50 && d.similarity_score <= 100),
      color: 'green'
    },
    {
      label: "25 - 50",
      count: response.results.filter((d: any) => d.similarity_score >= 25 && d.similarity_score < 50).length,
      data: response.results.filter((d: any) => d.similarity_score >= 25 && d.similarity_score < 50),
      color: 'orange'
    },
    {
      label: "0 - 25",
      count: response.results.filter((d: any) => d.similarity_score >= 0 && d.similarity_score < 25).length,
      data: response.results.filter((d: any) => d.similarity_score >= 0 && d.similarity_score < 25),
      color: 'red'
    }
  ];
}


        // this.switchToQuery('3');
        this.chartData = {...this.chartData}
        this.heatmapdata = this.buildHierarchy(response.results);
        console.log(this.chartData)
        this.barChartValue3 = response.results
        console.log(this.barChartValue)
  
        this.userMessage = ''; // Clear input
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


  selectedData(data: any) {
    console.log('selectedData called with:', data);
    
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

    // Determine which query message to use based on currently selected query rank
    let queryMessage = this.selectedUSerMessage;
    if (this.selectedQueryRank === '2' && this.selectedUSerMessage2) {
      queryMessage = this.selectedUSerMessage2;
    } else if (this.selectedQueryRank === '3' && this.selectedUSerMessage3) {
      queryMessage = this.selectedUSerMessage3;
    }
    
    this.nodeName = data.name;
    console.log(`Sending query (Q${this.selectedQueryRank}):`, queryMessage);

    const aiPowersRealSystemsSummary = 'The provided context presents optimistic predictions from early AI researchers such as H. A. Simon, Allen Newell, and Marvin Minsky, emphasizing their belief that machines would soon achieve human-level intelligence, including playing chess, proving theorems, and performing human tasks. However, it does not mention where artificial intelligence was officially founded or who first studied machine intelligence.';

    const optimisticPredictionsSummary = 'The provided context focuses on how artificial intelligence evolved in the 1990s, highlighting its integration into real-world systems, the impact of the AI Winter, and the rebranding of AI research. However, it does not provide information about where AI was officially founded, who the early pioneers were, or what early AI aimed to achieve.';
    
    this.openaiService.askQuery(queryMessage, data.content).subscribe((res: any) => {
      console.log('AI Response:', res);
      let aiResponse = res.response;
      // For "AI Powers Real Systems" show the predefined summary in the chat message
      if (data.name && String(data.name).trim() === 'AI Powers Real Systems') {
        aiResponse = aiPowersRealSystemsSummary;
      } else if (data.name && String(data.name).trim() === 'Optimism') {
        aiResponse = optimisticPredictionsSummary;
      }
      
      // Extract keywords from the AI response
      const keywords = this.extractKeywordsFromContent(aiResponse, 20);
      
      this.chatMessages.push({ 
        role: 'assistant', 
        content: aiResponse,
        queryMessage: queryMessage,
        name: data.name,
        path: data.path,
        query: this.selectedQueryRank,
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
    const topicIndex = this.selectedTopicContents.findIndex(topic => topic.name === this.nodeName);
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
    const topicIndex = this.selectedTopicContents.findIndex(topic => topic.name === this.nodeName);
    if (topicIndex !== -1) {
      const topic = this.selectedTopicContents[topicIndex];
      if (topic.notes) {
        const noteIndex = topic.notes.indexOf(oldNote);
        if (noteIndex !== -1) {
          topic.notes[noteIndex] = newNote;
          // Update the topic in the array to trigger change detection
          this.selectedTopicContents[topicIndex] = { ...topic };
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
    const topicIndex = this.selectedTopicContents.findIndex(topic => topic.name === this.nodeName);
    if (topicIndex !== -1) {
      const topic = this.selectedTopicContents[topicIndex];
      if (topic.notes) {
        const noteIndex = topic.notes.indexOf(deletedNote);
        if (noteIndex !== -1) {
          topic.notes.splice(noteIndex, 1);
          // Update the topic in the array to trigger change detection
          this.selectedTopicContents[topicIndex] = { ...topic };
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
             node.rexpanded2 = true;
            } else {
             node.expanded = true;
             node.rexpanded = true;
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

          // Assign this query to an available structure slot (Q1/Q2/Q3) so
          // queries like Q1/Q4/Q7 don't collide and overwrite each other.
          const queryIndex = this.predefinedQueries.indexOf(query);
          if (queryIndex !== -1) {
            const assignedSlot = this.assignStructureSlotForQueryIndex(queryIndex);
            if (!assignedSlot) {
              // Roll back selection if no slot is available (shouldn't happen due to max=3)
              event.target.checked = false;
              this.selectedQueries = this.selectedQueries.filter(q => q !== query);
              delete this.queryBinSelections[query];
              console.log('No available structure slot for this query. Please deselect a query first.');
              return;
            }
          }
        }
      } else {
        const index = this.selectedQueries.indexOf(query);
        if (index > -1) {
          this.selectedQueries.splice(index, 1);
          // Clear bin selections when query is deselected
          delete this.queryBinSelections[query];

          // Also clear structure view data and free its structure slot
          const queryIndex = this.predefinedQueries.indexOf(query);
          if (queryIndex !== -1) {
            this.clearQueryData(queryIndex);
            this.releaseStructureSlotForQueryIndex(queryIndex);
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
      const queryIndex = this.predefinedQueries.indexOf(query);
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
        // Call sendMessage with the selected query and bin
        this.sendMessageForQuery(queryIndex, binIndex);
      }
    }

    // Clear query data from structure view
    clearQueryData(queryIndex: number): void {
      const queryNumber = String(queryIndex + 1);
      // Map to structure query slot (Q1/Q2/Q3) based on current selection assignment.
      // This prevents collisions like Q1/Q4/Q7 all writing into the same `similarity_score`.
      const structureQueryNumber =
        this.getStructureSlotForQueryIndex(queryIndex) ??
        (queryIndex < 3 ? String(queryIndex + 1) : String((queryIndex % 3) + 1));
      
      // For newly added queries (queryIndex >= 3), also clear allBins
      if (queryIndex >= 3 && this.allBins[queryIndex]) {
        this.allBins[queryIndex] = [
          { label: '50 - 100', count: 0, data: [], color: 'green'},
          { label: '25 - 50', count: 0, data: [], color: 'orange'},
          { label: '0 - 25', count: 0, data: [], color: 'red'}
        ];
      }
      
      // Clear bin data based on structure query number
      if (structureQueryNumber === '1') {
        this.selectedBinIndices['1'] = null;
        this.bins = [
          { label: '50 - 100', count: 0, data: [], color: 'green'},
          { label: '25 - 50', count: 0, data: [], color: 'orange'},
          { label: '0 - 25', count: 0, data: [], color: 'red'}
        ];
        this.clearTreeDataForQuery('1');
        this.selectedUSerMessage = null;
      } else if (structureQueryNumber === '2') {
        this.selectedBinIndices['2'] = null;
        this.bins2 = [
          { label: '50 - 100', count: 0, data: [], color: 'green'},
          { label: '25 - 50', count: 0, data: [], color: 'orange'},
          { label: '0 - 25', count: 0, data: [], color: 'red'}
        ];
        this.clearTreeDataForQuery('2');
        this.selectedUSerMessage2 = null;
      } else if (structureQueryNumber === '3') {
        this.selectedBinIndices['3'] = null;
        this.bins3 = [
          { label: '50 - 100', count: 0, data: [], color: 'green'},
          { label: '25 - 50', count: 0, data: [], color: 'orange'},
          { label: '0 - 25', count: 0, data: [], color: 'red'}
        ];
        this.clearTreeDataForQuery('3');
        this.selectedUSerMessage3 = null;
      }
      
      // Update chart data
      this.chartData = {...this.chartData};
      this.filteredData = [];
      
      console.log(`Query ${queryNumber} (structure Q${structureQueryNumber}) data cleared`);
    }

    // Process query and bin selection using queryResults data or allBins
    sendMessageForQuery(queryIndex: number, binIndex: number): void {
      this.selectedQueryNumber = queryIndex + 1;

      const queryNumber = String(queryIndex + 1);
      const scoreKey = `score${queryIndex + 1}`;
      const rankKey = `rank${queryIndex + 1}`;

      console.log(`Processing Query ${queryNumber} (index ${queryIndex}), Bin ${binIndex}`);
      console.log(`Using scoreKey: ${scoreKey}, rankKey: ${rankKey}`);

      // Define bin ranges
      let filteredData: any[] = [];
      let transformedData: any[] = [];
      
      // For queries beyond the first 3, use allBins structure
      if (queryIndex >= 3 && this.allBins[queryIndex] && this.allBins[queryIndex][binIndex]) {
        filteredData = [...this.allBins[queryIndex][binIndex].data];
        console.log(`Using allBins for query ${queryIndex}, bin ${binIndex}: ${filteredData.length} items`);
        
        // Sort by similarity score (descending) and take top 5
        filteredData = filteredData
          .sort((a: any, b: any) => {
            const scoreA = a.similarity_score || 0;
            const scoreB = b.similarity_score || 0;
            return scoreB - scoreA;
          })
          .slice(0, 5);
        
        // Transform data to match expected format
        transformedData = filteredData.map((item: any) => ({
          topic_path: item.topic_path || item.name || '',
          similarity_score: item.similarity_score || 0,
          rank: item.rank || null,
          content: item.content || '',
          name: item.name || (item.topic_path ? item.topic_path.split('/').pop() : '')
        }));
      } else if (queryResults && queryResults.length > 0) {
        // For first 3 queries, use queryResults
        if (binIndex === 0) {
          // Bin 0: 50-100
          filteredData = queryResults.filter((item: any) => {
            const score = item[scoreKey];
            return score !== undefined && score !== null && score >= 50 && score <= 100;
          });
        } else if (binIndex === 1) {
          // Bin 1: 25-50
          filteredData = queryResults.filter((item: any) => {
            const score = item[scoreKey];
            return score !== undefined && score !== null && score >= 25 && score < 50;
          });
        } else if (binIndex === 2) {
          // Bin 2: 0-25
          filteredData = queryResults.filter((item: any) => {
            const score = item[scoreKey];
            return score !== undefined && score !== null && score >= 0 && score < 25;
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
      } else {
        console.warn(`No data available for Query ${queryNumber}, Bin ${binIndex}`);
        return;
      }

      // Check if we have data to display
      if (transformedData.length === 0) {
        console.warn(`No data found for Query ${queryNumber}, Bin ${binIndex}`);
        if (queryResults && queryResults.length > 0) {
          console.log(`Sample queryResults item:`, queryResults[0]);
          console.log(`Looking for scoreKey: ${scoreKey}`);
        }
        return;
      }

      // Map the actual query (Q1..Qn) into one of the 3 structure slots (Q1/Q2/Q3)
      // based on current selection assignment. This avoids overwriting when selecting
      // e.g. Q4 after Q1 (they used to both map to structure Q1).
      const structureQueryNumber = this.assignStructureSlotForQueryIndex(queryIndex);
      if (!structureQueryNumber) {
        console.warn('No available structure slot for this query. Please deselect a query first.');
        return;
      }
      
      // Store the mapping of which actual query index is being used for this structure query
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
          label: binIndex === 0 ? '50 - 100' : (binIndex === 1 ? '25 - 50' : '0 - 25'),
          count: filteredData.length,
          data: transformedData,
          color: binIndex === 0 ? 'green' : (binIndex === 1 ? 'orange' : 'red')
        };
        this.selectedBinIndices['1'] = binIndex;
        this.selectedQueryRank = '1';
        this.selectedUSerMessage = this.predefinedQueries[queryIndex];
      } else if (structureQueryNumber === '2') {
        this.bins2[binIndex] = {
          label: binIndex === 0 ? '50 - 100' : (binIndex === 1 ? '25 - 50' : '0 - 25'),
          count: filteredData.length,
          data: transformedData,
          color: binIndex === 0 ? 'green' : (binIndex === 1 ? 'orange' : 'red')
        };
        this.selectedBinIndices['2'] = binIndex;
        this.selectedQueryRank = '2';
        this.selectedUSerMessage2 = this.predefinedQueries[queryIndex];
      } else if (structureQueryNumber === '3') {
        this.bins3[binIndex] = {
          label: binIndex === 0 ? '50 - 100' : (binIndex === 1 ? '25 - 50' : '0 - 25'),
          count: filteredData.length,
          data: transformedData,
          color: binIndex === 0 ? 'green' : (binIndex === 1 ? 'orange' : 'red')
        };
        this.selectedBinIndices['3'] = binIndex;
        this.selectedQueryRank = '3';
        this.selectedUSerMessage3 = this.predefinedQueries[queryIndex];
      }

      // Build hierarchy and update structure view
      this.heatmapdata = this.buildHierarchy(transformedData);
      this.barChartValue = transformedData;

      console.log(`Updating similarity scores with structureQueryNumber: ${structureQueryNumber}`);
      console.log(`Transformed data count: ${transformedData.length}`);
      
      // Update similarity scores in the tree using structure query number
      this.updateSimilarityScores(this.chartData.children, transformedData, structureQueryNumber);
      this.chartData = {...this.chartData};

      // Update selected query rank
      this.selectedQueryRank = structureQueryNumber;
      this.selectedBinIndex = binIndex;

      console.log(`Query ${queryNumber} - Bin ${binIndex} selected with ${filteredData.length} items`);
      console.log(`Mapped to structure query: Q${structureQueryNumber}`);
      console.log(`Selected query message: ${this.predefinedQueries[queryIndex]}`);
    }

    // Get number of bars for each bin
    getBinBarCount(binIndex: number): number {
      // Bin 1 (50-100) = 5 bars, Bin 2 (25-50) = 3 bars, Bin 3 (0-25) = 1 bar
      if (binIndex === 0) return 5; // 50-100
      if (binIndex === 1) return 3; // 25-50
      if (binIndex === 2) return 1; // 0-25
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
      const colors = ['#667eea', '#4facfe', '#43e97b']; // Different colors for each bin
      return colors[binIndex] || '#667eea';
    }

    // Get bars for per-query bin cell (queryIndex, binIndex)
    getBinBarsForQuery(queryIndex: number, binIndex: number): any[] {
      const count = this.getBinBarCount(binIndex);
      const q = this.predefinedQueries[queryIndex];
      const active = q ? this.isBinSelectedForQuery(q, binIndex) : false;
      return Array(count).fill(null).map((_, index) => ({ active, index }));
    }

    // Get unique color for each query (8 different colors)
    getQueryColor(queryIndex: number): string {
      // First check if a custom color is stored
      if (this.queryColors[queryIndex]) {
        return this.queryColors[queryIndex];
      }
      
      // Fallback to default color palette
      const colors = [
        '#667eea', // Purple/Blue
        '#f093fb', // Pink
        '#4facfe', // Light Blue
        '#43e97b', // Green
        '#fa709a', // Rose
        '#fee140', // Yellow
        '#30cfd0', // Cyan
        '#a8edea'  // Mint
      ];
      return colors[queryIndex % colors.length];
    }

    // Get darker shade for selected state
    getQueryColorDark(queryIndex: number): string {
      const darkColors = [
        '#4c63d2', // Darker Purple/Blue
        '#d97ae8', // Darker Pink
        '#3a8fd9', // Darker Light Blue
        '#37d169', // Darker Green
        '#e85d8a', // Darker Rose
        '#e5cc26', // Darker Yellow
        '#28b5b6', // Darker Cyan
        '#90d8d5'  // Darker Mint
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
    getBinCountForQuery(queryIndex: number, binIndex: number): number {
      // First check if we have bins in the allBins structure (for queries beyond first 3)
      if (this.allBins[queryIndex] && this.allBins[queryIndex][binIndex]) {
        return this.allBins[queryIndex][binIndex].count || 0;
      }
      
      // Fall back to queryResults for first 3 queries
      if (!queryResults || queryResults.length === 0) {
        return 0;
      }

      const scoreKey = `score${queryIndex + 1}`;
      let count = 0;

      queryResults.forEach((item: any) => {
        const score = item[scoreKey];
        if (score !== undefined && score !== null) {
          if (binIndex === 0 && score >= 50 && score <= 100) {
            count++;
          } else if (binIndex === 1 && score >= 25 && score < 50) {
            count++;
          } else if (binIndex === 2 && score >= 0 && score < 25) {
            count++;
          }
        }
      });

      return count;
    }

public updateSimilarityScores(treeData: any[], similarityData: any[], queryNumber: string) {
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
          node.rexpanded2 = true;
        } else if (queryNumber === '3') {
          node.expanded3 = true;
          node.rexpanded3 = true;
        } else {
          node.expanded = true;
          node.rexpanded = true;
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
          clickedNodes.push(node.name);
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

  // Step 2: expand only matched paths
  similarityData.forEach(({ topic_path, similarity_score, rank }) => {
    const pathSegments = topic_path.split("/");
    searchAndUpdate(treeData, pathSegments, 0, similarity_score, rank, []);
  });

  console.log(this.selectednodes, clickedNodes);
  this.selectednodes = [...this.selectednodes, ...clickedNodes];
  console.log("First matched node:", firstMatchedNode, selectedNodes);

  this.paragraphToHighlight = firstMatchedNode.content || firstMatchedNode.value || '';

  selectedNodes.forEach((firstMatchedNode: any) => {
    // Pre-generate word cloud data for performance
    const keys = firstMatchedNode.keywords || [];
    const wordCloudData = Array.isArray(keys) ? this.generateWordCloudData(keys) : [];
    
    // Generate keywords from summary immediately
    const summary = firstMatchedNode.summary || firstMatchedNode.value || '';
    const generatedKeys = summary ? this.extractKeywordsFromContent(summary, 15) : [];
    
  
    this.selectedTopicContents.push({
      name: firstMatchedNode.name || 'Unknown',
      path: firstMatchedNode.path,
      content: firstMatchedNode.content || firstMatchedNode.value || '',
      keys: keys,
      summary: summary,
      generatedKeys: generatedKeys,
      score: firstMatchedNode.similarity_score || 0,
      score2: firstMatchedNode.similarity_score2 || 0,
      score3: firstMatchedNode.similarity_score3 || 0,
      wordCloudData: wordCloudData
    });
  });

  console.log(this.selectedTopicContents,"selectedTopicContents");

  this.selectTopic(this.selectedTopicContents[0]);
  this.nodeName = firstMatchedNode.name || 'Unknown';
  this.nodePath = firstMatchedNode.path || this.nodeName;
  
  // Get the correct query message based on the selected query rank
  let queryMessageForAI = '';
  if (this.selectedQueryRank === '1' && this.selectedUSerMessage) {
    queryMessageForAI = this.selectedUSerMessage;
  } else if (this.selectedQueryRank === '2' && this.selectedUSerMessage2) {
    queryMessageForAI = this.selectedUSerMessage2;
  } else if (this.selectedQueryRank === '3' && this.selectedUSerMessage3) {
    queryMessageForAI = this.selectedUSerMessage3;
  }
  
  if (queryMessageForAI) {
    this.openaiService.askQuery(
      queryMessageForAI,
      firstMatchedNode.content || firstMatchedNode.value
    ).subscribe((res: any) => {
      if (res.response) {
        // Determine the query number
        const queryNum = this.selectedUSerMessage3 ? 'Q 3' : 
                         (this.selectedUSerMessage2 ? 'Q 2' : 'Q 1');
        
        this.chatMessages.push({
          role: 'assistant',
          content: res.response,
          name: firstMatchedNode.name,
          activeTab: 'summary',
          path: firstMatchedNode.path,
          no: queryNum,
          queryMessage:  firstMatchedNode.content || firstMatchedNode.value,
          query: this.selectedQueryRank,
          notes: [],
          noteOpen: false,
          wordCloudOpen: false,
          newNote: '',
          generatedKeywords: this.extractKeywordsFromContent(res.response, 20)
        });
      }
    });
  }
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
  q1Color: string = '#FFA500';  // Default orange for Q1
  q2Color: string = '#7474e2';  // Default blue for Q2
  q3Color: string = '#28a745';  // Default green for Q3
  
  // Filter state for sunburst charts
  selectAll: boolean = true;
  q1Selected: boolean = true;
  q2Selected: boolean = true;
  q3Selected: boolean = true;
  
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
  }

  onSunburstQueryToggle(query: 'q1' | 'q2' | 'q3'): void {
    // Show the Q1/Q2/Q3 card in the sunburst component (sunburst has built-in floating card logic)
    setTimeout(() => {
      if (this.sunburstChart) {
        this.sunburstChart.showCard(query);
      }
    }, 0);

    // If Select All is currently active, clicking a query should select only that query
    if (this.selectAll) {
      this.selectAll = false;
      this.q1Selected = false;
      this.q2Selected = false;
      this.q3Selected = false;
      
      // Now set the clicked query to true
      if (query === 'q1') {
        this.q1Selected = true;
      } else if (query === 'q2') {
        this.q2Selected = true;
      } else if (query === 'q3') {
        this.q3Selected = true;
      }
    } else {
      // Toggle the clicked query
      if (query === 'q1') {
        this.q1Selected = !this.q1Selected;
      } else if (query === 'q2') {
        this.q2Selected = !this.q2Selected;
      } else if (query === 'q3') {
        this.q3Selected = !this.q3Selected;
      }
      
      // If all are selected, automatically enable Select All
      if (this.q1Selected && this.q2Selected && this.q3Selected) {
        this.selectAll = true;
      }
      
      // If none are selected, default to Select All
      if (!this.q1Selected && !this.q2Selected && !this.q3Selected) {
        this.selectAll = true;
        this.q1Selected = true;
        this.q2Selected = true;
        this.q3Selected = true;
      }
    }
  }

  // Handle filter changes from sunburst component
  onSunburstFilterChanged(event: {selectAll: boolean, q1Selected: boolean, q2Selected: boolean, q3Selected: boolean}): void {
    this.selectAll = event.selectAll;
    this.q1Selected = event.q1Selected;
    this.q2Selected = event.q2Selected;
    this.q3Selected = event.q3Selected;
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
    
    // Sync to Q1/Q2/Q3 if this query is currently mapped to one of them
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
      '#FFA500',  // Orange
      '#7474e2',  // Purple
      '#4CAF50',  // Green
      '#964B00' ,  // Red
      '#fa709a', // Rose
      '#fee140', // Yellow
      '#30cfd0', // Cyan
      '#a8edea',  // Mint
      '#483490'
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
  '#FFA500',  // Orange
  '#7474e2',  // Purple
  '#4CAF50',  // Green
  '#FF6B6B',  // Red
  '#fa709a',  // Rose
  '#fee140',  // Yellow
  '#30cfd0',  // Cyan
  '#a8edea',  // Mint
  '#483490'   // Dark purple
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

  // Circle Tree Drag and Resize Functionality
  circleTreeTop: number = 0;
  circleTreeLeft: number = 0;
  circleTreeWidth: number = 150;
  circleTreeHeight: number = 150;
  isDragging: boolean = false;
  isResizing: boolean = false;
  dragStartX: number = 0;
  dragStartY: number = 0;
  resizeStartX: number = 0;
  resizeStartY: number = 0;
  resizeStartWidth: number = 0;
  resizeStartHeight: number = 0;
  isExpanded: boolean = false;

  onCircleTreeMouseDown(event: MouseEvent): void {
    // Prevent dragging when clicking on resize handle or expand icon
    const target = event.target as HTMLElement;
    if (target.classList.contains('circle-tree-resize-handle') || 
        target.classList.contains('expand-icon') ||
        target.closest('.circle-tree-resize-handle') ||
        target.closest('.expand-icon')) {
      return;
    }
  }

  onCircleTreeDragStart(event: MouseEvent): void {
    if (event.button !== 0) return; // Only left mouse button
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
    this.dragStartX = event.clientX - this.circleTreeLeft;
    this.dragStartY = event.clientY - this.circleTreeTop;
    document.addEventListener('mousemove', this.onCircleTreeDragMove);
    document.addEventListener('mouseup', this.onCircleTreeDragEnd);
  }

  onCircleTreeDragMove = (event: MouseEvent): void => {
    if (!this.isDragging) return;
    const cardElement = document.querySelector('.dashboard .card:first-child');
    if (cardElement) {
      const rect = cardElement.getBoundingClientRect();
      this.circleTreeLeft = Math.max(0, Math.min(event.clientX - this.dragStartX, rect.width - this.circleTreeWidth));
      this.circleTreeTop = Math.max(0, Math.min(event.clientY - this.dragStartY, rect.height - this.circleTreeHeight));
    }
  };

  onCircleTreeDragEnd = (): void => {
    this.isDragging = false;
    document.removeEventListener('mousemove', this.onCircleTreeDragMove);
    document.removeEventListener('mouseup', this.onCircleTreeDragEnd);
  };

  onResizeStart(event: MouseEvent): void {
    if (event.button !== 0) return; // Only left mouse button
    event.preventDefault();
    event.stopPropagation();
    this.isResizing = true;
    this.resizeStartX = event.clientX;
    this.resizeStartY = event.clientY;
    this.resizeStartWidth = this.circleTreeWidth;
    this.sizeScale = this.circleTreeWidth / 150;
    this.resizeStartHeight = this.circleTreeHeight;
    document.addEventListener('mousemove', this.onResizeMove);
    document.addEventListener('mouseup', this.onResizeEnd);
  }

  onResizeMove = (event: MouseEvent): void => {
    if (!this.isResizing) return;
    const deltaX = event.clientX - this.resizeStartX;
    const deltaY = event.clientY - this.resizeStartY;
    const cardElement = document.querySelector('.dashboard .card:first-child');
    if (cardElement) {
      const rect = cardElement.getBoundingClientRect();
      const newWidth = Math.max(150, Math.min(this.resizeStartWidth + deltaX, rect.width - this.circleTreeLeft));
      const newHeight = Math.max(150, Math.min(this.resizeStartHeight + deltaY, rect.height - this.circleTreeTop));
      this.circleTreeWidth = newWidth;
      this.circleTreeHeight = newHeight;
      this.sizeScale = this.circleTreeWidth / 150;
    }
  };

  onResizeEnd = (): void => {
    this.isResizing = false;
    document.removeEventListener('mousemove', this.onResizeMove);
    document.removeEventListener('mouseup', this.onResizeEnd);
  };

  toggleCircleTreeExpand(): void {
    if (this.isExpanded) {
      // Collapse to original size
      this.circleTreeWidth = 150;
      this.circleTreeHeight = 150;
    } else {
      // Expand to larger size
      const cardElement = document.querySelector('.dashboard .card:first-child');
      if (cardElement) {
        const rect = cardElement.getBoundingClientRect();
        this.circleTreeWidth = Math.min(400, rect.width - this.circleTreeLeft - 20);
        this.circleTreeHeight = Math.min(400, rect.height - this.circleTreeTop - 20);
      }
    }
    this.isExpanded = !this.isExpanded;
  }

  // Section Height Resize Functionality
  querySelectionHeightPercent: number = 45; // Default height percentage for query selection section
  isResizingSection: boolean = false;
  sectionResizeStartY: number = 0;
  sectionResizeStartHeight: number = 45;

  onSectionResizeStart(event: MouseEvent): void {
    if (event.button !== 0) return; // Only left mouse button
    event.preventDefault();
    event.stopPropagation();
    this.isResizingSection = true;
    this.sectionResizeStartY = event.clientY;
    this.sectionResizeStartHeight = this.querySelectionHeightPercent;
    document.addEventListener('mousemove', this.onSectionResizeMove);
    document.addEventListener('mouseup', this.onSectionResizeEnd);
  }

  // Floating chart window methods (Circle Tree only)
  toggleFloatingChart(chartType: 'circle-tree'): void {
    this.showCircleTreeWindow = !this.showCircleTreeWindow;
    if (this.showCircleTreeWindow && !this.circleTreeExpanded) {
      this.circleTreeExpanded = true;
    }
  }

  closeFloatingChart(chartType: 'circle-tree'): void {
    this.showCircleTreeWindow = false;
  }

  toggleWindowExpand(chartType: 'circle-tree'): void {
    this.circleTreeExpanded = !this.circleTreeExpanded;
    if (this.circleTreeExpanded) {
      setTimeout(() => {
        this.recalculateChartDimensions('circle-tree');
      }, 200);
    }
  }

  onWindowMouseDown(event: MouseEvent, windowType: 'circle-tree'): void {
    if (event.button !== 0) return;
    
    this.isDraggingWindow = true;
    this.draggingWindow = windowType;
    
    const currentPosition = this.circleTreePosition;
    
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
      
      const minWidth = 700;
      const minHeight = 400;
      const maxWidth = window.innerWidth - 50;
      const maxHeight = window.innerHeight - 50;
      
      let newWidth = Math.max(minWidth, Math.min(maxWidth, this.windowResizeStart.width + deltaX));
      let newHeight = Math.max(minHeight, Math.min(maxHeight, this.windowResizeStart.height + deltaY));
      
      if (this.circleTreeSize.width !== newWidth || this.circleTreeSize.height !== newHeight) {
        this.circleTreeSize = { width: newWidth, height: newHeight };
      }
    } else if (this.isDraggingWindow && this.draggingWindow) {
      const windowWidth = this.circleTreeSize.width;
      const windowHeight = this.circleTreeSize.height;
      
      let newX = event.clientX - this.windowDragOffset.x;
      let newY = event.clientY - this.windowDragOffset.y;
      
      newX = Math.max(0, Math.min(newX, window.innerWidth - windowWidth));
      newY = Math.max(0, Math.min(newY, window.innerHeight - windowHeight));
      
      this.circleTreePosition = { x: newX, y: newY };
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
  
  // Recalculate chart dimensions when window is resized
  private recalculateChartDimensions(windowType: 'circle-tree'): void {
    setTimeout(() => {
      if (this.circleTreeChart) {
        this.circleTreeChart.recalculateDimensions();
      }
    }, 100);
  }

  onWindowResizeMouseDown(event: MouseEvent, windowType: 'circle-tree'): void {
    event.stopPropagation();
    event.preventDefault();
    
    this.isResizingWindow = true;
    this.resizingWindow = windowType;
    
    const currentSize = this.circleTreeSize;
    
    this.windowResizeStart = {
      x: event.clientX,
      y: event.clientY,
      width: currentSize.width,
      height: currentSize.height
    };
    
    document.addEventListener('mousemove', this.onWindowMouseMove);
    document.addEventListener('mouseup', this.onWindowMouseUp);
  }

  onSectionResizeMove = (event: MouseEvent): void => {
    if (!this.isResizingSection) return;
    const queryMainCard = document.querySelector('.query-main-card');
    if (queryMainCard) {
      const rect = queryMainCard.getBoundingClientRect();
      const deltaY = event.clientY - this.sectionResizeStartY;
      const totalHeight = rect.height;
      const deltaPercent = (deltaY / totalHeight) * 100;
      const newHeight = Math.max(20, Math.min(80, this.sectionResizeStartHeight + deltaPercent));
      this.querySelectionHeightPercent = newHeight;
    }
  };

  onSectionResizeEnd = (): void => {
    this.isResizingSection = false;
    document.removeEventListener('mousemove', this.onSectionResizeMove);
    document.removeEventListener('mouseup', this.onSectionResizeEnd);
  };
}

