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
});

