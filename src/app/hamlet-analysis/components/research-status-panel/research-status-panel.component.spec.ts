import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ResearchStatusPanelComponent } from './research-status-panel.component';

describe('ResearchStatusPanelComponent', () => {
  let component: ResearchStatusPanelComponent;
  let fixture: ComponentFixture<ResearchStatusPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ ResearchStatusPanelComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ResearchStatusPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
