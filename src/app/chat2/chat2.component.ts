import {
  Component,
  ElementRef,
  ViewChild,
  EventEmitter,
  Output,
  Input,
  OnChanges,
  SimpleChanges
} from '@angular/core';
import * as d3 from 'd3';

@Component({
  selector: 'app-circular-tree',
  templateUrl: './chat2.component.html',
  styleUrls: ['./chat2.component.css']
})
export class CircularTreeComponent implements OnChanges {
  @ViewChild('treeContainer', { static: true }) treeContainer!: ElementRef;
  @Input() data: any;
  @Input() query: any = ''; // Input JSON data
  @Input() twoQuerys: boolean = false; // Input JSON data
  @Input() selectedName: any = ''; // Input JSON data
  @Output() nodeClicked = new EventEmitter<any>();
  @Output() chartClicked = new EventEmitter<any>();

  private svg: any;
  private root: any;
  private duration = 750;
  private radius = 160;

  private highlightedNodes = new Set<any>();
  isOn: boolean = false;
  barChartData: { label: string; value: any; }[] = []
  intersection: any = '';
  ngAfterViewInit(): void {
    this.initChart();
  }

  ngOnChanges(changes: SimpleChanges): void {
    console.log(changes)
    if (changes['data'] && this.data) {
      this.initChart();
    }
  }
  selected = 'Query2'; // or 'grid'

  select(mode: string) {
    this.selected = mode;
    this.initChart();
  }
  private initChart() {
    d3.select(this.treeContainer.nativeElement).selectAll('*').remove();

    this.root = d3.hierarchy(this.data, d => d.expanded ? d.children : null);
    this.root.x0 = 0;
    this.root.y0 = 0;

    const svg = d3.select(this.treeContainer.nativeElement)
      .append('svg')
      .attr('width', 400)
      .attr('height', 400)
      .append('g')
      .attr('transform', `translate(200, 200)`);

    this.svg = svg;
    this.update(this.root);
  }

  private update(source: any) {
    const tree = d3.tree().size([2 * Math.PI, this.radius]);
    const root = d3.hierarchy(this.data, d => d.expanded ? d.children : null);
    tree(root);

    const nodes = root.descendants();
    const links = root.links();

    this.svg.selectAll('.link').remove();
    this.svg.selectAll('.node').remove();


    const visibleNodes = nodes.filter((d: any) =>
      !d.parent || d.data.similarity_score !== undefined || d.data.similarity_score2 !== undefined
    );
    
    const visibleNodeSet = new Set(visibleNodes);
    
    const visibleLinks = links.filter((link: any) =>
      visibleNodeSet.has(link.source) && visibleNodeSet.has(link.target)
    );
    // Links
    this.svg.selectAll('.link')
    .data(
      links)
      .enter()
      .append('path')
      .attr('class', 'link')
      
    //   .attr("d", (d: any) => `
    //   M ${d.source.y * Math.cos(d.source.x)}, ${d.source.y * Math.sin(d.source.x)}
    //   L ${d.target.y * Math.cos(d.target.x)}, ${d.target.y * Math.sin(d.target.x)}
    // `)
    .attr("d", (d: any) => {
      const startAngle = d.source.x;
      const startRadius = d.source.y;
      const endAngle = d.target.x;
      const endRadius = d.target.y;
    
      const startX = startRadius * Math.cos(startAngle);
      const startY = startRadius * Math.sin(startAngle);
      const endX = endRadius * Math.cos(endAngle);
      const endY = endRadius * Math.sin(endAngle);
    
      const midRadius = (startRadius + endRadius) / 2;
    
      const controlX1 = midRadius * Math.cos(startAngle);
      const controlY1 = midRadius * Math.sin(startAngle);
      const controlX2 = midRadius * Math.cos(endAngle);
      const controlY2 = midRadius * Math.sin(endAngle);
    
      return `M${startX},${startY} C${controlX1},${controlY1} ${controlX2},${controlY2} ${endX},${endY}`;
    })
      .attr('fill', 'none')
      .attr('stroke', '#ccc')
      .style("stroke-width", 4) // Thicker for similarity

    // Nodes
    const node = this.svg
    .selectAll(".node")
    .data(nodes, (d: any) => d.data.name)
    .enter()
    .append("g")
    .attr("class", "node")
    .attr("transform", (d: any) => `translate(${d.y * Math.cos(d.x)},${d.y * Math.sin(d.x)})`)
    .on("click", (event: any, d: any) => {
      // d.children = d.children ? null : d._children;
      d.data.selected = true
  
      console.log(d)


      if(!this.query) {
        this.onNodeClick(d);
      }

      if(this.twoQuerys) {
      this.barChartData = [
        { label: 'Q1', value: d.data.similarity_score },
        { label: 'Q2', value: d.data.similarity_score2 },
        { label: 'Union', value: d.data.union }
      ];
  
      this.intersection = d.data.intersection
    }

      this.chartClicked.emit(d.data)

      this.highlightedNodes.add(d)

      console.log(this.highlightedNodes)

      d3.selectAll('.node')
      .filter((d: any) => d.data.selected === true)
      .select('circle')
      .style('stroke', 'red') // Add outline
      .style('stroke-width', 4);
  
      if (d.data.content) {
                  // this.addCard(d.data);
                  this.nodeClicked.emit(d.data);
                } else if (d.data.children && d.data.children.length > 0) {
                  let obj: any = {
                    name: d.data.name,
                    content: d.data.children.map((item: any) => item.value).join(" ")
                  };
                  this.nodeClicked.emit(obj);
                  // this.addCard(obj);
                } else {
                  let obj: any = {
                    name: d.data.name,
                    content: d.data.value
                  };

                  this.nodeClicked.emit(obj);
                  // this.addCard(obj);
                }

    });


      node
      .append("circle")
      .filter((d: any) => {
        if (this.twoQuerys && this.selected === 'Query1') {
          return d.data.similarity_score !== undefined;
        } else if (this.twoQuerys && this.selected === 'Query2') {
          return d.data.similarity_score2 !== undefined;
        } else  if ( this.twoQuerys && this.selected === 'Union') {
          return d.data.similarity_score !== undefined || d.data.similarity_score2 !== undefined;
        } else {
          return d.data.similarity_score !== undefined;
        }
      })
      .attr("r", (d: any) => {
        if (this.selected === 'Union') {
          const score1 = d.data.similarity_score;
          const score2 = d.data.similarity_score2;
          const rank1 = d.data.rank;
          const rank2 = d.data.rank2;
      
          if (score1 !== undefined && score2 !== undefined) {
            if (score1 >= score2 && rank1 !== undefined) {
              return rank1 === 1 ? 20 : rank1 * 2 + 2;
            }
            if (score2 > score1 && rank2 !== undefined) {
              return rank2 === 1 ? 20 : rank2 * 2 + 2;
            }
          }
      
          if (score1 !== undefined && rank1 !== undefined) {
            return rank1 === 1 ? 20 : rank1 * 2 + 2;
          }
          if (score2 !== undefined && rank2 !== undefined) {
            return rank2 === 1 ? 20 : rank2 * 2 + 2;
          }
        }
        if(this.selected === 'Intersection') {
          if(d.data.similarity_score2 > d.data.similarity_score && d.data.rank)     return d.data.rank === 1 ? 20 : d.data.rank * 2 + 2;;
          if(d.data.similarity_score2 < d.data.similarity_score && d.data.rank2)     return d.data.rank2 === 1 ? 20 : d.data.rank2 * 2 + 2;;
        }
        if (this.twoQuerys && this.selected === 'Query2' && d.data.rank2) {
          return d.data.rank2 === 1 ? 20 : d.data.rank2 * 2 + 2;
        }
        if (this.twoQuerys && this.selected === 'Query1' && d.data.rank) {
          return d.data.rank === 1 ? 20 : d.data.rank * 2 + 2;
        }
        if (!this.twoQuerys && d.data.rank) return d.data.rank === 1 ? 20 : d.data.rank * 2 + 2; // Highlight nodes in orange
         if(this.query) return 5;
         if (d.data.name.toLowerCase().includes("leaf")) return 5; // Default for leaves
        return 10; // Default color
  })
      .style("fill", (d: any) => {
        if(this.selected === 'Union') {
          if (d.data.similarity_score !== undefined && d.data.similarity_score2 !== undefined) {
            return d.data.similarity_score > d.data.similarity_score2 ? "#ff5733" : "blue";
          }
          if (d.data.similarity_score !== undefined) return "#ff5733";
          if (d.data.similarity_score2 !== undefined) return "blue";
        }
        if(this.selected === 'Intersection') {
          if(d.data.similarity_score2 > d.data.similarity_score && d.data.rank) return  "#ff5733";
          if(d.data.similarity_score2 < d.data.similarity_score && d.data.rank2) return "blue";
        }
        if (this.twoQuerys && this.selected === 'Query2' && d.data.similarity_score2 > 0) return "blue"; // Highlight nodes in orange
        if (this.twoQuerys && this.selected === 'Query1' && d.data.similarity_score > 0) return "#ff5733"; // Highlight nodes in orange
        if (!this.twoQuerys && d.data.similarity_score > 0) return "#ff5733"; // Highlight nodes in orange
        if (d.data.name.toLowerCase().includes("leaf")) return "#808080"; // Default for leaves
        return d.data.color || "#000000"; // Default color
      })
      .style("stroke", (d: any) => {
        if (this.twoQuerys && this.selected === 'Query2' && d.data.similarity_score2 > 0) return "#fff200"; // Highlight nodes in orange
        if (d.data.similarity_score > 0) return "#fff200"; // Yellow for similarity
        if (d.data.expanded) return "#FF7F50"; // Highlight expanded with sky blue stroke
        return "#000"; // Default
      })
      .style("stroke-width", (d: any) => {
        if (d.data.similarity_score2 > 0) return 3; // Highlight nodes in orange
        if (d.data.similarity_score > 0) return 3;
        if (d.data.expanded) return 4; // Thicker if expanded
        return 1.5;
      });
  

    node.append('text')
    .filter((d: any) =>
      !d.parent || d.data.similarity_score !== undefined || d.data.similarity_score2 !== undefined
    )
      .attr('dy', '0.31em')
      .attr('x', (d: any) => d.x < Math.PI === !d.children ? 8 : -8)
      .attr('text-anchor', (d: any) => d.x < Math.PI === !d.children ? 'start' : 'end')
      .attr('transform', (d: any) => d.x >= Math.PI ? 'rotate(90)' : null)
      .text((d: any) => {
            let name = d.data.name;
            if (name.toLowerCase().includes("leaf")) return ""; 
            return name.length > 6 ? name.substring(0, 6) + "..." : name;
          })
          // .style("font-size", "12px")
          .attr("font-size", (d: any) => d.data.rank ? "10px" : this.query ? "5px" :  "10px")
          .style("fill", (d: any) => d.data.similarity_score > 0 ? "#ff5733" : "#000"); // Highlight text in orange

      const selectedNode = nodes.find((d: any) => d.data.name === this.selectedName);
if (selectedNode) {
 
}

  }

  public expandAll(data: any) {
    if(this.isOn) {
  data.children.forEach((child: any) => {
    child.expanded = true;
    if (child.children) {
      this.expandAll(child);
    }
  });
  this.initChart();
} else {
  data.children.forEach((child: any) => {
    child.expanded = false;
    if (child.children) {
      this.expandAll(child);
    }
  });
  this.initChart();
}
  }



  private onNodeClick(d: any) {
    d.data.expanded = !d.data.expanded;
    this.update(d);
  }
  
  
}
