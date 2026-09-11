import { Component, Output, EventEmitter } from '@angular/core';
import { trigger, transition, style, animate } from '@angular/animations';

@Component({
  selector: 'app-button-header',
  template: `
    <div class="container header-mode">
      <div class="header" @slideUp>

         <button 
          [class.selected]="selectedButton === 'Science'"
          (click)="onButtonClick('Science')">
          Science
        </button>

           <button 
          [class.selected]="selectedButton === 'Biography'"
          (click)="onButtonClick('Biography')">
          Biography
        </button>
      
                <button 
          [class.selected]="selectedButton === 'tsvg'"
          (click)="onButtonClick('tsvg')">
          TSVG
        </button>
      </div>
    </div>
  `,
  styles: [`
    .container {
      display: flex;
      justify-content: center;
      align-items: center;
      background-color: #7474e2;
      width:100%;
      transition: all 0.5s ease;
    }
    .header-mode {
      flex-direction: column;
      align-items: flex-start;
    }
    .buttons button, .header button {
      margin: 10px;
      padding: 10px 20px;
      font-size: 16px;
      position: relative;
      transform: skew(-20deg);
      color: black;
      border: none;
      cursor: pointer;
      transition: all 0.3s ease;
      background-color: white;
    }
    
    .buttons button:hover, .header button:hover {
      background-color: #4a4ae6;
      color: white;
    }
    .header {
      top: 0;
      left: 0;
      width: 100%;
      display: flex;
      justify-content: center;
      background: #7474e2;
      padding: 10px;
      box-shadow: 0px 4px 6px rgba(0, 0, 0, 0.1);
    }

    .selected {
      background-color: #4a4ae6 !important;
      color: white !important;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }
  `],
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('0.5s ease-in', style({ opacity: 1 }))
      ])
    ]),
    trigger('slideUp', [
      transition(':enter', [
        style({ transform: 'translateY(100%)' }),
        animate('0.5s ease-out', style({ transform: 'translateY(0%)' }))
      ])
    ])
  ]
})
export class ButtonHeaderComponent {
  @Output() buttonClicked = new EventEmitter<string>();
  selectedButton: string = 'tsvg'; // Default selected button

  onButtonClick(buttonName: string) {
    this.selectedButton = buttonName;
    this.buttonClicked.emit(buttonName);
  }
}
