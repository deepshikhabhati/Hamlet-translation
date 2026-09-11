import { Component, Input, AfterViewInit, ElementRef, ViewChild, EventEmitter, Output } from '@angular/core';
import * as d3 from 'd3';

@Component({
  selector: 'app-donut-chart',
  template: '<div #chartContainer class="chart-wrapper"></div>',
  styles: ['.chart-wrapper { display: flex; flex-direction: column; }',
           '.chart-row { display: flex; gap: 20px; justify-content: center; margin-top: 20px; }']
})
export class DonutChartComponent implements AfterViewInit {
  @Input() data: any;
  @ViewChild('chartContainer', { static: false }) chartContainer!: any;
  @Output() nodeClicked = new EventEmitter<any>(); // Event to emit node data
  private subChartRows: any = {};

  ngAfterViewInit(): void {
    if (this.data) {
      this.createChart(this.data, this.chartContainer.nativeElement, 0);
    }
  }

activeLevel: any = 0; // Track the active level
activeChart: HTMLElement | null = null; // Track the last clicked chart
latestChart: HTMLElement | null = null; 
selectedIds: any = []
createChart(data: any, container: any, level: number): void {
  if (!container) return;

  const chartRowId = `chart-row-${level}`;
  let chartRow: any = d3.select(container).select(`#${chartRowId}`).node();

  if (!d3.select('#summary-box').node()) {
    d3.select('body')
      .append('div')
      .attr('id', 'summary-box')
      .style('position', 'absolute')
      .style('background', 'white')
      .style('border', '1px solid #ccc')
      .style('padding', '10px')
      .style('border-radius', '5px')
      .style('display', 'none')
      .style('max-height', '150px') // Max height to trigger scroll
      .style('overflow-y', 'auto') // Enables vertical scroll
      .style('box-shadow', '0px 4px 6px rgba(0, 0, 0, 0.1)')
  }

  if (!d3.select('#content-box').node()) {
    d3.select('body')
      .append('div')
      .attr('id', 'content-box')
      .style('position', 'absolute')
      .style('background', 'white')
      .style('border', '1px solid #ccc')
      .style('padding', '10px')
      .style('border-radius', '5px')
      .style('display', 'none') // Initially hidden
      .style('max-height', '300px') // Max height to trigger scroll
      .style('overflow-y', 'auto') // Enables vertical scroll
      .style('box-shadow', '0px 4px 6px rgba(0, 0, 0, 0.1)')
  }
  
  if (!chartRow) {
    chartRow = d3.select(container)
      .append('div')
      .attr('id', chartRowId)
      .attr('class', 'chart-row')
      .style('display', 'flex') // Ensures siblings appear in the same row
      .node();
    this.subChartRows[level] = chartRow;
  }

  const chartContainer: any = d3.select(chartRow)
    .append('div')
    .attr('class', 'chart-container')
    .attr('data-level', level);

  let width = 100, height = 100, radius = 50; // Default size
  if (level === 0) {
    width = height = 500; // Root node starts bigger
    radius = 250;
  }

  const svg: any = d3.select(chartContainer.node())
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .append('g')
    .attr('transform', `translate(${width / 2}, ${height / 2})`);

  const color: any = d3.scaleOrdinal(d3.schemeCategory10);
  const pie = d3.pie<any>().value((d: any) => d.value);
  const arc = d3.arc<any>().innerRadius(radius * 0.5).outerRadius(radius);
  const labelArc = d3.arc<any>().innerRadius(radius * 0.7).outerRadius(radius * 0.7);

  // svg.append("text")
  // .attr("text-anchor", "middle")
  // .attr("dy", "0.35em")
  // .style("font-size", "20px")
  // .style("font-weight", "bold")
  // .style("fill", "#333")
  // .text(data.name); // Display root name

  // const centerText = svg.append("text")
  //   .attr("text-anchor", "middle")
  //   .attr("dy", "0.35em")
  //   .style("font-size", "16px")
  //   .style("font-weight", "bold")
  //   .style("fill", "#333") // Adjust color if needed
  //   .text(""); 


  const dataReady: any = pie(data.children.map((d: any) => ({
    name: d.name,
    value: d.children && d.children.length ? d.children.length + 1 : 1,
    color: d.color,
    borderColor: d.borderColor || "#000",
    original: d
  })));

  console.log(dataReady,109)


  svg.selectAll('path')
    .data(dataReady)
    .enter()
    .append('path')
    .attr('d', arc as any)
    .attr('fill', (d: any) => d.data.color)
    .attr('stroke', (d: any) => d.data.borderColor) 
    .attr('stroke-width', 3)
    .attr('class', 'slice')
    .style('opacity', 1) 
    .on('click', (event: any, d: any) => {
      const slice = d3.select(event.currentTarget as SVGPathElement); // Use `event.currentTarget`

      this.nodeClicked.emit(d.data.name)
      const chartId = `chart-${d.data.name.replace(/\s+/g, "-")}-${level}`; // Unique chart ID

    // Check if the chart already exists
    if (this.selectedIds.indexOf(chartId) > -1) {
        console.log("Chart already exists, skipping duplicate creation.");
        return; // Exit function to prevent duplicate creation
    } else {
      this.selectedIds.push(chartId)
    }

      const isHighlighted = slice.attr('data-highlighted') === 'true';
    
      if (isHighlighted) {
        // Remove highlight
        slice
          .attr('stroke-width', 3)
          .style('opacity', 1)
          .attr('data-highlighted', 'false');
      } else {
        // Add highlight
        slice
          .attr('stroke', '#FF7F50')
          .attr('stroke-width', 5)
          .style('opacity', 1)
          .attr('data-highlighted', 'true');
      }

      d3.selectAll('path')
      .filter(function () {
        return d3.select(this).attr('data-highlighted') !== 'true';
      })
      .style('opacity', 0.3);

    d3.select('#summary-box')
      .style('left', '30%') // Position next to donut
      .style('top', '10%')
      .style('width', '10%')
      .style('font-size','xx-small')
      .style('display', 'block')
      .html(`<h3>Summary View</h3><br><strong>${d.data.name}</strong><br>${d.data.original.summary || d.data.original.content}`);

      this.showSubChart(d.data.original, level + 1, chartContainer.node(),d.data.color);
    d3.select('#content-box')
    .style('left', '40%') // Position next to donut
    .style('top', '10%')
    .style('width', '13%')
    .style('font-size','xx-small')
    .style('display', 'block')
    .html(`<h3>Original Content</h3><br><strong>${d.data.name}</strong><br>${d.data.original.content || d.data.original.value}`);
  });


    svg.selectAll('text')
    .data(dataReady)
    .enter()
    .append('text')
    .attr('transform', (d: any) => {
      const pos = labelArc.centroid(d); // Get label position
      if (pos[1] < -radius * 0.3) return `translate(${pos[0]},${pos[1] - 5})`; // Adjust text position slightly upward
      return `translate(${pos})`;
    })
    .attr('text-anchor', 'middle')
    .style('font-size', (d: any) => {
      const donutSize: any = d3.select(chartContainer.node()).select('svg').attr('width');
      console.log(donutSize)
      return donutSize < 150 ? '8px' : '15px'; // Reduce font size if small
    })
    .style('fill', '#000000')
    .style('visibility', (d: any) => {
      const arcSize = arc.outerRadius()(d) - arc.innerRadius()(d);
      return arcSize < 20 ? 'hidden' : 'visible'; // Hide if text is too big
    })
    .text((d: any) => {

      const maxLength = 15; // Max characters before adding "..."
      console.log(d)
      return d.data.name.length > maxLength ? d.data.name.slice(0, maxLength) + '...' + '(' + d.data.value + ')' : d.data.name + '(' + d.data.value + ')';
    });

   


  // Update latest added chart
  this.latestChart = chartContainer.node();
  this.updateChartSizes();

  svg.append("text")
  .attr("text-anchor", "middle")
  .attr("dy", "0.35em") // Adjust vertical alignment
  .style("font-size", "20px")
  .style("font-weight", "bold")
  .style("fill", "#333")
  .text((d: any) => {
  // Max characters before adding "..."
    return data.name + '(' + data.children?.length + ')';
  }); // Display root name
  
}

updateChartSizes(): void {
  d3.selectAll('.chart-container').each((_, i, nodes) => {
    const chartContainer = nodes[i]; // Get the current chart container

    let newSize = 100; // Default size for all
    if (chartContainer === this.latestChart) {
      newSize = 500; // Make only the latest chart larger
    }

    const radius = newSize / 2;

    const svg = d3.select(chartContainer).select('svg')
      .attr('width', newSize)
      .attr('height', newSize);

    console.log(newSize,247)  
    const g = svg.select('g')
      .attr('transform', `translate(${newSize / 2}, ${newSize / 2})`);

    const arc = d3.arc<any>()
      .innerRadius(radius * 0.5)
      .outerRadius(radius);

    g.selectAll('path')
      .attr('d', arc as any);

      g.selectAll('text')
      .attr('transform', (d: any) => {
        if (!d) return ''; // Prevent errors if d is undefined
        const centroid = arc.centroid(d);
        return `translate(${centroid})`;
      })
      .style('font-size', (d: any) => {
 
        return newSize < 150 ? '8px' : '18px'; // Reduce font size if small
      })
      .text((d: any) => {
        if (!d) return '';
        const maxLength =  newSize < 150 ? 10 : 20; // Max characters before adding "..."
        return d.data.name.length > maxLength ? d.data.name.slice(0, maxLength) + '...' + '(' + d.data.value + ')' : d.data.name + '(' + d.data.value + ')';
      });
  });
}


  
  showSubChart(data: any, level: number, parentElement?: any,parentColor?: any): void {
    if (data.children.length > 0) {
      console.log(data,247)
      const combinedData: any = {
        name: data.name,
        children: data.children.flatMap((child: any) => ({
          ...child,
          borderColor: parentColor // Pass parent's color to children
        }))
      };
  
      // Ensure the row for this level exists
      if (!this.subChartRows[level]) {
        const chartRowId = `chart-row-${level}`;
        let chartRow = d3.select(this.chartContainer.nativeElement)
          .append('div')
          .attr('id', chartRowId)
          .attr('class', 'chart-row')
          .style('display', 'flex')
          .style('position', 'relative') // Required for absolute positioning of links
          .node();
  
        this.subChartRows[level] = chartRow;
      }
  
      // Create the child chart
      this.createChart(combinedData, this.subChartRows[level], level);
  
      // Draw a link between parent and child
    
    }
  }
  
  
}
