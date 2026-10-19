import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { AnalysisScene, AnalysisDialogue } from '../models/hamlet-analysis-v15.models';

export type ViewMode = 'act' | 'scene' | 'dialogue';

export interface HamletSelectionState {
  mode: ViewMode;
  actId: number | null;
  sceneId: string | null;
  dialogueId: string | null;
  dimensionKey: string;
  analysisPanelOpen: boolean;
}

export const INITIAL_SELECTION_STATE: HamletSelectionState = {
  mode: 'act',
  actId: 1,
  sceneId: null,
  dialogueId: null,
  dimensionKey: 'semantic',
  analysisPanelOpen: false,
};

@Injectable({
  providedIn: 'root'
})
export class HamletSelectionService {
  private readonly state$ = new BehaviorSubject<HamletSelectionState>({ ...INITIAL_SELECTION_STATE });

  readonly selectionState$: Observable<HamletSelectionState> = this.state$.asObservable();

  get currentState(): HamletSelectionState {
    return this.state$.getValue();
  }

  get mode(): ViewMode {
    return this.currentState.mode;
  }

  selectAct(actNum: number | null): void {
    const current = this.currentState;
    this.state$.next({
      ...current,
      mode: 'act',
      actId: actNum,
      sceneId: null,
      dialogueId: null,
      analysisPanelOpen: false,
    });
  }

  selectScene(actNum: number, sceneId: string | null, openAnalysisPanel: boolean = false): void {
    const current = this.currentState;
    if (!sceneId) {
      this.selectAct(actNum);
      return;
    }
    this.state$.next({
      ...current,
      mode: 'scene',
      actId: actNum,
      sceneId,
      dialogueId: null,
      analysisPanelOpen: openAnalysisPanel,
    });
  }

  selectDialogue(dialogueId: string | null, actNum?: number, sceneId?: string): void {
    const current = this.currentState;
    if (!dialogueId) {
      this.clearDialogue();
      return;
    }
    this.state$.next({
      ...current,
      mode: 'dialogue',
      actId: actNum !== undefined ? actNum : current.actId,
      sceneId: sceneId !== undefined ? sceneId : current.sceneId,
      dialogueId,
      analysisPanelOpen: true,
    });
  }

  selectDimension(dimensionKey: string): void {
    const current = this.currentState;
    if (current.dimensionKey === dimensionKey) return;
    this.state$.next({
      ...current,
      dimensionKey,
      analysisPanelOpen: current.sceneId ? true : current.analysisPanelOpen,
    });
  }

  setAnalysisPanelOpen(isOpen: boolean): void {
    const current = this.currentState;
    if (current.analysisPanelOpen === isOpen) return;
    this.state$.next({
      ...current,
      analysisPanelOpen: isOpen,
    });
  }

  clearDialogue(): void {
    const current = this.currentState;
    this.state$.next({
      ...current,
      mode: current.sceneId ? 'scene' : 'act',
      dialogueId: null,
    });
  }

  reset(): void {
    this.state$.next({ ...INITIAL_SELECTION_STATE });
  }
}

