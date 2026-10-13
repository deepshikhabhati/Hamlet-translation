import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { ButtonHeaderComponent } from './button-header.component';

describe('ButtonHeaderComponent', () => {
  let component: ButtonHeaderComponent;
  let fixture: ComponentFixture<ButtonHeaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ButtonHeaderComponent ],
      imports: [ NoopAnimationsModule ]
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
