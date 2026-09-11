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
import { versionLabels } from '../../services/hamlet-data.service';

@Component({
  selector: 'app-ha-dataset-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dataset-dashboard.component.html',
  styleUrls: ['./dataset-dashboard.component.scss'],
})
export class DatasetDashboardComponent implements OnChanges, AfterViewInit {
  @ViewChild('enToTransChart', { static: true }) enToTransChart!: ElementRef;
  @ViewChild('bestTransChart', { static: true }) bestTransChart!: ElementRef;
  @ViewChild('dimScoresChart', { static: true }) dimScoresChart!: ElementRef;

  @Input() summary: any = null;

  private initialized = false;
  readonly versionLabels = versionLabels;

  ngAfterViewInit(): void {
    this.initialized = true;
    this.drawAll();
  }

  ngOnChanges(_changes: SimpleChanges): void {
    if (this.initialized) {
      this.drawAll();
    }
  }

  private drawAll(): void {
    if (!this.summary) return;
    this.drawEnToTranslation();
    this.drawBestTranslationCounts();
    this.drawDimensionScores();
  }

  private drawEnToTranslation(): void {
    const el = this.enToTransChart.nativeElement;
    d3.select(el).selectAll('*').remove();

    const data = Object.entries(this.summary.english_to_translation_average ?? {}).map(
      ([key, value]) => ({
        label: versionLabels[key] ?? key,
        value: value as number,
      })
    );

    if (!data.length) return;

    const width = el.clientWidth || 400;
    const height = 280;
    const margin = { top: 20, right: 20, bottom: 50, left: 50 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const svg = d3
      .select(el)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand().domain(data.map((d) => d.label)).range([0, innerW]).padding(0.35);
    const y = d3.scaleLinear().domain([0, 100]).nice().range([innerH, 0]);

    const colors = ['#1e3a8a', '#2563eb', '#0891b2'];

    svg.append('g').attr('transform', `translate(0,${innerH})`).call(d3.axisBottom(x))
      .selectAll('text').attr('font-size', '10px').attr('transform', 'rotate(-15)').style('text-anchor', 'end');

    svg.append('g').call(d3.axisLeft(y).ticks(5));

    svg.selectAll('.bar')
      .data(data)
      .enter()
      .append('rect')
      .attr('x', (d) => x(d.label)!)
      .attr('y', (d) => y(d.value))
      .attr('width', x.bandwidth())
      .attr('height', (d) => innerH - y(d.value))
      .attr('fill', (_d, i) => colors[i % colors.length])
      .attr('rx', 4);

    svg.selectAll('.bar-label')
      .data(data)
      .enter()
      .append('text')
      .attr('x', (d) => x(d.label)! + x.bandwidth() / 2)
      .attr('y', (d) => y(d.value) - 6)
      .attr('text-anchor', 'middle')
      .attr('font-size', '11px')
      .attr('font-weight', '700')
      .attr('fill', '#334155')
      .text((d) => d.value.toFixed(1));
  }

  private drawBestTranslationCounts(): void {
    const el = this.bestTransChart.nativeElement;
    d3.select(el).selectAll('*').remove();

    const data = Object.entries(this.summary.best_translation_counts ?? {}).map(
      ([key, value]) => ({
        label: versionLabels[key] ?? key,
        value: value as number,
      })
    );

    if (!data.length) return;

    const width = el.clientWidth || 400;
    const height = 280;
    const margin = { top: 20, right: 20, bottom: 50, left: 50 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const svg = d3
      .select(el)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand().domain(data.map((d) => d.label)).range([0, innerW]).padding(0.35);
    const y = d3.scaleLinear().domain([0, d3.max(data, (d) => d.value)! + 2]).nice().range([innerH, 0]);

    const colors = ['#059669', '#d97706', '#7c3aed'];

    svg.append('g').attr('transform', `translate(0,${innerH})`).call(d3.axisBottom(x))
      .selectAll('text').attr('font-size', '10px').attr('transform', 'rotate(-15)').style('text-anchor', 'end');

    svg.append('g').call(d3.axisLeft(y).ticks(5));

    svg.selectAll('.bar')
      .data(data)
      .enter()
      .append('rect')
      .attr('x', (d) => x(d.label)!)
      .attr('y', (d) => y(d.value))
      .attr('width', x.bandwidth())
      .attr('height', (d) => innerH - y(d.value))
      .attr('fill', (_d, i) => colors[i % colors.length])
      .attr('rx', 4);

    svg.selectAll('.bar-label')
      .data(data)
      .enter()
      .append('text')
      .attr('x', (d) => x(d.label)! + x.bandwidth() / 2)
      .attr('y', (d) => y(d.value) - 6)
      .attr('text-anchor', 'middle')
      .attr('font-size', '12px')
      .attr('font-weight', '700')
      .attr('fill', '#334155')
      .text((d) => String(d.value));
  }

  private drawDimensionScores(): void {
    const el = this.dimScoresChart.nativeElement;
    d3.select(el).selectAll('*').remove();

    const dimData = this.summary.average_scores_by_dimension ?? {};
    const data = Object.entries(dimData)
      .map(([key, value]) => ({
        label: key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        value: value as number,
      }))
      .sort((a, b) => a.value - b.value);

    if (!data.length) return;

    const width = el.clientWidth || 500;
    const height = Math.max(320, data.length * 36 + 60);
    const margin = { top: 20, right: 40, bottom: 30, left: 180 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const svg = d3
      .select(el)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const y = d3.scaleBand().domain(data.map((d) => d.label)).range([0, innerH]).padding(0.25);
    const x = d3.scaleLinear().domain([0, 100]).nice().range([0, innerW]);

    svg.append('g').call(d3.axisLeft(y)).selectAll('text').attr('font-size', '11px');
    svg.append('g').attr('transform', `translate(0,${innerH})`).call(d3.axisBottom(x).ticks(5));

    const colorScale = d3.scaleLinear<string>().domain([40, 60, 75, 90]).range(['#dc2626', '#d97706', '#2563eb', '#059669']);

    svg.selectAll('.hbar')
      .data(data)
      .enter()
      .append('rect')
      .attr('y', (d) => y(d.label)!)
      .attr('x', 0)
      .attr('height', y.bandwidth())
      .attr('width', (d) => x(d.value))
      .attr('fill', (d) => colorScale(d.value))
      .attr('rx', 3);

    svg.selectAll('.hbar-label')
      .data(data)
      .enter()
      .append('text')
      .attr('y', (d) => y(d.label)! + y.bandwidth() / 2)
      .attr('x', (d) => x(d.value) + 6)
      .attr('dy', '0.35em')
      .attr('font-size', '11px')
      .attr('font-weight', '700')
      .attr('fill', '#334155')
      .text((d) => d.value.toFixed(1));
  }
}
