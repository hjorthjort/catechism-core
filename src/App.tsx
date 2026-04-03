import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import {
  BrowserRouter,
  Link,
  Navigate,
  NavLink,
  Route,
  Routes,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom';

import { GraphCanvas } from './components/GraphCanvas';
import { useCatechismData } from './lib/data';
import { getInitialLanguage, getLanguageMeta, hierarchyWords, languages, uiStrings } from './lib/i18n';
import type { AppLanguage } from './lib/i18n';
import { buildNodeColorMap } from './lib/nodePalette';
import type { CatechismData, CatechismNode, DailyScheduleData } from './types';

const brandKicker = 'CCC';
const brandTitle = 'CCC Explorer';
const buildHash = import.meta.env.VITE_GIT_COMMIT_HASH ?? 'unknown';
const readCookieName = 'ccc-read-paragraph';

const extraUi: Record<
  AppLanguage,
  {
    homeTab: string;
    connectionsTab: string;
    inBriefTab: string;
    readTab: string;
    menuLabel: string;
    paragraphOfDay: string;
    liturgicalTheme: string;
    liturgicalCelebration: string;
    liturgicalSeason: string;
    liturgicalReadings: string;
    liturgicalDate: string;
    developerDate: string;
    nextYearRange: string;
    chosenParagraph: string;
    showInConnections: string;
    showInBrief: string;
    continueReading: string;
    inBriefTitle: string;
    inBriefLede: string;
    partIntro: string;
    readTitle: string;
    readLede: string;
    noParagraph: string;
    openInRead: string;
    noSearchResults: string;
  }
> = {
  en: {
    homeTab: 'Home',
    connectionsTab: 'Connections',
    inBriefTab: 'In brief',
    readTab: 'Read the CCC',
    menuLabel: 'Menu',
    paragraphOfDay: 'Paragraph of the day',
    liturgicalTheme: 'Theme',
    liturgicalCelebration: 'Celebration',
    liturgicalSeason: 'Season',
    liturgicalReadings: 'Readings',
    liturgicalDate: 'Date',
    developerDate: 'Developer date',
    nextYearRange: 'Scheduled for April 3, 2026 through April 2, 2027.',
    chosenParagraph: 'Chosen paragraph',
    showInConnections: 'See in Connections',
    showInBrief: 'See in In brief',
    continueReading: 'Continue in Read the CCC',
    inBriefTitle: 'In brief',
    inBriefLede: 'A high-level pass through the Catechism by parts and sections.',
    partIntro: 'Part opening',
    readTitle: 'Read the CCC',
    readLede: 'Continue from the paragraph you last opened in this reading view.',
    noParagraph: 'No paragraph selected',
    openInRead: 'Open in Read the CCC',
    noSearchResults: 'No results',
  },
  fr: {
    homeTab: 'Accueil',
    connectionsTab: 'Connexions',
    inBriefTab: 'En bref',
    readTab: 'Lire le CEC',
    menuLabel: 'Menu',
    paragraphOfDay: 'Paragraphe du jour',
    liturgicalTheme: 'Theme',
    liturgicalCelebration: 'Celebration',
    liturgicalSeason: 'Temps',
    liturgicalReadings: 'Lectures',
    liturgicalDate: 'Date',
    developerDate: 'Date dev',
    nextYearRange: 'Programme du 3 avril 2026 au 2 avril 2027.',
    chosenParagraph: 'Paragraphe choisi',
    showInConnections: 'Voir dans Connexions',
    showInBrief: 'Voir dans En bref',
    continueReading: 'Continuer dans Lire le CEC',
    inBriefTitle: 'En bref',
    inBriefLede: 'Une vue d’ensemble du Catechisme par parties et sections.',
    partIntro: 'Ouverture de la partie',
    readTitle: 'Lire le CEC',
    readLede: 'Reprenez au dernier paragraphe ouvert dans cette vue.',
    noParagraph: 'Aucun paragraphe selectionne',
    openInRead: 'Ouvrir dans Lire le CEC',
    noSearchResults: 'Aucun resultat',
  },
  de: {
    homeTab: 'Start',
    connectionsTab: 'Verbindungen',
    inBriefTab: 'Kurzfassung',
    readTab: 'Den KKK lesen',
    menuLabel: 'Menü',
    paragraphOfDay: 'Absatz des Tages',
    liturgicalTheme: 'Thema',
    liturgicalCelebration: 'Feier',
    liturgicalSeason: 'Zeit',
    liturgicalReadings: 'Lesungen',
    liturgicalDate: 'Datum',
    developerDate: 'Entwicklerdatum',
    nextYearRange: 'Geplant vom 3. April 2026 bis 2. April 2027.',
    chosenParagraph: 'Gewahlter Absatz',
    showInConnections: 'In Verbindungen ansehen',
    showInBrief: 'In Kurzfassung ansehen',
    continueReading: 'Im Lesemodus fortsetzen',
    inBriefTitle: 'Kurzfassung',
    inBriefLede: 'Ein Uberblick uber den Katechismus nach Teilen und Abschnitten.',
    partIntro: 'Teilauftakt',
    readTitle: 'Den KKK lesen',
    readLede: 'Machen Sie mit dem zuletzt geoffneten Absatz weiter.',
    noParagraph: 'Kein Absatz ausgewahlt',
    openInRead: 'Im Lesemodus offnen',
    noSearchResults: 'Keine Ergebnisse',
  },
  it: {
    homeTab: 'Home',
    connectionsTab: 'Connessioni',
    inBriefTab: 'In breve',
    readTab: 'Leggi il CCC',
    menuLabel: 'Menu',
    paragraphOfDay: 'Paragrafo del giorno',
    liturgicalTheme: 'Tema',
    liturgicalCelebration: 'Celebrazione',
    liturgicalSeason: 'Tempo',
    liturgicalReadings: 'Letture',
    liturgicalDate: 'Data',
    developerDate: 'Data dev',
    nextYearRange: 'Programma dal 3 aprile 2026 al 2 aprile 2027.',
    chosenParagraph: 'Paragrafo scelto',
    showInConnections: 'Vedi in Connessioni',
    showInBrief: 'Vedi in In breve',
    continueReading: 'Continua in Leggi il CCC',
    inBriefTitle: 'In breve',
    inBriefLede: 'Una lettura ad alto livello del Catechismo per parti e sezioni.',
    partIntro: 'Apertura della parte',
    readTitle: 'Leggi il CCC',
    readLede: 'Riprendi dall’ultimo paragrafo aperto in questa vista.',
    noParagraph: 'Nessun paragrafo selezionato',
    openInRead: 'Apri in Leggi il CCC',
    noSearchResults: 'Nessun risultato',
  },
  la: {
    homeTab: 'Domus',
    connectionsTab: 'Nexus',
    inBriefTab: 'Summatim',
    readTab: 'Lege CCC',
    menuLabel: 'Menu',
    paragraphOfDay: 'Paragraphus diei',
    liturgicalTheme: 'Argumentum',
    liturgicalCelebration: 'Celebratio',
    liturgicalSeason: 'Tempus',
    liturgicalReadings: 'Lectiones',
    liturgicalDate: 'Dies',
    developerDate: 'Dies dev',
    nextYearRange: 'Dispositum a die 3 Aprilis 2026 usque ad diem 2 Aprilis 2027.',
    chosenParagraph: 'Paragraphus electus',
    showInConnections: 'Vide in Nexibus',
    showInBrief: 'Vide Summatim',
    continueReading: 'Perge in Lege CCC',
    inBriefTitle: 'Summatim',
    inBriefLede: 'Conspectus altior Catechismi per partes et sectiones.',
    partIntro: 'Initium partis',
    readTitle: 'Lege CCC',
    readLede: 'Perge ab ultimo paragrapho in hac visione aperto.',
    noParagraph: 'Nullus paragraphus electus',
    openInRead: 'Aperi in Lege CCC',
    noSearchResults: 'Nulla inventa',
  },
  es: {
    homeTab: 'Inicio',
    connectionsTab: 'Conexiones',
    inBriefTab: 'En breve',
    readTab: 'Leer el CCC',
    menuLabel: 'Menu',
    paragraphOfDay: 'Parrafo del dia',
    liturgicalTheme: 'Tema',
    liturgicalCelebration: 'Celebracion',
    liturgicalSeason: 'Tiempo',
    liturgicalReadings: 'Lecturas',
    liturgicalDate: 'Fecha',
    developerDate: 'Fecha dev',
    nextYearRange: 'Programado del 3 de abril de 2026 al 2 de abril de 2027.',
    chosenParagraph: 'Parrafo elegido',
    showInConnections: 'Ver en Conexiones',
    showInBrief: 'Ver en En breve',
    continueReading: 'Continuar en Leer el CCC',
    inBriefTitle: 'En breve',
    inBriefLede: 'Una vista de alto nivel del Catecismo por partes y secciones.',
    partIntro: 'Apertura de la parte',
    readTitle: 'Leer el CCC',
    readLede: 'Continua desde el ultimo parrafo abierto en esta vista.',
    noParagraph: 'Ningun parrafo seleccionado',
    openInRead: 'Abrir en Leer el CCC',
    noSearchResults: 'Sin resultados',
  },
  pt: {
    homeTab: 'Inicio',
    connectionsTab: 'Conexoes',
    inBriefTab: 'Em resumo',
    readTab: 'Ler o CCC',
    menuLabel: 'Menu',
    paragraphOfDay: 'Paragrafo do dia',
    liturgicalTheme: 'Tema',
    liturgicalCelebration: 'Celebracao',
    liturgicalSeason: 'Tempo',
    liturgicalReadings: 'Leituras',
    liturgicalDate: 'Data',
    developerDate: 'Data dev',
    nextYearRange: 'Agendado de 3 de abril de 2026 a 2 de abril de 2027.',
    chosenParagraph: 'Paragrafo escolhido',
    showInConnections: 'Ver em Conexoes',
    showInBrief: 'Ver em Em resumo',
    continueReading: 'Continuar em Ler o CCC',
    inBriefTitle: 'Em resumo',
    inBriefLede: 'Uma leitura de alto nivel do Catecismo por partes e secoes.',
    partIntro: 'Abertura da parte',
    readTitle: 'Ler o CCC',
    readLede: 'Continue a partir do ultimo paragrafo aberto nesta vista.',
    noParagraph: 'Nenhum paragrafo selecionado',
    openInRead: 'Abrir em Ler o CCC',
    noSearchResults: 'Sem resultados',
  },
  mg: {
    homeTab: 'Fandraisana',
    connectionsTab: 'Rohy',
    inBriefTab: 'Fohifohy',
    readTab: 'Vakio ny CCC',
    menuLabel: 'Menu',
    paragraphOfDay: 'Andininy androany',
    liturgicalTheme: 'Lohahevitra',
    liturgicalCelebration: 'Fety',
    liturgicalSeason: 'Fotoana',
    liturgicalReadings: 'Vakiteny',
    liturgicalDate: 'Daty',
    developerDate: 'Daty dev',
    nextYearRange: 'Voalahatra ny 3 Aprily 2026 hatramin’ny 2 Aprily 2027.',
    chosenParagraph: 'Andininy voafidy',
    showInConnections: 'Jereo ao amin’ny Rohy',
    showInBrief: 'Jereo amin’ny Fohifohy',
    continueReading: 'Tohizo amin’ny Vakio ny CCC',
    inBriefTitle: 'Fohifohy',
    inBriefLede: 'Topimaso ambony momba ny Katesizy araka ny fizarana sy sokajy.',
    partIntro: 'Fiandohan’ny fizarana',
    readTitle: 'Vakio ny CCC',
    readLede: 'Tohizo avy amin’ny andininy farany novakina teto.',
    noParagraph: 'Tsy misy andininy voafidy',
    openInRead: 'Sokafy amin’ny Vakio ny CCC',
    noSearchResults: 'Tsy misy valiny',
  },
  zh: {
    homeTab: '首頁',
    connectionsTab: '連結',
    inBriefTab: '提綱',
    readTab: '閱讀 CCC',
    menuLabel: '選單',
    paragraphOfDay: '每日段落',
    liturgicalTheme: '主題',
    liturgicalCelebration: '慶日',
    liturgicalSeason: '禮儀期',
    liturgicalReadings: '讀經',
    liturgicalDate: '日期',
    developerDate: '開發日期',
    nextYearRange: '排程涵蓋 2026 年 4 月 3 日至 2027 年 4 月 2 日。',
    chosenParagraph: '選定段落',
    showInConnections: '在連結中查看',
    showInBrief: '在提綱中查看',
    continueReading: '在閱讀 CCC 中繼續',
    inBriefTitle: '提綱',
    inBriefLede: '依照部分與節，快速閱讀《教理》的高層結構。',
    partIntro: '部分開頭',
    readTitle: '閱讀 CCC',
    readLede: '回到你上次在此閱讀頁面打開的段落。',
    noParagraph: '尚未選取段落',
    openInRead: '在閱讀 CCC 中打開',
    noSearchResults: '沒有結果',
  },
  ar: {
    homeTab: 'الرئيسية',
    connectionsTab: 'الروابط',
    inBriefTab: 'باختصار',
    readTab: 'اقرأ التعليم',
    menuLabel: 'القائمة',
    paragraphOfDay: 'فقرة اليوم',
    liturgicalTheme: 'الموضوع',
    liturgicalCelebration: 'الاحتفال',
    liturgicalSeason: 'الزمن',
    liturgicalReadings: 'القراءات',
    liturgicalDate: 'التاريخ',
    developerDate: 'تاريخ المطور',
    nextYearRange: 'الجدول من 3 أبريل 2026 الى 2 أبريل 2027.',
    chosenParagraph: 'الفقرة المختارة',
    showInConnections: 'اعرضها في الروابط',
    showInBrief: 'اعرضها في باختصار',
    continueReading: 'تابع في اقرأ التعليم',
    inBriefTitle: 'باختصار',
    inBriefLede: 'قراءة عالية المستوى للتعليم المسيحي بحسب الاجزاء والاقسام.',
    partIntro: 'افتتاح الجزء',
    readTitle: 'اقرأ التعليم',
    readLede: 'تابع من الفقرة الاخيرة التي فتحتها في هذه الواجهة.',
    noParagraph: 'لا توجد فقرة محددة',
    openInRead: 'افتح في اقرأ التعليم',
    noSearchResults: 'لا نتائج',
  },
};

type QueryOptions = {
  paragraph?: number | null;
  read?: number | null;
  date?: string | null;
  dev?: boolean;
  hash?: string | null;
};

type PanelLink = {
  label: string;
  to: string;
};

type OutlineBlock = {
  key: string;
  anchor: string;
  kind: 'part-intro' | 'section';
  title: string;
  nodeIds: number[];
};

type OutlineSection = {
  key: string;
  anchor: string;
  title: string;
  introBlock: OutlineBlock | null;
  chapters: OutlineBlock[];
};

type OutlinePart = {
  key: string;
  anchor: string;
  title: string;
  introBlock: OutlineBlock | null;
  sections: OutlineSection[];
};

function fmtScore(score: number) {
  return score.toFixed(score === 0 || score === 100 ? 0 : 1);
}

function countExternalKinds(node: CatechismNode) {
  return node.externalReferences.reduce(
    (counts, reference) => {
      counts[reference.kind] += 1;
      return counts;
    },
    { scripture: 0, document: 0 },
  );
}

function collectDirectConnections(nodeMap: Map<number, CatechismNode>, centerNode: CatechismNode) {
  const relations = new Map<
    number,
    {
      node: CatechismNode;
      incoming: boolean;
      outgoing: boolean;
    }
  >();

  for (const targetId of centerNode.xrefs) {
    if (targetId === centerNode.id) {
      continue;
    }

    const targetNode = nodeMap.get(targetId);
    if (!targetNode) {
      continue;
    }

    relations.set(targetId, {
      node: targetNode,
      incoming: relations.get(targetId)?.incoming ?? false,
      outgoing: true,
    });
  }

  for (const sourceId of centerNode.incoming) {
    if (sourceId === centerNode.id) {
      continue;
    }

    const sourceNode = nodeMap.get(sourceId);
    if (!sourceNode) {
      continue;
    }

    relations.set(sourceId, {
      node: sourceNode,
      incoming: true,
      outgoing: relations.get(sourceId)?.outgoing ?? false,
    });
  }

  return [...relations.values()].sort((a, b) => a.node.id - b.node.id);
}

function getNodeHeading(node: CatechismNode, language: AppLanguage, paragraphLabel: string) {
  return language === 'en' ? node.title : `${paragraphLabel} ${node.id}`;
}

function getParagraphSubtitle(node: CatechismNode, language: AppLanguage) {
  return language === 'en' ? node.title : node.preview;
}

function getPartLabel(node: CatechismNode, language: AppLanguage) {
  const t = uiStrings[language];
  const key = node.part as keyof typeof t.parts;
  return t.parts[key] ?? node.part;
}

function getHierarchyWord(language: AppLanguage, kind: keyof typeof hierarchyWords.en) {
  return hierarchyWords[language]?.[kind] ?? hierarchyWords.en[kind];
}

function splitHierarchyEntry(entry: string | undefined) {
  if (!entry) {
    return null;
  }

  const match = entry.match(/^(Part|Section|Chapter|Article)\s+([^:]+):\s*(.+)$/i);
  if (match) {
    return {
      kind: match[1],
      number: match[2].trim(),
      title: match[3].trim(),
    };
  }

  const fallbackMatch = entry.match(/^(Chapter|Article)\s+(.+)$/i);
  if (fallbackMatch) {
    return {
      kind: fallbackMatch[1],
      number: null,
      title: fallbackMatch[2].trim(),
    };
  }

  return null;
}

function getHierarchyEntryTitle(
  node: CatechismNode,
  rawEntry: string | undefined,
  entry: ReturnType<typeof splitHierarchyEntry>,
  language: AppLanguage,
  hierarchyTitles: Record<string, string> | undefined,
) {
  if (!entry) {
    return null;
  }

  const kind = entry.kind.toLowerCase() as 'part' | 'section' | 'chapter' | 'article';
  const fallbackTitle = kind === 'part' ? getPartLabel(node, language) : entry.title;

  return (rawEntry ? hierarchyTitles?.[rawEntry] : null) ?? fallbackTitle;
}

function getLocalizedBreadcrumb(
  node: CatechismNode,
  entry: string,
  language: AppLanguage,
  hierarchyTitles: Record<string, string> | undefined,
) {
  const parsed = splitHierarchyEntry(entry);
  if (!parsed) {
    return entry;
  }

  const title = getHierarchyEntryTitle(node, entry, parsed, language, hierarchyTitles);
  const kind = parsed.kind.toLowerCase() as 'part' | 'section' | 'chapter' | 'article';
  const word = getHierarchyWord(language, kind);

  return parsed.number ? `${word} ${parsed.number}: ${title}` : `${word}: ${title}`;
}

function getNodeHierarchy(
  node: CatechismNode,
  language: AppLanguage,
  hierarchyTitles: Record<string, string> | undefined,
) {
  const partEntry = node.breadcrumbs.find((entry) => entry.startsWith('Part '));
  const sectionEntry = node.breadcrumbs.find((entry) => entry.startsWith('Section '));
  const chapterEntry = node.breadcrumbs.find((entry) => entry.startsWith('Chapter '));
  const articleEntry = node.breadcrumbs.find((entry) => entry.startsWith('Article '));
  const part = splitHierarchyEntry(partEntry);
  const section = splitHierarchyEntry(sectionEntry);
  const chapter = splitHierarchyEntry(chapterEntry);
  const article = splitHierarchyEntry(articleEntry);
  const partWord = getHierarchyWord(language, 'part');
  const sectionWord = getHierarchyWord(language, 'section');
  const chapterWord = getHierarchyWord(language, 'chapter');
  const articleWord = getHierarchyWord(language, 'article');

  return {
    part: part
      ? {
          label: `${partWord} ${part.number}: ${getHierarchyEntryTitle(node, partEntry, part, language, hierarchyTitles)}`,
        }
      : {
          label: `${partWord}: ${getPartLabel(node, language)}`,
        },
    section: section
      ? {
          label: `${sectionWord} ${section.number}: ${getHierarchyEntryTitle(node, sectionEntry, section, language, hierarchyTitles)}`,
        }
      : null,
    chapter: chapter
      ? {
          label: `${chapterWord}: ${getHierarchyEntryTitle(node, chapterEntry, chapter, language, hierarchyTitles)}`,
        }
      : null,
    article: article
      ? {
          label: `${articleWord}: ${getHierarchyEntryTitle(node, articleEntry, article, language, hierarchyTitles)}`,
        }
      : null,
  };
}

function getExternalSourceBadge(source: CatechismData['externalSources'][string] | undefined) {
  if (!source) {
    return null;
  }

  if (source.translationStatus === 'ai') {
    return 'Translated with AI';
  }

  if (source.translationStatus === 'official') {
    return 'Official Vatican text';
  }

  return source.sourceLabel;
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  if (target.isContentEditable) {
    return true;
  }

  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

function buildRouteUrl(path: string, language: AppLanguage, options: QueryOptions = {}) {
  const searchParams = new URLSearchParams();

  if (language !== 'en') {
    searchParams.set('lang', language);
  }

  if (options.dev) {
    searchParams.set('dev', 'true');
  }

  if (options.paragraph !== undefined && options.paragraph !== null) {
    searchParams.set('paragraph', String(options.paragraph));
  }

  if (options.read !== undefined && options.read !== null) {
    searchParams.set('read', String(options.read));
  }

  if (options.date) {
    searchParams.set('date', options.date);
  }

  const query = searchParams.toString();
  const hash = options.hash ? `#${options.hash}` : '';
  return `${path}${query ? `?${query}` : ''}${hash}`;
}

function getLocalTodayIso() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function clampDateToSchedule(dateIso: string | null, schedule: DailyScheduleData) {
  if (!dateIso) {
    return schedule.entries[0]?.date ?? null;
  }

  if (dateIso < schedule.source.rangeStart) {
    return schedule.source.rangeStart;
  }

  if (dateIso > schedule.source.rangeEnd) {
    return schedule.source.rangeEnd;
  }

  return schedule.entries.find((entry) => entry.date === dateIso)?.date ?? schedule.entries[0]?.date ?? null;
}

function readCookieNumber(name: string) {
  const cookie = document.cookie
    .split('; ')
    .find((entry) => entry.startsWith(`${name}=`))
    ?.split('=')
    .slice(1)
    .join('=');

  if (!cookie) {
    return null;
  }

  const value = Number(cookie);
  return Number.isFinite(value) ? value : null;
}

function writeCookieNumber(name: string, value: number) {
  document.cookie = `${name}=${value}; path=/; max-age=${60 * 60 * 24 * 365}`;
}

function slugifyAnchor(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function getSectionAnchor(node: CatechismNode) {
  const sectionEntry = node.breadcrumbs.find((entry) => entry.startsWith('Section '));
  if (sectionEntry) {
    return `section-${slugifyAnchor(sectionEntry)}`;
  }

  const partEntry = node.breadcrumbs.find((entry) => entry.startsWith('Part '));
  if (partEntry) {
    return `part-${slugifyAnchor(partEntry)}`;
  }

  return `part-${slugifyAnchor(node.part)}`;
}

function buildOutlineParts(
  nodes: CatechismNode[],
  language: AppLanguage,
  hierarchyTitles: Record<string, string> | undefined,
) {
  const orderedNodes = [...nodes].sort((a, b) => a.id - b.id);
  const parts: OutlinePart[] = [];
  const partIndex = new Map<string, OutlinePart>();

  for (const node of orderedNodes) {
    const partEntry = node.breadcrumbs.find((entry) => entry.startsWith('Part '));
    const sectionEntry = node.breadcrumbs.find((entry) => entry.startsWith('Section '));
    const chapterEntry = node.breadcrumbs.find((entry) => entry.startsWith('Chapter '));
    const articleEntry = node.breadcrumbs.find((entry) => entry.startsWith('Article '));
    const partKey = partEntry ?? `part:${node.part}`;
    let part = partIndex.get(partKey);

    if (!part) {
      const partTitle = partEntry
        ? getLocalizedBreadcrumb(node, partEntry, language, hierarchyTitles)
        : getPartLabel(node, language);

      part = {
        key: partKey,
        anchor: `part-${slugifyAnchor(partEntry ?? node.part)}`,
        title: partTitle,
        introBlock: null,
        sections: [],
      };
      partIndex.set(partKey, part);
      parts.push(part);
    }

    if (sectionEntry && !chapterEntry) {
      let section = part.sections.find((entry) => entry.key === sectionEntry);
      if (!section) {
        section = {
          key: sectionEntry,
          anchor: `section-${slugifyAnchor(sectionEntry)}`,
          title: getLocalizedBreadcrumb(node, sectionEntry, language, hierarchyTitles),
          introBlock: {
            key: `${sectionEntry}:intro`,
            anchor: `section-${slugifyAnchor(sectionEntry)}-opening`,
            kind: 'section',
            title: getLocalizedBreadcrumb(node, sectionEntry, language, hierarchyTitles),
            nodeIds: [],
          },
          chapters: [],
        };
        part.sections.push(section);
      }

      if (!section.introBlock) {
        section.introBlock = {
          key: `${sectionEntry}:intro`,
          anchor: `section-${slugifyAnchor(sectionEntry)}-opening`,
          kind: 'section',
          title: getLocalizedBreadcrumb(node, sectionEntry, language, hierarchyTitles),
          nodeIds: [],
        };
      }

      section.introBlock.nodeIds.push(node.id);
      continue;
    }

    if (sectionEntry && chapterEntry && !articleEntry) {
      let section = part.sections.find((entry) => entry.key === sectionEntry);
      if (!section) {
        section = {
          key: sectionEntry,
          anchor: `section-${slugifyAnchor(sectionEntry)}`,
          title: getLocalizedBreadcrumb(node, sectionEntry, language, hierarchyTitles),
          introBlock: null,
          chapters: [],
        };
        part.sections.push(section);
      }

      let chapter = section.chapters.find((entry) => entry.key === chapterEntry);
      if (!chapter) {
        chapter = {
          key: chapterEntry,
          anchor: `chapter-${slugifyAnchor(chapterEntry)}`,
          kind: 'section',
          title: getLocalizedBreadcrumb(node, chapterEntry, language, hierarchyTitles),
          nodeIds: [],
        };
        section.chapters.push(chapter);
      }

      chapter.nodeIds.push(node.id);
      continue;
    }

    if (!sectionEntry && !chapterEntry) {
      if (!part.introBlock) {
        part.introBlock = {
          key: `${part.key}:intro`,
          anchor: `${part.anchor}-opening`,
          kind: 'part-intro',
          title: part.title,
          nodeIds: [],
        };
      }

      part.introBlock.nodeIds.push(node.id);
    }
  }

  return parts;
}

function ParagraphLinks({ links }: { links: PanelLink[] }) {
  if (links.length === 0) {
    return null;
  }

  return (
    <div className="paragraph-panel-links">
      {links.map((link) => (
        <Link className="button button-ghost" key={link.to} to={link.to}>
          {link.label}
        </Link>
      ))}
    </div>
  );
}

function FocusCard({
  node,
  language,
  onOpenNode,
  openLabel,
}: {
  node: CatechismNode;
  language: AppLanguage;
  onOpenNode: (id: number) => void;
  openLabel: string;
}) {
  const t = uiStrings[language];
  const panelExternalCounts = countExternalKinds(node);

  return (
    <div className="focus-card focus-card-overlay">
      <p className="eyebrow">{t.focusedNode}</p>
      <h2>
        {t.paragraph} {node.id}
      </h2>
      <dl>
        <div>
          <dt>{t.outgoing}</dt>
          <dd>{node.xrefs.length}</dd>
        </div>
        <div>
          <dt>{t.incoming}</dt>
          <dd>{node.incoming.length}</dd>
        </div>
        <div>
          <dt>{t.rank}</dt>
          <dd>{fmtScore(node.relativePagerank)}</dd>
        </div>
        <div>
          <dt>{t.scripture}</dt>
          <dd>{panelExternalCounts.scripture}</dd>
        </div>
        <div>
          <dt>{t.document}</dt>
          <dd>{panelExternalCounts.document}</dd>
        </div>
      </dl>
      <button className="button" onClick={() => onOpenNode(node.id)} type="button">
        {openLabel}
      </button>
    </div>
  );
}

function ParagraphCard({
  node,
  data,
  language,
  nodeColors,
  previousNode,
  nextNode,
  onPrevious,
  onNext,
  links = [],
}: {
  node: CatechismNode;
  data: CatechismData;
  language: AppLanguage;
  nodeColors: ReturnType<typeof buildNodeColorMap>;
  previousNode?: CatechismNode | null;
  nextNode?: CatechismNode | null;
  onPrevious?: (() => void) | null;
  onNext?: (() => void) | null;
  links?: PanelLink[];
}) {
  const t = uiStrings[language];
  const panelExternalCounts = countExternalKinds(node);
  const panelHierarchy = getNodeHierarchy(node, language, data.hierarchyTitles);
  const panelTone = nodeColors.get(node.id) ?? null;
  const panelStyle = panelTone
    ? ({
        '--panel-accent': panelTone.solid,
        '--panel-accent-soft': panelTone.soft,
        '--panel-accent-wash': panelTone.wash,
        '--panel-accent-border': panelTone.border,
        '--panel-accent-ink': panelTone.ink,
      } as CSSProperties)
    : undefined;

  return (
    <article className="paragraph-body selected-paragraph" style={panelStyle}>
      <ParagraphLinks links={links} />

      <div className="selected-paragraph-header">
        <button
          aria-label={`Previous ${t.paragraph.toLowerCase()}`}
          className="paragraph-nav-button"
          disabled={!previousNode || !onPrevious}
          onClick={() => onPrevious?.()}
          type="button"
        >
          ‹
        </button>

        <div className="selected-paragraph-summary">
          <div>
            <div className="paragraph-hierarchy">
              <div>{panelHierarchy.part.label}</div>
              {panelHierarchy.section ? <div>{panelHierarchy.section.label}</div> : null}
              {panelHierarchy.chapter ? <div>{panelHierarchy.chapter.label}</div> : null}
              {panelHierarchy.article ? <div>{panelHierarchy.article.label}</div> : null}
            </div>
            <h2>
              {t.paragraph} {node.id}
            </h2>
            <p className="lede">{getParagraphSubtitle(node, language)}</p>
          </div>

          <div className="paragraph-metrics">
            <span>
              {node.xrefs.length} {t.outgoing}
            </span>
            <span>
              {node.incoming.length} {t.incoming}
            </span>
            <span>
              {panelExternalCounts.scripture} {t.scripture}
            </span>
            <span>
              {panelExternalCounts.document} {t.document}
            </span>
          </div>
        </div>

        <button
          aria-label={`Next ${t.paragraph.toLowerCase()}`}
          className="paragraph-nav-button"
          disabled={!nextNode || !onNext}
          onClick={() => onNext?.()}
          type="button"
        >
          ›
        </button>
      </div>

      <div className="breadcrumb-trail">
        {node.breadcrumbs.map((crumb) => (
          <span key={crumb}>{getLocalizedBreadcrumb(node, crumb, language, data.hierarchyTitles)}</span>
        ))}
      </div>

      <div className="paragraph-text" dangerouslySetInnerHTML={{ __html: node.textHtml }} />

      {node.vaticanSource ? (
        <section className="source-link-block">
          <h3>{t.sourceMaterial}</h3>
          <a className="source-link" href={node.vaticanSource.url} rel="noreferrer" target="_blank">
            {t.openSource}
            <span>{node.vaticanSource.file}</span>
          </a>
        </section>
      ) : null}

      {node.externalReferences.length > 0 ? (
        <section className="external-references-block">
          <h3>{t.externalReferences}</h3>
          <div className="external-reference-list">
            {node.externalReferences.map((reference) => (
              <div className={`external-reference ${reference.kind}`} key={reference.id}>
                <span className="reference-kind">
                  {reference.kind === 'scripture' ? t.scripture : t.document}
                </span>
                <strong>
                  {t.footnote} {reference.footnoteNumber}
                </strong>
                <p>{reference.label}</p>
                {reference.sourceId && data.externalSources[reference.sourceId] ? (
                  <div className="external-reference-source">
                    <div className="external-reference-source-header">
                      <strong>{data.externalSources[reference.sourceId].title}</strong>
                      {getExternalSourceBadge(data.externalSources[reference.sourceId]) ? (
                        <span className="external-source-badge">
                          {getExternalSourceBadge(data.externalSources[reference.sourceId])}
                        </span>
                      ) : null}
                    </div>
                    <p className="external-reference-citation">
                      {data.externalSources[reference.sourceId].citation}
                    </p>
                    {data.externalSources[reference.sourceId].translationNote ? (
                      <p className="external-reference-note">
                        {data.externalSources[reference.sourceId].translationNote}
                      </p>
                    ) : null}
                    <div
                      className="external-reference-content"
                      dangerouslySetInnerHTML={{
                        __html: data.externalSources[reference.sourceId].contentHtml,
                      }}
                    />
                    <a
                      className="source-link external-source-link"
                      href={data.externalSources[reference.sourceId].url}
                      rel="noreferrer"
                      target="_blank"
                    >
                      {t.openSource}
                      <span>{data.externalSources[reference.sourceId].sourceLabel}</span>
                    </a>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {node.footnotes.length > 0 ? (
        <section className="footnotes-block">
          <h3>{t.footnotes}</h3>
          <div className="footnotes-list">
            {node.footnotes.map((note) => (
              <div className="footnote-item" key={note.id}>
                <strong>{note.number}.</strong>
                <span dangerouslySetInnerHTML={{ __html: note.html }} />
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </article>
  );
}

function RelatedPassages({
  node,
  nodeMap,
  language,
  onSelect,
}: {
  node: CatechismNode;
  nodeMap: Map<number, CatechismNode>;
  language: AppLanguage;
  onSelect: (id: number) => void;
}) {
  const t = uiStrings[language];
  const relations = useMemo(() => collectDirectConnections(nodeMap, node), [nodeMap, node]);

  return (
    <section className="related-passages">
      <div className="section-heading">
        <p className="eyebrow">{t.focusedNode}</p>
        <h2>
          {t.linksOut} / {t.linksIn}
        </h2>
      </div>

      <div className="related-passage-list">
        {relations.map((relation) => (
          <article className="related-passage-card" key={relation.node.id}>
            <div className="related-passage-header">
              <div>
                <p className="eyebrow">{getPartLabel(relation.node, language)}</p>
                <h3>
                  {t.paragraph} {relation.node.id}
                </h3>
              </div>

              <div className="relation-badges">
                {relation.outgoing ? <span>{t.linksOut}</span> : null}
                {relation.incoming ? <span>{t.linksIn}</span> : null}
              </div>
            </div>

            <p className="related-passage-preview">{getParagraphSubtitle(relation.node, language)}</p>
            <div
              className="paragraph-text related-passage-text"
              dangerouslySetInnerHTML={{ __html: relation.node.textHtml }}
            />
            <button className="button button-ghost" onClick={() => onSelect(relation.node.id)} type="button">
              {t.readParagraph}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

function SearchSidebar({
  data,
  language,
  activeNode,
  openLabel,
  onOpenNode,
  onHoverNode,
}: {
  data: CatechismData;
  language: AppLanguage;
  activeNode: CatechismNode | null;
  openLabel: string;
  onOpenNode: (id: number) => void;
  onHoverNode?: (id: number | null) => void;
}) {
  const t = uiStrings[language];
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const nodeMap = useMemo(() => new Map(data.nodes.map((node) => [node.id, node])), [data.nodes]);

  const results = useMemo(() => {
    const search = deferredQuery.trim().toLowerCase();
    if (!search) {
      return [];
    }

    const numericMatch = search.match(/\d+/);
    const numericId = numericMatch ? Number(numericMatch[0]) : null;
    const exactNumericNode =
      numericId !== null && Number.isFinite(numericId) && nodeMap.has(numericId) ? nodeMap.get(numericId) ?? null : null;

    const textResults = data.nodes.filter((node) => {
      const haystack = `${node.id} ${node.title} ${node.text} ${node.part}`.toLowerCase();
      return haystack.includes(search);
    });

    const deduped = exactNumericNode
      ? [exactNumericNode, ...textResults.filter((node) => node.id !== exactNumericNode.id)]
      : textResults;

    return deduped.slice(0, 14);
  }, [data.nodes, deferredQuery, nodeMap]);

  useEffect(() => {
    return () => onHoverNode?.(null);
  }, [onHoverNode]);

  function updateHover(id: number | null) {
    onHoverNode?.(id);
  }

  return (
    <aside className="explore-sidebar">
      <div className="section-heading">
        <p className="eyebrow">{t.explorerEyebrow}</p>
        <h2>{t.explorerTitle}</h2>
      </div>

      <label className="search-field">
        <span>{t.searchLabel}</span>
        <input
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t.searchPlaceholder}
          type="search"
          value={query}
        />
      </label>

      <div className="search-results">
        {results.map((node) => (
          <div
            className={`search-result ${activeNode?.id === node.id ? 'is-active' : ''}`}
            key={node.id}
            onMouseEnter={() => updateHover(node.id)}
            onMouseLeave={() => updateHover(null)}
          >
            <button className="search-result-main" onClick={() => onOpenNode(node.id)} type="button">
              <strong>
                {t.paragraph} {node.id}
              </strong>
              <span>{getNodeHeading(node, language, t.paragraph)}</span>
              <small>{node.preview}</small>
            </button>
            <button className="search-result-open" onClick={() => onOpenNode(node.id)} type="button">
              {openLabel}
            </button>
          </div>
        ))}

        {deferredQuery.trim().length > 0 && results.length === 0 ? (
          <div className="search-empty">{extraUi[language].noSearchResults}</div>
        ) : null}
      </div>
    </aside>
  );
}

function PageLayout({ sidebar, children }: { sidebar: ReactNode; children: ReactNode }) {
  return (
    <main className="page page-workspace">
      <section className="workspace-section">
        <div className="explore-page">
          {sidebar}
          <div className="workspace-main">{children}</div>
        </div>
      </section>
    </main>
  );
}

function ConnectionsPage({
  data,
  language,
  buildHref,
}: {
  data: CatechismData;
  language: AppLanguage;
  buildHref: (path: string, options?: QueryOptions) => string;
}) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const t = uiStrings[language];
  const nodeMap = useMemo(() => new Map(data.nodes.map((node) => [node.id, node])), [data.nodes]);
  const nodeColors = useMemo(() => buildNodeColorMap(data.nodes), [data.nodes]);
  const orderedNodes = useMemo(() => [...data.nodes].sort((a, b) => a.id - b.id), [data.nodes]);
  const selectedValue = searchParams.get('paragraph');
  const selectedId = selectedValue ? Number(selectedValue) : null;
  const hasSelected = selectedId !== null && Number.isFinite(selectedId) && nodeMap.has(selectedId);
  const [graphHoverId, setGraphHoverId] = useState<number | null>(null);
  const [sidebarHoverId, setSidebarHoverId] = useState<number | null>(null);
  const [clusterRootId, setClusterRootId] = useState<number | null>(null);
  const selectedNode = hasSelected && selectedId !== null ? nodeMap.get(selectedId) ?? null : null;
  const previewId = graphHoverId ?? sidebarHoverId;
  const previewNode = previewId !== null ? nodeMap.get(previewId) ?? null : null;
  const panelNode = previewNode ?? selectedNode ?? nodeMap.get(1) ?? orderedNodes[0] ?? null;
  const focusCardNode = selectedNode ?? nodeMap.get(1) ?? orderedNodes[0] ?? null;
  const panelIndex = panelNode ? orderedNodes.findIndex((node) => node.id === panelNode.id) : -1;
  const previousPanelNode = panelIndex > 0 ? orderedNodes[panelIndex - 1] : null;
  const nextPanelNode = panelIndex >= 0 && panelIndex < orderedNodes.length - 1 ? orderedNodes[panelIndex + 1] : null;

  const selectNode = useCallback(
    (id: number, keepCluster = false) => {
      if (selectedNode?.id === id) {
        setClusterRootId(null);
        navigate(buildHref('/connections'));
        return;
      }

      if (!keepCluster) {
        setClusterRootId(null);
      }

      navigate(buildHref('/connections', { paragraph: id }));
    },
    [buildHref, navigate, selectedNode?.id],
  );

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || isEditableTarget(event.target)) {
        return;
      }

      if (event.key === 'ArrowLeft' && previousPanelNode) {
        event.preventDefault();
        selectNode(previousPanelNode.id);
      }

      if (event.key === 'ArrowRight' && nextPanelNode) {
        event.preventDefault();
        selectNode(nextPanelNode.id);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextPanelNode, previousPanelNode, selectNode]);

  if (!panelNode) {
    return null;
  }

  return (
    <PageLayout
      sidebar={
        <SearchSidebar
          activeNode={previewNode ?? selectedNode}
          data={data}
          language={language}
          onHoverNode={setSidebarHoverId}
          onOpenNode={(id) => selectNode(id)}
          openLabel={t.searchOpen}
        />
      }
    >
      <section className="explore-canvas">
        <GraphCanvas
          caption={[t.graphZoom, t.graphPan, t.graphClickDetail]}
          clusterRootId={clusterRootId}
          edges={data.edges}
          focusId={1}
          highlightId={selectedNode?.id ?? null}
          hierarchyTitles={data.hierarchyTitles}
          hoverDelayMs={0}
          language={language}
          nodes={data.nodes}
          onBackgroundClick={() => {
            setClusterRootId(null);
            navigate(buildHref('/connections'));
          }}
          onNodeClick={(id) => selectNode(id)}
          onNodeHover={setGraphHoverId}
          onNodeLongPress={(id) => {
            setClusterRootId(id);
            selectNode(id, true);
          }}
          selectedId={selectedNode?.id ?? null}
        />
        {focusCardNode ? (
          <FocusCard language={language} node={focusCardNode} onOpenNode={(id) => selectNode(id)} openLabel={t.searchOpen} />
        ) : null}
      </section>

      <section className="selection-panel">
        <div className="selection-stack">
          <ParagraphCard
            data={data}
            language={language}
            nextNode={nextPanelNode}
            node={panelNode}
            nodeColors={nodeColors}
            onNext={nextPanelNode ? () => selectNode(nextPanelNode.id) : null}
            onPrevious={previousPanelNode ? () => selectNode(previousPanelNode.id) : null}
            previousNode={previousPanelNode}
          />
          <RelatedPassages language={language} node={panelNode} nodeMap={nodeMap} onSelect={selectNode} />
        </div>
      </section>
    </PageLayout>
  );
}

function HomePage({
  data,
  schedule,
  language,
  buildHref,
  devMode,
}: {
  data: CatechismData;
  schedule: DailyScheduleData;
  language: AppLanguage;
  buildHref: (path: string, options?: QueryOptions) => string;
  devMode: boolean;
}) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const x = extraUi[language];
  const nodeMap = useMemo(() => new Map(data.nodes.map((node) => [node.id, node])), [data.nodes]);
  const nodeColors = useMemo(() => buildNodeColorMap(data.nodes), [data.nodes]);
  const [sidebarHoverId, setSidebarHoverId] = useState<number | null>(null);
  const defaultDate = clampDateToSchedule(getLocalTodayIso(), schedule);
  const selectedDate = clampDateToSchedule(searchParams.get('date') ?? defaultDate, schedule);
  const entry = useMemo(
    () => schedule.entries.find((item) => item.date === selectedDate) ?? schedule.entries[0] ?? null,
    [schedule.entries, selectedDate],
  );
  const node = entry ? nodeMap.get(entry.paragraphId) ?? null : null;
  const sidebarNode = sidebarHoverId !== null ? nodeMap.get(sidebarHoverId) ?? node : node;

  if (!entry || !node) {
    return null;
  }

  const panelLinks = [
    { label: x.showInConnections, to: buildHref('/connections', { paragraph: node.id }) },
    { label: x.showInBrief, to: buildHref('/in-brief', { paragraph: node.id, hash: getSectionAnchor(node) }) },
    { label: x.continueReading, to: buildHref('/read', { read: node.id }) },
  ];

  return (
    <PageLayout
      sidebar={
        <SearchSidebar
          activeNode={sidebarNode}
          data={data}
          language={language}
          onHoverNode={setSidebarHoverId}
          onOpenNode={(id) => navigate(buildHref('/read', { read: id }))}
          openLabel={x.openInRead}
        />
      }
    >
      <section className="selection-panel">
        <div className="selection-stack">
          <ParagraphCard data={data} language={language} links={panelLinks} node={node} nodeColors={nodeColors} />
          <section className="home-day-card">
            <div className="day-meta-grid">
              <div>
                <span>{x.liturgicalDate}</span>
                <strong>{entry.date}</strong>
              </div>
              <div>
                <span>{x.liturgicalTheme}</span>
                <strong>{entry.themeLabel}</strong>
              </div>
              <div>
                <span>{x.liturgicalCelebration}</span>
                <strong>{entry.celebration.name}</strong>
              </div>
              <div>
                <span>{x.liturgicalSeason}</span>
                <strong>{entry.season}</strong>
              </div>
            </div>

            <p className="lede">{x.nextYearRange}</p>

            {entry.readings ? (
              <div className="liturgical-readings">
                <strong>{x.liturgicalReadings}</strong>
                <ul>
                  {entry.readings.firstReading ? <li>{entry.readings.firstReading}</li> : null}
                  {entry.readings.psalm ? <li>{entry.readings.psalm}</li> : null}
                  {entry.readings.secondReading ? <li>{entry.readings.secondReading}</li> : null}
                  {entry.readings.gospel ? <li>{entry.readings.gospel}</li> : null}
                </ul>
                {entry.readings.usccbLink ? (
                  <a className="button button-ghost" href={entry.readings.usccbLink} rel="noreferrer" target="_blank">
                    {x.liturgicalReadings}
                  </a>
                ) : null}
              </div>
            ) : null}

            {devMode ? (
              <label className="search-field dev-date-field">
                <span>{x.developerDate}</span>
                <input
                  max={schedule.source.rangeEnd}
                  min={schedule.source.rangeStart}
                  onChange={(event) => navigate(buildHref('/', { date: event.target.value || null }))}
                  type="date"
                  value={selectedDate ?? ''}
                />
              </label>
            ) : null}
          </section>
          <RelatedPassages language={language} node={node} nodeMap={nodeMap} onSelect={(id) => navigate(buildHref('/read', { read: id }))} />
        </div>
      </section>
    </PageLayout>
  );
}

function InBriefPage({
  data,
  language,
  buildHref,
}: {
  data: CatechismData;
  language: AppLanguage;
  buildHref: (path: string, options?: QueryOptions) => string;
}) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const x = extraUi[language];
  const nodeMap = useMemo(() => new Map(data.nodes.map((node) => [node.id, node])), [data.nodes]);
  const nodeColors = useMemo(() => buildNodeColorMap(data.nodes), [data.nodes]);
  const outline = useMemo(() => buildOutlineParts(data.nodes, language, data.hierarchyTitles), [data.hierarchyTitles, data.nodes, language]);
  const targetIdValue = searchParams.get('paragraph');
  const targetId = targetIdValue ? Number(targetIdValue) : null;
  const [sectionSelection, setSectionSelection] = useState<Record<string, number>>({});
  const [sidebarHoverId, setSidebarHoverId] = useState<number | null>(null);

  const sidebarNode =
    sidebarHoverId !== null ? nodeMap.get(sidebarHoverId) ?? null : targetId !== null ? nodeMap.get(targetId) ?? null : null;

  function getBlockCurrentId(block: OutlineBlock) {
    const stateId = sectionSelection[block.key];
    if (stateId !== undefined && block.nodeIds.includes(stateId)) {
      return stateId;
    }

    if (targetId !== null && Number.isFinite(targetId) && block.nodeIds.includes(targetId)) {
      return targetId;
    }

    return block.nodeIds[0];
  }

  return (
    <PageLayout
      sidebar={
        <SearchSidebar
          activeNode={sidebarNode}
          data={data}
          language={language}
          onHoverNode={setSidebarHoverId}
          onOpenNode={(id) => navigate(buildHref('/read', { read: id }))}
          openLabel={x.openInRead}
        />
      }
    >
      <section className="section-heading workspace-heading">
        <p className="eyebrow">{x.inBriefTitle}</p>
        <h1>{x.inBriefTitle}</h1>
        <p className="lede">{x.inBriefLede}</p>
      </section>

      <div className="brief-outline">
        {outline.map((part) => (
          <section className="brief-part" id={part.anchor} key={part.key}>
            <div className="brief-part-heading">
              <p className="eyebrow">{brandKicker}</p>
              <h2>{part.title}</h2>
            </div>

            {part.introBlock && part.introBlock.nodeIds.length > 0 ? (
              <div className="brief-block" id={part.introBlock.anchor}>
                <div className="brief-block-heading">
                  <p className="eyebrow">{x.partIntro}</p>
                  <h3>{part.title}</h3>
                </div>
                {(() => {
                  const currentId = getBlockCurrentId(part.introBlock);
                  const currentIndex = part.introBlock.nodeIds.indexOf(currentId);
                  const previousId = currentIndex > 0 ? part.introBlock.nodeIds[currentIndex - 1] : null;
                  const nextId =
                    currentIndex >= 0 && currentIndex < part.introBlock.nodeIds.length - 1
                      ? part.introBlock.nodeIds[currentIndex + 1]
                      : null;
                  const currentNode = nodeMap.get(currentId);

                  if (!currentNode) {
                    return null;
                  }

                  return (
                    <ParagraphCard
                      data={data}
                      language={language}
                      links={[
                        { label: x.showInConnections, to: buildHref('/connections', { paragraph: currentNode.id }) },
                        { label: x.continueReading, to: buildHref('/read', { read: currentNode.id }) },
                      ]}
                      nextNode={nextId ? nodeMap.get(nextId) ?? null : null}
                      node={currentNode}
                      nodeColors={nodeColors}
                      onNext={
                        nextId
                          ? () => setSectionSelection((current) => ({ ...current, [part.introBlock!.key]: nextId }))
                          : null
                      }
                      onPrevious={
                        previousId
                          ? () => setSectionSelection((current) => ({ ...current, [part.introBlock!.key]: previousId }))
                          : null
                      }
                      previousNode={previousId ? nodeMap.get(previousId) ?? null : null}
                    />
                  );
                })()}
              </div>
            ) : null}

            {part.sections.map((section) => (
              <div className="brief-section" id={section.anchor} key={section.key}>
                <div className="brief-block-heading">
                  <p className="eyebrow">{x.inBriefTitle}</p>
                  <h3>{section.title}</h3>
                </div>

                {section.introBlock && section.introBlock.nodeIds.length > 0
                  ? (() => {
                      const introBlock = section.introBlock;
                      if (!introBlock) {
                        return null;
                      }

                      const fallbackId = getBlockCurrentId(introBlock);
                      const currentIndex = introBlock.nodeIds.indexOf(fallbackId);
                      const previousId = currentIndex > 0 ? introBlock.nodeIds[currentIndex - 1] : null;
                      const nextId =
                        currentIndex >= 0 && currentIndex < introBlock.nodeIds.length - 1
                          ? introBlock.nodeIds[currentIndex + 1]
                          : null;
                      const currentNode = nodeMap.get(fallbackId);

                      if (!currentNode) {
                        return null;
                      }

                      return (
                        <div className="brief-block" id={introBlock.anchor}>
                          <ParagraphCard
                            data={data}
                            language={language}
                            links={[
                              { label: x.showInConnections, to: buildHref('/connections', { paragraph: currentNode.id }) },
                              { label: x.continueReading, to: buildHref('/read', { read: currentNode.id }) },
                            ]}
                            nextNode={nextId ? nodeMap.get(nextId) ?? null : null}
                            node={currentNode}
                            nodeColors={nodeColors}
                            onNext={
                              nextId
                                ? () => setSectionSelection((current) => ({ ...current, [introBlock.key]: nextId }))
                                : null
                            }
                            onPrevious={
                              previousId
                                ? () => setSectionSelection((current) => ({ ...current, [introBlock.key]: previousId }))
                                : null
                            }
                            previousNode={previousId ? nodeMap.get(previousId) ?? null : null}
                          />
                        </div>
                      );
                    })()
                  : null}

                {section.chapters.map((chapter) => {
                  const fallbackId = getBlockCurrentId(chapter);
                  const currentIndex = chapter.nodeIds.indexOf(fallbackId);
                  const previousId = currentIndex > 0 ? chapter.nodeIds[currentIndex - 1] : null;
                  const nextId =
                    currentIndex >= 0 && currentIndex < chapter.nodeIds.length - 1
                      ? chapter.nodeIds[currentIndex + 1]
                      : null;
                  const currentNode = nodeMap.get(fallbackId);

                  if (!currentNode) {
                    return null;
                  }

                  return (
                    <div className="brief-block brief-chapter" id={chapter.anchor} key={chapter.key}>
                      <div className="brief-block-heading">
                        <p className="eyebrow">{getHierarchyWord(language, 'chapter')}</p>
                        <h3>{chapter.title}</h3>
                      </div>
                      <ParagraphCard
                        data={data}
                        language={language}
                        links={[
                          { label: x.showInConnections, to: buildHref('/connections', { paragraph: currentNode.id }) },
                          { label: x.continueReading, to: buildHref('/read', { read: currentNode.id }) },
                        ]}
                        nextNode={nextId ? nodeMap.get(nextId) ?? null : null}
                        node={currentNode}
                        nodeColors={nodeColors}
                        onNext={nextId ? () => setSectionSelection((current) => ({ ...current, [chapter.key]: nextId })) : null}
                        onPrevious={
                          previousId ? () => setSectionSelection((current) => ({ ...current, [chapter.key]: previousId })) : null
                        }
                        previousNode={previousId ? nodeMap.get(previousId) ?? null : null}
                      />
                    </div>
                  );
                })}
              </div>
            ))}
          </section>
        ))}
      </div>
    </PageLayout>
  );
}

function ReadPage({
  data,
  language,
  buildHref,
}: {
  data: CatechismData;
  language: AppLanguage;
  buildHref: (path: string, options?: QueryOptions) => string;
}) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const x = extraUi[language];
  const nodeMap = useMemo(() => new Map(data.nodes.map((node) => [node.id, node])), [data.nodes]);
  const nodeColors = useMemo(() => buildNodeColorMap(data.nodes), [data.nodes]);
  const orderedNodes = useMemo(() => [...data.nodes].sort((a, b) => a.id - b.id), [data.nodes]);
  const readValue = searchParams.get('read');
  const readId = readValue ? Number(readValue) : null;
  const validReadId = readId !== null && Number.isFinite(readId) && nodeMap.has(readId) ? readId : null;
  const cookieReadId = readCookieNumber(readCookieName);
  const selectedId = validReadId ?? (cookieReadId !== null && nodeMap.has(cookieReadId) ? cookieReadId : 1);
  const [sidebarHoverId, setSidebarHoverId] = useState<number | null>(null);
  const node = nodeMap.get(selectedId) ?? orderedNodes[0] ?? null;
  const sidebarNode = sidebarHoverId !== null ? nodeMap.get(sidebarHoverId) ?? node : node;
  const nodeIndex = node ? orderedNodes.findIndex((entry) => entry.id === node.id) : -1;
  const previousNode = nodeIndex > 0 ? orderedNodes[nodeIndex - 1] : null;
  const nextNode = nodeIndex >= 0 && nodeIndex < orderedNodes.length - 1 ? orderedNodes[nodeIndex + 1] : null;

  const setReadNode = useCallback(
    (id: number) => {
      writeCookieNumber(readCookieName, id);
      navigate(buildHref('/read', { read: id }));
    },
    [buildHref, navigate],
  );

  useEffect(() => {
    if (validReadId === null && selectedId !== null) {
      navigate(buildHref('/read', { read: selectedId }), { replace: true });
    }
  }, [buildHref, navigate, selectedId, validReadId]);

  useEffect(() => {
    if (!node) {
      return;
    }

    writeCookieNumber(readCookieName, node.id);
  }, [node]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!node || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || isEditableTarget(event.target)) {
        return;
      }

      if (event.key === 'ArrowLeft' && previousNode) {
        event.preventDefault();
        setReadNode(previousNode.id);
      }

      if (event.key === 'ArrowRight' && nextNode) {
        event.preventDefault();
        setReadNode(nextNode.id);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextNode, node, previousNode, setReadNode]);

  return (
    <PageLayout
      sidebar={
        <SearchSidebar
          activeNode={sidebarNode}
          data={data}
          language={language}
          onHoverNode={setSidebarHoverId}
          onOpenNode={setReadNode}
          openLabel={x.openInRead}
        />
      }
    >
      <section className="section-heading workspace-heading">
        <p className="eyebrow">{brandKicker}</p>
        <h1>{x.readTitle}</h1>
        <p className="lede">{x.readLede}</p>
      </section>

      <section className="selection-panel">
        {node ? (
          <div className="selection-stack">
            <ParagraphCard
              data={data}
              language={language}
              links={[
                { label: x.showInConnections, to: buildHref('/connections', { paragraph: node.id }) },
                { label: x.showInBrief, to: buildHref('/in-brief', { paragraph: node.id, hash: getSectionAnchor(node) }) },
              ]}
              nextNode={nextNode}
              node={node}
              nodeColors={nodeColors}
              onNext={nextNode ? () => setReadNode(nextNode.id) : null}
              onPrevious={previousNode ? () => setReadNode(previousNode.id) : null}
              previousNode={previousNode}
            />
            <RelatedPassages language={language} node={node} nodeMap={nodeMap} onSelect={setReadNode} />
          </div>
        ) : (
          <div className="selection-empty">
            <p className="eyebrow">{brandKicker}</p>
            <h2>{x.noParagraph}</h2>
          </div>
        )}
      </section>
    </PageLayout>
  );
}

function LegacyParagraphRedirect({
  language,
  devMode,
}: {
  language: AppLanguage;
  devMode: boolean;
}) {
  const params = useParams();
  const id = params.id ? Number(params.id) : null;

  return (
    <Navigate
      replace
      to={buildRouteUrl('/connections', language, {
        dev: devMode,
        paragraph: id !== null && Number.isFinite(id) ? id : null,
      })}
    />
  );
}

function RoutedShell({
  data,
  schedule,
  language,
  onLanguageChange,
}: {
  data: CatechismData;
  schedule: DailyScheduleData;
  language: AppLanguage;
  onLanguageChange: (language: AppLanguage) => void;
}) {
  const [searchParams] = useSearchParams();
  const [menuOpen, setMenuOpen] = useState(false);
  const languageMeta = getLanguageMeta(language);
  const devMode = searchParams.get('dev') === 'true';
  const x = extraUi[language];

  const buildHref = useCallback(
    (path: string, options: QueryOptions = {}) =>
      buildRouteUrl(path, language, {
        dev: devMode,
        ...options,
      }),
    [devMode, language],
  );

  const navItems = [
    { path: '/', label: x.homeTab },
    { path: '/connections', label: x.connectionsTab },
    { path: '/in-brief', label: x.inBriefTab },
    { path: '/read', label: x.readTab },
  ];

  return (
    <div className="app-shell" dir={languageMeta.direction} lang={language}>
      <header className="site-header">
        <div className="site-header-main">
          <Link className="wordmark wordmark-inline" to={buildHref('/')}>
            <span className="wordmark-kicker">{brandKicker}</span>
            <span className="wordmark-title">{brandTitle}</span>
          </Link>

          <nav className="site-nav site-nav-desktop">
            {navItems.map((item) => (
              <NavLink
                className={({ isActive }) => (isActive ? 'is-active' : undefined)}
                key={item.path}
                to={buildHref(item.path)}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="site-header-controls">
          <button
            aria-expanded={menuOpen}
            aria-label={x.menuLabel}
            className={`menu-button ${menuOpen ? 'is-open' : ''}`}
            onClick={() => setMenuOpen((current) => !current)}
            type="button"
          >
            <span />
            <span />
            <span />
          </button>

          <div className="language-switcher" aria-label="Language selector">
            {languages.map((entry) => (
              <button
                className={entry.code === language ? 'is-active' : undefined}
                key={entry.code}
                onClick={() => onLanguageChange(entry.code)}
                title={entry.nativeLabel}
                type="button"
              >
                <span>{entry.flag}</span>
                <small>{entry.code.toUpperCase()}</small>
              </button>
            ))}
          </div>
        </div>

        <div className={`mobile-menu ${menuOpen ? 'is-open' : ''}`}>
          <nav className="site-nav site-nav-mobile">
            {navItems.map((item) => (
              <NavLink
                className={({ isActive }) => (isActive ? 'is-active' : undefined)}
                key={item.path}
                to={buildHref(item.path)}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <Routes>
        <Route path="/" element={<HomePage buildHref={buildHref} data={data} devMode={devMode} language={language} schedule={schedule} />} />
        <Route path="/connections" element={<ConnectionsPage buildHref={buildHref} data={data} language={language} />} />
        <Route path="/in-brief" element={<InBriefPage buildHref={buildHref} data={data} language={language} />} />
        <Route path="/read" element={<ReadPage buildHref={buildHref} data={data} language={language} />} />
        <Route path="/explore" element={<Navigate replace to={buildHref('/connections')} />} />
        <Route path="/paragraph/:id" element={<LegacyParagraphRedirect devMode={devMode} language={language} />} />
      </Routes>

      {devMode ? <div className="build-label">build {buildHash}</div> : null}
    </div>
  );
}

export default function App() {
  const [language, setLanguage] = useState<AppLanguage>(() => getInitialLanguage());
  const { data, schedule, error, loading } = useCatechismData(language);
  const t = uiStrings[language];

  useEffect(() => {
    window.localStorage.setItem('catholic-core-language', language);
    document.cookie = `catholic-core-language=${language}; path=/; max-age=${60 * 60 * 24 * 365}`;
    const url = new URL(window.location.href);
    if (language === 'en') {
      url.searchParams.delete('lang');
    } else {
      url.searchParams.set('lang', language);
    }
    window.history.replaceState({}, '', url);
  }, [language]);

  if (loading) {
    return (
      <main className="loading-screen">
        <p className="eyebrow">{brandKicker}</p>
        <h1>{t.loadingTitle}</h1>
      </main>
    );
  }

  if (error || !data || !schedule) {
    return (
      <main className="loading-screen">
        <p className="eyebrow">{brandKicker}</p>
        <h1>{t.errorTitle}</h1>
        <p>{error ?? 'Unknown error'}</p>
      </main>
    );
  }

  return (
    <BrowserRouter>
      <RoutedShell data={data} language={language} onLanguageChange={setLanguage} schedule={schedule} />
    </BrowserRouter>
  );
}
