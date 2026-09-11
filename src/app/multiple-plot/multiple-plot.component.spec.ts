import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MultiplePlotComponent } from './multiple-plot.component';

describe('MultiplePlotComponent', () => {
  let component: MultiplePlotComponent;
  let fixture: ComponentFixture<MultiplePlotComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MultiplePlotComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MultiplePlotComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
