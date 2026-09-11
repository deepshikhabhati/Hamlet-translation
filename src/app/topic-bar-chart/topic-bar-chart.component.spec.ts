import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TopicBarChartComponent } from './topic-bar-chart.component';

describe('TopicBarChartComponent', () => {
  let component: TopicBarChartComponent;
  let fixture: ComponentFixture<TopicBarChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TopicBarChartComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TopicBarChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
