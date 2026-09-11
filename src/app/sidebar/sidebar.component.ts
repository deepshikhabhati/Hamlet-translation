import { Component } from '@angular/core';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent {
  onButton1Click() {
    console.log('Button 1 clicked');
    // Add your button 1 logic here
  }

  onButton2Click() {
    console.log('Button 2 clicked');
    // Add your button 2 logic here
  }

  onButton3Click() {
    console.log('Button 3 clicked');
    // Add your button 3 logic here
  }
} 