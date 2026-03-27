export type Footnote = {
  id: string;
  number: number | string;
  html: string;
  text: string;
};

export type ExternalReference = {
  id: string;
  footnoteId: string;
  footnoteNumber: number | string;
  label: string;
  kind: 'scripture' | 'document';
  canonicalLabel?: string;
  sourceId?: string | null;
};

export type ExternalSource = {
  id: string;
  kind: 'scripture' | 'document';
  title: string;
  citation: string;
  url: string;
  language: string;
  sourceLabel: string;
  translationStatus: 'official' | 'public-domain' | 'ai';
  translationNote?: string;
  contentHtml: string;
  contentText: string;
};

export type VaticanSource = {
  file: string;
  localPath: string;
  url: string;
} | null;

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
  externalReferences: ExternalReference[];
  vaticanSource: VaticanSource;
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

export type LocalizedFootnote = {
  id: string;
  number: number | string;
  html: string;
  text: string;
};

export type LocalizedNode = {
  id: number;
  title?: string;
  text?: string;
  textHtml?: string;
  preview?: string;
  breadcrumbs?: string[];
  headings?: Heading[];
  footnotes?: LocalizedFootnote[];
  externalReferences?: ExternalReference[];
  vaticanSource?: VaticanSource;
};

export type LanguagePack = {
  language: string;
  label: string;
  source: {
    corpus: string;
  };
  stats: {
    paragraphs: number;
  };
  nodes: LocalizedNode[];
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
    externalReferences: number;
  };
  nodes: CatechismNode[];
  edges: CatechismEdge[];
  externalSources: Record<string, ExternalSource>;
};
