import assert from 'node:assert/strict';
import test from 'node:test';

import { footnoteHeading, paragraphTarget, sourceDocumentUrl, sourceLanguageName } from '../src/lib/citation-ui.ts';
import type { ExternalReference, ExternalSource } from '../src/types.ts';

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

function source(url: string): ExternalSource {
  return {
    id: 'test-source',
    kind: 'document',
    title: 'Test source',
    citation: 'TS 1',
    url,
    language: 'en',
    sourceLabel: 'Test',
    translationStatus: 'official',
    contentHtml: '<p>Test</p>',
    contentText: 'Test',
  };
}

test('source links require a valid web URL', () => {
  assert.equal(sourceDocumentUrl(source('https://example.com/document#section')), 'https://example.com/document#section');
  assert.equal(sourceDocumentUrl(source('http://example.com/document')), 'http://example.com/document');
  assert.equal(sourceDocumentUrl(source('javascript:alert(1)')), undefined);
  assert.equal(sourceDocumentUrl(source('/missing-source')), undefined);
  assert.equal(sourceDocumentUrl(null), undefined);
});

test('uses the complete footnote as its heading and resolves ibid headings', () => {
  const scripture = { ...reference('Lk 10:16'), kind: 'scripture' as const, sourceId: 'scripture:lk-10-16' };
  const document = { ...reference('LG 20.'), sourceId: 'document:lg:lg-20' };
  assert.equal(footnoteHeading('Lk 10:16; cf. LG 20.', [scripture, document]), 'Lk 10:16; cf. LG 20.');
  assert.equal(footnoteHeading('ibid.', [scripture, document]), 'Lk 10:16; LG 20.');
});
