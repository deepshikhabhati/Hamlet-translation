import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  OnChanges,
  SimpleChanges,
  Optional
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
import { HamletAggregationService } from '../../services/hamlet-aggregation.service';
import { ReviewCountingService } from '../../services/review-counting.service';

export interface DimensionIndicator {
  key: string;
  name: string;
  letter: string;
  score: number | null;
  status: 'green' | 'amber' | 'red' | 'gray';
  symbol: string;
  needsReview: boolean;
  tooltip: string;
}

export interface DialogueNode {
  id: string;
  shortId: string;
  speaker: string;
  textPreview: string;
  fullText: string;
  score: number | null;
  needsReview: boolean;
  indicators: DimensionIndicator[];
  data: AnalysisDialogue;
}

export interface SceneDonutDimension {
  key: string;
  name: string;
  label: string;
  score: number | null;
  units: number;
  totalDialogues: number;
  reviewCount: number;
  color: string;
  centerText: string;
  tooltip: string;
  dashOffset: number;
  circumference: number;
}

export const SCENE_DONUT_DIMENSIONS = [
  { key: 'semantic', name: 'Semantic', label: 'SEM' },
  { key: 'emotion', name: 'Emotion', label: 'EMO' },
  { key: 'metaphor_imagery', name: 'Metaphor / Imagery', label: 'MET' },
  { key: 'tone', name: 'Tone', label: 'TON' },
  { key: 'character_voice', name: 'Character Voice', label: 'VOI' },
  { key: 'cultural_archaic', name: 'Cultural / Archaic', label: 'CUL' },
  { key: 'omissions_additions', name: 'Omissions / Additions', label: 'OMI' }
];

export const SCENE_SHORT_TITLES: Record<string, string> = {
  'A1-S1': 'Platform before the castle',
  'A1-S2': 'Room of state',
  'A1-S3': "Polonius's house",
  'A1-S4': 'The platform',
  'A1-S5': 'Another part of the platform',
  'A2-S1': "Polonius's house",
  'A2-S2': 'A room in the castle',
  'A3-S1': 'A room in the castle',
  'A3-S2': 'A hall in the castle',
  'A3-S3': 'The King at prayer',
  'A3-S4': "The Queen's closet",
  'A4-S1': 'A room in the castle',
  'A4-S2': 'Another room in the castle',
  'A4-S3': 'Another room in the castle',
  'A4-S4': 'A plain in Denmark',
  'A4-S5': 'A room in the castle',
  'A4-S6': 'Another room in the castle',
  'A4-S7': 'Another room in the castle',
  'A5-S1': 'A churchyard',
  'A5-S2': 'A hall in the castle',
};

export interface ActMiniBar {
  sceneNumber: number;
  height: number;
  color: string;
  score: number | null;
  tooltip: string;
}

export interface SceneNode {
  id: string;
  actNumber: number;
  sceneNumber: number;
  title: string;
  shortTitle: string;
  humanScore: number | null;
  units: number;
  scoredCount: number;
  flaggedCount: number;
  isLowestInAct: boolean;
  statusIcon: 'flag' | 'warn' | 'check';
  expanded: boolean;
  donuts: SceneDonutDimension[];
  dialogues: DialogueNode[];
  data: AnalysisScene;
}

export interface ActNode {
  id: string;
  actNumber: number;
  expanded: boolean;
  scoredCount: number;
  miniBars: ActMiniBar[];
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
  constructor(
    @Optional() private aggregationService?: HamletAggregationService,
    @Optional() private reviewCountingService?: ReviewCountingService
  ) {
    if (!this.aggregationService) {
      this.aggregationService = new HamletAggregationService();
    }
    if (!this.reviewCountingService) {
      this.reviewCountingService = new ReviewCountingService();
    }
  }

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
  @Output() filterSelected = new EventEmitter<'all' | 'diff' | 'review'>();

  activeFilter: 'all' | 'diff' | 'review' = 'all';

  onFilterClick(filter: 'all' | 'diff' | 'review'): void {
    if (this.activeFilter === filter) {
      this.activeFilter = 'all';
    } else {
      this.activeFilter = filter;
    }
    this.filterSelected.emit(this.activeFilter);
  }

  searchQuery = '';
  acts: ActNode[] = [];
  miniLegendOpen = false;

  readonly dimensions = DIMENSION_DEFINITIONS.map(d => ({
    value: d.key,
    label: d.name
  }));

  readonly dimensionLetters = [
    { key: 'semantic', letter: 'S', name: 'Semantic', short: 'Semantic' },
    { key: 'emotion', letter: 'E', name: 'Emotion', short: 'Emotion' },
    { key: 'metaphor_imagery', letter: 'M', name: 'Metaphor / Imagery', short: 'Metaphor' },
    { key: 'tone', letter: 'T', name: 'Tone', short: 'Tone' },
    { key: 'character_voice', letter: 'V', name: 'Character Voice', short: 'Voice' },
    { key: 'wordplay', letter: 'W', name: 'Wordplay', short: 'Wordplay' },
    { key: 'cultural_archaic', letter: 'C', name: 'Cultural / Archaic', short: 'Cultural' },
    { key: 'omissions_additions', letter: 'O', name: 'Omissions / Additions', short: 'Omissions' }
  ];

  actColors: Record<number, string> = {
    1: '#1e3a8a',
    2: '#0369a1',
    3: '#0f766e',
    4: '#374151',
    5: '#4b5563'
  };

  toggleMiniLegend(): void {
    this.miniLegendOpen = !this.miniLegendOpen;
  }

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

      let actScoredCount = 0;
      const scenes: SceneNode[] = act.scenes.map(scene => {
        const existingScene = existingAct?.scenes.find(s => s.id === scene.scene_id);
        const isSceneExpanded = existingScene
          ? existingScene.expanded
          : (scene.scene_id === this.selectedSceneId && !!this.selectedDialogueId) || !!query;

        // Overall Human German score using shared aggregation function
        let humanScore: number | null = null;
        let units = 0;
        if (this.aggregationService) {
          humanScore = this.aggregationService.getSceneOverallScore(scene);
          units = (scene.dialogues && scene.dialogues.length > 0)
            ? scene.dialogues.filter(dlg => Object.values(dlg.analysis?.human_german || {}).some(a => a?.applicable !== false && a?.score !== null)).length
            : (scene.total_dialogues || 0);
        } else if (scene.scores?.human_german) {
          const scs = Object.values(scene.scores.human_german)
            .map(s => s?.score)
            .filter((s): s is number => s !== null && s !== undefined && !isNaN(s));
          humanScore = scs.length > 0 ? Math.round((scs.reduce((a, b) => a + b, 0) / scs.length) * 10) / 10 : null;
          units = scene.total_dialogues || 0;
        }

        const scoredCount = (scene.dialogues && scene.dialogues.length > 0)
          ? scene.dialogues.filter(dlg => Object.values(dlg.analysis?.human_german || {}).some(a => a?.applicable !== false && a?.score !== null)).length
          : (scene.total_dialogues || 0);
        actScoredCount += scoredCount;

        const flaggedCount = this.reviewCountingService
          ? this.reviewCountingService.getSceneFlaggedDialogueCount(scene.scene_id)
          : (scene.review_dialogues_count || 0);

        let statusIcon: 'flag' | 'warn' | 'check' = 'check';
        if (flaggedCount >= 20 || (humanScore !== null && humanScore < 79)) {
          statusIcon = 'flag';
        } else if (flaggedCount > 0 || (humanScore !== null && humanScore < 85)) {
          statusIcon = 'warn';
        }

        const donuts = this.buildSceneDonuts(scene);

        const dialogues: DialogueNode[] = (scene.dialogues || []).map(dlg => {
          const eng = dlg.texts?.english || '';
          const preview = eng.length > 55 ? eng.substring(0, 52) + '…' : eng;
          const dlgScore = dlg.analysis?.human_german?.[this.selectedDimension]?.score ?? null;
          const { indicators, needsReview } = this.buildDialogueIndicators(dlg);
          const shortId = this.getShortId(dlg.dialogue_id);

          return {
            id: dlg.dialogue_id,
            shortId,
            speaker: dlg.speaker || 'UNKNOWN',
            textPreview: preview,
            fullText: eng,
            score: dlgScore,
            needsReview,
            indicators,
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

        const shortTitle = SCENE_SHORT_TITLES[scene.scene_id] || scene.title || `Scene ${scene.scene_number || scene.scene_id}`;

        return {
          id: scene.scene_id,
          actNumber: act.act,
          sceneNumber: scene.scene_number || Number(scene.scene_id.replace(/\D/g, '')),
          title: scene.title || `Scene ${scene.scene_number || scene.scene_id}`,
          shortTitle,
          humanScore,
          units,
          scoredCount,
          flaggedCount,
          isLowestInAct: false,
          statusIcon,
          expanded: query ? filteredDialogues.length > 0 : isSceneExpanded,
          donuts,
          dialogues: filteredDialogues,
          data: scene
        };
      });

      // Mark lowest in Act
      const validScores = scenes.map(s => s.humanScore).filter((s): s is number => s !== null);
      if (validScores.length > 1) {
        const lowestScore = Math.min(...validScores);
        const lowestScene = scenes.find(s => s.humanScore === lowestScore);
        if (lowestScene) {
          lowestScene.isLowestInAct = true;
        }
      }

      // Generate sparkline miniBars
      const miniBars: ActMiniBar[] = scenes.map(s => {
        const sc = s.humanScore ?? 75;
        const h = Math.max(4, Math.min(14, Math.round(((sc - 50) / 50) * 14)));
        return {
          sceneNumber: s.sceneNumber,
          height: h,
          color: this.getScoreColor(s.humanScore),
          score: s.humanScore,
          tooltip: `Scene ${s.sceneNumber}: ${this.getScoreDisplay(s.humanScore)}%`
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
        scoredCount: actScoredCount,
        miniBars,
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
          scoredCount: 0,
          miniBars: [],
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

      const donuts = this.buildSceneDonuts(sceneData);
      const shortTitle = SCENE_SHORT_TITLES[sceneData.scene_id] || sceneData.title || `Scene ${sceneNum}`;
      act.scenes.push({
        id: sceneData.scene_id || `A${actNum}-S${sceneNum}`,
        actNumber: actNum,
        sceneNumber: sceneNum,
        title: sceneData.title || `Scene ${sceneNum}`,
        shortTitle,
        humanScore,
        units: 0,
        scoredCount: 0,
        flaggedCount: 0,
        isLowestInAct: false,
        statusIcon: 'check',
        expanded: false,
        donuts,
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
            const { indicators, needsReview } = this.buildDialogueIndicators(d);
            const rawId = d.dialogue_id || d.passage_id || '';
            const shortId = this.getShortId(rawId);
            scene.dialogues.push({
              id: rawId,
              shortId,
              speaker: d.speaker || 'UNKNOWN',
              textPreview: eng.length > 55 ? eng.substring(0, 52) + '…' : eng,
              fullText: eng,
              score: null,
              needsReview,
              indicators,
              data: d
            });
          }
        }
      });
    }
  }

  buildSceneDonuts(scene: AnalysisScene): SceneDonutDimension[] {
    const totalDialogues = scene.dialogues?.length || scene.total_dialogues || 0;
    const circumference = 69.12;

    return SCENE_DONUT_DIMENSIONS.map(dimDef => {
      let score: number | null = null;
      let units = 0;

      if (this.aggregationService) {
        score = this.aggregationService.getSceneDimensionScore(scene, dimDef.key, 'human_german');
        units = this.aggregationService.getSceneDimensionUnits(scene, dimDef.key, 'human_german');
      } else if (scene.scores?.human_german?.[dimDef.key]?.score !== undefined) {
        score = scene.scores.human_german[dimDef.key].score;
        units = scene.scores.human_german[dimDef.key].units || 0;
      }

      // Review count for this dimension in this scene
      let reviewCount = 0;
      if (this.reviewCountingService) {
        reviewCount = this.reviewCountingService.getSceneDimensionFlaggedDialogueCount(scene.scene_id, dimDef.key);
      }
      if (reviewCount === 0 && scene.dialogues && scene.dialogues.length > 0) {
        reviewCount = scene.dialogues.filter(dlg => dlg.analysis?.human_german?.[dimDef.key]?.needs_review).length;
      }

      const color = this.aggregationService
        ? this.aggregationService.getDonutColor(score)
        : (score === null ? '#94a3b8' : score >= 85 ? '#16a34a' : score >= 70 ? '#d97706' : '#dc2626');

      const centerText = this.aggregationService
        ? this.aggregationService.getDonutCenterText(score)
        : (score === null ? '—' : Math.round(score).toString());

      const dashOffset = this.aggregationService
        ? this.aggregationService.getDonutDashOffset(score, circumference)
        : (score === null || score <= 0 ? circumference : Math.round((circumference - (circumference * Math.min(100, score)) / 100) * 100) / 100);

      const scoreText = score !== null && !isNaN(score) ? `${score}%` : 'N/A';
      const reviewText = reviewCount === 1 ? '1 requiring review' : `${reviewCount} requiring review`;
      const tooltip = `${dimDef.name}: ${scoreText} (${units}/${totalDialogues} scored dialogues, ${reviewText})`;

      return {
        key: dimDef.key,
        name: dimDef.name,
        label: dimDef.label,
        score,
        units,
        totalDialogues,
        reviewCount,
        color,
        centerText,
        tooltip,
        dashOffset,
        circumference
      };
    });
  }

  onSceneDonutClick(scene: SceneNode, dimKey: string, event: Event): void {
    event.stopPropagation();
    this.selectedDimension = dimKey;
    this.dimensionChange.emit(dimKey);
    this.sceneSelected.emit({
      act: scene.actNumber,
      sceneId: scene.id,
      sceneNumber: scene.sceneNumber
    });
  }

  buildDialogueIndicators(dlg: AnalysisDialogue): { indicators: DimensionIndicator[]; needsReview: boolean } {
    let dialogueNeedsReview = false;
    const humanAnalysis = dlg.analysis?.human_german || {};

    if (dlg.expert_review?.status === 'needs_review' || (dlg.expert_review as any)?.needs_review) {
      dialogueNeedsReview = true;
    }

    const indicators: DimensionIndicator[] = this.dimensionLetters.map(def => {
      const dimAna = humanAnalysis[def.key];
      const isApplicable = dimAna?.applicable !== false;
      const rawScore = dimAna?.score;
      const score = (isApplicable && rawScore !== null && rawScore !== undefined && !isNaN(rawScore))
        ? Math.round(Number(rawScore) * 10) / 10
        : null;
      const dimNeedsReview = Boolean(dimAna?.needs_review);

      if (dimNeedsReview) {
        dialogueNeedsReview = true;
      }

      let status: 'green' | 'amber' | 'red' | 'gray' = 'gray';
      let symbol = '–';

      if (score === null || !isApplicable) {
        status = 'gray';
        symbol = '–';
      } else if (dimNeedsReview) {
        status = 'red';
        symbol = '!';
      } else if (score >= 80) {
        status = 'green';
        symbol = '●';
      } else if (score >= 60) {
        status = 'amber';
        symbol = '●';
      } else {
        status = 'red';
        symbol = '!';
      }

      const statusDesc = status === 'green'
        ? 'Strong preservation'
        : status === 'amber'
          ? 'Potential issue'
          : status === 'red'
            ? (dimNeedsReview ? 'Flagged for expert review' : 'Serious concern')
            : 'Not applicable';

      const tooltip = `${def.name} (${def.letter}): ${score !== null ? score + '%' : 'N/A'} — ${statusDesc}`;

      return {
        key: def.key,
        name: def.name,
        letter: def.letter,
        score,
        status,
        symbol,
        needsReview: dimNeedsReview,
        tooltip
      };
    });

    return { indicators, needsReview: dialogueNeedsReview };
  }

  getShortId(id: string): string {
    if (!id) return '';
    const match = id.match(/D\d+$/);
    return match ? match[0] : id;
  }

  onIndicatorClick(scene: SceneNode, dialogue: DialogueNode, dimKey: string, event: Event): void {
    event.stopPropagation();
    this.selectedDimension = dimKey;
    this.dimensionChange.emit(dimKey);
    this.selectDialogueNode(scene, dialogue);
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
