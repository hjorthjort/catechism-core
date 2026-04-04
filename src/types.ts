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
  compare?: boolean;
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
  hierarchyTitles?: Record<string, string>;
  nodes: LocalizedNode[];
};

export type DailyScheduleEntry = {
  date: string;
  paragraphId: number;
  themeKey: string;
  themeLabel: string;
  rationale: string;
  season: string;
  celebration: {
    name: string;
    type: string;
    description: string;
    quote: string;
  };
  readings: {
    firstReading: string | null;
    psalm: string | null;
    secondReading: string | null;
    gospel: string | null;
    usccbLink: string | null;
  } | null;
  source: 'cpbjr' | 'romcal';
  apiLinks: {
    calendar: string | null;
    readings: string | null;
  };
};

export type DailyScheduleData = {
  generatedAt: string;
  source: {
    calendar: string[];
    rangeStart: string;
    rangeEnd: string;
    basis: string;
  };
  stats: {
    entries: number;
    uniqueParagraphs: number;
  };
  entries: DailyScheduleEntry[];
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
  hierarchyTitles?: Record<string, string>;
};
