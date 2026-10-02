import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DialogueStatusComponent } from './dialogue-status.component';

describe('DialogueStatusComponent', () => {
  let component: DialogueStatusComponent;
  let fixture: ComponentFixture<DialogueStatusComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ DialogueStatusComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DialogueStatusComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
