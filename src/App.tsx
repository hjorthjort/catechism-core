import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { BrowserRouter, Link, NavLink, Route, Routes, useNavigate, useParams } from 'react-router-dom';

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

function collectDirectConnections(nodeMap: Map<number, CatechismNode>, centerNode: CatechismNode) {
  const relations = new Map<
    number,
    {
      node: CatechismNode;
      incoming: boolean;
      outgoing: boolean;
    }
  >();

  for (const targetId of centerNode.xrefs) {
    if (targetId === centerNode.id) {
      continue;
    }

    const targetNode = nodeMap.get(targetId);
    if (!targetNode) {
      continue;
    }

    relations.set(targetId, {
      node: targetNode,
      incoming: relations.get(targetId)?.incoming ?? false,
      outgoing: true,
    });
  }

  for (const sourceId of centerNode.incoming) {
    if (sourceId === centerNode.id) {
      continue;
    }

    const sourceNode = nodeMap.get(sourceId);
    if (!sourceNode) {
      continue;
    }

    relations.set(sourceId, {
      node: sourceNode,
      incoming: true,
      outgoing: relations.get(sourceId)?.outgoing ?? false,
    });
  }

  return [...relations.values()].sort((a, b) => a.node.id - b.node.id);
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
            element={<WorkspacePage data={data} language={language} showHero topNodes={topNodes} />}
          />
          <Route
            path="/explore"
            element={<WorkspacePage data={data} language={language} showHero={false} topNodes={topNodes} />}
          />
          <Route
            path="/paragraph/:id"
            element={<WorkspacePage data={data} language={language} showHero topNodes={topNodes} />}
          />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

function WorkspacePage({
  data,
  language,
  showHero,
  topNodes,
}: {
  data: CatechismData;
  language: AppLanguage;
  showHero: boolean;
  topNodes: CatechismNode[];
}) {
  const navigate = useNavigate();
  const params = useParams();
  const t = uiStrings[language];
  const nodeMap = useMemo(() => new Map(data.nodes.map((node) => [node.id, node])), [data.nodes]);
  const routeId = params.id ? Number(params.id) : null;
  const hasSelectedRoute = routeId !== null && Number.isFinite(routeId) && nodeMap.has(routeId);
  const invalidSelectedRoute = params.id !== undefined && !hasSelectedRoute;
  const deferredDefaultId = topNodes[0]?.id ?? data.nodes[0]?.id ?? null;

  const [query, setQuery] = useState('');
  const [localSelectedId, setLocalSelectedId] = useState<number | null>(
    hasSelectedRoute ? routeId : null,
  );
  const [sidebarHoverId, setSidebarHoverId] = useState<number | null>(null);
  const [clusterRootId, setClusterRootId] = useState<number | null>(null);
  const deferredQuery = useDeferredValue(query);

  const selectedId = hasSelectedRoute ? routeId : localSelectedId;
  const selectedNode = selectedId !== null ? nodeMap.get(selectedId) ?? null : null;
  const panelNode = selectedNode ?? (deferredDefaultId ? nodeMap.get(deferredDefaultId) ?? null : null);
  const panelExternalCounts = panelNode ? countExternalKinds(panelNode) : null;
  const directConnections = useMemo(
    () => (selectedNode ? collectDirectConnections(nodeMap, selectedNode) : []),
    [nodeMap, selectedNode],
  );

  const results = useMemo(() => {
    const search = deferredQuery.trim().toLowerCase();
    if (!search) {
      return [...topNodes].slice(0, 14);
    }

    return data.nodes
      .filter((node) => {
        const haystack = `${node.id} ${node.title} ${node.text} ${node.part}`.toLowerCase();
        return haystack.includes(search);
      })
      .slice(0, 14);
  }, [data.nodes, deferredQuery, topNodes]);

  function selectNode(id: number, keepCluster = false) {
    setLocalSelectedId(id);
    setSidebarHoverId(null);

    if (!keepCluster) {
      setClusterRootId(null);
    }

    if (params.id !== undefined) {
      navigate(withLanguage(`/paragraph/${id}`, language));
    }
  }

  function handleGraphLongPress(id: number) {
    setClusterRootId(id);
    selectNode(id, true);
  }

  function clearSelection() {
    setLocalSelectedId(null);
    setSidebarHoverId(null);
    setClusterRootId(null);

    if (params.id !== undefined) {
      navigate(withLanguage(showHero ? '/' : '/explore', language));
    }
  }

  function handleJumpToGraph() {
    document.getElementById('graph-workspace')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <main className={`page ${showHero ? '' : 'page-workspace'}`}>
      {showHero ? (
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">{t.homeEyebrow}</p>
            <h1>{t.homeTitle}</h1>
            <p className="lede">{t.homeLede}</p>
            <div className="hero-actions">
              <button className="button" onClick={handleJumpToGraph} type="button">
                {t.homeOpenGraph}
              </button>
              <a className="button button-ghost" href={data.source.corpus} rel="noreferrer" target="_blank">
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
      ) : null}

      {invalidSelectedRoute ? (
        <section className="not-found not-found-inline">
          <h1>{t.paragraphNotFound}</h1>
        </section>
      ) : null}

      <section className="workspace-section" id="graph-workspace">
        {!showHero ? (
          <div className="section-heading workspace-heading">
            <p className="eyebrow">{t.explorerEyebrow}</p>
            <h1>{t.explorerTitle}</h1>
          </div>
        ) : null}

        <div className="explore-page">
          <aside className="explore-sidebar">
            <div className="section-heading">
              <p className="eyebrow">{t.explorerEyebrow}</p>
              <h2>{t.explorerTitle}</h2>
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
                <div
                  className={`search-result ${selectedNode?.id === node.id ? 'is-active' : ''}`}
                  key={node.id}
                  onMouseEnter={() => setSidebarHoverId(node.id)}
                  onMouseLeave={() => setSidebarHoverId(null)}
                >
                  <button className="search-result-main" onClick={() => selectNode(node.id)} type="button">
                    <strong>
                      {t.paragraph} {node.id}
                    </strong>
                    <span>{getNodeHeading(node, language, t.paragraph)}</span>
                    <small>{node.preview}</small>
                  </button>
                  <button className="search-result-open" onClick={() => selectNode(node.id)} type="button">
                    {t.searchOpen}
                  </button>
                </div>
              ))}
            </div>

            {panelNode ? (
              <div className="focus-card">
                <p className="eyebrow">{t.focusedNode}</p>
                <h2>
                  {t.paragraph} {panelNode.id}
                </h2>
                <p>{panelNode.preview}</p>
                <dl>
                  <div>
                    <dt>{t.outgoing}</dt>
                    <dd>{panelNode.xrefs.length}</dd>
                  </div>
                  <div>
                    <dt>{t.incoming}</dt>
                    <dd>{panelNode.incoming.length}</dd>
                  </div>
                  <div>
                    <dt>{t.rank}</dt>
                    <dd>{fmtScore(panelNode.pagerank)}</dd>
                  </div>
                  <div>
                    <dt>{t.scripture}</dt>
                    <dd>{panelExternalCounts?.scripture ?? 0}</dd>
                  </div>
                  <div>
                    <dt>{t.document}</dt>
                    <dd>{panelExternalCounts?.document ?? 0}</dd>
                  </div>
                </dl>
                <button className="button" onClick={() => selectNode(panelNode.id)} type="button">
                  {t.readParagraph}
                </button>
              </div>
            ) : null}
          </aside>

          <div className="workspace-main">
            <section className="explore-canvas">
              <GraphCanvas
                caption={[t.graphZoom, t.graphPan, t.graphClickDetail]}
                clusterRootId={clusterRootId}
                edges={data.edges}
                focusId={deferredDefaultId}
                highlightId={sidebarHoverId ?? selectedNode?.id ?? null}
                hoverDelayMs={100}
                nodes={data.nodes}
                onBackgroundClick={clearSelection}
                onNodeClick={(id) => selectNode(id)}
                onNodeLongPress={handleGraphLongPress}
                selectedId={selectedNode?.id ?? null}
              />
            </section>

            <section className={`selection-panel ${selectedNode ? '' : 'is-empty'}`}>
              {selectedNode ? (
                <div className="selection-stack">
                  <article className="paragraph-body selected-paragraph">
                    <div className="selected-paragraph-header">
                      <div>
                        <p className="eyebrow">{getPartLabel(selectedNode, language)}</p>
                        <h2>
                          {t.paragraph} {selectedNode.id}
                        </h2>
                        <p className="lede">{getParagraphSubtitle(selectedNode, language)}</p>
                      </div>

                      <div className="paragraph-metrics">
                        <span>
                          {t.rank} {fmtScore(selectedNode.pagerank)}
                        </span>
                        <span>
                          {selectedNode.xrefs.length} {t.outgoing}
                        </span>
                        <span>
                          {selectedNode.incoming.length} {t.incoming}
                        </span>
                      </div>
                    </div>

                    <div className="breadcrumb-trail">
                      {selectedNode.breadcrumbs.map((crumb) => (
                        <span key={crumb}>{crumb}</span>
                      ))}
                    </div>

                    <div className="paragraph-text" dangerouslySetInnerHTML={{ __html: selectedNode.textHtml }} />

                    {selectedNode.vaticanSource ? (
                      <section className="source-link-block">
                        <h3>{t.sourceMaterial}</h3>
                        <a
                          className="source-link"
                          href={selectedNode.vaticanSource.url}
                          rel="noreferrer"
                          target="_blank"
                        >
                          {t.openSource}
                          <span>{selectedNode.vaticanSource.file}</span>
                        </a>
                      </section>
                    ) : null}

                    {selectedNode.externalReferences.length > 0 ? (
                      <section className="external-references-block">
                        <h3>{t.externalReferences}</h3>
                        <div className="external-reference-list">
                          {selectedNode.externalReferences.map((reference) => (
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
                    ) : null}

                    {selectedNode.footnotes.length > 0 ? (
                      <section className="footnotes-block">
                        <h3>{t.footnotes}</h3>
                        <div className="footnotes-list">
                          {selectedNode.footnotes.map((note) => (
                            <div className="footnote-item" key={note.id}>
                              <strong>{note.number}.</strong>
                              <span dangerouslySetInnerHTML={{ __html: note.html }} />
                            </div>
                          ))}
                        </div>
                      </section>
                    ) : null}
                  </article>

                  <section className="related-passages">
                    <div className="section-heading">
                      <p className="eyebrow">{t.focusedNode}</p>
                      <h2>
                        {t.linksOut} / {t.linksIn}
                      </h2>
                    </div>

                    <div className="related-passage-list">
                      {directConnections.map((relation) => (
                        <article
                          className="related-passage-card"
                          key={relation.node.id}
                          onMouseEnter={() => setSidebarHoverId(relation.node.id)}
                          onMouseLeave={() => setSidebarHoverId(null)}
                        >
                          <div className="related-passage-header">
                            <div>
                              <p className="eyebrow">{getPartLabel(relation.node, language)}</p>
                              <h3>
                                {t.paragraph} {relation.node.id}
                              </h3>
                            </div>

                            <div className="relation-badges">
                              {relation.outgoing ? <span>{t.linksOut}</span> : null}
                              {relation.incoming ? <span>{t.linksIn}</span> : null}
                            </div>
                          </div>

                          <p className="related-passage-preview">
                            {getParagraphSubtitle(relation.node, language)}
                          </p>
                          <div
                            className="paragraph-text related-passage-text"
                            dangerouslySetInnerHTML={{ __html: relation.node.textHtml }}
                          />
                          <button
                            className="button button-ghost"
                            onClick={() => selectNode(relation.node.id)}
                            type="button"
                          >
                            {t.readParagraph}
                          </button>
                        </article>
                      ))}
                    </div>
                  </section>
                </div>
              ) : (
                <div className="selection-empty">
                  <p className="eyebrow">{t.focusedNode}</p>
                  <h2>{t.graphClickDetail}</h2>
                  <p>{t.graphClickFollow}</p>
                </div>
              )}
            </section>
          </div>
        </div>
      </section>

      {showHero ? (
        <>
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
                <button
                  className="ranking-item ranking-button"
                  key={node.id}
                  onClick={() => selectNode(node.id)}
                  onMouseEnter={() => setSidebarHoverId(node.id)}
                  onMouseLeave={() => setSidebarHoverId(null)}
                  type="button"
                >
                  <span className="ranking-index">{String(index + 1).padStart(2, '0')}</span>
                  <div>
                    <strong>
                      {t.paragraph} {node.id}
                    </strong>
                    <p>{node.preview}</p>
                  </div>
                  <span className="ranking-score">{fmtScore(node.pagerank)}</span>
                </button>
              ))}
            </div>
          </section>
        </>
      ) : null}
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
