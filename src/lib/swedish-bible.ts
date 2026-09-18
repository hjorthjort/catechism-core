import { swedishBibleReferenceStart } from './source-labels.ts';

export type SwedishBibleSelection = {
  firstChapter: number;
  lastChapter: number;
  firstVerse: number;
  lastVerse: number;
};

export type ParsedSwedishBibleReference = {
  bookNumber: number;
  reference: string;
  selections: SwedishBibleSelection[];
};

const singleChapterBooks = new Set([31, 57, 63, 64, 65, 71, 76, 77, 78, 79]);
const allVerses = Number.POSITIVE_INFINITY;
const referenceCorrections = new Map([
  ['sak 2:14', 'Sak 2:10'],
  ['sak 2:17', 'Sak 2:13'],
  ['jes 13:27', 'Jer 13:27'],
  ['luk 14:44', 'Luk 24:44'],
]);

function selection(firstChapter: number, lastChapter: number, firstVerse = 1, lastVerse = allVerses): SwedishBibleSelection {
  return { firstChapter, lastChapter, firstVerse, lastVerse };
}

export function parseSwedishBibleReference(reference: string): ParsedSwedishBibleReference | undefined {
  const correctionKey = reference.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim().replace(/\.$/, '').toLocaleLowerCase('sv');
  const correctedReference = referenceCorrections.get(correctionKey) ?? reference;
  const start = swedishBibleReferenceStart(correctedReference);
  if (!start) return undefined;

  const locator = start.locator.replace(/\s+/g, '').replace(/–/g, '-');
  const parts = locator.split(/[;,]/).filter(Boolean);
  const selections: SwedishBibleSelection[] = [];
  let previousChapter: number | undefined;

  for (const part of parts) {
    let match = part.match(/^(\d+):(\d+)-(\d+):(\d+)$/);
    if (match) {
      const firstChapter = Number(match[1]);
      const lastChapter = Number(match[3]);
      selections.push(selection(firstChapter, lastChapter, Number(match[2]), Number(match[4])));
      previousChapter = lastChapter;
      continue;
    }

    match = part.match(/^(\d+)-(\d+):(\d+)$/);
    if (match) {
      const firstChapter = Number(match[1]);
      const lastChapter = Number(match[2]);
      selections.push(selection(firstChapter, lastChapter, 1, Number(match[3])));
      previousChapter = lastChapter;
      continue;
    }

    match = part.match(/^(\d+):(\d+)-(\d+)$/);
    if (match) {
      const chapter = Number(match[1]);
      selections.push(selection(chapter, chapter, Number(match[2]), Number(match[3])));
      previousChapter = chapter;
      continue;
    }

    match = part.match(/^(\d+):(\d+)(f{1,2})?$/i);
    if (match) {
      const chapter = Number(match[1]);
      const firstVerse = Number(match[2]);
      selections.push(selection(chapter, chapter, firstVerse, firstVerse + (match[3]?.length ?? 0)));
      previousChapter = chapter;
      continue;
    }

    match = part.match(/^(\d+)-(\d+)$/);
    if (match) {
      const first = Number(match[1]);
      const last = Number(match[2]);
      if (singleChapterBooks.has(start.bookNumber)) selections.push(selection(1, 1, first, last));
      else selections.push(selection(first, last));
      previousChapter = singleChapterBooks.has(start.bookNumber) ? 1 : last;
      continue;
    }

    match = part.match(/^(\d+)(f{1,2})$/i);
    if (match) {
      const first = Number(match[1]);
      const following = match[2].length;
      if (singleChapterBooks.has(start.bookNumber)) selections.push(selection(1, 1, first, first + following));
      else selections.push(selection(first, first + following));
      previousChapter = singleChapterBooks.has(start.bookNumber) ? 1 : first + following;
      continue;
    }

    match = part.match(/^(\d+)$/);
    if (match) {
      const value = Number(match[1]);
      if (previousChapter !== undefined) selections.push(selection(previousChapter, previousChapter, value, value));
      else if (singleChapterBooks.has(start.bookNumber)) selections.push(selection(1, 1, value, value));
      else selections.push(selection(value, value));
      previousChapter = previousChapter ?? (singleChapterBooks.has(start.bookNumber) ? 1 : value);
      continue;
    }

    return undefined;
  }

  return selections.length > 0 ? { bookNumber: start.bookNumber, reference: correctedReference, selections } : undefined;
}
