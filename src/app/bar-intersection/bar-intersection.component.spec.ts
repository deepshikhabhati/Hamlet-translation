import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BarIntersectionComponent } from './bar-intersection.component';

describe('BarIntersectionComponent', () => {
  let component: BarIntersectionComponent;
  let fixture: ComponentFixture<BarIntersectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ BarIntersectionComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BarIntersectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
