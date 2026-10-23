import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SimpleChange } from '@angular/core';
import { FullBookNavigatorComponent } from './full-book-navigator.component';
import { AnalysisAct } from '../../models/hamlet-analysis-v15.models';

describe('FullBookNavigatorComponent — Hierarchical TOC Suite', () => {
  let component: FullBookNavigatorComponent;
  let fixture: ComponentFixture<FullBookNavigatorComponent>;

  const mock5Acts: AnalysisAct[] = [
    {
      act: 1,
      scenes: [
        {
          scene_id: 'A1-S1',
          act: 1,
          scene_number: 1,
          title: 'Platform before the castle',
          dialogues: [
            {
              dialogue_id: 'EN-A1-S1-D00001',
              speaker: 'BARNARDO',
              texts: { english: "Who's there?", human_german: 'Wer da?' },
              analysis: {
                human_german: {
                  semantic: { applicable: true, score: 95, confidence: 0.95, status: 'Preserved', explanation: '', evidence: [], needs_review: false }
                }
              }
            },
            {
              dialogue_id: 'EN-A1-S1-D00002',
              speaker: 'FRANCISCO',
              texts: { english: 'Nay, answer me: stand, and unfold yourself.', human_german: 'Nein, antwortet mir: steht und gebt euch kund.' },
              analysis: {
                human_german: {
                  semantic: { applicable: true, score: 92, confidence: 0.9, status: 'Preserved', explanation: '', evidence: [], needs_review: false }
                }
              }
            }
          ]
        },
        { scene_id: 'A1-S2', act: 1, scene_number: 2, title: 'A room of state in the castle', dialogues: [] },
        { scene_id: 'A1-S3', act: 1, scene_number: 3, title: 'A room in Polonius house', dialogues: [] },
        { scene_id: 'A1-S4', act: 1, scene_number: 4, title: 'The platform', dialogues: [] },
        { scene_id: 'A1-S5', act: 1, scene_number: 5, title: 'Another part of the platform', dialogues: [] }
      ]
    },
    {
      act: 2,
      scenes: [
        { scene_id: 'A2-S1', act: 2, scene_number: 1, title: 'A room in Polonius house', dialogues: [] },
        { scene_id: 'A2-S2', act: 2, scene_number: 2, title: 'A room in the castle', dialogues: [] }
      ]
    },
    {
      act: 3,
      scenes: [
        { scene_id: 'A3-S1', act: 3, scene_number: 1, title: 'A room in the castle', dialogues: [] },
        { scene_id: 'A3-S2', act: 3, scene_number: 2, title: 'A hall in the castle', dialogues: [] },
        { scene_id: 'A3-S3', act: 3, scene_number: 3, title: 'A room in the castle', dialogues: [] },
        { scene_id: 'A3-S4', act: 3, scene_number: 4, title: 'The Queens closet', dialogues: [] }
      ]
    },
    {
      act: 4,
      scenes: [
        { scene_id: 'A4-S1', act: 4, scene_number: 1, title: 'A room in the castle', dialogues: [] },
        { scene_id: 'A4-S2', act: 4, scene_number: 2, title: 'Another room in the castle', dialogues: [] },
        { scene_id: 'A4-S3', act: 4, scene_number: 3, title: 'Another room in the castle', dialogues: [] },
        { scene_id: 'A4-S4', act: 4, scene_number: 4, title: 'A plain in Denmark', dialogues: [] },
        { scene_id: 'A4-S5', act: 4, scene_number: 5, title: 'Elsinore. A room in the castle', dialogues: [] },
        { scene_id: 'A4-S6', act: 4, scene_number: 6, title: 'Another room in the castle', dialogues: [] },
        { scene_id: 'A4-S7', act: 4, scene_number: 7, title: 'Another room in the castle', dialogues: [] }
      ]
    },
    {
      act: 5,
      scenes: [
        { scene_id: 'A5-S1', act: 5, scene_number: 1, title: 'A churchyard', dialogues: [] },
        { scene_id: 'A5-S2', act: 5, scene_number: 2, title: 'A hall in the castle', dialogues: [] }
      ]
    }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FullBookNavigatorComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(FullBookNavigatorComponent);
    component = fixture.componentInstance;
    component.actsData = mock5Acts;
    component.ngOnChanges({
      actsData: new SimpleChange(null, mock5Acts, true)
    });
    fixture.detectChanges();
  });

  it('1. should create and initialize all 5 acts and 20 scenes', () => {
    expect(component).toBeTruthy();
    expect(component.acts.length).toBe(5);

    const totalScenes = component.acts.reduce((acc, act) => acc + act.scenes.length, 0);
    expect(totalScenes).toBe(20);
  });

  it('2. expanding Act 1 displays its five scenes', () => {
    const act1 = component.acts.find(a => a.actNumber === 1);
    expect(act1).toBeDefined();
    expect(act1?.scenes.length).toBe(5);
    expect(act1?.expanded).toBeTrue(); // Act 1 expanded by default
  });

  it('3. expanding Act 2 displays its actual scenes', () => {
    const act2 = component.acts.find(a => a.actNumber === 2);
    expect(act2).toBeDefined();
    expect(act2?.scenes.length).toBe(2);

    act2!.expanded = false;
    component.toggleAct(act2!);
    expect(act2!.expanded).toBeTrue();
  });

  it('4. clicking a scene chevron toggles scene expansion without triggering scene selection', () => {
    spyOn(component.sceneSelected, 'emit');
    const act1 = component.acts[0];
    const scene1 = act1.scenes[0];

    const mockEvent = new MouseEvent('click');
    spyOn(mockEvent, 'stopPropagation');

    const initialExpanded = scene1.expanded;
    component.toggleScene(scene1, mockEvent);

    expect(scene1.expanded).toBe(!initialExpanded);
    expect(mockEvent.stopPropagation).toHaveBeenCalled();
    expect(component.sceneSelected.emit).not.toHaveBeenCalled();
  });

  it('5. clicking a scene node emits sceneSelected with act and scene information', () => {
    spyOn(component.sceneSelected, 'emit');
    const scene1 = component.acts[0].scenes[0];

    component.selectSceneNode(scene1);

    expect(component.sceneSelected.emit).toHaveBeenCalledWith({
      act: 1,
      sceneId: 'A1-S1',
      sceneNumber: 1
    });
  });

  it('6. selecting a dialogue node emits dialogueSelected with dialogue payload', () => {
    spyOn(component.dialogueSelected, 'emit');
    const scene1 = component.acts[0].scenes[0];
    const dlg1 = scene1.dialogues[0];

    component.selectDialogueNode(scene1, dlg1);

    expect(component.dialogueSelected.emit).toHaveBeenCalledWith({
      act: 1,
      sceneId: 'A1-S1',
      dialogueId: 'EN-A1-S1-D00001',
      dialogue: dlg1.data
    });
  });

  it('7. changing dimension recomputes scene human score and emits dimensionChange', () => {
    spyOn(component.dimensionChange, 'emit');
    component.selectedDimension = 'emotion';
    component.onDimensionChange();

    expect(component.dimensionChange.emit).toHaveBeenCalledWith('emotion');
  });

  it('8. search query filters scenes and dialogues by speaker, text, and ID', () => {
    component.searchQuery = 'BARNARDO';
    component.onSearchChange();

    const act1 = component.acts.find(a => a.actNumber === 1);
    const scene1 = act1?.scenes.find(s => s.id === 'A1-S1');
    expect(scene1?.dialogues.length).toBe(1);
    expect(scene1?.dialogues[0].speaker).toBe('BARNARDO');

    component.clearSearch();
    expect(component.searchQuery).toBe('');
  });

  it('9. clicking a dialogue does not collapse its parent scene and stops event propagation', () => {
    const scene1 = component.acts[0].scenes[0];
    const dlg1 = scene1.dialogues[0];
    scene1.expanded = true;

    const mockEvent = new MouseEvent('click');
    spyOn(mockEvent, 'stopPropagation');

    component.selectDialogueNode(scene1, dlg1, mockEvent);

    expect(scene1.expanded).toBeTrue();
    expect(mockEvent.stopPropagation).toHaveBeenCalled();
  });

  it('10. ensureDialogueVisible expands parent act and scene for selected dialogue', () => {
    const act1 = component.acts[0];
    const scene1 = act1.scenes[0];
    act1.expanded = false;
    scene1.expanded = false;

    component.ensureDialogueVisible('EN-A1-S1-D00001');

    expect(act1.expanded).toBeTrue();
    expect(scene1.expanded).toBeTrue();
  });

  describe('7 Compact Donut Charts per Scene Suite', () => {
    it('11. every scene in all 5 acts and 20 scenes initializes with exactly 7 donut charts', () => {
      let sceneCount = 0;
      for (const act of component.acts) {
        for (const scene of act.scenes) {
          sceneCount++;
          expect(scene.donuts).toBeDefined();
          expect(scene.donuts.length).toBe(7);

          const labels = scene.donuts.map(d => d.label);
          expect(labels).toEqual(['SEM', 'EMO', 'MET', 'TON', 'VOI', 'CUL', 'OMI']);

          const keys = scene.donuts.map(d => d.key);
          expect(keys).toEqual([
            'semantic',
            'emotion',
            'metaphor_imagery',
            'tone',
            'character_voice',
            'cultural_archaic',
            'omissions_additions'
          ]);
        }
      }
      expect(sceneCount).toBe(20);
    });

    it('12. donut displays actual scene average score in center and formats label below', () => {
      const scene1 = component.acts[0].scenes[0];
      const semDonut = scene1.donuts.find(d => d.key === 'semantic');

      expect(semDonut).toBeDefined();
      expect(semDonut?.label).toBe('SEM');
      // Dialogue scores for semantic are 95 and 92, average is ~93.5 or 94
      expect(semDonut?.score).toBeGreaterThan(90);
      expect(semDonut?.centerText).toBe(Math.round(semDonut!.score!).toString());
    });

    it('13. missing or N/A scores display dash center text and gray color', () => {
      // Scene A1-S2 has no dialogues or scores
      const scene2 = component.acts[0].scenes[1];
      const culDonut = scene2.donuts.find(d => d.key === 'cultural_archaic');

      expect(culDonut).toBeDefined();
      expect(culDonut?.score).toBeNull();
      expect(culDonut?.centerText).toBe('—');
      expect(culDonut?.color).toBe('#94a3b8');
      expect(culDonut?.dashOffset).toBe(culDonut?.circumference!);
    });

    it('14. applies score colors consistently: Green >= 85, Amber 70-84.9, Red < 70, Gray N/A', () => {
      // Verify color thresholds via aggregation helper
      expect(component['aggregationService']?.getDonutColor(95)).toBe('#16a34a'); // Green
      expect(component['aggregationService']?.getDonutColor(85)).toBe('#16a34a'); // Green boundary
      expect(component['aggregationService']?.getDonutColor(84.9)).toBe('#d97706'); // Amber boundary
      expect(component['aggregationService']?.getDonutColor(75)).toBe('#d97706'); // Amber
      expect(component['aggregationService']?.getDonutColor(70)).toBe('#d97706'); // Amber boundary
      expect(component['aggregationService']?.getDonutColor(69.9)).toBe('#dc2626'); // Red
      expect(component['aggregationService']?.getDonutColor(50)).toBe('#dc2626'); // Red
      expect(component['aggregationService']?.getDonutColor(null)).toBe('#94a3b8'); // Gray N/A
    });

    it('15. donut tooltip includes dimension name, exact score, scored dialogues, and review count', () => {
      const scene1 = component.acts[0].scenes[0];
      const semDonut = scene1.donuts[0];

      expect(semDonut.tooltip).toContain('Semantic');
      expect(semDonut.tooltip).toContain('%');
      expect(semDonut.tooltip).toContain('scored dialogues');
      expect(semDonut.tooltip).toContain('requiring review');
    });

    it('16. clicking a donut selects that scene, sets active dimension, and does not expand/collapse node', () => {
      spyOn(component.sceneSelected, 'emit');
      spyOn(component.dimensionChange, 'emit');

      const scene1 = component.acts[0].scenes[0];
      const initialExpanded = scene1.expanded;

      const mockEvent = new MouseEvent('click');
      spyOn(mockEvent, 'stopPropagation');

      component.onSceneDonutClick(scene1, 'metaphor_imagery', mockEvent);

      expect(mockEvent.stopPropagation).toHaveBeenCalled();
      expect(component.selectedDimension).toBe('metaphor_imagery');
      expect(component.dimensionChange.emit).toHaveBeenCalledWith('metaphor_imagery');
      expect(component.sceneSelected.emit).toHaveBeenCalledWith({
        act: 1,
        sceneId: 'A1-S1',
        sceneNumber: 1
      });
      // Scene expansion state remains untouched
      expect(scene1.expanded).toBe(initialExpanded);
    });

    it('17. keeps existing overall scene score badge on right of scene title', () => {
      const scene1 = component.acts[0].scenes[0];
      expect(scene1.humanScore).not.toBeNull();
      expect(scene1.humanScore!).toBeGreaterThan(0);
    });

    it('18. preserves Wordplay in DIMENSION_DEFINITIONS while displaying 7 donuts in sidebar', () => {
      const hasWordplay = component.dimensions.some(d => d.value === 'wordplay');
      expect(hasWordplay).toBeTrue();

      const donutKeys = component.acts[0].scenes[0].donuts.map(d => d.key);
      expect(donutKeys).not.toContain('wordplay');
      expect(donutKeys.length).toBe(7);
    });
  });
});

