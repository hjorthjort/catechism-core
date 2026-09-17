import assert from 'node:assert/strict';
import test from 'node:test';

import { abbreviateLinkedCitation, abbreviateScriptureReference, scriptureWorkTitle, sourceCitation, sourceWorkTitle } from '../src/lib/source-labels.ts';
import type { ExternalSource } from '../src/types.ts';

function source(values: Partial<ExternalSource>): ExternalSource {
  return {
    id: 'scripture:jn-1-1',
    kind: 'scripture',
    title: 'Sacred Scripture',
    citation: 'John 1:1',
    url: '',
    language: 'en',
    sourceLabel: '',
    translationStatus: 'public-domain',
    contentHtml: '',
    contentText: '',
    ...values,
  };
}

test('uses canonical abbreviations for long-form Scripture references', () => {
  assert.equal(abbreviateScriptureReference('Genesis 3:15'), 'Gen 3:15');
  assert.equal(abbreviateScriptureReference('Deuteronomy 28: 10'), 'Deut 28: 10');
  assert.equal(abbreviateScriptureReference('1 Corinthians 9:22'), '1 Cor 9:22');
  assert.equal(abbreviateScriptureReference('John 1:1'), 'Jn 1:1');
});

test('supplies the full localized Bible-book title', () => {
  assert.equal(scriptureWorkTitle('Jn 1:1', 'en'), 'The Gospel of John');
  assert.equal(scriptureWorkTitle('Joh 1:1', 'sv'), 'Johannesevangeliet');
  assert.equal(scriptureWorkTitle('1 Cor 9:22', 'en'), 'The First Letter of Saint Paul to the Corinthians');
});

test('uses a document abbreviation in the citation and its full title below the text', () => {
  const councilSource = source({
    id: 'document:gs:vatican-council-ii-gs-19-1',
    kind: 'document',
    title: 'Gaudium et spes',
    citation: 'Vatican Council II, GS 19 § 1.',
  });
  assert.equal(sourceCitation(councilSource), 'GS 19 § 1.');
  assert.equal(sourceWorkTitle(councilSource, 'en'), 'Gaudium et Spes');
  assert.equal(abbreviateLinkedCitation('John 14:26', 'scripture'), 'Jn 14:26');
  assert.equal(abbreviateLinkedCitation(
    'John Paul II, Apostolic Exhortation Catechesi tradendae 1; 2.',
    'document',
    'document:ct:john-paul-ii-apostolic-exhortation-catechesi-tradendae-1-2',
  ), 'CT 1; 2.');

  assert.equal(sourceCitation(source({
    id: 'document:aquinas-hebrews:8-4',
    kind: 'document',
    title: 'St. Thomas Aquinas, Super Epistolam ad Hebraeos',
    citation: 'St. Thomas Aquinas, Hebr. 8,4.',
  })), 'Hebr. 8,4.');
});
