import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CircularTreeComponent } from './chat2.component';

describe('CircularTreeComponent', () => {
  let component: CircularTreeComponent;
  let fixture: ComponentFixture<CircularTreeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CircularTreeComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CircularTreeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
