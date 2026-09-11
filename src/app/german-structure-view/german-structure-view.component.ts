import { Component } from '@angular/core';
import { german } from 'src/assets/german';

@Component({
  selector: 'app-german-structure-view',
  templateUrl: './german-structure-view.component.html',
  styleUrls: ['./german-structure-view.component.css']
})
export class GermanStructureViewComponent {
  topicData: any[] = this.cloneTopics(german.children || []);
  selectedNode: any = null;
  selectedNodes: string[] = [];
  nodeName = '';
  numberOfChunks = 100;

  onTopicClicked(node: any): void {
    this.selectedNode = node;
    this.nodeName = node?.name || '';
  }

  getKeywords(): string[] {
    return Array.isArray(this.selectedNode?.keys) ? this.selectedNode.keys : [];
  }

  private cloneTopics(topics: any[]): any[] {
    return topics.map((topic) => ({
      ...topic,
      children: Array.isArray(topic.children) ? this.cloneTopics(topic.children) : []
    }));
  }
}
