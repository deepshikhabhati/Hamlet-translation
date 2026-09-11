import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import * as d3 from 'd3';

@Component({
  selector: 'app-heatmap',
  template: `<div #heatmapContainer></div>`,
  styleUrls: ['./heatmap.component.css']
})
export class HeatmapComponent implements OnInit {
  @ViewChild('heatmapContainer', { static: true }) heatmapContainer!: ElementRef;
  private data: any = [
    { key: "History", similarity: 0.6350413705382614 },
    { key: "Academic Papers", similarity: 0.5637193027507749 },
    { key: "Sources", similarity: 0.529854749076823 },
    { key: "Textbooks", similarity: 0.5246900283302007 },
    { key: "Skepticism", similarity: 0.4981514526238806 },
    { key: "External Resources", similarity: 0.48612321543316495 },
    { key: "Quantum Programming", similarity: 0.4838643005401402 },
    { key: "Potential Applications", similarity: 0.48384611641040776 },
    { key: "root", similarity: 0.47855526717536134 },
    { key: "Further Reading", similarity: 0.47755007632643887 },
    { key: "Engineering Challenges in Quantum Computing", similarity: 0.46767078407908724 },
    { key: "Quantum information", similarity: 0.46601936089294727 },
    { key: "quantum Computing", similarity: 0.4567688589337129 },
    { key: "Quantum Supremacy", similarity: 0.44758703223145657 },
    { key: "Quantum information processing", similarity: 0.4474158159610707 },
    { key: "Post-Quantum Cryptography", similarity: 0.44386471653559423 }
  ];

  private width: any = 600;
  private height: any = 400;

  constructor() {}

  ngOnInit() {
    this.createHeatmap();
  }

  private createHeatmap(): void {
    const element: any = this.heatmapContainer.nativeElement;
    d3.select(element).selectAll("*").remove();

    const svg: any = d3.select(element)
      .append("svg")
      .attr("width", this.width)
      .attr("height", this.height);

    const margin: any = { top: 20, right: 20, bottom: 100, left: 100 };
    const gridWidth: any = (this.width - margin.left - margin.right) / this.data.length;
    const gridHeight: any = 30;

    const colorScale: any = d3
    .scaleLinear()
    .domain([0, 1])
    .range(["#f7fcf0", "#084081"] as any); 

    const g: any = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    g.selectAll(".cell")
      .data(this.data)
      .enter()
      .append("rect")
      .attr("x", (_: any, i: any) => i * gridWidth)
      .attr("y", 0)
      .attr("width", gridWidth)
      .attr("height", gridHeight)
      .attr("fill", (d: any) => colorScale(d.similarity));

    g.selectAll(".label")
      .data(this.data)
      .enter()
      .append("text")
      .attr("x", (_: any, i: any) => i * gridWidth + gridWidth / 2)
      .attr("y", gridHeight + 15)
      .attr("text-anchor", "middle")
      .text((d: any) => d.key)
      .style("font-size", "12px");
  }
}
