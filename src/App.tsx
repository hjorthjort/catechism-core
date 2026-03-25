import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import {
  BrowserRouter,
  Link,
  NavLink,
  Route,
  Routes,
  useNavigate,
  useParams,
} from 'react-router-dom';

import { GraphCanvas } from './components/GraphCanvas';
import { useCatechismData } from './lib/data';
import {
  getInitialLanguage,
  getLanguageMeta,
  languages,
  uiStrings,
  withLanguage,
} from './lib/i18n';
import type { AppLanguage } from './lib/i18n';
import type { CatechismData, CatechismNode } from './types';

function fmtScore(score: number) {
  return score.toFixed(5);
}

function countExternalKinds(node: CatechismNode) {
  return node.externalReferences.reduce(
    (counts, reference) => {
      counts[reference.kind] += 1;
      return counts;
    },
    { scripture: 0, document: 0 },
  );
}

function collectNeighborhood(data: CatechismData, centerId: number, maxDepth = 2) {
  const nodeMap = new Map(data.nodes.map((node) => [node.id, node]));
  const outgoing = new Map<number, number[]>();
  const incoming = new Map<number, number[]>();

  for (const edge of data.edges) {
    const outgoingTargets = outgoing.get(edge.source) ?? [];
    outgoingTargets.push(edge.target);
    outgoing.set(edge.source, outgoingTargets);

    const incomingSources = incoming.get(edge.target) ?? [];
    incomingSources.push(edge.source);
    incoming.set(edge.target, incomingSources);
  }

  const visited = new Set<number>([centerId]);
  const queue = [{ id: centerId, depth: 0 }];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || current.depth >= maxDepth) {
      continue;
    }

    const neighbors = [...(outgoing.get(current.id) ?? []), ...(incoming.get(current.id) ?? [])];
    for (const neighbor of neighbors) {
      if (visited.has(neighbor)) {
        continue;
      }

      visited.add(neighbor);
      queue.push({ id: neighbor, depth: current.depth + 1 });
    }
  }

  return {
    nodes: Array.from(visited)
      .map((id) => nodeMap.get(id))
      .filter((node): node is CatechismNode => Boolean(node))
      .sort((a, b) => a.id - b.id),
    edges: data.edges.filter((edge) => visited.has(edge.source) && visited.has(edge.target)),
  };
}

function getNodeHeading(node: CatechismNode, language: AppLanguage, paragraphLabel: string) {
  return language === 'en' ? node.title : `${paragraphLabel} ${node.id}`;
}

function getParagraphSubtitle(node: CatechismNode, language: AppLanguage) {
  return language === 'en' ? node.title : node.preview;
}

function getPartLabel(node: CatechismNode, language: AppLanguage) {
  const t = uiStrings[language];
  const key = node.part as keyof typeof t.parts;
  return t.parts[key] ?? node.part;
}

function Shell({
  data,
  language,
  onLanguageChange,
}: {
  data: CatechismData;
  language: AppLanguage;
  onLanguageChange: (language: AppLanguage) => void;
}) {
  const t = uiStrings[language];
  const languageMeta = getLanguageMeta(language);
  const nodeMap = useMemo(() => new Map(data.nodes.map((node) => [node.id, node])), [data.nodes]);
  const topNodes = useMemo(
    () => [...data.nodes].sort((a, b) => b.pagerank - a.pagerank).slice(0, 10),
    [data.nodes],
  );

  return (
    <BrowserRouter>
      <div className="app-shell" dir={languageMeta.direction} lang={language}>
        <header className="site-header">
          <Link className="wordmark" to={withLanguage('/', language)}>
            <span className="wordmark-kicker">{t.wordmarkKicker}</span>
            <span className="wordmark-title">{t.wordmarkTitle}</span>
          </Link>

          <div className="site-header-controls">
            <nav className="site-nav">
              <NavLink to={withLanguage('/', language)}>{t.navOverview}</NavLink>
              <NavLink to={withLanguage('/explore', language)}>{t.navExplorer}</NavLink>
              <NavLink to={withLanguage(`/paragraph/${topNodes[0]?.id ?? 1}`, language)}>
                {t.navTopNode}
              </NavLink>
            </nav>

            <div className="language-switcher" aria-label="Language selector">
              {languages.map((entry) => (
                <button
                  className={entry.code === language ? 'is-active' : undefined}
                  key={entry.code}
                  onClick={() => onLanguageChange(entry.code)}
                  title={entry.nativeLabel}
                  type="button"
                >
                  <span>{entry.flag}</span>
                  <small>{entry.code.toUpperCase()}</small>
                </button>
              ))}
            </div>
          </div>
        </header>

        <Routes>
          <Route
            path="/"
            element={<HomePage data={data} language={language} topNodes={topNodes} />}
          />
          <Route path="/explore" element={<ExplorePage data={data} language={language} />} />
          <Route
            path="/paragraph/:id"
            element={<ParagraphPage data={data} language={language} nodeMap={nodeMap} />}
          />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

function HomePage({
  data,
  language,
  topNodes,
}: {
  data: CatechismData;
  language: AppLanguage;
  topNodes: CatechismNode[];
}) {
  const t = uiStrings[language];

  return (
    <main className="page">
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">{t.homeEyebrow}</p>
          <h1>{t.homeTitle}</h1>
          <p className="lede">{t.homeLede}</p>
          <div className="hero-actions">
            <Link className="button" to={withLanguage('/explore', language)}>
              {t.homeOpenGraph}
            </Link>
            <a className="button button-ghost" href={data.source.corpus} target="_blank" rel="noreferrer">
              {t.homeViewSource}
            </a>
          </div>
        </div>

        <div className="hero-panel">
          <div className="stat-card">
            <span>{t.statParagraphs}</span>
            <strong>{data.stats.paragraphs.toLocaleString()}</strong>
          </div>
          <div className="stat-card">
            <span>{t.statInternalLinks}</span>
            <strong>{data.stats.references.toLocaleString()}</strong>
          </div>
          <div className="stat-card">
            <span>{t.statExternalRefs}</span>
            <strong>{data.stats.externalReferences.toLocaleString()}</strong>
          </div>
        </div>
      </section>

      <section className="feature-grid">
        <article>
          <h2>{t.featureGraphTitle}</h2>
          <p>{t.featureGraphBody}</p>
        </article>
        <article>
          <h2>{t.featureReferenceTitle}</h2>
          <p>{t.featureReferenceBody}</p>
        </article>
        <article>
          <h2>{t.featureRankTitle}</h2>
          <p>{t.featureRankBody}</p>
        </article>
      </section>

      <section className="ranking-section">
        <div className="section-heading">
          <p className="eyebrow">{t.rankingEyebrow}</p>
          <h2>{t.rankingTitle}</h2>
        </div>
        <div className="ranking-list">
          {topNodes.map((node, index) => (
            <Link
              className="ranking-item"
              key={node.id}
              to={withLanguage(`/paragraph/${node.id}`, language)}
            >
              <span className="ranking-index">{String(index + 1).padStart(2, '0')}</span>
              <div>
                <strong>
                  {t.paragraph} {node.id}
                </strong>
                <p>{node.preview}</p>
              </div>
              <span className="ranking-score">{fmtScore(node.pagerank)}</span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}

function ExplorePage({ data, language }: { data: CatechismData; language: AppLanguage }) {
  const navigate = useNavigate();
  const t = uiStrings[language];
  const [query, setQuery] = useState('');
  const [focusId, setFocusId] = useState<number | null>(data.nodes[0]?.id ?? null);
  const deferredQuery = useDeferredValue(query);

  const results = useMemo(() => {
    const search = deferredQuery.trim().toLowerCase();
    if (!search) {
      return [...data.nodes].sort((a, b) => b.pagerank - a.pagerank).slice(0, 14);
    }

    return data.nodes
      .filter((node) => {
        const haystack = `${node.id} ${node.title} ${node.text} ${node.part}`.toLowerCase();
        return haystack.includes(search);
      })
      .slice(0, 14);
  }, [data.nodes, deferredQuery]);

  const focusedNode = useMemo(
    () => data.nodes.find((node) => node.id === focusId) ?? null,
    [data.nodes, focusId],
  );
  const focusedExternalCounts = focusedNode ? countExternalKinds(focusedNode) : null;

  return (
    <main className="explore-page">
      <aside className="explore-sidebar">
        <div className="section-heading">
          <p className="eyebrow">{t.explorerEyebrow}</p>
          <h1>{t.explorerTitle}</h1>
        </div>

        <label className="search-field">
          <span>{t.searchLabel}</span>
          <input
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t.searchPlaceholder}
            type="search"
            value={query}
          />
        </label>

        <div className="search-results">
          {results.map((node) => (
            <div className="search-result" key={node.id}>
              <button onClick={() => setFocusId(node.id)} type="button">
                <strong>
                  {t.paragraph} {node.id}
                </strong>
                <span>{getNodeHeading(node, language, t.paragraph)}</span>
                <small>
                  {node.externalReferences.length} {t.statExternalRefs.toLowerCase()}
                </small>
              </button>
              <Link to={withLanguage(`/paragraph/${node.id}`, language)}>{t.searchOpen}</Link>
            </div>
          ))}
        </div>

        {focusedNode ? (
          <div className="focus-card">
            <p className="eyebrow">{t.focusedNode}</p>
            <h2>
              {t.paragraph} {focusedNode.id}
            </h2>
            <p>{focusedNode.preview}</p>
            <dl>
              <div>
                <dt>{t.outgoing}</dt>
                <dd>{focusedNode.xrefs.length}</dd>
              </div>
              <div>
                <dt>{t.incoming}</dt>
                <dd>{focusedNode.incoming.length}</dd>
              </div>
              <div>
                <dt>{t.rank}</dt>
                <dd>{fmtScore(focusedNode.pagerank)}</dd>
              </div>
              <div>
                <dt>{t.scripture}</dt>
                <dd>{focusedExternalCounts?.scripture ?? 0}</dd>
              </div>
              <div>
                <dt>{t.document}</dt>
                <dd>{focusedExternalCounts?.document ?? 0}</dd>
              </div>
            </dl>
            <button
              className="button"
              onClick={() => navigate(withLanguage(`/paragraph/${focusedNode.id}`, language))}
              type="button"
            >
              {t.readParagraph}
            </button>
          </div>
        ) : null}
      </aside>

      <section className="explore-canvas">
        <GraphCanvas
          caption={[t.graphZoom, t.graphPan, t.graphClickDetail]}
          edges={data.edges}
          focusId={focusId}
          nodes={data.nodes}
          onNodeClick={(id) => navigate(withLanguage(`/paragraph/${id}`, language))}
        />
      </section>
    </main>
  );
}

function ParagraphPage({
  data,
  language,
  nodeMap,
}: {
  data: CatechismData;
  language: AppLanguage;
  nodeMap: Map<number, CatechismNode>;
}) {
  const navigate = useNavigate();
  const t = uiStrings[language];
  const params = useParams();
  const id = Number(params.id);
  const node = Number.isFinite(id) ? nodeMap.get(id) : undefined;

  if (!node) {
    return (
      <main className="page">
        <section className="not-found">
          <h1>{t.paragraphNotFound}</h1>
          <Link className="button" to={withLanguage('/explore', language)}>
            {t.backToExplorer}
          </Link>
        </section>
      </main>
    );
  }

  const externalCounts = countExternalKinds(node);
  const localGraph = collectNeighborhood(data, node.id);
  const crumbs = language === 'en' ? node.breadcrumbs : [getPartLabel(node, language)];

  return (
    <main className="page paragraph-page">
      <section className="paragraph-hero">
        <div>
          <p className="eyebrow">{getPartLabel(node, language)}</p>
          <h1>
            {t.paragraph} {node.id}
          </h1>
          <p className="lede">{getParagraphSubtitle(node, language)}</p>
        </div>
        <div className="paragraph-metrics">
          <span>
            {t.rank} {fmtScore(node.pagerank)}
          </span>
          <span>
            {node.xrefs.length} {t.outgoing}
          </span>
          <span>
            {node.incoming.length} {t.incoming}
          </span>
          <span>
            {externalCounts.scripture} {t.scripture}
          </span>
          <span>
            {externalCounts.document} {t.document}
          </span>
        </div>
      </section>

      <section className="paragraph-layout">
        <article className="paragraph-body">
          <div className="breadcrumb-trail">
            {crumbs.map((crumb) => (
              <span key={crumb}>{crumb}</span>
            ))}
          </div>

          <div className="paragraph-text" dangerouslySetInnerHTML={{ __html: node.textHtml }} />

          {node.vaticanSource ? (
            <section className="source-link-block">
              <h2>{t.sourceMaterial}</h2>
              <a
                className="source-link"
                href={node.vaticanSource.url}
                rel="noreferrer"
                target="_blank"
              >
                {t.openSource}
                <span>{node.vaticanSource.file}</span>
              </a>
            </section>
          ) : null}

          <section className="external-references-block">
            <h2>{t.externalReferences}</h2>
            <div className="external-reference-list">
              {node.externalReferences.map((reference) => (
                <div className={`external-reference ${reference.kind}`} key={reference.id}>
                  <span className="reference-kind">
                    {reference.kind === 'scripture' ? t.scripture : t.document}
                  </span>
                  <strong>
                    {t.footnote} {reference.footnoteNumber}
                  </strong>
                  <p>{reference.label}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="footnotes-block">
            <h2>{t.footnotes}</h2>
            <div className="footnotes-list">
              {node.footnotes.map((note) => (
                <div className="footnote-item" key={note.id}>
                  <strong>{note.number}.</strong>
                  <span dangerouslySetInnerHTML={{ __html: note.html }} />
                </div>
              ))}
            </div>
          </section>
        </article>

        <aside className="paragraph-links">
          <section className="paragraph-mini-map">
            <h2>{t.localGraph}</h2>
            <p>{t.localGraphBlurb}</p>
            <div className="paragraph-mini-map-canvas">
              <GraphCanvas
                caption={[t.graphPan, t.graphZoom, t.graphClickFollow]}
                edges={localGraph.edges}
                fitToNodes
                focusId={node.id}
                minScreenNodeRadius={7.2}
                nodes={localGraph.nodes}
                onNodeClick={(targetId) => navigate(withLanguage(`/paragraph/${targetId}`, language))}
                showDirectionalArrows
              />
            </div>
          </section>

          <section>
            <h2>{t.linksOut}</h2>
            <div className="link-cloud">
              {node.xrefs.map((target) => (
                <Link key={target} to={withLanguage(`/paragraph/${target}`, language)}>
                  {t.paragraph} {target}
                </Link>
              ))}
            </div>
          </section>

          <section>
            <h2>{t.linksIn}</h2>
            <div className="link-cloud">
              {node.incoming.map((source) => (
                <Link key={source} to={withLanguage(`/paragraph/${source}`, language)}>
                  {t.paragraph} {source}
                </Link>
              ))}
            </div>
          </section>

          <Link className="button" to={withLanguage('/explore', language)}>
            {t.returnToGraph}
          </Link>
        </aside>
      </section>
    </main>
  );
}

export default function App() {
  const [language, setLanguage] = useState<AppLanguage>(() => getInitialLanguage());
  const { data, error, loading } = useCatechismData(language);
  const t = uiStrings[language];

  useEffect(() => {
    window.localStorage.setItem('catholic-core-language', language);
    const url = new URL(window.location.href);
    if (language === 'en') {
      url.searchParams.delete('lang');
    } else {
      url.searchParams.set('lang', language);
    }
    window.history.replaceState({}, '', url);
  }, [language]);

  if (loading) {
    return (
      <main className="loading-screen">
        <p className="eyebrow">{t.wordmarkKicker}</p>
        <h1>{t.loadingTitle}</h1>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="loading-screen">
        <p className="eyebrow">{t.wordmarkKicker}</p>
        <h1>{t.errorTitle}</h1>
        <p>{error ?? 'Unknown error'}</p>
      </main>
    );
  }

  return <Shell data={data} language={language} onLanguageChange={setLanguage} />;
}
