import { useDeferredValue, useMemo, useState } from 'react';
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

function Shell({ data }: { data: CatechismData }) {
  const nodeMap = useMemo(() => new Map(data.nodes.map((node) => [node.id, node])), [data.nodes]);
  const topNodes = useMemo(
    () => [...data.nodes].sort((a, b) => b.pagerank - a.pagerank).slice(0, 10),
    [data.nodes],
  );

  return (
    <BrowserRouter>
      <div className="app-shell">
        <header className="site-header">
          <Link className="wordmark" to="/">
            <span className="wordmark-kicker">Catholic Core</span>
            <span className="wordmark-title">Connections in the Catechism</span>
          </Link>
          <nav className="site-nav">
            <NavLink to="/">Overview</NavLink>
            <NavLink to="/explore">Explorer</NavLink>
            <NavLink to={`/paragraph/${topNodes[0]?.id ?? 1}`}>Top Node</NavLink>
          </nav>
        </header>
        <Routes>
          <Route path="/" element={<HomePage data={data} topNodes={topNodes} />} />
          <Route path="/explore" element={<ExplorePage data={data} />} />
          <Route path="/paragraph/:id" element={<ParagraphPage nodeMap={nodeMap} />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

function HomePage({ data, topNodes }: { data: CatechismData; topNodes: CatechismNode[] }) {
  return (
    <main className="page">
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">A way to explore the connections in the Catechism</p>
          <h1>The Catechism as a navigable network, not just a shelf of pages.</h1>
          <p className="lede">
            This site turns every numbered paragraph into a node, maps its outgoing and incoming
            links, ranks the graph with PageRank, and lets you move from overview to close reading
            in one click.
          </p>
          <div className="hero-actions">
            <Link className="button" to="/explore">
              Open the graph
            </Link>
            <a className="button button-ghost" href={data.source.corpus} target="_blank" rel="noreferrer">
              View source corpus
            </a>
          </div>
        </div>
        <div className="hero-panel">
          <div className="stat-card">
            <span>Paragraphs</span>
            <strong>{data.stats.paragraphs.toLocaleString()}</strong>
          </div>
          <div className="stat-card">
            <span>Internal links</span>
            <strong>{data.stats.references.toLocaleString()}</strong>
          </div>
          <div className="stat-card">
            <span>External refs</span>
            <strong>{data.stats.externalReferences.toLocaleString()}</strong>
          </div>
        </div>
      </section>

      <section className="feature-grid">
        <article>
          <h2>Graph-first reading</h2>
          <p>
            Zoom through the whole corpus, hover to preview a paragraph, and open any node as a
            full reading view with its footnotes and links.
          </p>
        </article>
        <article>
          <h2>Reference mapping</h2>
          <p>
            Outgoing references show where a paragraph points. Incoming references reveal where it
            is invoked across the broader Catechism.
          </p>
        </article>
        <article>
          <h2>PageRank</h2>
          <p>
            The ranking layer estimates which paragraphs are most central in a random walk through
            the internal reference graph.
          </p>
        </article>
      </section>

      <section className="ranking-section">
        <div className="section-heading">
          <p className="eyebrow">Most central paragraphs</p>
          <h2>Current top PageRank nodes</h2>
        </div>
        <div className="ranking-list">
          {topNodes.map((node, index) => (
            <Link className="ranking-item" key={node.id} to={`/paragraph/${node.id}`}>
              <span className="ranking-index">{String(index + 1).padStart(2, '0')}</span>
              <div>
                <strong>¶ {node.id}</strong>
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

function ExplorePage({ data }: { data: CatechismData }) {
  const navigate = useNavigate();
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
          <p className="eyebrow">Explorer</p>
          <h1>Trace the web of references</h1>
        </div>
        <label className="search-field">
          <span>Find a paragraph</span>
          <input
            type="search"
            placeholder="Try 2558, Eucharist, prayer..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>

        <div className="search-results">
          {results.map((node) => (
            <div className="search-result" key={node.id}>
              <button type="button" onClick={() => setFocusId(node.id)}>
                <strong>¶ {node.id}</strong>
                <span>{node.title}</span>
                <small>
                  {node.externalReferences.length} external refs
                </small>
              </button>
              <Link to={`/paragraph/${node.id}`}>Open</Link>
            </div>
          ))}
        </div>

        {focusedNode ? (
          <div className="focus-card">
            <p className="eyebrow">Focused node</p>
            <h2>¶ {focusedNode.id}</h2>
            <p>{focusedNode.preview}</p>
            <dl>
              <div>
                <dt>Outgoing</dt>
                <dd>{focusedNode.xrefs.length}</dd>
              </div>
              <div>
                <dt>Incoming</dt>
                <dd>{focusedNode.incoming.length}</dd>
              </div>
              <div>
                <dt>Rank</dt>
                <dd>{fmtScore(focusedNode.pagerank)}</dd>
              </div>
              <div>
                <dt>Scripture</dt>
                <dd>{focusedExternalCounts?.scripture ?? 0}</dd>
              </div>
              <div>
                <dt>Documents</dt>
                <dd>{focusedExternalCounts?.document ?? 0}</dd>
              </div>
            </dl>
            <button className="button" type="button" onClick={() => navigate(`/paragraph/${focusedNode.id}`)}>
              Read paragraph
            </button>
          </div>
        ) : null}
      </aside>

      <section className="explore-canvas">
        <GraphCanvas
          edges={data.edges}
          focusId={focusId}
          nodes={data.nodes}
          onNodeClick={(id) => navigate(`/paragraph/${id}`)}
        />
      </section>
    </main>
  );
}

function ParagraphPage({ nodeMap }: { nodeMap: Map<number, CatechismNode> }) {
  const params = useParams();
  const id = Number(params.id);
  const node = Number.isFinite(id) ? nodeMap.get(id) : undefined;

  if (!node) {
    return (
      <main className="page">
        <section className="not-found">
          <h1>Paragraph not found</h1>
          <Link className="button" to="/explore">
            Back to explorer
          </Link>
        </section>
      </main>
    );
  }

  const externalCounts = countExternalKinds(node);

  return (
    <main className="page paragraph-page">
      <section className="paragraph-hero">
        <div>
          <p className="eyebrow">{node.part}</p>
          <h1>¶ {node.id}</h1>
          <p className="lede">{node.title}</p>
        </div>
        <div className="paragraph-metrics">
          <span>PageRank {fmtScore(node.pagerank)}</span>
          <span>{node.xrefs.length} outgoing</span>
          <span>{node.incoming.length} incoming</span>
          <span>{externalCounts.scripture} Scripture refs</span>
          <span>{externalCounts.document} document refs</span>
        </div>
      </section>

      <section className="paragraph-layout">
        <article className="paragraph-body">
          <div className="breadcrumb-trail">
            {node.breadcrumbs.map((crumb) => (
              <span key={crumb}>{crumb}</span>
            ))}
          </div>

          <div className="paragraph-text">
            <p dangerouslySetInnerHTML={{ __html: node.textHtml }} />
          </div>

          {node.vaticanSource ? (
            <section className="source-link-block">
              <h2>Source material</h2>
              <a
                className="source-link"
                href={node.vaticanSource.url}
                rel="noreferrer"
                target="_blank"
              >
                Open the Vatican source page
                <span>{node.vaticanSource.file}</span>
              </a>
            </section>
          ) : null}

          <section className="external-references-block">
            <h2>External references</h2>
            <div className="external-reference-list">
              {node.externalReferences.map((reference) => (
                <div className={`external-reference ${reference.kind}`} key={reference.id}>
                  <span className="reference-kind">
                    {reference.kind === 'scripture' ? 'Scripture' : 'Document'}
                  </span>
                  <strong>Footnote {reference.footnoteNumber}</strong>
                  <p>{reference.label}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="footnotes-block">
            <h2>Footnotes</h2>
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
          <section>
            <h2>Links out</h2>
            <div className="link-cloud">
              {node.xrefs.map((target) => (
                <Link key={target} to={`/paragraph/${target}`}>
                  ¶ {target}
                </Link>
              ))}
            </div>
          </section>
          <section>
            <h2>Links in</h2>
            <div className="link-cloud">
              {node.incoming.map((source) => (
                <Link key={source} to={`/paragraph/${source}`}>
                  ¶ {source}
                </Link>
              ))}
            </div>
          </section>
          <Link className="button" to="/explore">
            Return to graph
          </Link>
        </aside>
      </section>
    </main>
  );
}

export default function App() {
  const { data, error, loading } = useCatechismData();

  if (loading) {
    return (
      <main className="loading-screen">
        <p className="eyebrow">Catholic Core</p>
        <h1>Loading the Catechism graph...</h1>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="loading-screen">
        <p className="eyebrow">Catholic Core</p>
        <h1>Graph data failed to load</h1>
        <p>{error ?? 'Unknown error'}</p>
      </main>
    );
  }

  return <Shell data={data} />;
}
