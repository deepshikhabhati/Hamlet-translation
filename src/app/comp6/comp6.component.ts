import { Component } from '@angular/core';
import { OpenaiService } from '../openai.service';

import { TSVG } from 'src/assets/tscvg';
import { images } from 'src/assets/adam';
@Component({
  selector: 'app-comp6',
  templateUrl: './comp6.component.html',
  styleUrls: ['./comp6.component.css']
})
export class Comp6Component {
  selectedQuery: any = [];
  selectedOp: any = '';
  data: any = TSVG;
  minRank: number = 1;
  maxRank: number = 100;
  totalrank: number = 100;
  selectedSets: any = []
  umapData: any = [];
  umapData2: any = images;
  rank: any = 4947;
  chatMessages: any[] = [];
  userMessage: any = ''
  originalUmapData: any[] = [];
  originalSelectedImages: any[] = [];
  selectedMode: any = 'dense';
  selectedQuery1: any = '';
  relevanceSummary: any = '';
 overallSummary: any = '';
  loading: boolean = false;
  bestPrompts: any = []
  selectedQuery2: any = '';
  queryLoader: boolean = false;
  promptclicked: boolean = false;
  highestChunk: any = '';
  minMaxData: any = {minScore: 0,maxScore: 100}
  selectedDescription: any = ''
  selectedQuery3: any = '';
  selectednodes: any = [];
  setOperations: any[] = [];
  sortKey: string = 'score_dense';
  sortAsc: boolean = true;
  sampleData = [1, 2, 2, 3, 3, 3, 5, 5, 6, 7, 8, 8, 9, 10, 10, 10, 10];
  minScore: number = 0;
  maxScore: number = 1;
  colors: string[] = [
    '#A52FBA', '#7BD154', '#E3A126', '#5293E8', '#F95A67',
    '#4BC3B5', '#FF7C00', '#B84DFF', '#66A4A2', '#D9539F',
    '#88E75E', '#FF4D4F', '#5C86F0', '#DAA520', '#00CED1',
    '#FF69B4', '#6A5ACD', '#20B2AA', '#F08080', '#9ACD32',
    '#00FA9A', '#FF4500', '#8A2BE2', '#FFD700', '#DC143C'
  ];
  top10Chunks: any = [];
  allPointsArrays: any = [];
dragTarget: 'min' | 'max' | null = null;
  selectedImages: any;

  queryDataMap: {
    [query: string]: {
      originalData: any[];
      umapData: any[];
      selectedImages: any[];
      selectedDescription: string;
    };
  } = {};
  selectedQueries: string[] = [];
  activeQuery: string | null = null;
  lastSetOperation: any = null; // Store last operation for re-use
  constructor(public dataService: OpenaiService) {

    const query: any = "A red sports car"
   
    // this.dataService.sendQueryNews(query).subscribe((res: any) => console.log(res))
  }

  get selectedQueryValues(): string {
    return this.selectedQuery.map((q: any) => q.key).join(', ');
  }
  selectQuery(q: any) {
    this.querySelected = q.value;
    this.queryLoader = true
    if (!this.selectedQuery.includes(q)) {
      this.selectedQuery.push(q);
    }    

    // if(this.selectedQuery.length === 1) {
      this.selectedQuery1 = q.value;
      // this.setOperations = ['query1']
      this.dataService.sendQueryNews3(this.selectedQuery1,4947).subscribe((response: any) => {
        this.data = response

        const highestScoreChunk = response.reduce((max: any, current: any) =>
                      current.score_dense > max.score_dense ? current : max
         );
         this.highestChunk = highestScoreChunk.text
         this.changePrompt()
         this.top10Chunks = [...response]
         .sort((a, b) => b.score_dense - a.score_dense)
         .slice(0, 10);

         this.top10Chunks = this.top10Chunks.map((item: any) => ({
          ...item,
          color: this.colors[this.setOperations.length] // Apply first index color
        }));

        let set: any = {
          key: 'top10 from ' + q.key,
          name: 'top10 from ' + q.key,
          value: this.top10Chunks,
          color: this.colors[this.setOperations.length]
        }

        this.selectednodes = this.top10Chunks

        this.setOperations.push(set)

         this.allPointsArrays = [...this.allPointsArrays,[set]]
         this.selectednodes = this.top10Chunks
         let summary = this.top10Chunks.map((item: any) => item.text);
         this.dataService.getSummary(summary).subscribe((res: any) => {
           console.log(res)
this.overallSummary = res.summary
         },() => {
          this.overallSummary = "Data is too big"
         })
      });


    }

    setsGroup: any[] = [];         // Original set of buttons
    unionGroup: any[] = [];        // To store buttons added to union
    intersectionGroup: any[] = []; // To store buttons added to intersection

    filterByRank(data: any[]): any[] {
      if (!data) return [];
      return data
        .map((item, index) => ({ ...item, __rank: index + 1 }))
        .filter((item, index) => {
          const rank = index + 1;
          return rank >= this.minRank && rank <= this.maxRank;
        });
    }
    
  
    setActiveQuery(query: string) {
      this.activeQuery = query;
      const originalData = this.queryDataMap[query]?.originalData || [];
      const filtered = this.filterByRank(originalData);
      this.selectedImages = filtered;

      if (this.operationHistory.length === 2) {
        this.operationHistory.shift(); 
      }
      
      // Add new entry to the end
      this.operationHistory.push({ label: query, data: originalData });

      console.log(this.operationHistory,162)
      this.umapData = filtered.map(item => ({
        umap_x: item.umap_x,
        umap_y: item.umap_y,
        image_path: item.image_path,
        color: this.queryColorMap[query] || '#000', // Use assigned color or default
        ...item,
      }));

    }
    handlePointClick(imagePath: any) {
      this.selectedImageName = imagePath.image;
      console.log('Clicked Image Path:', imagePath);
    }
  
   
    scoreThreshold: number = 50; // default value

    onThresholdChange() {
      if (this.scoreThreshold < 10) this.scoreThreshold = 10;
      if (this.scoreThreshold > 100) this.scoreThreshold = 100;
    
      const thresholdDecimal = this.scoreThreshold / 100;
    
      // Re-filter data for each selected query
      this.selectedQueries.forEach(query => {
        const originalData = this.queryDataMap[query]?.originalData || [];
        this.queryDataMap[query].originalData = originalData.filter(item => item.score >= thresholdDecimal);
      });
    
      // Refresh currently displayed data
      if (this.activeQuery) {
        if (this.selectedQueries.includes(this.activeQuery)) {
          this.setActiveQuery(this.activeQuery);
        } else {
          // For set operation results
          this.applySetOperation(this.lastSetOperation); // Store & reuse last operation
        }
      }
    }
    
    getSliderLeft(rank: number): number {
      return ((rank - 1) / (this.totalrank - 1)) * 100;
    }
  
    getSliderWidth(): number {
      return ((this.maxRank - this.minRank) / (this.totalrank - 1)) * 100;
    }
  
    startDrag(target: 'min' | 'max', event: MouseEvent) {
      this.dragTarget = target;
      event.preventDefault();
    }
  
    stopDrag() {
      this.dragTarget = null;
    }

    queryColors: string[] = ['#e6194b', '#3cb44b', '#ffe119', '#4363d8', '#f58231', '#911eb4', '#46f0f0', '#f032e6'];
queryColorMap: { [query: string]: string } = {};

onQuerySelected(queryKey: string) {
  if (!this.selectedQueries.includes(queryKey)) {
    this.selectedQueries.push(queryKey);

    // Assign a unique color if not already
    if (!this.queryColorMap[queryKey]) {
      const assignedColors = Object.values(this.queryColorMap);
      const availableColor = this.queryColors.find(c => !assignedColors.includes(c)) || this.getRandomColor();
      this.queryColorMap[queryKey] = availableColor;
    }

    this.dataService.sendQueryNews(queryKey).subscribe((res: any) => {

      const color = this.queryColorMap[queryKey];

      const enrichedImages = res.images.map((item: any) => ({
        ...item,
        queryKey: queryKey,
        color: color
      }));
      this.queryDataMap[queryKey] = {
        originalData: enrichedImages,
        umapData: enrichedImages,
        selectedImages: enrichedImages,
        selectedDescription: res.description
      };
      if (this.selectedQueries.length === 1) {
        this.setActiveQuery(queryKey);
      }
    });
  }
}
setOpQueryC: any = '';
setOpQueryD: any = '';

showQueryC: boolean = false;
showQueryD: boolean = false;

applyMultiSetOperation(params: (string | undefined)[]) {
  const [operation, ...queryKeys] = params;

  const validKeys = queryKeys.filter(k => !!k) as string[];
  if (validKeys.length < 3) return;

  const datasets = validKeys.map(q => this.filterByRank(this.queryDataMap[q]?.originalData || []));

  let result: any[] = [];

  if (operation === 'union') {
    const seen = new Map();
    for (const data of datasets) {
      for (const item of data) {
        if (!seen.has(item.image) || item.score > seen.get(item.image).score) {
          seen.set(item.image, item);
        }
      }
    }
    result = Array.from(seen.values());
  }

  if (operation === 'intersection') {
    result = datasets.reduce((acc, current) => {
      const currentMap = new Map(current.map(i => [i.image, i]));
      return acc.filter(item => currentMap.has(item.image)).map(item => {
        const otherItem = currentMap.get(item.image);
        return otherItem.score > item.score ? otherItem : item;
      });
    });
  }

  this.selectedImages = result;
  this.umapData = result;
  this.operationHistory.push({ label: `${operation} ${validKeys.join(', ')}`, data: result });
  if (this.operationHistory.length > 2) this.operationHistory.shift();
}


getRandomColor(): string {
  return '#' + Math.floor(Math.random() * 16777215).toString(16);
}

   
    onMouseMove(event: MouseEvent) {
      if (!this.dragTarget) return;

  const container = (event.target as HTMLElement).closest('.slider-container') as HTMLElement;
  const rect = container.getBoundingClientRect();
  const percent = ((event.clientX - rect.left) / rect.width) * 100;
  const value = Math.round((percent / 100) * 100); // assuming rank is 0-100

  if (this.dragTarget === 'min') {
    this.minRank = Math.min(value, this.maxRank); // prevent min > max
  } else if (this.dragTarget === 'max') {
    this.maxRank = Math.max(value, this.minRank); // prevent max < min
  }
  
      if (this.activeQuery) {
        this.setActiveQuery(this.activeQuery);
      }
    }
    scoresA: number[] = [];
    entropyA: number[] = [];
    showAnalysis: boolean = false;
    scoresB: number[] = [];
    entropyB: number[] = [];
    analyzeSets(setA: string[], setB: string[]) {
      this.dataService.analyze(setA, 'a beach and sunset').subscribe(res => {
        this.scoresA = res.clip_scores;
        this.entropyA = res.entropies;
        console.log('scoresA:', this.scoresA);
        console.log('entropyA:', this.entropyA);
      });
  
      this.dataService.analyze(setB, 'a beach during sunset').subscribe(res => {
        this.scoresB = res.clip_scores;
        this.entropyB = res.entropies;
      });
    }

    filterByScore(data: any[]): any[] {
      return data.filter(item => item.score >= this.minScore && item.score <= this.maxScore);
    }
  
    selectedImageName: string | null = null;

    // handlePointClick(point: any): void {
    //   console.log('Clicked Point:', point);
    //   this.selectedImageName = point.image_path;
    //   // You can use this to open a popup, display image, etc.
    // }
    
    sendMessage() {
      if (this.userMessage.trim()) {
        // Add user message
        this.chatMessages.push({ role: 'user', content: this.userMessage });
        this.selectedQueries.push(this.userMessage);
        this.activeQuery = this.userMessage;
        if (!this.queryColorMap[this.userMessage]) {
          const assignedColors = Object.values(this.queryColorMap);
          const availableColor = this.queryColors.find(c => !assignedColors.includes(c)) || this.getRandomColor();
          this.queryColorMap[this.userMessage] = availableColor;
        }
          this.dataService.sendQueryNews(this.userMessage).subscribe((res: any) => {

            const color = this.queryColorMap[this.userMessage];

            const enrichedImages = res.images.map((item: any) => ({
              ...item,
              queryKey: this.userMessage,
              color: color
            }));
            this.queryDataMap[this.userMessage] = {
              originalData: enrichedImages,
              umapData: enrichedImages,
              selectedImages: enrichedImages,
              selectedDescription: res.description
            };
          
            if (this.selectedQueries.length === 1) {
              
              this.setActiveQuery(this.userMessage);
            }

    
          this.userMessage = ''; // Clear input
          });
        } 
    }

    get combinedOperationImages() {
      if (this.operationHistory.length < 2) return [];
    
      const setA = this.operationHistory[0].data;
      const setB = this.operationHistory[1].data;
    
      const setAImages = new Map(setA.map(img => [img.image, img]));
      const setBImages = new Map(setB.map(img => [img.image, img]));
    
      const allImages = new Map<string, any>();
    
      // Mark common and unique entries
      for (const [imgPath, img] of setAImages) {
        allImages.set(imgPath, {
          ...img,
          isCommon: setBImages.has(imgPath)
        });
      }
    
      for (const [imgPath, img] of setBImages) {
        if (!allImages.has(imgPath)) {
          allImages.set(imgPath, {
            ...img,
            isCommon: false
          });
        }
      }
    
      return Array.from(allImages.values());
    }
    
    setOpQueryA: string | null = null;
setOpQueryB: string | null = null;

operationHistory: { label: string, data: any[] }[] = [];
addQueryC() {
  this.setOpQueryC = this.selectedQueries.find(q => q !== this.setOpQueryA && q !== this.setOpQueryB) || null;
}

addQueryD() {
  this.setOpQueryD = this.selectedQueries.find(q =>
    q !== this.setOpQueryA && q !== this.setOpQueryB && q !== this.setOpQueryC) || null;
}
    applySetOperation(operation: string) {
      if (!this.setOpQueryA || !this.setOpQueryB || this.setOpQueryA === this.setOpQueryB) return;
    
      const dataA = this.filterByRank(this.queryDataMap[this.setOpQueryA]?.originalData) || [];
      const dataB = this.filterByRank(this.queryDataMap[this.setOpQueryB]?.originalData) || [];
    
      let result = [];
    
      if (operation === 'union') {
        // result = [...dataA, ...dataB].filter((v, i, arr) =>
        //   arr.findIndex(obj => obj.image === v.image) === i
        // );

        const imageMap = new Map<string, any>();

        dataA.forEach(item => {
          imageMap.set(item.image, { ...item, queryKey: this.setOpQueryA });
        });
    
        dataB.forEach(item => {
          const existing = imageMap.get(item.image);
          if (existing) {
            // Image exists in both A and B, compare scores
            if (item.score > existing.score) {
              imageMap.set(item.image, { ...item, queryKey: this.setOpQueryB });
            }
          } else {
            imageMap.set(item.image, { ...item, queryKey: this.setOpQueryB });
          }
        });
    
        result = Array.from(imageMap.values());
      } else if (operation === 'intersection') {
        const bImages = new Map(dataB.map(item => [item.image, item]));
        result = dataA
          .filter(item => bImages.has(item.image))
          .map(item => {
            const bItem = bImages.get(item.image);
            const chosen = (bItem.score > item.score) ? bItem : item;
            return {
              ...chosen,
              queryKey: 'intersection',
              color: '#808080' // force grey for intersection
            };
          });
      } else if (operation === 'a-b') {
        const bImages = new Set(dataB.map(item => item.image));
        result = dataA.filter(item => !bImages.has(item.image));
      } else if (operation === 'b-a') {
        const aImages = new Set(dataA.map(item => item.image));
        result = dataB.filter(item => !aImages.has(item.image));
      }
    
      this.selectedImages = result;
      this.umapData = result;
      if (this.operationHistory.length === 2) {
        this.operationHistory.shift(); 
      }
      
      // Add new entry to the end
      this.operationHistory.push({ label: operation, data: result });
      this.selectedSets = this.operationHistory.map(op => op.data);
      this.selectedDescription = `${operation.toUpperCase()} between ${this.setOpQueryA} and ${this.setOpQueryB}`;
    }

   computeCentroid(embeddings: { umap_x: number; umap_y: number }[]): [number, number] {
      const sum = embeddings.reduce(
        (acc, p) => [acc[0] + p.umap_x, acc[1] + p.umap_y],
        [0, 0]
      );
      return [sum[0] / embeddings.length, sum[1] / embeddings.length];
    }
    
   computeCentroidShift(
      setA: { umap_x: number; umap_y: number }[],
      setB: { umap_x: number; umap_y: number }[],
      combined: { umap_x: number; umap_y: number }[]
    ): number {
      const [meanAx, meanAy] = this.computeCentroid(setA);
      const [meanBx, meanBy] = this.computeCentroid(setB);
      const [meanCx, meanCy] = this.computeCentroid(combined);
    
      const avgABx = (meanAx + meanBx) / 2;
      const avgABy = (meanAy + meanBy) / 2;
    
      return Math.sqrt(Math.pow(meanCx - avgABx, 2) + Math.pow(meanCy - avgABy, 2));
    }
    
    changePrompt() {

      this.dataService.getBestPrompt(this.querySelected,this.highestChunk).subscribe((res: any) => {


        this.bestPrompts = res.best_prompts;
        this.queryLoader = false

      } )
    }

    onPromptClicked(message: any) {
      this.bestPrompts = []
      this.loading = true
              this.dataService.updateModifiedValue(this.querySelected, message);
        this.dataService.sendQueryNews3(message,4947).subscribe((response: any) => {
          this.data = response
          this.promptclicked = true
          const highestScoreChunk = response.reduce((max: any, current: any) =>
                        current.score_dense > max.score_dense ? current : max
           );
           this.highestChunk = highestScoreChunk.text
           this.top10Chunks = this.top10Chunks.map((item: any) => ({
            ...item,
            color: this.colors[this.setOperations.length] // Apply first index color
          }));
  
          let set: any = {
            key: 'top10 from MOdified' ,
            name: 'top10 from MOdified',
            value: this.top10Chunks,
            color: this.colors[this.setOperations.length]
          }
  
          this.selectednodes = this.top10Chunks
  
          this.setOperations.push(set)
  
           this.allPointsArrays = [...this.allPointsArrays,[set]]
           this.selectednodes = this.top10Chunks
           let summary = this.top10Chunks.map((item: any) => item.text);
           this.dataService.getSummary(summary).subscribe((res: any) => {
             console.log(res)
  this.overallSummary = res.summary
           },() => {
            this.overallSummary = "Data is too big"
           })
          console.log(response)
        });
        
        this.dataService.getRelevance(message,this.highestChunk).subscribe((response: any) => {
        this.relevanceSummary = response.relevance_summary
        this.loading = false
        console.log(response)
        });

    }

    querySelected: any = null;


onBarRangeSelected(range: any) {
  console.log('User selected score_dense range:', range);
  range = range.map((item: any) => ({
    ...item,
    color: this.colors[this.setOperations.length] // Apply first index color
  }));

let set: any = {
  name: 'set' + Number(this.setOperations.length + 1),
  key: 'set ' + Number(this.setOperations.length + 1),
  value: range,
  color: this.colors[this.setOperations.length]
}



this.setOperations.push(set)

this.selectednodes = range

this.allPointsArrays = [...this.allPointsArrays,[set]]

let summary = range.map((item: any) => item.text);
this.dataService.getSummary(summary).subscribe((res: any) => {
  console.log(res)
this.overallSummary = res.summary
},() => {
 this.overallSummary = "Data is too big"
})

console.log(this.minMaxData)
  // this.filterData(this.minMaxData)
  // You could filter your items based on this range here
}

toggleQuerySelection(query: any) {
  const index = this.selectedQueries.indexOf(query);
  if (index === -1) {
    this.selectedQueries.push(query);
  } else {
    this.selectedQueries.splice(index, 1);
  }
}

isQueryChecked(query: any): boolean {
  return this.selectedQueries.includes(query);
}
    sortBy(key: 'score_dense' | 'score_dense2') {
      if (this.sortKey === key) {
      this.sortAsc = !this.sortAsc;
      } else {
      this.sortKey = key;
      this.sortAsc = true;
      }
      }

 filterData(data: any){
       this.minMaxData = data
       console.log(this.minMaxData)
       const getId = (d: any) => d.title || d.doc_id || d.path;
    
       if (this.selectedOp === "Union") {
         // Top N from query1
         const top1 = [...this.data]
           .map(d => ({
             ...d,
             score: this.selectedMode === 'dense' ? d.score_dense :
                    this.selectedMode === 'sparse' ? d.score_sparse :
                    this.selectedMode === 'fulltext' ? d.score_fulltext :
                    d.rerank_score1
           }))
           .filter(d => d.score >= data.minScore && d.score <= data.maxScore)
           .sort((a, b) => b.score - a.score)
           .slice(0, this.rank);
       
         // Top N from query2
         const top2 = [...this.data]
           .map(d => ({
             ...d,
             score2: this.selectedMode === 'dense' ? d.score_dense2 :
                     this.selectedMode === 'sparse' ? d.score_sparse2 :
                     this.selectedMode === 'fulltext' ? d.score_fulltext2 :
                     d.rerank_score2
           }))
           .filter(d => d.score2 >= data.minScore && d.score2 <= data.maxScore)
           .sort((a, b) => b.score2 - a.score2)
           .slice(0, this.rank);
       
         // Merge top1 and top2 without duplicates
         const seen = new Set();
         this.selectednodes = [...top1, ...top2].filter(d => {
           const key = getId(d);
           if (seen.has(key)) return false;
           seen.add(key);
           return true;
         });
       
       } else if (this.selectedOp === "Intersection") {
         // Top N from query1
         const top1 = [...this.data]
           .map(d => ({
             ...d,
             score: this.selectedMode === 'dense' ? d.score_dense :
                    this.selectedMode === 'sparse' ? d.score_sparse :
                    this.selectedMode === 'fulltext' ? d.score_fulltext :
                    d.rerank_score1
           }))
           .filter(d => d.score >= data.minScore && d.score <= data.maxScore)
           .sort((a, b) => b.score - a.score)
           .slice(0, this.rank);
       
         // Top N from query2
         const top2 = [...this.data]
           .map(d => ({
             ...d,
             score2: this.selectedMode === 'dense' ? d.score_dense2 :
                     this.selectedMode === 'sparse' ? d.score_sparse2 :
                     this.selectedMode === 'fulltext' ? d.score_fulltext2 :
                     d.rerank_score2
           }))
           .filter(d => d.score2 >= data.minScore && d.score2 <= data.maxScore)
           .sort((a, b) => b.score2 - a.score2)
           .slice(0, this.rank);
       
         const ids1 = new Set(top1.map(getId));
         this.selectednodes = top2.filter(d => ids1.has(getId(d)));
       
       } else {
         // Default for query1 / query2 selection
         this.selectednodes = this.data
           .map((d: any) => {
             d.score = this.selectedMode === 'dense' ? d.score_dense :
                       this.selectedMode === 'sparse' ? d.score_sparse :
                       this.selectedMode === 'fulltext' ? d.score_fulltext :
                       d.rerank_score1;
             d.score2 = this.selectedMode === 'dense' ? d.score_dense2 :
                        this.selectedMode === 'sparse' ? d.score_sparse2 :
                        this.selectedMode === 'fulltext' ? d.score_fulltext2 :
                        d.rerank_score2;
             return d;
           })
           .filter((d: any) => {
             if (this.selectedOp === "query1") {
               return d.score >= data.minScore && d.score <= data.maxScore;
             } else if (this.selectedOp === "query2") {
               return d.score2 >= data.minScore && d.score2 <= data.maxScore;
             } else if (this.selectedOp === "FzIntersection") {
              const score1 = d.score_dense;
              const score2 = d.score_dense2;
              return score1 >= data.minScore && score1 <= data.maxScore &&
                     score2 >= data.minScore && score2 <= data.maxScore;
            }
             return true;
           })
           .sort((a: any, b: any) => {
             if (this.selectedOp === "query1") return b.score - a.score;
             if (this.selectedOp === "query2") return b.score2 - a.score2;
             if (this.selectedOp === "FzIntersection") return Math.min(b.score, b.score2) - Math.min(a.score, a.score2);
             return 0;
           })
           .slice(0, this.rank);
      }
    }

    // onMouseMove(event: MouseEvent) {
    //   if (!this.dragTarget) return;
    
    //   const container = (event.target as HTMLElement).closest('.slider-container') as HTMLElement;
    //   if (!container) return;
    
    //   const rect = container.getBoundingClientRect();
    //   const percent = (event.clientX - rect.left) / rect.width;
    //   const clamped = Math.max(0, Math.min(1, percent));
    
    //   if (this.dragTarget === 'min') {
    //     this.minScore = Math.min(clamped, this.maxScore);
    //   } else if (this.dragTarget === 'max') {
    //     this.maxScore = Math.max(clamped, this.minScore);
    //   }

    //   this.umapData = this.originalUmapData.filter(item => {
    //     return item.score >= this.minScore && item.score <= this.maxScore;
    //   });

    //   this.selectedImages = this.originalSelectedImages.filter(item => {
    //     return item.score >= this.minScore && item.score <= this.maxScore;
    //   });
    // }

    // startDrag(type: 'min' | 'max', event: MouseEvent) {
    //   this.dragTarget = type;
    // }
    
    // stopDrag() {
    //   this.dragTarget = null;
    // }
    
    get sortedNodes() {
      const nodes = [...this.selectednodes];
      if (!this.sortKey) return nodes;
      return nodes.sort((a, b) => {
      const diff = (a[this.sortKey] ?? 0) - (b[this.sortKey] ?? 0);
      return this.sortAsc ? diff : -diff;
      });
      }
      
      showModal = false;
      pendingOp: any = null;
    
      openConfirmModal(op: any) {
        this.pendingOp = op;
        this.showModal = true;
      }
    
      closeModal() {
        this.pendingOp = null;
        this.showModal = false;
      }
    
      addToGroup(group: 'union' | 'intersection') {
        if (!this.pendingOp) return;
        if (group === 'union') {
          this.unionGroup.push(this.pendingOp);
          console.log(this.unionGroup)
          if(this.unionGroup.length > 1) {
            const allValues = this.unionGroup.flatMap(item => item.value);

            // Deduplicate based on umap_x and umap_y with highest score_dense
            const uniqueMap = new Map<string, any>();
          
            allValues.forEach(item => {
              const key = `${item.umap_x},${item.umap_y}`;
              if (!uniqueMap.has(key) || item.score_dense > uniqueMap.get(key).score_dense) {
                uniqueMap.set(key, item);
              }
            });
          
            const combinedOp = {
              key: 'combined_union',
              name: 'Combined Union',
              value: Array.from(uniqueMap.values())
            };

            this.allPointsArrays = [...this.allPointsArrays,[combinedOp]]
            let summary = combinedOp.value.map((item: any) => item.text);
            this.dataService.getSummary(summary).subscribe((res: any) => {
              console.log(res)
   this.overallSummary = res.summary
            },() => {
             this.overallSummary = "Data is too big"
            })
    

            this.selectednodes = combinedOp.value

          }
        } else {
          this.intersectionGroup.push(this.pendingOp);

          if (this.intersectionGroup.length > 1) {
            // Step 1: Create sets of coordinate keys from each group
            const coordinateSets = this.intersectionGroup.map(group => {
              return new Set(group.value.map((item: any) => `${item.umap_x},${item.umap_y}`));
            });
        
            // Step 2: Find common keys (intersection of all coordinate sets)
            const intersectionKeys = Array.from(coordinateSets[0]).filter(key =>
              coordinateSets.every(set => set.has(key))
            );
        
            // Step 3: For each common key, find one representative item from the first group
            const keyToItem = new Map<string, any>();
            this.intersectionGroup.forEach(group => {
              group.value.forEach((item: any) => {
                const key = `${item.umap_x},${item.umap_y}`;
                if (intersectionKeys.includes(key) && !keyToItem.has(key)) {
                  keyToItem.set(key, {
                    ...item,
                    color: 'lightblue' // override color to show it as intersection
                  });
                }
              });
            });
        
            const combinedOp = {
              key: 'combined_intersection',
              name: 'Combined Intersection',
              value: Array.from(keyToItem.values())
            };
        
            this.allPointsArrays = [...this.allPointsArrays, [combinedOp]];
        
            const summary = combinedOp.value.map((item: any) => item.text);
            this.dataService.getSummary(summary).subscribe(
              (res: any) => {
                this.overallSummary = res.summary;
              },
              () => {
                this.overallSummary = 'Data is too big';
              }
            );
        
            this.selectednodes = combinedOp.value;
        }
      }
        this.closeModal();
      }

      editingQuery: any = null;
editedValue: string = '';

openEditPopup(query: any, event: MouseEvent): void {
  event.stopPropagation(); // Prevent parent click
  this.editingQuery = query;
  this.editedValue = query.value;
}

closePopup(): void {
  this.editingQuery = null;
  this.editedValue = '';
}

saveQuery(): void {
  if (this.editingQuery) {
    this.editingQuery.value = this.editedValue;
    this.selectQuery(this.editingQuery)
    this.closePopup();
  }
}


}
