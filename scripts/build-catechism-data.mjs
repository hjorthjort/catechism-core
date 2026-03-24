import { mkdir, writeFile } from 'node:fs/promises';
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

const apiUrl = 'https://www.catholiccrossreference.online/catechism/';
const sectionQueries = ['s0', 's1', 's2', 's3', 's4'];

function cleanText(value) {
  return value
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

function parseParagraphHtml(html) {
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
    const preview = text.length > 220 ? `${text.slice(0, 217).trimEnd()}...` : text;
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
      xrefs,
    });
  });

  return paragraphs;
}

async function fetchSection(query) {
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

    items.push(...parseParagraphHtml(payload.html));

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

  const positions = new Map(
    simulationNodes.map((node) => [
      node.id,
      {
        x: Number(node.x?.toFixed(2) ?? 0),
        y: Number(node.y?.toFixed(2) ?? 0),
      },
    ]),
  );

  return positions;
}

async function main() {
  const paragraphs = [];

  for (const query of sectionQueries) {
    const sectionParagraphs = await fetchSection(query);
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
    const relativeScore = maxScore === 0 ? 0 : score / maxScore;

    return {
      ...node,
      incoming: (incoming.get(node.id) ?? []).sort((a, b) => a - b),
      pagerank: Number(score.toFixed(8)),
      relativePagerank: Number(relativeScore.toFixed(6)),
      visualRadius: Number((2.1 + relativeScore * 5.4).toFixed(2)),
    };
  });

  const positions = computeLayout(enrichedNodes, edges);

  const payload = {
    generatedAt: new Date().toISOString(),
    source: {
      corpus: 'https://www.vatican.va/archive/ENG0015/_INDEX.HTM',
      graph: apiUrl,
    },
    stats: {
      paragraphs: enrichedNodes.length,
      references: edges.length,
    },
    nodes: enrichedNodes.map((node) => ({
      ...node,
      position: positions.get(node.id) ?? { x: 0, y: 0 },
    })),
    edges,
  };

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, JSON.stringify(payload, null, 2));

  console.log(`Wrote ${payload.stats.paragraphs} paragraphs and ${payload.stats.references} references to ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
