/** Pure helpers that map between the book DOM and the plain text sent to the speech engine. */

export interface TextSlice { node: Text; start: number; end: number; }

/** A block of text as narrated, with the DOM text nodes that compose it (to map speech offsets back to the page). */
export interface Paragraph { text: string; slices: TextSlice[]; }

const BLOCK_SELECTOR = 'h1,h2,h3,h4,h5,h6,p,li,blockquote,div';

/** Innermost text blocks of a rendered section, in reading order. */
export function extractParagraphs(doc: Document): Paragraph[] {
  const body = doc.body;
  if (!body) return [];
  const blocks = Array.from(body.querySelectorAll(BLOCK_SELECTOR))
    .filter(el => !el.querySelector(BLOCK_SELECTOR) && !el.closest('nav,aside,script,style'));
  // Fallback for EPUBs that use spans and no block elements.
  const candidates = blocks.length ? blocks : [body];
  return candidates.map(el => toParagraph(doc, el)).filter((p): p is Paragraph => !!p);
}

function toParagraph(doc: Document, element: Element): Paragraph | undefined {
  const walker = doc.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  const slices: TextSlice[] = [];
  let text = '';
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const value = node.textContent || '';
    if (!value.trim()) continue;
    const start = text.length;
    text += value + ' ';
    slices.push({ node: node as Text, start, end: start + value.length });
  }
  return text.trim() ? { text: text.trimEnd(), slices } : undefined;
}

/** Index of the paragraph that contains a DOM node (e.g. the start of the current page), or -1. */
export function paragraphIndexOf(paragraphs: readonly Paragraph[], node: Node): number {
  return paragraphs.findIndex(p => p.slices.some(s => s.node === node || s.node.parentElement?.contains(node)));
}

/** Paragraph and text offset of a caret position, moved back to the start of its word. */
export function locateCaret(paragraphs: readonly Paragraph[], node: Node, offset: number): { index: number; offset: number } | undefined {
  for (let index = 0; index < paragraphs.length; index++) {
    const slice = paragraphs[index].slices.find(s => s.node === node);
    if (!slice) continue;
    const raw = slice.start + Math.min(offset, slice.end - slice.start);
    return { index, offset: wordStart(paragraphs[index].text, raw) };
  }
  return undefined;
}

export function wordStart(text: string, offset: number): number {
  let i = offset;
  while (i > 0 && !/\s/u.test(text[i - 1])) i--;
  return i;
}

export function wordLength(text: string, start: number): number {
  return text.slice(start).match(/^\S+/u)?.[0].length ?? 0;
}

/** DOM range covering the [start, end) characters of a paragraph's text. */
export function rangeFor(doc: Document, paragraph: Paragraph, start: number, end: number): Range | undefined {
  const first = paragraph.slices.find(s => start >= s.start && start < s.end);
  const last = [...paragraph.slices].reverse().find(s => end > s.start && end <= s.end) ?? first;
  if (!first || !last) return undefined;
  const range = doc.createRange();
  range.setStart(first.node, Math.min(first.node.length, Math.max(0, start - first.start)));
  range.setEnd(last.node, Math.min(last.node.length, Math.max(0, end - last.start)));
  return range;
}

export function caretFromPoint(doc: Document, x: number, y: number): { node: Node; offset: number } | undefined {
  const position = (doc as any).caretPositionFromPoint?.(x, y);
  if (position?.offsetNode) return { node: position.offsetNode, offset: position.offset };
  const range: Range | null | undefined = (doc as any).caretRangeFromPoint?.(x, y);
  return range ? { node: range.startContainer, offset: range.startOffset } : undefined;
}
