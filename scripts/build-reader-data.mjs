import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import {
  assertFootnoteIntegrity,
  repairEnglishFootnoteIntegrity,
} from './lib/footnote-integrity.mjs';
import { assertNoUnlinkedInlineScriptureReferences } from './lib/inline-scripture.mjs';
import {
  attachLocalizedFootnoteReferences,
} from './lib/localized-footnote-references.mjs';

const output = 'public/data/reader-generated';
const sourceDirectory = `${output}/sources`;
const graph = JSON.parse(await readFile('public/data/catechism-graph.json', 'utf8'));
const swedish = JSON.parse(await readFile('public/data/languages/sv.json', 'utf8'));

// Keep reader builds compatible with older cached language packs. The source
// generator writes these links too; rebuilding them here is deterministic.
if (!swedish.nodes.some((node) => node.externalReferences?.length > 0)) {
  attachLocalizedFootnoteReferences(swedish.nodes, graph.nodes);
}

repairEnglishFootnoteIntegrity(graph.nodes);
const englishFootnotes = assertFootnoteIntegrity(graph.nodes, 'en');
const swedishFootnotes = assertFootnoteIntegrity(swedish.nodes, 'sv');
assertNoUnlinkedInlineScriptureReferences(graph.nodes, 'en');
assertNoUnlinkedInlineScriptureReferences(swedish.nodes, 'sv');

await rm(output, { recursive: true, force: true });
await mkdir(sourceDirectory, { recursive: true });

const core = {
  generatedAt: graph.generatedAt,
  source: graph.source,
  stats: graph.stats,
  hierarchyTitles: graph.hierarchyTitles,
  edges: [],
  externalSources: {},
  nodes: graph.nodes.map((node) => ({
    id: node.id,
    number: node.number,
    part: node.part,
    breadcrumbs: node.breadcrumbs,
    headings: node.headings,
    title: node.title,
    textHtml: node.textHtml,
    footnotes: node.footnotes,
    externalReferences: node.externalReferences,
    xrefs: node.xrefs,
  })),
};

const sv = {
  language: swedish.language,
  label: swedish.label,
  source: swedish.source,
  stats: swedish.stats,
  hierarchyTitles: swedish.hierarchyTitles,
  nodes: swedish.nodes.map((node) => ({
    id: node.id,
    title: node.title,
    textHtml: node.textHtml,
    headings: node.headings,
    footnotes: node.footnotes,
    externalReferences: node.externalReferences,
  })),
};

const sourceIndex = {};
const sources = Object.assign({}, ...await Promise.all([1, 2, 3, 4].map(async (number) =>
  JSON.parse(await readFile(`public/data/external-sources-${number}.json`, 'utf8')),
)));
const sourceEntries = Object.entries(sources);

await Promise.all(sourceEntries.map(async ([sourceId, source], index) => {
  const file = `${index}.json`;
  sourceIndex[sourceId] = file;
  await writeFile(`${sourceDirectory}/${file}`, JSON.stringify(source));
}));

await Promise.all([
  writeFile(`${output}/core.json`, JSON.stringify(core)),
  writeFile(`${output}/sv.json`, JSON.stringify(sv)),
  writeFile(`${output}/source-index.json`, JSON.stringify(sourceIndex)),
]);

console.log(
  `Verified footnotes: English ${englishFootnotes.markerCount}/${englishFootnotes.footnoteCount}, Swedish ${swedishFootnotes.markerCount}/${swedishFootnotes.footnoteCount}`,
);
