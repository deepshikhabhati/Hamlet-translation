import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CircleTreeComponent } from './circle-tree.component';

describe('CircleTreeComponent', () => {
  let component: CircleTreeComponent;
  let fixture: ComponentFixture<CircleTreeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CircleTreeComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CircleTreeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
