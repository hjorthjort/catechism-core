export type Footnote = {
  id: string;
  number: number | string;
  html: string;
  text: string;
};

export type Heading = {
  kind: 'major' | 'minor';
  text: string;
};

export type CatechismNode = {
  id: number;
  number: number;
  part: string;
  breadcrumbs: string[];
  headings: Heading[];
  title: string;
  text: string;
  textHtml: string;
  preview: string;
  footnotes: Footnote[];
  xrefs: number[];
  incoming: number[];
  pagerank: number;
  relativePagerank: number;
  visualRadius: number;
  position: {
    x: number;
    y: number;
  };
};

export type CatechismEdge = {
  source: number;
  target: number;
};

export type CatechismData = {
  generatedAt: string;
  source: {
    corpus: string;
    graph: string;
  };
  stats: {
    paragraphs: number;
    references: number;
  };
  nodes: CatechismNode[];
  edges: CatechismEdge[];
};
