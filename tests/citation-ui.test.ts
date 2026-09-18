import assert from 'node:assert/strict';
import test from 'node:test';

import { paragraphTarget, sourceLanguageName } from '../src/lib/citation-ui.ts';
import type { ExternalReference } from '../src/types.ts';

function reference(label: string): ExternalReference {
  return {
    id: 'test-reference',
    footnoteId: 'test-footnote',
    footnoteNumber: 1,
    kind: 'document',
    label,
  };
}

test('only catechism references become paragraph jump targets', () => {
  assert.equal(paragraphTarget(reference('CCC 77')), 77);
  assert.equal(paragraphTarget(reference('jfr KKK § 77')), 77);
  assert.equal(paragraphTarget(reference('§ 77')), 77);
  assert.equal(paragraphTarget(reference('DV 7 § 2')), undefined);
  assert.equal(paragraphTarget(reference('GS 24 § 3')), undefined);
});

test('source language names follow the interface language', () => {
  assert.equal(sourceLanguageName('en', 'sv'), 'Engelska');
  assert.equal(sourceLanguageName('de', 'sv'), 'Tyska');
  assert.equal(sourceLanguageName('la', 'sv'), 'Latin');
  assert.equal(sourceLanguageName('pt', 'en'), 'Portuguese');
});
