import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { cleanHierarchyLabel } from '../src/lib/hierarchy.ts';

test('preserves paired quotations in compound hierarchy titles', () => {
  assert.equal(
    cleanHierarchyLabel('Section 1: "I Believe" — "We Believe"'),
    '"I Believe" — "We Believe"',
  );
});

test('preserves quotations around a complete hierarchy title', () => {
  assert.equal(
    cleanHierarchyLabel('Article 8: "I Believe in the Holy Spirit"'),
    '"I Believe in the Holy Spirit"',
  );
});

test('removes only the structural hierarchy prefix', () => {
  assert.equal(
    cleanHierarchyLabel('Chapter 2: God Comes to Meet Man'),
    'God Comes to Meet Man',
  );
});

test('preserves every generated hierarchy title verbatim after its prefix', () => {
  const graph = JSON.parse(
    readFileSync(new URL('../public/data/catechism-graph.json', import.meta.url), 'utf8'),
  ) as { nodes: Array<{ breadcrumbs: string[] }> };
  const labels = new Set(graph.nodes.flatMap((node) => node.breadcrumbs));

  for (const label of labels) {
    const separator = label.indexOf(':');
    const expected = separator === -1 ? label : label.slice(separator + 1).trimStart();
    assert.equal(cleanHierarchyLabel(label), expected, label);
  }
});
