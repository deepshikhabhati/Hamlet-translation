import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, ChangeDetectorRef, AfterViewInit, OnDestroy, AfterViewChecked } from '@angular/core';
import { AI } from 'src/assets/AI';
import Chart from 'chart.js/auto';
import { ChapterColorService } from '../chapter-color.service';

@Component({
  selector: 'app-topic-list',
  templateUrl: './topiclist.component.html',
  styleUrls: ['./topiclist.component.css']
})
export class TopiclistComponent implements OnChanges, OnInit, AfterViewInit, OnDestroy, AfterViewChecked {
  @Input() topics: any[] = [];
  @Input() searchTerms: any = [];
  @Input() nodeName: any = '';
  @Input() nodePath: any = '';
  @Input() selectedRank: any = 1;
  @Input() selectedFlagColor: any = '';
  @Input() chunkSize: any = 20;
    @Input() selectedColor: any = 'green';
  @Input() querySelected: any = '';
  @Input() q1Color: string = '#FFA500';
  @Input() q2Color: string = '#7474e2';
  @Input() q3Color: string = '#28a745';
  @Input() topicsWithNotes: any[] = [];
  @Input() selectedQueryNumber: number = 0;
  @Input() expandFirstLevel: boolean = false;
  @Input() q1Selected: boolean = true;
  @Input() q2Selected: boolean = true;
  @Input() q3Selected: boolean = true;
  @Input() selectAll: boolean = true;
 @Output() nodeClicked = new EventEmitter<any>();
 
// Store score ranges for normalization
private scoreRanges: { [key: string]: { min: number, max: number } } = {};
// Store Chart.js instances
private chartInstances: Map<string, Chart> = new Map();
// Store ranked nodes for each query (for rank-based antenna bars)
private rankedNodes: { [queryRank: string]: Array<{ score: number }> } = {};

  constructor(
    private cdr: ChangeDetectorRef,
    private chapterColor: ChapterColorService
  ) {}

  ngOnInit(): void {
    // Expand first-level topics on initial load if expandFirstLevel is true
    if (this.expandFirstLevel && this.topics && this.topics.length > 0) {
      setTimeout(() => {
        this.expandAllFirstLevelTopics();
        this.cdr.detectChanges();
      }, 300);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Calculate score ranges for proper antenna bar scaling
    // Do this immediately and also in setTimeout to catch all cases
    if (this.topics && this.topics.length > 0) {
      this.calculateScoreRanges(this.topics);
    }
    
    setTimeout(() => {
      if (this.topics && this.topics.length > 0) {
        this.calculateScoreRanges(this.topics);
      }
      
      // Expand first-level topics if expandFirstLevel is true
      if (this.expandFirstLevel && this.topics && this.topics.length > 0) {
        this.expandAllFirstLevelTopics();
        this.cdr.detectChanges();
      }
    }, 100);

    // Check if topics changed or expandFirstLevel changed
    if ((changes['topics'] || changes['expandFirstLevel']) && this.expandFirstLevel && this.topics && this.topics.length > 0) {
      setTimeout(() => {
        this.expandAllFirstLevelTopics();
        this.cdr.detectChanges();
      }, 200);
    }

    // When nodeName changes (e.g. from sunburst click), expand path and scroll to node
    if ((changes['nodeName'] || changes['nodePath']) && (this.nodePath || this.nodeName) && this.topics?.length) {
      setTimeout(() => {
        this.expandPathToNode(this.topics, this.nodePath || this.nodeName);
        this.scrollToNode(this.nodePath || this.nodeName);
        this.cdr.detectChanges();
      }, 150);
    }

    console.log(this.topics,this.selectedRank,18);
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.initializeAllCharts();
    }, 500);
  }

  ngAfterViewChecked(): void {
    // Initialize any new charts that appeared in the DOM
    // Use a flag to prevent infinite loops and throttle updates
    if (!this._isInitializing) {
      this._isInitializing = true;
      requestAnimationFrame(() => {
        setTimeout(() => {
          // Only initialize charts for new canvas elements
          this.initializeNewCharts();
          this._isInitializing = false;
        }, 100);
      });
    }
  }

  private _isInitializing = false;

  // Initialize only new charts that don't exist yet
  private initializeNewCharts(): void {
    if (!this.topics || this.topics.length === 0) return;
    
    const allCanvases = document.querySelectorAll('canvas[id^="chart-"]');
    allCanvases.forEach((canvas: any) => {
      const canvasId = canvas.id;
      if (!this.chartInstances.has(canvasId)) {
        // Extract info from canvas ID and find the node
        const parts = canvasId.split('-');
        if (parts.length >= 3) {
          const type = parts[1] as 'ai' | 'regular';
          const isAI = type === 'ai';
          const node = this.findNodeByChartId(canvasId, this.topics);
          if (node) {
            // Only show charts when toggle is on
            const shouldShow = this.showAIBarChart && (
              isAI 
                ? this.getAIBarChartData(node).length > 0
                : this.getAllScores(node).length > 0
            );
            if (shouldShow) {
              this.createBarChart(node, canvasId, isAI);
            }
          }
        }
      }
    });
  }

  ngOnDestroy(): void {
    // Destroy all chart instances
    this.chartInstances.forEach((chart) => chart.destroy());
    this.chartInstances.clear();
  }

  toggleTopic(topic: any): void {
    // Collapse all other top-level topics
    this.topics.forEach(t => {
      if (t !== topic && t.expanded) {
        t.expanded = false;
        this.collapseAllChildren(t);
      }
    });

    topic.selected = true

    if(!this.querySelected) {
    topic.expanded = !topic.expanded;
  }
  topic.selected = topic.expanded

    if(topic.expanded) {
      this.searchTerms.push(topic.name);
    } else {
      this.searchTerms = this.searchTerms.filter((name: any) => name !== topic.name)
    }

    // No need for setTimeout with antenna bars as they're template-driven
    this.calculateScoreRanges([topic]);
    const data: any = {
      name: topic.name,
      content: topic.content,
      summary: topic.summary,
      score: topic.similarity_score,
      score2: topic.similarity_score2,
      keys: topic.keywords,
      path: this.getNodePath(topic),
      child:this.topics
    }

    this.nodeClicked.emit(data);
  }

matrixColors = ['red', 'green', 'yellow', 'purple'];

getBackgroundColor(rank: number | undefined,i?:any): string {
  if (rank === undefined || rank === null) return '#f0f0f0'; // default gray

  // normalize rank 0–1
  const normalized = Math.min(1, Math.max(0, rank / this.chunkSize));

  // Get the current query color based on selectedRank
  let baseColor: string;
  switch(i) {
    case '1':
      baseColor = this.q1Color;
      break;
    case '2':
      baseColor = this.q2Color;
      break;
    case '3':
      baseColor = this.q3Color;
      break;
    default:
      baseColor = this.q1Color;
  }

  // Convert hex to RGB
  const hex = baseColor.replace('#', '');
  const baseR = parseInt(hex.substr(0, 2), 16);
  const baseG = parseInt(hex.substr(2, 2), 16);
  const baseB = parseInt(hex.substr(4, 2), 16);

  // Create gradient from light to base color
  const lightR = Math.min(255, baseR + (255 - baseR) * 0.7); // 70% lighter
  const lightG = Math.min(255, baseG + (255 - baseG) * 0.7);
  const lightB = Math.min(255, baseB + (255 - baseB) * 0.7);

  // interpolate from light color to base color based on normalized rank
  const r = Math.round(lightR + (baseR - lightR) * normalized);
  const g = Math.round(lightG + (baseG - lightG) * normalized);
  const b = Math.round(lightB + (baseB - lightB) * normalized);

  return `rgb(${r}, ${g}, ${b})`;
}

// Get background color for a topic based on selected queries and priority (Q1 > Q2 > Q3)
getTopicBackgroundColor(topic: any): string {
  // Priority: Q1 > Q2 > Q3
  // Only use a rank if its corresponding query is selected (or selectAll is true)
  
  if (this.selectAll || this.q1Selected) {
    if (topic.rank !== undefined && topic.rank !== null) {
      return this.getBackgroundColor(topic.rank, '1');
    }
  }
  
  if (this.selectAll || this.q2Selected) {
    if (topic.rank2 !== undefined && topic.rank2 !== null) {
      return this.getBackgroundColor(topic.rank2, '2');
    }
  }
  
  if (this.selectAll || this.q3Selected) {
    if (topic.rank3 !== undefined && topic.rank3 !== null) {
      return this.getBackgroundColor(topic.rank3, '3');
    }
  }
  
  // If no matching rank found, return default
  return '';
}

/**
 * Get solid query color as background when a query is selected and topic has a score for it.
 * Used for topic-list row background when query filter is active.
 */
getQueryBackgroundColor(topic: any): string {
  if (!topic) return '';
  // Priority: Q1 > Q2 > Q3
  if (this.q1Selected && topic.similarity_score != null && topic.similarity_score > 0) {
    return this.q1Color;
  }
  if (this.q2Selected && topic.similarity_score2 != null && topic.similarity_score2 > 0) {
    return this.q2Color;
  }
  if (this.q3Selected && topic.similarity_score3 != null && topic.similarity_score3 > 0) {
    return this.q3Color;
  }
  return '';
}

/**
 * Get chapter-based background color for hierarchical topic display.
 * Same logic as sunburst: chapter index → unique color, children inherit with lighter shades.
 * @param chapterIndex 0-based index of the top-level chapter
 * @param depth 0=chapter, 1=subchapter, 2=sub-subchapter, 3=leaf
 */
getChapterBackgroundColor(chapterIndex: number, depth: number): string {
  return this.chapterColor.getTopicColor(chapterIndex, depth);
}


  
// Calculate score ranges for proper antenna bar normalization
calculateScoreRanges(nodes: any[]) {
  const scores1: number[] = [];
  const scores2: number[] = [];
  const scores3: number[] = [];
  
  this.collectAllScores(nodes, scores1, scores2, scores3);
  
  this.scoreRanges['1'] = {
    min: scores1.length > 0 ? Math.min(...scores1) : 0,
    max: scores1.length > 0 ? Math.max(...scores1) : 100
  };
  
  this.scoreRanges['2'] = {
    min: scores2.length > 0 ? Math.min(...scores2) : 0,
    max: scores2.length > 0 ? Math.max(...scores2) : 100
  };
  
  this.scoreRanges['3'] = {
    min: scores3.length > 0 ? Math.min(...scores3) : 0,
    max: scores3.length > 0 ? Math.max(...scores3) : 100
  };
  
  // Calculate ranked nodes for each query (top 5 nodes with scores)
  this.rankedNodes['1'] = scores1
    .filter(s => s !== undefined && s !== null)
    .sort((a, b) => b - a) // Sort descending
    .slice(0, 5) // Take top 5
    .map(score => ({ score }));
  
  this.rankedNodes['2'] = scores2
    .filter(s => s !== undefined && s !== null)
    .sort((a, b) => b - a) // Sort descending
    .slice(0, 5) // Take top 5
    .map(score => ({ score }));
  
  this.rankedNodes['3'] = scores3
    .filter(s => s !== undefined && s !== null)
    .sort((a, b) => b - a) // Sort descending
    .slice(0, 5) // Take top 5
    .map(score => ({ score }));
  
  // Debug logging to verify score ranges
  // console.log('📊 Score Ranges Calculated:');
  // console.log(`Query 1: ${this.scoreRanges['1'].min} - ${this.scoreRanges['1'].max} (${scores1.length} scores)`);
  // console.log(`Query 2: ${this.scoreRanges['2'].min} - ${this.scoreRanges['2'].max} (${scores2.length} scores)`);
  // console.log(`Query 3: ${this.scoreRanges['3'].min} - ${this.scoreRanges['3'].max} (${scores3.length} scores)`);
  
  // if (scores1.length > 0) {
  //   console.log(`Query 1 scores: [${scores1.sort((a, b) => b - a).slice(0, 5).join(', ')}${scores1.length > 5 ? '...' : ''}]`);
  // }
}

// Recursively collect all scores from nodes
collectAllScores(nodes: any[], scores1: number[], scores2: number[], scores3: number[]) {
  nodes.forEach((node) => {
    if (node.similarity_score !== undefined && node.similarity_score !== null) {
      scores1.push(node.similarity_score);
    }
    if (node.similarity_score2 !== undefined && node.similarity_score2 !== null) {
      scores2.push(node.similarity_score2);
    }
    if (node.similarity_score3 !== undefined && node.similarity_score3 !== null) {
      scores3.push(node.similarity_score3);
    }
    
    if (node.children?.length) {
      this.collectAllScores(node.children, scores1, scores2, scores3);
    }
  });
}


isSelected(node: any, parent?: any, grandParent?: any, greatGrandParent?: any): boolean {
  const selectedPath = this.nodePath || this.nodeName;
  if (!selectedPath) return false;

  const nodePath = this.getNodePath(node, parent, grandParent, greatGrandParent);
  return selectedPath === nodePath || (!this.nodePath && this.nodeName === node?.name);
}
// Generate antenna bars based on rank among top 5 nodes
formatBracketScore(score: number | undefined | null): string {
  if (score === undefined || score === null || Number.isNaN(score)) {
    return '';
  }
  return `(${score.toFixed(1)})`;
}

getAntennaBars(score: number, queryRank: string): { active: boolean }[] {
  if (score === undefined || score === null) {
    return Array(5).fill({ active: false });
  }

  // Get ranked nodes for this query
  const rankedNodes = this.rankedNodes[queryRank];
  if (!rankedNodes || rankedNodes.length === 0) {
    // Fallback if ranked nodes not calculated yet - give minimum bars
    return Array(5).fill(null).map((_, index) => ({
      active: index < 1
    }));
  }

  // Find the rank of this score among the top nodes
  // Rank 1 = highest score = 5 bars, Rank 2 = 4 bars, Rank 3 = 3 bars, Rank 4 = 2 bars, Rank 5 = 1 bar
  let rank = -1;
  for (let i = 0; i < rankedNodes.length; i++) {
    if (Math.abs(rankedNodes[i].score - score) < 0.01) { // Use small tolerance for floating point comparison
      rank = i + 1; // Rank is 1-based
      break;
    }
  }

  // If score not found in top 5, check if it's higher than any of them
  if (rank === -1) {
    if (score > rankedNodes[0].score) {
      rank = 1; // Highest score
    } else if (rankedNodes.length < 5) {
      // If we have less than 5 nodes, assign rank based on position
      rank = rankedNodes.length + 1;
    } else {
      // Score is lower than all top 5, assign minimum rank
      rank = 5;
    }
  }

  // Assign bars based on rank: rank 1 = 5 bars, rank 2 = 4 bars, etc.
  const barCount = 6 - rank; // rank 1 -> 5 bars, rank 2 -> 4 bars, rank 3 -> 3 bars, rank 4 -> 2 bars, rank 5 -> 1 bar
  const finalBarCount = Math.max(1, Math.min(5, barCount));
  
  
  return Array(5).fill(null).map((_, index) => ({
    active: index < finalBarCount
  }));
}

/** Returns rank (1–5) for a score within the query's top nodes; same logic as antenna bars. */
getRankForScore(score: number, queryRank: string): number {
  if (score === undefined || score === null) return 5;
  const rankedNodes = this.rankedNodes[queryRank];
  if (!rankedNodes || rankedNodes.length === 0) return 5;
  let rank = -1;
  for (let i = 0; i < rankedNodes.length; i++) {
    if (Math.abs(rankedNodes[i].score - score) < 0.01) {
      rank = i + 1;
      break;
    }
  }
  if (rank === -1) {
    if (score > rankedNodes[0].score) rank = 1;
    else if (rankedNodes.length < 5) rank = rankedNodes.length + 1;
    else rank = 5;
  }
  return Math.max(1, Math.min(5, rank));
}

/** Rank-based scores for donut chart: same rank as antenna (rank 1 = 100, rank 2 = 80, ... rank 5 = 20). */
getRankBasedScoresForDonut(node: any): Array<{ score: number; color: string; query: string }> {
  const result: Array<{ score: number; color: string; query: string }> = [];
  if (node.similarity_score !== undefined && node.similarity_score !== null) {
    const rank = this.getRankForScore(node.similarity_score, '1');
    const rankScore = ((6 - rank) / 5) * 100; // rank 1->100, 2->80, 3->60, 4->40, 5->20
    result.push({ score: rankScore, color: this.q1Color, query: 'Q1' });
  }
  if (node.similarity_score2 !== undefined && node.similarity_score2 !== null) {
    const rank = this.getRankForScore(node.similarity_score2, '2');
    const rankScore = ((6 - rank) / 5) * 100;
    result.push({ score: rankScore, color: this.q2Color, query: 'Q2' });
  }
  if (node.similarity_score3 !== undefined && node.similarity_score3 !== null) {
    const rank = this.getRankForScore(node.similarity_score3, '3');
    const rankScore = ((6 - rank) / 5) * 100;
    result.push({ score: rankScore, color: this.q3Color, query: 'Q3' });
  }
  return result;
}

// Get all scores for a node to display in bar chart
getAllScores(node: any): Array<{ score: number; color: string; query: string }> {
  const scores: Array<{ score: number; color: string; query: string }> = [];
  
  if (node.similarity_score !== undefined && node.similarity_score !== null) {
    scores.push({ score: node.similarity_score, color: this.q1Color, query: 'Q1' });
  }
  if (node.similarity_score2 !== undefined && node.similarity_score2 !== null) {
    scores.push({ score: node.similarity_score2, color: this.q2Color, query: 'Q2' });
  }
  if (node.similarity_score3 !== undefined && node.similarity_score3 !== null) {
    scores.push({ score: node.similarity_score3, color: this.q3Color, query: 'Q3' });
  }
  
  return scores;
}

// Get max score for normalization (0-100 scale)
getMaxScore(node: any): number {
  const scores = [
    node.similarity_score,
    node.similarity_score2,
    node.similarity_score3
  ].filter(s => s !== undefined && s !== null);
  
  if (scores.length === 0) return 100;
  
  const max = Math.max(...scores);
  // If max is 0, return 100 to avoid division by zero
  return max > 0 ? max : 100;
}

// Get max score for bar chart normalization
getMaxScoreForBarChart(node: any): number {
  const scores = this.getAllScores(node);
  if (scores.length === 0) return 100;
  const maxScore = Math.max(...scores.map(s => s.score));
  return maxScore > 0 ? maxScore : 100;
}

// Get bar chart dimensions
getBarChartDimensions(): { width: number; height: number; padding: number; barWidth: number; chartHeight: number; chartWidth: number; axisOffset: number } {
  return {
    width: 10,
    height: 10,
    padding: 2,
    barWidth: 4,
    chartHeight: 16, // height - 2*padding
    chartWidth: 22,   // width - 2*padding
    axisOffset: 8 // Space for Y-axis labels
  };
}

// Get bar height in pixels
getBarHeight(score: number, maxScore: number, chartHeight: number): number {
  if (!maxScore || maxScore === 0 || !score) return 2; // Minimum height
  const percentage = (score / maxScore) * 100;
  return Math.max(2, (percentage / 100) * chartHeight);
}

// Get bar X position
getBarX(index: number, totalBars: number, chartWidth: number, barWidth: number): number {
  const spacing = (chartWidth - (totalBars * barWidth)) / (totalBars + 1);
  return spacing + index * (barWidth + spacing);
}

// Get formatted title string for score donut chart
getScoreBarTitle(node: any): string {
  const scores = this.getAllScores(node);
  if (scores.length === 0) return '';
  
  return scores.map(s => s.query + ': ' + s.score.toFixed(2)).join(', ');
}

getSelectedFlagColor(): any {
  switch(this.selectedRank) {
    case '1':
      return this.q1Color;
    case '2':
      return this.q2Color;
    case '3':
      return this.q3Color;
  }
}

  
  
  scrollToNode(nodeName: string) {
    const id = this.getNodeDomId(nodeName);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('scroll-highlight');
      setTimeout(() => el.classList.remove('scroll-highlight'), 2000);
    }
  }

  /** Expand the path from root to the node so it becomes visible (e.g. after sunburst click) */
  expandPathToNode(nodes: any[], targetName: string, parentPath = ''): boolean {
    if (!nodes) return false;
    for (const node of nodes) {
      const currentPath = parentPath ? `${parentPath} --> ${node.name}` : node.name;
      if (node.name === targetName || currentPath === targetName) {
        return true;
      }
      if (node.children?.length && this.expandPathToNode(node.children, targetName, currentPath)) {
        node.expanded = true;
        node.expanded2 = true;
        node.rexpanded = true;
        return true;
      }
    }
    return false;
  }

  toggleChild(parent: any, child: any): void {
    if (!parent.children) return;

    // Collapse all other siblings
    parent.children.forEach((c: any) => {
      if (c !== child && !c.expanded) {
        c.expanded = false;
        this.collapseAllChildren(c);
      }
    });

    child.selected = true;

    this.searchTerms.push(child.name);

    if(!this.querySelected) {
      child.expanded = !child.expanded;
    }
    child.selected = child.expanded

    const data: any = {
      name: child.name,
      content: child.content || child.value,
      summary: child.summary || child.value,
      keys: child.keywords,
      path: this.getNodePath(child, parent),
      score: child.similarity_score,
      score2: child.similarity_score2,
      child:this.topics
    }

    // No need for setTimeout with antenna bars as they're template-driven
    this.calculateScoreRanges([child]);
    // console.log(child)

    this.nodeClicked.emit(data);
  }

    toggleSubChild(parent: any, child: any,path1: any): void {
    if (!parent.children) return;

    // Collapse all other siblings
    parent.children.forEach((c: any) => {
      if (c !== child && !c.expanded) {
        c.expanded = false;
        this.collapseAllChildren(c);
      }
    });

    child.selected = true;

    this.searchTerms.push(child.name);

    if(!this.querySelected) {
      child.expanded = !child.expanded;
    }
    child.selected = child.expanded

    const data: any = {
      name: child.name,
      content: child.content || child.value,
      summary: child.summary || child.value,
      keys: child.keywords,
      path: this.getNodePath(child, parent, path1),
      score: child.similarity_score,
      score2: child.similarity_score2,
      child:this.topics
    }

    // No need for setTimeout with antenna bars as they're template-driven
    this.calculateScoreRanges([child]);
    // console.log(child)

    this.nodeClicked.emit(data);
  }

  collapseAllChildren(topic: any): void {
    if (topic.children) {
      topic.children.forEach((child: any) => {
        child.expanded = false;
        this.collapseAllChildren(child);
      });
    }
  }

  expandAllFirstLevelTopics(): void {
    if (this.topics && this.topics.length > 0) {
      this.topics.forEach((topic: any) => {
        topic.expanded = true;
        topic.expanded2 = true;
        topic.selected = true;
      });
      console.log('Expanded first-level topics:', this.topics.length);
    }
  }

  getScoreColor(score: number): string {
    if (score < 50) return '#f44336'; // red
    else if (score < 75) return '#ff9800'; // orange
    else return '#4caf50'; // green
  }

  matchesSearch(name: string): boolean {
    if (!this.searchTerms.length) return false;

    return this.searchTerms.some((term: any) =>
      name.toLowerCase().includes(term.toLowerCase())
    );
  }

  getNodePath(node: any, parent?: any, grandParent?: any, greatGrandParent?: any): string {
    return [greatGrandParent, grandParent, parent, node]
      .filter(Boolean)
      .map((item: any) => item.name)
      .join(' --> ');
  }

  getNodeDomId(pathOrName: string): string {
    return 'node-' + String(pathOrName || '')
      .replace(/\s+/g, '-')
      .replace(/[^a-zA-Z0-9-_]/g, '');
  }

  setQueryValue() {
    if(!this.queryValue) {

    }
    this.queryValue = !this.queryValue
  }

  queryValue: boolean = true; // or set dynamically
   query: boolean = false; // or set dynamically
  showAIBarChart: boolean = false; // Toggle for AI bar chart

  getSelectedBackgroundColor(): string {
    switch(this.selectedRank) {
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

  hasNotes(topicName: string): boolean {
    const topicWithNotes = this.topicsWithNotes.find(t => t.name === topicName);
    return topicWithNotes && topicWithNotes.notes && Array.isArray(topicWithNotes.notes) && topicWithNotes.notes.length > 0;
  }


// Recursive visibility checker
isVisible(node: any): boolean {
  if (!this.queryValue) {
    return false;
  }

  if (node.expanded) {
    return true;
  }

  if (node.children && node.children.length) {
    return node.children.some((child: any) => this.isVisible(child));
  }

  return false;
}

// Toggle AI bar chart display
toggleAIBarChart(): void {
  this.showAIBarChart = !this.showAIBarChart;
  
  // If toggle is turned off, destroy all charts
  if (!this.showAIBarChart) {
    this.chartInstances.forEach((chart) => chart.destroy());
    this.chartInstances.clear();
  } else {
    // If toggle is turned on, initialize charts
    setTimeout(() => {
      this.initializeAllCharts();
    }, 100);
  }
  // Destroy all existing charts and reinitialize
  this.chartInstances.forEach((chart) => chart.destroy());
  this.chartInstances.clear();
  setTimeout(() => {
    this.initializeAllCharts();
  }, 100);
}

// Recursively find node in AI data by name
private findNodeInAI(nodeName: string, aiData: any): any | null {
  if (!aiData) return null;
  
  if (aiData.name === nodeName) {
    return aiData;
  }
  
  if (aiData.children && Array.isArray(aiData.children)) {
    for (const child of aiData.children) {
      const found = this.findNodeInAI(nodeName, child);
      if (found) return found;
    }
  }
  
  return null;
}

// Get AI score for a node based on selectedQueryNumber
getAIScoreForNode(node: any): number | null {
  if (!node || !node.name || this.selectedQueryNumber === 0) {
    return null;
  }
  
  // Find the node in AI data
  const aiNode = this.findNodeInAI(node.name, AI);
  
  if (!aiNode) {
    return null;
  }
  
  // Get score based on selectedQueryNumber (1, 2, or 3)
  // The "s" property in AI.ts seems to be a general score
  // For query-specific scores, we might need to check for s1, s2, s3 or similar
  // For now, using "s" property if available
  if (aiNode.s !== undefined && aiNode.s !== null) {
    return aiNode.s;
  }
  
  // Try query-specific properties (s1, s2, s3 or similar)
  const scoreProperty = `s${this.selectedQueryNumber}`;
  if (aiNode[scoreProperty] !== undefined && aiNode[scoreProperty] !== null) {
    return aiNode[scoreProperty];
  }
  
  return null;
}

// Get AI bar chart data for a node
getAIBarChartData(node: any): Array<{ score: number; color: string; query: string }> {
  const score = this.getAIScoreForNode(node);
  
  if (score === null || score === undefined) {
    return [];
  }
  
  // Get the appropriate color based on selectedQueryNumber
  let color: string;
  let query: string;
  
  switch (this.selectedQueryNumber) {
    case 1:
      color = this.q1Color;
      query = 'Q1';
      break;
    case 2:
      color = this.q2Color;
      query = 'Q2';
      break;
    case 3:
      color = this.q3Color;
      query = 'Q3';
      break;
    default:
      color = this.q1Color;
      query = 'Q1';
  }
  
  return [{ score: score, color: color, query: query }];
}

// Get max score for AI bar chart normalization
getMaxScoreForAIBarChart(node: any): number {
  const score = this.getAIScoreForNode(node);
  if (score === null || score === undefined) {
    return 100;
  }
  return score > 0 ? score : 100;
}

// Generate unique chart ID for a node
getChartId(node: any, type: 'ai' | 'regular' = 'regular', index?: number): string {
  const nodeName = node?.name || 'unknown';
  const sanitizedName = nodeName.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '');
  
  // Use index if provided, otherwise use node's internal ID or create a hash
  let uniqueId: string;
  if (index !== undefined) {
    uniqueId = index.toString();
  } else if (node._chartId) {
    uniqueId = node._chartId;
  } else {
    // Generate a unique ID based on node name and object reference
    uniqueId = this.simpleHash(nodeName + (node?.id || '') + JSON.stringify(node).substring(0, 50));
    node._chartId = uniqueId; // Cache it for future use
  }
  
  return `chart-${type}-${sanitizedName}-${uniqueId}`;
}

// Simple hash function for generating unique IDs
private simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

// Build full path for a node to ensure unique IDs
private buildNodePath(node: any, nodes: any[], parentPath: string = ''): string {
  // Find the node's index in its parent's children
  let currentPath = parentPath;
  if (parentPath) {
    currentPath = `${parentPath}-${node.name}`;
  } else {
    // For root level, use index
    const index = nodes.findIndex(n => n === node);
    currentPath = `root-${index}-${node.name}`;
  }
  return currentPath;
}

// Create or update Chart.js donut chart
createBarChart(node: any, canvasId: string, isAI: boolean = false): void {
  // Destroy existing chart if it exists
  if (this.chartInstances.has(canvasId)) {
    this.chartInstances.get(canvasId)?.destroy();
    this.chartInstances.delete(canvasId);
  }

  const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
  if (!canvas) {
    console.warn(`Canvas not found for ID: ${canvasId}`);
    return;
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    console.warn(`Could not get 2d context for canvas: ${canvasId}`);
    return;
  }
  
  // Ensure canvas has proper dimensions (square for donut chart)
  if (canvas.width === 0 || canvas.height === 0) {
    canvas.width = 20;
    canvas.height = 20;
  }
  
  console.log(`Creating Chart.js donut chart for ${canvasId}, canvas size: ${canvas.width}x${canvas.height}`);

  let data: Array<{ score: number; color: string; query: string }> = [];
  let labels: string[] = [];
  let colors: string[] = [];
  let scores: number[] = [];

  if (isAI) {
    data = this.getAIBarChartData(node);
  } else {
    // Use rank-based values (same rank as antenna chart) instead of similarity_score
    data = this.getRankBasedScoresForDonut(node);
  }

  if (data.length === 0) {
    return;
  }

  // For donut chart: if single score, show score + remainder (100 - score)
  // If multiple scores, show all scores (they should sum to represent the total)
  if (data.length === 1) {
    // Single score: show as percentage of 100
    const score = data[0].score;
    const normalizedScore = Math.min(100, Math.max(0, score)); // Clamp between 0-100
    const remainder = 100 - normalizedScore;
    
    labels = [data[0].query, 'Remaining'];
    colors = [data[0].color, '#e0e0e0']; // Gray for remainder
    scores = [normalizedScore, remainder];
  } else {
    // Multiple scores: show all scores
    // Normalize scores to sum to 100 if needed, or show them proportionally
    labels = data.map(d => d.query);
    colors = data.map(d => d.color);
    const rawScores = data.map(d => d.score);
    
    // Calculate total for normalization
    const total = rawScores.reduce((sum, s) => sum + s, 0);
    
    if (total > 0) {
      // Normalize to 100% if total exceeds 100, otherwise show as-is
      if (total > 100) {
        scores = rawScores.map(s => (s / total) * 100);
      } else {
        scores = rawScores;
        // Add remainder if total is less than 100
        const remainder = 100 - total;
        if (remainder > 0) {
          labels.push('Remaining');
          colors.push('#e0e0e0');
          scores.push(remainder);
        }
      }
    } else {
      scores = rawScores;
    }
  }
  
  console.log('Donut chart data:', { labels, scores, colors });
  
  const chart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        label: 'Score',
        data: scores,
        backgroundColor: colors,
        borderColor: '#ffffff',
        borderWidth: 1
      }]
    },
    options: {
      responsive: false, // Disable responsive for fixed-size canvas
      maintainAspectRatio: false,
      cutout: '30%', // Create the donut hole (60% of the radius)
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          enabled: false,
          callbacks: {
            label: (context: any) => {
              const label = context.label || '';
              const value = context.parsed || 0;
              return `${label}: ${value.toFixed(2)}`;
            }
          }
        }
      }
    }
  });

  this.chartInstances.set(canvasId, chart);
  console.log(`Chart created successfully for ${canvasId}, data points: ${scores.length}`);
}


// Initialize chart for a specific node
initChart(node: any, isAI: boolean = false): void {
  const canvasId = this.getChartId(node, isAI ? 'ai' : 'regular');
  // Use requestAnimationFrame for better timing
  requestAnimationFrame(() => {
    setTimeout(() => {
      this.createBarChart(node, canvasId, isAI);
    }, 10);
  });
}

// Initialize all charts recursively
initializeAllCharts(): void {
  if (!this.topics || this.topics.length === 0) return;
  
  // Use requestAnimationFrame to ensure DOM is ready
  requestAnimationFrame(() => {
    setTimeout(() => {
      // Find all canvas elements with chart IDs
      const allCanvases = document.querySelectorAll('canvas[id^="chart-"]');
      console.log(`Found ${allCanvases.length} canvas elements to initialize`);
      
      allCanvases.forEach((canvasElement: any) => {
        const canvasId = canvasElement.id;
        
        // Skip if chart already exists
        if (this.chartInstances.has(canvasId)) {
          return;
        }
        
        // Parse the canvas ID to determine type and find the node
        const parts = canvasId.split('-');
        if (parts.length >= 3) {
          const type = parts[1] as 'ai' | 'regular';
          const isAI = type === 'ai';
          
          // Find the node that matches this canvas ID
          const node = this.findNodeByChartId(canvasId, this.topics);
          
          if (node) {
            // Verify the chart should be shown (only when toggle is on)
            const shouldShow = this.showAIBarChart && (
              isAI 
                ? this.getAIBarChartData(node).length > 0
                : this.getAllScores(node).length > 0
            );
            
            if (shouldShow) {
              console.log(`Creating chart for ${canvasId}, node: ${node.name}, isAI: ${isAI}`);
              this.createBarChart(node, canvasId, isAI);
            } else {
              console.log(`Skipping chart for ${canvasId} - shouldShow is false`);
            }
          } else {
            console.warn(`Could not find node for canvas ID: ${canvasId}`);
          }
        }
      });
    }, 200);
  });
}

// Find node by chart ID - try all possible indices
findNodeByChartId(chartId: string, nodes: any[]): any | null {
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    
    // Try with index (current approach)
    if (this.getChartId(node, 'ai', i) === chartId || 
        this.getChartId(node, 'regular', i) === chartId) {
      return node;
    }
    
    // Also try without index (for backward compatibility)
    if (this.getChartId(node, 'ai') === chartId || 
        this.getChartId(node, 'regular') === chartId) {
      return node;
    }
    
    if (node.children && node.children.length > 0) {
      const found = this.findNodeByChartId(chartId, node.children);
      if (found) return found;
    }
  }
  return null;
}

// Recursively initialize charts for children (kept for backward compatibility)
initializeChartsForChildren(children: any[]): void {
  // This is now handled by initializeAllCharts which scans the DOM
}

}
