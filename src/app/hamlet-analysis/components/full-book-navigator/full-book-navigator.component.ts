import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  OnChanges,
  SimpleChanges
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  AnalysisAct,
  AnalysisScene,
  AnalysisDialogue,
  DIMENSION_DEFINITIONS
} from '../../models/hamlet-analysis-v15.models';
import {
  HUMAN_SCORE_HEATMAP,
  getHeatmapThreshold,
  formatHumanScore
} from '../../models/heatmap-config';

export interface DialogueNode {
  id: string;
  speaker: string;
  textPreview: string;
  fullText: string;
  score: number | null;
  data: AnalysisDialogue;
}

export interface SceneNode {
  id: string;
  actNumber: number;
  sceneNumber: number;
  title: string;
  humanScore: number | null;
  units: number;
  expanded: boolean;
  dialogues: DialogueNode[];
  data: AnalysisScene;
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
  @Input() actsData: AnalysisAct[] = [];
  @Input() data: any[] = [];
  @Input() dialogues: any[] = [];

  @Input() selectedActId: number | null = 1;
  @Input() selectedSceneId: string | null = null;
  @Input() selectedDialogueId: string | null = null;

  @Input() selectedDimension: string = 'semantic';
  @Output() dimensionChange = new EventEmitter<string>();

  @Output() actSelected = new EventEmitter<number>();
  @Output() sceneSelected = new EventEmitter<{ act: number; sceneId: string; sceneNumber: number }>();
  @Output() dialogueSelected = new EventEmitter<{ act: number; sceneId: string; dialogueId: string; dialogue: AnalysisDialogue }>();

  searchQuery = '';
  acts: ActNode[] = [];

  readonly dimensions = DIMENSION_DEFINITIONS.map(d => ({
    value: d.key,
    label: d.name
  }));

  actColors: Record<number, string> = {
    1: '#1e3a8a',
    2: '#0369a1',
    3: '#0f766e',
    4: '#374151',
    5: '#4b5563'
  };

  ngOnChanges(changes: SimpleChanges): void {
    if (
      changes['actsData'] ||
      changes['data'] ||
      changes['dialogues'] ||
      changes['selectedDimension']
    ) {
      this.buildTree();
    } else if (changes['selectedDialogueId'] && this.selectedDialogueId) {
      this.ensureDialogueVisible(this.selectedDialogueId);
    }
  }

  ensureDialogueVisible(dialogueId: string): void {
    for (const act of this.acts) {
      for (const scene of act.scenes) {
        if (scene.dialogues.some(d => d.id === dialogueId)) {
          act.expanded = true;
          scene.expanded = true;
          if (typeof document !== 'undefined') {
            const el = document.querySelector('.toc-dialogue-row--selected');
            if (el && typeof el.scrollIntoView === 'function') {
              el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }
          }
          return;
        }
      }
    }
  }


  onDimensionChange(): void {
    this.dimensionChange.emit(this.selectedDimension);
    this.buildTree();
  }

  buildTree(): void {
    if (this.actsData && this.actsData.length > 0) {
      this.buildFromActsData();
      return;
    }

    if (this.data && this.data.length > 0) {
      this.buildFromLegacyData();
    }
  }

  private buildFromActsData(): void {
    const query = this.searchQuery.trim().toLowerCase();

    this.acts = this.actsData.map(act => {
      // Keep expansion state if already created, or expand Act 1 by default
      const existingAct = this.acts.find(a => a.actNumber === act.act);
      const isActExpanded = existingAct
        ? existingAct.expanded
        : act.act === 1 || !!query;

      const scenes: SceneNode[] = act.scenes.map(scene => {
        const existingScene = existingAct?.scenes.find(s => s.id === scene.scene_id);
        const isSceneExpanded = existingScene
          ? existingScene.expanded
          : (scene.scene_id === this.selectedSceneId && !!this.selectedDialogueId) || !!query;

        // Human German score for selected dimension
        let humanScore: number | null = null;
        let units = 0;
        if (scene.scores?.human_german?.[this.selectedDimension]) {
          const scoreObj = scene.scores.human_german[this.selectedDimension];
          humanScore = scoreObj.score;
          units = scoreObj.units;
        } else if (scene.dialogues && scene.dialogues.length > 0) {
          let sumWeight = 0;
          let sumWeightedScore = 0;
          scene.dialogues.forEach(dlg => {
            const ana = dlg.analysis?.human_german?.[this.selectedDimension];
            if (ana && ana.applicable && ana.score !== null && ana.score !== undefined) {
              const weight = dlg.texts?.english?.length || 10;
              sumWeight += weight;
              sumWeightedScore += ana.score * weight;
              units++;
            }
          });
          humanScore = sumWeight > 0 ? Math.round((sumWeightedScore / sumWeight) * 10) / 10 : null;
        }

        const dialogues: DialogueNode[] = (scene.dialogues || []).map(dlg => {
          const eng = dlg.texts?.english || '';
          const preview = eng.length > 55 ? eng.substring(0, 52) + '…' : eng;
          const dlgScore = dlg.analysis?.human_german?.[this.selectedDimension]?.score ?? null;

          return {
            id: dlg.dialogue_id,
            speaker: dlg.speaker || 'UNKNOWN',
            textPreview: preview,
            fullText: eng,
            score: dlgScore,
            data: dlg
          };
        });

        // Filter dialogues if query present
        const filteredDialogues = query
          ? dialogues.filter(d =>
              d.id.toLowerCase().includes(query) ||
              d.speaker.toLowerCase().includes(query) ||
              d.fullText.toLowerCase().includes(query)
            )
          : dialogues;

        return {
          id: scene.scene_id,
          actNumber: act.act,
          sceneNumber: scene.scene_number || Number(scene.scene_id.replace(/\D/g, '')),
          title: scene.title || `Scene ${scene.scene_number || scene.scene_id}`,
          humanScore,
          units,
          expanded: query ? filteredDialogues.length > 0 : isSceneExpanded,
          dialogues: filteredDialogues,
          data: scene
        };
      });

      // Filter scenes if query present
      const filteredScenes = query
        ? scenes.filter(s =>
            s.title.toLowerCase().includes(query) ||
            s.id.toLowerCase().includes(query) ||
            s.dialogues.length > 0
          )
        : scenes;

      return {
        id: `act-${act.act}`,
        actNumber: act.act,
        expanded: query ? filteredScenes.length > 0 : isActExpanded,
        scenes: filteredScenes
      };
    });
  }

  private buildFromLegacyData(): void {
    const actMap = new Map<number, ActNode>();

    this.data.forEach(sceneData => {
      const actNum = sceneData.act || 1;
      const sceneNum = sceneData.scene || 1;

      if (!actMap.has(actNum)) {
        actMap.set(actNum, {
          id: `act-${actNum}`,
          actNumber: actNum,
          expanded: actNum === 1,
          scenes: []
        });
      }

      const act = actMap.get(actNum)!;
      let humanScore: number | null = null;
      const comp = sceneData.comparisons?.find(
        (c: any) => c.source_version === 'english' && c.target_version === 'human_german'
      );
      if (comp && comp.dimensions && comp.dimensions[this.selectedDimension]) {
        humanScore = comp.dimensions[this.selectedDimension].score;
      }

      act.scenes.push({
        id: sceneData.scene_id || `A${actNum}-S${sceneNum}`,
        actNumber: actNum,
        sceneNumber: sceneNum,
        title: sceneData.title || `Scene ${sceneNum}`,
        humanScore,
        units: 0,
        expanded: false,
        dialogues: [],
        data: sceneData
      });
    });

    this.acts = Array.from(actMap.values()).sort((a, b) => a.actNumber - b.actNumber);
    this.acts.forEach(a => a.scenes.sort((s1, s2) => s1.sceneNumber - s2.sceneNumber));

    // Populate dialogues
    if (this.dialogues && this.dialogues.length > 0) {
      this.dialogues.forEach(d => {
        const actNum = d.act || 1;
        const sceneNum = d.scene || 1;
        const act = this.acts.find(a => a.actNumber === actNum);
        if (act) {
          const scene = act.scenes.find(s => s.sceneNumber === sceneNum);
          if (scene) {
            const eng = d.texts?.english || '';
            scene.dialogues.push({
              id: d.dialogue_id || d.passage_id,
              speaker: d.speaker || 'UNKNOWN',
              textPreview: eng.length > 55 ? eng.substring(0, 52) + '…' : eng,
              fullText: eng,
              score: null,
              data: d
            });
          }
        }
      });
    }
  }

  onSearchChange(): void {
    this.buildTree();
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.buildTree();
  }

  toggleAct(act: ActNode, event?: Event): void {
    if (event) event.stopPropagation();
    act.expanded = !act.expanded;
  }

  toggleScene(scene: SceneNode, event: Event): void {
    event.stopPropagation();
    scene.expanded = !scene.expanded;
  }

  selectActNode(act: ActNode): void {
    this.actSelected.emit(act.actNumber);
  }

  selectSceneNode(scene: SceneNode): void {
    this.sceneSelected.emit({
      act: scene.actNumber,
      sceneId: scene.id,
      sceneNumber: scene.sceneNumber
    });
  }

  selectDialogueNode(scene: SceneNode, dialogue: DialogueNode, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    scene.expanded = true;
    this.dialogueSelected.emit({
      act: scene.actNumber,
      sceneId: scene.id,
      dialogueId: dialogue.id,
      dialogue: dialogue.data
    });
  }


  getScoreDisplay(score: number | null): string {
    return formatHumanScore(score);
  }

  getScoreWidth(score: number | null): string {
    if (score === null || isNaN(score)) return '0%';
    return `${Math.min(100, Math.max(0, score))}%`;
  }

  getScoreColor(score: number | null): string {
    const t = getHeatmapThreshold(score);
    return t ? t.color : '#94a3b8';
  }

  getScoreBgColor(score: number | null): string {
    const t = getHeatmapThreshold(score);
    return t ? t.bgColor : '#f1f5f9';
  }

  trackByAct(index: number, act: ActNode): string {
    return act.id;
  }

  trackByScene(index: number, scene: SceneNode): string {
    return scene.id;
  }

  trackByDialogue(index: number, dialogue: DialogueNode): string {
    return dialogue.id;
  }
}
