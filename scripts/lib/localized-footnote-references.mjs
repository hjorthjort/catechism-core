import * as cheerio from 'cheerio';

const bibleBookAliases = new Map(
  Object.entries({
    GEN: ['gen', 'genesis', '1 mos'],
    EXO: ['ex', 'exod', 'exodus', '2 mos'],
    LEV: ['lev', 'leviticus', '3 mos'],
    NUM: ['num', 'numbers', '4 mos'],
    DEU: ['deut', 'deuteronomy', '5 mos'],
    JOS: ['josh', 'joshua', 'jos'],
    JDG: ['judg', 'judges', 'dom'],
    RUT: ['ruth', 'rut'],
    '1SA': ['1 sam', '1 samuel'],
    '2SA': ['2 sam', '2 samuel'],
    '1KI': ['1 kgs', '1 kings', '1 kung'],
    '2KI': ['2 kgs', '2 kings', '2 kung'],
    '1CH': ['1 chr', '1 chronicles', '1 krön'],
    '2CH': ['2 chr', '2 chronicles', '2 krön'],
    EZR: ['ezra', 'esr'],
    NEH: ['neh', 'nehemiah'],
    TOB: ['tob', 'tobit'],
    JDT: ['jdt', 'judith', 'judit'],
    EST: ['est', 'esth', 'esther'],
    '1MA': ['1 macc', '1 maccabees', '1 mack'],
    '2MA': ['2 macc', '2 maccabees', '2 mack'],
    JOB: ['job'],
    PSA: ['ps', 'pss', 'psalm', 'psalms'],
    PRO: ['prov', 'proverbs', 'ords', 'ord'],
    ECC: ['eccl', 'ecclesiastes', 'pred'],
    SNG: ['song', 'song of songs', 'song of solomon', 'höga v', 'höga'],
    WIS: ['wis', 'wisdom', 'vis', 'vish'],
    SIR: ['sir', 'sirach', 'syr'],
    ISA: ['isa', 'isaiah', 'jes'],
    JER: ['jer', 'jeremiah'],
    LAM: ['lam', 'lamentations', 'klag'],
    BAR: ['bar', 'baruch'],
    EZK: ['ezek', 'ezekiel', 'hes'],
    DAN: ['dan', 'daniel'],
    HOS: ['hos', 'hosea'],
    JOL: ['joel'],
    AMO: ['amos', 'am'],
    OBA: ['obad', 'obadiah', 'ob'],
    JON: ['jon', 'jonah', 'jona'],
    MIC: ['mic', 'micah', 'mik'],
    NAM: ['nah', 'nahum'],
    HAB: ['hab', 'habakkuk'],
    ZEP: ['zeph', 'zephaniah', 'sef'],
    HAG: ['hag', 'haggai', 'hagg'],
    ZEC: ['zech', 'zechariah', 'sak'],
    MAL: ['mal', 'malachi'],
    MAT: ['mt', 'matt', 'matthew'],
    MRK: ['mk', 'mark'],
    LUK: ['lk', 'luke', 'luk'],
    JHN: ['jn', 'john', 'joh'],
    ACT: ['acts', 'act', 'apg'],
    ROM: ['rom', 'romans'],
    '1CO': ['1 cor', '1 corinthians', '1 kor'],
    '2CO': ['2 cor', '2 corinthians', '2 kor'],
    GAL: ['gal', 'galatians'],
    EPH: ['eph', 'ephesians', 'ef'],
    PHP: ['phil', 'philippians', 'fil'],
    COL: ['col', 'colossians', 'kol'],
    '1TH': ['1 thess', '1 thessalonians'],
    '2TH': ['2 thess', '2 thessalonians'],
    '1TI': ['1 tim', '1 timothy'],
    '2TI': ['2 tim', '2 timothy'],
    TIT: ['tit', 'titus'],
    PHM: ['phlm', 'philemon', 'filem'],
    HEB: ['heb', 'hebrews'],
    JAS: ['jas', 'james', 'jak'],
    '1PE': ['1 pet', '1 peter'],
    '2PE': ['2 pet', '2 peter'],
    '1JN': ['1 jn', '1 john', '1 joh'],
    '2JN': ['2 jn', '2 john', '2 joh'],
    '3JN': ['3 jn', '3 john', '3 joh'],
    JUD: ['jude', 'jud'],
    REV: ['rev', 'revelation', 'upp'],
  }).flatMap(([book, aliases]) => aliases.map((alias) => [alias, book])),
);

function cleanText(value) {
  return String(value ?? '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeBook(value) {
  return cleanText(value).toLocaleLowerCase('sv-SE').replace(/\.$/, '');
}

function scriptureSignature(value) {
  const cleaned = normalizeSpecialScriptureReference(cleanText(value))
    .replace(/^(?:cf|jfr|jmfr)\.?\s+/i, '')
    .replace(/[.;]+$/, '');
  const match = cleaned.match(/^(.+?)\s+(\d[\d\s:;,\-–f]*)$/iu);
  if (!match) return null;
  const book = bibleBookAliases.get(normalizeBook(match[1]));
  if (!book) return null;
  const locator = match[2].replace(/\s+/g, '').replace(/–/g, '-').toLowerCase();
  return `${book}|${locator}`;
}

function normalizeSpecialScriptureReference(value) {
  return value.replace(/\bTill\s+Dan\s+B:(\d+)(?:\s*[-–]\s*(\d+))?/iu, (_match, first, last) => {
    const firstVerse = Number(first) + 23;
    const lastVerse = last ? Number(last) + 23 : firstVerse;
    return `Dan 3:${firstVerse}${lastVerse === firstVerse ? '' : `-${lastVerse}`}`;
  });
}

function scriptureBaseSignature(value) {
  const signature = scriptureSignature(value);
  if (!signature) return null;
  const [book, locator] = signature.split('|');
  const start = locator.match(/^(\d+)(?::(\d+))?/);
  return start ? `${book}|${start[1]}${start[2] ? `:${start[2]}` : ''}` : null;
}

function scriptureBook(value) {
  return scriptureSignature(value)?.split('|')[0] ?? null;
}

function extractSwedishScriptureReferences(html) {
  const $ = cheerio.load(`<div>${html ?? ''}</div>`);
  const references = [];
  $('a[href]').each((_, element) => {
    const href = $(element).attr('href') ?? '';
    let query = null;
    try {
      const url = new URL(href, 'https://www.katekesen.se/');
      if (!url.hostname.includes('bibeln.se')) return;
      query = new URLSearchParams(url.hash.replace(/^#/, '')).get('q');
    } catch {
      return;
    }
    const label = cleanText($(element).text()) || cleanText(query?.replace(/\+/g, ' '));
    const canonical = normalizeSpecialScriptureReference(cleanText(query?.replace(/\+/g, ' ')) || label);
    const signature = scriptureSignature(canonical) ?? scriptureSignature(label);
    if (label && (signature || scriptureBook(canonical))) {
      references.push({
        label: label.replace(/\.$/, ''),
        canonical,
        signature,
        baseSignature: scriptureBaseSignature(canonical) ?? scriptureBaseSignature(label),
        book: scriptureBook(canonical) ?? scriptureBook(label),
      });
    }
  });
  return references;
}

function isIbid(value) {
  return /^(?:(?:cf|jfr|jmfr)\.?\s+)?ibid\b/i.test(cleanText(value));
}

function ibidLocator(value) {
  return cleanText(value).match(/\bn{1,2}\.?(?:\s*|\s*:\s*)(\d+(?:\s*[-–]\s*\d+)?(?:\s*§+\s*\d+)?)/i)?.[1]
    ?.replace(/\s+/g, '')
    .replace(/–/g, '-') ?? null;
}

function referenceFamily(reference) {
  return reference?.sourceId?.match(/^document:([^:]+):/)?.[1] ?? null;
}

function normalizedWords(value) {
  return cleanText(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function containsAlias(text, alias) {
  const normalizedAlias = normalizedWords(alias);
  return normalizedAlias.length > 1 && ` ${text} `.includes(` ${normalizedAlias} `);
}

function locatorTokens(value) {
  const normalized = cleanText(value).replace(/–/g, '-');
  const explicit = [...normalized.matchAll(/\b(?:n{1,2}|can(?:n)?|DS)\.?\s*([0-9]+(?:\s*[-,;]\s*[0-9]+)*(?:\s*§+\s*[0-9]+)?)/gi)]
    .flatMap((match) => match[1].match(/\d+/g) ?? []);
  return explicit.length > 0 ? explicit : normalized.match(/\b\d{1,3}\b/g) ?? [];
}

function matchLocalizedDocumentReferences(footnote, nodeReferences, allReferences, documentAliases) {
  const text = normalizedWords(footnote.text);
  const families = Object.entries(documentAliases)
    .filter(([family, aliases]) => [family, ...aliases].some((alias) => containsAlias(text, alias)))
    .map(([family]) => family);
  if (families.length === 0) return [];

  const localLocators = locatorTokens(footnote.text);
  const candidates = allReferences.filter((reference) =>
    reference.kind === 'document' && families.includes(referenceFamily(reference)),
  );
  const localCandidateIds = new Set(nodeReferences.map((reference) => reference.id));
  const scored = candidates.map((reference) => {
    const searchable = `${normalizedWords(reference.canonicalLabel ?? reference.label)} ${reference.sourceId ?? ''}`;
    const candidateLocators = locatorTokens(reference.canonicalLabel ?? reference.label);
    const locatorScore = localLocators.filter((locator) =>
      new RegExp(`(?:^|[^0-9])${locator}(?:[^0-9]|$)`).test(searchable),
    ).length;
    const exactLocatorSet = localLocators.length > 0 &&
      localLocators.length === candidateLocators.length &&
      localLocators.every((locator) => candidateLocators.includes(locator));
    const primaryLocatorMatch = localLocators.length === 0 ||
      new RegExp(`(?:^|[^0-9])${localLocators[0]}(?:[^0-9]|$)`).test(searchable);
    return {
      reference,
      score: locatorScore * 4 + (exactLocatorSet ? 3 : 0) + (localCandidateIds.has(reference.id) ? 2 : 0),
      locatorScore,
      primaryLocatorMatch,
    };
  });
  const eligible = scored.filter(({ locatorScore, primaryLocatorMatch }) =>
    (localLocators.length === 0 || locatorScore > 0) &&
    (families.length > 1 || primaryLocatorMatch),
  );
  const bestScore = Math.max(0, ...eligible.map(({ score }) => score));
  const best = eligible.filter(({ score }) =>
    score === bestScore,
  );
  const chosen = best.length > 0
    ? best.map(({ reference }) => reference)
    : candidates.length === 1
      ? candidates
      : [];
  const unique = new Map();
  for (const reference of chosen) {
    const key = reference.sourceId ?? `${reference.kind}:${reference.canonicalLabel ?? reference.label}`;
    if (!unique.has(key)) unique.set(key, reference);
  }
  return [...unique.values()];
}

function copyReferences(references, footnote) {
  const counters = { scripture: 0, document: 0 };
  return references.map((reference) => {
    counters[reference.kind] += 1;
    return {
      ...reference,
      id: `${footnote.id}:${reference.kind}:${counters[reference.kind]}`,
      footnoteId: footnote.id,
      footnoteNumber: footnote.number,
      compare: Boolean(footnote.compare ?? reference.compare),
    };
  });
}

function resolveIbidFromHistory(footnote, previousReferences, canonicalReferences, allCanonicalReferences) {
  if (canonicalReferences.length > 0) return copyReferences(canonicalReferences, footnote);
  if (previousReferences.length === 0) return [];

  const locator = ibidLocator(footnote.text);
  if (!locator) return copyReferences(previousReferences, footnote);

  const family = referenceFamily(previousReferences[0]);
  if (!family) return copyReferences(previousReferences, footnote);
  const locatorSlug = locator.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const familyCandidates = allCanonicalReferences.filter((reference) =>
    reference.sourceId?.startsWith(`document:${family}:`),
  );
  const resolved = familyCandidates.find((reference) =>
    reference.sourceId.endsWith(`-${locatorSlug}`) ||
    reference.sourceId.includes(`-${locatorSlug}-`) ||
    new RegExp(`\\b${locator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(reference.canonicalLabel ?? reference.label),
  );
  return copyReferences(resolved ? [resolved] : previousReferences, footnote);
}

export function attachLocalizedFootnoteReferences(localizedNodes, canonicalNodes, options = {}) {
  const documentAliases = {
    'aquinas-psalms': ['Thomas Aquinas', 'Thomas av Aquino', 'Expositio in Psalmos'],
    'aquinas-sth': ['Thomas Aquinas', 'Thomas av Aquino', 'Summa Theologiae'],
    ...(options.documentAliases ?? {}),
  };
  const canonicalById = new Map(canonicalNodes.map((node) => [node.id, node]));
  const allCanonicalReferences = canonicalNodes.flatMap((node) => node.externalReferences ?? []);
  const scriptureBySignature = new Map();
  const scriptureByBaseSignature = new Map();
  for (const reference of allCanonicalReferences) {
    if (reference.kind !== 'scripture') continue;
    const label = reference.canonicalLabel ?? reference.label;
    const signature = scriptureSignature(label);
    if (signature && !scriptureBySignature.has(signature)) scriptureBySignature.set(signature, reference);
    const baseSignature = scriptureBaseSignature(label);
    if (baseSignature && !scriptureByBaseSignature.has(baseSignature)) {
      scriptureByBaseSignature.set(baseSignature, reference);
    }
  }

  let previousReferences = [];
  let linked = 0;
  let ibidResolved = 0;
  let scriptureResolved = 0;

  for (const node of [...localizedNodes].sort((left, right) => left.id - right.id)) {
    const canonicalNode = canonicalById.get(node.id);
    const canonicalFootnotes = canonicalNode?.footnotes ?? [];
    const canonicalByFootnote = new Map();
    for (const reference of canonicalNode?.externalReferences ?? []) {
      const values = canonicalByFootnote.get(reference.footnoteId) ?? [];
      values.push(reference);
      canonicalByFootnote.set(reference.footnoteId, values);
    }

    const nodeReferences = [];
    for (const [index, footnote] of (node.footnotes ?? []).entries()) {
      const canonicalFootnote = canonicalFootnotes[index];
      const ordinalReferences = canonicalFootnote
        ? canonicalByFootnote.get(canonicalFootnote.id) ?? []
        : [];
      const localizedScripture = extractSwedishScriptureReferences(footnote.html);
      let references = [];

      if (isIbid(footnote.text)) {
        // The English and Swedish editions use different note numbers. The
        // corresponding English note is the strongest disambiguation; the
        // preceding resolved Swedish note remains the fallback for true ibid chains.
        references = resolveIbidFromHistory(
          footnote,
          previousReferences,
          ordinalReferences,
          allCanonicalReferences,
        );
        if (references.length > 0) ibidResolved += 1;
      } else if (localizedScripture.length > 0) {
        const documentReferences = ordinalReferences.filter((reference) => reference.kind === 'document');
        const ordinalScripture = ordinalReferences.filter((reference) => reference.kind === 'scripture');
        const scriptureReferences = localizedScripture.map(({ label, canonical, signature, baseSignature, book }, scriptureIndex) => {
          const ordinal = ordinalScripture[scriptureIndex];
          const matched = (signature ? scriptureBySignature.get(signature) : undefined)
            ?? (baseSignature ? scriptureByBaseSignature.get(baseSignature) : undefined)
            ?? (ordinal && scriptureBook(ordinal.canonicalLabel ?? ordinal.label) === book ? ordinal : undefined);
          return {
            ...(matched ?? {
              kind: 'scripture',
              sourceId: null,
              compare: footnote.compare,
            }),
            label: scriptureBook(label) ? label : canonical,
            canonicalLabel: canonical,
          };
        });
        references = copyReferences([...documentReferences, ...scriptureReferences], footnote);
        scriptureResolved += scriptureReferences.length;
      } else {
        const localizedDocuments = matchLocalizedDocumentReferences(
          footnote,
          canonicalNode?.externalReferences ?? [],
          allCanonicalReferences,
          documentAliases,
        );
        // Swedish Scripture references are explicit links in the note text and
        // are handled above. Do not import additional English-only Scripture
        // cross-references that the Swedish edition omits.
        references = copyReferences(
          localizedDocuments.length > 0
            ? localizedDocuments
            : ordinalReferences.filter((reference) => reference.kind === 'document'),
          footnote,
        );
      }

      nodeReferences.push(...references);
      if (references.length > 0) {
        previousReferences = references;
        linked += 1;
      }
    }
    node.externalReferences = nodeReferences;
  }

  return { linked, ibidResolved, scriptureResolved };
}

export function findUnresolvedLocalizedFootnotes(localizedNodes) {
  return localizedNodes.flatMap((node) => {
    const resolved = new Set((node.externalReferences ?? []).map((reference) => reference.footnoteId));
    return (node.footnotes ?? [])
      .filter((footnote) =>
        (/^(?:cf|jfr|jmfr)\b/i.test(cleanText(footnote.text)) || isIbid(footnote.text)) &&
        !resolved.has(footnote.id),
      )
      .map((footnote) => ({ nodeId: node.id, footnoteId: footnote.id, text: footnote.text }));
  });
}
