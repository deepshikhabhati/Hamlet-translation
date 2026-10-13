import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface DialogueNode {
  id: string;
  speaker: string;
  textPreview: string;
  ftln: string;
  data: any;
}

export interface SceneScore {
  human_german: number | string;
  ai_german: number | string;
  context_ai_german: number | string;
  [key: string]: number | string;
}

export interface SceneNode {
  id: string;
  sceneNumber: number;
  title: string;
  scores: SceneScore;
  data: any;
  expanded: boolean;
  dialogues: DialogueNode[];
}

export interface ActNode {
  id: string;
  actNumber: number;
  expanded: boolean;
  scenes: SceneNode[];
}

@Component({
  selector: 'app-full-book-navigator',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './full-book-navigator.component.html',
  styleUrls: ['./full-book-navigator.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FullBookNavigatorComponent implements OnChanges {
  @Input() data: any[] = [];
  @Input() dialogues: any[] = [];
  @Output() sceneSelected = new EventEmitter<{act: number, scene: number}>();
  @Output() dialogueSelected = new EventEmitter<any>();
  @Input() selectedDialogueId: string | null = null;

  acts: ActNode[] = [];
  @Input() selectedDimension: string = 'semantic';
  @Output() dimensionChange = new EventEmitter<string>();
  @Input() selectedTarget: string = 'context_ai_german';
  @Output() targetChange = new EventEmitter<string>();
  
  dimensions = [
    { value: 'semantic', label: 'Semantic Preservation' },
    { value: 'emotion', label: 'Emotion Preservation' },
    { value: 'tone', label: 'Tone Preservation' },
    { value: 'metaphor', label: 'Metaphor Preservation' }
  ];

  actColors: Record<number, string> = {
    1: '#3158c8',
    2: '#bd3035',
    3: '#168ea5',
    4: '#aa6718',
    5: '#7132b8'
  };

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['data'] || changes['dialogues'] || changes['selectedDimension']) && this.data && this.dialogues) {
      this.buildTree();
    }
  }

  onDimensionChange() {
    this.dimensionChange.emit(this.selectedDimension);
    this.buildTree();
  }

  buildTree() {
    const actMap = new Map<number, ActNode>();
    
    this.data.forEach(sceneData => {
      const actNum = sceneData.act || 1;
      const sceneNum = sceneData.scene || 1;
      
      if (!actMap.has(actNum)) {
        actMap.set(actNum, {
          id: `act-${actNum}`, 
          actNumber: actNum, 
          expanded: true, 
          scenes: []
        });
      }
      
      const act = actMap.get(actNum)!;
      
      const getScore = (target: string) => {
        const comp = sceneData.comparisons?.find((c: any) => c.source_version === 'english' && c.target_version === target);
        if (comp && comp.dimensions && comp.dimensions[this.selectedDimension]) {
          return comp.dimensions[this.selectedDimension].score;
        }
        return '-';
      };

      act.scenes.push({
        id: sceneData.scene_id,
        sceneNumber: sceneNum,
        title: sceneData.title || `Scene ${sceneNum}`,
        scores: {
          human_german: getScore('human_german'),
          ai_german: getScore('ai_german'),
          context_ai_german: getScore('context_ai_german')
        },
        data: sceneData,
        expanded: false,
        dialogues: []
      });
    });

    this.acts = Array.from(actMap.values()).sort((a, b) => a.actNumber - b.actNumber);

    this.acts.forEach(a => {
      a.scenes.sort((s1, s2) => s1.sceneNumber - s2.sceneNumber);
    });

    // Populate dialogues
    this.dialogues.forEach(d => {
      const actNum = d.act || 1;
      const sceneNum = d.scene || 1;
      const act = this.acts.find(a => a.actNumber === actNum);
      if (act) {
        const scene = act.scenes.find(s => s.sceneNumber === sceneNum);
        if (scene) {
          scene.dialogues.push({
            id: d.dialogue_id || d.passage_id,
            speaker: d.speaker || 'UNKNOWN',
            textPreview: d.texts?.english?.substring(0, 40) + '...' || '',
            ftln: d.ftln?.start ? `FTLN ${d.ftln.start}-${d.ftln.end}` : '',
            data: d
          });
        }
      }
    });
  }

  toggleScene(scene: SceneNode, event: Event) {
    event.stopPropagation();
    scene.expanded = !scene.expanded;
  }

  selectDialogue(dialogue: DialogueNode) {
    this.dialogueSelected.emit(dialogue.data);
  }

  trackByDialogue(index: number, dialogue: DialogueNode): string {
    return dialogue.id;
  }


  toggleAct(act: ActNode) {
    act.expanded = !act.expanded;
  }

  selectScene(scene: SceneNode) {
    this.sceneSelected.emit({ act: scene.data.act, scene: scene.data.scene });
  }

  trackByAct(index: number, act: ActNode): string {
    return act.id;
  }

  trackByScene(index: number, scene: SceneNode): string {
    return scene.id;
  }

  getScore(scene: SceneNode): number | string {
    return scene.scores[this.selectedTarget];
  }

  getScoreWidth(scene: SceneNode): string {
    const score = this.getScore(scene);
    if (score === '-') return '0%';
    return `${score}%`;
  }

  getActScore(act: ActNode): number | string {
    const validScores = act.scenes
      .map(s => this.getScore(s))
      .filter(s => typeof s === 'number') as number[];
    if (validScores.length === 0) return '-';
    return Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length);
  }

  getActScoreWidth(act: ActNode): string {
    const score = this.getActScore(act);
    if (score === '-') return '0%';
    return `${score}%`;
  }

  getScoreColor(score: number | string): string {
    if (typeof score !== 'number') return '#e2e8f0';
    if (score >= 90) return '#14532d';
    if (score >= 80) return '#166534';
    if (score >= 70) return '#15803d';
    if (score >= 60) return '#16a34a';
    if (score >= 50) return '#22c55e';
    if (score >= 40) return '#4ade80';
    return '#86efac';
  }

  setTarget(target: string) {
    if (this.selectedTarget !== target) {
      this.selectedTarget = target;
      this.targetChange.emit(target);
    }
  }

}
