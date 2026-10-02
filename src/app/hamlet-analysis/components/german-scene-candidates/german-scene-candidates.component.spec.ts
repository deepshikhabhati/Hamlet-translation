import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GermanSceneCandidatesComponent } from './german-scene-candidates.component';

describe('GermanSceneCandidatesComponent', () => {
  let component: GermanSceneCandidatesComponent;
  let fixture: ComponentFixture<GermanSceneCandidatesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ GermanSceneCandidatesComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GermanSceneCandidatesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
