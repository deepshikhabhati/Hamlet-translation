import {
  Component,
  ElementRef,
  Input,
  OnChanges,
  SimpleChanges,
  ViewChild,
  AfterViewInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import * as d3 from 'd3';
import {
  DIMENSION_META,
  HamletDataService,
} from '../../services/hamlet-data.service';

@Component({
  selector: 'app-ha-radar-chart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './radar-chart.component.html',
  styleUrls: ['./radar-chart.component.scss'],
})
export class RadarChartComponent implements OnChanges, AfterViewInit {
  @ViewChild('chartContainer', { static: true }) chartContainer!: ElementRef;

  @Input() comparison: any = null;

  private initialized = false;

  constructor(private dataService: HamletDataService) {}

  ngAfterViewInit(): void {
    this.initialized = true;
    this.drawChart();
  }

  ngOnChanges(_changes: SimpleChanges): void {
    if (this.initialized) {
      this.drawChart();
    }
  }

  private drawChart(): void {
    const el = this.chartContainer.nativeElement;
    d3.select(el).selectAll('*').remove();

    const applicableDims = DIMENSION_META.filter((meta) =>
      this.dataService.isDimensionApplicable(this.comparison, meta.key)
    );

    if (!applicableDims.length) {
      d3.select(el)
        .append('div')
        .attr('class', 'radar-empty')
        .text('No applicable dimensions for radar chart.');
      return;
    }

    const width = el.clientWidth || 300;
    const height = 280;
    const margin = 40;
    const radius = Math.min(width, height) / 2 - margin;
    const centerX = width / 2;
    const centerY = height / 2;

    const data = applicableDims.map((meta) => ({
      axis: meta.label,
      value: this.dataService.getDimensionScore(this.comparison, meta.key) ?? 0,
    }));

    const angleSlice = (Math.PI * 2) / data.length;

    const svg = d3
      .select(el)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .append('g')
      .attr('transform', `translate(${centerX},${centerY})`);

    const rScale = d3.scaleLinear().domain([0, 100]).range([0, radius]);

    const gridLevels = [20, 40, 60, 80, 100];
    gridLevels.forEach((level) => {
      svg
        .append('circle')
        .attr('r', rScale(level))
        .attr('fill', 'none')
        .attr('stroke', '#e2e8f0')
        .attr('stroke-dasharray', level === 100 ? 'none' : '2,2');
    });

    const axisGrid = svg.selectAll('.axis-line').data(data).enter().append('g');

    axisGrid
      .append('line')
      .attr('x1', 0)
      .attr('y1', 0)
      .attr('x2', (_d, i) => rScale(100) * Math.cos(angleSlice * i - Math.PI / 2))
      .attr('y2', (_d, i) => rScale(100) * Math.sin(angleSlice * i - Math.PI / 2))
      .attr('stroke', '#cbd5e1')
      .attr('stroke-width', 1);

    axisGrid
      .append('text')
      .attr('class', 'axis-label')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr(
        'transform',
        (_d, i) => {
          const r = rScale(115);
          const x = r * Math.cos(angleSlice * i - Math.PI / 2);
          const y = r * Math.sin(angleSlice * i - Math.PI / 2);
          return `translate(${x},${y})`;
        }
      )
      .text((d) => d.axis.split(' ')[0])
      .attr('fill', '#64748b')
      .attr('font-size', '9px');

    const radarLine = d3
      .line<{ axis: string; value: number }>()
      .x((_d, i) => rScale(_d.value) * Math.cos(angleSlice * i - Math.PI / 2))
      .y((_d, i) => rScale(_d.value) * Math.sin(angleSlice * i - Math.PI / 2))
      .curve(d3.curveLinearClosed);

    svg
      .append('path')
      .datum(data)
      .attr('d', radarLine)
      .attr('fill', 'rgba(37, 99, 235, 0.2)')
      .attr('stroke', '#2563eb')
      .attr('stroke-width', 2);

    svg
      .selectAll('.radar-dot')
      .data(data)
      .enter()
      .append('circle')
      .attr('class', 'radar-dot')
      .attr('cx', (d, i) => rScale(d.value) * Math.cos(angleSlice * i - Math.PI / 2))
      .attr('cy', (d, i) => rScale(d.value) * Math.sin(angleSlice * i - Math.PI / 2))
      .attr('r', 4)
      .attr('fill', '#1e3a8a')
      .append('title')
      .text((d) => `${d.axis}: ${d.value}`);
  }
}
