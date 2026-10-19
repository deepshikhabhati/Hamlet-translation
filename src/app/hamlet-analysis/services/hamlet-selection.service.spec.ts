import { TestBed } from '@angular/core/testing';
import { HamletSelectionService, INITIAL_SELECTION_STATE } from './hamlet-selection.service';

describe('HamletSelectionService', () => {
  let service: HamletSelectionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(HamletSelectionService);
  });

  it('should be created with initial state in act mode', () => {
    expect(service).toBeTruthy();
    expect(service.currentState).toEqual(INITIAL_SELECTION_STATE);
    expect(service.mode).toBe('act');
  });

  it('selectAct should switch mode to act and clear scene & dialogue', () => {
    service.selectScene(1, 'A1-S1');
    expect(service.mode).toBe('scene');

    service.selectAct(2);
    expect(service.mode).toBe('act');
    expect(service.currentState.actId).toBe(2);
    expect(service.currentState.sceneId).toBeNull();
    expect(service.currentState.dialogueId).toBeNull();
  });

  it('selectScene should switch mode to scene and clear dialogue', () => {
    service.selectDialogue('EN-A1-S1-D00001', 1, 'A1-S1');
    expect(service.mode).toBe('dialogue');

    service.selectScene(1, 'A1-S1');
    expect(service.mode).toBe('scene');
    expect(service.currentState.actId).toBe(1);
    expect(service.currentState.sceneId).toBe('A1-S1');
    expect(service.currentState.dialogueId).toBeNull();
  });

  it('selectDialogue should switch mode to dialogue and set dialogueId', () => {
    service.selectDialogue('EN-A1-S1-D00008', 1, 'A1-S1');
    expect(service.mode).toBe('dialogue');
    expect(service.currentState.actId).toBe(1);
    expect(service.currentState.sceneId).toBe('A1-S1');
    expect(service.currentState.dialogueId).toBe('EN-A1-S1-D00008');
  });

  it('clearDialogue should return to scene mode if sceneId is present, or act mode otherwise', () => {
    service.selectDialogue('EN-A1-S1-D00008', 1, 'A1-S1');
    expect(service.mode).toBe('dialogue');

    service.clearDialogue();
    expect(service.mode).toBe('scene');
    expect(service.currentState.dialogueId).toBeNull();

    service.selectAct(3);
    service.clearDialogue();
    expect(service.mode).toBe('act');
  });
});
