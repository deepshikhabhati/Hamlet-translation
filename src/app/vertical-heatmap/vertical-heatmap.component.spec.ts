import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VerticalHeatmapComponent } from './vertical-heatmap.component';

describe('VerticalHeatmapComponent', () => {
  let component: VerticalHeatmapComponent;
  let fixture: ComponentFixture<VerticalHeatmapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ VerticalHeatmapComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VerticalHeatmapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
