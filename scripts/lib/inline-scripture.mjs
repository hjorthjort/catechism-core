const englishBookPattern = String.raw`(?:Gen|Ex|Lev|Num|Deut|Dt|Josh|Judg|Ruth|[1-3]\s*(?:Sam|Kgs|Chr|Macc|Cor|Thess|Tim|Jn|Pet)|Ezra|Neh|Tob|Jdt|Esth|Job|Ps|Pss|Prov|Eccl|Song|Wis|Sir|Isa|Is|Jer|Lam|Bar|Ezek|Dan|Hos|Joel|Amos|Obad|Jon|Mic|Nah|Hab|Zeph|Hag|Zech|Mal|Mt|Mk|Lk|Jn|Acts|Rom|Gal|Eph|Phil|Col|Titus|Phlm|Heb|Jas|Jude|Rev)`;
const swedishBookPattern = String.raw`(?:[1-5]\s*Mos|Jos|Dom|Rut|[1-2]\s*(?:Sam|Kung|Krön|Mack|Kor|Thess|Tim|Pet|Joh)|Esr|Neh|Tob|Judit|Est|Job|Ps|Ords|Pred|Höga|Jes|Jer|Klag|Hes|Dan|Hos|Joel|Am|Ob|Jona|Mik|Nah|Hab|Sef|Hagg|Sak|Mal|Matt|Mark|Luk|Joh|Apg|Rom|Gal|Ef|Fil|Kol|Tit|Filem|Heb|Jak|Jud|Upp)`;

const referencePatterns = {
  en: new RegExp(`\\b${englishBookPattern}\\.?\\s*\\d+[: ]\\d+`, 'i'),
  sv: new RegExp(`\\b${swedishBookPattern}\\.?\\s*\\d+[: ]\\d+`, 'i'),
};

const swedishReferenceCapture = new RegExp(
  `\\b(${swedishBookPattern}\\.?\\s*\\d+[: ]\\d+(?:[-–,]\\s*\\d+)*)`,
  'i',
);

function plainText(html) {
  return String(html ?? '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;|&#160;|&#xa0;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parentheticalIsLinked(html, whole, offset) {
  if (/<a\b/i.test(whole)) return true;
  const before = html.slice(0, offset);
  return before.lastIndexOf('<a') > before.lastIndexOf('</a>');
}

export function findUnlinkedInlineScriptureReferences(nodes, language) {
  const referencePattern = referencePatterns[language];
  if (!referencePattern) throw new Error(`Unsupported scripture-reference language: ${language}`);
  const issues = [];

  for (const node of nodes) {
    const fields = [
      ['text', node.textHtml ?? ''],
      ...(node.headings ?? []).map((heading, index) => [`heading:${index}`, heading.html ?? heading.text ?? '']),
    ];
    for (const [field, html] of fields) {
      const unlinkedText = plainText(
        String(html).replace(/<a\b[^>]*>[\s\S]*?<\/a>/gi, ' '),
      );
      const matches = unlinkedText.matchAll(new RegExp(referencePattern.source, 'gi'));
      for (const match of matches) {
        issues.push({ nodeId: node.id, field, text: match[0] });
      }
    }
  }

  return issues;
}

export function assertNoUnlinkedInlineScriptureReferences(nodes, language) {
  const issues = findUnlinkedInlineScriptureReferences(nodes, language);
  if (issues.length > 0) {
    throw new Error(
      `Unlinked inline Scripture references (${language}): ${issues.map((issue) => `§${issue.nodeId} ${issue.field} ${issue.text}`).join('; ')}`,
    );
  }
  return issues;
}

export function linkSwedishInlineScriptureReferences(html) {
  const source = String(html ?? '');
  return source.replace(/\(([^()]{1,500})\)/g, (whole, _content, offset) => {
    if (parentheticalIsLinked(source, whole, offset)) return whole;
    const reference = plainText(whole).match(swedishReferenceCapture)?.[1];
    if (!reference) return whole;

    const normalizedReference = reference
      .replace(/^([1-5])(?=[A-Za-zÅÄÖåäö])/u, '$1 ')
      .replace(/\s+/g, ' ')
      .trim();
    const href = `https://www.bibeln.se/las/2k/#q=${encodeURIComponent(normalizedReference)}`;
    return `<a class="inline-citation" href="${href}" target="_blank" rel="noreferrer">${whole}</a>`;
  });
}
