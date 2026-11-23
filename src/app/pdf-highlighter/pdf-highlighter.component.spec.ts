import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PdfHighlighterComponent } from './pdf-highlighter.component';

describe('PdfHighlighterComponent', () => {
  let component: PdfHighlighterComponent;
  let fixture: ComponentFixture<PdfHighlighterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ PdfHighlighterComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PdfHighlighterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('prepares search text cleanly and sets sanitized viewer url with search phrase', (done) => {
    component.pdfSource = 'assets/Hamlet.pdf';
    component.openPdf('"Who\'s there?"');
    expect(component.showPdf).toBeTrue();
    expect(component.isLoading).toBeTrue();
    setTimeout(() => {
      expect(component.pdfUrl).toContain("#search=Who's%20there%3F");
      expect(component.pdfUrl).toContain('phrase=true');
      done();
    }, 10);
  });
});
