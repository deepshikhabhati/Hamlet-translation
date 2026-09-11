// clip-analysis.component.ts
import { Component ,Input, OnChanges} from '@angular/core';

@Component({
  selector: 'app-clip-analysis',
  templateUrl: './clip-analysis.component.html',
  styleUrls: ['./clip-analysis.component.css']
})
export class ClipAnalysisComponent implements OnChanges {
   @Input()   setA: any[] = []; // e.g. intersection("beach", "sunset")

    @Input() setB: any[] = [];

  stats = {
    centroidShift: 0,
    clip: {
      meanA: 0, varianceA: 0,
      meanB: 0, varianceB: 0
    },
    overlap: 0,
    umapSpreadA: 0,
    umapSpreadB: 0
  };

  ngOnChanges() {
    // Replace with real data
    
    console.log("Set A:", this.setA);
    console.log("Set B:", this.setB);
    this.computeErrorRateFromObjects(this.setA,this.setB);
  }

  computeCentroid(data: any[]): [number, number] {
    const n = data.length;
    const x = data.reduce((sum, d) => sum + d.umap_x, 0) / n;
    const y = data.reduce((sum, d) => sum + d.umap_y, 0) / n;
    return [x, y];
  }

  computeCentroidShift(setA: any[], setB: any[]): number {
    const [ax, ay] = this.computeCentroid(setA);
    const [bx, by] = this.computeCentroid(setB);
    return Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2);
  }

  metrics: any = null;

  computeErrorRateFromObjects(setC: any[], setD: any[]): void {
    // Step 1: Extract image identifiers (e.g. image paths)
    const imageIdsC = setC.map(item => item.image.trim());
    const imageIdsD = setD.map(item => item.image.trim());

    // Step 2: Deduplicate and convert to sets
    const setCUnique = new Set(imageIdsC);
    const setDUnique = new Set(imageIdsD);

    // Step 3: Compute intersection and union
    const intersection = Array.from(setCUnique).filter(img => setDUnique.has(img));
    const union = new Set([...setCUnique, ...setDUnique]);

    const intersectionCount = intersection.length;
    const precision = intersectionCount / imageIdsD.length;
    const recall = intersectionCount / imageIdsC.length;
    const f1 = (2 * precision * recall) / (precision + recall || 1);
    const errorRate = 1 - (intersectionCount / Math.min(imageIdsC.length, imageIdsD.length));
    const symmetricError = 1 - (intersectionCount / union.size);

    this.metrics = {
      commonImages: intersection,
      overlapCount: intersectionCount,
      errorRate: +errorRate.toFixed(3),
      symmetricError: +symmetricError.toFixed(3),
      precision: +precision.toFixed(3),
      recall: +recall.toFixed(3),
      f1Score: +f1.toFixed(3)
    };
  }

  computeMeanVariance(scores: number[]) {
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((sum, v) => sum + (v - mean) ** 2, 0) / scores.length;
    return { mean, variance };
  }

  computeOverlap(idsA: string[], idsB: string[]): number {
    const setA = new Set(idsA);
    const setB = new Set(idsB);
    const intersection = [...setA].filter(x => setB.has(x));
    return intersection.length / Math.min(setA.size, setB.size);
  }

  computeSpread(data: any[]): number {
    const xs = data.map(p => p.umap_x);
    const ys = data.map(p => p.umap_y);
    const meanX = xs.reduce((a, b) => a + b, 0) / xs.length;
    const meanY = ys.reduce((a, b) => a + b, 0) / ys.length;
    const varX = xs.reduce((s, x) => s + (x - meanX) ** 2, 0) / xs.length;
    const varY = ys.reduce((s, y) => s + (y - meanY) ** 2, 0) / ys.length;
    return varX + varY;
  }

  computeStats() {
    const scoresA = this.setA.map(d => d.score);
    const scoresB = this.setB.map(d => d.score);
    const idsA = this.setA.map(d => d.image);
    const idsB = this.setB.map(d => d.image);

    const statsA = this.computeMeanVariance(scoresA);
    const statsB = this.computeMeanVariance(scoresB);

    this.stats.clip.meanA = statsA.mean;
    this.stats.clip.varianceA = statsA.variance;
    this.stats.clip.meanB = statsB.mean;
    this.stats.clip.varianceB = statsB.variance;

    this.stats.centroidShift = this.computeCentroidShift(this.setA, this.setB);
    this.stats.overlap = this.computeOverlap(idsA, idsB);
    this.stats.umapSpreadA = this.computeSpread(this.setA);
    this.stats.umapSpreadB = this.computeSpread(this.setB);
  }
}
