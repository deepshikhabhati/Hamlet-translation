import { Component, OnInit, ElementRef, ViewChild, Output, EventEmitter, Input, OnChanges, SimpleChanges } from '@angular/core';
import * as d3 from 'd3';
import { data } from 'src/assets/query';
@Component({
  selector: 'app-tree-chart',
  templateUrl: './tree-chart.component.html',
  styleUrls: ['./tree-chart.component.css']
})
export class TreeChartComponent implements OnInit, OnChanges {
  @ViewChild('treeContainer', { static: true }) treeContainer!: ElementRef;
  @Input() data: any = {}; // Input JSON data
  @Input() type: any = ''; // Input JSON data
  @Output() nodeClicked = new EventEmitter<any>(); // Event to emit node data
  @Output() cardSelected = new EventEmitter<{node: any}>();
  showPopup = false;
  popupContent = '';
  popupX = 0;
  popupY = 0;

public query = data
  
  private width: any = window.innerWidth / 2.5;
  private height: any = window.innerHeight - 400 ;
  selectedNodes: any[] = [];
  selectedCardIds: Set<string> = new Set(); // Track selected cards
  svg: any;
  private root: any;
  private treeLayout: any;
  hierarchyData: any;
  hierarchyData2: any
  treeLayout2: any;
  svg2: any;
  constructor() {}

  ngOnInit() {
 
    this.createTreeChart();

  }
  
  ngOnChanges(changes: SimpleChanges): void {
    if(this.type === 'query') {
      this.createTreeChartQuery();
    } else {
      this.createTreeChart();
    }
  }
  
  private highlightedPaths = new Set<string>();
  private highlightedNodes = new Set<any>();
private links: any; // Store links globally

private createTreeChartQuery() {
  const element: any = this.treeContainer.nativeElement;
  d3.select(element).selectAll("*").remove(); // Clear previous chart

  this.svg = d3.select(element) // Store `svg` for this instance
    .append("svg")
    .attr("width", this.width)
    .attr("height", this.height)
    .append("g")
    .attr("transform", "translate(40,40)");
  
   this.treeLayout = d3
    .tree()
    .size([this.width - 80, this.height - 80])
    .separation((a: any, b: any) => (a.parent === b.parent ? 1.5 : 2));

    const shouldExpand = (node: any) => {
      if (node.similarity_score > 0) return true;
      if (!node.children) return false;
      return node.children.some((child: any) => shouldExpand(child));
    };
  
     this.hierarchyData = d3.hierarchy(this.data, (d: any) => d.children);
    
     this.hierarchyData.descendants().forEach((d: any) => {
      d._children = d.children;
      if (!shouldExpand(d.data)) {
        d.children = null;
      }
    });
    console.log(this.hierarchyData)

    this.hierarchyData.children = this.hierarchyData._children;
    this.hierarchyData._children = null;

  this.update(this.hierarchyData);
}

private update(source: any) {
  this.svg.selectAll(".node, .link").remove(); // Remove only within this instance

  const treeData = this.treeLayout(this.hierarchyData);
  const nodes: any = treeData.descendants();
  const links: any = treeData.links();

  this.links = this.svg.selectAll(".link")
    .data(links)
    .enter()
    .append("line")
    .attr("class", "link")
    .attr("x1", (d: any) => d.source.x)
    .attr("y1", (d: any) => d.source.y)
    .attr("x2", (d: any) => d.target.x)
    .attr("y2", (d: any) => d.target.y)
    .style("stroke", "#999")
    .style("stroke-width", 2)
    .style("opacity", 0.6);

    const comp: any = this
  const node = this.svg.selectAll(".node")
    .data(nodes, (d: any) => d.data.name)
    .enter()
    .append("g")
    .attr("class", "node")
    .attr("transform", (d: any) => `translate(${d.x},${d.y})`)
    .on("click", (event: any, d: any) => {
      // d.children = d.children ? null : d._children;
      if (!d._children && !d.children) return; // If no children, do nothing
  
      if (d.children) {
        // Collapse children but keep reference
        d._children = d.children;
        d.children = null;
      } else {
        // Expand children
        d.children = d._children;
      }
    
      // Ensure the parent remains visible
      let current = d;
      while (current.parent) {
        current.parent.children = current.parent.children || [];
        if (!current.parent.children.includes(current)) {
          current.parent.children.push(current);
        }
        current = current.parent;
      }
      if (d.data.content) {
                  this.addCard(d.data);
                  this.nodeClicked.emit(d.data);
                } else if (d.data.children && d.data.children.length > 0) {
                  let obj: any = {
                    name: d.data.name,
                    content: d.data.children.map((item: any) => item.value).join(" ")
                  };
                  this.addCard(obj);
                } else {
                  let obj: any = {
                    name: d.data.name,
                    content: d.data.value
                  };
                  this.addCard(obj);
                }
      this.update(this.hierarchyData);
    })
    .on("mouseover", (event: any, d: any) => {
      const currentNode = d3.select(event.currentTarget);
      currentNode.select(".node-text").style("opacity", 1);
      currentNode.select(".score-text").style("opacity", 1);
    })
    .on("mouseout", (event: any, d: any) => {
      const currentNode = d3.select(event.currentTarget);
      // currentNode.select(".node-text").style("opacity", 0);
      // currentNode.select(".score-text").style("opacity", 0);
    });

    node.append("circle")
      .attr("r", (d: any) => d.data.name.toLowerCase().includes("leaf") && !d.data.rank ? 8 : (d.data.rank ? d.data.rank * 2 : 10))
      .style("fill", (d: any) => d.data.similarity_score > 0 ? "#ff5733" : (d.data.name.toLowerCase().includes("leaf") ? "#808080" : (d.data.color || "#000000")));

    node.append("text")
      .attr("class", "node-text")
      .attr("dy", -15)
      .attr("text-anchor", "middle")
      .text((d: any) => {
        const firstWord = d.data.name?.split(" ")[0] || "";
        return firstWord;
      })
      .style("font-size", "17px")
      // .style("opacity", 0);  // Initially hidden

    node.append("text")
      .attr("class", "score-text")
      .attr("dy", 5)
      .attr("text-anchor", "middle")
      .text((d: any) => d.data.similarity_score !== undefined && d.data.similarity_score !== 0 ? Math.round(d.data.similarity_score) : "")
      .style("font-size", "15px")
      .style("fill", "white")
      .style("font-weight", "bold")
      // .style("opacity", 0);  // Initially hidden
}

private createTreeChart() {
  const element: any = this.treeContainer.nativeElement;
  d3.select(element).selectAll("*").remove(); // Clear previous chart

   this.svg2 = d3
    .select(element)
    .append("svg")
    .attr("width", this.width)
    .attr("height", this.height)
    .append("g")
    .attr("transform", "translate(40,40)");

   this.hierarchyData2 = d3.hierarchy(this.data, (d: any) => {
    if (d.children) return d.children;
    return d.similarity_score > 0 ? [] : null;
  });
  
   this.treeLayout2 = d3
    .tree()
    .size([this.width - 80, this.height - 80])
    .separation((a: any, b: any) => (a.parent === b.parent ? 1.5 : 2));

    this.hierarchyData2.descendants().forEach((d: any) => {
    d._children = d.children;
    if (!d.data.similarity_score || d.data.similarity_score === 0) {
      d.children = null;
    }
  });
  
  this.hierarchyData2.children = this.hierarchyData2._children;
  this.hierarchyData2._children = null;

  console.log(this.hierarchyData2);


  this.update3(this.hierarchyData2);
}

private update3 = (source: any) => {
  this.svg2.selectAll(".node, .link").remove();

  const treeData = this.treeLayout2(this.hierarchyData2);
  const nodes: any = treeData.descendants();
  const links: any = treeData.links();

  this.links = this.svg2.selectAll(".link")
    .data(treeData.links())
    .enter()
    .append("line")
    .attr("class", "link")
    .attr("x1", (d: any) => d.source.x)
    .attr("y1", (d: any) => d.source.y)
    .attr("x2", (d: any) => d.target.x)
    .attr("y2", (d: any) => d.target.y)
    .style("stroke", (d: any) => d.target.data.similarity_score ? "#ff5733" : "#999")
    .style("stroke-width", (d: any) => d.target.data.rank ? d.target.data.rank * 2 : 2)
    .style("opacity", 0.6);

    const comp: any = this
  // Nodes
  const node = this.svg2
    .selectAll(".node")
    .data(nodes, (d: any) => d.data.name)
    .enter()
    .append("g")
    .attr("class", "node")
    .attr("transform", (d: any) => `translate(${d.x},${d.y})`)
    .on("click", (event: any, d: any) => {
      console.log(d);
      // if (d.depth === 0) return;

      if (d.depth !== 0) {
        d.children = d.children ? null : d._children;
      }
      if (d.data.content) {
        this.addCard(d.data);
        this.nodeClicked.emit(d.data);
      } else if (d.data.children && d.data.children.length > 0) {
        let obj: any = {
          name: d.data.name,
          content: d.data.children.map((item: any) => item.value).join(" ")
        };
        this.addCard(obj);
      } else {
        let obj: any = {
          name: d.data.name,
          content: d.data.value
        };
        this.addCard(obj);
      }
      this.update3(d);
       this.highlightPath(d)
    })
    .on("mouseover", (event: any, d: any) => {
      const currentNode = d3.select(event.currentTarget);
      currentNode.select(".node-text").style("opacity", 1);
      currentNode.select(".score-text").style("opacity", 1);
    })
    .on("mouseout", (event: any, d: any) => {
      const currentNode = d3.select(event.currentTarget);
      // currentNode.select(".node-text").style("opacity", 0);
      // currentNode.select(".score-text").style("opacity", 0);
    });

  node.append("circle")
    .attr("r", (d: any) => d.data.name.toLowerCase().includes("leaf") && !d.data.rank ? 8 : (d.data.rank ? d.data.rank * 2 : 10))
    .style("fill", (d: any) => d.data.similarity_score > 0 ? "#ff5733" : (d.data.name.toLowerCase().includes("leaf") ? "#808080" : (d.data.color || "#000000")));

  node.append("text")
    .attr("class", "node-text")
    .attr("dy", -15)
    .attr("text-anchor", "middle")
    .text((d: any) => {
      const firstWord = d.data.name?.split(" ")[0] || "";
      return firstWord;
    })
    .style("font-size", "17px")
    // .style("opacity", 0);  // Initially hidden

  node.append("text")
    .attr("class", "score-text")
    .attr("dy", 5)
    .attr("text-anchor", "middle")
    .text((d: any) => d.data.similarity_score !== undefined && d.data.similarity_score !== 0 ? Math.round(d.data.similarity_score) : "")
    .style("font-size", "15px")
    .style("fill", "white")
    .style("font-weight", "bold")
    // .style("opacity", 0);  // Initially hidden
};


closePopup() {
  this.showPopup = false;
}

private highlightPath(selectedNode: any) {
    if (!this.links) return;
  
    let current = selectedNode;
    
    // Add the selected node and its path to the sets
    while (current.parent) {
      this.highlightedPaths.add(`${current.parent.x},${current.parent.y}-${current.x},${current.y}`);
      this.highlightedNodes.add(current);
      current = current.parent;
    }
    this.highlightedNodes.add(selectedNode); // Add the clicked node itself
  
    // Apply highlights to paths
    this.links
      .style('stroke', (d: any) => this.highlightedPaths.has(`${d.source.x},${d.source.y}-${d.target.x},${d.target.y}`) ? '#ff5733' : '#999')
      .style('stroke-width', (d: any) => this.highlightedPaths.has(`${d.source.x},${d.source.y}-${d.target.x},${d.target.y}`) ? 4 : 2)
      .style('opacity', (d: any) => this.highlightedPaths.has(`${d.source.x},${d.source.y}-${d.target.x},${d.target.y}`) ? 1 : 0.6);
  
    // Apply highlights to nodes
    d3.selectAll('.node')
      .filter((d: any) => this.highlightedNodes.has(d))
      .select('circle')
      .style('stroke', '#ff5733') // Add outline
      .style('stroke-width', 4);
  }

  addCard(node: any) {
    // Check if card already exists
    if (!this.selectedNodes.find(n => n.name === node.name)) {
      this.selectedNodes.push(node);
    }
    console.log(this.selectedNodes,160)
  }

  removeCard(index: number) {
    this.selectedNodes.splice(index, 1);
  }
  
  onCheckboxChange(node: any, event: any) {
    const cardId = `card-${node.name}`;
    if (this.selectedCardIds.has(cardId)) {
      this.selectedCardIds.delete(cardId);
    } else {
      this.selectedCardIds.add(cardId);
    }
    this.cardSelected.emit({ node });
  }
}
