import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { BrowserRouter, Link, Route, Routes, useNavigate, useParams } from 'react-router-dom';

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

const brandKicker = 'CCC';
const brandTitle = 'CCC Explorer';

function fmtScore(score: number) {
  return score.toFixed(score === 0 || score === 100 ? 0 : 1);
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

function getExternalSourceBadge(source: CatechismData['externalSources'][string] | undefined) {
  if (!source) {
    return null;
  }

  if (source.translationStatus === 'ai') {
    return 'Translated with AI';
  }

  if (source.translationStatus === 'official') {
    return 'Official Vatican text';
  }

  return source.sourceLabel;
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
            <span className="wordmark-kicker">{brandKicker}</span>
            <span className="wordmark-title">{brandTitle}</span>
          </Link>

          <div className="site-header-controls">
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
  const [graphHoverId, setGraphHoverId] = useState<number | null>(null);
  const [sidebarHoverId, setSidebarHoverId] = useState<number | null>(null);
  const [clusterRootId, setClusterRootId] = useState<number | null>(null);
  const deferredQuery = useDeferredValue(query);

  const selectedId = hasSelectedRoute ? routeId : localSelectedId;
  const selectedNode = selectedId !== null ? nodeMap.get(selectedId) ?? null : null;
  const previewId = graphHoverId ?? sidebarHoverId;
  const previewNode = previewId !== null ? nodeMap.get(previewId) ?? null : null;
  const panelNode = previewNode ?? selectedNode ?? (deferredDefaultId ? nodeMap.get(deferredDefaultId) ?? null : null);
  const panelExternalCounts = panelNode ? countExternalKinds(panelNode) : null;
  const directConnections = useMemo(
    () => (panelNode ? collectDirectConnections(nodeMap, panelNode) : []),
    [nodeMap, panelNode],
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
    if (selectedId === id) {
      clearSelection();
      return;
    }

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

  return (
    <main className={`page ${showHero ? '' : 'page-workspace'}`}>
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
                    <dd>{fmtScore(panelNode.relativePagerank)}</dd>
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
                highlightId={selectedNode?.id ?? null}
                hoverDelayMs={0}
                nodes={data.nodes}
                onBackgroundClick={clearSelection}
                onNodeClick={(id) => selectNode(id)}
                onNodeHover={setGraphHoverId}
                onNodeLongPress={handleGraphLongPress}
                selectedId={selectedNode?.id ?? null}
              />
            </section>

            <section className={`selection-panel ${panelNode ? '' : 'is-empty'}`}>
              {panelNode ? (
                <div className="selection-stack">
                  <article className="paragraph-body selected-paragraph">
                    <div className="selected-paragraph-header">
                      <div>
                        <p className="eyebrow">{getPartLabel(panelNode, language)}</p>
                        <h2>
                          {t.paragraph} {panelNode.id}
                        </h2>
                        <p className="lede">{getParagraphSubtitle(panelNode, language)}</p>
                      </div>

                      <div className="paragraph-metrics">
                        <span>
                          {t.rank} {fmtScore(panelNode.relativePagerank)}
                        </span>
                        <span>
                          {panelNode.xrefs.length} {t.outgoing}
                        </span>
                        <span>
                          {panelNode.incoming.length} {t.incoming}
                        </span>
                      </div>
                    </div>

                    <div className="breadcrumb-trail">
                      {panelNode.breadcrumbs.map((crumb) => (
                        <span key={crumb}>{crumb}</span>
                      ))}
                    </div>

                    <div className="paragraph-text" dangerouslySetInnerHTML={{ __html: panelNode.textHtml }} />

                    {panelNode.vaticanSource ? (
                      <section className="source-link-block">
                        <h3>{t.sourceMaterial}</h3>
                        <a
                          className="source-link"
                          href={panelNode.vaticanSource.url}
                          rel="noreferrer"
                          target="_blank"
                        >
                          {t.openSource}
                          <span>{panelNode.vaticanSource.file}</span>
                        </a>
                      </section>
                    ) : null}

                    {panelNode.externalReferences.length > 0 ? (
                      <section className="external-references-block">
                        <h3>{t.externalReferences}</h3>
                        <div className="external-reference-list">
                          {panelNode.externalReferences.map((reference) => (
                            <div className={`external-reference ${reference.kind}`} key={reference.id}>
                              <span className="reference-kind">
                                {reference.kind === 'scripture' ? t.scripture : t.document}
                              </span>
                              <strong>
                                {t.footnote} {reference.footnoteNumber}
                              </strong>
                              <p>{reference.label}</p>
                              {reference.sourceId && data.externalSources[reference.sourceId] ? (
                                <div className="external-reference-source">
                                  <div className="external-reference-source-header">
                                    <strong>{data.externalSources[reference.sourceId].title}</strong>
                                    {getExternalSourceBadge(data.externalSources[reference.sourceId]) ? (
                                      <span className="external-source-badge">
                                        {getExternalSourceBadge(data.externalSources[reference.sourceId])}
                                      </span>
                                    ) : null}
                                  </div>
                                  <p className="external-reference-citation">
                                    {data.externalSources[reference.sourceId].citation}
                                  </p>
                                  {data.externalSources[reference.sourceId].translationNote ? (
                                    <p className="external-reference-note">
                                      {data.externalSources[reference.sourceId].translationNote}
                                    </p>
                                  ) : null}
                                  <div
                                    className="external-reference-content"
                                    dangerouslySetInnerHTML={{
                                      __html: data.externalSources[reference.sourceId].contentHtml,
                                    }}
                                  />
                                  <a
                                    className="source-link external-source-link"
                                    href={data.externalSources[reference.sourceId].url}
                                    rel="noreferrer"
                                    target="_blank"
                                  >
                                    {t.openSource}
                                    <span>{data.externalSources[reference.sourceId].sourceLabel}</span>
                                  </a>
                                </div>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      </section>
                    ) : null}

                    {panelNode.footnotes.length > 0 ? (
                      <section className="footnotes-block">
                        <h3>{t.footnotes}</h3>
                        <div className="footnotes-list">
                          {panelNode.footnotes.map((note) => (
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
                  <span className="ranking-score">{fmtScore(node.relativePagerank)}</span>
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
        <p className="eyebrow">{brandKicker}</p>
        <h1>{t.loadingTitle}</h1>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="loading-screen">
        <p className="eyebrow">{brandKicker}</p>
        <h1>{t.errorTitle}</h1>
        <p>{error ?? 'Unknown error'}</p>
      </main>
    );
  }

  return <Shell data={data} language={language} onLanguageChange={setLanguage} />;
}
