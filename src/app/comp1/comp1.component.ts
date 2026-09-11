import { ChangeDetectorRef, Component } from '@angular/core';
import OpenAI from "openai";
import { Data2 } from 'src/assets/query6';
import  {Data3 } from 'src/assets/DATA3'
import { summary } from 'src/assets/summary';
import { OpenaiService } from '../openai.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';
// import { adam } from 'src/assets/adam';
@Component({
  selector: 'app-comp1',
  templateUrl: './comp1.component.html',
  styleUrls: ['./comp1.component.css']
})
export class Comp1Component {
  prompt: string = '';
  response: any;

public data: any = ""
heatmapData = [];
rootWordCloud: any = [
    "Quantum Computing", "Qubit", "Superposition", "Entanglement",
    "Quantum Supremacy", "Algorithms", "Cryptography", "Machine Learning",
    "Simulation", "Quantum Turing Machine", "Adiabatic Computing",
    "Quantum Networks", "Error Correction", "Grover's Algorithm",
    "Shor's Algorithm", "Quantum Gates", "Decoherence", "IBM", "Google AI",
    "NISQ", "Optimization", "Quantum Key Distribution", "Post-Quantum Cryptography",
    "Quantum Annealing", "Quantum Sensors", "Quantum Parallelism"
  ];

 selectedButton: any = 'Summary' 
umapData2: any = Data2;
umapData3: any = Data3;
  load:boolean = false
  uploadLoader: boolean = false
  imageData: any = 'null';
  chunk_length = 0
  umapdatalabels3: any = [
    "quantum Computing",
    "History",
    "Quantum information processing",
    "Quantum information",
    "Unitary operators",
    "Quantum parallelism",
    "Quantum programming",
    "Gate array",
    "Measurement-based quantum computing array",
    "Adiabatic quantum computing",
    "Neuromorphic quantum computing",
    "Topological quantum computing",
    "Noisy intermediate-scale quantum computing",
    "Quantum Turing machine",
    "Quantum cryptography and cybersecurity",
    "Communication",
    "Algorithms",
    "Simulation of quantum systems",
    "Post-quantum cryptography",
    "Search problems",
    "Quantum annealing",
    "Machine learning",
    "Engineering",
    "Challenges",
    "Decoherence",
    "Quantum supremacy",
    "Skepticism",
    "Physical realizations",
    "Potential applications",
    "Computability",
    "Complexity",
    "Notes",
    "Sources",
    "Textbooks",
    "Academic papers",
    "External links"
]
treeData = {
    name: "Root",
    similarity_score: 0,
    children: [
      {
        name: "Category A",
        similarity_score: 1,
        children: [
          { name: "Sub A1", similarity_score: 0 },
          { name: "Sub A2", similarity_score: 2 }
        ]
      },
      {
        name: "Category B",
        similarity_score: 0,
        children: [
          { name: "Sub B1", similarity_score: 3 },
          { name: "Sub B2", similarity_score: 0 }
        ]
      }
    ]
  };
  sunburstData = {
    name: "Root",
    children: [
      {
        name: "Category A",
        children: [
          { name: "Sub A1", value: 100 },
          { name: "Sub A2", value: 200 }
        ]
      },
      {
        name: "Category B",
        children: [
          { name: "Sub B1", value: 150 },
          { name: "Sub B2", value: 250 }
        ]
      }
    ]
  };
umapdatalabels2: any = [
    "quantum Computing",
    "History",
    "Quantum information processing",
    "Quantum information",
    "Unitary operators",
    "Quantum parallelism",
    "Quantum programming",
    "Quantum cryptography and cybersecurity",
    "Communication",
    "Algorithms",
    "Simulation of quantum systems",
    "Post-quantum cryptography",
    "Search problems",
    "Quantum annealing",
    "Machine learning",
    "Engineering",
    "Challenges",
    "Quantum supremacy",
    "Skepticism",
    "Physical realizations",
    "Potential applications",
    "Computability",
    "Complexity",
    "Notes",
    "Sources",
    "Textbooks",
    "Academic papers",
    "External links"
]
umapdatalabels: any = [
    "quantum Computing",
    "History",
    "Quantum information processing",
    "Communication",
    "Algorithms",
    "Engineering",
    "Potential applications",
    "Theory",
    "Notes",
    "Sources",
    "Further reading",
    "External links"
]
selectedTopic: any = ''
selectedSubTopic: any = ''
selectedRoot: any = '';
  selectedFile: any;
  extractedText: string = '';
  userMessage: string = '';
  chatMessages: any[] = [];
  isVisible: boolean = false;
  selectedSummaries: any = []
  comparisonResult: any = null;
  isLoading: boolean = false;
  field1: string = '';
  field2: string = '';
  field3: string = '';
    level1: boolean = false;
    level2: boolean = false;
    root: boolean = false;
    level3: boolean = false;
    selectedSummary: any;
    selectedWords: any;
  selectedForComparison: any[] = [];
  showChunkPopup: boolean = false;
  numberOfChunks: number = 1;
    selectedUSerMessage: string = '';
    showClassicTree = true;

    toggleTreeView() {
      this.showClassicTree = !this.showClassicTree;
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
  handleCardSelection(event: {node: any}) {
    console.log('Selected node:', event.node);
    console.log('Checkbox state:');
    if(this.selectedUSerMessage) {
    //   this.selectedForComparison.push(event.node)
      console.log(this.selectedForComparison)
      this.selectedData(event.node.content)
    }
    // Handle the selection here
  }

  isSelectedForComparison(summary: any): boolean {
    return this.selectedForComparison.some(s => s.name === summary.name);
  }

  compareSummaries() {
    if (this.selectedForComparison.length === 2) {
      console.log('Comparing:', this.selectedForComparison);

      this.openaiService.compareSummaries(this.selectedForComparison)
      .subscribe({
        next: (result) => {
          this.comparisonResult = result;
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
  constructor(private openaiService: OpenaiService,private http: HttpClient,public cr: ChangeDetectorRef) {
this.openaiService.getdtaa().subscribe()
let colors:any = []
let repeatedColors: any = []
let obj1:any = []
let obj2:any = []
let obj3:any = []


  }

  getResponse() {
    this.openaiService.generateResponse(this.prompt).subscribe({
      next: (data) => this.response = data,
      error: (err) => console.error(err)
    });
  }

  updateSimilarityScores(treeData: any[], similarityData: any[]) {
    function searchAndUpdate(nodes: any[], pathSegments: string[], index: number, score: number,rank: number): boolean {
      if (index >= pathSegments.length) return false;
  
      for (const node of nodes) {
        if (node.key === pathSegments[index+1] || node.name === pathSegments[index+1]) {
          if (index === pathSegments.length - 2) {
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
    if (this.userMessage.trim()) {
      // Add user message
      this.chatMessages.push({ role: 'user', content: this.userMessage });
  
      // Get response from OpenAI
      this.selectedUSerMessage = this.userMessage
      this.openaiService.sendQuery3(this.selectedUSerMessage,this.numberOfChunks).subscribe((response: any) => {
        // const aiResponse = response.choices[0].message.content;
        // this.chatMessages.push({ role: 'assistant', content: aiResponse });
  
        this.updateSimilarityScores(this.data.children, response.results)
        this.data = {...this.data}
        console.log(this.data)
        this.cr.detectChanges()

        // }
  
        this.userMessage = ''; // Clear input
  
      });
  
    }
  }

  setHeatMapData(data: any) {
    this.heatmapData = data
  }

  nodeSelected(data: any) {
    console.log(data)
  let sum: any = summary
  let select: any = {}
  this.selectedSummaries.push(data)

  }

  onFile(event: any): void {
    this.selectedFile = event.target.files[0];
    console.log(this.selectedFile)
  }

  onFileSelected(event: any): void {
    console.log(this.selectedFile)
    this.uploadLoader = true
    this.openaiService.sendPDF(this.selectedFile,this.field1,this.field2).subscribe((res: any) => {
      console.log(res)
      this.chatMessages.push({ role: 'user', content: 'UPloaded ' + this.selectedFile.name });
      this.chunk_length = res.chunks
      this.isVisible = false;
      this.uploadLoader = false;
      // this.extractedText = res.results
    })
  }
  closePopup() {
    this.isVisible = false;
  }

  showPopup() {
    this.isVisible = true;
  }
  submit() {
    console.log('Field 1:', this.field1);
    console.log('Field 2:', this.field2);
    console.log('Field 3:', this.field3);
    this.closePopup();
  }

  selectedData(data: any) {

    let augmented_prompt = `"""Using the contexts below, answer the query.

    Contexts:
    ${data}

    Query: ${this.userMessage}`
    this.chatMessages.push({ role: 'user', content: data });
    this.openaiService.askQuery(this.selectedUSerMessage,data).subscribe((res: any) => {
      console.log(res)
      const aiResponse = res.response;
      this.chatMessages.push({ role: 'assistant', content: aiResponse });

    })
  }

  handleHeaderButton(buttonName: string) {
    console.log('Selected button:', buttonName);
    this.selectedButton =  buttonName;
    // Add your logic here based on the selected button
  }

  openChunkPopup() {
    this.showChunkPopup = true;
  }

  confirmChunks() {
    // Handle chunk confirmation logic
    console.log(`Selected ${this.numberOfChunks} chunks`);
    this.showChunkPopup = false;
  }
}
