export interface TocItem { href: string; path: string; label: string; depth: number; }

/** Flattens the epub.js navigation tree keeping the nesting depth for indentation. */
export function flattenToc(items: readonly any[], depth = 0): TocItem[] {
  return items.flatMap(item => {
    const href = String(item.href ?? '');
    const entry: TocItem = { href, path: href.split('#')[0], label: String(item.label ?? '').trim(), depth };
    return [entry, ...flattenToc(item.subitems ?? [], depth + 1)];
  });
}

/** TOC hrefs are relative to the nav document and spine hrefs to the OPF, so compare by path suffix. */
export function tocIndexOf(toc: readonly TocItem[], href: string): number {
  const path = href.split('#')[0];
  if (!path) return -1;
  return toc.findIndex(t => t.path && (t.path.endsWith(path) || path.endsWith(t.path)));
}
