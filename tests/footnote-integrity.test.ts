import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  assertFootnoteIntegrity,
  repairEnglishFootnoteIntegrity,
} from '../scripts/lib/footnote-integrity.mjs';
import { findUnlinkedInlineScriptureReferences } from '../scripts/lib/inline-scripture.mjs';
import { attachLocalizedFootnoteReferences } from '../scripts/lib/localized-footnote-references.mjs';

test('links Swedish Scripture notes and resolves ibid against the actual source', () => {
  const canonical = [
    {
      id: 3,
      footnotes: [{ id: '3:10', number: 10, text: 'Cf. Acts 2:42.' }],
      externalReferences: [{ id: '3:10:scripture:1', footnoteId: '3:10', footnoteNumber: 10, label: 'Acts 2:42', canonicalLabel: 'Acts 2:42', kind: 'scripture', sourceId: 'scripture:acts-2-42' }],
    },
    {
      id: 4,
      footnotes: [{ id: '4:11', number: 11, text: 'CT 1.' }],
      externalReferences: [{ id: '4:11:document:1', footnoteId: '4:11', footnoteNumber: 11, label: 'CT 1.', canonicalLabel: 'CT 1.', kind: 'document', sourceId: 'document:ct:ct-1' }],
    },
    {
      id: 5,
      footnotes: [{ id: '5:12', number: 12, text: 'CT 18.' }],
      externalReferences: [{ id: '5:12:document:1', footnoteId: '5:12', footnoteNumber: 12, label: 'CT 18.', canonicalLabel: 'CT 18.', kind: 'document', sourceId: 'document:ct:ct-18' }],
    },
  ];
  const localized = [
    {
      id: 3,
      footnotes: [{ id: '3:1', number: 1, text: 'jfr Apg 2:42.', html: '<a href="https://www.bibeln.se/las/2k/apg#q=apg%2B2:42">Apg 2:42</a>.', compare: true }],
    },
    {
      id: 4,
      footnotes: [{ id: '4:2', number: 2, text: 'Johannes Paulus II, Catechesi tradendae, n. 1.', html: 'Johannes Paulus II, Catechesi tradendae, n. 1.' }],
    },
    {
      id: 5,
      footnotes: [{ id: '5:3', number: 3, text: 'ibid., n. 18.', html: 'ibid., n. 18.' }],
    },
  ];

  attachLocalizedFootnoteReferences(localized, canonical);

  assert.deepEqual(localized[0].externalReferences.map((reference: { label: string; sourceId: string }) => [reference.label, reference.sourceId]), [
    ['Apg 2:42', 'scripture:acts-2-42'],
  ]);
  assert.deepEqual(localized[2].externalReferences.map((reference: { label: string; sourceId: string }) => [reference.label, reference.sourceId]), [
    ['CT 18.', 'document:ct:ct-18'],
  ]);
});

test('repairs detached heading notes, inline citations, and carried-over notes', () => {
  const nodes = [
    {
      id: 1,
      headings: [{ kind: 'minor', text: 'A quoted heading.1' }],
      textHtml: 'Body',
      footnotes: [],
      externalReferences: [],
    },
    {
      id: 14,
      headings: [],
      textHtml: 'Body<a href="#!/search/fn/14:16"><sup>16</sup></a>',
      footnotes: [
        { id: 'h14:1', number: 1, html: 'Jn 17:3', text: 'Jn 17:3' },
        { id: '14:16', number: 16, html: 'Mt 10:32', text: 'Mt 10:32' },
      ],
      externalReferences: [
        { id: 'h14:1:scripture:1', footnoteId: 'h14:1', footnoteNumber: 1, label: 'Jn 17:3' },
      ],
    },
    {
      id: 45,
      headings: [],
      textHtml: 'Text (St. Augustine, <em>Conf</em>. 10, 28, 39: PL 32, 795).',
      footnotes: [{ id: 'inline:45:1', number: 1, html: 'St. Augustine', text: 'St. Augustine, Conf. 10, 28, 39: PL 32, 795' }],
      externalReferences: [],
    },
    {
      id: 1675,
      headings: [],
      textHtml: 'Text<a href="#!/search/fn/1675:181"><sup>181</sup></a>',
      footnotes: [{ id: '1675:181', number: 181, html: 'SC 13 § 3.', text: 'SC 13 § 3.' }],
      externalReferences: [],
    },
    {
      id: 1676,
      headings: [],
      textHtml: 'Text<a href="#!/search/fn/1676:182"><sup>182</sup></a>',
      footnotes: [
        { id: '1676:181', number: 181, html: 'SC 13 § 3.', text: 'SC 13 § 3.' },
        { id: '1676:182', number: 182, html: 'CT 54.', text: 'CT 54.' },
      ],
      externalReferences: [],
    },
  ];

  repairEnglishFootnoteIntegrity(nodes);
  assertFootnoteIntegrity(nodes, 'fixture');

  assert.match(nodes[0].headings[0].html, /<sup>1<\/sup>/);
  assert.deepEqual(nodes[0].footnotes.map((footnote) => footnote.id), ['h14:1']);
  assert.deepEqual(nodes[1].footnotes.map((footnote) => footnote.id), ['14:16']);
  assert.match(nodes[2].textHtml, /class="inline-citation"/);
  assert.match(nodes[2].textHtml, /\(St\. Augustine, <em>Conf<\/em>/);
  assert.deepEqual(nodes[4].footnotes.map((footnote) => footnote.id), ['1676:182']);
});

test('all generated English and Swedish footnotes have exactly one marker and object', () => {
  const english = JSON.parse(
    readFileSync(new URL('../public/data/reader-generated/core.json', import.meta.url), 'utf8'),
  );
  const swedish = JSON.parse(
    readFileSync(new URL('../public/data/reader-generated/sv.json', import.meta.url), 'utf8'),
  );

  const englishReport = assertFootnoteIntegrity(english.nodes, 'en');
  const swedishReport = assertFootnoteIntegrity(swedish.nodes, 'sv');
  assert.equal(englishReport.markerCount, englishReport.footnoteCount);
  assert.equal(swedishReport.markerCount, swedishReport.footnoteCount);
  assert.deepEqual(findUnlinkedInlineScriptureReferences(english.nodes, 'en'), []);
  assert.deepEqual(findUnlinkedInlineScriptureReferences(swedish.nodes, 'sv'), []);

  const paragraph2247 = english.nodes.find((node: { id: number }) => node.id === 2247);
  assert.match(paragraph2247.textHtml, /class="inline-citation"/);
  assert.deepEqual(
    paragraph2247.externalReferences.map((reference: { label: string }) => reference.label),
    ['Deuteronomy 5:16', 'Mark 7:10'],
  );
});
