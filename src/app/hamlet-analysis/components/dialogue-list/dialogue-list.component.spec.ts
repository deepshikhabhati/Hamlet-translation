import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DialogueListComponent } from './dialogue-list.component';

describe('DialogueListComponent', () => {
  let component: DialogueListComponent;
  let fixture: ComponentFixture<DialogueListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ DialogueListComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DialogueListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
