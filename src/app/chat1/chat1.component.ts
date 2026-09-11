import { Component, EventEmitter, Output } from '@angular/core';
import { OpenaiService } from '../openai.service';

@Component({
  selector: 'app-chat1',
  templateUrl: './chat1.component.html',
  styleUrls: ['./chat1.component.css']
})
export class Chat1Component {
  @Output() resultSelected = new EventEmitter<any>();
public isVisible: boolean = true;
field1: string = '';
field2: string = '';
field3: string = '';
data1: any = []
selectedFile: any;
uploadLoader: boolean = false;
scatterplotdata: any = [];
models = [ "text-embedding-3-small",
  "text-embedding-3-large",
  "text-embedding-ada-002",
 "all-mpnet-base-v2",
  "all-MiniLM-L6-v2",
  "multi-qa-mpnet-base-dot-v1"]
  selectedModel = "text-embedding-3-small";
chatMessages: Array<{ role: string, content: string }> = [];
  extractedText: any;
  userMessage: any;
  load: boolean= false;
  selectedmessage: any;
constructor(public openaiService: OpenaiService) {
// this.openaiService.getScatterPlotData().subscribe()
}

selectModel(model: any) {
this.selectedModel = model
}
closePopup() {
  this.isVisible = false;
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
    // this.chunk_length = res.chunks
    this.isVisible = false;
    this.uploadLoader = false;
    // this.extractedText = res.results
  })
}

sendMessage() {
  // if (!this.userMessage.trim()) return;
  this.load = true
  this.selectedmessage = this.userMessage
  // Add user message to chat
  this.chatMessages.push({ role: 'user', content: this.userMessage });

  // Get response from OpenAI
  this.openaiService.sendQuery(this.userMessage,this.field2,this.field1).subscribe((response: any) => {
    // const aiResponse = response.choices[0].message.content;
    // this.chatMessages.push({ role: 'assistant', content: aiResponse });

    this.extractedText = response.results;
    this.resultSelected.emit(this.extractedText)
  });

  // this.openaiService.sendQueryfor3d(this.userMessage,this.field2,this.field1).subscribe((response: any) => {
  //   // const aiResponse = response.choices[0].message.content;
  //   // this.chatMessages.push({ role: 'assistant', content: aiResponse });

  //  console.log(response.results.matrix);
  //  this.scatterplotdata = response.results.matrix;
  // });

  // Clear the input field
  // this.userMessage = '';
}

selectedData(data: any) {

  let augmented_prompt = `"""Using the contexts below, answer the query.

  Contexts:
  ${data}

  Query: ${this.userMessage}`
  this.chatMessages.push({ role: 'user', content: augmented_prompt });
  this.openaiService.askQuery(this.userMessage,data).subscribe((res: any) => {
    console.log(res)
    const aiResponse = res.response;
    this.chatMessages.push({ role: 'assistant', content: aiResponse });

  })
}

}
