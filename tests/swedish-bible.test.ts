import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { parseSwedishBibleReference } from '../src/lib/swedish-bible.ts';

test('parses English and Swedish Bible abbreviations for Swedish passages', () => {
  assert.deepEqual(parseSwedishBibleReference('Col 3:16'), {
    bookNumber: 51,
    reference: 'Col 3:16',
    selections: [{ firstChapter: 3, lastChapter: 3, firstVerse: 16, lastVerse: 16 }],
  });
  assert.equal(parseSwedishBibleReference('Kol 3:16')?.bookNumber, 51);
  assert.equal(parseSwedishBibleReference('Acts 2:42')?.bookNumber, 44);
  assert.equal(parseSwedishBibleReference('Apg 2:42')?.bookNumber, 44);
});

test('parses chapter ranges, compound references, and one-chapter books', () => {
  assert.deepEqual(parseSwedishBibleReference('Jn 18:37; 12:32')?.selections, [
    { firstChapter: 18, lastChapter: 18, firstVerse: 37, lastVerse: 37 },
    { firstChapter: 12, lastChapter: 12, firstVerse: 32, lastVerse: 32 },
  ]);
  assert.deepEqual(parseSwedishBibleReference('1 Kor 1-6')?.selections, [
    { firstChapter: 1, lastChapter: 6, firstVerse: 1, lastVerse: Number.POSITIVE_INFINITY },
  ]);
  assert.deepEqual(parseSwedishBibleReference('Jud 24-25')?.selections, [
    { firstChapter: 1, lastChapter: 1, firstVerse: 24, lastVerse: 25 },
  ]);
  assert.equal(parseSwedishBibleReference('Sak 2:14')?.reference, 'Sak 2:10');
  assert.equal(parseSwedishBibleReference('Sak 2:17')?.reference, 'Sak 2:13');
  assert.equal(parseSwedishBibleReference('Jes 13:27')?.reference, 'Jer 13:27');
  assert.equal(parseSwedishBibleReference('Luk 14:44')?.reference, 'Luk 24:44');
});

test('every Swedish Scripture reference can request a Swedish passage', () => {
  const pack = JSON.parse(readFileSync(new URL('../public/data/reader-generated/sv.json', import.meta.url), 'utf8'));
  const scriptureReferences = pack.nodes.flatMap((node: { externalReferences?: Array<{ kind: string; label: string }> }) =>
    (node.externalReferences ?? []).filter((reference) => reference.kind === 'scripture'));
  const failures = scriptureReferences.filter((reference: { label: string }) => !parseSwedishBibleReference(reference.label));
  assert.equal(failures.length, 0, failures.map((reference: { label: string }) => reference.label).join(', '));
});
