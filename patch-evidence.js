// using node to perform complex string patching
const fs = require('fs');

const tsPath = './src/app/hamlet-analysis/components/phrase-evidence-workspace/phrase-evidence-workspace.component.ts';
let ts = fs.readFileSync(tsPath, 'utf8');

// Replace resolvePassage
const resolvePassageRegex = /resolvePassage\(\): void \{[\s\S]*?refreshValidatedIds\(\);\n  \}/;
const newResolvePassage = `resolvePassage(): void {
    this.panelOpen = false;
    this.selectedAlignmentId = null;
    this.selectedAlignment = null;
    this.hoveredAlignmentId = null;
    this.hoveredConceptId = null;
    this.selectedConceptId = null;
    this.selectedConcept = null;
    this.focusContext = null;
    this.pulsingAlignmentIds.clear();
    if (this.pulseTimer) {
      clearTimeout(this.pulseTimer);
    }
    this.selectedEvidenceDimension = 'semantic';

    if (!this.comparisonPassageId) {
      this.evidencePassage = null;
      this.alignedPhrases = [];
      return;
    }

    this.evidencePassage = this.dataService.getEvidencePassage(this.comparisonPassageId);
    
    // Handle analysis_passages logic
    if (this.evidencePassage && Array.isArray(this.evidencePassage.analysis_passages) && this.evidencePassage.analysis_passages.length > 0) {
      this.selectedAnalysisPassage = this.evidencePassage.analysis_passages[0];
      this.alignedPhrases = this.selectedAnalysisPassage.aligned_phrases || [];
    } else {
      this.selectedAnalysisPassage = null;
      this.alignedPhrases = this.dataService.getAlignedPhrases(this.comparisonPassageId);
    }
    
    this.resetTranslationViews();
    this.refreshValidatedIds();
  }`;

ts = ts.replace(resolvePassageRegex, newResolvePassage);
ts = ts.replace('evidencePassage: any = null;', 'evidencePassage: any = null;\n  selectedAnalysisPassage: any = null;');

fs.writeFileSync(tsPath, ts);

const htmlPath = './src/app/hamlet-analysis/components/phrase-evidence-workspace/phrase-evidence-workspace.component.html';
let html = fs.readFileSync(htmlPath, 'utf8');

const emptyState = `<div class="empty-evidence" *ngIf="alignedPhrases.length === 0">
  <p>Phrase-level evidence has not been generated for this dialogue.</p>
</div>`;

html = emptyState + html; // Prepend a simple empty state logic
fs.writeFileSync(htmlPath, html);

