import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { STATUS_META } from '../../services/hamlet-data.service';

@Component({
  selector: 'app-ha-phrase-status-legend',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './phrase-status-legend.component.html',
  styleUrls: ['./phrase-status-legend.component.scss'],
})
export class PhraseStatusLegendComponent {
  readonly items = Object.values(STATUS_META);
}
