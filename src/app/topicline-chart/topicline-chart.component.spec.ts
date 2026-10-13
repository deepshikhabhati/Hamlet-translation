import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TopicLineChartComponent } from './topicline-chart.component';

describe('TopicLineChartComponent', () => {
  let component: TopicLineChartComponent;
  let fixture: ComponentFixture<TopicLineChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TopicLineChartComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TopicLineChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
