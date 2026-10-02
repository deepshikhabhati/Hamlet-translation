import { Injectable } from '@angular/core';
import { DialogueViewModel, HamletDialogue } from '../models/full-book.models';

@Injectable({
  providedIn: 'root'
})
export class FullBookAdapterService {
  constructor() {}

  adaptDialogue(dialogue: HamletDialogue): DialogueViewModel {
    return {
      ...dialogue,
      id: dialogue.dialogue_id || dialogue.passage_id,
      englishScene: dialogue.scene,
      comparisons: [] // Mapped from old structure if necessary
    };
  }

  adaptLegacyToFullBook(legacyPassage: any): DialogueViewModel {
    return {
      passage_id: legacyPassage.passage_id,
      id: legacyPassage.passage_id,
      act: 1, // Default fallback
      scene: 1, // Default fallback
      englishScene: 1,
      speaker: 'UNKNOWN',
      ftln: { start: null, end: null },
      texts: legacyPassage.texts || {
        english: null, human_german: null, ai_german: null, context_ai_german: null
      },
      generation_status: { human_german: 'completed', ai_german: 'completed', context_ai_german: 'completed' },
      book_context: { english: null, german: null },
      phrase_alignments: legacyPassage.phrase_alignments || [],
      dimension_evidence: legacyPassage.dimension_evidence || {},
      research_status: 'legacy',
      comparisons: []
    };
  }
}
