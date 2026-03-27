import { execFileSync } from 'node:child_process';
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

function stripBidiMarks(value) {
  return value.replace(bidiControlPattern, '');
}

function cleanText(value) {
  return stripBidiMarks(value)
    .replace(/\u00ad/g, '')
    .replace(/\u200b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function slugTitle(value) {
  return cleanText(value)
    .replace(/\(\d+\s*-\s*\d+\)$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
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

function extractExternalReferences(footnotes) {
  const references = [];

  for (const note of footnotes) {
    const segments = splitReferenceText(note.text);
    const parts = segments.length > 0 ? segments : [note.text];

    for (const [index, segment] of parts.entries()) {
      references.push({
        id: `${note.id}:${index + 1}`,
        footnoteId: note.id,
        footnoteNumber: note.number,
        label: segment,
        kind: classifyReference(segment),
      });
    }
  }

  return references;
}

function buildPreview(text) {
  return text.length > 220 ? `${text.slice(0, 217).trimEnd()}...` : text;
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
  const fileName = encodeURIComponent(url).replaceAll('%', '_');
  const filePath = path.join(cacheDir, fileName);

  try {
    return await readFile(filePath);
  } catch {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Request failed with ${response.status} for ${url}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    await mkdir(cacheDir, { recursive: true });
    await writeFile(filePath, buffer);
    return buffer;
  }
}

async function fetchHtml(url) {
  const buffer = await getCachedBuffer(url);
  return decodeHtmlBuffer(buffer);
}

async function fetchPdfToCache(url) {
  const fileName = encodeURIComponent(url).replaceAll('%', '_');
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
    if (
      parsed?.nodes?.length > 0 &&
      parsed?.edges?.length > 0 &&
      maxRelativePagerank > 1
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

  const nodes = Array.from(nodesById.values()).sort((a, b) => a.id - b.id);
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
  const payload = await buildBaseGraphPayload();
  const nodeIds = new Set(payload.nodes.map((node) => node.id));
  const packs = await buildLanguagePacks(nodeIds);

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, JSON.stringify(payload, null, 2));
  await writeLanguagePacks(packs);

  console.log(
    `Wrote ${payload.stats.paragraphs} paragraphs and ${payload.stats.references} references to ${outputPath}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
