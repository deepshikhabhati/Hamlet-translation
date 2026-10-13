import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';

import { TopiclistComponent } from './topiclist.component';

describe('TopiclistComponent', () => {
  let component: TopiclistComponent;
  let fixture: ComponentFixture<TopiclistComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TopiclistComponent ],
      imports: [ FormsModule ]
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
