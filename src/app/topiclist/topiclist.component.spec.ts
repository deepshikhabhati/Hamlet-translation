import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TopiclistComponent } from './topiclist.component';

describe('TopiclistComponent', () => {
  let component: TopiclistComponent;
  let fixture: ComponentFixture<TopiclistComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TopiclistComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TopiclistComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
