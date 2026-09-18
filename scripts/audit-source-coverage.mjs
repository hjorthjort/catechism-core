import { readFile } from 'node:fs/promises';

const graph = JSON.parse(await readFile('public/data/catechism-graph.json', 'utf8'));
const sourceChunks = await Promise.all(
  [1, 2, 3, 4].map((number) =>
    readFile(`public/data/external-sources-${number}.json`, 'utf8').then(JSON.parse),
  ),
);
const sources = Object.assign({}, ...sourceChunks);
const references = graph.nodes.flatMap((node) =>
  (node.externalReferences ?? []).map((reference) => ({ ...reference, paragraph: node.id })),
);

function coverageFor(predicate) {
  const matching = references.filter(predicate);
  const linked = matching.filter(
    (reference) => reference.sourceId && sources[reference.sourceId],
  );
  return {
    total: matching.length,
    linked: linked.length,
    missing: matching.length - linked.length,
    percentage: matching.length === 0 ? 100 : (linked.length / matching.length) * 100,
  };
}

function printCoverage(label, coverage) {
  console.log(
    `${label.padEnd(18)} ${String(coverage.linked).padStart(4)}/${String(coverage.total).padEnd(4)}`
      + ` ${coverage.percentage.toFixed(1).padStart(5)}% (${coverage.missing} missing)`,
  );
}

printCoverage('Scripture', coverageFor((reference) => reference.kind === 'scripture'));
printCoverage('Documents', coverageFor((reference) => reference.kind === 'document'));
printCoverage(
  'Thomas Aquinas',
  coverageFor((reference) => /Thomas Aquinas/i.test(reference.canonicalLabel ?? reference.label)),
);
printCoverage(
  'CIC',
  coverageFor((reference) => /^CIC\b/i.test(reference.canonicalLabel ?? reference.label)),
);
printCoverage(
  'CCEO',
  coverageFor((reference) => /^CCEO\b/i.test(reference.canonicalLabel ?? reference.label)),
);

const dangling = references.filter(
  (reference) => reference.sourceId && !sources[reference.sourceId],
);
console.log(`External sources   ${Object.keys(sources).length}`);
console.log(`Dangling source IDs ${dangling.length}`);

if (process.argv.includes('--strict') && dangling.length > 0) {
  process.exitCode = 1;
}
