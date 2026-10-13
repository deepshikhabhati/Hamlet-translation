import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { HttpClientTestingModule } from "@angular/common/http/testing";


import { HamletContentComponent } from './hamlet-content.component';
import { TopiclistComponent } from '../topiclist/topiclist.component';

describe('HamletContentComponent', () => {
  let component: HamletContentComponent;
  let fixture: ComponentFixture<HamletContentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormsModule, HttpClientTestingModule],
      schemas: [NO_ERRORS_SCHEMA],
      declarations: [ HamletContentComponent, TopiclistComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HamletContentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
