import { Component, ElementRef, Input, OnChanges, ViewChild } from '@angular/core';
import * as d3 from 'd3';

@Component({
  selector: 'app-vertical-heatmap',
  template: `
    <div #heatmapContainer class="heatmap-container"></div>
    <div class="tooltip" #tooltip></div>
  `,
  styles: [`
    .heatmap-container {
      width: 100%;
      overflow-x: auto;
    }
    .tooltip {
      position: absolute;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 5px 10px;
      border-radius: 4px;
      font-size: 12px;
      pointer-events: none;
      visibility: hidden;
    }
    svg {
      display: block;
      margin: auto;
    }
  `]
})
export class VerticalHeatmapComponent implements OnChanges {
  @ViewChild('heatmapContainer', { static: true }) heatmapContainer!: ElementRef;
  @ViewChild('tooltip', { static: true }) tooltip!: ElementRef;
  @Input() data: any = [];

  ngOnChanges() {
    if (this.data.length) {
      this.createHeatmap();
    }
  }

  createHeatmap() {
    const element: any = this.heatmapContainer.nativeElement;
    element.innerHTML = ''; // Clear previous SVG
    const tooltip: any = this.tooltip.nativeElement;

    const margin: any = { top: 20, right: 30, bottom: 40, left: 150 };
    const cellHeight: any = 40; // Each row height
    const maxHeight: any = 400; // Max height per column before wrapping
    const numRowsPerColumn: any = Math.floor(maxHeight / cellHeight);
    const numColumns: any = Math.ceil(this.data.length / numRowsPerColumn);
    const columnWidth: any = 250;
    const totalWidth: any = columnWidth * numColumns;
    const totalHeight: any = Math.min(this.data.length * cellHeight, maxHeight);

    const svg: any = d3
      .select(element)
      .append('svg')
      .attr('width', totalWidth + margin.left + margin.right)
      .attr('height', totalHeight + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const minValue: any = d3.min(this.data, (d: any) => d.similarity);
    const maxValue: any = d3.max(this.data, (d: any) => d.similarity);

    const colorScale: any = (value: any) => {
      return value >= 0
        ? d3.scaleLinear<string>().domain([0, maxValue]).range(["#ffffff", "#ff0000"])(value)
        : d3.scaleLinear<string>().domain([minValue, 0]).range(["#0000ff", "#ffffff"])(value);
    };

    // Add heatmap rectangles
    svg
      .selectAll('rect')
      .data(this.data)
      .enter()
      .append('rect')
      .attr('x', (d: any, i: any) => {
        const colIndex: any = Math.floor(i / numRowsPerColumn);
        return colIndex * columnWidth + 100;
      })
      .attr('y', (d: any, i: any) => {
        const rowIndex: any = i % numRowsPerColumn;
        return rowIndex * cellHeight;
      })
      .attr('width', (d: any) => Math.abs(d.similarity) * 150)
      .attr('height', cellHeight - 5)
      .attr('fill', (d: any) => colorScale(d.similarity))
      .on('mouseover', (event: any, d: any) => {
        tooltip.style.visibility = 'visible';
        tooltip.innerHTML = `Similarity: ${d.similarity.toFixed(3)}`;
      })
      .on('mousemove', (event: any) => {
        tooltip.style.top = event.pageY + 10 + 'px';
        tooltip.style.left = event.pageX + 10 + 'px';
      })
      .on('mouseout', () => {
        tooltip.style.visibility = 'hidden';
      });

    // Add labels
    svg
      .selectAll('text')
      .data(this.data)
      .enter()
      .append('text')
      .attr('x', (d: any, i: any) => {
        const colIndex: any = Math.floor(i / numRowsPerColumn);
        return colIndex * columnWidth;
      })
      .attr('y', (d: any, i: any) => {
        const rowIndex: any = i % numRowsPerColumn;
        return rowIndex * cellHeight + cellHeight / 2;
      })
      .attr('alignment-baseline', 'middle')
      .attr('text-anchor', 'start')
      .attr('fill', '#000')
      .text((d: any) => d.key);
  }
}
