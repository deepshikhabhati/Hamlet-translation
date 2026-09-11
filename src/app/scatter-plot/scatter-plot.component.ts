import { Component, ElementRef, EventEmitter, Input, OnChanges, OnInit, Output, ViewChild } from '@angular/core';
import * as d3 from 'd3';

@Component({
  selector: 'app-scatter-plot',
  templateUrl: './scatter-plot.component.html',
  styleUrls: ['./scatter-plot.component.css']
})
export class ScatterPlotComponent implements OnInit, OnChanges {
  @Input() data: any[] = [];
  @Input() name: any = '';
  @Output() pointClicked = new EventEmitter<any>();
  @ViewChild('chart', { static: true }) chartContainer!: ElementRef;
  @Input() colorMap: { [query: string]: string } = {};
  @Output() minMaxemit = new EventEmitter<any>();
  private svg: any;
  private width = 600;
  private height = 400;
  private margin = { top: 20, right: 20, bottom: 20, left: 20 };
  minScore: number = 0;
maxScore: number = 1;
dragTarget: 'min' | 'max' | null = null;
  ngOnInit(): void {
    this.createChart();
  }

  ngOnChanges(): void {
    if (this.data.length) {
      this.createChart();
    }
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

  createChart(): void {
    d3.select(this.chartContainer.nativeElement).select('svg').remove();
  
    const element = this.chartContainer.nativeElement;
    const svg = d3.select(element)
      .append('svg')
      .attr('width', this.width)
      .attr('height', this.height);
  
    const xExtent = d3.extent(this.data, d => d.umap_x) as [number, number];
    const yExtent = d3.extent(this.data, d => d.umap_y) as [number, number];
  
    const xScale = d3.scaleLinear()
      .domain(xExtent)
      .range([this.margin.left, this.width - this.margin.right]);
  
    const yScale = d3.scaleLinear()
      .domain(yExtent)
      .range([this.height - this.margin.bottom, this.margin.top]);
  
    // Group that holds the scatter nodes only
    const plotGroup = svg.append('g')
      .attr('class', 'plot-group');
  
    // Add nodes (scatter circles)
    const points = plotGroup.selectAll('circle')
      .data(this.data)
      .enter()
      .append('circle')
      .attr('cx', d => xScale(d.umap_x))
      .attr('cy', d => yScale(d.umap_y))
      .attr('r', 7)
      .attr('fill', d => d.color || '#000')
      .attr('stroke', 'black')
      .on('click', (event, d) => {
        this.pointClicked.emit(d);
      });

  
    // Zoom/pan behavior only affects plotGroup
  
  }
  
}
