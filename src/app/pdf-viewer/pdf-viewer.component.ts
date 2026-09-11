import { Component, ElementRef, ViewChild } from '@angular/core';
import {
  Chart,
  CategoryScale,
  LinearScale,
  BarController,
  BarElement,
  Legend,
  Tooltip,
} from 'chart.js';
@Component({
  selector: 'app-pdf-viewer',
  templateUrl: './pdf-viewer.component.html',
  styleUrls: ['./pdf-viewer.component.css']
})
export class PdfViewerComponent {
  @ViewChild('stackedBarChart', { static: true }) stackedBarChart!: ElementRef;

  constructor() {
    // Register required Chart.js components
    Chart.register(CategoryScale, LinearScale, BarController, BarElement, Legend, Tooltip);
  }

  ngOnInit(): void {
    this.createStackedBarChart();
  }

  createStackedBarChart() {
    new Chart(this.stackedBarChart.nativeElement, {
      type: 'bar',
      data: {
        labels: ['January', 'February', 'March', 'April', 'May'],
        datasets: [
          {
            label: 'Series A',
            data: [10, 20, 30, 40, 50],
            backgroundColor: 'rgba(255,99,132,0.5)',
          },
          {
            label: 'Series B',
            data: [20, 10, 40, 30, 20],
            backgroundColor: 'rgba(54,162,235,0.5)',
          },
          {
            label: 'Series C',
            data: [30, 40, 10, 20, 60],
            backgroundColor: 'rgba(75,192,192,0.5)',
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'top',
          },
          tooltip: {
            mode: 'index',
            intersect: false,
          },
        },
        scales: {
          x: {
            stacked: true,
          },
          y: {
            stacked: true,
          },
        },
      },
    });
  }
}
