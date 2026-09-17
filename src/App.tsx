import { memo, type CSSProperties, type FormEvent, type MouseEvent as ReactMouseEvent } from 'preact/compat';
import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';

import { loadExternalSource, useCatechismData } from './lib/data';
import type { AppLanguage } from './lib/i18n';
import type { CatechismData, CatechismNode, ExternalReference, ExternalSource, Footnote } from './types';

type Citation = {
  key: string;
  eyebrow: string;
  title: string;
  html: string;
  target?: number;
  sourceId?: string | null;
  name?: string;
  swedishBibleRef?: string;
};

type SwedishBible = {
  books: Array<{
    nr: number;
    name: string;
    chapters: Array<{ chapter: number; verses: Array<{ verse: number; text: string }> }>;
  }>;
};

let swedishBiblePromise: Promise<SwedishBible> | null = null;

const swedishBookNumbers: Record<string, number> = {
  '1 mos': 1, '2 mos': 2, '3 mos': 3, '4 mos': 4, '5 mos': 5, jos: 6, dom: 7, rut: 8,
  '1 sam': 9, '2 sam': 10, '1 kung': 11, '2 kung': 12, '1 krön': 13, '2 krön': 14,
  esr: 15, neh: 16, est: 17, job: 18, ps: 19, ords: 20, pred: 21, höga: 22, jes: 23,
  jer: 24, klag: 25, hes: 26, dan: 27, hos: 28, joel: 29, am: 30, ob: 31, jona: 32,
  mik: 33, nah: 34, hab: 35, sef: 36, hagg: 37, sak: 38, mal: 39, matt: 40, mark: 41,
  luk: 42, joh: 43, apg: 44, rom: 45, '1 kor': 46, '2 kor': 47, gal: 48, ef: 49,
  fil: 50, kol: 51, '1 thess': 52, '2 thess': 53, '1 tim': 54, '2 tim': 55, tit: 56,
  filem: 57, heb: 58, jak: 59, '1 pet': 60, '2 pet': 61, '1 joh': 62, '2 joh': 63,
  '3 joh': 64, jud: 65, upp: 66, tob: 69, judit: 70, vis: 73, syr: 74, bar: 75,
  '1 mack': 80, '2 mack': 81, vish: 73, 'h�ga v': 22,
};

function bibleReferenceFromHref(href: string) {
  try {
    const url = new URL(href, location.href);
    if (!url.hostname.includes('bibeln.se')) return null;
    const query = new URLSearchParams(url.hash.replace(/^#/, '')).get('q');
    return query?.replace(/\+/g, ' ').replace(/\s+/g, ' ').trim() ?? null;
  } catch {
    return null;
  }
}

function normalizeBibleReference(reference: string) {
  return reference.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
}

type TocBranch = {
  label: string;
  start: number;
  children: TocBranch[];
};

function displayHierarchy(value: string, language: 'en' | 'sv', titles?: Record<string, string>) {
  const translated = language === 'sv' ? titles?.[value] : undefined;
  const prefix = value.split(':')[0];
  const kind = hierarchyKind(value);
  const SwedishKinds: Record<string, string> = { part: 'Del', section: 'Avdelning', chapter: 'Kapitel', article: 'Artikel', paragraph: 'Paragraf' };
  return {
    kind: language === 'sv' ? prefix.replace(/^(Part|Section|Chapter|Article|Paragraph)/, SwedishKinds[kind] ?? prefix) : prefix,
    title: translated ?? cleanHierarchyLabel(value),
  };
}

const copy = {
  en: {
    title: 'Catechism of the Catholic Church',
    contents: 'Contents',
    hideContents: 'Hide contents',
    showContents: 'Show contents',
    paragraph: 'Paragraph',
    invalidParagraph: 'Enter a paragraph number from 1 to 2865.',
    jump: 'Go',
    search: 'Search the text',
    noResults: 'No passages found.',
    results: 'Search results',
    close: 'Close',
    open: 'Read paragraph',
    reference: 'Paragraph reference',
    footnote: 'Footnote',
    citationUnavailable: 'The full citation is not available in this edition.',
    englishFallback: 'English source shown because this citation is unavailable in Swedish.',
  },
  sv: {
    title: 'Katolska kyrkans katekes',
    contents: 'Innehåll',
    hideContents: 'Dölj innehåll',
    showContents: 'Visa innehåll',
    paragraph: 'Paragraf',
    invalidParagraph: 'Ange ett paragrafnummer från 1 till 2865.',
    jump: 'Gå',
    search: 'Sök i texten',
    noResults: 'Inga textställen hittades.',
    results: 'Sökresultat',
    close: 'Stäng',
    open: 'Läs paragraf',
    reference: 'Paragrafhänvisning',
    footnote: 'Fotnot',
    citationUnavailable: 'Den fullständiga hänvisningen saknas i denna utgåva.',
    englishFallback: 'Engelsk källa visas eftersom hänvisningen saknas på svenska.',
  },
};

function cleanHierarchyLabel(value: string) {
  return value.replace(/^(Part|Section|Chapter|Article|Paragraph)\s+(\w+):\s*/i, '').replace(/^"|"$/g, '');
}

function textPreview(html: string) {
  return html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&#160;/gi, ' ').replace(/\s+/g, ' ').trim().slice(0, 210);
}

function hierarchyKind(value: string) {
  return value.match(/^(Part|Section|Chapter|Article|Paragraph)/i)?.[1]?.toLowerCase() ?? '';
}

function buildToc(nodes: CatechismNode[]) {
  const roots: TocBranch[] = [];
  const rootMap = new Map<string, TocBranch>();

  for (const node of nodes) {
    let siblings = roots;
    let branchMap = rootMap;
    for (const label of node.breadcrumbs) {
      let branch = branchMap.get(label);
      if (!branch) {
        branch = { label, start: node.id, children: [] };
        branchMap.set(label, branch);
        siblings.push(branch);
      }
      const childMap = new Map(branch.children.map((child) => [child.label, child]));
      siblings = branch.children;
      branchMap = childMap;
    }
  }
  return roots;
}

function TocItem({ branch, activePath, onJump, titles, language, depth = 0 }: {
  branch: TocBranch;
  activePath: string[];
  onJump: (id: number) => void;
  titles?: Record<string, string>;
  language: 'en' | 'sv';
  depth?: number;
}) {
  const active = activePath.includes(branch.label);
  const hasChildren = branch.children.length > 0;
  const display = displayHierarchy(branch.label, language, titles);
  const [open, setOpen] = useState(active || depth === 0);
  const childrenId = `toc-children-${depth}-${branch.start}`;

  useEffect(() => {
    if (active) setOpen(true);
  }, [active]);

  return (
    <li className={`toc-item toc-depth-${depth} ${active ? 'is-active' : ''}`}>
      {hasChildren ? (
        <>
          <div className="toc-branch-row">
            <button
              aria-controls={childrenId}
              aria-expanded={open}
              aria-label={language === 'sv'
                ? `${open ? 'Dölj' : 'Visa'} ${display.title}`
                : `${open ? 'Collapse' : 'Expand'} ${display.title}`}
              className="toc-caret"
              onClick={() => setOpen((current) => !current)}
              type="button"
            >
              <span aria-hidden="true">›</span>
            </button>
            <button
              className="toc-branch-link"
              onClick={() => {
                setOpen(true);
                onJump(branch.start);
              }}
              type="button"
            >
              <span><small>{display.kind}</small>{display.title}</span>
            </button>
          </div>
          <ul hidden={!open} id={childrenId}>{branch.children.map((child) => <TocItem activePath={activePath} branch={child} depth={depth + 1} key={child.label} language={language} onJump={onJump} titles={titles} />)}</ul>
        </>
      ) : (
        <button onClick={() => onJump(branch.start)} type="button">
          <span>{display.kind}</span>
          {display.title}
        </button>
      )}
    </li>
  );
}

function HierarchyBreak({ node, previous, language, titles, onCitation, selectedFootnote }: {
  node: CatechismNode;
  previous?: CatechismNode;
  language: 'en' | 'sv';
  titles?: Record<string, string>;
  onCitation: (citation: Citation) => void;
  selectedFootnote?: Footnote;
}) {
  const changed = node.breadcrumbs.filter((entry, index) => previous?.breadcrumbs[index] !== entry);
  if (!changed.length && !node.headings.length) return null;

  return (
    <header className="hierarchy-break">
      {changed.map((entry) => {
        const display = displayHierarchy(entry, language, titles);
        return <div className={`hierarchy-title hierarchy-${hierarchyKind(entry)}`} key={entry}>
          <span>{display.kind}</span>
          <h2>{display.title}</h2>
        </div>;
      })}
      {node.headings.map((heading) => {
        let html = heading.html ? (language === 'sv' ? stripSwedishParagraphLinks(heading.html) : heading.html) : '';
        html = labelFootnoteLinks(html, language === 'sv' ? 'Fotnot' : 'Footnote', selectedFootnote?.number);
        return html ? (
          <h3 className={`text-heading heading-${heading.kind}`} dangerouslySetInnerHTML={{ __html: html }} key={`${node.id}-${heading.text}`} onClick={(event) => showNodeCitation(event, node, language, onCitation)} />
        ) : (
          <h3 className={`text-heading heading-${heading.kind}`} key={`${node.id}-${heading.text}`}>{language === 'sv' && heading.text === 'IN BRIEF' ? 'SAMMANFATTNING' : heading.text}</h3>
        );
      })}
    </header>
  );
}

function isInBrief(node?: CatechismNode) {
  return Boolean(node && (node.title.toUpperCase() === 'IN BRIEF' || node.title.toLocaleUpperCase('sv') === 'SAMMANFATTNING'));
}

function stripSwedishParagraphLinks(html: string) {
  return html.replace(/<i>\s*\[(?:(?!<\/i>)[\s\S])*?katekesen\.se(?:(?!<\/i>)[\s\S])*?<\/i>/gi, '');
}

function labelFootnoteLinks(html: string, label: string, selectedNumber?: number | string) {
  const selected = selectedNumber === undefined ? null : String(selectedNumber).replace(/[^0-9]/g, '');
  return html
    .replace(/<a\s+([^>]*)><sup>(\[?(\d+)\]?)<\/sup><\/a>/gi, (_match, attributes: string, marker: string, number: string) =>
      `<a ${attributes} aria-label="${label} ${number}"><sup${selected === number ? ' class="is-selected"' : ''}>${marker}</sup></a>`)
    .replace(/<sup><a\s+([^>]*)>(\[?(\d+)\]?)<\/a><\/sup>/gi, (_match, attributes: string, marker: string, number: string) =>
      `<sup${selected === number ? ' class="is-selected"' : ''}><a ${attributes} aria-label="${label} ${number}">${marker}</a></sup>`);
}

function showNodeCitation(
  event: ReactMouseEvent<HTMLElement>,
  node: CatechismNode,
  language: 'en' | 'sv',
  onCitation: (citation: Citation) => void,
) {
  const target = (event.target as HTMLElement).closest('a');
  const bibleReference = target ? bibleReferenceFromHref(target.getAttribute('href') ?? '') : null;
  if (language === 'sv' && bibleReference) {
    event.preventDefault();
    event.stopPropagation();
    const name = normalizeBibleReference(bibleReference);
    onCitation({ key: `bible-${node.id}-${name}`, eyebrow: 'Bibelreferens', title: 'Bibel', name, html: '', swedishBibleRef: name });
    return;
  }
  const sup = target?.querySelector('sup') ?? (event.target as HTMLElement).closest('sup');
  if (!sup) return;
  event.preventDefault();
  const token = sup.textContent?.replace(/[^0-9]/g, '');
  const footnote = node.footnotes.find((item) => String(item.number) === token);
  if (footnote) onCitation(footnoteCitation(node, footnote, language));
}

const ReaderParagraph = memo(function ReaderParagraph({ node, previous, next, selectedKey, onCitation, language, titles }: {
  node: CatechismNode;
  previous?: CatechismNode;
  next?: CatechismNode;
  selectedKey?: string;
  onCitation: (citation: Citation) => void;
  language: 'en' | 'sv';
  titles?: Record<string, string>;
}) {
  const inBrief = isInBrief(node);
  const sameHierarchyAsPrevious = previous?.breadcrumbs.join('|') === node.breadcrumbs.join('|');
  const sameHierarchyAsNext = next?.breadcrumbs.join('|') === node.breadcrumbs.join('|');
  const inBriefStart = inBrief && (!isInBrief(previous) || !sameHierarchyAsPrevious);
  const inBriefEnd = inBrief && (!isInBrief(next) || !sameHierarchyAsNext);
  const selectedFootnoteId = selectedKey?.startsWith(`fn-${node.id}-`) ? selectedKey.slice(`fn-${node.id}-`.length) : undefined;
  const selectedFootnote = selectedFootnoteId ? node.footnotes.find((item) => item.id === selectedFootnoteId) : undefined;
  let paragraphHtml = language === 'sv' ? stripSwedishParagraphLinks(node.textHtml) : node.textHtml;
  const footnoteLabel = language === 'sv' ? 'Fotnot' : 'Footnote';
  paragraphHtml = labelFootnoteLinks(paragraphHtml, footnoteLabel, selectedFootnote?.number);

  return (
    <article aria-labelledby={`paragraph-number-${node.id}`} className={`reader-paragraph ${inBrief ? 'in-brief' : ''} ${inBriefStart ? 'in-brief-start' : ''} ${inBriefEnd ? 'in-brief-end' : ''}`} data-paragraph={node.id} id={`paragraph-${node.id}`}>
      <HierarchyBreak language={language} node={node} onCitation={onCitation} previous={previous} selectedFootnote={selectedFootnote} titles={titles} />
      <div className="paragraph-row">
        <div className="margin-references" aria-label={language === 'sv' ? 'Paragrafhänvisningar' : 'Paragraph references'}>
          {node.xrefs.map((id) => (
            <button className={selectedKey === `xref-${node.id}-${id}` ? 'is-selected' : ''} key={id} onClick={(event) => { event.stopPropagation(); onCitation({ key: `xref-${node.id}-${id}`, eyebrow: copy[language].reference, title: `§ ${id}`, html: '', target: id }); }} type="button">{id}</button>
          ))}
        </div>
        <div className="paragraph-number" id={`paragraph-number-${node.id}`}>{node.number}</div>
        <div className="paragraph-copy" dangerouslySetInnerHTML={{ __html: paragraphHtml }} onClick={(event) => showNodeCitation(event, node, language, onCitation)} />
      </div>
    </article>
  );
});

function footnoteCitation(node: CatechismNode, footnote: Footnote, language: 'en' | 'sv'): Citation {
  const reference = node.externalReferences.find((item) => item.footnoteId === footnote.id);
  return { key: `fn-${node.id}-${footnote.id}`, eyebrow: copy[language].footnote, title: String(footnote.number), name: reference?.label ?? footnote.text, html: footnote.html || footnote.text, target: paragraphTarget(reference), sourceId: reference?.sourceId };
}

function SwedishBiblePassage({ reference }: { reference: string }) {
  const [passage, setPassage] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const match = normalizeBibleReference(reference).match(/^(.+?)\s+(\d+):(\d+)(?:-(\d+))?(f{1,2})?/i);
    if (!match) { setFailed(true); return; }
    const bookKey = match[1].toLocaleLowerCase('sv').replace(/\.$/, '');
    const bookNumber = swedishBookNumbers[bookKey];
    const chapterNumber = Number(match[2]);
    const firstVerse = Number(match[3]);
    const lastVerse = match[4] ? Number(match[4]) : firstVerse + (match[5]?.length ?? 0);
    if (!bookNumber) { setFailed(true); return; }
    swedishBiblePromise ??= fetch('https://api.getbible.net/v2/swedish.json').then((response) => {
      if (!response.ok) throw new Error('Bible source unavailable');
      return response.json() as Promise<SwedishBible>;
    });
    let cancelled = false;
    swedishBiblePromise.then((bible) => {
      const chapter = bible.books.find((book) => book.nr === bookNumber)?.chapters.find((entry) => entry.chapter === chapterNumber);
      const text = chapter?.verses.filter((verse) => verse.verse >= firstVerse && verse.verse <= lastVerse).map((verse) => `<span class="verse-number">${verse.verse}</span> ${verse.text.trim()}`).join(' ');
      if (!cancelled) {
        if (text) setPassage(text); else setFailed(true);
      }
    }).catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [reference]);

  if (failed) return <p>Den svenska bibeltexten kunde inte hämtas.</p>;
  if (!passage) return <p>Hämtar bibeltext…</p>;
  return <><div className="citation-text" dangerouslySetInnerHTML={{ __html: passage }} /><p className="source-note">Svenska 1917 (public domain)</p></>;
}

function paragraphTarget(reference?: ExternalReference) {
  const match = reference?.label.match(/(?:CCC|CC|KKK|§)\s*(\d+)/i);
  return match ? Number(match[1]) : undefined;
}

function normalizedCitationText(value: string) {
  return value
    .replace(/<(?:br|\/p|\/div|\/li)\b[^>]*>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;|&#160;|&#xa0;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#(?:39|x27);/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function repeatsCitationName(html: string | undefined, name: string | undefined) {
  return Boolean(html && name && normalizedCitationText(html) === normalizedCitationText(name));
}

function CitationPanel({ citation, data, language, onClose, onJump }: {
  citation: Citation;
  data: CatechismData;
  language: 'en' | 'sv';
  onClose: () => void;
  onJump: (id: number) => void;
}) {
  const t = copy[language];
  const [source, setSource] = useState<ExternalSource | null>(null);
  const panelRef = useRef<HTMLElement>(null);
  const targetNode = citation.target ? data.nodes.find((node) => node.id === citation.target) : undefined;

  useEffect(() => {
    let cancelled = false;
    setSource(null);
    if (citation.sourceId) loadExternalSource(citation.sourceId).then((value) => { if (!cancelled) setSource(value); });
    return () => { cancelled = true; };
  }, [citation.sourceId]);

  useEffect(() => panelRef.current?.focus(), [citation.key]);

  const sourceContent = source?.contentByLanguage?.[language]?.html ?? source?.contentHtml;
  const isFallback = language === 'sv' && source && !source.contentByLanguage?.sv;
  const translations = Object.entries(source?.contentByLanguage ?? {});
  const currentTranslation = source?.contentByLanguage?.[language];
  const visibleTranslations = translations.filter(([, translation]) => !repeatsCitationName(translation.html, citation.name));
  const sourceRepeatsName = repeatsCitationName(sourceContent, citation.name);
  const citationRepeatsName = repeatsCitationName(citation.html, citation.name);
  const languageNames: Record<string, string> = { en: 'English', sv: 'Svenska', la: 'Latina', it: 'Italiano', es: 'Español', zh: '中文' };

  return (
    <aside aria-label={`${t.footnote}: ${citation.name ?? citation.title}`} className="citation-panel" ref={panelRef} tabIndex={-1}>
      <button aria-label={t.close} className="citation-close" onClick={onClose} type="button">×</button>
      <p className="citation-eyebrow">{citation.eyebrow}</p>
      <h2><span>{citation.title}</span>{citation.name ? <strong>{citation.name}</strong> : null}</h2>
      {citation.swedishBibleRef ? <SwedishBiblePassage reference={citation.swedishBibleRef} /> : targetNode ? <div className="citation-text" dangerouslySetInnerHTML={{ __html: targetNode.textHtml }} /> : currentTranslation ? repeatsCitationName(currentTranslation.html, citation.name) ? null : <div className="citation-text" dangerouslySetInnerHTML={{ __html: currentTranslation.html }} /> : translations.length > 1 ? visibleTranslations.length ? <div className="citation-translations">{visibleTranslations.map(([code, translation]) => <details key={code}><summary>{languageNames[code] ?? code.toUpperCase()}</summary><div className="citation-text" dangerouslySetInnerHTML={{ __html: translation.html }} /></details>)}</div> : null : sourceContent ? sourceRepeatsName ? null : <div className="citation-text" dangerouslySetInnerHTML={{ __html: sourceContent }} /> : citation.html ? citationRepeatsName ? null : <div className="citation-text" dangerouslySetInnerHTML={{ __html: citation.html }} /> : <p>{t.citationUnavailable}</p>}
      {isFallback && !sourceRepeatsName ? <p className="fallback-note">{t.englishFallback}</p> : null}
      {citation.target ? <button className="jump-citation" onClick={() => onJump(citation.target!)} title={t.open} type="button"><span>↗</span>{t.open}</button> : null}
    </aside>
  );
}

function App() {
  const [language, setLanguage] = useState<'en' | 'sv'>(() => new URLSearchParams(location.search).get('lang') === 'sv' ? 'sv' : 'en');
  const { data, error, loading } = useCatechismData(language as AppLanguage);
  const [tocOpen, setTocOpen] = useState(true);
  const [activeId, setActiveId] = useState(1);
  const [jumpValue, setJumpValue] = useState('');
  const [jumpInvalid, setJumpInvalid] = useState(false);
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [citation, setCitation] = useState<Citation | null>(null);
  const [toolbarHidden, setToolbarHidden] = useState(false);
  const [citationWidth, setCitationWidth] = useState(340);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const t = copy[language];

  const nodes = useMemo(() => data ? [...data.nodes].sort((a, b) => a.id - b.id) : [], [data]);
  const toc = useMemo(() => buildToc(nodes), [nodes]);
  const activeNode = nodes.find((node) => node.id === activeId) ?? nodes[0];
  const selectedCitationNodeId = citation ? Number(citation.key.match(/^(?:fn|xref|bible)-(\d+)-/)?.[1]) : null;
  const results = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase(language);
    if (needle.length < 2) return [];
    return nodes.filter((node) => `${node.number} ${node.title} ${node.textHtml}`.toLocaleLowerCase(language).includes(needle)).slice(0, 40);
  }, [language, nodes, search]);

  const jumpTo = useCallback((id: number) => {
    const element = document.getElementById(`paragraph-${id}`);
    if (!element) return;
    element.scrollIntoView({ behavior: 'auto', block: 'start' });
    setActiveId(id);
    setSearchOpen(false);
    const url = new URL(location.href);
    url.searchParams.set('p', String(id));
    history.replaceState({}, '', url);
  }, []);

  useEffect(() => {
    const url = new URL(location.href);
    if (language === 'sv') url.searchParams.set('lang', 'sv'); else url.searchParams.delete('lang');
    history.replaceState({}, '', url);
    localStorage.setItem('catholic-core-language', language);
  }, [language]);

  useEffect(() => {
    if (!nodes.length) return;
    observerRef.current?.disconnect();
    observerRef.current = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => Math.abs(a.boundingClientRect.top - innerHeight * .34) - Math.abs(b.boundingClientRect.top - innerHeight * .34))[0];
      if (visible) setActiveId(Number((visible.target as HTMLElement).dataset.paragraph));
    }, { rootMargin: '-22% 0px -58% 0px', threshold: 0 });
    document.querySelectorAll('[data-paragraph]').forEach((element) => observerRef.current?.observe(element));
    const requested = Number(new URLSearchParams(location.search).get('p'));
    if (requested) requestAnimationFrame(() => jumpTo(requested));
    return () => observerRef.current?.disconnect();
  }, [jumpTo, nodes.length]);

  useEffect(() => {
    let lastY = window.scrollY;
    function onScroll() {
      const currentY = window.scrollY;
      if (Math.abs(currentY - lastY) > 8) setToolbarHidden(currentY > lastY && currentY > 120);
      lastY = currentY;
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || target?.isContentEditable || /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(target?.tagName ?? '')) return;
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
      const index = nodes.findIndex((node) => node.id === activeId);
      const destination = event.key === 'ArrowDown' ? nodes[index + 1] : nodes[index - 1];
      if (destination) {
        event.preventDefault();
        jumpTo(destination.id);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeId, jumpTo, nodes]);

  function beginCitationResize(event: ReactMouseEvent<HTMLDivElement>) {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = citationWidth;
    function onMove(moveEvent: globalThis.MouseEvent) {
      setCitationWidth(Math.min(620, Math.max(280, startWidth + startX - moveEvent.clientX)));
    }
    function onUp() {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  function resizeCitationWithKeyboard(event: KeyboardEvent) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    setCitationWidth((width) => Math.min(620, Math.max(280, width + (event.key === 'ArrowLeft' ? 20 : -20))));
  }

  function submitJump(event: FormEvent) {
    event.preventDefault();
    const id = Number(jumpValue);
    if (Number.isInteger(id) && nodes.some((node) => node.id === id)) {
      setJumpInvalid(false);
      jumpTo(id);
      return;
    }
    setJumpInvalid(true);
  }

  if (loading) return <main className="loading">{language === 'sv' ? 'Öppnar katekesen…' : 'Opening the Catechism…'}</main>;
  if (error || !data) return <main className="loading">{error ?? 'Unable to load the Catechism.'}</main>;

  return (
    <div className={`book-app ${tocOpen ? '' : 'toc-hidden'} ${citation ? 'citation-open' : ''} ${toolbarHidden ? 'toolbar-hidden' : ''}`} lang={language} style={{ '--aside': `${citationWidth}px` } as CSSProperties}>
      <a className="skip-link" href="#reader-content">{language === 'sv' ? 'Hoppa till texten' : 'Skip to text'}</a>
      <header className="reader-toolbar">
        <button aria-expanded={tocOpen} aria-label={tocOpen ? t.hideContents : t.showContents} className="toc-toggle" onClick={() => setTocOpen((value) => !value)} type="button"><span /><span /><span /></button>
        <div className="book-title">{t.title}</div>
        <div className="reader-tools">
          <form className={`jump-form ${jumpInvalid ? 'is-invalid' : ''}`} onSubmit={submitJump}>
            <input aria-describedby={jumpInvalid ? 'jump-error' : undefined} aria-invalid={jumpInvalid} aria-label={t.paragraph} inputMode="numeric" onChange={(event) => { setJumpValue(event.currentTarget.value); setJumpInvalid(false); }} placeholder={`${t.paragraph}…`} value={jumpValue} />
            <button type="submit">{t.jump}</button>
            <span className="visually-hidden" id="jump-error" role="alert">{jumpInvalid ? t.invalidParagraph : ''}</span>
          </form>
          <div className="search-control">
            <span aria-hidden="true">⌕</span>
            <input aria-label={t.search} onChange={(event) => { setSearch(event.currentTarget.value); setSearchOpen(event.currentTarget.value.trim().length >= 2); }} onFocus={() => search.trim().length >= 2 && setSearchOpen(true)} placeholder={t.search} value={search} />
          </div>
          <div className="language-control" aria-label="Language">
            <button aria-pressed={language === 'en'} className={language === 'en' ? 'is-active' : ''} onClick={() => setLanguage('en')} type="button">EN</button>
            <button aria-pressed={language === 'sv'} className={language === 'sv' ? 'is-active' : ''} onClick={() => setLanguage('sv')} type="button">SV</button>
          </div>
        </div>
      </header>

      <aside className="toc-panel">
        <div className="toc-heading"><span>{t.contents}</span><button onClick={() => setTocOpen(false)} type="button">×</button></div>
        <nav aria-label={t.contents}><ul>{toc.map((branch) => <TocItem activePath={activeNode?.breadcrumbs ?? []} branch={branch} key={branch.label} language={language} onJump={jumpTo} titles={data.hierarchyTitles} />)}</ul></nav>
      </aside>

      <main className="book-column" id="reader-content" tabIndex={-1}>
        <div className="edition-title"><span>CCC</span><h1>{t.title}</h1><p>{language === 'sv' ? 'Den fullständiga texten' : 'The complete text'}</p></div>
        {nodes.map((node, index) => <ReaderParagraph key={node.id} language={language} next={nodes[index + 1]} node={node} onCitation={setCitation} previous={nodes[index - 1]} selectedKey={selectedCitationNodeId === node.id ? citation?.key : undefined} titles={data.hierarchyTitles} />)}
      </main>

      {searchOpen ? (
        <div aria-label={t.results} aria-live="polite" className="search-overlay" role="region">
          <div className="search-overlay-heading"><div><span>{t.results}</span><strong>“{search}”</strong></div><button aria-label={t.close} onClick={() => setSearchOpen(false)} type="button">×</button></div>
          <div className="search-results">
            {results.length ? results.map((node) => <button key={node.id} onClick={() => jumpTo(node.id)} type="button"><span>{node.number}</span><div><strong>{node.title}</strong><p>{textPreview(node.textHtml)}</p></div></button>) : <p className="no-results">{t.noResults}</p>}
          </div>
        </div>
      ) : null}

      {citation ? <><div aria-label={language === 'sv' ? 'Ändra bredd på hänvisningspanelen' : 'Resize citation panel'} aria-orientation="vertical" aria-valuemax={620} aria-valuemin={280} aria-valuenow={citationWidth} className="citation-resize" onKeyDown={resizeCitationWithKeyboard} onMouseDown={beginCitationResize} role="separator" tabIndex={0} /><CitationPanel citation={citation} data={data} language={language} onClose={() => setCitation(null)} onJump={jumpTo} /></> : null}
    </div>
  );
}

export default App;
