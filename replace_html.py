import sys

with open('src/app/hamlet-analysis/components/phrase-evidence-workspace/phrase-evidence-workspace.component.html', 'r') as f:
    lines = f.readlines()

new_html = """  <div class="phrase-workspace__empty" *ngIf="!evidenceLoadError && phraseAlignments.length === 0 && dialoguePhraseGroups.length === 0">
    <i class="fas fa-info-circle"></i>
    No phrase-alignment evidence found for this selection.
  </div>

  <ng-container *ngIf="phraseAlignments.length > 0 || dialoguePhraseGroups.length > 0">
    <!-- Single active evidence dimension selector -->
    <app-ha-dimension-toolbar
      [selectedDimension]="selectedDimension"
      [showPhraseScores]="showPhraseScores"
      (dimensionChange)="onDimensionChange($event)"
      (showScoresChange)="showPhraseScores = $event"
    ></app-ha-dimension-toolbar>

    <!-- Classification states legend -->
    <div class="phrase-workspace__legend">
      <app-ha-phrase-status-legend></app-ha-phrase-status-legend>
    </div>

    <!-- Dynamic Aligned Phrase Cards -->
    <div class="phrase-cards-container" role="list" aria-label="Aligned phrase cards">
      
      <!-- Scene Mode: Grouped by Dialogue -->
      <ng-container *ngIf="selectedLevel === 'scene' && dialoguePhraseGroups.length > 0">
        <section *ngFor="let group of dialoguePhraseGroups" class="dialogue-evidence-group" style="margin-bottom: 2rem;">
          <header class="dialogue-group-header" style="background: rgba(0,0,0,0.02); padding: 0.5rem 1rem; border-left: 3px solid #3b82f6; margin-bottom: 1rem; border-radius: 4px;">
            <strong style="margin-right: 1rem; text-transform: uppercase;">{{ group.speaker }}</strong>
            <span style="color: #64748b; font-size: 0.85rem;">{{ group.dialogue_id }}</span>
          </header>

          <article
            *ngFor="let alignment of group.phrase_alignments; trackBy: trackByAlignment; let index = index"
            class="alignment-card"
            [class.alignment-card--active]="isCardHighlighted(alignment.alignment_id)"
            [class.alignment-card--dimmed]="isCardDimmed(alignment.alignment_id)"
            [class.pulse-border]="isCardPulsing(alignment.alignment_id)"
          >
            <div class="alignment-header" style="display: flex; gap: 1rem; margin-bottom: 0.5rem; color: #64748b; font-size: 0.8rem; font-weight: 500;">
              <span>Aligned Phrase {{ index + 1 }}</span>
              <span *ngIf="alignment.speaker">{{ alignment.speaker }}</span>
              <span *ngIf="alignment.dialogue_id">{{ alignment.dialogue_id }}</span>
            </div>

            <div class="phrase-grid">
              <div
                class="phrase-version"
                *ngFor="let version of versions"
                [class.active-linked]="activeAlignmentId === alignment.alignment_id"
                (mouseenter)="activeAlignmentId = alignment.alignment_id"
                (mouseleave)="activeAlignmentId = null"
                (click)="onCardSelect(alignment, version.key)"
              >
                <div class="version-label" style="font-size: 0.75rem; font-weight: 600; text-transform: uppercase; color: #94a3b8; margin-bottom: 0.25rem;">
                  {{ version.label }}
                </div>

                <ng-container *ngIf="getPhraseText(alignment, version.key) as phraseText; else missingSpan">
                  <div class="phrase-text" style="font-size: 0.95rem; line-height: 1.5; color: #334155;">
                    {{ phraseText }}
                  </div>
                  <span
                    *ngIf="version.key !== 'english'"
                    class="classification-badge"
                    style="margin-top: 0.5rem; display: inline-flex; align-items: center; gap: 0.25rem; font-size: 0.75rem; padding: 0.1rem 0.5rem; border-radius: 4px; background: rgba(0,0,0,0.05);"
                  >
                    {{ getPhraseStatus(alignment, version.key) }}
                  </span>
                </ng-container>

                <ng-template #missingSpan>
                  <div class="missing-span" style="color: #94a3b8; font-style: italic;">
                    No corresponding span
                  </div>
                </ng-template>
              </div>
            </div>

            <footer class="aligned-card__footer">
              <span class="aligned-card__cta">
                <i class="fas fa-info-circle"></i> Click to inspect rules, explanation & expert validation
              </span>
            </footer>
          </article>
        </section>
      </ng-container>

      <!-- Dialogue Mode: Flat Phrase Alignments -->
      <ng-container *ngIf="selectedLevel === 'dialogue' && phraseAlignments.length > 0">
        <article
          *ngFor="let alignment of phraseAlignments; trackBy: trackByAlignment; let index = index"
          class="alignment-card"
          [class.alignment-card--active]="isCardHighlighted(alignment.alignment_id)"
          [class.alignment-card--dimmed]="isCardDimmed(alignment.alignment_id)"
          [class.pulse-border]="isCardPulsing(alignment.alignment_id)"
        >
          <div class="alignment-header" style="display: flex; gap: 1rem; margin-bottom: 0.5rem; color: #64748b; font-size: 0.8rem; font-weight: 500;">
            <span>Aligned Phrase {{ index + 1 }}</span>
            <span *ngIf="alignment.speaker">{{ alignment.speaker }}</span>
            <span *ngIf="alignment.dialogue_id">{{ alignment.dialogue_id }}</span>
          </div>

          <div class="phrase-grid">
            <div
              class="phrase-version"
              *ngFor="let version of versions"
              [class.active-linked]="activeAlignmentId === alignment.alignment_id"
              (mouseenter)="activeAlignmentId = alignment.alignment_id"
              (mouseleave)="activeAlignmentId = null"
              (click)="onCardSelect(alignment, version.key)"
            >
              <div class="version-label" style="font-size: 0.75rem; font-weight: 600; text-transform: uppercase; color: #94a3b8; margin-bottom: 0.25rem;">
                {{ version.label }}
              </div>

              <ng-container *ngIf="getPhraseText(alignment, version.key) as phraseText; else missingSpan">
                <div class="phrase-text" style="font-size: 0.95rem; line-height: 1.5; color: #334155;">
                  {{ phraseText }}
                </div>
                <span
                  *ngIf="version.key !== 'english'"
                  class="classification-badge"
                  style="margin-top: 0.5rem; display: inline-flex; align-items: center; gap: 0.25rem; font-size: 0.75rem; padding: 0.1rem 0.5rem; border-radius: 4px; background: rgba(0,0,0,0.05);"
                >
                  {{ getPhraseStatus(alignment, version.key) }}
                </span>
              </ng-container>

              <ng-template #missingSpan>
                <div class="missing-span" style="color: #94a3b8; font-style: italic;">
                  No corresponding span
                </div>
              </ng-template>
            </div>
          </div>

          <footer class="aligned-card__footer">
            <span class="aligned-card__cta">
              <i class="fas fa-info-circle"></i> Click to inspect rules, explanation & expert validation
            </span>
          </footer>
        </article>
      </ng-container>
    </div>
  </ng-container>
"""

out_lines = lines[:63] + [new_html] + lines[309:]

with open('src/app/hamlet-analysis/components/phrase-evidence-workspace/phrase-evidence-workspace.component.html', 'w') as f:
    f.writelines(out_lines)

