import { Component } from '@angular/core';
import { OpenaiService } from '../openai.service';
import { AI } from 'src/assets/AI';


@Component({
  selector: 'app-comp2',
  templateUrl: './comp2.component.html',
  styleUrls: ['./comp2.component.css']
})
export class Comp2Component {
  selectedButton: string = 'Summary';
  selectedForComparison: any[] = [];
  selectedSummaries: any[] = [];
  comparisonResult: any = null;
  isLoading: boolean = false;
  data: any = AI;
  umapData: any;
  userMessage: string = '';
  umapData2: any;
  umapData3: any;
  showChunkPopup: boolean = false;
  numberOfChunks: number = 1;
  heatmapData: any[] = [];
  chatMessages: any[] = [];
  selectedUSerMessage: string = '';

  constructor(private summaryService: OpenaiService) {}

  nodeSelected(data: any) {
    console.log(data)
  let select: any = {}
  this.selectedSummaries.push(data)

  }

  toggleSummarySelection(summary: any) {
    const index = this.selectedForComparison.findIndex(s => s.name === summary.name);
    if (index === -1) {
      if (this.selectedForComparison.length < 2) {
        this.selectedForComparison.push(summary);
      }
    } else {
      this.selectedForComparison.splice(index, 1);
    }
  }

  isSelectedForComparison(summary: any): boolean {
    return this.selectedForComparison.some(s => s.name === summary.name);
  }

  compareSummaries() {
    if (this.selectedForComparison.length === 2) {
      this.isLoading = true;
      this.summaryService.compareSummaries(this.selectedForComparison)
        .subscribe((result: any) => {
            this.comparisonResult = result;
            this.isLoading = false;
          }), ((error: any) => {
            console.error('Error comparing summaries:', error);
            this.isLoading = false;
          }
        );
    }
  }
  handleCardSelection(event: {node: any}) {
    console.log('Selected node:', event.node);
    console.log('Checkbox state:');
    if(this.selectedUSerMessage) {
      this.selectedForComparison.push(event.node)
      console.log(this.selectedForComparison)
      this.selectedData(event.node.content)
    }
    // Handle the selection here
  }

  selectedData(data: any) {

    let augmented_prompt = `"""Using the contexts below, answer the query.

    Contexts:
    ${data}

    Query: ${this.userMessage}`
    this.chatMessages.push({ role: 'user', content: data });
    this.summaryService.askQuery(this.selectedUSerMessage,data).subscribe((res: any) => {
      console.log(res)
      const aiResponse = res.response;
      this.chatMessages.push({ role: 'assistant', content: aiResponse });

    })
  }

  sendMessage() {
    // if (!this.userMessage.trim()) return;
    // this.selectedmessage = this.userMessage
    // Add user message to chat
    this.chatMessages.push({ role: 'user', content: this.userMessage });
  
    // Get response from OpenAI
    this.selectedUSerMessage = this.userMessage
    this.summaryService.sendQuery4(this.userMessage,this.numberOfChunks).subscribe((response: any) => {
      // const aiResponse = response.choices[0].message.content;
      // this.chatMessages.push({ role: 'assistant', content: aiResponse });

      this.updateSimilarityScores(this.data.children, response.results)
      this.data = {...this.data}
      // this.cr.detectChanges()
      // }

      console.log(this.data)

    });

  }

  updateSimilarityScores(treeData: any[], similarityData: any[]) {
    function searchAndUpdate(nodes: any[], pathSegments: string[], index: number, score: number,rank: number): boolean {
      if (index >= pathSegments.length) return false;
  
      for (const node of nodes) {
        if (node.key === pathSegments[index] || node.name === pathSegments[index]) {
          if (index === pathSegments.length - 1) {
            node.similarity_score = score;
            node.rank = rank // Assign similarity score
            return true;
          }
          if (node.children) {
            return searchAndUpdate(node.children, pathSegments, index + 1, score,rank);
          }
        }
      }
      return false;
    }
  
    similarityData.forEach(({ topic_path, similarity_score,rank }) => {
      const pathSegments = topic_path.split("/");
      searchAndUpdate(treeData, pathSegments, 0, similarity_score,rank);
    });
  }


  openChunkPopup() {
    this.showChunkPopup = true;
  }

  confirmChunks() {
    // Handle chunk confirmation logic
    console.log(`Selected ${this.numberOfChunks} chunks`);
    this.showChunkPopup = false;
  }

  setHeatMapData(data: any) {
    this.heatmapData = data;
  }
}
