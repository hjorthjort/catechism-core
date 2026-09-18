import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const graph = JSON.parse(
  readFileSync(new URL('../public/data/catechism-graph.json', import.meta.url), 'utf8'),
);
const swedish = JSON.parse(
  readFileSync(new URL('../public/data/languages/sv.json', import.meta.url), 'utf8'),
);
const sources = Object.assign(
  {},
  ...[1, 2, 3, 4].map((number) =>
    JSON.parse(
      readFileSync(
        new URL(`../public/data/external-sources-${number}.json`, import.meta.url),
        'utf8',
      ),
    ),
  ),
);
const references = graph.nodes.flatMap((node: { externalReferences?: Array<Record<string, unknown>> }) =>
  node.externalReferences ?? [],
);

function unresolvedReferences(pattern: RegExp) {
  return references.filter((reference: { canonicalLabel?: string; label?: string; sourceId?: string }) => {
    const label = reference.canonicalLabel ?? reference.label ?? '';
    return pattern.test(label) && (!reference.sourceId || !sources[reference.sourceId]);
  });
}

test('every stored source id resolves to a source payload', () => {
  const dangling = references.filter(
    (reference: { sourceId?: string }) => reference.sourceId && !sources[reference.sourceId],
  );
  assert.deepEqual(dangling, []);
});

test('Aquinas and canon-law references retain complete source coverage', () => {
  assert.deepEqual(unresolvedReferences(/Thomas Aquinas/i), []);
  assert.deepEqual(unresolvedReferences(/^CIC\b/i), []);
  assert.deepEqual(unresolvedReferences(/^CCEO\b/i), []);
});

test('newly imported papal-document families have source payloads', () => {
  const sourceIds = Object.keys(sources);
  for (const family of [
    'cpg', 'dc', 'dev', 'dm', 'immd', 'indd', 'lp', 'mc', 'md', 'mf', 'mm',
    'pp', 'pt', 'qp', 'rh', 'rmat', 'rp', 'vc', 'vqa',
  ]) {
    assert.ok(
      sourceIds.some((sourceId) => sourceId.startsWith(`document:${family}:`)),
      `Expected at least one source for ${family}`,
    );
  }
});

test('Swedish compare and ibid footnotes retain their resolved sources', () => {
  const swedishReferences = swedish.nodes.flatMap(
    (node: { externalReferences?: Array<Record<string, unknown>> }) => node.externalReferences ?? [],
  );
  const resolvedFootnotes = new Set(
    swedishReferences.map((reference: { footnoteId: string }) => reference.footnoteId),
  );
  const unresolvedIbid = swedish.nodes.flatMap((node: {
    id: number;
    footnotes?: Array<{ id: string; text: string }>;
  }) => (node.footnotes ?? [])
    .filter((footnote) => /^(?:(?:cf|jfr|jmfr)\.?\s+)?ibid\b/i.test(footnote.text) && !resolvedFootnotes.has(footnote.id))
    .map((footnote) => `${node.id}:${footnote.id}`));
  assert.deepEqual(unresolvedIbid, []);

  const unresolvedLinkedScripture = swedish.nodes.flatMap((node: {
    id: number;
    footnotes?: Array<{ id: string; text: string; html: string }>;
  }) => (node.footnotes ?? [])
    .filter((footnote) =>
      /^(?:cf|jfr|jmfr)\b/i.test(footnote.text) &&
      /bibeln\.se/i.test(footnote.html) &&
      !resolvedFootnotes.has(footnote.id),
    )
    .map((footnote) => `${node.id}:${footnote.id}`));
  assert.deepEqual(unresolvedLinkedScripture, []);

  const danglingSwedishSources = swedishReferences.filter(
    (reference: { sourceId?: string }) => reference.sourceId && !sources[reference.sourceId],
  );
  assert.deepEqual(danglingSwedishSources, []);

  const hebrews = swedish.nodes.find((node: { id: number }) => node.id === 102);
  const hebrewsReference = hebrews.externalReferences.find(
    (reference: { footnoteId: string }) => reference.footnoteId === '102:2',
  );
  assert.equal(hebrewsReference.label, 'Heb 1:1-3');
  assert.equal(hebrewsReference.sourceId, 'scripture:heb-1-1-3');

  const ibid = swedish.nodes.find((node: { id: number }) => node.id === 7);
  const ibidReference = ibid.externalReferences.find(
    (reference: { footnoteId: string }) => reference.footnoteId === '7:5',
  );
  assert.equal(ibidReference.label, 'CT 13.');
  assert.equal(ibidReference.sourceId, 'document:ct:ct-13');
});
