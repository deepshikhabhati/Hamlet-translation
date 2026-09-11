import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TopicDonutComponent } from './topic-donut.component';

describe('TopicDonutComponent', () => {
  let component: TopicDonutComponent;
  let fixture: ComponentFixture<TopicDonutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TopicDonutComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TopicDonutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
