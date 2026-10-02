export interface VersionTexts {
  english: string | null;
  human_german: string | null;
  ai_german: string | null;
  context_ai_german: string | null;
}

export interface VersionStatuses {
  human_german: string;
  ai_german: string;
  context_ai_german: string;
}

export interface BookContext {
  english: any;
  german: any;
}

export interface HamletDialogue {
  passage_id: string;
  dialogue_id?: string;
  act: number;
  scene: number;
  speaker: string;
  ftln: {
    start: number | null;
    end: number | null;
  };
  texts: VersionTexts;
  generation_status: VersionStatuses;
  book_context: BookContext;
  phrase_alignments: any[];
  dimension_evidence: Record<string, any>;
  research_status: string;
  text_quality?: string;
}

export interface DialogueViewModel extends HamletDialogue {
  id: string;
  englishScene: number;
  comparisons: any[];
}
