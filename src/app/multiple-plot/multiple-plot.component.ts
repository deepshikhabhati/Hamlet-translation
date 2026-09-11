import { Component, ElementRef, Input, OnChanges, ViewChild, AfterViewInit, SimpleChanges } from '@angular/core';
import * as d3 from 'd3';

interface Point {
  umap_x: number;
  umap_y: number;
  color?: string;
}

interface PlotData {
  key: string;
  name: string;
  value: Point[];
}

@Component({
  selector: 'app-scatter-plots',
  template: `<div #container></div>`,
  styles: [`
    div {
      display: flex;
      flex-wrap: wrap;
      gap: 20px;
    }
    svg {
      border: 1px solid #ccc;
      background: #fafafa;
    }
  `]
})
export class MultiplePlotComponent implements OnChanges, AfterViewInit {
  @Input() datasets: PlotData[][] = [];
  @ViewChild('container', { static: true }) container!: ElementRef<HTMLDivElement>;

  private width = 200;
  private height = 200;
  private margin = { top: 30, right: 30, bottom: 40, left: 40 };

  ngAfterViewInit() {
    this.drawPlots();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['datasets']) {
      this.drawPlots();
    }
  }

  private drawPlots() {
    const containerEl = this.container.nativeElement;
    containerEl.innerHTML = '';

    this.datasets.forEach((group, index) => {
      group.forEach((plot, innerIdx) => {
        const data = plot.value;

        const svg = d3.select(containerEl)
          .append('svg')
          .attr('width', this.width)
          .attr('height', this.height);

        const plotWidth = this.width - this.margin.left - this.margin.right;
        const plotHeight = this.height - this.margin.top - this.margin.bottom;

        const g = svg.append('g')
          .attr('transform', `translate(${this.margin.left},${this.margin.top})`);

        const xExtentRaw = d3.extent(data, d => d.umap_x) as [number, number];
        const yExtentRaw = d3.extent(data, d => d.umap_y) as [number, number];

        const xPadding = (xExtentRaw[1] - xExtentRaw[0]) * 0.05;
        const yPadding = (yExtentRaw[1] - yExtentRaw[0]) * 0.05;

        const xExtent: [number, number] = [xExtentRaw[0] - xPadding, xExtentRaw[1] + xPadding];
        const yExtent: [number, number] = [yExtentRaw[0] - yPadding, yExtentRaw[1] + yPadding];

        const xScale = d3.scaleLinear()
          .domain(xExtent)
          .range([0, plotWidth]);

        const yScale = d3.scaleLinear()
          .domain(yExtent)
          .range([plotHeight, 0]);

        g.append('rect')
          .attr('width', plotWidth)
          .attr('height', plotHeight)
          .attr('fill', 'none')
          .attr('stroke', '#666')
          .attr('stroke-width', 1);

        g.selectAll('circle')
          .data(data)
          .enter()
          .append('circle')
          .attr('cx', d => xScale(d.umap_x))
          .attr('cy', d => yScale(d.umap_y))
          .attr('r', 3)
          .attr('fill', d => d.color || '#555')
          .attr('opacity', 0.7);

        svg.append('text')
          .attr('x', this.width / 2)
          .attr('y', 20)
          .attr('text-anchor', 'middle')
          .attr('font-weight', 'bold')
          .text(plot.name || plot.key || `Plot ${index + 1}-${innerIdx + 1}`);
      });
    });
  }
}
