import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PHRASE_CATEGORIES } from './phrase-categories';

/** Colour legend with definitions (tooltips) shared by Hamlet and Heidi. */
@Component({
  selector: 'app-phrase-legend',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="sa-row" role="list" aria-label="Phrase highlight legend">
      <span class="sa-muted" *ngIf="label">{{ label }}</span>
      <span *ngFor="let c of cats" class="sa-cat" role="listitem" [title]="c.key + ': ' + c.definition" [attr.data-cat]="c.key"
            [style.background]="c.background" [style.color]="c.color" [style.borderColor]="c.color + '33'">
        <i [style.background]="c.underline === 'dotted' ? 'transparent' : c.color" [style.border]="c.underline === 'dotted' ? '1.5px dotted ' + c.color : 'none'"></i>
        {{ c.key }}<span *ngIf="showDefinitions" class="sa-muted" style="font-weight:400">— {{ c.definition }}</span>
      </span>
    </div>`,
  styleUrls: ['./analysis-shared.css'],
})
export class PhraseLegendComponent {
  @Input() label: string | null = 'Phrase annotation:';
  @Input() showDefinitions = false;
  readonly cats = PHRASE_CATEGORIES;
}
