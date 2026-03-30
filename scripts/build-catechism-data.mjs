import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import * as cheerio from 'cheerio';
import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
} from 'd3-force';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const outputPath = path.join(rootDir, 'public', 'data', 'catechism-graph.json');
const languageOutputDir = path.join(rootDir, 'public', 'data', 'languages');
const cacheDir = path.join(rootDir, 'tmp', 'build-cache');
const vaticanSourceDir = path.join(rootDir, 'data', 'source', 'vatican');

const apiUrl = 'https://www.catholiccrossreference.online/catechism/';
const sectionQueries = ['s0', 's1', 's2', 's3', 's4'];
const scripturePattern =
  /^(?:cf\.\s+|see\s+|see also\s+)?(?:[1-3i]{0,3}\s*)?(?:gen|ex|lev|num|deut|josh|judg|ruth|sam|kgs|chr|ezra|neh|tob|jdt|esth|macc|job|ps|pss|prov|eccl|song|wis|sir|isa|jer|lam|bar|ezek|dan|hos|joel|amos|obad|jon|mic|nah|hab|zeph|hag|zech|mal|mt|mk|lk|jn|acts|rom|cor|gal|eph|phil|col|thess|tim|titus|phlm|heb|jas|pet|jude|rev)\b/i;
const bidiControlPattern = /[\u200e\u200f\u202a-\u202e\u2066-\u2069]/g;

const languageConfigs = [
  {
    code: 'fr',
    label: 'Francais',
    type: 'html',
    corpus: 'https://www.vatican.va/archive/FRA0013/_INDEX.HTM',
    indexUrl: 'https://www.vatican.va/archive/FRA0013/_INDEX.HTM',
    crawlPrefix: '/archive/FRA0013/',
    pagePattern: /\/__P[^/]+\.HTM$/i,
  },
  {
    code: 'de',
    label: 'Deutsch',
    type: 'html',
    corpus: 'https://www.vatican.va/archive/DEU0035/_INDEX.HTM',
    indexUrl: 'https://www.vatican.va/archive/DEU0035/_INDEX.HTM',
    crawlPrefix: '/archive/DEU0035/',
    pagePattern: /\/__P[^/]+\.HTM$/i,
  },
  {
    code: 'it',
    label: 'Italiano',
    type: 'html',
    corpus: 'https://www.vatican.va/archive/catechism_it/index_it.htm',
    indexUrl: 'https://www.vatican.va/archive/catechism_it/index_it.htm',
    crawlPrefix: '/archive/catechism_it/',
    pagePattern: /\/[^/]+_it\.htm$/i,
  },
  {
    code: 'la',
    label: 'Latina',
    type: 'html',
    corpus: 'https://www.vatican.va/archive/catechism_lt/index_lt.htm',
    indexUrl: 'https://www.vatican.va/archive/catechism_lt/index_lt.htm',
    crawlPrefix: '/archive/catechism_lt/',
    pagePattern: /\/[^/]+_lt\.htm$/i,
  },
  {
    code: 'es',
    label: 'Espanol',
    type: 'html',
    corpus: 'https://www.vatican.va/archive/catechism_sp/index_sp.html',
    indexUrl: 'https://www.vatican.va/archive/catechism_sp/index_sp.html',
    crawlPrefix: '/archive/catechism_sp/',
    pagePattern: /\/[^/]+_sp\.html$/i,
  },
  {
    code: 'pt',
    label: 'Portugues',
    type: 'html',
    corpus: 'https://www.vatican.va/archive/cathechism_po/index_new/prima-pagina-cic_po.html',
    indexUrl: 'https://www.vatican.va/archive/cathechism_po/index_new/prima-pagina-cic_po.html',
    crawlPrefix: '/archive/cathechism_po/',
    pagePattern: /\/[^/]+_po\.html$/i,
  },
  {
    code: 'mg',
    label: 'Malagasy',
    type: 'html',
    corpus: 'https://www.vatican.va/archive/ccc_madagascar/documents/ccc_index_mg.html',
    indexUrl: 'https://www.vatican.va/archive/ccc_madagascar/documents/ccc_index_mg.html',
    crawlPrefix: '/archive/ccc_madagascar/',
    pagePattern: /\/[^/]+_mg\.html$/i,
  },
  {
    code: 'zh',
    label: 'Traditional Chinese',
    type: 'pdf',
    corpus: 'https://www.vatican.va/chinese/ccc_zh.htm',
    indexUrl: 'https://www.vatican.va/chinese/ccc_zh.htm',
    crawlPrefix: '/chinese/',
    pdfPattern: /\/chinese\/ccc\/[^/]+_ccc_zh\.pdf$/i,
  },
  {
    code: 'ar',
    label: 'Arabic',
    type: 'pdf',
    corpus: 'https://www.vatican.va/archive/catechism_ar/index_ar.htm',
    indexUrl: 'https://www.vatican.va/archive/catechism_ar/index_ar.htm',
    crawlPrefix: '/archive/catechism_ar/',
    pdfPattern: /\/archive\/catechism_ar\/[^/]+\.pdf$/i,
  },
];

const bibleTranslation = {
  id: 'web',
  name: 'World English Bible',
  language: 'en',
  sourceLabel: 'Bible API / World English Bible',
};

const vaticanBibleIndexUrl = 'https://www.vatican.va/archive/ENG0839/_INDEX.HTM';
const vaticanBibleBaseUrl = 'https://www.vatican.va/archive/ENG0839/';

const bibleBookAliases = new Map(
  Object.entries({
    GEN: ['gen', 'gn', 'genesis'],
    EXO: ['ex', 'exo', 'exod', 'exodus'],
    LEV: ['lev', 'leviticus'],
    NUM: ['num', 'nm', 'numbers'],
    DEU: ['deut', 'dt', 'deuteronomy'],
    JOS: ['josh', 'jos', 'joshua'],
    JDG: ['judg', 'jdg', 'judges'],
    RUT: ['ruth', 'ru'],
    '1SA': ['1 sam', '1sam', 'i sam', '1 samuel', '1samuel'],
    '2SA': ['2 sam', '2sam', 'ii sam', '2 samuel', '2samuel'],
    '1KI': ['1 kgs', '1kgs', '1 kings', 'i kgs', 'i kings'],
    '2KI': ['2 kgs', '2kgs', '2 kings', 'ii kgs', 'ii kings'],
    '1CH': ['1 chr', '1chr', '1 chronicles', 'i chr', 'i chronicles'],
    '2CH': ['2 chr', '2chr', '2 chronicles', 'ii chr', 'ii chronicles'],
    EZR: ['ezra', 'ezr'],
    NEH: ['neh', 'nehemiah'],
    TOB: ['tob', 'tobit'],
    JDT: ['jdt', 'judith'],
    EST: ['est', 'esth', 'esther'],
    '1MA': ['1 macc', '1macc', '1 maccabees', 'i macc'],
    '2MA': ['2 macc', '2macc', '2 maccabees', 'ii macc'],
    JOB: ['job'],
    PSA: ['ps', 'pss', 'psalm', 'psalms'],
    PRO: ['prov', 'prv', 'proverbs'],
    ECC: ['eccl', 'ecc', 'ecclesiastes'],
    SNG: ['song', 'song of songs', 'song of solomon', 'cant', 'canticle'],
    WIS: ['wis', 'wisdom'],
    SIR: ['sir', 'sirach', 'ecclus'],
    ISA: ['isa', 'is', 'isaiah'],
    JER: ['jer', 'jeremiah'],
    LAM: ['lam', 'lamentations'],
    BAR: ['bar', 'baruch'],
    EZK: ['ezek', 'ezk', 'ezekiel'],
    DAN: ['dan', 'dn', 'daniel'],
    HOS: ['hos', 'hosea'],
    JOL: ['joel', 'jl'],
    AMO: ['amos', 'am'],
    OBA: ['obad', 'ob', 'obadiah'],
    JON: ['jon', 'jonah'],
    MIC: ['mic', 'micah'],
    NAM: ['nah', 'nahum'],
    HAB: ['hab', 'habakkuk'],
    ZEP: ['zeph', 'zep', 'zephaniah'],
    HAG: ['hag', 'haggai'],
    ZEC: ['zech', 'zec', 'zechariah'],
    MAL: ['mal', 'malachi'],
    MAT: ['mt', 'matt', 'matthew'],
    MRK: ['mk', 'mark'],
    LUK: ['lk', 'luke'],
    JHN: ['jn', 'john'],
    ACT: ['acts', 'act'],
    ROM: ['rom', 'romans'],
    '1CO': ['1 cor', '1cor', 'i cor', '1 corinthians'],
    '2CO': ['2 cor', '2cor', 'ii cor', '2 corinthians'],
    GAL: ['gal', 'galatians'],
    EPH: ['eph', 'ephesians'],
    PHP: ['phil', 'php', 'philippians'],
    COL: ['col', 'colossians'],
    '1TH': ['1 thess', '1thess', '1 thes', '1thes', 'i thess', '1 thessalonians'],
    '2TH': ['2 thess', '2thess', '2 thes', '2thes', 'ii thess', '2 thessalonians'],
    '1TI': ['1 tim', '1tim', 'i tim', '1 timothy'],
    '2TI': ['2 tim', '2tim', 'ii tim', '2 timothy'],
    TIT: ['titus', 'tit'],
    PHM: ['phlm', 'philem', 'philemon'],
    HEB: ['heb', 'hebrews'],
    JAS: ['jas', 'james'],
    '1PE': ['1 pet', '1pet', 'i pet', '1 peter'],
    '2PE': ['2 pet', '2pet', 'ii pet', '2 peter'],
    '1JN': ['1 jn', '1jn', 'i jn', '1 john'],
    '2JN': ['2 jn', '2jn', 'ii jn', '2 john'],
    '3JN': ['3 jn', '3jn', 'iii jn', '3 john'],
    JUD: ['jude'],
    REV: ['rev', 'apoc', 'revelation'],
  }).flatMap(([id, aliases]) => aliases.map((alias) => [alias, id])),
);

const bibleBookNames = {
  GEN: 'Genesis',
  EXO: 'Exodus',
  LEV: 'Leviticus',
  NUM: 'Numbers',
  DEU: 'Deuteronomy',
  JOS: 'Joshua',
  JDG: 'Judges',
  RUT: 'Ruth',
  '1SA': '1 Samuel',
  '2SA': '2 Samuel',
  '1KI': '1 Kings',
  '2KI': '2 Kings',
  '1CH': '1 Chronicles',
  '2CH': '2 Chronicles',
  EZR: 'Ezra',
  NEH: 'Nehemiah',
  TOB: 'Tobit',
  JDT: 'Judith',
  EST: 'Esther',
  '1MA': '1 Maccabees',
  '2MA': '2 Maccabees',
  JOB: 'Job',
  PSA: 'Psalms',
  PRO: 'Proverbs',
  ECC: 'Ecclesiastes',
  SNG: 'Song of Solomon',
  WIS: 'Wisdom',
  SIR: 'Sirach',
  ISA: 'Isaiah',
  JER: 'Jeremiah',
  LAM: 'Lamentations',
  BAR: 'Baruch',
  EZK: 'Ezekiel',
  DAN: 'Daniel',
  HOS: 'Hosea',
  JOL: 'Joel',
  AMO: 'Amos',
  OBA: 'Obadiah',
  JON: 'Jonah',
  MIC: 'Micah',
  NAM: 'Nahum',
  HAB: 'Habakkuk',
  ZEP: 'Zephaniah',
  HAG: 'Haggai',
  ZEC: 'Zechariah',
  MAL: 'Malachi',
  MAT: 'Matthew',
  MRK: 'Mark',
  LUK: 'Luke',
  JHN: 'John',
  ACT: 'Acts',
  ROM: 'Romans',
  '1CO': '1 Corinthians',
  '2CO': '2 Corinthians',
  GAL: 'Galatians',
  EPH: 'Ephesians',
  PHP: 'Philippians',
  COL: 'Colossians',
  '1TH': '1 Thessalonians',
  '2TH': '2 Thessalonians',
  '1TI': '1 Timothy',
  '2TI': '2 Timothy',
  TIT: 'Titus',
  PHM: 'Philemon',
  HEB: 'Hebrews',
  JAS: 'James',
  '1PE': '1 Peter',
  '2PE': '2 Peter',
  '1JN': '1 John',
  '2JN': '2 John',
  '3JN': '3 John',
  JUD: 'Jude',
  REV: 'Revelation',
};

const vaticanBibleBookTitles = {
  GEN: ['Genesis'],
  EXO: ['Exodus'],
  LEV: ['Leviticus'],
  NUM: ['Numbers'],
  DEU: ['Deuteronomy'],
  JOS: ['Joshua'],
  JDG: ['Judges'],
  RUT: ['Ruth'],
  '1SA': ['1 Samuel'],
  '2SA': ['2 Samuel'],
  '1KI': ['1 Kings'],
  '2KI': ['2 Kings'],
  '1CH': ['1 Chronicles'],
  '2CH': ['2 Chronicles'],
  EZR: ['Ezra'],
  NEH: ['Nehemiah'],
  TOB: ['Tobit'],
  JDT: ['Judith'],
  EST: ['Esther'],
  '1MA': ['1 Maccabees'],
  '2MA': ['2 Maccabees'],
  JOB: ['Job'],
  PSA: ['Psalms'],
  PRO: ['Proverbs'],
  ECC: ['Ecclesiastes'],
  SNG: ['The Song of Songs', 'Song of Songs'],
  WIS: ['The Book of Wisdom', 'Wisdom'],
  SIR: ['Sirach'],
  ISA: ['Isaiah'],
  JER: ['Jeremiah'],
  LAM: ['Lamentations'],
  BAR: ['Baruch'],
  EZK: ['Ezekiel'],
  DAN: ['Daniel'],
  HOS: ['Hosea'],
  JOL: ['Joel'],
  AMO: ['Amos'],
  OBA: ['Obadiah'],
  JON: ['Jonah'],
  MIC: ['Micah'],
  NAM: ['Nahum'],
  HAB: ['Habakkuk'],
  ZEP: ['Zephaniah'],
  HAG: ['Haggai'],
  ZEC: ['Zechariah'],
  MAL: ['Malachi'],
  MAT: ['Matthew'],
  MRK: ['Mark'],
  LUK: ['Luke'],
  JHN: ['John'],
  ACT: ['Acts'],
  ROM: ['Romans'],
  '1CO': ['1 Corinthians'],
  '2CO': ['2 Corinthians'],
  GAL: ['Galatians'],
  EPH: ['Ephesians'],
  PHP: ['Philippians'],
  COL: ['Colossians'],
  '1TH': ['1 Thessalonians'],
  '2TH': ['2 Thessalonians'],
  '1TI': ['1 Timothy'],
  '2TI': ['2 Timothy'],
  TIT: ['Titus'],
  PHM: ['Philemon'],
  HEB: ['Hebrews'],
  JAS: ['James'],
  '1PE': ['1 Peter'],
  '2PE': ['2 Peter'],
  '1JN': ['1 John'],
  '2JN': ['2 John'],
  '3JN': ['3 John'],
  JUD: ['Jude'],
  REV: ['Revelation'],
};

const singleChapterBookIds = new Set(['OBA', 'PHM', '2JN', '3JN', 'JUD']);

const documentCatalog = {
  LG: {
    id: 'LG',
    title: 'Lumen gentium',
    url: 'https://www.vatican.va/archive/hist_councils/ii_vatican_council/documents/vat-ii_const_19641121_lumen-gentium_en.html',
    parser: 'legacy',
  },
  GS: {
    id: 'GS',
    title: 'Gaudium et spes',
    url: 'https://www.vatican.va/archive/hist_councils/ii_vatican_council/documents/vat-ii_const_19651207_gaudium-et-spes_en.html',
    parser: 'legacy',
  },
  DV: {
    id: 'DV',
    title: 'Dei verbum',
    url: 'https://www.vatican.va/archive/hist_councils/ii_vatican_council/documents/vat-ii_const_19651118_dei-verbum_en.html',
    parser: 'legacy',
  },
  SC: {
    id: 'SC',
    title: 'Sacrosanctum Concilium',
    url: 'https://www.vatican.va/archive/hist_councils/ii_vatican_council/documents/vat-ii_const_19631204_sacrosanctum-concilium_en.html',
    parser: 'legacy',
  },
  AG: {
    id: 'AG',
    title: 'Ad gentes',
    url: 'https://www.vatican.va/archive/hist_councils/ii_vatican_council/documents/vat-ii_decree_19651207_ad-gentes_en.html',
    parser: 'legacy',
  },
  UR: {
    id: 'UR',
    title: 'Unitatis redintegratio',
    url: 'https://www.vatican.va/archive/hist_councils/ii_vatican_council/documents/vat-ii_decree_19641121_unitatis-redintegratio_en.html',
    parser: 'legacy',
  },
  PO: {
    id: 'PO',
    title: 'Presbyterorum ordinis',
    url: 'https://www.vatican.va/archive/hist_councils/ii_vatican_council/documents/vat-ii_decree_19651207_presbyterorum-ordinis_en.html',
    parser: 'legacy',
  },
  DH: {
    id: 'DH',
    title: 'Dignitatis humanae',
    url: 'https://www.vatican.va/archive/hist_councils/ii_vatican_council/documents/vat-ii_decl_19651207_dignitatis-humanae_en.html',
    parser: 'legacy',
  },
  AA: {
    id: 'AA',
    title: 'Apostolicam actuositatem',
    url: 'https://www.vatican.va/archive/hist_councils/ii_vatican_council/documents/vat-ii_decree_19651118_apostolicam-actuositatem_en.html',
    parser: 'legacy',
  },
  NA: {
    id: 'NA',
    title: 'Nostra aetate',
    url: 'https://www.vatican.va/archive/hist_councils/ii_vatican_council/documents/vat-ii_decl_19651028_nostra-aetate_en.html',
    parser: 'legacy',
  },
  CD: {
    id: 'CD',
    title: 'Christus Dominus',
    url: 'https://www.vatican.va/archive/hist_councils/ii_vatican_council/documents/vat-ii_decree_19651028_christus-dominus_en.html',
    parser: 'legacy',
  },
  OT: {
    id: 'OT',
    title: 'Optatam totius',
    url: 'https://www.vatican.va/archive/hist_councils/ii_vatican_council/documents/vat-ii_decree_19651028_optatam-totius_en.html',
    parser: 'legacy',
  },
  PC: {
    id: 'PC',
    title: 'Perfectae caritatis',
    url: 'https://www.vatican.va/archive/hist_councils/ii_vatican_council/documents/vat-ii_decree_19651028_perfectae-caritatis_en.html',
    parser: 'legacy',
  },
  IM: {
    id: 'IM',
    title: 'Inter mirifica',
    url: 'https://www.vatican.va/archive/hist_councils/ii_vatican_council/documents/vat-ii_decree_19631204_inter-mirifica_en.html',
    parser: 'legacy',
  },
  FC: {
    id: 'FC',
    title: 'Familiaris consortio',
    url: 'https://www.vatican.va/content/john-paul-ii/en/apost_exhortations/documents/hf_jp-ii_exh_19811122_familiaris-consortio.html',
    parser: 'modern',
  },
  CA: {
    id: 'CA',
    title: 'Centesimus annus',
    url: 'https://www.vatican.va/content/john-paul-ii/en/encyclicals/documents/hf_jp-ii_enc_01051991_centesimus-annus.html',
    parser: 'modern',
  },
  CT: {
    id: 'CT',
    title: 'Catechesi tradendae',
    url: 'https://www.vatican.va/content/john-paul-ii/en/apost_exhortations/documents/hf_jp-ii_exh_16101979_catechesi-tradendae.html',
    parser: 'modern',
  },
  CL: {
    id: 'CL',
    title: 'Christifideles laici',
    url: 'https://www.vatican.va/content/john-paul-ii/en/apost_exhortations/documents/hf_jp-ii_exh_30121988_christifideles-laici.html',
    parser: 'modern',
  },
  SRS: {
    id: 'SRS',
    title: 'Sollicitudo rei socialis',
    url: 'https://www.vatican.va/content/john-paul-ii/en/encyclicals/documents/hf_jp-ii_enc_30121987_sollicitudo-rei-socialis.html',
    parser: 'modern',
  },
  LE: {
    id: 'LE',
    title: 'Laborem exercens',
    url: 'https://www.vatican.va/content/john-paul-ii/en/encyclicals/documents/hf_jp-ii_enc_14091981_laborem-exercens.html',
    parser: 'modern',
  },
  RMiss: {
    id: 'RMiss',
    title: 'Redemptoris missio',
    url: 'https://www.vatican.va/content/john-paul-ii/en/encyclicals/documents/hf_jp-ii_enc_07121990_redemptoris-missio.html',
    parser: 'modern',
  },
  HV: {
    id: 'HV',
    title: 'Humanae vitae',
    url: 'https://www.vatican.va/content/paul-vi/en/encyclicals/documents/hf_p-vi_enc_25071968_humanae-vitae.html',
    parser: 'modern',
  },
  EN: {
    id: 'EN',
    title: 'Evangelii nuntiandi',
    url: 'https://www.vatican.va/content/paul-vi/en/apost_exhortations/documents/hf_p-vi_exh_19751208_evangelii-nuntiandi.html',
    parser: 'modern',
  },
  GCD: {
    id: 'GCD',
    title: 'General Catechetical Directory',
    url: 'https://www.vatican.va/roman_curia/congregations/cclergy/documents/rc_con_cclergy_doc_11041971_gcat_en.html',
    parser: 'legacy',
  },
  GIRM: {
    id: 'GIRM',
    title: 'General Instruction of the Roman Missal',
    url: 'https://press.vatican.va/roman_curia/congregations/ccdds/documents/rc_con_ccdds_doc_20030317_ordinamento-messale_en.html',
    parser: 'legacy',
  },
  GE: {
    id: 'GE',
    title: 'Gravissimum educationis',
    url: 'https://www.vatican.va/archive/hist_councils/ii_vatican_council/documents/vat-ii_decl_19651028_gravissimum-educationis_en.html',
    parser: 'legacy',
  },
  CIC: {
    id: 'CIC',
    title: 'Code of Canon Law',
    url: 'https://press.vatican.va/archive/cod-iuris-canonici/cic_index_en.html',
    parser: 'cic',
  },
  CCEO: {
    id: 'CCEO',
    title: 'Code of Canons of the Eastern Churches',
    url: 'https://www.vatican.va/holy_father/john_paul_ii/apost_constitutions/documents/hf_jp-ii_apc_19901018_index-codex-can-eccl-orient_lt.html',
    parser: 'cceo',
    language: 'la',
  },
};

const documentAliasPatterns = {
  LG: [/lumen gentium/i],
  GS: [/gaudium et spes/i, /vatican council ii,\s*gs\b/i],
  DV: [/dei verbum/i],
  SC: [/sacrosanctum concilium/i],
  AG: [/ad gentes/i],
  UR: [/unitatis redintegratio/i],
  PO: [/presbyterorum ordinis/i],
  DH: [/dignitatis humanae/i],
  AA: [/apostolicam actuositatem/i],
  NA: [/nostra aetate/i],
  CD: [/christus dominus/i],
  OT: [/optatam totius/i],
  PC: [/perfectae caritatis/i],
  IM: [/inter mirifica/i],
  FC: [/familiaris consortio/i],
  CA: [/centesimus annus/i],
  CT: [/catechesi tradendae/i],
  CL: [/christifideles laici/i],
  SRS: [/sollicitudo rei socialis/i],
  LE: [/laborem exercens/i],
  RMiss: [/\bRM\b/i, /redemptoris missio/i],
  HV: [/humanae vitae/i],
  EN: [/evangelii nuntiandi/i],
  GCD: [/general catechetical directory/i],
  GIRM: [/general instruction of the roman missal/i],
  GE: [/gravissimum educationis/i],
  CIC: [/code of canon law/i],
  CCEO: [/code of canons of the eastern churches/i, /codex canonum ecclesiarum orientalium/i],
};

function stripBidiMarks(value) {
  return value.replace(bidiControlPattern, '');
}

function cleanText(value) {
  return stripBidiMarks(value)
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&amp;/gi, '&')
    .replace(/&gt;/gi, '>')
    .replace(/&lt;/gi, '<')
    .replace(/\u00ad/g, '')
    .replace(/\u200b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeBibleTitle(value) {
  return cleanText(value)
    .toLowerCase()
    .replace(/\bthe\b/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function slugTitle(value) {
  return cleanText(value)
    .replace(/\(\d+\s*-\s*\d+\)$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const ordinalWordToNumber = {
  ONE: '1',
  TWO: '2',
  THREE: '3',
  FOUR: '4',
  FIVE: '5',
  SIX: '6',
  SEVEN: '7',
  EIGHT: '8',
  NINE: '9',
  TEN: '10',
  ELEVEN: '11',
  TWELVE: '12',
};

function titleCaseHierarchyText(value) {
  const smallWords = new Set(['a', 'an', 'and', 'as', 'at', 'by', 'for', 'from', 'in', 'of', 'on', 'or', 'the', 'to', 'with']);
  const decoded = cheerio.load(`<div>${value}</div>`)('div').text();
  const words = cleanText(decoded).split(/\s+/);

  return words
    .map((word, index) => {
      const match = word.match(/^([^A-Za-z]*)([A-Za-z][A-Za-z']*)([^A-Za-z]*)$/);
      if (!match) {
        return word;
      }

      const [, leading, core, trailing] = match;
      if (/^(i|ii|iii|iv|v|vi|vii|viii|ix|x)$/i.test(core)) {
        return `${leading}${core.toUpperCase()}${trailing}`;
      }

      const normalized = core.charAt(0).toUpperCase() + core.slice(1).toLowerCase();
      const previousWord = words[index - 1] ?? '';
      const keepCapitalized =
        index === 0 ||
        index === words.length - 1 ||
        /[.:]$/.test(previousWord) ||
        !smallWords.has(normalized.toLowerCase());

      return `${leading}${keepCapitalized ? normalized : normalized.toLowerCase()}${trailing}`;
    })
    .join(' ');
}

function normalizeHierarchySegment(segment) {
  const text = cleanText(segment).replace(/\s*>\s*/g, ' ');

  const partMatch = text.match(/^PART\s+(ONE|TWO|THREE|FOUR|\d+)\s*:?\s*(.+)$/i);
  if (partMatch) {
    return `Part ${ordinalWordToNumber[partMatch[1].toUpperCase()] ?? partMatch[1]}: ${titleCaseHierarchyText(partMatch[2])}`;
  }

  const sectionMatch = text.match(/^SECTION\s+(ONE|TWO|THREE|FOUR|\d+)\s*:?\s*(.+)$/i);
  if (sectionMatch) {
    return `Section ${ordinalWordToNumber[sectionMatch[1].toUpperCase()] ?? sectionMatch[1]}: ${titleCaseHierarchyText(sectionMatch[2])}`;
  }

  const chapterMatch = text.match(/^CHAPTER\s+(ONE|TWO|THREE|FOUR|FIVE|SIX|SEVEN|EIGHT|NINE|TEN|\d+)\s*:?\s*(.+)$/i);
  if (chapterMatch) {
    return `Chapter ${ordinalWordToNumber[chapterMatch[1].toUpperCase()] ?? chapterMatch[1]}: ${titleCaseHierarchyText(chapterMatch[2])}`;
  }

  const articleMatch = text.match(/^ARTICLE\s+([0-9IVXLC]+)\s*:?\s*(.+)$/i);
  if (articleMatch) {
    return `Article ${articleMatch[1].toUpperCase()}: ${titleCaseHierarchyText(articleMatch[2])}`;
  }

  const paragraphMatch = text.match(/^PARAGRAPH\s+([0-9IVXLC]+)\s*:?\s*(.+)$/i);
  if (paragraphMatch) {
    return `Paragraph ${paragraphMatch[1].toUpperCase()}: ${titleCaseHierarchyText(paragraphMatch[2])}`;
  }

  return null;
}

function extractSourceHierarchy(html) {
  const $ = cheerio.load(html);
  const metaContent = $('meta[name="part"]').attr('content');
  if (!metaContent) {
    return [];
  }

  return metaContent
    .split(/\s*>\s*/)
    .map((segment) => normalizeHierarchySegment(segment))
    .filter(Boolean);
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function debugLog(...args) {
  if (process.env.DEBUG_BUILD === '1') {
    console.error('[build:data]', ...args);
  }
}

function languageLabel(code) {
  const labels = {
    en: 'English',
    la: 'Latin',
  };

  return labels[code] ?? code.toUpperCase();
}

function splitReferenceText(value) {
  return cleanText(value)
    .split(/\s*;\s*/)
    .map((entry) => entry.replace(/\.$/, '').trim())
    .filter(Boolean);
}

function classifyReference(value) {
  return scripturePattern.test(value) ? 'scripture' : 'document';
}

function extractDocumentReferenceSegments(note) {
  const $ = cheerio.load(`<div>${note.html}</div>`);
  $('a[href^="#!/search/"]').remove();

  const rawText = cleanText($('div').text());
  if (!rawText) {
    return [];
  }

  const segments = [];
  for (const piece of splitReferenceText(rawText)) {
    const segment = normalizeDocumentLabel(piece);
    if (!segment) {
      continue;
    }

    if (classifyReference(segment) === 'scripture') {
      continue;
    }

    const isContinuation =
      segments.length > 0 &&
      /^(?:\d+(?::\d+)?(?:\s*[-,]\s*\d+(?::\d+)?)?|§+\s*\d+|can(?:n)?\.?\s*\d+|cann?\.\s*\d+|preface\b|introduction\b|praenotanda\b)/i.test(
        segment,
      );

    if (isContinuation) {
      segments[segments.length - 1] = `${segments[segments.length - 1]}; ${segment}`;
      continue;
    }

    if (!/[a-z]/i.test(segment)) {
      continue;
    }

    segments.push(segment);
  }

  return segments;
}

function slugSegment(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeDocumentLabel(label) {
  return cleanText(label)
    .replace(/^cf\.?\s+/i, '')
    .replace(/^see also\s+/i, '')
    .replace(/^see\s+/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeBookAlias(value) {
  return value.toLowerCase().replace(/\./g, '').replace(/\s+/g, ' ').trim();
}

function getBibleBook(value) {
  const bookId = bibleBookAliases.get(normalizeBookAlias(value));
  if (!bookId) {
    return null;
  }

  return {
    id: bookId,
    name: bibleBookNames[bookId],
  };
}

function extractScriptureReferencesFromFootnote(note) {
  const $ = cheerio.load(`<div>${note.html}</div>`);
  const references = [];
  let counter = 1;

  $('a[href^="#!/search/"]').each((_, link) => {
    const href = $(link).attr('href') ?? '';
    const query = decodeURIComponent(href.replace('#!/search/', ''));
    const canonicalLabel = cleanText(query).replace(/\.$/, '');
    if (!canonicalLabel) {
      return;
    }

    references.push({
      id: `${note.id}:scripture:${counter}`,
      footnoteId: note.id,
      footnoteNumber: note.number,
      label: cleanText($(link).text()) || canonicalLabel,
      canonicalLabel,
      kind: 'scripture',
    });
    counter += 1;
  });

  return references;
}

function extractExternalReferences(footnotes) {
  const references = [];

  for (const note of footnotes) {
    references.push(...extractScriptureReferencesFromFootnote(note));
    const segments = extractDocumentReferenceSegments(note);

    for (const [index, segment] of segments.entries()) {
      const canonicalLabel = normalizeDocumentLabel(segment);
      if (!canonicalLabel) {
        continue;
      }

      references.push({
        id: `${note.id}:document:${index + 1}`,
        footnoteId: note.id,
        footnoteNumber: note.number,
        label: segment,
        canonicalLabel,
        kind: 'document',
      });
    }
  }

  return references;
}

function buildPreview(text) {
  return text.length > 220 ? `${text.slice(0, 217).trimEnd()}...` : text;
}

function cacheFileNameForUrl(url) {
  const encoded = encodeURIComponent(url).replaceAll('%', '_');
  if (encoded.length <= 180) {
    return encoded;
  }

  return `sha1_${createHash('sha1').update(url).digest('hex')}`;
}

function decodeHtmlBuffer(buffer) {
  const latin1 = Buffer.from(buffer).toString('latin1');
  const match = latin1.match(/charset\s*=\s*["']?([a-z0-9_-]+)/i);
  const charset = match?.[1]?.toLowerCase() ?? 'latin1';

  if (charset === 'utf-8' || charset === 'utf8') {
    return Buffer.from(buffer).toString('utf8');
  }

  return latin1;
}

async function getCachedBuffer(url) {
  const fileName = cacheFileNameForUrl(url);
  const filePath = path.join(cacheDir, fileName);

  try {
    return await readFile(filePath);
  } catch {
    if (process.env.OFFLINE_ONLY === '1') {
      throw new Error(`Offline cache miss for ${url}`);
    }

    for (let attempt = 0; attempt < 6; attempt += 1) {
      try {
        const response = await fetch(url, {
          signal: AbortSignal.timeout(30000),
        });
        if (response.ok) {
          const buffer = Buffer.from(await response.arrayBuffer());
          await mkdir(cacheDir, { recursive: true });
          await writeFile(filePath, buffer);
          return buffer;
        }

        if (response.status !== 429 || attempt === 5) {
          throw new Error(`Request failed with ${response.status} for ${url}`);
        }

        const retryAfterSeconds = Number(response.headers.get('retry-after') ?? '0');
        const delayMs =
          retryAfterSeconds > 0 ? retryAfterSeconds * 1000 : 1500 * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        continue;
      } catch (error) {
        if (attempt === 5) {
          throw error;
        }

        await new Promise((resolve) => setTimeout(resolve, 1500 * Math.pow(2, attempt)));
      }
    }
  }
}

async function fetchHtml(url) {
  const buffer = await getCachedBuffer(url);
  return decodeHtmlBuffer(buffer);
}

async function fetchPdfToCache(url) {
  const fileName = cacheFileNameForUrl(url);
  const filePath = path.join(cacheDir, fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`);

  try {
    await readFile(filePath);
    return filePath;
  } catch {
    const buffer = await getCachedBuffer(url);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, buffer);
    return filePath;
  }
}

function extractLinks(html, baseUrl) {
  const $ = cheerio.load(html);
  const links = new Set();

  $('a[href]').each((_, element) => {
    const href = $(element).attr('href');
    if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:')) {
      return;
    }

    try {
      const url = new URL(href, baseUrl);
      url.hash = '';
      links.add(url.toString());
    } catch {
      // Ignore malformed URLs in legacy Vatican markup.
    }
  });

  return [...links];
}

function extractParagraphStart(text) {
  const normalized = stripBidiMarks(text);
  const dashedMatch = normalized.match(/^[-–]\s*(\d{1,4})\s*(.+)$/);
  const standardMatch = normalized.match(/^(\d{1,4})(?:[.)]|)\s+(.+)$/);
  const match = dashedMatch ?? standardMatch;
  if (!match) {
    return null;
  }

  const id = Number(match[1]);
  if (!Number.isFinite(id) || id < 1 || id > 2865) {
    return null;
  }

  return {
    id,
    rest: cleanText(match[2]),
  };
}

function finalizeLocalizedParagraph(current, target, sourceUrl) {
  if (!current || target.has(current.id)) {
    return;
  }

  const text = cleanText(current.parts.join(' '));
  if (!text) {
    return;
  }

  target.set(current.id, {
    id: current.id,
    text,
    textHtml: `<p>${escapeHtml(text)}</p>`,
    preview: buildPreview(text),
    vaticanSource: {
      file: path.basename(new URL(sourceUrl).pathname),
      localPath: '',
      url: sourceUrl,
    },
  });
}

function parseLocalizedParagraphsFromHtml(html, sourceUrl) {
  const $ = cheerio.load(html);
  const relevantSelector = 'p, blockquote, hr, div[id^="ftn"]';
  const blocks = $(relevantSelector)
    .toArray()
    .filter((element) => $(element).parents(relevantSelector).length === 0);

  const paragraphs = new Map();
  let current = null;
  let sawParagraph = false;

  for (const element of blocks) {
    const tagName = element.tagName?.toLowerCase() ?? '';

    if (tagName === 'hr' || tagName === 'div') {
      if (sawParagraph) {
        finalizeLocalizedParagraph(current, paragraphs, sourceUrl);
        break;
      }
      continue;
    }

    const text = cleanText($(element).text());
    if (!text) {
      continue;
    }

    const start = extractParagraphStart(text);
    if (start) {
      if (current && start.id < current.id) {
        finalizeLocalizedParagraph(current, paragraphs, sourceUrl);
        break;
      }

      finalizeLocalizedParagraph(current, paragraphs, sourceUrl);
      current = {
        id: start.id,
        parts: start.rest ? [start.rest] : [],
      };
      sawParagraph = true;
      continue;
    }

    if (current) {
      current.parts.push(text);
    }
  }

  finalizeLocalizedParagraph(current, paragraphs, sourceUrl);
  return paragraphs;
}

function parseLocalizedParagraphsFromPdf(text, sourceUrl) {
  const paragraphs = new Map();
  const lines = stripBidiMarks(text).replaceAll('\f', '\n').split('\n');
  let current = null;

  for (const line of lines) {
    const cleanedLine = cleanText(line);
    if (!cleanedLine) {
      continue;
    }

    const start = extractParagraphStart(cleanedLine);
    if (start) {
      if (current && start.id < current.id) {
        finalizeLocalizedParagraph(current, paragraphs, sourceUrl);
        break;
      }

      finalizeLocalizedParagraph(current, paragraphs, sourceUrl);
      current = {
        id: start.id,
        parts: start.rest ? [start.rest] : [],
      };
      continue;
    }

    if (current) {
      current.parts.push(cleanedLine);
    }
  }

  finalizeLocalizedParagraph(current, paragraphs, sourceUrl);
  return paragraphs;
}

function extractPdfText(pdfPath) {
  return execFileSync('pdftotext', [pdfPath, '-'], {
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 256,
  });
}

function sortByLeadingNumber(urls) {
  return [...urls].sort((left, right) => {
    const leftMatch = left.match(/(\d{1,4})[-_](\d{1,4})/);
    const rightMatch = right.match(/(\d{1,4})[-_](\d{1,4})/);
    const leftValue = leftMatch ? Number(leftMatch[1]) : Number.POSITIVE_INFINITY;
    const rightValue = rightMatch ? Number(rightMatch[1]) : Number.POSITIVE_INFINITY;
    return leftValue - rightValue || left.localeCompare(right);
  });
}

async function discoverHtmlPages(config) {
  const queue = [config.indexUrl];
  const visited = new Set();
  const pages = new Set();

  while (queue.length > 0) {
    const currentUrl = queue.shift();
    if (!currentUrl || visited.has(currentUrl)) {
      continue;
    }

    visited.add(currentUrl);
    let html;

    try {
      html = await fetchHtml(currentUrl);
    } catch (error) {
      if (currentUrl === config.indexUrl) {
        throw error;
      }

      continue;
    }

    if (config.pagePattern.test(new URL(currentUrl).pathname)) {
      pages.add(currentUrl);
    }

    for (const link of extractLinks(html, currentUrl)) {
      const parsed = new URL(link);
      if (parsed.origin !== new URL(config.indexUrl).origin) {
        continue;
      }
      if (!parsed.pathname.startsWith(config.crawlPrefix)) {
        continue;
      }
      if (!/\.html?$/i.test(parsed.pathname) && !/\.htm$/i.test(parsed.pathname)) {
        continue;
      }
      if (parsed.toString() !== config.indexUrl && !config.pagePattern.test(parsed.pathname)) {
        continue;
      }
      if (!visited.has(parsed.toString())) {
        queue.push(parsed.toString());
      }
    }

    if (visited.size > 1200) {
      throw new Error(`HTML crawl exceeded safe limit for ${config.code}`);
    }
  }

  return [...pages].sort();
}

async function buildHtmlLanguagePack(config, nodeIds) {
  const pages = await discoverHtmlPages(config);
  const localized = new Map();

  for (const pageUrl of pages) {
    const html = await fetchHtml(pageUrl);
    const pageParagraphs = parseLocalizedParagraphsFromHtml(html, pageUrl);

    for (const [id, payload] of pageParagraphs) {
      if (nodeIds.has(id) && !localized.has(id)) {
        localized.set(id, payload);
      }
    }
  }

  return {
    language: config.code,
    label: config.label,
    source: {
      corpus: config.corpus,
    },
    stats: {
      paragraphs: localized.size,
    },
    nodes: [...localized.values()].sort((a, b) => a.id - b.id),
  };
}

async function buildPdfLanguagePack(config, nodeIds) {
  const html = await fetchHtml(config.indexUrl);
  const pdfUrls = sortByLeadingNumber(
    extractLinks(html, config.indexUrl).filter((url) => config.pdfPattern.test(new URL(url).pathname)),
  );
  const localized = new Map();

  for (const pdfUrl of pdfUrls) {
    const pdfPath = await fetchPdfToCache(pdfUrl);
    const pdfText = extractPdfText(pdfPath);
    const pdfParagraphs = parseLocalizedParagraphsFromPdf(pdfText, pdfUrl);

    for (const [id, payload] of pdfParagraphs) {
      if (nodeIds.has(id) && !localized.has(id)) {
        localized.set(id, payload);
      }
    }
  }

  return {
    language: config.code,
    label: config.label,
    source: {
      corpus: config.corpus,
    },
    stats: {
      paragraphs: localized.size,
    },
    nodes: [...localized.values()].sort((a, b) => a.id - b.id),
  };
}

async function buildLanguagePacks(nodeIds) {
  const packs = [];

  for (const config of languageConfigs) {
    const pack =
      config.type === 'pdf'
        ? await buildPdfLanguagePack(config, nodeIds)
        : await buildHtmlLanguagePack(config, nodeIds);

    packs.push(pack);
    console.log(`Built ${config.code} pack with ${pack.stats.paragraphs} paragraphs`);
  }

  return packs;
}

async function buildVaticanPageLookup() {
  const files = await readdir(vaticanSourceDir);
  const lookup = new Map();

  for (const file of files.filter((entry) => /^__.*\.HTM$/i.test(entry)).sort()) {
    const filePath = path.join(vaticanSourceDir, file);
    const html = await readFile(filePath, 'utf8');
    const hierarchy = extractSourceHierarchy(html);
    const matches = html.matchAll(/<p class=MsoNormal>(\d{1,4})\r?\n/g);

    for (const match of matches) {
      const paragraphId = Number(match[1]);
      if (!Number.isFinite(paragraphId) || lookup.has(paragraphId)) {
        continue;
      }

      lookup.set(paragraphId, {
        file,
        localPath: filePath,
        url: `https://www.vatican.va/archive/ENG0015/${file}`,
        hierarchy,
      });
    }
  }

  return lookup;
}

async function postForm(params) {
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
    },
    body: new URLSearchParams(params),
  });

  if (!response.ok) {
    throw new Error(`Request failed with ${response.status} for ${JSON.stringify(params)}`);
  }

  return response.json();
}

function parseTotalResults(html) {
  const match = html.match(/Results\s+\d+\s*-\s*\d+\s+of\s+(\d+)/i);
  return match ? Number(match[1]) : 0;
}

function inferPart(breadcrumbs) {
  const first = breadcrumbs[0] ?? 'Prologue';

  if (/^Part 1:/i.test(first)) return 'Profession of Faith';
  if (/^Part 2:/i.test(first)) return 'Celebration of the Christian Mystery';
  if (/^Part 3:/i.test(first)) return 'Life in Christ';
  if (/^Part 4:/i.test(first)) return 'Christian Prayer';
  return 'Prologue';
}

const hierarchyOrder = ['part', 'section', 'chapter', 'article', 'paragraph'];

function getHierarchyLevel(entry) {
  if (/^Part\s+\d+:/i.test(entry)) return 'part';
  if (/^Section\s+\d+:/i.test(entry)) return 'section';
  if (/^Chapter\s+\d+:/i.test(entry)) return 'chapter';
  if (/^Article\s+[0-9IVXLC]+:/i.test(entry)) return 'article';
  if (/^Paragraph\s+[0-9IVXLC]+:/i.test(entry)) return 'paragraph';
  return null;
}

function extractHierarchyLevels(entries) {
  const levels = {};
  const extras = [];

  for (const entry of entries) {
    const level = getHierarchyLevel(entry);
    if (level) {
      levels[level] = entry;
    } else {
      extras.push(entry);
    }
  }

  return { levels, extras };
}

function getHierarchyIdentifier(entry) {
  const match = entry.match(/^(Part|Section|Chapter|Article|Paragraph)\s+([0-9IVXLC]+):/i);
  return match ? `${match[1].toLowerCase()}:${match[2].toUpperCase()}` : null;
}

function normalizeParagraphHierarchy(nodes, vaticanLookup) {
  let context = {
    part: null,
    section: null,
    chapter: null,
    article: null,
    paragraph: null,
  };

  return nodes.map((node) => {
    const sourceHierarchy = vaticanLookup.get(node.id)?.hierarchy ?? [];
    const { levels: sourceLevels } = extractHierarchyLevels(sourceHierarchy);
    const { levels: existingLevels, extras } = extractHierarchyLevels(node.breadcrumbs);
    const nextContext = { ...context };

    for (const [index, level] of hierarchyOrder.entries()) {
      const normalizedExisting = normalizeHierarchySegment(existingLevels[level] ?? '');
      const contextValue = nextContext[level];
      const explicitValue =
        normalizedExisting &&
        contextValue &&
        getHierarchyIdentifier(normalizedExisting) === getHierarchyIdentifier(contextValue)
          ? contextValue
          : normalizedExisting ??
            (contextValue ? null : sourceLevels[level] ?? null);

      if (!explicitValue) {
        continue;
      }

      if (nextContext[level] !== explicitValue) {
        for (const lowerLevel of hierarchyOrder.slice(index + 1)) {
          nextContext[lowerLevel] = null;
        }
      }

      nextContext[level] = explicitValue;
    }

    const normalizedBreadcrumbs = hierarchyOrder
      .map((level) => nextContext[level])
      .filter(Boolean);

    context = nextContext;

    return {
      ...node,
      part: inferPart(normalizedBreadcrumbs),
      breadcrumbs: [...normalizedBreadcrumbs, ...extras],
    };
  });
}

function parseParagraphHtml(html, vaticanLookup) {
  const $ = cheerio.load(html);
  const paragraphs = [];

  $('.paragraph').each((_, element) => {
    const paragraph = $(element);
    const id = Number((paragraph.attr('id') ?? '').replace('para-', ''));

    if (!Number.isFinite(id)) {
      return;
    }

    const breadcrumbEntries = paragraph
      .parents('.section')
      .toArray()
      .reverse()
      .map((section) => slugTitle($(section).children('.navigation').first().text()))
      .filter(Boolean);

    const headings = [];
    let cursor = paragraph.prev();
    while (cursor.length) {
      if (cursor.hasClass('paragraph')) {
        break;
      }

      if (cursor.hasClass('heading')) {
        headings.unshift({
          kind: cursor.hasClass('head') ? 'major' : 'minor',
          text: cleanText(cursor.text().replace('⇡', '')),
        });
      }

      cursor = cursor.prev();
    }

    const textHtml = paragraph.find('.text').html() ?? '';
    const text = cleanText(paragraph.find('.text').text());
    const preview = buildPreview(text);
    const xrefs = Array.from(
      new Set(
        paragraph
          .find('.xrefs a')
          .toArray()
          .map((link) => cleanText($(link).text()))
          .map((value) => Number(value))
          .filter((value) => Number.isFinite(value)),
      ),
    );

    const footnotes = paragraph
      .find('.footnotes .note')
      .toArray()
      .map((note) => {
        const entry = $(note);
        const noteId = entry.attr('id') ?? '';
        const number = Number(cleanText(entry.find('.num').text()).replace(/\.$/, ''));

        return {
          id: noteId.replace('fn:', ''),
          number: Number.isFinite(number) ? number : noteId,
          html: (entry.find('.text').html() ?? '').trim(),
          text: cleanText(entry.find('.text').text()),
        };
      });
    const externalReferences = extractExternalReferences(footnotes);
    const vaticanSource = vaticanLookup.get(id) ?? null;

    paragraphs.push({
      id,
      number: id,
      part: inferPart(breadcrumbEntries),
      breadcrumbs: breadcrumbEntries,
      headings,
      title: headings.at(-1)?.text ?? breadcrumbEntries.at(-1) ?? `Paragraph ${id}`,
      text,
      textHtml,
      preview,
      footnotes,
      externalReferences,
      vaticanSource,
      xrefs,
    });
  });

  return paragraphs;
}

async function fetchSection(query, vaticanLookup) {
  const items = [];
  let offset = 0;
  let total = Number.POSITIVE_INFINITY;
  let token = 1;

  while (offset < total) {
    const payload = await postForm({
      TOKEN: String(token++),
      lang: 'en',
      offset: String(offset),
      query,
    });

    items.push(...parseParagraphHtml(payload.html, vaticanLookup));

    total = parseTotalResults(payload.html);
    if (!payload.per || total === 0) {
      break;
    }

    offset += payload.per;
  }

  return items;
}

function splitScriptureQuery(query) {
  const cleaned = cleanText(query)
    .replace(/^cf\.?\s+/i, '')
    .replace(/^see also\s+/i, '')
    .replace(/^see\s+/i, '')
    .replace(/\s*\((?:vulg|lxx|greek|hebrew|neb)\)\s*/gi, '')
    .trim();

  const segments = cleaned.split(/\s*;\s*/);
  const normalized = [];
  let currentBook = null;
  let currentChapter = null;

  for (const rawSegment of segments) {
    const segment = rawSegment.trim();
    if (!segment) {
      continue;
    }

    const directMatch = segment.match(/^((?:[1-3]\s*)?[A-Za-z][A-Za-z. ]+?)\s+(\d.*)$/);
    if (directMatch) {
      const book = getBibleBook(directMatch[1]);
      if (!book) {
        continue;
      }

      currentBook = book;
      const chapterMatch = directMatch[2].match(/^(\d+)/);
      currentChapter = chapterMatch ? Number(chapterMatch[1]) : null;
      normalized.push({
        bookId: book.id,
        bookName: book.name,
        query: `${book.name} ${directMatch[2].trim()}`,
      });
      continue;
    }

    if (currentBook && /^\d/.test(segment)) {
      const inferredSegment =
        !segment.includes(':') && currentChapter !== null ? `${currentChapter}:${segment}` : segment;
      const chapterMatch = inferredSegment.match(/^(\d+)/);
      currentChapter = chapterMatch ? Number(chapterMatch[1]) : currentChapter;
      normalized.push({
        bookId: currentBook.id,
        bookName: currentBook.name,
        query: `${currentBook.name} ${inferredSegment}`,
      });
    }
  }

  return normalized;
}

function expandVerseToken(token) {
  const trimmed = token.trim();
  if (!trimmed) {
    return [];
  }

  const rangeMatch = trimmed.match(/^(\d+)-(\d+)$/);
  if (rangeMatch) {
    const start = Number(rangeMatch[1]);
    const end = Number(rangeMatch[2]);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
      return [];
    }

    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }

  const single = Number(trimmed);
  return Number.isFinite(single) ? [single] : [];
}

function parseScriptureSegment(segment) {
  const match = segment.query.match(/^(.+?)\s+(\d+)(?::(.+))?$/);
  if (!match) {
    return null;
  }

  const numericPart = Number(match[2]);
  if (!Number.isFinite(numericPart)) {
    return null;
  }

  const hasExplicitChapter = Boolean(match[3]);
  const chapter = hasExplicitChapter ? numericPart : singleChapterBookIds.has(segment.bookId) ? 1 : numericPart;
  const verseSpec =
    match[3]?.trim() ??
    (singleChapterBookIds.has(segment.bookId) ? match[2].trim() : '');
  if (!verseSpec) {
    return {
      ...segment,
      chapters: [chapter],
      selections: [{ chapter, verses: null }],
      citation: `${segment.bookName} ${chapter}`,
    };
  }

  const tokens = verseSpec.split(/\s*,\s*/);
  const selections = [];
  const chapters = new Set([chapter]);

  for (const token of tokens) {
    const crossChapterMatch = token.match(/^(\d+):(\d+)-(\d+):(\d+)$/);
    if (crossChapterMatch) {
      const startChapter = Number(crossChapterMatch[1]);
      const startVerse = Number(crossChapterMatch[2]);
      const endChapter = Number(crossChapterMatch[3]);
      const endVerse = Number(crossChapterMatch[4]);

      for (let currentChapter = startChapter; currentChapter <= endChapter; currentChapter += 1) {
        chapters.add(currentChapter);
        if (currentChapter === startChapter && currentChapter === endChapter) {
          selections.push({
            chapter: currentChapter,
            verses: Array.from({ length: endVerse - startVerse + 1 }, (_, index) => startVerse + index),
          });
        } else if (currentChapter === startChapter) {
          selections.push({
            chapter: currentChapter,
            verses: { start: startVerse, end: null },
          });
        } else if (currentChapter === endChapter) {
          selections.push({
            chapter: currentChapter,
            verses: { start: 1, end: endVerse },
          });
        } else {
          selections.push({
            chapter: currentChapter,
            verses: null,
          });
        }
      }
      continue;
    }

    const chapterSpecificMatch = token.match(/^(\d+):(.+)$/);
    if (chapterSpecificMatch) {
      const tokenChapter = Number(chapterSpecificMatch[1]);
      const verses = chapterSpecificMatch[2]
        .split(/\s*,\s*/)
        .flatMap((part) => expandVerseToken(part));
      if (verses.length > 0) {
        chapters.add(tokenChapter);
        selections.push({ chapter: tokenChapter, verses });
      }
      continue;
    }

    const verses = expandVerseToken(token);
    if (verses.length > 0) {
      selections.push({ chapter, verses });
    }
  }

  return {
    ...segment,
    chapters: [...chapters].sort((left, right) => left - right),
    selections,
    citation: segment.query,
  };
}

function canonRangeForUrl(url) {
  const match = url.match(/cann?(\d+)-(\d+)/i);
  if (!match) {
    return null;
  }

  return {
    start: Number(match[1]),
    end: Number(match[2]),
  };
}

function extractModernDocumentContainer($) {
  return $('.text.parbase.container.vaticanrichtext').first();
}

function extractLegacyDocumentContainer($) {
  return $('#corpo td[width="99%"]').first();
}

function parseNumberedSectionsFromHtml(html, parser) {
  const $ = cheerio.load(html);
  const container = parser === 'modern' ? extractModernDocumentContainer($) : extractLegacyDocumentContainer($);
  const root = container.length ? container : $.root();
  const sections = new Map();
  let current = null;

  root.find('p').each((_, element) => {
    const entry = $(element);
    const text = cleanText(entry.text());
    if (!text) {
      return;
    }

    const match = text.match(/^(\d+)\.\s*(.*)$/);
    if (match) {
      if (current) {
        sections.set(current.number, current);
      }

      current = {
        number: Number(match[1]),
        parts: [match[2] ? `<p>${escapeHtml(match[2])}</p>` : ''],
      };
      return;
    }

    if (!current) {
      return;
    }

    current.parts.push(`<p>${entry.html()?.trim() ?? escapeHtml(text)}</p>`);
  });

  if (current) {
    sections.set(current.number, current);
  }

  return new Map(
    [...sections.entries()].map(([number, value]) => [
      number,
      {
        html: value.parts.filter(Boolean).join(''),
        text: cleanText(
          value.parts
            .map((part) => cheerio.load(`<div>${part}</div>`)('div').text())
            .join(' '),
        ),
      },
    ]),
  );
}

function splitCanonHtmlChunks(rawHtml) {
  const html = rawHtml?.trim();
  if (!html) {
    return [];
  }

  return html
    .split(/(?=<b>\s*Can\.\s*\d+)/i)
    .map((chunk) => chunk.trim())
    .filter(Boolean);
}

function parseCanonsFromHtml(html, selector = '#corpo p') {
  const $ = cheerio.load(html);
  const sections = new Map();
  let current = null;

  $(selector).each((_, element) => {
    const entry = $(element);
    const rawHtml = entry.html()?.trim() ?? '';
    const chunks = splitCanonHtmlChunks(rawHtml);

    for (const chunkHtml of chunks.length > 0 ? chunks : [rawHtml]) {
      const chunkText = cleanText(cheerio.load(`<div>${chunkHtml}</div>`)('div').text());
      if (!chunkText) {
        continue;
      }

      const match = chunkText.match(/^Can\.\s*(\d+)\s*(.*)$/i);
      if (match) {
        if (current) {
          sections.set(current.number, current);
        }

        const bodyHtml = chunkHtml.replace(/^<b>\s*Can\.\s*\d+(?:<i>.*?<\/i>)?\s*<\/b>\s*-?\s*/i, '');
        current = {
          number: Number(match[1]),
          parts: [bodyHtml ? `<p>${bodyHtml}</p>` : match[2] ? `<p>${escapeHtml(match[2])}</p>` : ''],
        };
        continue;
      }

      if (!current) {
        continue;
      }

      if (/^\[Earlier version\]/i.test(chunkText)) {
        sections.set(current.number, current);
        current = null;
        continue;
      }

      current.parts.push(`<p>${chunkHtml || escapeHtml(chunkText)}</p>`);
    }
  });

  if (current) {
    sections.set(current.number, current);
  }

  return new Map(
    [...sections.entries()].map(([number, value]) => [
      number,
      {
        html: value.parts.filter(Boolean).join(''),
        text: cleanText(
          value.parts
            .map((part) => cheerio.load(`<div>${part}</div>`)('div').text())
            .join(' '),
        ),
      },
    ]),
  );
}

async function loadCicSections() {
  const indexHtml = await fetchHtml(documentCatalog.CIC.url);
  const indexLinks = extractLinks(indexHtml, documentCatalog.CIC.url).filter((url) =>
    /\/archive\/cod-iuris-canonici\/eng\/documents\/cic_.*_en\.html$/i.test(url),
  );
  const pageEntries = indexLinks
    .map((url) => ({ url, range: canonRangeForUrl(url) }))
    .filter((entry) => entry.range)
    .sort((left, right) => left.range.start - right.range.start);
  const sections = new Map();

  for (const entry of pageEntries) {
    let html;
    try {
      html = await fetchHtml(entry.url);
    } catch (error) {
      if (String(error).includes('404') || String(error).includes('Offline cache miss')) {
        continue;
      }
      throw error;
    }
    const pageSections = parseCanonsFromHtml(html);
    for (const [number, payload] of pageSections) {
      if (!sections.has(number)) {
        sections.set(number, { ...payload, url: entry.url });
      }
    }
  }

  return sections;
}

async function loadCceoSections() {
  const indexHtml = await fetchHtml(documentCatalog.CCEO.url);
  const pageLinks = extractLinks(indexHtml, documentCatalog.CCEO.url)
    .filter((url) => /codex-can-eccl-orient-\d+\.html$/i.test(url))
    .sort();
  const sections = new Map();

  for (const url of pageLinks) {
    let html;
    try {
      html = await fetchHtml(url);
    } catch (error) {
      if (String(error).includes('404') || String(error).includes('Offline cache miss')) {
        continue;
      }
      throw error;
    }

    const pageSections = parseCanonsFromHtml(html, 'p');
    for (const [number, payload] of pageSections) {
      if (!sections.has(number)) {
        sections.set(number, { ...payload, url });
      }
    }
  }

  return sections;
}

const documentSectionCache = new Map();

async function loadDocumentSections(documentId) {
  const cached = documentSectionCache.get(documentId);
  if (cached) {
    return cached;
  }

  const config = documentCatalog[documentId];
  if (!config) {
    return null;
  }

  debugLog('loading document sections', documentId);

  let sections;
  if (config.parser === 'cic') {
    sections = await loadCicSections();
  } else if (config.parser === 'cceo') {
    sections = await loadCceoSections();
  } else {
    let html;
    try {
      html = await fetchHtml(config.url);
    } catch (error) {
      if (String(error).includes('Offline cache miss')) {
        return null;
      }
      throw error;
    }
    const parsed = parseNumberedSectionsFromHtml(html, config.parser);
    sections = new Map(
      [...parsed.entries()].map(([number, payload]) => [number, { ...payload, url: config.url }]),
    );
  }

  documentSectionCache.set(documentId, sections);
  debugLog('loaded document sections', documentId, sections.size);
  return sections;
}

function findDocumentCatalogMatch(label) {
  for (const [documentId, config] of Object.entries(documentCatalog)) {
    const patterns = [
      new RegExp(`(?:^|[\\s,(;])${escapeRegExp(documentId)}(?=$|[\\s,;:§])`, 'i'),
      ...(documentAliasPatterns[documentId] ?? []),
      new RegExp(escapeRegExp(config.title), 'i'),
    ];

    for (const pattern of patterns) {
      const match = pattern.exec(label);
      if (match) {
        return { documentId, match };
      }
    }
  }

  return null;
}

function extractLocatorNumbers(locatorText) {
  const numbers = [];
  const segments = locatorText
    .split(/\s*;\s*/)
    .map((segment) => segment.trim())
    .filter(Boolean);

  for (const segment of segments) {
    const rangeMatch = segment.match(/(\d+)\s*-\s*(\d+)/);
    if (rangeMatch) {
      const start = Number(rangeMatch[1]);
      const end = Number(rangeMatch[2]);
      const safeEnd = end - start > 32 ? start : end;
      for (let current = start; current <= safeEnd; current += 1) {
        numbers.push(current);
      }
      continue;
    }

    const valueMatch = segment.match(/(\d+)/);
    if (valueMatch) {
      numbers.push(Number(valueMatch[1]));
    }
  }

  return [...new Set(numbers)];
}

function parseDocumentReference(reference) {
  const label = normalizeDocumentLabel(reference.canonicalLabel ?? reference.label);
  const catalogMatch = findDocumentCatalogMatch(label);
  if (!catalogMatch) {
    return null;
  }

  const documentId = catalogMatch.documentId;
  const locatorText = label.slice(catalogMatch.match.index + catalogMatch.match[0].length).replace(/^[\s,:-]+/, '');
  const sections = extractLocatorNumbers(locatorText);
  if (sections.length === 0) {
    return null;
  }

  return {
    documentId,
    title: documentCatalog[documentId].title,
    citation: label,
    sections,
  };
}

async function buildBibleChapterCache(queries) {
  const chapterKeys = new Map();

  for (const query of queries) {
    for (const segment of splitScriptureQuery(query)) {
      const parsed = parseScriptureSegment(segment);
      if (!parsed) {
        continue;
      }

      for (const chapter of parsed.chapters) {
        chapterKeys.set(`${parsed.bookId}:${chapter}`, {
          bookId: parsed.bookId,
          chapter,
          bookName: parsed.bookName,
        });
      }
    }
  }

  const cache = new Map();
  for (const entry of chapterKeys.values()) {
    try {
      const buffer = await getCachedBuffer(
        `https://bible-api.com/data/${bibleTranslation.id}/${entry.bookId}/${entry.chapter}`,
      );
      const payload = JSON.parse(buffer.toString('utf8'));
      cache.set(`${entry.bookId}:${entry.chapter}`, payload.verses ?? []);
    } catch (error) {
      if (String(error).includes('404') || String(error).includes('Offline cache miss')) {
        continue;
      }
      throw error;
    }
  }

  return cache;
}

async function buildVaticanBiblePageLookup() {
  const html = await fetchHtml(vaticanBibleIndexUrl);
  const $ = cheerio.load(html);
  const chapterLookup = new Map();

  for (const [bookId, titles] of Object.entries(vaticanBibleBookTitles)) {
    const normalizedTitles = new Set(titles.map((title) => normalizeBibleTitle(title)));
    const entry = $('li')
      .filter((_, element) => {
        const titleNode = $(element).children('font').first();
        const titleText = cleanText(titleNode.text());
        if (!titleText) {
          return false;
        }

        return normalizedTitles.has(normalizeBibleTitle(titleText));
      })
      .first();

    if (!entry.length) {
      continue;
    }

    const rawHtml = entry.html() ?? '';
    const linkMatches = [...rawHtml.matchAll(/<a\s+href=(["']?)([^"'>\s]+)\1[^>]*>([^<]+)<\/a>/gi)];
    const numericChapters = new Map();
    let titleHref = null;

    for (const match of linkMatches) {
      const href = match[2];
      const label = cleanText(match[3]);
      if (!href || !label) {
        continue;
      }

      const chapter = Number(label);
      if (Number.isFinite(chapter)) {
        numericChapters.set(chapter, new URL(href, vaticanBibleBaseUrl).toString());
        continue;
      }

      if (normalizedTitles.has(normalizeBibleTitle(label)) && !titleHref) {
        titleHref = new URL(href, vaticanBibleBaseUrl).toString();
      }
    }

    if (singleChapterBookIds.has(bookId) && numericChapters.size === 0 && titleHref) {
      numericChapters.set(1, titleHref);
    }

    for (const [chapter, url] of numericChapters) {
      chapterLookup.set(`${bookId}:${chapter}`, url);
    }
  }

  return chapterLookup;
}

function versesForSelection(verses, selection) {
  if (selection.verses === null) {
    return verses;
  }

  if (Array.isArray(selection.verses)) {
    const allowed = new Set(selection.verses);
    return verses.filter((verse) => allowed.has(verse.verse));
  }

  return verses.filter(
    (verse) =>
      verse.verse >= selection.verses.start &&
      (selection.verses.end === null || verse.verse <= selection.verses.end),
  );
}

function scriptureSourceUrlForQuery(query, vaticanBibleLookup) {
  const segments = splitScriptureQuery(query);
  if (segments.length === 0) {
    return null;
  }

  for (const segment of segments) {
    const parsed = parseScriptureSegment(segment);
    const chapters =
      parsed?.chapters ??
      (() => {
        const match = segment.query.match(/\s+(\d+)/);
        if (!match) {
          return singleChapterBookIds.has(segment.bookId) ? [1] : [];
        }
        return [Number(match[1])];
      })();

    for (const chapter of chapters) {
      const url = vaticanBibleLookup.get(`${segment.bookId}:${chapter}`);
      if (url) {
        return url;
      }
    }
  }

  return null;
}

function renderScriptureSource(query, chapterCache, vaticanBibleLookup) {
  const segments = splitScriptureQuery(query)
    .map((segment) => parseScriptureSegment(segment))
    .filter(Boolean);
  if (segments.length === 0) {
    return null;
  }

  const parts = [];
  const textParts = [];

  for (const segment of segments) {
    for (const selection of segment.selections) {
      const verses = chapterCache.get(`${segment.bookId}:${selection.chapter}`) ?? [];
      const selectedVerses = versesForSelection(verses, selection);
      if (selectedVerses.length === 0) {
        continue;
      }

      const verseText = selectedVerses
        .map((verse) => `${verse.verse}. ${cleanText(verse.text)}`)
        .join(' ');
      parts.push(
        `<p><strong>${escapeHtml(segment.bookName)} ${selection.chapter}</strong> ${escapeHtml(verseText)}</p>`,
      );
      textParts.push(`${segment.bookName} ${selection.chapter}: ${verseText}`);
    }
  }

  if (parts.length === 0) {
    return null;
  }

  const sourceUrl = scriptureSourceUrlForQuery(query, vaticanBibleLookup);

  return {
    citation: query,
    contentHtml: parts.join(''),
    contentText: textParts.join(' '),
    title: 'Sacred Scripture',
    url: sourceUrl ?? `https://bible-api.com/${encodeURIComponent(query)}?translation=${bibleTranslation.id}`,
    sourceLabel: sourceUrl ? 'Vatican.va Bible archive' : bibleTranslation.sourceLabel,
    translationStatus: 'public-domain',
  };
}

async function translateText(value, sourceLanguage) {
  const text = cleanText(value);
  if (!text) {
    return '';
  }

  debugLog('translating text chunk', sourceLanguage, text.slice(0, 80));
  const requestUrl =
    `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${encodeURIComponent(sourceLanguage)}` +
    `&tl=en&dt=t&q=${encodeURIComponent(text)}`;
  const buffer = await getCachedBuffer(requestUrl);
  const payload = JSON.parse(buffer.toString('utf8'));
  return cleanText((payload?.[0] ?? []).map((entry) => entry?.[0] ?? '').join(' '));
}

async function translateHtmlParagraphs(html, sourceLanguage) {
  const $ = cheerio.load(`<div>${html}</div>`);
  const paragraphs = $('div > p').toArray();
  const translatedParagraphs = [];
  const textParts = [];

  for (const paragraph of paragraphs) {
    const originalText = cleanText($(paragraph).text());
    if (!originalText) {
      continue;
    }

    const translatedText = await translateText(originalText, sourceLanguage);
    if (!translatedText) {
      continue;
    }

    translatedParagraphs.push(`<p>${escapeHtml(translatedText)}</p>`);
    textParts.push(translatedText);
  }

  return {
    contentHtml: translatedParagraphs.join(''),
    contentText: textParts.join(' '),
  };
}

async function buildExternalSourcePayload(nodes, existingExternalSources = {}) {
  debugLog('rebuilding external references');
  const rebuiltReferences = new Map();
  const scriptureQueries = new Set();
  const documentQueries = new Map();
  const existingDocumentSourceByKey = new Map();
  const vaticanBibleLookup = await buildVaticanBiblePageLookup();

  for (const source of Object.values(existingExternalSources)) {
    if (source?.kind !== 'document') {
      continue;
    }

    const parsed = parseDocumentReference({
      label: source.citation,
      canonicalLabel: source.citation,
    });
    if (!parsed) {
      continue;
    }

    existingDocumentSourceByKey.set(`${parsed.documentId}:${parsed.sections.join(',')}`, source);
  }

  for (const node of nodes) {
    const externalReferences = extractExternalReferences(node.footnotes);
    rebuiltReferences.set(node.id, externalReferences);

    for (const reference of externalReferences) {
      if (reference.kind === 'scripture' && reference.canonicalLabel) {
        scriptureQueries.add(reference.canonicalLabel);
      }

      if (reference.kind === 'document') {
        const parsed = parseDocumentReference(reference);
        if (parsed) {
          documentQueries.set(`${parsed.documentId}:${parsed.sections.join(',')}`, parsed);
        }
      }
    }
  }

  const externalSources = {};
  const missingScriptureQueries = [];

  for (const query of scriptureQueries) {
    const sourceId = `scripture:${slugSegment(query)}`;
    const existing = existingExternalSources[sourceId];
    const sourceUrl = scriptureSourceUrlForQuery(query, vaticanBibleLookup);
    if (existing?.kind === 'scripture') {
      externalSources[sourceId] = {
        ...existing,
        id: sourceId,
        citation: query,
        url: sourceUrl ?? existing.url,
        sourceLabel: sourceUrl ? 'Vatican.va Bible archive' : existing.sourceLabel,
      };
      continue;
    }

    missingScriptureQueries.push(query);
  }

  const shouldFetchMissingScripture =
    missingScriptureQueries.length > 0 && Object.keys(existingExternalSources).length === 0;
  debugLog(
    'scripture queries',
    scriptureQueries.size,
    'missing',
    missingScriptureQueries.length,
    'fetching',
    shouldFetchMissingScripture,
  );
  const chapterCache = shouldFetchMissingScripture
    ? await buildBibleChapterCache(missingScriptureQueries)
    : new Map();
  debugLog('chapter cache built', chapterCache.size);
  debugLog('document queries', documentQueries.size);

  for (const query of shouldFetchMissingScripture ? missingScriptureQueries : []) {
    const source = renderScriptureSource(query, chapterCache, vaticanBibleLookup);
    if (!source) {
      continue;
    }

    const sourceId = `scripture:${slugSegment(query)}`;
    externalSources[sourceId] = {
      id: sourceId,
      kind: 'scripture',
      title: source.title,
      citation: source.citation,
      url: source.url,
      language: bibleTranslation.language,
      sourceLabel: source.sourceLabel,
      translationStatus: source.translationStatus,
      contentHtml: source.contentHtml,
      contentText: source.contentText,
    };
  }

  let documentIndex = 0;
  for (const parsed of documentQueries.values()) {
    documentIndex += 1;
    debugLog('building document source', documentIndex, documentQueries.size, parsed.documentId, parsed.citation);
    const sourceId = `document:${slugSegment(parsed.documentId)}:${slugSegment(parsed.citation)}`;
    const lookupKey = `${parsed.documentId}:${parsed.sections.join(',')}`;
    const existing = existingExternalSources[sourceId] ?? existingDocumentSourceByKey.get(lookupKey);
    if (existing?.kind === 'document') {
      const config = documentCatalog[parsed.documentId];
      const nonEnglishLabel =
        config?.language && config.language !== 'en'
          ? `Vatican.va (${languageLabel(config.language)} original)`
          : existing.sourceLabel;
      const translationNote =
        config?.language && config.language !== 'en' && existing.translationStatus === 'ai'
          ? `Translated with AI from the official ${languageLabel(config.language)} Vatican text.`
          : existing.translationNote;
      externalSources[sourceId] = {
        ...existing,
        id: sourceId,
        citation: parsed.citation,
        sourceLabel: nonEnglishLabel,
        translationNote,
      };
      continue;
    }

    if (parsed.documentId === 'CIC') {
      continue;
    }

    const sections = await loadDocumentSections(parsed.documentId);
    if (!sections) {
      continue;
    }

    const config = documentCatalog[parsed.documentId];
    if (!config) {
      continue;
    }

    const sourceParts = parsed.sections
      .map((section) => {
        const entry = sections.get(section);
        if (!entry) {
          return null;
        }

        return {
          html: `<p><strong>${escapeHtml(parsed.title)} ${section}</strong></p>${entry.html}`,
          text: `${parsed.title} ${section}. ${entry.text}`,
          url: entry.url,
        };
      })
      .filter(Boolean);

    if (sourceParts.length === 0) {
      continue;
    }

    let contentHtml = sourceParts.map((entry) => entry.html).join('');
    let contentText = sourceParts.map((entry) => entry.text).join(' ');
    let translationStatus = 'official';
    let translationNote;

    if (config.language && config.language !== 'en') {
      const translated = await translateHtmlParagraphs(contentHtml, config.language);
      if (!translated.contentHtml) {
        continue;
      }

      contentHtml = translated.contentHtml;
      contentText = translated.contentText;
      translationStatus = 'ai';
      translationNote = `Translated with AI from the official ${languageLabel(config.language)} Vatican text.`;
    }

    externalSources[sourceId] = {
      id: sourceId,
      kind: 'document',
      title: parsed.title,
      citation: parsed.citation,
      url: sourceParts[0].url,
      language: config.language ?? 'en',
      sourceLabel:
        config.language && config.language !== 'en'
          ? `Vatican.va (${languageLabel(config.language)} original)`
          : 'Vatican.va',
      translationStatus,
      translationNote,
      contentHtml,
      contentText,
    };
  }

  for (const source of Object.values(externalSources)) {
    if (source?.kind !== 'scripture') {
      continue;
    }

    const sourceUrl = scriptureSourceUrlForQuery(source.citation, vaticanBibleLookup);
    if (!sourceUrl) {
      continue;
    }

    source.url = sourceUrl;
    source.sourceLabel = 'Vatican.va Bible archive';
  }

  debugLog('document sources built', Object.keys(externalSources).filter((key) => key.startsWith('document:')).length);

  const nodesWithResolvedReferences = nodes.map((node) => ({
    ...node,
    externalReferences: (rebuiltReferences.get(node.id) ?? []).map((reference) => {
      const sourceId =
        reference.kind === 'scripture' && reference.canonicalLabel
          ? `scripture:${slugSegment(reference.canonicalLabel)}`
          : (() => {
              const parsed = parseDocumentReference(reference);
              if (!parsed) {
                return null;
              }

              const candidate = `document:${slugSegment(parsed.documentId)}:${slugSegment(parsed.citation)}`;
              return externalSources[candidate] ? candidate : null;
            })();

      return {
        ...reference,
        sourceId: sourceId && externalSources[sourceId] ? sourceId : null,
      };
    }),
  }));

  return {
    externalSources,
    nodes: nodesWithResolvedReferences,
  };
}

function computePageRank(nodesById, edges) {
  const ids = Array.from(nodesById.keys()).sort((a, b) => a - b);
  const count = ids.length;
  const idToIndex = new Map(ids.map((id, index) => [id, index]));
  const outgoing = ids.map(() => []);

  for (const edge of edges) {
    const sourceIndex = idToIndex.get(edge.source);
    const targetIndex = idToIndex.get(edge.target);

    if (sourceIndex === undefined || targetIndex === undefined) {
      continue;
    }

    outgoing[sourceIndex].push(targetIndex);
  }

  let scores = new Array(count).fill(1 / count);
  const damping = 0.85;

  for (let iteration = 0; iteration < 45; iteration += 1) {
    const next = new Array(count).fill((1 - damping) / count);

    for (let sourceIndex = 0; sourceIndex < count; sourceIndex += 1) {
      const targets = outgoing[sourceIndex];

      if (targets.length === 0) {
        const share = (damping * scores[sourceIndex]) / count;
        for (let targetIndex = 0; targetIndex < count; targetIndex += 1) {
          next[targetIndex] += share;
        }
        continue;
      }

      const share = (damping * scores[sourceIndex]) / targets.length;
      for (const targetIndex of targets) {
        next[targetIndex] += share;
      }
    }

    scores = next;
  }

  return new Map(ids.map((id, index) => [id, scores[index]]));
}

function computeLayout(nodes, edges) {
  const partCenters = {
    Prologue: { x: -520, y: -180 },
    'Profession of Faith': { x: 520, y: -260 },
    'Celebration of the Christian Mystery': { x: 640, y: 260 },
    'Life in Christ': { x: -120, y: 460 },
    'Christian Prayer': { x: -640, y: 220 },
  };

  const simulationNodes = nodes.map((node) => ({
    id: node.id,
    part: node.part,
    radius: node.visualRadius,
    x: partCenters[node.part]?.x ?? 0,
    y: partCenters[node.part]?.y ?? 0,
  }));

  const simulationLinks = edges.map((edge) => ({
    source: edge.source,
    target: edge.target,
  }));

  const simulation = forceSimulation(simulationNodes)
    .force(
      'link',
      forceLink(simulationLinks)
        .id((node) => node.id)
        .distance(18)
        .strength(0.035),
    )
    .force('charge', forceManyBody().strength(-18))
    .force('collide', forceCollide().radius((node) => node.radius + 1.4))
    .force('x', forceX().x((node) => partCenters[node.part]?.x ?? 0).strength(0.06))
    .force('y', forceY().y((node) => partCenters[node.part]?.y ?? 0).strength(0.06))
    .force('center', forceCenter(0, 0))
    .stop();

  for (let tick = 0; tick < 320; tick += 1) {
    simulation.tick();
  }

  return new Map(
    simulationNodes.map((node) => [
      node.id,
      {
        x: Number(node.x?.toFixed(2) ?? 0),
        y: Number(node.y?.toFixed(2) ?? 0),
      },
    ]),
  );
}

async function writeLanguagePacks(packs) {
  await mkdir(languageOutputDir, { recursive: true });

  for (const pack of packs) {
    const filePath = path.join(languageOutputDir, `${pack.language}.json`);
    await writeFile(filePath, JSON.stringify(pack, null, 2));
  }
}

async function buildBaseGraphPayload() {
  try {
    const existing = await readFile(outputPath, 'utf8');
    const parsed = JSON.parse(existing);
    const maxRelativePagerank = Math.max(
      ...(parsed?.nodes?.map((node) => node.relativePagerank ?? 0) ?? [0]),
    );
    const hasSuspiciousPrologueAssignments =
      parsed?.nodes?.some((node) => node.id > 25 && node.part === 'Prologue') ?? false;
    if (
      parsed?.nodes?.length > 0 &&
      parsed?.edges?.length > 0 &&
      maxRelativePagerank > 1 &&
      !hasSuspiciousPrologueAssignments
    ) {
      return parsed;
    }
  } catch {
    // Fall through to a fresh build.
  }

  const vaticanLookup = await buildVaticanPageLookup();
  const paragraphs = [];

  for (const query of sectionQueries) {
    const sectionParagraphs = await fetchSection(query, vaticanLookup);
    paragraphs.push(...sectionParagraphs);
  }

  const nodesById = new Map();
  for (const paragraph of paragraphs) {
    nodesById.set(paragraph.id, paragraph);
  }

  const nodes = normalizeParagraphHierarchy(
    Array.from(nodesById.values()).sort((a, b) => a.id - b.id),
    vaticanLookup,
  );
  const edges = [];
  const incoming = new Map(nodes.map((node) => [node.id, []]));

  for (const node of nodes) {
    for (const target of node.xrefs) {
      if (!nodesById.has(target)) {
        continue;
      }

      edges.push({ source: node.id, target });
      incoming.get(target)?.push(node.id);
    }
  }

  const pageRanks = computePageRank(nodesById, edges);
  const maxScore = Math.max(...pageRanks.values());

  const enrichedNodes = nodes.map((node) => {
    const score = pageRanks.get(node.id) ?? 0;
    const linkCount = node.xrefs.length + (incoming.get(node.id) ?? []).length;
    const normalizedScore =
      linkCount === 0 || maxScore === 0 ? 0 : (score / maxScore) * 100;
    const relativeScore = normalizedScore / 100;

    return {
      ...node,
      incoming: (incoming.get(node.id) ?? []).sort((a, b) => a - b),
      pagerank: Number(score.toFixed(8)),
      relativePagerank: Number(normalizedScore.toFixed(1)),
      visualRadius: Number((2.1 + relativeScore * 5.4).toFixed(2)),
    };
  });

  const positions = computeLayout(enrichedNodes, edges);

  return {
    generatedAt: new Date().toISOString(),
    source: {
      corpus: 'https://www.vatican.va/archive/ENG0015/_INDEX.HTM',
      graph: apiUrl,
    },
    stats: {
      paragraphs: enrichedNodes.length,
      references: edges.length,
      externalReferences: enrichedNodes.reduce(
        (count, node) => count + node.externalReferences.length,
        0,
      ),
    },
    nodes: enrichedNodes.map((node) => ({
      ...node,
      position: positions.get(node.id) ?? { x: 0, y: 0 },
    })),
    edges,
  };
}

async function main() {
  debugLog('loading base payload');
  const basePayload = await buildBaseGraphPayload();
  debugLog('base payload ready', basePayload.nodes.length, 'nodes');
  const externalPayload = await buildExternalSourcePayload(
    basePayload.nodes,
    basePayload.externalSources ?? {},
  );
  debugLog('external payload ready', Object.keys(externalPayload.externalSources).length, 'sources');
  const payload = {
    ...basePayload,
    nodes: externalPayload.nodes,
    externalSources: externalPayload.externalSources,
    stats: {
      ...basePayload.stats,
      externalReferences: externalPayload.nodes.reduce(
        (count, node) => count + node.externalReferences.length,
        0,
      ),
    },
  };
  const skipLanguagePacks = process.env.SKIP_LANGUAGE_PACKS === '1';
  const packs = skipLanguagePacks
    ? []
    : await buildLanguagePacks(new Set(payload.nodes.map((node) => node.id)));

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, JSON.stringify(payload, null, 2));
  if (!skipLanguagePacks) {
    await writeLanguagePacks(packs);
  }

  console.log(
    `Wrote ${payload.stats.paragraphs} paragraphs and ${payload.stats.references} references to ${outputPath}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
