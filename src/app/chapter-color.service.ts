import { Injectable } from '@angular/core';

/**
 * Shared service for deterministic chapter-based color mapping.
 * Used by both topic-list and sunburst to ensure consistent colors:
 * - Each top-level chapter gets a unique base color
 * - Children inherit the same base color with lighter shades by depth
 * - Same chapter → same color every render (index-based, deterministic)
 */
@Injectable({ providedIn: 'root' })
export class ChapterColorService {
  /** Palette of 9 distinct, accessible colors for up to 9 top-level chapters */
  private readonly CHAPTER_PALETTE: string[] = [
    // '#2563eb', // blue
    // '#dc2626', // red
    // '#0891b2', // green
    // '#ca8a04', // amber
    // '#9333ea', // purple
    // '#0891b2', // cyan
    // '#ea580c', // orange
    // '#4f46e5', // indigo
    // '#0d9488', // teal
    // Medium–dark shades
'#1e40af', // blue (darker than #2563eb)
'#991b1b', // red (darker than #dc2626)
'#0e7490', // green/cyan (darker than #0891b2)
'#854d0e', // amber (darker than #ca8a04)
'#6b21a8', // purple (darker than #9333ea)
'#155e75', // cyan (darker than #0891b2)
'#9a3412', // orange (darker than #ea580c)
'#3730a3', // indigo (darker than #4f46e5)
'#115e59', // teal (darker than #0d9488)

  ];

  /** Default gray for nodes without a chapter (e.g. root) */
  readonly DEFAULT_COLOR = '#6b7280';

  /**
   * Get the base color for a top-level chapter by index.
   * Deterministic: same index → same color.
   */
  getChapterBaseColor(chapterIndex: number): string {
    if (chapterIndex < 0) return this.DEFAULT_COLOR;
    return this.CHAPTER_PALETTE[chapterIndex % this.CHAPTER_PALETTE.length] ?? this.DEFAULT_COLOR;
  }

  /**
   * Get the color for a node at a given depth within a chapter.
   * depth 0 = base (top-level chapter), depth 1+ = progressively lighter shades.
   * Children remain visually linked to the parent chapter.
   */
  getColorForDepth(chapterIndex: number, depth: number): string {
    const base = this.getChapterBaseColor(chapterIndex);
    if (depth <= 0) return base;
    return this.lighten(base, Math.min(0.45, depth * 0.15));
  }

  /**
   * Get color for a topic-list node. Use when iterating with topicIndex (chapter index).
   * @param chapterIndex Index of the top-level chapter (0-based)
   * @param depth 0 = chapter, 1 = subchapter, 2 = sub-subchapter, 3 = leaf
   */
  getTopicColor(chapterIndex: number, depth: number): string {
    return this.getColorForDepth(chapterIndex, depth);
  }

  /**
   * Lighten a hex color by a given amount (0–1).
   * amount 0 = unchanged, amount 1 = white
   */
  private lighten(hex: string, amount: number): string {
    const clean = hex.replace('#', '');
    if (clean.length !== 6) return hex;
    const num = parseInt(clean, 16);
    const r = Math.min(255, Math.round((num >> 16) + (255 - (num >> 16)) * amount));
    const g = Math.min(255, Math.round(((num >> 8) & 0xff) + (255 - ((num >> 8) & 0xff)) * amount));
    const b = Math.min(255, Math.round((num & 0xff) + (255 - (num & 0xff)) * amount));
    return '#' + (0x1000000 + r * 0x10000 + g * 0x100 + b).toString(16).slice(1);
  }

  /** Expose palette for debugging or legend use */
  getPalette(): string[] {
    return [...this.CHAPTER_PALETTE];
  }
}
