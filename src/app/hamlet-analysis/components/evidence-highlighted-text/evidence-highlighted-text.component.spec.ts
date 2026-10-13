import {
  codePointLength,
  codePointSlice,
  EvidenceHighlightedTextComponent
} from './evidence-highlighted-text.component';

describe('EvidenceHighlightedTextComponent & Unicode Helpers', () => {
  it('should correctly measure code point length with surrogate pairs and curly quotes', () => {
    const text = '’Tis bitter cold'; // ’ is 1 code point, 1 utf-16 unit
    expect(codePointLength(text)).toBe(16);

    // Emojis / surrogate pairs
    const emojiText = '🎭 Hamlet'; // '🎭' (1 codepoint, 2 code units) + ' ' (1) + 'Hamlet' (6) = 8 codepoints, 9 code units
    expect(codePointLength(emojiText)).toBe(8);
    expect(emojiText.length).toBe(9);
  });

  it('should slice by Unicode code-point offsets correctly', () => {
    const emojiText = '🎭 Hamlet';
    // Slice from index 2 to end (skipping emoji and space)
    expect(codePointSlice(emojiText, 2, 8)).toBe('Hamlet');
  });

  it('should build non-overlapping segments for deterministic highlighting', () => {
    const comp = new EvidenceHighlightedTextComponent();
    comp.text = 'Who’s there?';
    comp.spans = [
      {
        start: 0,
        end: 5,
        status: 'Preserved',
        isSource: true
      }
    ];

    (comp as any).buildSegments();
    expect(comp.segments.length).toBe(2);
    expect(comp.segments[0].text).toBe('Who’s');
    expect(comp.segments[0].isHighlighted).toBeTrue();
    expect(comp.segments[0].status).toBe('Preserved');
    expect(comp.segments[1].text).toBe(' there?');
    expect(comp.segments[1].isHighlighted).toBeFalse();
  });

  it('should handle overlapping spans by segmenting at boundaries', () => {
    const comp = new EvidenceHighlightedTextComponent();
    comp.text = 'For this relief much thanks.';
    comp.spans = [
      { start: 0, end: 15, status: 'Changed', isSource: true }, // "For this relief"
      { start: 9, end: 27, status: 'Preserved', isSource: true } // "relief much thanks"
    ];

    (comp as any).buildSegments();
    // Boundaries: 0, 9, 15, 27, 28
    expect(comp.segments.length).toBe(4);
    expect(comp.segments[0].text).toBe('For this ');
    expect(comp.segments[1].text).toBe('relief');
    expect(comp.segments[2].text).toBe(' much thanks');
    expect(comp.segments[3].text).toBe('.');
    expect(comp.segments[3].isHighlighted).toBeFalse();
  });
});
