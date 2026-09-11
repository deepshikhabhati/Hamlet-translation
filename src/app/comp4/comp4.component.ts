import { Component } from '@angular/core';
import { News } from 'src/assets/news';
import { OpenaiService } from '../openai.service';
@Component({
  selector: 'app-comp4',
  templateUrl: './comp4.component.html',
  styleUrls: ['./comp4.component.css']
})
export class Comp4Component {

  data: any = News
  chatMessages: any[] = [];
    userMessage: any = ''
  showChunkPopup: boolean = false;
  selectedUSerMessage: any;
  selectedUSerMessage2: any;
  selectednodes: any[] = [];

  selected: any = 'Query1'
  querysent: boolean = false;
  numberOfChunks: any = 7900
  isLoading: boolean = false;
  summaryData: any;
  selectedMode: string = 'dense';
  constructor(public openaiService: OpenaiService) {}
    
  openChunkPopup() {
    this.showChunkPopup = true;
  }


  select(mode: string) {
    this.selected = mode;
    // this.initChart();
  }

  selctMode(mode: string) {
    this.selectedMode = mode;
    // this.initChart();
  }

  filterData(data: any){
   
    this.selectednodes = this.data.filter((d: any) => {
      if (this.selected === "query1") {
        return d.score >= data.minScore && d.score <= data.maxScore;
      } else if (this.selected === "query2") {
        return d.score2 >= data.minScore && d.score2 <= data.maxScore;
      } else if (this.selected === "Union") {
        const maxScore = Math.max(d.score, d.score2);
        return maxScore >= data.minScore && maxScore <= data.maxScore;
      } else if (this.selected === "Intersection") {
        const score1 = d.score_dense;
        const score2 = d.score_dense2;
        return score1 >= data.minScore && score1 <= data.maxScore &&
               score2 >= data.minScore && score2 <= data.maxScore;
      }
      return true;
    })
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
        
        this.openaiService.sendQueryNews(msg,this.numberOfChunks).subscribe((response: any) => {
             this.selected = "query1"
          this.data = response
          this.numberOfChunks++;

        // this.updateSimilarityScores(this.chartData.children, response.results, false )
        // this.chartData = {...this.chartData}
        // console.log(this.chartData)
  
        this.userMessage = ''; // Clear input
        });
      } else {
        this.openaiService.sendQueryNews2(this.selectedUSerMessage,this.selectedUSerMessage2,this.numberOfChunks).subscribe((response: any) => {

          this.selected = "query2"
          this.data = response
          this.numberOfChunks++;
        // this.updateSimilarityScores(this.chartData.children, response.results, true )
        // this.chartData = {...this.chartData}
        // console.log(this.chartData)
  
        this.userMessage = ''; // Clear input
         });
      }
  
      // });
    // }
    

    if(this.selectedUSerMessage2) {
      this.openaiService.findFuzzy(this.selectedUSerMessage,this.selectedUSerMessage2,this.numberOfChunks).subscribe((response: any) => {
        const data: any = response.results;
        const total = data.length;
        // this.updateSimilarityScores2(this.chartData.children, data,true)
              // this.chartData = {...this.chartData}
        const sumUnion = data.reduce((acc: any, item: any) => acc + item.fuzzy_union, 0);
        const sumIntersection = data.reduce((acc: any, item: any) => acc + item.fuzzy_intersection, 0);
        
        const avgUnion = sumUnion / total;
        const avgIntersection = sumIntersection / total;
        console.log("Average Fuzzy Union:", avgUnion);
        console.log("Average Fuzzy Intersection:", avgIntersection);
        
        // this.CommonBarData = [
        //   { label: 'Fuzzy Union', value: avgUnion },
        //   { label: 'Fuzzy Intersection', value: avgIntersection },
        // ]
        // console.log(this.chartData)
      })


    }
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
}
