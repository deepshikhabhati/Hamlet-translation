import { Component, ElementRef, Input, OnChanges, OnInit, ViewChild } from '@angular/core';
import * as d3 from 'd3';
@Component({
  selector: 'app-common-bar',
  templateUrl: './common-bar.component.html',
  styleUrls: ['./common-bar.component.css']
})
export class CommonBarComponent implements OnChanges {
  @ViewChild('barChart', { static: true }) private chartContainer!: ElementRef;
  @Input() data: { label: string; value: number }[] = [];

  ngOnChanges() {

    if(this.data.length){

    this.createBarChart();
    }
  }

  private createBarChart(): void {
    const element = this.chartContainer.nativeElement;
    const margin = { top: 20, right: 30, bottom: 40, left: 60 };
    const width = 400 - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;

    const svg = d3
      .select(element)
      .append('svg')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3
      .scaleBand()
      .domain(this.data.map((d: any) => d.label))
      .range([0, width])
      .padding(0.3);

    const y = d3
      .scaleLinear()
      .domain([0, d3.max(this.data, (d: any) => d.value)!])
      .nice()
      .range([height, 0]);

    svg
      .append('g')
      .attr('transform', `translate(0, ${height})`)
      .call(d3.axisBottom(x));

    svg.append('g').call(d3.axisLeft(y));

    svg
      .selectAll('.bar')
      .data(this.data)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', (d: any) => x(d.label)!)
      .attr('y', (d: any) => y(d.value))
      .attr('width', x.bandwidth())
      .attr('height', (d: any) => height - y(d.value))
      .attr('fill', (d, i) => ['lightgreen','red'][i]);
  }
}
