import type { ExternalSource } from '../types';

type ReaderLanguage = 'en' | 'sv';

type BibleBook = {
  aliases: string[];
  abbreviation: string;
  en: string;
  sv: string;
};

const bibleBooks: BibleBook[] = [
  { aliases: ['gen', 'gn', 'genesis', '1 mos'], abbreviation: 'Gen', en: 'The Book of Genesis', sv: 'Första Moseboken' },
  { aliases: ['ex', 'exo', 'exod', 'exodus', '2 mos'], abbreviation: 'Ex', en: 'The Book of Exodus', sv: 'Andra Moseboken' },
  { aliases: ['lev', 'leviticus', '3 mos'], abbreviation: 'Lev', en: 'The Book of Leviticus', sv: 'Tredje Moseboken' },
  { aliases: ['num', 'nm', 'numbers', '4 mos'], abbreviation: 'Num', en: 'The Book of Numbers', sv: 'Fjärde Moseboken' },
  { aliases: ['deut', 'dt', 'deuteronomy', '5 mos'], abbreviation: 'Deut', en: 'The Book of Deuteronomy', sv: 'Femte Moseboken' },
  { aliases: ['josh', 'jos', 'joshua'], abbreviation: 'Josh', en: 'The Book of Joshua', sv: 'Josuas bok' },
  { aliases: ['judg', 'jdg', 'judges', 'dom'], abbreviation: 'Judg', en: 'The Book of Judges', sv: 'Domarboken' },
  { aliases: ['ruth', 'ru', 'rut'], abbreviation: 'Ruth', en: 'The Book of Ruth', sv: 'Ruts bok' },
  { aliases: ['1 sam', '1sam', 'i sam', '1 samuel', '1samuel'], abbreviation: '1 Sam', en: 'The First Book of Samuel', sv: 'Första Samuelsboken' },
  { aliases: ['2 sam', '2sam', 'ii sam', '2 samuel', '2samuel'], abbreviation: '2 Sam', en: 'The Second Book of Samuel', sv: 'Andra Samuelsboken' },
  { aliases: ['1 kgs', '1kgs', '1 kings', 'i kgs', 'i kings', '1 kung'], abbreviation: '1 Kgs', en: 'The First Book of Kings', sv: 'Första Kungaboken' },
  { aliases: ['2 kgs', '2kgs', '2 kings', 'ii kgs', 'ii kings', '2 kung'], abbreviation: '2 Kgs', en: 'The Second Book of Kings', sv: 'Andra Kungaboken' },
  { aliases: ['1 chr', '1chr', '1 chronicles', 'i chr', 'i chronicles', '1 krön'], abbreviation: '1 Chr', en: 'The First Book of Chronicles', sv: 'Första Krönikeboken' },
  { aliases: ['2 chr', '2chr', '2 chronicles', 'ii chr', 'ii chronicles', '2 krön'], abbreviation: '2 Chr', en: 'The Second Book of Chronicles', sv: 'Andra Krönikeboken' },
  { aliases: ['ezra', 'ezr', 'esr'], abbreviation: 'Ezra', en: 'The Book of Ezra', sv: 'Esras bok' },
  { aliases: ['neh', 'nehemiah'], abbreviation: 'Neh', en: 'The Book of Nehemiah', sv: 'Nehemjas bok' },
  { aliases: ['tob', 'tobit'], abbreviation: 'Tob', en: 'The Book of Tobit', sv: 'Tobits bok' },
  { aliases: ['jdt', 'judith', 'judit'], abbreviation: 'Jdt', en: 'The Book of Judith', sv: 'Judits bok' },
  { aliases: ['est', 'esth', 'esther'], abbreviation: 'Est', en: 'The Book of Esther', sv: 'Esters bok' },
  { aliases: ['1 macc', '1macc', '1 maccabees', 'i macc', '1 mack'], abbreviation: '1 Macc', en: 'The First Book of Maccabees', sv: 'Första Mackabeerboken' },
  { aliases: ['2 macc', '2macc', '2 maccabees', 'ii macc', '2 mack'], abbreviation: '2 Macc', en: 'The Second Book of Maccabees', sv: 'Andra Mackabeerboken' },
  { aliases: ['job'], abbreviation: 'Job', en: 'The Book of Job', sv: 'Jobs bok' },
  { aliases: ['ps', 'pss', 'psalm', 'psalms'], abbreviation: 'Ps', en: 'The Book of Psalms', sv: 'Psaltaren' },
  { aliases: ['prov', 'prv', 'proverbs', 'ords'], abbreviation: 'Prov', en: 'The Book of Proverbs', sv: 'Ordspråksboken' },
  { aliases: ['eccl', 'ecc', 'ecclesiastes', 'pred'], abbreviation: 'Eccl', en: 'The Book of Ecclesiastes', sv: 'Predikaren' },
  { aliases: ['song', 'song of songs', 'song of solomon', 'cant', 'canticle', 'höga', 'höga v'], abbreviation: 'Song', en: 'The Song of Songs', sv: 'Höga visan' },
  { aliases: ['wis', 'wisdom', 'vish', 'vis'], abbreviation: 'Wis', en: 'The Book of Wisdom', sv: 'Vishetens bok' },
  { aliases: ['sir', 'sirach', 'ecclus', 'syr'], abbreviation: 'Sir', en: 'The Book of Sirach', sv: 'Jesus Syraks vishet' },
  { aliases: ['isa', 'is', 'isaiah', 'jes'], abbreviation: 'Isa', en: 'The Book of Isaiah', sv: 'Jesajas bok' },
  { aliases: ['jer', 'jeremiah'], abbreviation: 'Jer', en: 'The Book of Jeremiah', sv: 'Jeremias bok' },
  { aliases: ['lam', 'lamentations', 'klag'], abbreviation: 'Lam', en: 'The Book of Lamentations', sv: 'Klagovisorna' },
  { aliases: ['bar', 'baruch'], abbreviation: 'Bar', en: 'The Book of Baruch', sv: 'Baruks bok' },
  { aliases: ['ezek', 'ezk', 'ezekiel', 'hes'], abbreviation: 'Ezek', en: 'The Book of Ezekiel', sv: 'Hesekiels bok' },
  { aliases: ['dan', 'dn', 'daniel'], abbreviation: 'Dan', en: 'The Book of Daniel', sv: 'Daniels bok' },
  { aliases: ['hos', 'hosea'], abbreviation: 'Hos', en: 'The Book of Hosea', sv: 'Hoseas bok' },
  { aliases: ['joel', 'jl'], abbreviation: 'Joel', en: 'The Book of Joel', sv: 'Joels bok' },
  { aliases: ['amos', 'am'], abbreviation: 'Am', en: 'The Book of Amos', sv: 'Amos bok' },
  { aliases: ['obad', 'ob', 'obadiah'], abbreviation: 'Obad', en: 'The Book of Obadiah', sv: 'Obadjas bok' },
  { aliases: ['jon', 'jonah', 'jona'], abbreviation: 'Jon', en: 'The Book of Jonah', sv: 'Jonas bok' },
  { aliases: ['mic', 'micah', 'mik'], abbreviation: 'Mic', en: 'The Book of Micah', sv: 'Mikas bok' },
  { aliases: ['nah', 'nahum'], abbreviation: 'Nah', en: 'The Book of Nahum', sv: 'Nahums bok' },
  { aliases: ['hab', 'habakkuk'], abbreviation: 'Hab', en: 'The Book of Habakkuk', sv: 'Habackuks bok' },
  { aliases: ['zeph', 'zep', 'zephaniah', 'sef'], abbreviation: 'Zeph', en: 'The Book of Zephaniah', sv: 'Sefanjas bok' },
  { aliases: ['hag', 'haggai', 'hagg'], abbreviation: 'Hag', en: 'The Book of Haggai', sv: 'Haggais bok' },
  { aliases: ['zech', 'zec', 'zechariah', 'sak'], abbreviation: 'Zech', en: 'The Book of Zechariah', sv: 'Sakarjas bok' },
  { aliases: ['mal', 'malachi'], abbreviation: 'Mal', en: 'The Book of Malachi', sv: 'Malakis bok' },
  { aliases: ['mt', 'matt', 'matthew'], abbreviation: 'Mt', en: 'The Gospel of Matthew', sv: 'Matteusevangeliet' },
  { aliases: ['mk', 'mark'], abbreviation: 'Mk', en: 'The Gospel of Mark', sv: 'Markusevangeliet' },
  { aliases: ['lk', 'luke', 'luk'], abbreviation: 'Lk', en: 'The Gospel of Luke', sv: 'Lukasevangeliet' },
  { aliases: ['jn', 'john', 'joh'], abbreviation: 'Jn', en: 'The Gospel of John', sv: 'Johannesevangeliet' },
  { aliases: ['acts', 'act', 'apg'], abbreviation: 'Acts', en: 'The Acts of the Apostles', sv: 'Apostlagärningarna' },
  { aliases: ['rom', 'romans'], abbreviation: 'Rom', en: 'The Letter of Saint Paul to the Romans', sv: 'Romarbrevet' },
  { aliases: ['1 cor', '1cor', 'i cor', '1 corinthians', '1 kor'], abbreviation: '1 Cor', en: 'The First Letter of Saint Paul to the Corinthians', sv: 'Första Korinthierbrevet' },
  { aliases: ['2 cor', '2cor', 'ii cor', '2 corinthians', '2 kor'], abbreviation: '2 Cor', en: 'The Second Letter of Saint Paul to the Corinthians', sv: 'Andra Korinthierbrevet' },
  { aliases: ['gal', 'galatians'], abbreviation: 'Gal', en: 'The Letter of Saint Paul to the Galatians', sv: 'Galaterbrevet' },
  { aliases: ['eph', 'ephesians', 'ef'], abbreviation: 'Eph', en: 'The Letter of Saint Paul to the Ephesians', sv: 'Efesierbrevet' },
  { aliases: ['phil', 'php', 'philippians', 'fil'], abbreviation: 'Phil', en: 'The Letter of Saint Paul to the Philippians', sv: 'Filipperbrevet' },
  { aliases: ['col', 'colossians', 'kol'], abbreviation: 'Col', en: 'The Letter of Saint Paul to the Colossians', sv: 'Kolosserbrevet' },
  { aliases: ['1 thess', '1thess', '1 thes', '1thes', 'i thess', '1 thessalonians'], abbreviation: '1 Thess', en: 'The First Letter of Saint Paul to the Thessalonians', sv: 'Första Thessalonikerbrevet' },
  { aliases: ['2 thess', '2thess', '2 thes', '2thes', 'ii thess', '2 thessalonians'], abbreviation: '2 Thess', en: 'The Second Letter of Saint Paul to the Thessalonians', sv: 'Andra Thessalonikerbrevet' },
  { aliases: ['1 tim', '1tim', 'i tim', '1 timothy'], abbreviation: '1 Tim', en: 'The First Letter of Saint Paul to Timothy', sv: 'Första Timotheosbrevet' },
  { aliases: ['2 tim', '2tim', 'ii tim', '2 timothy'], abbreviation: '2 Tim', en: 'The Second Letter of Saint Paul to Timothy', sv: 'Andra Timotheosbrevet' },
  { aliases: ['titus', 'tit'], abbreviation: 'Titus', en: 'The Letter of Saint Paul to Titus', sv: 'Titusbrevet' },
  { aliases: ['phlm', 'philem', 'philemon', 'filem'], abbreviation: 'Philem', en: 'The Letter of Saint Paul to Philemon', sv: 'Filemonbrevet' },
  { aliases: ['heb', 'hebrews'], abbreviation: 'Heb', en: 'The Letter to the Hebrews', sv: 'Hebreerbrevet' },
  { aliases: ['jas', 'james', 'jak'], abbreviation: 'Jas', en: 'The Letter of James', sv: 'Jakobsbrevet' },
  { aliases: ['1 pet', '1pet', 'i pet', '1 peter'], abbreviation: '1 Pet', en: 'The First Letter of Peter', sv: 'Första Petrusbrevet' },
  { aliases: ['2 pet', '2pet', 'ii pet', '2 peter'], abbreviation: '2 Pet', en: 'The Second Letter of Peter', sv: 'Andra Petrusbrevet' },
  { aliases: ['1 jn', '1jn', 'i jn', '1 john', '1 joh'], abbreviation: '1 Jn', en: 'The First Letter of John', sv: 'Första Johannesbrevet' },
  { aliases: ['2 jn', '2jn', 'ii jn', '2 john', '2 joh'], abbreviation: '2 Jn', en: 'The Second Letter of John', sv: 'Andra Johannesbrevet' },
  { aliases: ['3 jn', '3jn', 'iii jn', '3 john', '3 joh'], abbreviation: '3 Jn', en: 'The Third Letter of John', sv: 'Tredje Johannesbrevet' },
  { aliases: ['jude', 'jud'], abbreviation: 'Jude', en: 'The Letter of Jude', sv: 'Judasbrevet' },
  { aliases: ['rev', 'apoc', 'revelation', 'upp'], abbreviation: 'Rev', en: 'The Book of Revelation', sv: 'Uppenbarelseboken' },
];

const bibleAliases = bibleBooks
  .flatMap((book) => book.aliases.map((alias) => ({ alias, book })))
  .sort((a, b) => b.alias.length - a.alias.length);

const documentAbbreviations: Record<string, string> = {
  aa: 'AA', ag: 'AG', ca: 'CA', cceo: 'CCEO', cd: 'CD', cic: 'CIC', cl: 'CL', ct: 'CT', df: 'DF',
  dc: 'DC', dev: 'DeV', dh: 'DH', dm: 'DM', dv: 'DV', en: 'EN', fc: 'FC', ge: 'GE',
  girm: 'GIRM', gs: 'GS', hv: 'HV', im: 'IM', immd: 'ID', indd: 'Ind. doctr.', le: 'LE',
  lg: 'LG', lp: 'LP', mc: 'MC', md: 'MD', mf: 'MF', mm: 'MM', na: 'NA', ot: 'OT',
  pc: 'PC', po: 'PO', pp: 'PP', pt: 'PT', qp: 'QP', rh: 'RH', rmat: 'RMat',
  rmiss: 'RMiss', rp: 'RP', sc: 'SC', srs: 'SRS', ur: 'UR', vc: 'VC', vqa: 'VQA',
  cpg: 'CPG',
  'aquinas-compendium': 'Comp. theol.', 'aquinas-opusculum-57': 'Opusc. 57',
  'aquinas-creed': 'Symb.', 'aquinas-de-malo': 'De Malo', 'aquinas-hebrews': 'Hebr.',
  'aquinas-psalms': 'Expos. in Ps.', 'aquinas-scg': 'SCG', 'aquinas-sentences': 'Sent.',
  'aquinas-sth': 'STh', 'aquinas-ten-commandments': 'Dec. præc.',
};

const documentTitles: Record<string, string> = {
  aa: 'Apostolicam actuositatem', ag: 'Ad gentes', ca: 'Centesimus annus',
  cceo: 'Code of Canons of the Eastern Churches', cd: 'Christus Dominus', cic: 'Code of Canon Law',
  cl: 'Christifideles laici', ct: 'Catechesi tradendae', df: 'Dei Filius',
  cpg: 'Credo of the People of God', dc: 'Dominicae cenae', dev: 'Dominum et vivificantem',
  dh: 'Dignitatis humanae', dm: 'Dives in misericordia', dv: 'Dei verbum', en: 'Evangelii nuntiandi',
  fc: 'Familiaris consortio', ge: 'Gravissimum educationis',
  girm: 'General Instruction of the Roman Missal', gs: 'Gaudium et spes',
  hv: 'Humanae vitae', im: 'Inter mirifica', immd: 'Immortale Dei',
  indd: 'Indulgentiarum doctrina', le: 'Laborem exercens', lg: 'Lumen gentium',
  lp: 'Libertas praestantissimum', mc: 'Marialis cultus', md: 'Mulieris dignitatem',
  mf: 'Mysterium fidei', mm: 'Mater et Magistra', na: 'Nostra aetate', ot: 'Optatam totius',
  pc: 'Perfectae caritatis', po: 'Presbyterorum ordinis', pp: 'Populorum progressio',
  pt: 'Pacem in terris', qp: 'Quas primas', rh: 'Redemptor hominis',
  rmat: 'Redemptoris Mater', rmiss: 'Redemptoris missio', rp: 'Reconciliatio et paenitentia',
  sc: 'Sacrosanctum Concilium', srs: 'Sollicitudo rei socialis', ur: 'Unitatis redintegratio',
  vc: 'Vita consecrata', vqa: 'Vicesimus quintus annus',
};

function normalizedReference(value: string) {
  return value.replace(/\u00a0/g, ' ').replace(/^([1-3])(?=[A-Za-zÅÄÖåäö])/u, '$1 ').replace(/\s+/g, ' ').trim();
}

function bibleBookForReference(reference: string) {
  const normalized = normalizedReference(reference).toLocaleLowerCase('en');
  return bibleAliases.find(({ alias }) => normalized === alias || normalized.startsWith(`${alias} `))?.book;
}

export function abbreviateScriptureReference(reference: string) {
  const normalized = normalizedReference(reference);
  const normalizedLower = normalized.toLocaleLowerCase('en');
  const match = bibleAliases.find(({ alias }) => normalizedLower === alias || normalizedLower.startsWith(`${alias} `));
  return match ? `${match.book.abbreviation}${normalized.slice(match.alias.length)}` : normalized;
}

export function scriptureWorkTitle(reference: string, language: ReaderLanguage) {
  return bibleBookForReference(reference)?.[language] ?? '';
}

function documentKey(sourceId?: string | null) {
  return sourceId?.match(/^document:([^:]+):?/)?.[1] ?? '';
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function documentCitation(citation: string, sourceId?: string | null, title?: string) {
  const key = documentKey(sourceId);
  const shortCitation = key.startsWith('aquinas-')
    ? citation.replace(/^St\. Thomas Aquinas(?: \(attr\.\))?[.,]\s*/i, '')
    : citation;
  const abbreviation = documentAbbreviations[key];
  if (!abbreviation) return shortCitation;

  const abbreviationMatch = shortCitation.match(new RegExp(`(?:^|\\b)${escapeRegExp(abbreviation)}(?=\\s|,|\\d|$)`, 'i'));
  if (abbreviationMatch?.index !== undefined) return shortCitation.slice(abbreviationMatch.index);

  if (title) {
    const titleMatch = shortCitation.match(new RegExp(escapeRegExp(title), 'i'));
    if (titleMatch?.index !== undefined) {
      return `${abbreviation}${shortCitation.slice(titleMatch.index + titleMatch[0].length)}`;
    }
  }

  return shortCitation;
}

export function abbreviateLinkedCitation(label: string, kind: ExternalSource['kind'], sourceId?: string | null) {
  return kind === 'scripture'
    ? abbreviateScriptureReference(label)
    : documentCitation(label, sourceId, documentTitles[documentKey(sourceId)]);
}

export function sourceCitation(source: ExternalSource) {
  return source.kind === 'scripture'
    ? abbreviateScriptureReference(source.citation)
    : documentCitation(source.citation, source.id, source.title);
}

const lowercaseTitleWords = new Set(['a', 'an', 'and', 'at', 'de', 'et', 'in', 'of', 'on', 'the', 'to']);

function titleCaseWork(value: string) {
  return value.split(/\s+/).map((word, index) => {
    if (index > 0 && lowercaseTitleWords.has(word.toLocaleLowerCase('en'))) return word.toLocaleLowerCase('en');
    return word.replace(/^([\p{L}])/u, (letter) => letter.toLocaleUpperCase('en'));
  }).join(' ');
}

export function sourceWorkTitle(source: ExternalSource, language: ReaderLanguage, reference = source.citation) {
  return source.kind === 'scripture'
    ? scriptureWorkTitle(reference, language)
    : titleCaseWork(source.title);
}
