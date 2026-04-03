import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { calendarFor } from 'romcal';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const graphPath = path.join(rootDir, 'public', 'data', 'catechism-graph.json');
const outputPath = path.join(rootDir, 'public', 'data', 'daily-schedule.json');
const cacheDir = path.join(rootDir, 'tmp', 'build-cache', 'liturgical-schedule');

const scheduleStart = '2026-04-03';
const scheduleEnd = '2027-04-02';
const cpbjrBaseUrl = 'https://cpbjr.github.io/catholic-readings-api';

const keywordProfiles = [
  {
    key: 'good-friday',
    label: 'The sacrifice of Christ',
    paragraphIds: [612, 618, 1366],
    celebrationPatterns: [/good friday/i, /lord'?s passion/i],
    score: 200,
  },
  {
    key: 'holy-thursday',
    label: 'The Eucharist and priesthood',
    paragraphIds: [1324, 1337, 1566],
    celebrationPatterns: [/holy thursday/i, /lord'?s supper/i],
    score: 190,
  },
  {
    key: 'holy-saturday',
    label: 'Christ in the tomb and the hope of Easter',
    paragraphIds: [624, 635, 1681],
    celebrationPatterns: [/holy saturday/i, /easter vigil/i],
    score: 180,
  },
  {
    key: 'easter',
    label: 'The Resurrection',
    paragraphIds: [638, 640, 654],
    celebrationPatterns: [/easter/i],
    score: 180,
  },
  {
    key: 'pentecost',
    label: 'The Holy Spirit and the Church',
    paragraphIds: [731, 767, 1302],
    celebrationPatterns: [/pentecost/i],
    score: 180,
  },
  {
    key: 'trinity',
    label: 'The mystery of the Trinity',
    paragraphIds: [232, 234, 261],
    celebrationPatterns: [/trinity/i],
    score: 180,
  },
  {
    key: 'corpus-christi',
    label: 'The Eucharist',
    paragraphIds: [1324, 1374, 1407],
    celebrationPatterns: [/corpus christi/i, /body and blood of christ/i],
    score: 180,
  },
  {
    key: 'sacred-heart',
    label: 'The Heart of Jesus',
    paragraphIds: [478, 766, 2669],
    celebrationPatterns: [/sacred heart/i],
    score: 175,
  },
  {
    key: 'christ-king',
    label: 'Christ the King',
    paragraphIds: [668, 786, 2105],
    celebrationPatterns: [/christ the king/i],
    score: 175,
  },
  {
    key: 'mary',
    label: 'Mary and the Church',
    paragraphIds: [487, 963, 971, 2677],
    celebrationPatterns: [
      /\bmary\b/i,
      /our lady/i,
      /immaculate/i,
      /assumption/i,
      /annunciation/i,
      /visitation/i,
      /rosary/i,
      /nativity of the blessed virgin/i,
      /queenship of mary/i,
    ],
    score: 165,
  },
  {
    key: 'joseph',
    label: 'Saint Joseph and the hidden life of Jesus',
    paragraphIds: [437, 532, 1844],
    celebrationPatterns: [/\bjoseph\b/i, /holy family/i],
    score: 160,
  },
  {
    key: 'apostles',
    label: 'The apostolic Church',
    paragraphIds: [857, 858, 765],
    celebrationPatterns: [/\bapostle\b/i, /\bevangelist\b/i, /\bsaints peter and paul\b/i],
    score: 160,
  },
  {
    key: 'martyrs',
    label: 'Witness and martyrdom',
    paragraphIds: [2473, 2506, 946],
    celebrationPatterns: [/\bmartyr\b/i, /\bmartyrs\b/i],
    score: 155,
  },
  {
    key: 'pastors',
    label: 'Pastors in the service of the Church',
    paragraphIds: [874, 888, 1558],
    celebrationPatterns: [/\bbishop\b/i, /\bpastor\b/i, /\bpope\b/i],
    score: 150,
  },
  {
    key: 'priests',
    label: 'Priestly service',
    paragraphIds: [1547, 1562, 1589],
    celebrationPatterns: [/\bpriest\b/i, /\bpriests\b/i],
    score: 148,
  },
  {
    key: 'religious',
    label: 'Consecrated life',
    paragraphIds: [914, 915, 922],
    celebrationPatterns: [/\bvirgin\b/i, /\babbot\b/i, /\breligious\b/i, /\bconsecrated\b/i],
    score: 145,
  },
  {
    key: 'mission',
    label: 'Mission and evangelization',
    paragraphIds: [849, 852, 905],
    celebrationPatterns: [/\bmission/i, /\bmissionary/i, /evangel/i],
    score: 145,
  },
  {
    key: 'angels',
    label: 'The angels and their service',
    paragraphIds: [328, 332, 336],
    celebrationPatterns: [/\bangel\b/i, /\barchangel\b/i, /guardian angels/i],
    score: 145,
  },
  {
    key: 'all-saints',
    label: 'The communion of saints',
    paragraphIds: [946, 956, 2683],
    celebrationPatterns: [/all saints/i, /all souls/i],
    score: 170,
  },
  {
    key: 'mercy',
    label: 'Mercy and conversion',
    paragraphIds: [1846, 1422, 1439],
    readingPatterns: [/luke 15/i, /john 8/i, /hosea/i],
    score: 120,
  },
  {
    key: 'beatitudes',
    label: 'The Beatitudes',
    paragraphIds: [1716, 1720, 1820],
    readingPatterns: [/matthew 5/i, /luke 6/i],
    score: 120,
  },
  {
    key: 'eucharistic-discourse',
    label: 'The Bread of Life',
    paragraphIds: [1338, 1374, 2837],
    readingPatterns: [/john 6/i],
    score: 120,
  },
  {
    key: 'charity',
    label: 'Charity and the new commandment',
    paragraphIds: [1822, 1827, 1970],
    readingPatterns: [/john 13/i, /john 15/i, /1 corinthians 13/i],
    score: 118,
  },
  {
    key: 'works-of-mercy',
    label: 'Love of neighbor',
    paragraphIds: [2447, 2443, 1932],
    readingPatterns: [/matthew 25/i, /luke 10/i],
    score: 116,
  },
];

const seasonalThemes = {
  Advent: { label: 'Awaiting the Messiah', paragraphIds: [522, 524, 559, 671, 972] },
  Christmas: { label: 'The mystery of the Incarnation', paragraphIds: [456, 461, 483, 525, 526, 563] },
  Lent: { label: 'Conversion and penance', paragraphIds: [540, 1430, 1434, 2015, 2846] },
  'Holy Week': { label: 'The Paschal mystery', paragraphIds: [571, 595, 612, 618, 624] },
  Easter: { label: 'The Resurrection and life in the Spirit', paragraphIds: [638, 659, 731, 1085, 1169] },
  'Ordinary Time': { label: 'Life in Christ', paragraphIds: [426, 1691, 1700, 1812, 2013, 2558, 748, 849] },
};

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function parseIsoDate(value) {
  return new Date(`${value}T00:00:00.000Z`);
}

function enumerateDates(startIso, endIso) {
  const days = [];
  const current = parseIsoDate(startIso);
  const end = parseIsoDate(endIso);

  while (current <= end) {
    days.push(isoDate(current));
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return days;
}

function hashString(value) {
  const hash = createHash('sha1').update(value).digest('hex');
  return Number.parseInt(hash.slice(0, 8), 16);
}

async function cachedJson(url) {
  const key = createHash('sha1').update(url).digest('hex');
  const cachePath = path.join(cacheDir, `${key}.json`);

  try {
    return JSON.parse(await readFile(cachePath, 'utf8'));
  } catch {}

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url} (${response.status})`);
  }

  const data = await response.json();
  await mkdir(cacheDir, { recursive: true });
  await writeFile(cachePath, `${JSON.stringify(data, null, 2)}\n`);
  return data;
}

async function mapWithConcurrency(values, limit, mapper) {
  const results = new Array(values.length);
  let cursor = 0;

  async function worker() {
    while (cursor < values.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await mapper(values[index], index);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, values.length) }, () => worker()));
  return results;
}

function normalizeSeason(season) {
  if (!season) {
    return 'Ordinary Time';
  }

  const cleaned = String(season).trim();

  if (/holy week/i.test(cleaned)) {
    return 'Holy Week';
  }

  if (/ordinary/i.test(cleaned)) {
    return 'Ordinary Time';
  }

  if (/christmas/i.test(cleaned)) {
    return 'Christmas';
  }

  if (/advent/i.test(cleaned)) {
    return 'Advent';
  }

  if (/lent/i.test(cleaned)) {
    return 'Lent';
  }

  if (/easter/i.test(cleaned)) {
    return 'Easter';
  }

  return cleaned;
}

function pickPrimaryRomcalCelebration(calendarEntries, dateIso) {
  const matches = calendarEntries.filter((entry) => {
    if (!entry.moment) {
      return false;
    }

    const value =
      typeof entry.moment === 'string'
        ? entry.moment
        : entry.moment instanceof Date
          ? entry.moment.toISOString()
          : String(entry.moment);

    return value.startsWith(dateIso);
  });
  if (!matches.length) {
    return null;
  }

  return (
    matches.find((entry) => entry.data?.prioritized) ??
    matches.find((entry) => entry.type === 'SOLEMNITY') ??
    matches[0]
  );
}

async function loadRemoteDay(dateIso) {
  const monthDay = dateIso.slice(5);
  const calendarUrl = `${cpbjrBaseUrl}/liturgical-calendar/2026/${monthDay}.json`;
  const readingsUrl = `${cpbjrBaseUrl}/readings/2026/${monthDay}.json`;
  const [calendar, readings] = await Promise.all([cachedJson(calendarUrl), cachedJson(readingsUrl)]);

  return {
    date: dateIso,
    source: 'cpbjr',
    season: normalizeSeason(calendar.season ?? readings.season),
    celebration: {
      name: calendar.celebration?.name ?? 'Ferial Day',
      type: calendar.celebration?.type ?? 'FERIA',
      description: calendar.celebration?.description ?? '',
      quote: calendar.celebration?.quote ?? '',
    },
    readings: {
      firstReading: readings.readings?.firstReading ?? null,
      psalm: readings.readings?.psalm ?? null,
      secondReading: readings.readings?.secondReading ?? null,
      gospel: readings.readings?.gospel ?? null,
      usccbLink: readings.usccbLink ?? null,
    },
    apiLinks: {
      calendar: calendar.apiEndpoint ?? calendarUrl,
      readings: readings.apiEndpoint ?? readingsUrl,
    },
  };
}

function loadRomcalDays(dateIsos) {
  const years = [...new Set(dateIsos.map((dateIso) => Number(dateIso.slice(0, 4))))];
  const calendars = new Map(years.map((year) => [year, calendarFor({ year, country: 'unitedStates' })]));

  return dateIsos.map((dateIso) => {
    const year = Number(dateIso.slice(0, 4));
    const celebration = pickPrimaryRomcalCelebration(calendars.get(year) ?? [], dateIso);

    return {
      date: dateIso,
      source: 'romcal',
      season: normalizeSeason(celebration?.data?.season?.value ?? ''),
      celebration: {
        name: celebration?.name ?? 'Ferial Day',
        type: celebration?.type ?? 'FERIA',
        description: '',
        quote: '',
      },
      readings: null,
      apiLinks: {
        calendar: null,
        readings: null,
      },
    };
  });
}

function buildCorpus(day) {
  const readings = day.readings
    ? [day.readings.firstReading, day.readings.psalm, day.readings.secondReading, day.readings.gospel].filter(Boolean)
    : [];

  return [
    day.season,
    day.celebration.name,
    day.celebration.type,
    day.celebration.description,
    day.celebration.quote,
    ...readings,
  ]
    .filter(Boolean)
    .join(' | ');
}

function scoreProfile(profile, corpus, season) {
  let score = 0;

  for (const pattern of profile.celebrationPatterns ?? []) {
    if (pattern.test(corpus)) {
      score += profile.score;
    }
  }

  for (const pattern of profile.readingPatterns ?? []) {
    if (pattern.test(corpus)) {
      score += profile.score * 0.7;
    }
  }

  for (const pattern of profile.seasonPatterns ?? []) {
    if (pattern.test(season)) {
      score += profile.score * 0.35;
    }
  }

  return score;
}

function pickParagraphId(day, index) {
  const corpus = buildCorpus(day);
  const season = day.season ?? 'Ordinary Time';
  const scoredProfiles = keywordProfiles
    .map((profile) => ({ profile, score: scoreProfile(profile, corpus, season) }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score);

  if (scoredProfiles.length > 0) {
    const { profile } = scoredProfiles[0];
    const offset = hashString(`${day.date}:${profile.key}`);
    const paragraphId = profile.paragraphIds[offset % profile.paragraphIds.length];

    return {
      paragraphId,
      themeKey: profile.key,
      themeLabel: profile.label,
      rationale: `${day.celebration.name} in ${season}`,
    };
  }

  const seasonalTheme = seasonalThemes[season] ?? seasonalThemes['Ordinary Time'];
  const paragraphId = seasonalTheme.paragraphIds[(hashString(`${day.date}:${season}:${index}`) + index) % seasonalTheme.paragraphIds.length];

  return {
    paragraphId,
    themeKey: season.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    themeLabel: seasonalTheme.label,
    rationale: season,
  };
}

function buildScheduleEntry(day, index, nodesById) {
  const match = pickParagraphId(day, index);
  const paragraph = nodesById.get(match.paragraphId);

  if (!paragraph) {
    throw new Error(`Paragraph ${match.paragraphId} is missing from the graph data`);
  }

  return {
    date: day.date,
    paragraphId: paragraph.id,
    themeKey: match.themeKey,
    themeLabel: match.themeLabel,
    rationale: match.rationale,
    season: day.season,
    celebration: day.celebration,
    readings: day.readings,
    source: day.source,
    apiLinks: day.apiLinks,
  };
}

async function main() {
  const graph = JSON.parse(await readFile(graphPath, 'utf8'));
  const nodesById = new Map(graph.nodes.map((node) => [node.id, node]));
  const allDates = enumerateDates(scheduleStart, scheduleEnd);
  const remoteDates = allDates.filter((dateIso) => dateIso.startsWith('2026-'));
  const romcalDates = allDates.filter((dateIso) => !dateIso.startsWith('2026-'));

  const remoteDays = await mapWithConcurrency(remoteDates, 10, loadRemoteDay);
  const computedDays = loadRomcalDays(romcalDates);
  const days = [...remoteDays, ...computedDays].sort((left, right) => left.date.localeCompare(right.date));
  const entries = days.map((day, index) => buildScheduleEntry(day, index, nodesById));

  const payload = {
    generatedAt: new Date().toISOString(),
    source: {
      calendar: [
        'https://cpbjr.github.io/catholic-readings-api/',
        'https://github.com/romcal/romcal',
      ],
      rangeStart: scheduleStart,
      rangeEnd: scheduleEnd,
      basis: 'US liturgical calendar plus generated theme-to-paragraph mapping',
    },
    stats: {
      entries: entries.length,
      uniqueParagraphs: new Set(entries.map((entry) => entry.paragraphId)).size,
    },
    entries,
  };

  await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(
    `Built ${entries.length} liturgical schedule entries from ${scheduleStart} through ${scheduleEnd} (${payload.stats.uniqueParagraphs} unique paragraphs).`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
