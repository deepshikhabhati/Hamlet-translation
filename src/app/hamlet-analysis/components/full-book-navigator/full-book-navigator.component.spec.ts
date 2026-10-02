import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FullBookNavigatorComponent } from './full-book-navigator.component';

describe('FullBookNavigatorComponent', () => {
  let component: FullBookNavigatorComponent;
  let fixture: ComponentFixture<FullBookNavigatorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ FullBookNavigatorComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FullBookNavigatorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
