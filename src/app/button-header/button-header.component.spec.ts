import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ButtonHeaderComponent } from './button-header.component';

describe('ButtonHeaderComponent', () => {
  let component: ButtonHeaderComponent;
  let fixture: ComponentFixture<ButtonHeaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ButtonHeaderComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ButtonHeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
