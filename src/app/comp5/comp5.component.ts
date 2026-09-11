
import { Component } from '@angular/core';
import { News } from 'src/assets/news';
import { TSVG } from 'src/assets/tscvg';
import { OpenaiService } from '../openai.service';
import * as XLSX from 'xlsx';
import * as FileSaver from 'file-saver';
@Component({
  selector: 'app-comp5',
  templateUrl: './comp5.component.html',
  styleUrls: ['./comp5.component.css']
})
export class Comp5Component {

  data: any = TSVG
  chatMessages: any[] = [];
    userMessage: any = ''
  showChunkPopup: boolean = false;
  selectedUSerMessage: any;
  weight2: any
  weight1: any
  selectedUSerMessage2: any;
  selectednodes: any[] = [];
  selected: any = 'Query1'
  querysent: boolean = false;
  minMaxData: any = {minScore: 0,maxScore: 100}
  numberOfChunks: any = 4947
  rank: any = 4947;
  isLoading: boolean = false;
  summaryData: any;
  selectedMode: string = 'dense';
  constructor(public openaiService: OpenaiService) {

  }
    
  openChunkPopup() {
    this.showChunkPopup = true;
  }


  select(mode: string) {
    this.selected = mode;
    this.filterData(this.minMaxData)
    // this.initChart();
  }

  selctMode(mode: string) {
    this.selectedMode = mode;
    // this.initChart();
  }
  sortKey: 'score_dense' | 'score_dense2' | '' = '';
  sortAsc = true;
  
  get sortedNodes() {
  const nodes = [...this.selectednodes];
  if (!this.sortKey) return nodes;
  return nodes.sort((a, b) => {
  const diff = (a[this.sortKey] ?? 0) - (b[this.sortKey] ?? 0);
  return this.sortAsc ? diff : -diff;
  });
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
   const getId = (d: any) => d.title || d.doc_id || d.path;

   if (this.selected === "Union") {
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
   
   } else if (this.selected === "Intersection") {
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
         if (this.selected === "query1") {
           return d.score >= data.minScore && d.score <= data.maxScore;
         } else if (this.selected === "query2") {
           return d.score2 >= data.minScore && d.score2 <= data.maxScore;
         } else if (this.selected === "FzIntersection") {
          const score1 = d.score_dense;
          const score2 = d.score_dense2;
          return score1 >= data.minScore && score1 <= data.maxScore &&
                 score2 >= data.minScore && score2 <= data.maxScore;
        }
         return true;
       })
       .sort((a: any, b: any) => {
         if (this.selected === "query1") return b.score - a.score;
         if (this.selected === "query2") return b.score2 - a.score2;
         if (this.selected === "FzIntersection") return Math.min(b.score, b.score2) - Math.min(a.score, a.score2);
         return 0;
       })
       .slice(0, this.rank);
  }
}

  applyWeight() {
    this.selectednodes = this.selectednodes.map((item: any) => {
      return {
        ...item,
        score_dense: parseFloat(item.score_dense) + parseFloat(this.weight1),
        score_dense2: parseFloat(item.score_dense2) + parseFloat(this.weight2)
      };
    });

  }

  sendMessage() {
    if (this.userMessage.trim()) {
      // Add user message
      this.chatMessages.push({ role: 'user', content: this.userMessage });

      // Get response from OpenAI
      if(this.selectedUSerMessage) {
        this.selectedUSerMessage2 = this.userMessage;
        // this.fuzzyPopup = true
      } else {
        this.selectedUSerMessage = this.userMessage
      }
      let msg: any = this.selectedUSerMessage2 ? this.selectedUSerMessage2 : this.selectedUSerMessage
      this.selectednodes = []
      // if(!this.fuzzyPopup) {
        
      if(!this.selectedUSerMessage2) {
        
        this.openaiService.sendQueryNews3(msg,this.numberOfChunks).subscribe((response: any) => {
          this.selected = "query1"
          this.data = response

        // this.updateSimilarityScores(this.chartData.children, response.results, false )
        // this.chartData = {...this.chartData}
        // console.log(this.chartData)
  
        this.userMessage = ''; // Clear input
        });
      } else {
        this.openaiService.sendQueryNews4(this.selectedUSerMessage,this.selectedUSerMessage2,this.numberOfChunks).subscribe((response: any) => {

          this.selected = "query2"
          this.data = response
        // this.updateSimilarityScores(this.chartData.children, response.results, true )
        // this.chartData = {...this.chartData}
        // console.log(this.chartData)
  
        this.userMessage = ''; // Clear input
         });
      }
  
      // });
    // }
    
  }
}

items = ['World','Sci/Tech','Business','Sports']  
selectedForComparison: any[] = [];
selectedNodes(d: any): any {
this.selectednodes.push(d)
}

isSelectedForComparison(summary: any): boolean {
  return this.selectedForComparison.some(s => s.text === summary.text);
}
toggleSummarySelection(summary: any) {
  const index = this.selectedForComparison.findIndex(s => s.text === summary.text);
  if (index === -1) {
    if (this.selectedForComparison.length < 2) {
      this.selectedForComparison.push(summary);
    }
  } else {
    this.selectedForComparison.splice(index, 1);
  }
}

compareSummaries() {
  if (this.selectedForComparison.length === 2) {
    console.log('Comparing:', this.selectedForComparison);

    this.openaiService.compareText(this.selectedForComparison,this.selectedUSerMessage,this.selectedUSerMessage2)
    .subscribe({
      next: (result) => {
        this.summaryData = result;
        this.isLoading = false;
        console.log('Comparison result:', result);
      },
      error: (error) => {
        console.error('Error comparing summaries:', error);
        this.isLoading = false;
        // Handle error - maybe show a notification
      }
    });
    // Implement your comparison logic here
  }
}
removeCard(index: number) {
  this.selectednodes.splice(index, 1);
}


public exportAsExcelFile(json: any[], fileName: string = 'tsvg_file'): void {
  const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(json);
  const workbook: XLSX.WorkBook = {
    Sheets: { data: worksheet },
    SheetNames: ['data']
  };
  const excelBuffer: any = XLSX.write(workbook, {
    bookType: 'xlsx',
    type: 'array'
  });
  this.saveAsExcelFile(excelBuffer, fileName);
}

private saveAsExcelFile(buffer: any, fileName: string): void {
  const data: Blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8'
  });
  FileSaver.saveAs(data, `${fileName}.xlsx`);
}
}
