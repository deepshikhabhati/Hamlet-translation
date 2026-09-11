import { Component, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent {
  @Output() buttonSelected = new EventEmitter<string>();
  selectedButton: string = 'Summary'; // Default selected button

  onButtonClick(buttonName: string) {
    this.selectedButton = buttonName;
    this.buttonSelected.emit(buttonName);
  }
} 