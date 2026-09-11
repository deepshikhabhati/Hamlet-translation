import { Component, OnInit, ElementRef, ViewChild, Output, EventEmitter, Input, OnChanges, SimpleChanges, AfterViewInit } from '@angular/core';
import * as d3 from 'd3';
@Component({
  selector: 'app-circle-tree',
  templateUrl: './circle-tree.component.html',
  styleUrls: ['./circle-tree.component.css']
})
export class CircleTreeComponent implements AfterViewInit {
  @ViewChild('treeContainer', { static: true }) treeContainer!: ElementRef;
  @Input() data: any;
  @Input() isDualView: boolean = false;
  @Input() isLeaf: boolean = true;
  @Input() isAi: boolean = false;
  @Input() q1Color: string = '#FFA500';  // Default orange for Q1
  @Input() q2Color: string = '#7474e2';  // Default blue for Q2
  @Input() q3Color: string = '#28a745';  // Default green for Q3
  @Input() sizeScale: number = 1; // Scale factor for size (default 1, can be smaller for dual-view)

  @Input() query: any = ''; // Input JSON data
  @Output() nodeClicked = new EventEmitter<any>();
  @Output() cardSelected = new EventEmitter<{node: any}>();
  showPopup = false;
  popupContent = '';
  popupX = 0;
  popupY = 0;
  
  private width: any = window.innerWidth ;
  private height: any = window.innerHeight;
  selectedNodes: any[] = [];
  selectedCardIds: Set<string> = new Set(); // Track selected cards

  private root: any;
  private treeLayout: any;
  private svg: any;
  private diameter = 12000;  // Overall size of the circle
  private radius = this.diameter / 2 - 80; // Radius for nodes
  links: any;
  private calculatedRanks: Map<string, number> = new Map(); // Store calculated ranks by node name
  /** Per-query rank (1–5) per node name, for rank-based donut: same logic as topiclist antenna. */
  private calculatedRanksByQuery: Map<string, { 1?: number; 2?: number; 3?: number }> = new Map();

  // Helper function to get the best rank across all queries
  private getBestRank(node: any): number | null {
    // First check if we have a calculated rank for this node
    if (node && node.name && this.calculatedRanks.has(node.name)) {
      return this.calculatedRanks.get(node.name)!;
    }
    // Fall back to existing rank properties
    if (node.rank) return node.rank;
    if (node.rank2) return node.rank2;
    if (node.rank3) return node.rank3;
    return null;
  }

  // Collect all nodes with similarity_score from hierarchy
  private collectNodesWithSimilarityScore(hierarchyData: any): Array<{node: any, score: number, name: string}> {
    const nodesWithScores: Array<{node: any, score: number, name: string}> = [];
    
    if (!hierarchyData || !hierarchyData.descendants) {
      return nodesWithScores;
    }
    
    hierarchyData.descendants().forEach((d: any) => {
      if (d.data && this.hasSimilarityScore(d.data)) {
        const score = this.getBestSimilarityScore(d.data);
        nodesWithScores.push({
          node: d.data,
          score: score,
          name: d.data.name || ''
        })
      }
    });
    
    return nodesWithScores;
  }

  // Calculate ranks based on similarity_score when there are exactly 5 nodes
  private calculateRanksFromSimilarityScore(hierarchyData: any): void {
    this.calculatedRanks.clear();
    this.calculatedRanksByQuery.clear();

    const nodesWithScores = this.collectNodesWithSimilarityScore(hierarchyData);

    if (nodesWithScores.length > 0) {
      // Sort by similarity_score in descending order (highest first)
      nodesWithScores.sort((a, b) => b.score - a.score);

      // Assign best rank per node (1 = highest, 2 = second, ...)
      console.log(nodesWithScores,175)
      nodesWithScores.forEach((item, index) => {
        this.calculatedRanks.set(item.name, index + 1);
      });
      console.log(this.calculatedRanks,176)
    }

    // Per-query ranks for donut (top 5 per query get rank 1–5, rest get 5) – same as topiclist antenna
    if (!hierarchyData?.descendants) return;
    const descendants = hierarchyData.descendants() as Array<{ data: any }>;
    for (const qIndex of [1, 2, 3] as const) {
      const scoreKey = qIndex === 1 ? 'similarity_score' : qIndex === 2 ? 'similarity_score2' : 'similarity_score3';
      const withScore = descendants
        .map((d: any) => ({ name: d.data?.name, score: d.data?.[scoreKey] ?? 0 }))
        .filter((n: any) => n.name && n.score > 0);
      withScore.sort((a: any, b: any) => b.score - a.score);
      const top5 = withScore.slice(0, 5);
      withScore.forEach((n: any, i: number) => {
        const rank = i < 5 ? i + 1 : 5;
        if (!this.calculatedRanksByQuery.has(n.name)) {
          this.calculatedRanksByQuery.set(n.name, {});
        }
        const entry = this.calculatedRanksByQuery.get(n.name)!;
        (entry as any)[qIndex] = rank;
      });
    }
  }

  // Helper function to check if node has any similarity score
  private hasSimilarityScore(node: any): boolean {
    return (node.similarity_score && node.similarity_score > 0) ||
           (node.similarity_score2 && node.similarity_score2 > 0) ||
           (node.similarity_score3 && node.similarity_score3 > 0) ||
           (node.rexpanded) ||
           (node.rexpanded2 ) ||
           (node.rexpanded3) || node.expanded || node.expanded2 || node.expanded3;
  }

  // Helper function to get the highest similarity score
  private getBestSimilarityScore(node: any): number {
    const scores = [
      node.similarity_score || 0,
      node.similarity_score2 || 0,
      node.similarity_score3 || 0
    ];
    return Math.max(...scores);
  }

  // Helper function to determine which query a node belongs to and return its color
  private getQueryColor(node: any): string {
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

  // Helper function to get color by query index (1, 2, or 3)
  private getColorByQueryIndex(index: number): string {
    switch(index) {
      case 1: return this.q1Color;
      case 2: return this.q2Color;
      case 3: return this.q3Color;
      default: return "#000000";
    }
  }

  // Helper function to count how many similarity scores a node has
  private countSimilarityScores(node: any): number {
    let count = 0;
    if (node.similarity_score && node.similarity_score > 0) count++;
    if (node.similarity_score2 && node.similarity_score2 > 0) count++;
    if (node.similarity_score3 && node.similarity_score3 > 0) count++;
    return count;
  }

  // Helper function to get top 2 scores with their query indices
  private getTopTwoScores(node: any): Array<{score: number, queryIndex: number}> {
    const scores = [
      { score: node.similarity_score || 0, queryIndex: 1 },
      { score: node.similarity_score2 || 0, queryIndex: 2 },
      { score: node.similarity_score3 || 0, queryIndex: 3 }
    ];
    
    // Filter out zero scores and sort by score descending
    const validScores = scores
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score);
    
    return validScores.slice(0, 2); // Return top 2
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

  /** Rank-based scores for donut (same scale as topiclist antenna): rank 1→100, 2→80, 3→60, 4→40, 5→20. */
  private getRankBasedScoresForDonut(node: any): Array<{score: number, queryIndex: number, color: string}> {
    const name = node?.name;
    if (!name || !this.calculatedRanksByQuery.has(name)) {
      return this.getAllSimilarityScores(node);
    }
    const byQuery = this.calculatedRanksByQuery.get(name)!;
    const result: Array<{score: number, queryIndex: number, color: string}> = [];
    if (byQuery[1] != null && node.similarity_score > 0) {
      const rank = byQuery[1];
      result.push({ score: ((6 - rank) / 5) * 100, queryIndex: 1, color: this.q1Color });
    }
    if (byQuery[2] != null && node.similarity_score2 > 0) {
      const rank = byQuery[2];
      result.push({ score: ((6 - rank) / 5) * 100, queryIndex: 2, color: this.q2Color });
    }
    if (byQuery[3] != null && node.similarity_score3 > 0) {
      const rank = byQuery[3];
      result.push({ score: ((6 - rank) / 5) * 100, queryIndex: 3, color: this.q3Color });
    }
    return result.length > 0 ? result : this.getAllSimilarityScores(node);
  }

  // Helper function to check if node has actual similarity scores (contributed nodes)
  private hasActualSimilarityScores(node: any): boolean {
    return (node.similarity_score && node.similarity_score > 0) ||
           (node.similarity_score2 && node.similarity_score2 > 0) ||
           (node.similarity_score3 && node.similarity_score3 > 0);
  }

  ngAfterViewInit(): void {
    this.updateDimensions();
  }

  ngOnChanges(changes: SimpleChanges): void {
    console.log(this.data,33)
    
    // Update dimensions if sizeScale changes
    if (changes['sizeScale'] || changes['data']) {
      this.updateDimensions();
    }
    
    if (this.data) {
      // Filter data to only include expanded nodes
      const filteredData = this.filterExpandedNodes(this.data);
      
      // Check if filtered data is valid (has at least root node)
      if (filteredData) {
        this.createCircularTreeChart(filteredData);
      } else {
        console.warn("No expanded nodes to display in circle tree");
        // Clear the chart if no data
        const element = this.treeContainer.nativeElement;
        d3.select(element).selectAll("*").remove();
      }
    }
  }

  private updateDimensions(): void {
    if (this.treeContainer && this.treeContainer.nativeElement) {
      const container = this.treeContainer.nativeElement;
      // Try to get dimensions from container or its parent
      let containerWidth = container.clientWidth || container.offsetWidth;
      let containerHeight = container.clientHeight || container.offsetHeight;
      
      // If container doesn't have dimensions, try parent (for floating windows)
      if (!containerWidth || containerWidth === 0) {
        const parent = container.parentElement;
        if (parent) {
          containerWidth = parent.clientWidth || parent.offsetWidth || (window.innerWidth / 5);
          // Check if we're in a floating window
          const floatingWindow = parent.closest('.floating-window-content');
          if (floatingWindow) {
            containerWidth = (floatingWindow as HTMLElement).clientWidth || containerWidth;
          }
        } else {
          containerWidth = window.innerWidth / 5;
        }
      }
      
      if (!containerHeight || containerHeight === 0) {
        const parent = container.parentElement;
        if (parent) {
          containerHeight = parent.clientHeight || parent.offsetHeight || (window.innerHeight / 3);
          // Check if we're in a floating window
          const floatingWindow = parent.closest('.floating-window-content');
          if (floatingWindow) {
            containerHeight = (floatingWindow as HTMLElement).clientHeight || containerHeight;
          }
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
        // Make chart smaller when not in dual mode
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
        // Smaller default size when not in dual mode
        const smallScale = 1;
        this.width = (window.innerWidth / 5) * smallScale;
        this.height = (window.innerHeight / 3) * smallScale;
      }
    }
  }
  
  // Public method to trigger dimension update (called from parent when window resizes)
  public recalculateDimensions(): void {
    this.updateDimensions();
    if (this.data) {
      const filteredData = this.filterExpandedNodes(this.data);
      if (filteredData) {
        this.createCircularTreeChart(filteredData);
      }
    }
  }

  // Ensure data structure is valid for D3 hierarchy
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
    Object.keys(safeNode).forEach(key => {
      if (safeNode[key] === undefined) {
        delete safeNode[key];
      }
    });
    
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
    if (!data.expanded && !data.expanded2 && !data.expanded3) {
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

    return filteredNode;
  }
  
  private createCircularTreeChart(filteredData?: any) {
    // Update dimensions before creating chart
    this.updateDimensions();
    
    const svgClass = "hierarchy-donut-tree-svg";
  
    const element = this.treeContainer.nativeElement;
    d3.select(element).selectAll(`.${svgClass}`).remove();
  
    // Use filtered data if provided, otherwise use original data
    const dataToUse = filteredData || this.data;
    
    // Validate data structure before creating hierarchy
    if (!dataToUse) {
      console.error("No data available for circle tree chart");
      return;
    }
    
    // Ensure data has proper structure for D3 hierarchy
    const safeData = this.ensureValidHierarchy(dataToUse);
    
    let hierarchyData: any = d3.hierarchy(safeData, (d: any) => {
      // Return null if children is null, undefined, or empty, otherwise return the array
      if (!d || !d.children) {
        return null;
      }
      if (Array.isArray(d.children) && d.children.length > 0) {
        // Filter out any undefined or null children before returning
        return d.children.filter((child: any) => child !== null && child !== undefined);
      }
      return null;
    });
  
    // Validate hierarchy was created successfully
    if (!hierarchyData) {
      console.error("Failed to create hierarchy from data");
      return;
    }
    
    // Validate that hierarchy has valid structure
    if (!hierarchyData.descendants || !Array.isArray(hierarchyData.descendants())) {
      console.error("Invalid hierarchy structure - descendants not available");
      return;
    }
  
    // Calculate ranks from similarity_score if there are exactly 5 nodes with scores
    this.calculateRanksFromSimilarityScore(hierarchyData);
  
    // Use d3.tree() for hierarchical tree layout (top-down)
    // Adjust margins based on chart size (smaller margins for smaller charts)
    const marginScale = this.isDualView ? 1 : 0.5; // Smaller margins when not in dual mode
    const margin = { 
      top: 40 * marginScale, 
      right: 40 * marginScale, 
      bottom: 40 * marginScale, 
      left: 40 * marginScale 
    };
    const treeWidth = this.width - margin.left - margin.right;
    const treeHeight = this.height - margin.top - margin.bottom;
    
    let treeLayout: any = d3.tree().size([treeWidth, treeHeight]);
  
    // Create SVG container for hierarchical tree
    const svg: any = d3
      .select(element)
      .append("svg")
      .attr("class", svgClass) 
      .attr("width", this.width)
      .attr("height", this.height)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
  
    // 🌟 Ensure all nodes are visible on load and have valid children
    if (hierarchyData.descendants) {
      hierarchyData.descendants().forEach((d: any) => {
        console.log(d)
        // Ensure children is always an array or null, never undefined
        if (d.children && Array.isArray(d.children) && d.children.length > 0) {
          d._children = d.children; // Store original children
          d.children = d._children;  // **Keep all nodes expanded**
        } else if (this.hasSimilarityScore(d.data)) {
          // Ensure expandable leaf nodes if they have similarity scores from any query
          d._children = [];
          d.children = null;
        } else {
          // Set to null (not undefined) for leaf nodes
          d._children = null;
          d.children = null;
        }
      });
    }
    hierarchyData._children = null; // Remove reference to avoid collapsing
  
    const update = (source: any) => {

      if (!hierarchyData || !hierarchyData.descendants) {
        console.error("Hierarchy data is undefined or improperly structured.");
        return;
      }
    
      d3.select(element).selectAll(".node, .link").remove(); // Clear previous nodes & links
      
      // Validate hierarchyData before using treeLayout
      if (!hierarchyData || !hierarchyData.descendants) {
        console.error("Invalid hierarchy data structure");
        return;
      }
      
      // Ensure all nodes in hierarchy have valid children (null or array, never undefined)
      const descendants = hierarchyData.descendants();
      descendants.forEach((d: any) => {
        if (d.children === undefined) {
          d.children = null;
        }
        if (d._children === undefined) {
          d._children = null;
        }
      });
      
      // Validate source node if provided
      if (source) {
        if (source.children === undefined) {
          source.children = null;
        }
        if (source._children === undefined) {
          source._children = null;
        }
      }
      
      const treeData = treeLayout(source || hierarchyData);
      
      // Validate treeData was created successfully
      if (!treeData) {
        console.error("Failed to create tree layout");
        return;
      }
      const nodes: any = treeData.descendants();
      const links: any = treeData.links();
    
      // 🌟 Highlighted Links Based on similarity scores (all queries) - Hierarchical tree structure (straight lines)
      // Use d3.linkVertical for vertical tree links
      const linkGenerator: any = d3.linkVertical()
        .x((d: any) => d.x)
        .y((d: any) => d.y);
      
      this.links = svg
        .selectAll(".link")
        .data(links)
        .enter()
        .append("path")
        .attr("class", "link")
        .attr("d", linkGenerator)
        .style("stroke", (d: any) => {
          // if (this.hasSimilarityScore(d.target.data)) {
          //   return this.getQueryColor(d.target.data); // Use query-specific color for links
          // }
          return "#999"; // Default gray
        })
        .style("stroke-width", (d: any) => {
          // Scale down link width when not in dual mode
          return this.isDualView ? 2 : 1.5;
        }) // Use rank from any query or default
        .style("opacity", (d: any) => this.hasSimilarityScore(d.target.data) ? 1 : 0.6) // Higher opacity for important links
        .style("fill", "none"); // Ensure paths are not filled
    
      // 🌟 Create Nodes with Similarity Score Highlighting
      const node = svg
        .selectAll(".node")
        .data(nodes, (d: any) => d.data.name)
        .enter()
        .append("g")
        .attr("class", "node")
        .attr("transform", (d: any) => `translate(${d.x},${d.y})`)
        .on("click", (event: any, d: any) => {
          console.log(d,348)
          if (d.children) {

            d._children = d.children;

            d.children = null;

          } else {

            d.children = d._children;

          } // Toggle expand/collapse
          update(d);
        });
    
      // Filter nodes: don't display circle if isAi is true and doesn't have similarity score
      const filteredNodes = node.filter((d: any) => {
          // Display circle if: NOT (isAi is true AND doesn't have similarity score)
          return !(this.isLeaf && !this.hasSimilarityScore(d.data));
      });

      // Store component reference for use in callbacks
      const component = this;

      // Create donut charts for nodes with actual similarity scores (contributed nodes)
      filteredNodes
        .filter((d: any) => component.hasActualSimilarityScores(d.data))
        .each(function(this: SVGGElement, d: any) {
          const nodeGroup = d3.select(this);
          const rank = component.getBestRank(d.data);
          console.log(rank,174,d.data)
          const baseRadius = rank ? 25 - rank : 6;
          const radius = component.isDualView ? baseRadius : baseRadius * 0.6;
          const innerRadius = radius * 0.4; // Inner radius for donut (40% of outer radius)
          
          // Use rank-based values for donut (same rank as antenna / topiclist)
          const scores = component.getRankBasedScoresForDonut(d.data);
          
          if (scores.length > 0) {
            // Create pie generator
            const pie = d3.pie<{score: number, queryIndex: number, color: string}>()
              .value((d) => d.score)
              .sort(null);
            
            // Create arc generator for donut
            const arc = d3.arc<d3.PieArcDatum<{score: number, queryIndex: number, color: string}>>()
              .innerRadius(innerRadius)
              .outerRadius(radius);
            
            // Generate pie data
            const pieData = pie(scores);
            
            // Create donut segments
            const arcs = nodeGroup
              .selectAll(".donut-segment")
              .data(pieData)
              .enter()
              .append("path")
              .attr("class", "donut-segment")
              .attr("d", arc)
              .style("fill", (d: any) => d.data.color)
              .style("stroke", "#000")
              .style("stroke-width", component.isDualView ? 2 : 1.5);
          }
        });

      // Create regular circles for nodes without similarity scores (not contributed)
      filteredNodes
        .filter((d: any) => !this.hasActualSimilarityScores(d.data))
        .append("circle")
        .attr("r", 5) // Fixed size of 5 for circles
        .style("fill", (d: any) => {
          if (d.data.name.toLowerCase().includes("leaf")) return "#808080"; // Default for leaves
          return "#B2BEB5"; // Default color
        })
        .style("stroke", "#000") // Default black border
        .style("stroke-width", (d: any) => {
          const baseWidth = 1.5;
          // Scale down stroke width when not in dual mode
          return this.isDualView ? baseWidth : baseWidth * 0.7;
        });
    
      // 🌟 Add Labels - Position text based on node type
      node
        .append("text")
        .attr("dx", 0) // Center horizontally
        .attr("dy", (d: any) => {
          // For circles (nodes without similarity scores), position text below
          if (!this.hasActualSimilarityScores(d.data)) {
            return -10 ; // Circle radius (5) + padding
          }
          // For donut charts, position text to the right (original behavior)
          return this.isDualView ? -17 : -17;
        })
        .attr("text-anchor", (d: any) => {
          // Center text for circles, start for donuts
          return !this.hasActualSimilarityScores(d.data) ? "middle" : "middle";
        })
        .text((d: any) => {
          // Only display text if node has similarity score
          if (!this.hasSimilarityScore(d.data)) {
            return "";
          }
          let name = d.data.name;
          if (name.toLowerCase().includes("leaf")) return ""; 
          // Shorter text when not in dual mode
          const maxLength = this.isDualView ? 6 : 6;
          return name.length > maxLength ? name.substring(0, maxLength) + "..." : name;
        })
        .style("font-size", this.isDualView ? "12px" : "10px") // Smaller font when not in dual mode
        .style("fill", (d: any) => {
          // if (this.hasSimilarityScore(d.data)) {
          //   return this.getQueryColor(d.data); // Use query-specific color for text
          // }
          return "#000"; // Default black (shouldn't be visible since text is empty)
        })
    };
    console.log(hierarchyData)
    update(hierarchyData);
  }
  
  
  addCard(node: any) {
    // Check if card already exists
    if (!this.selectedNodes.find(n => n.name === node.name && n.name !== 'leaf')) {
      this.selectedNodes.push(node);
    }
    console.log(this.selectedNodes,160)
  }
}
