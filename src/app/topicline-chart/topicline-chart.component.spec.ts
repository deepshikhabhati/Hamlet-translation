import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TopiclineChartComponent } from './topicline-chart.component';

describe('TopiclineChartComponent', () => {
  let component: TopiclineChartComponent;
  let fixture: ComponentFixture<TopiclineChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TopiclineChartComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TopiclineChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
