import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QueryTreeComponent } from './query-tree.component';

describe('QueryTreeComponent', () => {
  let component: QueryTreeComponent;
  let fixture: ComponentFixture<QueryTreeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ QueryTreeComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(QueryTreeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
