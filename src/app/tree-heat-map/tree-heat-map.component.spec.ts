import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TreeHeatMapComponent } from './tree-heat-map.component';

describe('TreeHeatMapComponent', () => {
  let component: TreeHeatMapComponent;
  let fixture: ComponentFixture<TreeHeatMapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TreeHeatMapComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TreeHeatMapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
