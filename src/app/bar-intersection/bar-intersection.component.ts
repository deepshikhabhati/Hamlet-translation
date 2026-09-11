import { Component, AfterViewInit, ElementRef, ViewChild, Input, OnChanges } from '@angular/core';
import * as d3 from 'd3';

@Component({
  selector: 'app-bar-intersection',
  template: `<div #chart></div>`,
  styleUrls: ['./bar-intersection.component.css']
})
export class BarIntersectionComponent implements OnChanges {
  @ViewChild('chart') private chartContainer!: ElementRef;
  @Input() data: any = '';

  @Input() intersectionValue: any = ''; // Input JSON data
  // private data = [
  //   { label: 'Q1', value: 61.43 },
  //   { label: 'Q2', value: 61.47 },
  //   { label: 'Union', value: 61.47 }
  // ];
  // private intersectionValue = 61.43;

  ngOnChanges(): void {
    console.log(this.data)
    if(this.data.length){
      d3.select(this.chartContainer.nativeElement).selectAll('*').remove();
      this.createChart();
    }
  }

  private createChart(): void {
    const element = this.chartContainer.nativeElement;
    const margin = { top: 20, right: 30, bottom: 40, left: 40 };
    const width = 300 - margin.left - margin.right;
    const height = 200 - margin.top - margin.bottom;

    const svg = d3.select(element)
      .append('svg')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Scales
    const x: any = d3.scaleBand()
      .domain(this.data.map((d: any) => d.label))
      .range([0, width])
      .padding(0.4);

      const minY: any = d3.min(this.data, (d: any) => d.value)!;
      const maxY: any = d3.max(this.data, (d: any) => d.value)!;
      
      const y: any = d3.scaleLinear()
        .domain([Math.floor(minY), Math.ceil(maxY)])
        .range([height, 0])
        .nice(); 
    // X axis
    svg.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x));

    // Y axis
    svg.append('g')
      .call(d3.axisLeft(y));

    // Bars
    svg.selectAll('.bar')
      .data(this.data)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', (d: any) => x(d.label)!)
      .attr('y', (d: any) => y(d.value))
      .attr('width', x.bandwidth())
      .attr('height', (d: any) => height - y(d.value))
      .attr('fill', (d, i) => ['#ff5733','blue' ,'lightgreen'][i]);

    // Intersection line (only between Q1 and Q2)
    const intersectionPoints = this.data.slice(0, 2).map((d: any) => ({
      x: x(d.label)! + x.bandwidth() / 2,
      y: y(this.intersectionValue)
    }));

    svg.append('path')
      .datum(intersectionPoints)
      .attr('fill', 'none')
      .attr('stroke', 'red')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '5,5')
      .attr('d', d3.line<any>()
        .x(d => d.x)
        .y(d => d.y)
      );

    // Intersection points
    svg.selectAll('.circle-point')
      .data(intersectionPoints)
      .enter()
      .append('circle')
      .attr('cx', (d: any) => d.x)
      .attr('cy', (d: any) => d.y)
      .attr('r', 4)
      .attr('fill', 'red');
  }
}
