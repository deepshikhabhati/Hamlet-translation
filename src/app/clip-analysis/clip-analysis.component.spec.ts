import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClipAnalysisComponent } from './clip-analysis.component';

describe('ClipAnalysisComponent', () => {
  let component: ClipAnalysisComponent;
  let fixture: ComponentFixture<ClipAnalysisComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ClipAnalysisComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ClipAnalysisComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
