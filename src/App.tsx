import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent, type MouseEvent as ReactMouseEvent } from 'react';

import { useCatechismData } from './lib/data';
import type { AppLanguage } from './lib/i18n';
import type { CatechismData, CatechismNode, ExternalReference, Footnote } from './types';

type Citation = {
  key: string;
  eyebrow: string;
  title: string;
  html: string;
  target?: number;
  sourceId?: string | null;
};

type TocBranch = {
  label: string;
  start: number;
  children: TocBranch[];
};

function displayHierarchy(value: string, language: 'en' | 'sv', titles?: Record<string, string>) {
  const translated = language === 'sv' ? titles?.[value] : undefined;
  const prefix = value.split(':')[0];
  const kind = hierarchyKind(value);
  const SwedishKinds: Record<string, string> = { part: 'Del', section: 'Avdelning', chapter: 'Kapitel', article: 'Artikel' };
  return {
    kind: language === 'sv' ? prefix.replace(/^(Part|Section|Chapter|Article)/, SwedishKinds[kind] ?? prefix) : prefix,
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
  return value.replace(/^(Part|Section|Chapter|Article)\s+(\w+):\s*/i, '').replace(/^"|"$/g, '');
}

function hierarchyKind(value: string) {
  return value.match(/^(Part|Section|Chapter|Article)/i)?.[1]?.toLowerCase() ?? '';
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
  return (
    <li className={`toc-item toc-depth-${depth} ${active ? 'is-active' : ''}`}>
      {hasChildren ? (
        <details open={active || depth === 0}>
          <summary>
            <button onClick={() => onJump(branch.start)} type="button">
              <span>{display.kind}</span>
              {display.title}
            </button>
          </summary>
          <ul>{branch.children.map((child) => <TocItem activePath={activePath} branch={child} depth={depth + 1} key={child.label} language={language} onJump={onJump} titles={titles} />)}</ul>
        </details>
      ) : (
        <button onClick={() => onJump(branch.start)} type="button">
          <span>{display.kind}</span>
          {display.title}
        </button>
      )}
    </li>
  );
}

function HierarchyBreak({ node, previous, language, titles }: { node: CatechismNode; previous?: CatechismNode; language: 'en' | 'sv'; titles?: Record<string, string> }) {
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
      {node.headings.map((heading) => (
        <h3 className={`text-heading heading-${heading.kind}`} key={`${node.id}-${heading.text}`}>{language === 'sv' && heading.text === 'IN BRIEF' ? 'SAMMANFATTNING' : heading.text}</h3>
      ))}
    </header>
  );
}

function isInBrief(node?: CatechismNode) {
  return Boolean(node && (node.title.toUpperCase() === 'IN BRIEF' || node.title.toLocaleUpperCase('sv') === 'SAMMANFATTNING'));
}

function stripSwedishParagraphLinks(html: string) {
  return html.replace(/<i>\s*\[(?:(?!<\/i>)[\s\S])*?katekesen\.se(?:(?!<\/i>)[\s\S])*?<\/i>/gi, '');
}

function ReaderParagraph({ node, previous, next, active, selectedKey, onActivate, onCitation, language, titles }: {
  node: CatechismNode;
  previous?: CatechismNode;
  next?: CatechismNode;
  active: boolean;
  selectedKey?: string;
  onActivate: (id: number) => void;
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
  if (selectedFootnote) {
    const number = String(selectedFootnote.number).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    paragraphHtml = paragraphHtml.replace(new RegExp(`<sup>([\\s\\S]*?${number}[\\s\\S]*?)<\\/sup>`), '<sup class="is-selected">$1</sup>');
  }

  function showFootnote(event: ReactMouseEvent<HTMLElement>) {
    const target = (event.target as HTMLElement).closest('a');
    const sup = target?.querySelector('sup') ?? (event.target as HTMLElement).closest('sup');
    if (!sup) return;
    event.preventDefault();
    const token = sup.textContent?.replace(/[^0-9]/g, '');
    const footnote = node.footnotes.find((item) => String(item.number) === token);
    if (footnote) onCitation(footnoteCitation(node, footnote, language));
  }

  return (
    <article className={`reader-paragraph ${active ? 'is-current' : ''} ${inBrief ? 'in-brief' : ''} ${inBriefStart ? 'in-brief-start' : ''} ${inBriefEnd ? 'in-brief-end' : ''}`} data-paragraph={node.id} id={`paragraph-${node.id}`} onClick={() => onActivate(node.id)}>
      <HierarchyBreak language={language} node={node} previous={previous} titles={titles} />
      <div className="paragraph-row">
        <aside className="margin-references" aria-label="Paragraph references">
          {node.xrefs.map((id) => (
            <button className={selectedKey === `xref-${node.id}-${id}` ? 'is-selected' : ''} key={id} onClick={(event) => { event.stopPropagation(); onCitation({ key: `xref-${node.id}-${id}`, eyebrow: copy[language].reference, title: `§ ${id}`, html: '', target: id }); }} type="button">{id}</button>
          ))}
        </aside>
        <div className="paragraph-number">{node.number}</div>
        <div className="paragraph-copy" dangerouslySetInnerHTML={{ __html: paragraphHtml }} onClick={showFootnote} />
      </div>
    </article>
  );
}

function footnoteCitation(node: CatechismNode, footnote: Footnote, language: 'en' | 'sv'): Citation {
  const reference = node.externalReferences.find((item) => item.footnoteId === footnote.id);
  return { key: `fn-${node.id}-${footnote.id}`, eyebrow: copy[language].footnote, title: String(footnote.number), html: footnote.html || footnote.text, target: paragraphTarget(reference), sourceId: reference?.sourceId };
}

function paragraphTarget(reference?: ExternalReference) {
  const match = reference?.label.match(/(?:CCC|CC|KKK|§)\s*(\d+)/i);
  return match ? Number(match[1]) : undefined;
}

function CitationPanel({ citation, data, language, onClose, onJump }: {
  citation: Citation;
  data: CatechismData;
  language: 'en' | 'sv';
  onClose: () => void;
  onJump: (id: number) => void;
}) {
  const t = copy[language];
  const targetNode = citation.target ? data.nodes.find((node) => node.id === citation.target) : undefined;
  const source = citation.sourceId ? data.externalSources[citation.sourceId] : Object.values(data.externalSources).find((item) => item.citation === citation.title || item.title === citation.title);
  const sourceContent = source?.contentByLanguage?.[language]?.html ?? source?.contentHtml;
  const isFallback = language === 'sv' && source && !source.contentByLanguage?.sv;
  const translations = Object.entries(source?.contentByLanguage ?? {});
  const languageNames: Record<string, string> = { en: 'English', sv: 'Svenska', la: 'Latina', it: 'Italiano', es: 'Español', zh: '中文' };

  return (
    <aside className="citation-panel" aria-live="polite">
      <button aria-label={t.close} className="citation-close" onClick={onClose} type="button">×</button>
      <p className="citation-eyebrow">{citation.eyebrow}</p>
      <h2>{citation.title}</h2>
      {targetNode ? <div className="citation-text">{targetNode.text}</div> : translations.length > 1 ? <div className="citation-translations">{translations.map(([code, translation]) => <details key={code}><summary>{languageNames[code] ?? code.toUpperCase()}</summary><div className="citation-text" dangerouslySetInnerHTML={{ __html: translation.html }} /></details>)}</div> : sourceContent ? <div className="citation-text" dangerouslySetInnerHTML={{ __html: sourceContent }} /> : citation.html ? <div className="citation-text" dangerouslySetInnerHTML={{ __html: citation.html }} /> : <p>{t.citationUnavailable}</p>}
      {isFallback ? <p className="fallback-note">{t.englishFallback}</p> : null}
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
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [citation, setCitation] = useState<Citation | null>(null);
  const [toolbarHidden, setToolbarHidden] = useState(false);
  const [citationWidth, setCitationWidth] = useState(340);
  const observer = useRef<IntersectionObserver | null>(null);
  const t = copy[language];

  const nodes = useMemo(() => data ? [...data.nodes].sort((a, b) => a.id - b.id) : [], [data]);
  const toc = useMemo(() => buildToc(nodes), [nodes]);
  const activeNode = nodes.find((node) => node.id === activeId) ?? nodes[0];
  const results = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase(language);
    if (needle.length < 2) return [];
    return nodes.filter((node) => `${node.number} ${node.title} ${node.text}`.toLocaleLowerCase(language).includes(needle)).slice(0, 40);
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
    observer.current?.disconnect();
    observer.current = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => Math.abs(a.boundingClientRect.top - innerHeight * .34) - Math.abs(b.boundingClientRect.top - innerHeight * .34))[0];
      if (visible) setActiveId(Number((visible.target as HTMLElement).dataset.paragraph));
    }, { rootMargin: '-22% 0px -58% 0px', threshold: 0 });
    document.querySelectorAll('[data-paragraph]').forEach((element) => observer.current?.observe(element));
    const requested = Number(new URLSearchParams(location.search).get('p'));
    if (requested) requestAnimationFrame(() => jumpTo(requested));
    return () => observer.current?.disconnect();
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

  function submitJump(event: FormEvent) {
    event.preventDefault();
    const id = Number(jumpValue);
    if (Number.isInteger(id)) jumpTo(id);
  }

  if (loading) return <main className="loading">{language === 'sv' ? 'Öppnar katekesen…' : 'Opening the Catechism…'}</main>;
  if (error || !data) return <main className="loading">{error ?? 'Unable to load the Catechism.'}</main>;

  return (
    <div className={`book-app ${tocOpen ? '' : 'toc-hidden'} ${citation ? 'citation-open' : ''} ${toolbarHidden ? 'toolbar-hidden' : ''}`} lang={language} style={{ '--aside': `${citationWidth}px` } as CSSProperties}>
      <header className="reader-toolbar">
        <button aria-expanded={tocOpen} aria-label={tocOpen ? t.hideContents : t.showContents} className="toc-toggle" onClick={() => setTocOpen((value) => !value)} type="button"><span /><span /><span /></button>
        <div className="book-title">{t.title}</div>
        <div className="reader-tools">
          <form className="jump-form" onSubmit={submitJump}>
            <input aria-label={t.paragraph} inputMode="numeric" onChange={(event) => setJumpValue(event.target.value.replace(/\D/g, ''))} placeholder={`${t.paragraph}…`} value={jumpValue} />
            <button type="submit">{t.jump}</button>
          </form>
          <div className="search-control">
            <span aria-hidden="true">⌕</span>
            <input aria-label={t.search} onChange={(event) => { setSearch(event.target.value); setSearchOpen(event.target.value.trim().length >= 2); }} onFocus={() => search.trim().length >= 2 && setSearchOpen(true)} placeholder={t.search} value={search} />
          </div>
          <div className="language-control" aria-label="Language">
            <button className={language === 'en' ? 'is-active' : ''} onClick={() => setLanguage('en')} type="button">EN</button>
            <button className={language === 'sv' ? 'is-active' : ''} onClick={() => setLanguage('sv')} type="button">SV</button>
          </div>
        </div>
      </header>

      <aside className="toc-panel">
        <div className="toc-heading"><span>{t.contents}</span><button onClick={() => setTocOpen(false)} type="button">×</button></div>
        <nav aria-label={t.contents}><ul>{toc.map((branch) => <TocItem activePath={activeNode?.breadcrumbs ?? []} branch={branch} key={branch.label} language={language} onJump={jumpTo} titles={data.hierarchyTitles} />)}</ul></nav>
      </aside>

      <main className="book-column">
        <div className="edition-title"><span>CCC</span><h1>{t.title}</h1><p>{language === 'sv' ? 'Den fullständiga texten' : 'The complete text'}</p></div>
        {nodes.map((node, index) => <ReaderParagraph active={node.id === activeId} key={node.id} language={language} next={nodes[index + 1]} node={node} onActivate={setActiveId} onCitation={setCitation} previous={nodes[index - 1]} selectedKey={citation?.key} titles={data.hierarchyTitles} />)}
      </main>

      {searchOpen ? (
        <div className="search-overlay" role="dialog" aria-label={t.results}>
          <div className="search-overlay-heading"><div><span>{t.results}</span><strong>“{search}”</strong></div><button aria-label={t.close} onClick={() => setSearchOpen(false)} type="button">×</button></div>
          <div className="search-results">
            {results.length ? results.map((node) => <button key={node.id} onClick={() => jumpTo(node.id)} type="button"><span>{node.number}</span><div><strong>{node.title}</strong><p>{node.preview}</p></div></button>) : <p className="no-results">{t.noResults}</p>}
          </div>
        </div>
      ) : null}

      {citation ? <><div aria-hidden="true" className="citation-resize" onMouseDown={beginCitationResize} /><CitationPanel citation={citation} data={data} language={language} onClose={() => setCitation(null)} onJump={jumpTo} /></> : null}
    </div>
  );
}

export default App;
