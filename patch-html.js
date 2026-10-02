const fs = require('fs');
const path = './src/app/hamlet-analysis/hamlet-analysis.component.html';
let content = fs.readFileSync(path, 'utf8');

// Replace the old passage list with the new tree navigator
const oldSidebar = `<app-passage-sidebar`;
const newSidebar = `<app-full-book-navigator
  [data]="fullBookUiData"
  [selectedDialogueId]="selectedPassage?.passage_id"
  (dialogueSelected)="selectPassage($event)">
</app-full-book-navigator>
<!-- <app-passage-sidebar`;
content = content.replace(oldSidebar, newSidebar);

fs.writeFileSync(path, content);
