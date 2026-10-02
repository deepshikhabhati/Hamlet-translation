import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmptyAnalysisStateComponent } from './empty-analysis-state.component';

describe('EmptyAnalysisStateComponent', () => {
  let component: EmptyAnalysisStateComponent;
  let fixture: ComponentFixture<EmptyAnalysisStateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ EmptyAnalysisStateComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EmptyAnalysisStateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
