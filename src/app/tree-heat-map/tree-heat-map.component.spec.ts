import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TreeHeatmapComponent } from './tree-heat-map.component';

describe('TreeHeatmapComponent', () => {
  let component: TreeHeatmapComponent;
  let fixture: ComponentFixture<TreeHeatmapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TreeHeatmapComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TreeHeatmapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
