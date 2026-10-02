const fs = require('fs');
const path = './src/app/hamlet-analysis/hamlet-analysis.component.ts';
let content = fs.readFileSync(path, 'utf8');
content = content.replace(
  "import {",
  "import { FullBookAdapterService } from './services/full-book-adapter.service';\nimport {"
);
content = content.replace(
  "constructor(private dataService: HamletDataService) {}",
  "constructor(private dataService: HamletDataService, private adapter: FullBookAdapterService) {}"
);
content = content.replace(
  "comparison: this.dataService.getData(),",
  "comparison: this.dataService.getData(),\n      fullBookUi: this.dataService.loadFullBookUiData().pipe(catchError(() => of(null))),"
);
fs.writeFileSync(path, content);
