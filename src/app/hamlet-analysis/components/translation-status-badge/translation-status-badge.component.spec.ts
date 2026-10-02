import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TranslationStatusBadgeComponent } from './translation-status-badge.component';

describe('TranslationStatusBadgeComponent', () => {
  let component: TranslationStatusBadgeComponent;
  let fixture: ComponentFixture<TranslationStatusBadgeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ TranslationStatusBadgeComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TranslationStatusBadgeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
