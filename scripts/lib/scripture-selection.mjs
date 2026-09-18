function expandVerseToken(token) {
  const trimmed = token.trim();
  if (!trimmed) return [];

  const rangeMatch = trimmed.match(/^(\d+)[a-z]?-(\d+)[a-z]?$/i);
  if (rangeMatch) {
    const start = Number(rangeMatch[1]);
    const end = Number(rangeMatch[2]);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return [];
    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }

  const single = Number(trimmed.match(/^(\d+)[a-z]?$/i)?.[1]);
  return Number.isFinite(single) ? [single] : [];
}

function appendCrossChapterRange(selections, chapters, startChapter, startVerse, endChapter, endVerse) {
  if (
    ![startChapter, startVerse, endChapter, endVerse].every(Number.isFinite) ||
    endChapter < startChapter ||
    (endChapter === startChapter && endVerse < startVerse)
  ) return;

  for (let chapter = startChapter; chapter <= endChapter; chapter += 1) {
    chapters.add(chapter);
    if (chapter === startChapter && chapter === endChapter) {
      selections.push({
        chapter,
        verses: Array.from({ length: endVerse - startVerse + 1 }, (_, index) => startVerse + index),
      });
    } else if (chapter === startChapter) {
      selections.push({ chapter, verses: { start: startVerse, end: null } });
    } else if (chapter === endChapter) {
      selections.push({ chapter, verses: { start: 1, end: endVerse } });
    } else {
      selections.push({ chapter, verses: null });
    }
  }
}

export function parseVerseSelections(initialChapter, verseSpec) {
  const selections = [];
  const chapters = new Set([initialChapter]);

  for (const token of verseSpec.split(/\s*,\s*/)) {
    const explicitCrossChapter = token.match(/^(\d+):(\d+)[a-z]?-(\d+):(\d+)[a-z]?$/i);
    if (explicitCrossChapter) {
      appendCrossChapterRange(
        selections,
        chapters,
        Number(explicitCrossChapter[1]),
        Number(explicitCrossChapter[2]),
        Number(explicitCrossChapter[3]),
        Number(explicitCrossChapter[4]),
      );
      continue;
    }

    // The first chapter has already been consumed from a citation such as
    // "2 Cor 3:16-4:6", leaving the verse specification "16-4:6".
    const relativeCrossChapter = token.match(/^(\d+)[a-z]?-(\d+):(\d+)[a-z]?$/i);
    if (relativeCrossChapter) {
      appendCrossChapterRange(
        selections,
        chapters,
        initialChapter,
        Number(relativeCrossChapter[1]),
        Number(relativeCrossChapter[2]),
        Number(relativeCrossChapter[3]),
      );
      continue;
    }

    const chapterSpecific = token.match(/^(\d+):(.+)$/);
    if (chapterSpecific) {
      const chapter = Number(chapterSpecific[1]);
      const verses = chapterSpecific[2].split(/\s*,\s*/).flatMap(expandVerseToken);
      if (verses.length > 0) {
        chapters.add(chapter);
        selections.push({ chapter, verses });
      }
      continue;
    }

    const verses = expandVerseToken(token);
    if (verses.length > 0) selections.push({ chapter: initialChapter, verses });
  }

  return {
    chapters: [...chapters].sort((left, right) => left - right),
    selections,
  };
}
