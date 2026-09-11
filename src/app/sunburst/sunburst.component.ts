import { Component, OnInit, ElementRef, ViewChild, Output, EventEmitter, Input, OnChanges, SimpleChanges, AfterViewInit, OnDestroy } from '@angular/core';
import * as Highcharts from 'highcharts';
import HighchartsSunburst from 'highcharts/modules/sunburst';
import { ChapterColorService } from '../chapter-color.service';
HighchartsSunburst(Highcharts);

@Component({
  selector: 'app-sunburst',
  templateUrl: './sunburst.component.html',
  styleUrls: ['./sunburst.component.css']
})
export class SunburstComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('sunburstContainer', { static: true }) sunburstContainer!: ElementRef;
  @ViewChild('cardQ1SunburstContainer', { static: false }) cardQ1SunburstContainer!: ElementRef;
  @ViewChild('cardQ2SunburstContainer', { static: false }) cardQ2SunburstContainer!: ElementRef;
  @ViewChild('cardQ3SunburstContainer', { static: false }) cardQ3SunburstContainer!: ElementRef;
  @Input() data: any;
  @Input() isDualView: boolean = false;
  @Input() isLeaf: boolean = true;
  @Input() isAi: boolean = false;
  @Input() q1Color: string = '#FFA500';  // Default orange for Q1
  @Input() q2Color: string = '#7474e2';  // Default blue for Q2
  @Input() q3Color: string = '#28a745';  // Default green for Q3
  @Input() sizeScale: number = 1; // Scale factor for size (default 1, can be smaller for dual-view)

  @Input() query: any = ''; // Input JSON data
  @Input() selectAll: boolean = true; // Filter state from parent
  @Input() q1Selected: boolean = true; // Filter state from parent
  @Input() q2Selected: boolean = true; // Filter state from parent
  @Input() q3Selected: boolean = true; // Filter state from parent
  /** Names of nodes to highlight (e.g. top-5 chunk names for added queries when path/similarity_score not in tree) */
  @Input() scoredNodeNames: string[] = [];
  @Output() nodeClicked = new EventEmitter<any>();
  @Output() cardSelected = new EventEmitter<{node: any}>();
  @Output() filterChanged = new EventEmitter<{selectAll: boolean, q1Selected: boolean, q2Selected: boolean, q3Selected: boolean}>();

  private width: any = window.innerWidth;
  private height: any = window.innerHeight;
  private radius: number = 0;
  private chart: any = null;
  private cardQ1Chart: any = null;
  private cardQ2Chart: any = null;
  private cardQ3Chart: any = null;
  // Draggable card properties - separate for each query
  showQ1Card: boolean = false;
  showQ2Card: boolean = false;
  showQ3Card: boolean = false;
  q1CardExpanded: boolean = true;
  q2CardExpanded: boolean = true;
  q3CardExpanded: boolean = true;
  q1CardPosition = { x: 100, y: 100 };
  q2CardPosition = { x: 400, y: 100 };
  q3CardPosition = { x: 700, y: 100 };
  q1CardSize = { width: 400, height: 300 };
  q2CardSize = { width: 400, height: 300 };
  q3CardSize = { width: 400, height: 300 };
  isDragging: boolean = false;
  draggingCard: 'q1' | 'q2' | 'q3' | null = null;
  dragOffset = { x: 0, y: 0 };
  isResizing: boolean = false;
  resizingCard: 'q1' | 'q2' | 'q3' | null = null;
  resizeStart = { x: 0, y: 0, width: 0, height: 0 };
  resizeUpdateTimer: any = null;

  private boundMouseMove = (e: MouseEvent) => this.onCardMouseMove(e);
  private boundMouseUp = () => this.onCardMouseUp();

  constructor(private chapterColor: ChapterColorService) {}

  ngAfterViewInit(): void {
    this.updateDimensions();
    // Add global mouse event listeners for dragging
    document.addEventListener('mousemove', this.boundMouseMove);
    document.addEventListener('mouseup', this.boundMouseUp);
  }

  ngOnDestroy(): void {
    // Remove global event listeners
    document.removeEventListener('mousemove', this.boundMouseMove);
    document.removeEventListener('mouseup', this.boundMouseUp);
    
    // Destroy Highcharts instances (custom overlay is destroyed with chart)
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }
    if (this.cardQ1Chart) {
      this.cardQ1Chart.destroy();
      this.cardQ1Chart = null;
    }
    if (this.cardQ2Chart) {
      this.cardQ2Chart.destroy();
      this.cardQ2Chart = null;
    }
    if (this.cardQ3Chart) {
      this.cardQ3Chart.destroy();
      this.cardQ3Chart = null;
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Update dimensions if sizeScale changes
    if (changes['sizeScale'] || changes['data']) {
      this.updateDimensions();
    }
    
    console.log('scoredNodeNames',this.q3Selected,this.q2Selected,this.q1Selected,this.selectAll);
    // If filter state or scoredNodeNames changed, refresh chart (e.g. added-query highlights)
    if (changes['selectAll'] || changes['q1Selected'] || changes['q2Selected'] || changes['q3Selected'] || changes['scoredNodeNames']) {
      if (this.data) {
        this.refreshChart();
      }
    }
    
    if (this.data) {
      // Filter data to only include expanded nodes
      const filteredData = (this.data);
      
      // Apply query filter
      const queryFilteredData = (filteredData);
      
      // Check if filtered data is valid (has at least root node)
      console.log('queryFilteredData',queryFilteredData);
      if (queryFilteredData) {
        this.createSunburstChart(queryFilteredData);
      } else {
        console.warn("No expanded nodes to display in sunburst chart");
        // Clear the chart if no data
        if (this.chart) {
          this.chart.destroy();
          this.chart = null;
        }
      }
    }
  }

  private updateDimensions(force: boolean = false): void {
    if (this.sunburstContainer && this.sunburstContainer?.nativeElement) {
      const container = this.sunburstContainer.nativeElement;
      // Try to get dimensions from container or its parent
      let containerWidth = container.clientWidth || container.offsetWidth;
      let containerHeight = container.clientHeight || container.offsetHeight;
      
      // If container doesn't have dimensions, try parent
      if (!containerWidth || containerWidth === 0) {
        const parent = container.parentElement;
        if (parent) {
          containerWidth = parent.clientWidth || parent.offsetWidth || (window.innerWidth / 5);
        } else {
          containerWidth = window.innerWidth / 5;
        }
      }
      
      if (!containerHeight || containerHeight === 0) {
        const parent = container.parentElement;
        if (parent) {
          containerHeight = parent.clientHeight || parent.offsetHeight || (window.innerHeight / 3);
        } else {
          containerHeight = window.innerHeight / 3;
        }
      }
      
      // Check if we're in a floating window
      const floatingWindow = container.closest('.floating-window-content');
      const isInFloatingWindow = !!floatingWindow;
      
      // Apply size scale (smaller for dual-view-content or floating windows)
      if (this.isDualView) {
        this.width = (window.innerWidth / 2) * this.sizeScale;
        this.height = (window.innerHeight / 2) * this.sizeScale;
      } else if (isInFloatingWindow) {
        // Use container dimensions directly for floating windows (with padding)
        this.width = Math.max(containerWidth - 20, 300);
        this.height = Math.max(containerHeight - 20, 200);
      } else {
        const smallScale = 1;
        this.width = containerWidth * smallScale;
        this.height = containerHeight * smallScale;
      }
    } else {
      // Fallback to default calculations with scale
      if (this.isDualView) {
        this.width = (window.innerWidth / 2) * this.sizeScale;
        this.height = (window.innerHeight / 2) * this.sizeScale;
      } else {
        const smallScale = 1;
        this.width = (window.innerWidth / 5) * smallScale;
        this.height = (window.innerHeight / 3) * smallScale;
      }
    }


    console.log('width:', this.width);
    console.log('height:', this.height);
    
    // Calculate radius based on the smaller dimension
    this.radius = Math.min(this.width, this.height) / 2 - 10;

    console.log('radius:', this.radius);
  }

  // Convert data to Highcharts Sunburst format
  // chapterIndex: 0-based index of top-level chapter; passed through for descendants
  private convertToHighchartsFormat(data: any, parentId: string = '', level: number = 0, chapterIndex?: number): any {
    if (!data) {
      return null;
    }

    const nodeId = parentId ? `${parentId}-${data.name || level}` : 'root';
    
    // Calculate value based on similarity scores or children
    let value = 0;
    if (this.hasActualSimilarityScores(data)) {
      const scores = this.getAllSimilarityScores(data);
      value = scores.reduce((sum, s) => sum + s.score, 0);
    } else if (data.children && Array.isArray(data.children) && data.children.length > 0) {
      // For parent nodes, sum children values
      value = data.children.reduce((sum: number, child: any) => {
        const childValue = this.calculateNodeValue(child);
        return sum + childValue;
      }, 0);
    } else {
      value = 10; // Default value for leaf nodes without scores
    }

    // Chapter-based color (folder color): same logic as topic-list for consistency
    let nodeColor: string;
    if (level === 0) {
      nodeColor = '#E0E0E0'; // root
    } else if (chapterIndex !== undefined && chapterIndex >= 0) {
      const depth = level - 1;
      nodeColor = this.chapterColor.getColorForDepth(chapterIndex, depth);
    } else {
      nodeColor = '#B2BEB5';
    }

    const node: any = {
      id: nodeId,
      parent: parentId || null,
      name: data.name || '',
      value: value,
      color: nodeColor,
      customData: data
    };

    // Add children if they exist
    if (data.children && Array.isArray(data.children) && data.children.length > 0) {
      const isRoot = parentId === '';
      node.children = data.children
        .map((child: any, index: number) => {
          const childChapterIndex = isRoot ? index : (chapterIndex ?? 0);
          return this.convertToHighchartsFormat(child, nodeId, level + 1, childChapterIndex);
        })
        .filter((child: any) => child !== null);
    }

    return node;
  }

  /** Darken a hex color for border visibility */
  private darkenColor(hex: string, amount: number = 0.3): string {
    const clean = hex.replace('#', '');
    if (clean.length !== 6) return hex;
    const num = parseInt(clean, 16);
    const r = Math.max(0, Math.round((num >> 16) * (1 - amount)));
    const g = Math.max(0, Math.round(((num >> 8) & 0xff) * (1 - amount)));
    const b = Math.max(0, Math.round((num & 0xff) * (1 - amount)));
    return '#' + (0x1000000 + r * 0x10000 + g * 0x100 + b).toString(16).slice(1);
  }

  // Get highlight color based on selected queries
  private getHighlightColor(node: any): string {
    // If Select All is active, use the query with highest score
    if (this.selectAll) {
      if (node.similarity_score && node.similarity_score > 0) {
        return this.q1Color;
      }
      if (node.similarity_score2 && node.similarity_score2 > 0) {
        return this.q2Color;
      }
      if (node.similarity_score3 && node.similarity_score3 > 0) {
        return this.q3Color;
      }
      return '#B2BEB5'; // Default if no scores
    }

    // When only Q1 is selected, highlight only nodes with similarity_score
    if (this.q1Selected && !this.q2Selected && !this.q3Selected) {
      if (node.similarity_score && node.similarity_score > 0) {
        return this.q1Color;
      }
      return '#B2BEB5'; // Not highlighted - but still shown
    }
    
    // When only Q2 is selected, highlight only nodes with similarity_score2
    if (this.q2Selected && !this.q1Selected && !this.q3Selected) {
      if (node.similarity_score2 && node.similarity_score2 > 0) {
        return this.q2Color;
      }
      return '#B2BEB5'; // Not highlighted - but still shown
    }
    
    // When only Q3 is selected, highlight only nodes with similarity_score3
    if (this.q3Selected && !this.q1Selected && !this.q2Selected) {
      if (node.similarity_score3 && node.similarity_score3 > 0) {
        return this.q3Color;
      }
      return '#B2BEB5'; // Not highlighted - but still shown
    }
    
    // Multiple queries selected (2 or 3) - highlight nodes that have scores for ANY selected query
    // Priority: Q1 > Q2 > Q3 (for nodes with multiple scores)
    if (this.q1Selected && node.similarity_score && node.similarity_score > 0) {
      return this.q1Color;
    }
    if (this.q2Selected && node.similarity_score2 && node.similarity_score2 > 0) {
      return this.q2Color;
    }
    if (this.q3Selected && node.similarity_score3 && node.similarity_score3 > 0) {
      return this.q3Color;
    }
    
    // No matching scores for selected queries - but node is still shown in gray
    return '#B2BEB5';
  }

  // Helper to calculate node value
  private calculateNodeValue(data: any): number {
    if (this.hasActualSimilarityScores(data)) {
      const scores = this.getAllSimilarityScores(data);
      return scores.reduce((sum, s) => sum + s.score, 0);
    }
    if (data.children && Array.isArray(data.children) && data.children.length > 0) {
      return data.children.reduce((sum: number, child: any) => sum + this.calculateNodeValue(child), 0);
    }
    return 10;
  }

  // Check if a node has scores matching selected queries
  private nodeHasMatchingScores(data: any,queryNumber: string): boolean {
    if (!data) {
      return false;
    }    
    // If Select All is active, check for any score
    if (this.selectAll) {
      return this.hasActualSimilarityScores(data);
    }
    
    // If only Q1 is selected, only check for similarity_score
    if (queryNumber === 'q1' && !this.q2Selected && !this.q3Selected) {
      return !!(data.similarity_score && data.similarity_score > 0);
    }
    
    // If only Q2 is selected, only check for similarity_score2
    if (queryNumber === 'q2' && !this.q1Selected && !this.q3Selected) {
      return !!(data.similarity_score2 && data.similarity_score2 > 0);
    }
    
    // If only Q3 is selected, only check for similarity_score3
    if (queryNumber === 'q3' && !this.q1Selected && !this.q2Selected) {
      return !!(data.similarity_score3 && data.similarity_score3 > 0);
    }
    
    // If multiple queries are selected, check if node matches any selected query
    if (queryNumber === 'q1' && this.q1Selected && data.similarity_score && data.similarity_score > 0) {
      return true;
    }
    if (queryNumber === 'q2' && this.q2Selected && data.similarity_score2 && data.similarity_score2 > 0) {
      return true;
    }
    if (this.q3Selected && data.similarity_score3 && data.similarity_score3 > 0) {
      return true;
    }
    
    return false;
  }
  
  /** Get query color for path fill (segment color on highlighted path) */
  private getQueryFillColor(queryNumber?: string): string {
    if (queryNumber === 'q1') return this.q1Color;
    if (queryNumber === 'q2') return this.q2Color;
    if (queryNumber === 'q3') return this.q3Color;
    if (this.q1Selected && !this.q2Selected && !this.q3Selected) return this.q1Color;
    if (this.q2Selected && !this.q1Selected && !this.q3Selected) return this.q2Color;
    if (this.q3Selected && !this.q1Selected && !this.q2Selected) return this.q3Color;
    return this.q1Color;
  }

  // Get border color for a highlighted node - always use black
  private getBorderColorForNode(data: any): string {
    // Always return black for highlighted borders
    return '#000000';
  }

  // Build a map of all nodes by ID and find paths to scored nodes
  // scoredNodeIds: only nodes with similarity_score (query color fill)
  // highlightedNodes: path from root to scored nodes (chapter color border on path)
  private buildNodeMapAndFindPaths(rootNode: any, queryNumber: string = ''): { nodeMap: Map<string, any>, highlightedNodes: Set<string>, scoredNodeIds: Set<string>, nodeColors: Map<string, string> } {
    const nodeMap = new Map<string, any>();
    const highlightedNodes = new Set<string>();
    const scoredNodeIds = new Set<string>();
    const nodeColors = new Map<string, string>();
    
    const buildMap = (node: any) => {
      if (!node) return;
      nodeMap.set(node.id, node);
      if (node.children && Array.isArray(node.children)) {
        node.children.forEach((child: any) => buildMap(child));
      }
    };
    buildMap(rootNode);
    
    const norm = (s: string) => (s == null ? '' : String(s).trim());
    const nameMatches = (nodeName: string): boolean => {
      if (!nodeName || !this.scoredNodeNames || this.scoredNodeNames.length === 0) return false;
      const n = norm(nodeName);
      return this.scoredNodeNames.some((name: string) => norm(name) === n);
    };
    const markPaths = (node: any) => {
      if (!node) return;
      const hasScoreFromData = node.customData && this.nodeHasMatchingScores(node.customData, queryNumber);
      const hasScoreFromName = nameMatches(node.name || node.customData?.name || '');
      if (hasScoreFromData || hasScoreFromName) {
        scoredNodeIds.add(node.id);
        highlightedNodes.add(node.id);
        nodeColors.set(node.id, node.color || '#6b7280');
        let currentId = node.parent;
        while (currentId) {
          highlightedNodes.add(currentId);
          const ancestorNode = nodeMap.get(currentId);
          nodeColors.set(currentId, ancestorNode?.color || '#6b7280');
          currentId = ancestorNode?.parent ?? null;
        }
      }
      if (node.children && Array.isArray(node.children)) {
        node.children.forEach((child: any) => markPaths(child));
      }
    };
    markPaths(rootNode);
    
    return { nodeMap, highlightedNodes, scoredNodeIds, nodeColors };
  }

  // Flatten nested structure to array format for Highcharts with path highlighting
  // scoredNodeIds: only nodes with similarity_score get query color fill
  // highlightedNodes: path gets chapter color border (route + scored nodes)
  private flattenHighchartsData(
    node: any,
    result: any[] = [],
    highlightedNodes?: Set<string>,
    nodeColors?: Map<string, string>,
    depth: number = 0,
    queryNumber: string = '',
    scoredNodeIds?: Set<string>
  ): any[] {
    if (!node) {
      return result;
    }

    const isOnPath = highlightedNodes ? highlightedNodes.has(node.id) : false;
    const hasScore = scoredNodeIds ? scoredNodeIds.has(node.id) : false;
    const isDeepRing = depth >= 3;
    const isLeaf = !node.children || !Array.isArray(node.children) || node.children.length === 0;
    const borderWidth = isDeepRing ? (isOnPath ? 1.25 : 0.2) : (isOnPath ? 3 : 1.5);
    
    // Only scored nodes: query color fill. Route + others: grey fill. Path border: chapter color.
    const segmentColor = hasScore ? this.getQueryFillColor(queryNumber) : '#B2BEB5';
    const borderColor = isOnPath ? (node.color || '#6b7280') : '#fff';

    const point: any = {
      id: node.id,
      parent: node.parent,
      name: node.name,
      value: node.value,
      color: segmentColor,
      customData: node.customData,
      borderWidth: borderWidth,
      borderColor: borderColor,
      isLeaf: isLeaf,
      isOnPath: isOnPath || hasScore
    };

    if (hasScore) {
      point.className = 'sunburst-path-highlighted';
    }

    // Avoid trying to label hundreds of tiny wedges in deep rings, but always show labels for leaf nodes and selected path
    if (isDeepRing && !isLeaf && !isOnPath && !hasScore) {
      point.dataLabels = { enabled: false };
    } else if (isLeaf || isOnPath || hasScore) {
      // Disable built-in dataLabels for leaves - we use custom overlay (renderCustomLeafLabels) to always show leaf names
      if (isLeaf) {
        point.dataLabels = { enabled: false };
      } else {
        point.dataLabels = {
          enabled: true,
          crop: false,
          overflow: 'allow',
          ...(isOnPath || hasScore ? { style: { fontWeight: 'bold', fontSize: '10px' } } : {})
        };
      }
    }

    result.push(point);

    if (node.children && Array.isArray(node.children)) {
      node.children.forEach((child: any) => {
        this.flattenHighchartsData(child, result, highlightedNodes, nodeColors, depth + 1, queryNumber, scoredNodeIds);
      });
    }

    return result;
  }

  // Ensure data structure is valid for Highcharts
  private ensureValidHierarchy(data: any): any {
    if (!data || data === null || data === undefined) {
      return null;
    }
    
    // If data is an array, wrap it in a root node
    if (Array.isArray(data)) {
      const validChildren = data
        .map((node: any) => this.ensureValidHierarchy(node))
        .filter((n: any) => n !== null && n !== undefined);
      
      if (validChildren.length === 0) {
        return null;
      }
      
      return {
        name: 'root',
        children: validChildren
      };
    }
    
    // Ensure children is either an array or null (not undefined)
    const safeNode: any = { ...data };
    
    // Remove any undefined properties
    // Object.keys(safeNode).forEach(key => {
    //   if (safeNode[key] === undefined) {
    //     delete safeNode[key];
    //   }
    // });
    
    if (safeNode.children) {
      if (Array.isArray(safeNode.children)) {
        // Filter out null, undefined, and invalid children
        safeNode.children = safeNode.children
          .filter((child: any) => child !== null && child !== undefined)
          .map((child: any) => this.ensureValidHierarchy(child))
          .filter((child: any) => child !== null && child !== undefined);
        
        // Set to null if empty array
        if (safeNode.children.length === 0) {
          safeNode.children = null;
        }
      } else {
        safeNode.children = null;
      }
    } else {
      safeNode.children = null;
    }
    
    return safeNode;
  }

  // Recursively filter nodes to only include expanded ones
  private filterExpandedNodes(data: any, isRoot: boolean = true): any {
    // Always include root node, filter children based on expanded state
    if (isRoot) {
      const filteredNode: any = { ...data };
      
      // Recursively filter children if they exist
      if (data.children && Array.isArray(data.children) && data.children.length > 0) {
        filteredNode.children = data.children
          .map((child: any) => this.filterExpandedNodes(child, false))
          .filter((child: any) => child !== null); // Remove null entries
        
        // Set to null if no children remain (D3 expects null or array, not undefined)
        if (filteredNode.children.length === 0) {
          filteredNode.children = null;
        }
      } else {
        // Ensure children is null if it doesn't exist
        filteredNode.children = null;
      }
      
      return filteredNode;
    }
    
    // For non-root nodes, only include if expanded (check all expanded states)
    if (!data.expanded && !data.expanded2 && !data.expanded3 && !data.rexpanded && !data.rexpanded2 && !data.rexpanded3) {
      return null;
    }

    // Create a copy of the node
    const filteredNode: any = { ...data };

    // Recursively filter children if they exist
    if (data.children && Array.isArray(data.children) && data.children.length > 0) {
      filteredNode.children = data.children
        .map((child: any) => this.filterExpandedNodes(child, false))
        .filter((child: any) => child !== null); // Remove null entries
      
      // Set to null if no children remain (D3 expects null or array, not undefined)
      if (filteredNode.children.length === 0) {
        filteredNode.children = null;
      }
    } else {
      // Ensure children is null if it doesn't exist
      filteredNode.children = null;
    }

    console.log('273',filteredNode);
    return filteredNode;
  }

  // Helper function to check if node has any similarity score
  private hasSimilarityScore(node: any): boolean {
    return (node.similarity_score && node.similarity_score > 0) ||
           (node.similarity_score2 && node.similarity_score2 > 0) ||
           (node.similarity_score3 && node.similarity_score3 > 0) ||
           (node.rexpanded) ||
           (node.rexpanded2) ||
           (node.rexpanded3);
  }

  // Helper function to check if node has actual similarity scores (contributed nodes)
  private hasActualSimilarityScores(node: any): boolean {
    return (node.similarity_score && node.similarity_score > 0) ||
           (node.similarity_score2 && node.similarity_score2 > 0) ||
           (node.similarity_score3 && node.similarity_score3 > 0);
  }

  // Helper function to check if node matches selected queries
  private matchesSelectedQueries(node: any): boolean {
    // If Select All is active, show all nodes (Q1, Q2, Q3, and nodes without scores)
    if (this.selectAll) {
      return true;
    }
    
    // When only Q1 is selected, show ONLY nodes with similarity_score
    if (this.q1Selected && !this.q2Selected && !this.q3Selected) {
      // Strict check: only return true if node has similarity_score > 0
      // Do not show nodes with only similarity_score2 or similarity_score3
      return !!(node.similarity_score && node.similarity_score > 0);
    }
    
    // When only Q2 is selected, show ONLY nodes with similarity_score2
    if (this.q2Selected && !this.q1Selected && !this.q3Selected) {
      return !!(node.similarity_score2 && node.similarity_score2 > 0);
    }
    
    // When only Q3 is selected, show ONLY nodes with similarity_score3
    if (this.q3Selected && !this.q1Selected && !this.q2Selected) {
      return !!(node.similarity_score3 && node.similarity_score3 > 0);
    }
    
    // Multiple queries selected - show nodes that match ANY of the selected queries
    let matches = false;
    if (this.q1Selected && node.similarity_score && node.similarity_score > 0) {
      matches = true;
    }
    if (this.q2Selected && node.similarity_score2 && node.similarity_score2 > 0) {
      matches = true;
    }
    if (this.q3Selected && node.similarity_score3 && node.similarity_score3 > 0) {
      matches = true;
    }
    
    if (matches) {
      return true;
    }
    
    // If no queries are selected, show nodes without similarity scores
    if (!this.q1Selected && !this.q2Selected && !this.q3Selected) {
      return !this.hasActualSimilarityScores(node);
    }
    
    if (node.rexpanded || node.rexpanded2 || node.rexpanded3) {
      return true;
    }
    // Node doesn't match any selected query
    return false;
  }

  // Helper function to check if node or any of its descendants match selected queries
  private nodeOrDescendantsMatchQueries(node: any): boolean {
    // Check if the node itself matches
    if (this.matchesSelectedQueries(node)) {
      return true;
    }
    
    // Check if any descendant matches
    if (node.children && Array.isArray(node.children) && node.children.length > 0) {
      return node.children.some((child: any) => this.nodeOrDescendantsMatchQueries(child));
    }
    
    return false;
  }

  // Helper function to check if node has children with rexpanded set to true
  private hasRexpandedChildren(node: any): boolean {
    if (node.children && Array.isArray(node.children) && node.children.length > 0) {
      return node.children.some((child: any) => 
        (child.rexpanded || child.rexpanded2 || child.rexpanded3) ||
        this.hasRexpandedChildren(child) // Recursively check descendants
      );
    }
    return false;
  }

  // Don't filter data, just return all data for highlighting
  // This method returns ALL nodes regardless of selected queries - no filtering happens
  private filterByQuery(data: any, isRoot: boolean = true, parentMatches: boolean = false): any {
    if (!data) {
      return null;
    }

    // Return ALL nodes without any filtering - we only highlight based on scores, never filter
    const node: any = { ...data };
      
    if (data.children && Array.isArray(data.children) && data.children.length > 0) {
      // Recursively include ALL children - no filtering based on queries
      node.children = data.children
          .map((child: any) => this.filterByQuery(child, false, false))
          .filter((child: any) => child !== null); // Only filter out null entries from invalid data
      
      if (node.children.length === 0) {
        node.children = null;
      }
    } else {
      node.children = null;
    }

    // Always return the node - never filter it out based on query selection
    return node;
  }

  // Handle filter button clicks - emit events to parent (for backward compatibility)
  // Note: These methods are kept for card functionality, but filter state is controlled by parent
  onSelectAll(): void {
    // Emit event to parent to update filter state
    this.filterChanged.emit({
      selectAll: true,
      q1Selected: true,
      q2Selected: true,
      q3Selected: true
    });
  }

  onQueryToggle(query: 'q1' | 'q2' | 'q3'): void {
    // Open draggable card for the clicked query
    if (query === 'q1') {
      this.showQ1Card = !this.showQ1Card;
      if (this.showQ1Card) {
        this.q1CardExpanded = true;
        this.q1CardPosition = { 
          x: window.innerWidth / 2 - 300, 
          y: window.innerHeight / 2 - 250 
        };
        setTimeout(() => {
          this.createCardSunburstChart('q1');
        }, 100);
      }
    } else if (query === 'q2') {
      this.showQ2Card = !this.showQ2Card;
      if (this.showQ2Card) {
        this.q2CardExpanded = true;
        this.q2CardPosition = { 
          x: window.innerWidth / 2 - 300, 
          y: window.innerHeight / 2 - 250 
        };
        setTimeout(() => {
          this.createCardSunburstChart('q2');
        }, 100);
      }
    } else if (query === 'q3') {
      this.showQ3Card = !this.showQ3Card;
      if (this.showQ3Card) {
        this.q3CardExpanded = true;
        this.q3CardPosition = { 
          x: window.innerWidth / 2 - 300, 
          y: window.innerHeight / 2 - 250 
        };
        setTimeout(() => {
          this.createCardSunburstChart('q3');
        }, 100);
      }
    }

    // Calculate new filter state based on current state
    let newSelectAll = this.selectAll;
    let newQ1Selected = this.q1Selected;
    let newQ2Selected = this.q2Selected;
    let newQ3Selected = this.q3Selected;

    // If Select All is currently active, clicking a query should select only that query
    if (this.selectAll) {
      newSelectAll = false;
      newQ1Selected = false;
      newQ2Selected = false;
      newQ3Selected = false;
      
      // Now set the clicked query to true
      if (query === 'q1') {
        newQ1Selected = true;
      } else if (query === 'q2') {
        newQ2Selected = true;
      } else if (query === 'q3') {
        newQ3Selected = true;
      }
    } else {
      // Toggle the clicked query
      if (query === 'q1') {
        newQ1Selected = !this.q1Selected;
      } else if (query === 'q2') {
        newQ2Selected = !this.q2Selected;
      } else if (query === 'q3') {
        newQ3Selected = !this.q3Selected;
      }
      
      // If all are selected, automatically enable Select All
      if (newQ1Selected && newQ2Selected && newQ3Selected) {
        newSelectAll = true;
      }
      
      // If none are selected, default to Select All
      if (!newQ1Selected && !newQ2Selected && !newQ3Selected) {
        newSelectAll = true;
        newQ1Selected = true;
        newQ2Selected = true;
        newQ3Selected = true;
      }
    }
    
    // Emit filter change to parent (parent will update and pass back as @Input())
    this.filterChanged.emit({
      selectAll: newSelectAll,
      q1Selected: newQ1Selected,
      q2Selected: newQ2Selected,
      q3Selected: newQ3Selected
    });
  }


  // Public method to show card (called from parent components)
  showCard(query: 'q1' | 'q2' | 'q3'): void {
    if (query === 'q1') {
      this.showQ1Card = true;
      this.q1CardExpanded = true;
      this.q1CardPosition = { 
        x: window.innerWidth / 2 - 300, 
        y: window.innerHeight / 2 - 250 
      };
      setTimeout(() => {
        this.createCardSunburstChart('q1');
      }, 100);
    } else if (query === 'q2') {
      this.showQ2Card = true;
      this.q2CardExpanded = true;
      this.q2CardPosition = { 
        x: window.innerWidth / 2 - 300, 
        y: window.innerHeight / 2 - 250 
      };
      setTimeout(() => {
        this.createCardSunburstChart('q2');
      }, 100);
    } else if (query === 'q3') {
      this.showQ3Card = true;
      this.q3CardExpanded = true;
      this.q3CardPosition = { 
        x: window.innerWidth / 2 - 300, 
        y: window.innerHeight / 2 - 250 
      };
      setTimeout(() => {
        this.createCardSunburstChart('q3');
      }, 100);
    }
  }

  // Draggable card methods
  closeCard(query: 'q1' | 'q2' | 'q3'): void {
    if (query === 'q1') {
      this.showQ1Card = false;
    } else if (query === 'q2') {
      this.showQ2Card = false;
    } else if (query === 'q3') {
      this.showQ3Card = false;
    }
  }

  toggleCardExpand(query: 'q1' | 'q2' | 'q3'): void {
    if (query === 'q1') {
      this.q1CardExpanded = !this.q1CardExpanded;
      if (this.q1CardExpanded) {
        setTimeout(() => {
          this.createCardSunburstChart('q1');
        }, 100);
      }
    } else if (query === 'q2') {
      this.q2CardExpanded = !this.q2CardExpanded;
      if (this.q2CardExpanded) {
        setTimeout(() => {
          this.createCardSunburstChart('q2');
        }, 100);
      }
    } else if (query === 'q3') {
      this.q3CardExpanded = !this.q3CardExpanded;
      if (this.q3CardExpanded) {
        setTimeout(() => {
          this.createCardSunburstChart('q3');
        }, 100);
      }
    }
  }

  onCardMouseDown(event: MouseEvent, query: 'q1' | 'q2' | 'q3'): void {
    if ((event.target as HTMLElement).classList.contains('card-header') || 
        (event.target as HTMLElement).closest('.card-header')) {
      this.isDragging = true;
      this.draggingCard = query;
      
      let currentPosition = { x: 0, y: 0 };
      if (query === 'q1') {
        currentPosition = this.q1CardPosition;
      } else if (query === 'q2') {
        currentPosition = this.q2CardPosition;
      } else if (query === 'q3') {
        currentPosition = this.q3CardPosition;
      }
      
      this.dragOffset = {
        x: event.clientX - currentPosition.x,
        y: event.clientY - currentPosition.y
      };
      event.preventDefault();
    }
  }

  onCardMouseMove(event: MouseEvent): void {
    if (this.isResizing && this.resizingCard) {
      // Calculate new size based on mouse movement
      const deltaX = event.clientX - this.resizeStart.x;
      const deltaY = event.clientY - this.resizeStart.y;
      
      const minWidth = 300;
      const minHeight = 250;
      const maxWidth = window.innerWidth - 50;
      const maxHeight = window.innerHeight - 50;
      
      let newWidth = Math.max(minWidth, Math.min(maxWidth, this.resizeStart.width + deltaX));
      let newHeight = Math.max(minHeight, Math.min(maxHeight, this.resizeStart.height + deltaY));
      
      let sizeChanged = false;
      if (this.resizingCard === 'q1') {
        if (this.q1CardSize.width !== newWidth || this.q1CardSize.height !== newHeight) {
          this.q1CardSize = { width: newWidth, height: newHeight };
          sizeChanged = true;
        }
      } else if (this.resizingCard === 'q2') {
        if (this.q2CardSize.width !== newWidth || this.q2CardSize.height !== newHeight) {
          this.q2CardSize = { width: newWidth, height: newHeight };
          sizeChanged = true;
        }
      } else if (this.resizingCard === 'q3') {
        if (this.q3CardSize.width !== newWidth || this.q3CardSize.height !== newHeight) {
          this.q3CardSize = { width: newWidth, height: newHeight };
          sizeChanged = true;
        }
      }
      
      // Throttle chart updates during resize (update every 200ms)
      if (sizeChanged && !this.resizeUpdateTimer) {
        this.resizeUpdateTimer = setTimeout(() => {
          if (this.resizingCard) {
            this.createCardSunburstChart(this.resizingCard);
          }
          this.resizeUpdateTimer = null;
        }, 200);
      }
    } else if (this.isDragging && this.draggingCard) {
      let cardWidth = 600;
      let cardHeight = 550;
      
      // Use actual card size for boundary checking
      if (this.draggingCard === 'q1') {
        cardWidth = this.q1CardSize.width;
        cardHeight = this.q1CardSize.height;
      } else if (this.draggingCard === 'q2') {
        cardWidth = this.q2CardSize.width;
        cardHeight = this.q2CardSize.height;
      } else if (this.draggingCard === 'q3') {
        cardWidth = this.q3CardSize.width;
        cardHeight = this.q3CardSize.height;
      }
      
      let newX = event.clientX - this.dragOffset.x;
      let newY = event.clientY - this.dragOffset.y;
      
      // Keep card within viewport bounds
      newX = Math.max(0, Math.min(newX, window.innerWidth - cardWidth));
      newY = Math.max(0, Math.min(newY, window.innerHeight - cardHeight));
      
      if (this.draggingCard === 'q1') {
        this.q1CardPosition = { x: newX, y: newY };
      } else if (this.draggingCard === 'q2') {
        this.q2CardPosition = { x: newX, y: newY };
      } else if (this.draggingCard === 'q3') {
        this.q3CardPosition = { x: newX, y: newY };
      }
    }
  }

  onCardMouseUp(): void {
    const wasResizing = this.isResizing && this.resizingCard;
    const resizingCard = this.resizingCard;
    
    this.isDragging = false;
    this.draggingCard = null;
    this.isResizing = false;
    
    // Clear any pending resize update timer
    if (this.resizeUpdateTimer) {
      clearTimeout(this.resizeUpdateTimer);
      this.resizeUpdateTimer = null;
    }
    
    // Re-render chart if resizing stopped
    if (wasResizing && resizingCard) {
      setTimeout(() => {
        this.createCardSunburstChart(resizingCard);
      }, 100);
    }
    
    this.resizingCard = null;
  }

  // Resize functionality
  onResizeMouseDown(event: MouseEvent, query: 'q1' | 'q2' | 'q3'): void {
    event.stopPropagation();
    event.preventDefault();
    
    this.isResizing = true;
    this.resizingCard = query;
    
    let currentSize = { width: 600, height: 500 };
    if (query === 'q1') {
      currentSize = this.q1CardSize;
    } else if (query === 'q2') {
      currentSize = this.q2CardSize;
    } else if (query === 'q3') {
      currentSize = this.q3CardSize;
    }
    
    this.resizeStart = {
      x: event.clientX,
      y: event.clientY,
      width: currentSize.width,
      height: currentSize.height
    };
  }


  // Get filtered data for the card's sunburst
  getCardData(query: 'q1' | 'q2' | 'q3'): any {
    if (!this.data) {
      return null;
    }
    
    // Filter data for the selected query
    const filteredData = (this.data);
    
    // Create a temporary filter state for the card
    const originalSelectAll = this.selectAll;
    const originalQ1 = this.q1Selected;
    const originalQ2 = this.q2Selected;
    const originalQ3 = this.q3Selected;
    
    // Set filter state for the card's query
    this.selectAll = false;
    this.q1Selected = query === 'q1';
    this.q2Selected = query === 'q2';
    this.q3Selected = query === 'q3';
    
    const queryFilteredData = (filteredData);
    
    // Restore original filter state
    this.selectAll = originalSelectAll;
    this.q1Selected = originalQ1;
    this.q2Selected = originalQ2;
    this.q3Selected = originalQ3;
    
    return queryFilteredData;
  }

  // Create sunburst chart in the card container
  public createCardSunburstChart(query: 'q1' | 'q2' | 'q3'): void {
    let container: ElementRef | null = null;
    let chartRef: any = null;
    
    if (query === 'q1') {
      container = this.cardQ1SunburstContainer;
      if (this.cardQ1Chart) {
        this.cardQ1Chart.destroy();
        this.cardQ1Chart = null;
      }
      chartRef = this.cardQ1Chart;
    } else if (query === 'q2') {
      container = this.cardQ2SunburstContainer;
      if (this.cardQ2Chart) {
        this.cardQ2Chart.destroy();
        this.cardQ2Chart = null;
      }
      chartRef = this.cardQ2Chart;
    } else if (query === 'q3') {
      container = this.cardQ3SunburstContainer;
      if (this.cardQ3Chart) {
        this.cardQ3Chart.destroy();
        this.cardQ3Chart = null;
      }
      chartRef = this.cardQ3Chart;
    }
    
    if (!container) {
      return;
    }

    // Use setTimeout to ensure the view is updated
    setTimeout(() => {
      const cardData = this.getCardData(query);
      if (!cardData) {
        return;
      }

      const element = container!.nativeElement;

      // Get actual card size
      let cardSize = { width: 600, height: 500 };
      if (query === 'q1') {
        cardSize = this.q1CardSize;
      } else if (query === 'q2') {
        cardSize = this.q2CardSize;
      } else if (query === 'q3') {
        cardSize = this.q3CardSize;
      }

      // Set dimensions for card chart (account for padding)
      const cardWidth = cardSize.width - 20; // Card width minus padding
      const cardHeight = cardSize.height - 60; // Card height minus header and padding

      // Ensure data has proper structure
      const safeData = this.ensureValidHierarchy(cardData);
      
      if (!safeData) {
        console.error("No valid data for card sunburst chart");
        return;
      }

      // Use same chapter colors as main sunburst and topic-list
      const highchartsData = this.convertToHighchartsFormat(safeData);
      if (!highchartsData) {
        console.error("Failed to convert card data to Highcharts format");
        return;
      }

      // Build node map and find paths to scored nodes for border highlighting
      const { highlightedNodes, scoredNodeIds, nodeColors } = this.buildNodeMapAndFindPaths(highchartsData, query);

      // Flatten to array format for Highcharts with path highlighting
      const flatData = this.flattenHighchartsData(highchartsData, [], highlightedNodes, nodeColors, 0, query, scoredNodeIds);

      // Create Highcharts Sunburst chart for card
      const chartOptions: any = {
        chart: {
          renderTo: element,
          type: 'sunburst',
          width: cardWidth,
          height: cardHeight,
          events: {
            load: function(this: any) { (this as any).__sunburstComponent?.renderCustomLeafLabels(this); },
            render: function(this: any) { (this as any).__sunburstComponent?.renderCustomLeafLabels(this); }
          }
        },
        title: {
          text: ''
        },
        series: [{
          type: 'sunburst',
          data: flatData,
          // Hamlet v1 can exceed Highcharts' default turboThreshold (~1000),
          // which may cause object-style points (id/parent/name/value) to be skipped.
          // Disable turbo mode so deeper levels always render.
          turboThreshold: 0,
          allowPointSelect: true,
          cursor: 'pointer',
          dataLabels: {
            enabled: true,
            allowOverlap: true,
            crop: false,
            overflow: 'allow',
            style: { fontSize: '8px', color: '#000' },
            formatter: function(this: any) {
              const name = this.point.name || '';
              const isLeaf = this.point.options?.isLeaf;
              const isOnPath = this.point.options?.isOnPath;
              const maxLength = 12;
              if (isOnPath) {
                return name.length > 20 ? name.substring(0, 20) + "..." : name;
              }
              if (isLeaf) {
                return name.length > 2 ? name.charAt(0).toUpperCase() : name;
              }
              return name.length > maxLength ? name.substring(0, maxLength) + "..." : name;
            }
          },
          levels: [{
            level: 1,
            levelIsConstant: false,
            dataLabels: { rotationMode: 'parallel', style: { fontSize: '10px' } }
          }, {
            level: 2,
            colorByPoint: true,
            dataLabels: { style: { fontSize: '9px' } }
          }, {
            level: 3,
            dataLabels: { enabled: true, crop: false, overflow: 'allow', allowOverlap: true, alignTo: 'plotEdges', style: { fontSize: '8px' } }
          }, {
            level: 4,
            dataLabels: { enabled: true, crop: false, overflow: 'allow', allowOverlap: true, alignTo: 'plotEdges', style: { fontSize: '7px' } }
          }],
          point: {
            events: {
              click: (e: any) => {
                const customData = e.point.options.customData;
                const pointId = e.point.options.id;
                if (customData) {
                  this.emitNodeClicked(customData, pointId);
                }
              }
            }
          }
        }],
        tooltip: {
          formatter: function(this: any) {
            const val = 10;
            return val === 10
              ? `<b>${this.point.name}</b>`
              : `<b>${this.point.name}</b><br/>Value: ${val}`;
          }
        },
        plotOptions: {
          sunburst: {
            borderWidth: 1.5
            // borderColor from each point (chapter colors)
          }
        }
      };

      let cardChart: any;
      if (query === 'q1') {
        this.cardQ1Chart = cardChart = Highcharts.chart(chartOptions);
      } else if (query === 'q2') {
        this.cardQ2Chart = cardChart = Highcharts.chart(chartOptions);
      } else if (query === 'q3') {
        this.cardQ3Chart = cardChart = Highcharts.chart(chartOptions);
      }
      if (cardChart) (cardChart as any).__sunburstComponent = this;
    }, 0);
  }

  // Public method to trigger dimension update (called from parent when window resizes)
  public recalculateDimensions(): void {
    this.updateDimensions();
    if (this.data) {
      const filteredData = (this.data);
      const queryFilteredData = (filteredData);
      if (queryFilteredData) {
        this.createSunburstChart(queryFilteredData);
      }
    }
  }

  private refreshChart(force: boolean = false): void {
    if (this.data) {
      const filteredData = (this.data);
      const queryFilteredData = (filteredData);
      
      if (queryFilteredData) {
        console.log('queryFilteredData',queryFilteredData);
        this.createSunburstChart(queryFilteredData, force);
      } else {
        if (this.chart) {
          this.chart.destroy();
          this.chart = null;
        }
      }
    }
  }

  // Helper function to determine which query a node belongs to and return its color
  private getQueryColor(node: any): string {
    // If a specific query is selected, always use that query's color

    if (this.q1Selected && !this.q2Selected && !this.q3Selected) {
      // Only Q1 selected - always use Q1 color
      return this.q1Color;
    }
    
    if (this.q2Selected && !this.q1Selected && !this.q3Selected) {
      // Only Q2 selected - always use Q2 color
      return this.q2Color;
    }
    
    if (this.q3Selected && !this.q1Selected && !this.q2Selected) {
      // Only Q3 selected - always use Q3 color
      return this.q3Color;
    }
    
    // If Select All is active or multiple queries selected, use the query with highest score
    // Check which query has the highest score, prioritize in order Q1, Q2, Q3
    if (node.similarity_score && node.similarity_score > 0) {
      return this.q1Color;
    }
    if (node.similarity_score2 && node.similarity_score2 > 0) {
      return this.q2Color;
    }
    if (node.similarity_score3 && node.similarity_score3 > 0) {
      return this.q3Color;
    }
    // Default color if no query has a score
    return "#808080";
  }

  // Helper function to get all similarity scores with their query indices for donut chart
  private getAllSimilarityScores(node: any): Array<{score: number, queryIndex: number, color: string}> {
    const scores = [
      { score: node.similarity_score || 0, queryIndex: 1, color: this.q1Color },
      { score: node.similarity_score2 || 0, queryIndex: 2, color: this.q2Color },
      { score: node.similarity_score3 || 0, queryIndex: 3, color: this.q3Color }
    ];
    
    // Filter out zero scores
    return scores.filter(s => s.score > 0);
  }


  private createSunburstChart(filteredData?: any, force: boolean = false) {
    // Update dimensions before creating chart
    console.log('Creating sunburst chart', filteredData);
    this.updateDimensions(force);
    
    const size = Math.min(this.width, this.height);
this.width = size;
this.height = size;
this.radius = size / 2;

console.log('width:', this.width);
console.log('height:', this.height);
console.log('radius:', this.radius);
  
    const element = this.sunburstContainer?.nativeElement;
    
    // Destroy existing chart if it exists
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }
  
    // Use filtered data if provided, otherwise use original data
    const dataToUse = filteredData || this.data;
    
    // Validate data structure
    if (!dataToUse) {
      console.error("No data available for sunburst chart");
      return;
    }
    
    // Ensure data has proper structure
    const safeData = this.ensureValidHierarchy(dataToUse);
    
    if (!safeData) {
      console.error("Invalid data structure for sunburst chart");
      return;
    }
    
    // Convert to Highcharts format
    const highchartsData = this.convertToHighchartsFormat(safeData);
    if (!highchartsData) {
      console.error("Failed to convert data to Highcharts format");
      return;
    }
    
    // Build node map and find paths to scored nodes for border highlighting
    const effectiveQuery = this.selectAll ? '' : (this.q1Selected ? 'q1' : this.q2Selected ? 'q2' : 'q3');
    const { highlightedNodes, scoredNodeIds, nodeColors } = this.buildNodeMapAndFindPaths(highchartsData, effectiveQuery);
    
    // Flatten to array format for Highcharts (required format) with path highlighting
    const flatData = this.flattenHighchartsData(highchartsData, [], highlightedNodes, nodeColors, 0, effectiveQuery, scoredNodeIds);
    
    console.log('flatData',flatData);
    // Create Highcharts Sunburst chart
    const chartOptions: any = {
      chart: {
        renderTo: element,
        type: 'sunburst',
        width: this.width,
        height: this.height,
        events: {
          load: function(this: any) { (this as any).__sunburstComponent?.renderCustomLeafLabels(this); },
          render: function(this: any) { (this as any).__sunburstComponent?.renderCustomLeafLabels(this); }
        }
      },
      title: {
        text: ''
      },
      series: [{
        type: 'sunburst',
        data: flatData,
        // Hamlet v1 can exceed Highcharts' default turboThreshold (~1000),
        // which may cause object-style points (id/parent/name/value) to be skipped.
        // Disable turbo mode so deeper levels always render.
        turboThreshold: 0,
        allowPointSelect: true,
        cursor: 'pointer',
          dataLabels: {
            enabled: true,
            allowOverlap: true,
            crop: false,
            overflow: 'allow',
            style: { fontSize: '8px', color: '#000' },
            formatter: function(this: any) {
              const name = this.point.name || '';
              const isLeaf = this.point.options?.isLeaf;
              const isOnPath = this.point.options?.isOnPath;
              const maxLength = this.series.chart.chartWidth < 500 ? 12 : 15;
              if (isOnPath) {
                return name.length > 20 ? name.substring(0, 20) + "..." : name;
              }
              if (isLeaf) {
                return name.length > 2 ? name.charAt(0).toUpperCase() : name;
              }
              return name.length > maxLength ? name.substring(0, maxLength) + "..." : name;
            }
          },
        levels: [{
          level: 1,
          levelIsConstant: false,
          dataLabels: { rotationMode: 'parallel', style: { fontSize: '10px' } }
        }, {
          level: 2,
          colorByPoint: true,
          dataLabels: { style: { fontSize: '9px' } }
        }, {
          level: 3,
          dataLabels: { enabled: true, crop: false, overflow: 'allow', allowOverlap: true, alignTo: 'plotEdges', style: { fontSize: '8px' } }
        }, {
          level: 4,
          dataLabels: { enabled: true, crop: false, overflow: 'allow', allowOverlap: true, alignTo: 'plotEdges', style: { fontSize: '7px' } }
        }],
        point: {
          events: {
            click: (e: any) => {
              const customData = e.point.options.customData;
              const pointId = e.point.options.id;
              if (customData) {
                this.emitNodeClicked(customData, pointId);
              }
            }
          }
        }
      }],
      tooltip: {
        formatter: function(this: any) {
          const val = 10;
          return val === 10
            ? `<b>${this.point.name}</b>`
            : `<b>${this.point.name}</b><br/>Value: ${val}`;
        }
      },
      plotOptions: {
        sunburst: {
          borderWidth: 1.5
          // borderColor from each point (chapter colors matching topic-list)
        }
      }
    };
    
    this.chart = Highcharts.chart(chartOptions);
    (this.chart as any).__sunburstComponent = this;
  }

  /** Custom overlay: always render leaf names using SVG, bypassing Highcharts dataLabels */
  private renderCustomLeafLabels(chart: any): void {
    if (!chart || !chart.series || !chart.series[0]) return;
    const prevGroup = chart._customLeafLabelsGroup;
    if (prevGroup) {
      prevGroup.destroy();
      chart._customLeafLabelsGroup = null;
    }
    const series = chart.series[0];
    const points = series.points || [];
    const renderer = chart.renderer;
    const group = renderer.g('custom-leaf-labels').attr({ zIndex: 7 }).add();
    chart._customLeafLabelsGroup = group;
    const centerX = chart.plotLeft + chart.plotWidth / 2;
    const centerY = chart.plotTop + chart.plotHeight / 2;
    const plotSize = Math.min(chart.plotWidth, chart.plotHeight);
    const fontSize = Math.max(6, Math.min(9, Math.floor(plotSize / 80)));
    points.forEach((point: any) => {
      const opts = point.options || {};
      if (!opts.isLeaf) return;
      const name = opts.name || '';
      if (!name) return;
      const labelText = name.length > 3 ? name.charAt(0).toUpperCase() : name;
      let x: number, y: number;
      const shapeArgs = point.shapeArgs || {};
      if (point.graphic && typeof point.graphic.getBBox === 'function') {
        const bbox = point.graphic.getBBox();
        x = bbox.x + bbox.width / 2;
        y = bbox.y + bbox.height / 2;
      } else {
        const innerR = shapeArgs.innerR ?? 0;
        const outerR = shapeArgs.outerR ?? plotSize / 2;
        const start = shapeArgs.start ?? 0;
        const end = shapeArgs.end ?? 0;
        const midR = (innerR + outerR) / 2;
        const midAngle = (start + end) / 2;
        x = centerX + midR * Math.sin(midAngle);
        y = centerY - midR * Math.cos(midAngle);
      }
      renderer.text(labelText, x, y)
        .attr({ zIndex: 8 })
        .css({
          fontSize: fontSize + 'px',
          color: '#000',
          fontWeight: opts.isOnPath ? 'bold' : 'normal',
          textAnchor: 'middle',
          dominantBaseline: 'middle'
        })
        .add(group);
    });
  }

  private zoomToNode(d: any) {
    // Highcharts handles zooming automatically on click
    // This is kept for compatibility but can be enhanced if needed
    console.log("Zoom to node:", d.name || d);
  }

  /** Build path string from sunburst point id (e.g. "root-Ch1-Sub1" -> "Ch1 --> Sub1") */
  private pathFromPointId(pointId: string): string {
    if (!pointId || pointId === 'root') return '';
    const withoutRoot = pointId.replace(/^root-/, '');
    return withoutRoot ? withoutRoot.replace(/-/g, ' --> ') : '';
  }

  /** Normalize and emit node click for topic-list, PDF viewer, and module details sync */
  private emitNodeClicked(customData: any, pointId?: string): void {
    const path = customData.path ?? (pointId ? this.pathFromPointId(pointId) : '');
    const normalized = {
      ...customData,
      content: customData.content ?? customData.value ?? '',
      name: customData.name ?? '',
      path: path || customData.path
    };
    this.nodeClicked.emit(normalized);
  }
}


