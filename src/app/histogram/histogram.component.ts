import { Component, ElementRef, EventEmitter, Input, OnChanges, Output, ViewChild } from '@angular/core';
import * as d3 from 'd3';

@Component({
  selector: 'app-histogram',
  template: `<div #histogram></div>`,
  styleUrls: ['./histogram.component.css']
})
export class HistogramComponent implements OnChanges {
  @Input() items: any[] = [];
  @Output() barClicked = new EventEmitter<{ from: number, to: number }>();
  @ViewChild('histogram', { static: true }) histogramContainer!: ElementRef;

  private selectedBin: [number, number] | null = null;

  ngOnChanges(): void {
    if (this.items && this.items.length) {
      this.selectedBin = null
      this.drawHistogram();
    }
  }

  drawHistogram(): void {
    const element = this.histogramContainer.nativeElement;
    d3.select(element).selectAll('*').remove(); // clear previous

    const margin = { top: 10, right: 20, bottom: 20, left: 30 };
    const width = 300 - margin.left - margin.right;
    const height = 150 - margin.top - margin.bottom;

    const svg = d3.select(element)
      .append('svg')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const data = this.items.map(d => d.score_dense);

    const x = d3.scaleLinear()
      .domain(d3.extent(data) as [number, number])
      .nice()
      .range([0, width]);

    const bins = d3.bin()
      .domain(x.domain() as [number, number])
      .thresholds(10)(data);

    const y = d3.scaleLinear()
      .domain([0, d3.max(bins, d => d.length) as number])
      .nice()
      .range([height, 0]);

    svg.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x).ticks(5));

    svg.append('g')
      .call(d3.axisLeft(y).ticks(4));

    svg.selectAll('rect')
      .data(bins)
      .enter()
      .append('rect')
      .attr('x', d => x(d.x0!))
      .attr('y', d => y(d.length))
      .attr('width', d => Math.max(0, x(d.x1!) - x(d.x0!) - 1))
      .attr('height', d => height - y(d.length))
      .attr('fill', d => 
        this.selectedBin && d.x0 === this.selectedBin[0] && d.x1 === this.selectedBin[1]
          ? '#ff7f0e' // highlighted color
          : '#69b3a2'
      )
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        this.selectedBin = [d.x0!, d.x1!];
        const filteredItems: any = this.items.filter(item => 
          item.score_dense >= d.x0! && item.score_dense < d.x1!
        );
      
        console.log('Filtered items:', filteredItems);
      
        this.barClicked.emit(filteredItems);
        this.drawHistogram(); // redraw to apply highlight
      });
  }
}
