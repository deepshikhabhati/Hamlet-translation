import { ChangeDetectorRef, Component } from '@angular/core';
import { Version1 } from 'src/assets/Comp3_version1';
import { Version2 } from 'src/assets/Comp3_version2';
import { OpenaiService } from '../openai.service';
import { treeVersion1 } from 'src/assets/version1TreeData';
import { treeVersion2 } from 'src/assets/version2TreeData';

@Component({
  selector: 'app-comp3',
  templateUrl: './comp3.component.html',
  styleUrls: ['./comp3.component.css']
})
export class Comp3Component {
selectedForComparison: any = [];
  isLoading: boolean = false;
  comparisonResult: any = '';

  constructor(public openai: OpenaiService,public cr: ChangeDetectorRef) {
    this.findnodes()
  }
  selectedVersion1: any = ''
  version1Data: any = Version1
  version2Data: any = Version2
  public version1: any = treeVersion1
  public version2: any = treeVersion2
  selectedVersion2: any;
  isToggled = false;
  chatMessages: Array<{ role: string, content: string }> = [];
userMessage: any = '';
  selectedmessage: any = '';
  showChunkPopup = false;
  numberOfChunks = 1;


  nodeSelected(data: any) {
    
    this.selectedVersion1 = this.findTopic(this.version1Data,data.key)
    // if(data.key) {
      console.log(this.selectedVersion1)
    //     // Find matching key in sum object using partial match
    //     const matchingKey = Object.keys(sum).find(key => 
    //       data.key.toLowerCase().includes(key.toLowerCase()) || 
    //       key.toLowerCase().includes(data.key.toLowerCase())
    //     );

    //     console.log(matchingKey)
    //     if (matchingKey) {
    //     //   this.selectedSummary = sum[matchingKey].summary;
    //       let data: any = { ...sum[matchingKey],...select}
    //       this.selectedSummaries.push(data)
    //     //   this.selectedWords = sum[matchingKey].keywords;
    //     } else {
    //     //   this.selectedSummary = sum['root'].summary;
    //       this.selectedSummaries.push(sum['root'])
    //     //   this.selectedWords = sum['root'].keywords;
    //     }
    // }

  }

  nodeSelected2(data: any) {
    
    this.selectedVersion2 = this.findTopic(this.version2Data,data.key)
    console.log(this.selectedVersion2,data)
  

  }

  findTopic(data: any[], key: string): any | null {
    for (const item of data) {
      if (item.topic === key) {
        return item; // Return if the topic matches
      }
      
      if (item.subtopics) {
        const found = this.findTopic(item.subtopics, key); // Recursively search inside subtopics
        if (found) {
          return found;
        } else {

        }
      }
    }
    return null; // Return null if not found
  }

  
  findChild(data: any[], key: string): any | null {
    for (const item of data) {
      if (item.key === key) {
        return item; // Return if the topic matches
      }
      
      if (item.children) {
        const found = this.findTopic(item.children, key); // Recursively search inside subtopics
        if (found) {
          return found;
        } else {

        }
      }
    }
    return null; // Return null if not found
  }

  findnodes() {

    const topicPath1 = "Shakespeare the man/Life";
const topicPath2 = "Shakespeare the man/Life/Life_0/leaf_0";

console.log(findNodeByPath(this.version2.children, topicPath1)); // Finds "Life"
console.log(findNodeByPath(this.version2.children, topicPath2));
    
function findNodeByPath(tree: any[], path: string): any | null {
  const pathSegments = path.split("/");

  function search(nodes: any[], index: number): any | null {
    if (index >= pathSegments.length) return null;

    for (const node of nodes) {
      if (node.key === pathSegments[index] || node.name === pathSegments[index]) {
        if (index === pathSegments.length - 1) {
          return node; // Found the target node
        }
        if (node.children) {
          return search(node.children, index + 1);
        }
      }
    }
    return null;
  }

  return search(tree, 0);
}
  }

  compareSummaries() {
    if (this.selectedForComparison.length === 2) {
      this.isLoading = true;
      this.openai.compareSummaries(this.selectedForComparison)
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

  
  sendMessage() {
    // if (!this.userMessage.trim()) return;
    this.selectedmessage = this.userMessage
    // Add user message to chat
    this.chatMessages.push({ role: 'user', content: this.userMessage });
  
    // Get response from OpenAI
    this.openai.sendQuery(this.userMessage,this.numberOfChunks).subscribe((response: any) => {
      // const aiResponse = response.choices[0].message.content;
      // this.chatMessages.push({ role: 'assistant', content: aiResponse });

      this.updateSimilarityScores(this.version1.children, response.results)
      this.version1 = {...this.version1}
      this.cr.detectChanges()
      // }

      console.log(this.version1)

    });

    this.openai.sendQuery2(this.userMessage,this.numberOfChunks).subscribe((response: any) => {
      // const aiResponse = response.choices[0].message.content;
      // this.chatMessages.push({ role: 'assistant', content: aiResponse });

     this.updateSimilarityScores(this.version2.children, response.results)
     this.version2 = {...this.version2}
      console.log(this.version2)
    });
  }

  handleCardSelection(event: {node: any}) {
    console.log('Selected node:', event.node);
    console.log('Checkbox state:');
    if(this.userMessage) {
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
    this.openai.askQuery(this.userMessage,data).subscribe((res: any) => {
      console.log(res)
      const aiResponse = res.response;
      this.chatMessages.push({ role: 'assistant', content: aiResponse });

    })
  }

  openChunkPopup() {
    this.showChunkPopup = true;
  }

  confirmChunks() {
    // Handle the number of chunks here
    console.log('Number of chunks selected:', this.numberOfChunks);
    this.showChunkPopup = false;
  }
}
