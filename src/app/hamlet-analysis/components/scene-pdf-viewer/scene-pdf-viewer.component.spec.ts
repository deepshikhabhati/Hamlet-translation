import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ScenePdfViewerComponent } from './scene-pdf-viewer.component';

describe('ScenePdfViewerComponent', () => {
  let component: ScenePdfViewerComponent;
  let fixture: ComponentFixture<ScenePdfViewerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ ScenePdfViewerComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ScenePdfViewerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
