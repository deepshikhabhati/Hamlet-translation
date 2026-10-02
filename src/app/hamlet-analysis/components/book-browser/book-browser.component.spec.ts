import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BookBrowserComponent } from './book-browser.component';

describe('BookBrowserComponent', () => {
  let component: BookBrowserComponent;
  let fixture: ComponentFixture<BookBrowserComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ BookBrowserComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BookBrowserComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
