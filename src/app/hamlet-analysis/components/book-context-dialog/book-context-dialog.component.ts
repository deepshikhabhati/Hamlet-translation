import {
  Component,
  EventEmitter,
  HostListener,
  Input,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-ha-book-context-dialog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './book-context-dialog.component.html',
  styleUrls: ['./book-context-dialog.component.scss'],
})
export class BookContextDialogComponent {
  @Input() open = false;
  @Input() lang: 'english' | 'german' = 'english';
  @Input() bookContext: any = null;
  @Input() pdfPath = '';

  @Output() closeDialog = new EventEmitter<void>();

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.open) {
      this.closeDialog.emit();
    }
  }

  get ctx(): any {
    return this.lang === 'english'
      ? this.bookContext?.english
      : this.bookContext?.german;
  }

  get title(): string {
    return this.ctx?.label || (this.lang === 'english' ? 'English Book Context' : 'German Book Context');
  }
}
