// umap-plot.component.ts

import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import * as d3 from 'd3';

@Component({
  selector: 'app-umap-plot',
  templateUrl: './umap-plot.component.html',
  styleUrls: ['./umap-plot.component.css']
})
export class UmapPlotComponent implements  OnChanges {
  @Input() data: any[] = [];
  @Input() selected: any = 'query1';
  @Input() type: any = 'query1';
  
  @Input() minMaxData: any = "";
  @Input() rank: any = 4947;
  @Input() selectedMode: any = 'dense';
  @Output() minMaxemit = new EventEmitter<any>();
  @Output() nodeClicked = new EventEmitter<any>();
  minScore: number = 0;
maxScore: number = 1;
dragTarget: 'min' | 'max' | null = null;

startDrag(type: 'min' | 'max', event: MouseEvent) {
  this.dragTarget = type;
}

stopDrag() {
  this.dragTarget = null;
}

onMouseMove(event: MouseEvent) {
  if (!this.dragTarget) return;

  const container = (event.target as HTMLElement).closest('.slider-container') as HTMLElement;
  if (!container) return;

  const rect = container.getBoundingClientRect();
  const percent = (event.clientX - rect.left) / rect.width;
  const clamped = Math.max(0, Math.min(1, percent));

  if (this.dragTarget === 'min') {
    this.minScore = Math.min(clamped, this.maxScore);
  } else if (this.dragTarget === 'max') {
    this.maxScore = Math.max(clamped, this.minScore);
  }

  this.minMaxemit.emit({minScore: this.minScore,maxScore: this.maxScore,})
  this.createChart();
}
  ngOnChanges(changes: SimpleChanges): void {

    if(this.minMaxData) {
      this.minScore = this.minMaxData.minScore
      this.maxScore = this.minMaxData.maxScore
    }
    if(this.data.length) {
     
      this.createChart();
    }
  }

  public createChart(): void {
    d3.select('#umapChart').selectAll('*').remove();
    const width = 600;   // Was 600
    const height = 300;   // Was 400
    const margin = 50;    // Slightly increased
    const svg = d3.select('#umapChart')
      .append('svg')
      .attr('width', width)
      .attr('height', height);

      const xExtent = d3.extent(this.data, d => d.umap_x) as [number, number];
      const yExtent = d3.extent(this.data, d => d.umap_y) as [number, number];
      
      // Add some padding to spread out points more
      const xPadding = (xExtent[1] - xExtent[0]) * 0.1;
      const yPadding = (yExtent[1] - yExtent[0]) * 0.1;
      
      const xScale = d3.scaleLinear()
        .domain([xExtent[0] - xPadding, xExtent[1] + xPadding])
        .range([margin, width - margin]);
      
      const yScale = d3.scaleLinear()
        .domain([yExtent[0] - yPadding, yExtent[1] + yPadding])
        .range([height - margin, margin]);
      
        const maxScore = d3.max(this.data, d => d.score ?? 0) || 1;
        const colorScale = d3.scaleLinear<string>()
          .domain([0, maxScore])
          .range(["#cce5ff", "#004080"]);  // light blue → deep blue

          const colorScaleInter = d3.scaleLinear<string>()
  .domain([0, maxScore])
  .range(["#d4edda", "#155724"]);  // light green → deep green

          const colorScaleRed = d3.scaleLinear<string>()
  .domain([0, maxScore])
  .range(["#ffcccc", "#cc0000"])  // light red → deep red
  .interpolate(d3.interpolateRgb); // Optional for smooth blending

  let filteredData = [];

  if (this.selected === "Union") {
    // Top N from query1
    const topQuery1 = [...this.data]
      .map(d => {
        d.score = this.selectedMode === 'dense' ? d.score_dense :
                  this.selectedMode === 'sparse' ? d.score_sparse :
                  this.selectedMode === 'fulltext' ? d.score_fulltext :
                  d.rerank_score1;
        return d;
      })
      .filter(d => d.score >= this.minScore && d.score <= this.maxScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, this.rank);
  
    // Top N from query2
    const topQuery2 = [...this.data]
      .map(d => {
        d.score2 = this.selectedMode === 'dense' ? d.score_dense2 :
                   this.selectedMode === 'sparse' ? d.score_sparse2 :
                   this.selectedMode === 'fulltext' ? d.score_fulltext2 :
                   d.rerank_score2;
        return d;
      })
      .filter(d => d.score2 >= this.minScore && d.score2 <= this.maxScore)
      .sort((a, b) => b.score2 - a.score2)
      .slice(0, this.rank);
  
    // Merge without duplicates (based on id or doc_id if available)
    const seen = new Set();
    filteredData = [...topQuery1, ...topQuery2].filter(d => {
      const key = d.title || d.doc_id || d.path; // adjust based on your unique identifier
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }) // keep top N total

    console.log(topQuery1,topQuery2,filteredData,seen)
  } else if (this.selected === "Intersection") {
    const topQuery1 = [...this.data]
      .map(d => {
        d.score = this.selectedMode === 'dense' ? d.score_dense :
                  this.selectedMode === 'sparse' ? d.score_sparse :
                  this.selectedMode === 'fulltext' ? d.score_fulltext :
                  d.rerank_score1;
        return d;
      })
      .filter(d => d.score >= this.minScore && d.score <= this.maxScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, this.rank);
  
    const topQuery2 = [...this.data]
      .map(d => {
        d.score2 = this.selectedMode === 'dense' ? d.score_dense2 :
                   this.selectedMode === 'sparse' ? d.score_sparse2 :
                   this.selectedMode === 'fulltext' ? d.score_fulltext2 :
                   d.rerank_score2;
        return d;
      })
      .filter(d => d.score2 >= this.minScore && d.score2 <= this.maxScore)
      .sort((a, b) => b.score2 - a.score2)
      .slice(0, this.rank);
  
    const ids1 = new Set(topQuery1.map(d => d.title || d.doc_id || d.path));
    const idKey = (d: any) => d.title || d.doc_id || d.path;
  
    filteredData = topQuery2.filter(d => ids1.has(idKey(d)))
                            .slice(0, this.rank);
                            console.log(topQuery1,topQuery2,filteredData)
  } else {
    // Default processing for other modes
    filteredData = this.data
      .map(d => {
        d.score = this.selectedMode === 'dense' ? d.score_dense :
                  this.selectedMode === 'sparse' ? d.score_sparse :
                  this.selectedMode === 'fulltext' ? d.score_fulltext :
                  d.rerank_score1;
        d.score2 = this.selectedMode === 'dense' ? d.score_dense2 :
                   this.selectedMode === 'sparse' ? d.score_sparse2 :
                   this.selectedMode === 'fulltext' ? d.score_fulltext2 :
                   d.rerank_score2;
        return d;
      })
      .filter(d => {
        if (this.selected === "query1") {
          return d.score >= this.minScore && d.score <= this.maxScore;
        } else if (this.selected === "query2") {
          return d.score2 >= this.minScore && d.score2 <= this.maxScore;
        }  else if (this.selected === "FzIntersection") {
          const score1 = d.score_dense;
          const score2 = d.score_dense2;
          return score1 >= this.minScore && score1 <= this.maxScore &&
                 score2 >= this.minScore && score2 <= this.maxScore;
        }
        return true;
      })
      .sort((a, b) => {
        if (this.selected === "query1") return b.score - a.score;
        if (this.selected === "query2") return b.score2 - a.score2;
        if (this.selected === "FzIntersection") return Math.min(b.score, b.score2) - Math.min(a.score, a.score2);
        return 0;
      })
      .slice(0, this.rank);
      console.log(filteredData)
  }

  
  // Render circles using filteredData
  svg.selectAll("circle")
    .data(filteredData)
    .enter()
      .append("circle")
      .attr("cx", d => xScale(d.umap_x))
      .attr("cy", d => yScale(d.umap_y))
      .attr("r", 7)
      .style("stroke", "#333")         // Border color
      .style("stroke-width", 1.5)   
      .style("fill", d => {
        d.score = this.selectedMode === 'dense' ? d.score_dense : this.selectedMode === 'sparse' ? d.score_sparse : this.selectedMode === 'fulltext' ? d.score_fulltext : d.rerank_score1
        d.score2 = this.selectedMode === 'dense' ? d.score_dense2 : this.selectedMode === 'sparse' ? d.score_sparse2 : this.selectedMode === 'fulltext' ? d.score_fulltext2 : d.rerank_score2
        if (d.score !== undefined || d.score2 !== undefined) {

          if (this.selected === "query1") {
            return colorScale(d.score);
          } else if (this.selected === "query2") {
            return colorScaleRed(d.score2);
          } else if (this.selected === "Union") {
            return d.score > d.score2
              ? colorScale(d.score)
              : colorScaleRed(d.score2);
          } else if (this.selected === "Intersection") {
            return d.score === d.score2
              ? colorScaleInter(d.score)
              : colorScaleInter(d.score2);
          }  else if (this.selected === "FzIntersection") {
            return d.score === d.score2
              ? colorScaleInter(d.score)
              : colorScaleInter(d.score);
          }
        }
        return d.cluster;  // fallback color
      })
      .on("click", (event: any, d: any) => {
        // d.children = d.children ? null : d._children;
    
        console.log(d)
        this.nodeClicked.emit(d)

      })
      .style("opacity", 1);

      const legend = svg.append("g")
  .attr("transform", `translate(${width - margin - 100}, ${margin})`);
  const uniqueClusters = Array.from(new Set(this.data.map(d => d.cluster)));

  const uniqueClustersWithLabels = Array.from(
    new Map(this.data.map(d => [d.cluster, d.label])).entries()
  ).map(([cluster, label]) => ({ cluster, label }));
  uniqueClustersWithLabels.forEach((color: any) => {
  const legendRow = legend.append("g")
    .attr("transform", `translate(0, ${color.label * 25})`);

  const news: any = ['World','Sci/Tech','Business','Sports']  

  const tsvg: any = ['Techniques','3D Simulation','Virtual Reality','Data Processing']

  legendRow.append("rect")
    .attr("width", 20)
    .attr("height", 20)
    .attr("fill", color.cluster)
    .attr("stroke", "#333");

  legendRow.append("text")
    .attr("x", 30)
    .attr("y", 15)
    .text(this.type ==='news' ? news[color.label] : tsvg[color.label])
    .attr("fill", "#333")
    .style("font-size", "14px");
});
  }
}
