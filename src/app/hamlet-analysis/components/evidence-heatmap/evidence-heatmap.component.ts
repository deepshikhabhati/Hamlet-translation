import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as d3 from 'd3';
import {
  HamletDataService,
  PHRASE_DIMENSION_KEYS,
  PHRASE_DIMENSION_LABELS,
} from '../../services/hamlet-data.service';

@Component({
  selector: 'app-ha-evidence-heatmap',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './evidence-heatmap.component.html',
  styleUrls: ['./evidence-heatmap.component.scss'],
})
export class EvidenceHeatmapComponent implements OnChanges, AfterViewInit {
  @Input() phraseData: any = null;
  @Input() comparisonPassages: any[] = [];

  @Output() cellSelect = new EventEmitter<{ passageId: string; dimension: string }>();

  @ViewChild('chart') chartRef?: ElementRef<HTMLDivElement>;

  readonly dimKeys = PHRASE_DIMENSION_KEYS;
  readonly dimLabels = PHRASE_DIMENSION_LABELS;

  filterAct = '';
  filterScene = '';
  filterSpeaker = '';
  filterFeature = '';
  filterDimension = '';
  scoreMin: number | null = null;
  scoreMax: number | null = null;

  acts: number[] = [];
  scenes: number[] = [];
  speakers: string[] = [];
  features: string[] = [];

  private ready = false;

  constructor(private dataService: HamletDataService) {}

  ngAfterViewInit(): void {
    this.ready = true;
    this.draw();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['phraseData'] || changes['comparisonPassages']) {
      this.buildFilterOptions();
      if (this.ready) {
        this.draw();
      }
    }
  }

  buildFilterOptions(): void {
    const passages = this.comparisonPassages || [];
    this.acts = this.dataService.getUniqueActs(passages);
    this.scenes = this.dataService.getUniqueScenes(passages);
    this.speakers = [...new Set(passages.map((p) => p.speaker).filter(Boolean))].sort();
    this.features = this.dataService.getUniqueFeatures(passages);
  }

  onFilterChange(): void {
    this.draw();
  }

  private passageMeta(passageId: string): any {
    return this.comparisonPassages.find((p) => p.passage_id === passageId) || null;
  }

  private filteredCells(): Array<{
    passageId: string;
    dimension: string;
    score: number | null;
    meta: any;
  }> {
    const cells = this.phraseData?.overview_heatmap?.cells ?? [];
    const dims = this.filterDimension ? [this.filterDimension] : this.dimKeys;
    const rows: Array<{
      passageId: string;
      dimension: string;
      score: number | null;
      meta: any;
    }> = [];

    for (const cell of cells) {
      const meta = this.passageMeta(cell.passage_id);
      if (!meta) {
        continue;
      }
      if (this.filterAct && String(meta.act) !== String(this.filterAct)) continue;
      if (this.filterScene && String(meta.scene) !== String(this.filterScene)) continue;
      if (this.filterSpeaker && meta.speaker !== this.filterSpeaker) continue;
      if (this.filterFeature && meta.primary_research_feature !== this.filterFeature) continue;

      for (const dim of dims) {
        const score =
          cell.scores?.[dim] === null || cell.scores?.[dim] === undefined
            ? null
            : Number(cell.scores[dim]);
        if (this.scoreMin != null && (score == null || score < this.scoreMin)) continue;
        if (this.scoreMax != null && (score == null || score > this.scoreMax)) continue;
        rows.push({ passageId: cell.passage_id, dimension: dim, score, meta });
      }
    }
    return rows;
  }

  draw(): void {
    const el = this.chartRef?.nativeElement;
    if (!el) {
      return;
    }
    d3.select(el).selectAll('*').remove();

    const data = this.filteredCells();
    if (!data.length) {
      el.innerHTML =
        '<div class="heatmap-empty">No heatmap cells match the current filters.</div>';
      return;
    }

    const passageIds = [...new Set(data.map((d) => d.passageId))];
    const dimensions = this.filterDimension ? [this.filterDimension] : this.dimKeys;

    const cellW = 72;
    const cellH = 28;
    const margin = { top: 48, right: 16, bottom: 16, left: 90 };
    const width = margin.left + margin.right + dimensions.length * cellW;
    const height = margin.top + margin.bottom + passageIds.length * cellH;

    const svg = d3
      .select(el)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .attr('role', 'img')
      .attr('aria-label', 'Evidence overview heatmap');

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3
      .scaleBand()
      .domain(dimensions)
      .range([0, dimensions.length * cellW])
      .padding(0.08);
    const y = d3
      .scaleBand()
      .domain(passageIds)
      .range([0, passageIds.length * cellH])
      .padding(0.08);

    const color = d3
      .scaleLinear<string>()
      .domain([40, 70, 100])
      .range(['#fecaca', '#fde68a', '#86efac'])
      .clamp(true);

    // column headers
    g.selectAll('.col-label')
      .data(dimensions)
      .enter()
      .append('text')
      .attr('class', 'col-label')
      .attr('x', (d) => (x(d) || 0) + x.bandwidth() / 2)
      .attr('y', -12)
      .attr('text-anchor', 'middle')
      .attr('font-size', 10)
      .attr('fill', '#334155')
      .text((d) => this.dimLabels[d] || d);

    // row labels
    g.selectAll('.row-label')
      .data(passageIds)
      .enter()
      .append('text')
      .attr('class', 'row-label')
      .attr('x', -8)
      .attr('y', (d) => (y(d) || 0) + y.bandwidth() / 2)
      .attr('text-anchor', 'end')
      .attr('dominant-baseline', 'middle')
      .attr('font-size', 11)
      .attr('fill', '#1e3a8a')
      .attr('font-weight', 600)
      .text((d) => d);

    const tooltip = d3
      .select(el)
      .append('div')
      .attr('class', 'heatmap-tooltip')
      .style('opacity', 0);

    const self = this;
    g.selectAll('rect.cell')
      .data(data)
      .enter()
      .append('rect')
      .attr('class', 'cell')
      .attr('x', (d) => x(d.dimension) || 0)
      .attr('y', (d) => y(d.passageId) || 0)
      .attr('width', x.bandwidth())
      .attr('height', y.bandwidth())
      .attr('rx', 4)
      .attr('fill', (d) => (d.score == null ? '#e2e8f0' : color(d.score)))
      .attr('stroke', '#fff')
      .style('cursor', 'pointer')
      .on('mouseenter', function (event, d) {
        d3.select(this).attr('stroke', '#1e3a8a');
        tooltip
          .style('opacity', 1)
          .html(
            `<strong>${d.passageId}</strong><br/>
            Act ${d.meta.act} · Scene ${d.meta.scene}<br/>
            Speaker: ${d.meta.speaker || '—'}<br/>
            Dimension: ${self.dimLabels[d.dimension] || d.dimension}<br/>
            Score: ${d.score == null ? 'N/A' : self.dataService.formatScore(d.score)}<br/>
            Feature: ${d.meta.primary_research_feature || '—'}`
          )
          .style('left', `${event.offsetX + 12}px`)
          .style('top', `${event.offsetY + 12}px`);
      })
      .on('mousemove', function (event) {
        tooltip
          .style('left', `${event.offsetX + 12}px`)
          .style('top', `${event.offsetY + 12}px`);
      })
      .on('mouseleave', function () {
        d3.select(this).attr('stroke', '#fff');
        tooltip.style('opacity', 0);
      })
      .on('click', (_event, d) => {
        this.cellSelect.emit({ passageId: d.passageId, dimension: d.dimension });
      });

    g.selectAll('text.cell-val')
      .data(data)
      .enter()
      .append('text')
      .attr('class', 'cell-val')
      .attr('x', (d) => (x(d.dimension) || 0) + x.bandwidth() / 2)
      .attr('y', (d) => (y(d.passageId) || 0) + y.bandwidth() / 2)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('font-size', 10)
      .attr('font-weight', 700)
      .attr('fill', '#0f172a')
      .attr('pointer-events', 'none')
      .text((d) => (d.score == null ? 'N/A' : this.dataService.formatScore(d.score)));
  }
}
