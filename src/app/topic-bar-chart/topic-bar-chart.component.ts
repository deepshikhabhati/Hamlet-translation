import { Input,Component, AfterViewInit, OnChanges, ViewChild, ElementRef,SimpleChanges } from '@angular/core';
import { Chart, registerables } from 'chart.js';


Chart.register(...registerables);

@Component({
  selector: 'app-topic-bar-chart',
  templateUrl: './topic-bar-chart.component.html'
})
export class TopicBarChartComponent implements AfterViewInit {
  chart: any;
  @Input() topicData: any[] = [];
  @Input() rawResults: any[] = [];

  @ViewChild('barChartCanvas') barChartCanvas!: ElementRef<HTMLCanvasElement>;


  ngAfterViewInit(): void {
    if (this.rawResults?.length) {
      this.renderChart();
    }
  }

  getRootPath(path: string): string {
    return path.split("/")[0];
  }

  groupScoresByPath(data: any[]) {
    const grouped: Record<string, { label: string, score: number }[]> = {};

    data.forEach(item => {
      const root = this.getRootPath(item.topic_path);
      const label = item.topic_path.split("/").slice(1).join(" / "); // optional sublabel
      const score = item.similarity_score2 ?? item.similarity_score ?? 0;

      if (!grouped[root]) grouped[root] = [];
      grouped[root].push({ label: label || root, score });
    });

    return grouped;
  }

  renderChart() {
    // 1. Group by top-level topic (root)
    const grouped: Record<string, { label: string, score: number }[]> = {};
    this.rawResults.forEach(item => {
      const root = this.getRootPath(item.topic_path);
      const label = item.topic_path.split('/').slice(1).join(' / ') || item.topic_path;
      const score = item.similarity_score2 ?? item.similarity_score ?? 0;

      if (!grouped[root]) grouped[root] = [];
      grouped[root].push({ label, score });
    });

    const groupKeys = Object.keys(grouped); // X-axis: ["Precursors", "Birth of AI", ...]
    const allLeafLabels = new Set<string>();

    // 2. Find all unique leaf labels
    Object.values(grouped).forEach(arr => arr.forEach(item => allLeafLabels.add(item.label)));

    const uniqueLabels = Array.from(allLeafLabels); // segment labels

    // 3. Build dataset per subtopic (segment), across all groups
    const datasets = uniqueLabels.map((leafLabel, idx) => {
      const data = groupKeys.map(group => {
        const match = grouped[group].find(x => x.label === leafLabel);
        return match?.score ?? 0;
      });

      return {
        label: leafLabel,
        data,
        backgroundColor: this.getColor(idx)
      };
    });

    // 4. Cleanup previous chart
    if (this.chart) this.chart.destroy();

    // 5. Create Chart
    this.chart = new Chart(this.barChartCanvas.nativeElement, {
      type: 'bar',
      data: {
        labels: groupKeys, // Top-level topics
        datasets: datasets
      },
      options: {
        responsive: true,
        plugins: {
          tooltip: {
            callbacks: {
              label: function (context) {
                return `${context.dataset.label}: ${context.raw}`;
              }
            }
          },
          legend: {
            position: 'right',
            labels: { boxWidth: 12 }
          }
        },
        scales: {
          x: {
            stacked: true,
            title: {
              display: true,
              text: 'Top-Level Topics'
            }
          },
          y: {
            stacked: true,
            beginAtZero: true,
            title: {
              display: true,
              text: 'Similarity Score'
            }
          }
        }
      }
    });
  }

  getColor(index: number): string {
    const palette = ['#42A5F5', '#66BB6A', '#FFA726', '#AB47BC', '#FF7043', '#26A69A', '#9C27B0', '#FFEB3B', '#795548'];
    return palette[index % palette.length];
  }
}

