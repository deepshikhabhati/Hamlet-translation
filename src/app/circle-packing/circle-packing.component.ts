import {
  Component,
  ElementRef,
  Input,
  OnChanges,
  SimpleChanges,
  ViewChild,
  AfterViewInit
} from '@angular/core';
import * as d3 from 'd3';

@Component({
  selector: 'app-circle-packing',
  template: `<div #chartContainer></div>`,
  styleUrls: ['./circle-packing.component.css']
})
export class CirclePackingComponent implements OnChanges, AfterViewInit {
  @Input() data: any;
  @ViewChild('chartContainer') chartContainer!: ElementRef;

  private diameter = 600;

  ngAfterViewInit() {
    if (this.data) {
      this.drawChart();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data'] && this.chartContainer?.nativeElement) {
      this.clearChart();
      this.drawChart();
    }
  }

  private clearChart() {
    d3.select(this.chartContainer.nativeElement).selectAll('*').remove();
  }

  private drawChart() {
    const root = d3
    .hierarchy(this.data)
    .sum(d => (d.children ? 0 : 1))  // Treat leaf nodes as value = 1
    .sort((a, b) => b.value! - a.value!);
  
  const pack = d3.pack().size([this.diameter, this.diameter]).padding(3);
  pack(root);  // Applies layout: sets x, y, r
  
    const svg = d3.select(this.chartContainer.nativeElement)
      .append('svg')
      .attr('width', this.diameter)
      .attr('height', this.diameter)
      .attr('viewBox', `0 0 ${this.diameter} ${this.diameter}`)
      .style('font-family', 'sans-serif');

    const node = svg.selectAll('g')
      .data(root.descendants())
      .enter()
      .append('g')
      .attr('transform', d => `translate(${d.x},${d.y})`);

    node.append('circle')
      .attr('r', (d: any) => d.r)
      .attr('fill', (d: any) => d.children ? d.data.color : '#a2c4c9')
      .attr('stroke', '#555');

  //     node.append('text')
  // .attr('dy', '0.3em')
  // .style('text-anchor', 'middle')
  // .style('font-size', (d: any) => Math.min(12, d.r / 2)) // Adjust size for small circles
  // .text(d => d.data.name)
  // .style('pointer-events', 'none');

    node.append('text')
      .attr('dy', '0.3em')
      .style('text-anchor', 'middle')
      .style('font-size', (d: any) => d.r / 3)
      .text(d => d.children ? '' : d.data.name);
  }
}
