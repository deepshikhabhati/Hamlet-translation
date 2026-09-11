import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UmapPlotComponent } from './umap-plot.component';

describe('UmapPlotComponent', () => {
  let component: UmapPlotComponent;
  let fixture: ComponentFixture<UmapPlotComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ UmapPlotComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UmapPlotComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
