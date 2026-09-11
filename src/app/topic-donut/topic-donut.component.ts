import { Component, Input, AfterViewInit, ElementRef, ViewChild, OnChanges, OnDestroy } from '@angular/core';
import Chart from 'chart.js/auto';

@Component({
  selector: 'app-topic-donut',
  template: `<canvas #donutCanvas width="30" height="30"></canvas>`,
  styles: [`
    canvas {
      display: block;
      width: 50px;
      margin: auto;
    }
  `]
})
export class TopicDonutComponent implements OnChanges, OnDestroy {
  @Input() score: number = 0; // value between 0 and 1
  @Input() query: string | boolean = true; // query identifier
  @ViewChild('donutCanvas', { static: true }) donutCanvas!: ElementRef<HTMLCanvasElement>;
  
  private chartInstance: Chart | null = null;

  ngOnChanges() {
    // Destroy existing chart if it exists
    if (this.chartInstance) {
      this.chartInstance.destroy();
    }

    console.log(this.score, 'score in donut chart component');
    const ctx = this.donutCanvas.nativeElement.getContext('2d')!;
    
    // Create gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, 100);

    // Handle different query types
    if (this.query === '1' || this.query === true) {
      gradient.addColorStop(0, '#FFA500'); // light orange for Q1
      gradient.addColorStop(1, '#FF4500'); // darker orange for Q1
    } else if (this.query === '2' || this.query === false) {
      gradient.addColorStop(0, '#7474e2'); // light purple for Q2
      gradient.addColorStop(1, '#5a5ab8'); // darker purple for Q2
    } else if (this.query === '3') {
      gradient.addColorStop(0, '#28a745'); // light green for Q3
      gradient.addColorStop(1, '#1e7e34'); // darker green for Q3
    } else {
      // Default fallback
      gradient.addColorStop(0, '#6c757d'); // light gray
      gradient.addColorStop(1, '#495057'); // darker gray
    }


    this.chartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Score', 'Remaining'],
        datasets: [{
          data: [this.score, 100 - this.score],
          backgroundColor: [gradient, '#e0e0e0'],
          
          borderWidth: 0
        }]
      },
      options: {
        responsive: false,
        cutout: '50%',
        plugins: {
          legend: { display: false },
          tooltip: {
            enabled: false, // disable default tooltip
            external: (context) => this.customTooltip(context) // use custom tooltip
          }
        },
      
        
      }
    });
  }

  customTooltip(context: any) {
    // Tooltip Element
    let tooltipEl = document.getElementById('chartjs-tooltip');
  
    // Create element if not exists
    if (!tooltipEl) {
      tooltipEl = document.createElement('div');
      tooltipEl.id = 'chartjs-tooltip';
      tooltipEl.style.position = 'absolute';
      tooltipEl.style.background = 'rgba(0, 0, 0, 0.7)';
      tooltipEl.style.color = '#fff';
      tooltipEl.style.padding = '8px 12px';
      tooltipEl.style.borderRadius = '4px';
      tooltipEl.style.pointerEvents = 'none';
      tooltipEl.style.whiteSpace = 'nowrap';
      tooltipEl.style.transition = 'all 0.1s ease';
      tooltipEl.style.zIndex = '1000';
      document.body.appendChild(tooltipEl);
    }
  
    const {chart, tooltip} = context;
  
    // Hide if no tooltip
    if (tooltip.opacity === 0) {
      tooltipEl.style.opacity = '0';
      return;
    }
  
    // Set content
    if (tooltip.body) {
      const titleLines = tooltip.title || [];
      const bodyLines = tooltip.body.map((b: any) => b.lines);
  
      let html = `<div><strong>${titleLines.join(' ')}</strong></div>`;
      html += bodyLines.map((line: any) => `<div>${line}</div>`).join('');
      tooltipEl.innerHTML = html;
    }
  
    // Position tooltip relative to page
    const canvasRect = chart.canvas.getBoundingClientRect();
    tooltipEl.style.opacity = '1';
    tooltipEl.style.left = canvasRect.left + window.scrollX + tooltip.caretX + 'px';
    tooltipEl.style.top = canvasRect.top + window.scrollY + tooltip.caretY + 'px';
  }
  
  ngOnDestroy() {
    if (this.chartInstance) {
      this.chartInstance.destroy();
    }
  }
}
