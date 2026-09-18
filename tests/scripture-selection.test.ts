import assert from 'node:assert/strict';
import test from 'node:test';

import { parseVerseSelections } from '../scripts/lib/scripture-selection.mjs';

test('preserves a range that continues into the next chapter', () => {
  assert.deepEqual(parseVerseSelections(3, '16-4:6'), {
    chapters: [3, 4],
    selections: [
      { chapter: 3, verses: { start: 16, end: null } },
      { chapter: 4, verses: { start: 1, end: 6 } },
    ],
  });
});

test('preserves ordinary verse lists and ranges', () => {
  assert.deepEqual(parseVerseSelections(14, '15,17-18'), {
    chapters: [14],
    selections: [
      { chapter: 14, verses: [15] },
      { chapter: 14, verses: [17, 18] },
    ],
  });
});

test('uses the full verse when a citation selects only part of it', () => {
  assert.deepEqual(parseVerseSelections(3, '19-4:1a'), {
    chapters: [3, 4],
    selections: [
      { chapter: 3, verses: { start: 19, end: null } },
      { chapter: 4, verses: { start: 1, end: 1 } },
    ],
  });
});
