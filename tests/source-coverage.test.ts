import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const graph = JSON.parse(
  readFileSync(new URL('../public/data/catechism-graph.json', import.meta.url), 'utf8'),
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
