/**
 * TypeScript interfaces for the hierarchical German Hamlet chart data
 * exported from `src/assets/german.ts`.
 *
 * Tree shape:
 *   Root → Act (Aufzug) → Scene → Semantic Block (leaf)
 */

/** Shared fields on every content node in the tree. */
export interface GermanChartNodeBase {
  name: string;
  content?: string;
  summary?: string;
  keywords?: string[];
  /** Vector embedding (present on scenes and semantic blocks). */
  embeddings?: number[];
  /** Sentence index references (semantic blocks only). */
  source_sentence_indices?: number[];
  children?: GermanChartNode[];
}

/** Root node — e.g. `{ name: "Root", color: "#ffdcf1", ... }` */
export interface GermanChartRoot extends GermanChartNodeBase {
  name: string;
  color: string;
  expanded: boolean;
  key: string;
  children: GermanActNode[];
}

/** Act level — e.g. `"Erster Aufzug"`, `"Dritter Aufzug"`. */
export interface GermanActNode extends GermanChartNodeBase {
  name: string;
  content: string;
  summary: string;
  keywords: string[];
  children: GermanSceneNode[];
}

/** Scene level — e.g. `"Erste Scene"`, `"Zweyte Scene"`. */
export interface GermanSceneNode extends GermanChartNodeBase {
  name: string;
  content: string;
  summary: string;
  keywords: string[];
  embeddings: number[];
  children: GermanSemanticBlockNode[];
}

/** Leaf semantic block — e.g. `"Semantic Block 1"`. */
export interface GermanSemanticBlockNode extends GermanChartNodeBase {
  name: string;
  content: string;
  summary: string;
  keywords: string[];
  source_sentence_indices: number[];
  embeddings: number[];
}

/** Union of all node types (useful for recursive traversal). */
export type GermanChartNode =
  | GermanChartRoot
  | GermanActNode
  | GermanSceneNode
  | GermanSemanticBlockNode;

/** Runtime fields added by the UI (topic list, similarity scoring). */
export interface GermanChartNodeRuntime extends GermanChartNodeBase {
  expanded?: boolean;
  expanded2?: boolean;
  rexpanded?: boolean;
  similarity_score?: number;
  similarity_score2?: number;
  path?: string;
}
