import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TreeMapComponent } from './treemap.component';

describe('TreeMapComponent', () => {
  let component: TreeMapComponent;
  let fixture: ComponentFixture<TreeMapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TreeMapComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TreeMapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
