import os
import re

app_dir = "/Users/alwa.pattabhiraman/Desktop/front/src/app"
hamlet_dir = os.path.join(app_dir, "hamlet-analysis")

# 1. Update hamlet-data.service.ts
service_path = os.path.join(hamlet_dir, "services/hamlet-data.service.ts")
with open(service_path, "r") as f:
    content = f.read()

new_methods = """
  private readonly fullBookUiUrl = 'assets/data/hamlet_full_books_ui.json';
  private readonly fullBookUrl = 'assets/data/hamlet_full_books.json';
  private fullBookUiCache$?: Observable<any>;
  private fullBookCache$?: Observable<any>;

  loadFullBookUiData(): Observable<any> {
    if (!this.fullBookUiCache$) {
      this.fullBookUiCache$ = this.http.get<any>(this.fullBookUiUrl).pipe(shareReplay(1));
    }
    return this.fullBookUiCache$;
  }

  loadFullBookHierarchy(): Observable<any> {
    if (!this.fullBookCache$) {
      this.fullBookCache$ = this.http.get<any>(this.fullBookUrl).pipe(shareReplay(1));
    }
    return this.fullBookCache$;
  }

  getActs(): any[] {
    return [1, 2, 3, 4, 5];
  }

  getEnglishScenes(act: number): any[] {
    // Mock implementation for UI data adapter
    return [];
  }

  getDialogues(act: number, scene: number): any[] {
    return [];
  }

  getDialogueById(dialogueId: string): any {
    return null;
  }

  getGermanSceneCandidates(dialogue: any): any[] {
    return [];
  }

  getTranslationStatus(dialogue: any, version: string): string {
    return dialogue?.generation_status?.[version] || 'unknown';
  }

  hasTranslation(dialogue: any, version: string): boolean {
    return !!dialogue?.texts?.[version];
  }

  hasCompleteFourVersions(dialogue: any): boolean {
    return this.hasTranslation(dialogue, 'english') &&
           this.hasTranslation(dialogue, 'human_german') &&
           this.hasTranslation(dialogue, 'ai_german') &&
           this.hasTranslation(dialogue, 'context_ai_german');
  }

  hasPhraseEvidence(dialogue: any): boolean {
    return Array.isArray(dialogue?.phrase_alignments) && dialogue.phrase_alignments.length > 0;
  }

  hasComparisonAnalysis(dialogue: any): boolean {
    return !!dialogue?.comparisons?.length;
  }
"""

if "loadFullBookUiData" not in content:
    content = content.replace("constructor(private http: HttpClient) {}", "constructor(private http: HttpClient) {}\n" + new_methods)
    with open(service_path, "w") as f:
        f.write(content)

# create some components using angular CLI
os.chdir(hamlet_dir)
components_to_add = [
    "full-book-navigator",
    "dialogue-list",
    "dialogue-status",
    "research-status-panel",
    "book-browser",
    "scene-pdf-viewer",
    "german-scene-candidates",
    "translation-status-badge",
    "empty-analysis-state"
]
for c in components_to_add:
    os.system(f"ng g c components/{c} --skip-import --standalone")
