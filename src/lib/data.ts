import { useEffect, useState } from 'preact/hooks';

import type { CatechismData, ExternalSource, LanguagePack } from '../types';
import type { AppLanguage } from './i18n';

type LoadState = {
  data: CatechismData | null;
  error: string | null;
  loading: boolean;
  language: AppLanguage | null;
};

let graphPromise: Promise<CatechismData> | null = null;
const packPromises = new Map<AppLanguage, Promise<LanguagePack | null>>();
let sourceIndexPromise: Promise<Record<string, string>> | null = null;
const sourcePromises = new Map<string, Promise<ExternalSource | null>>();

function loadGraph() {
  if (!graphPromise) {
    graphPromise = fetch('/data/reader-generated/core.json').then(async (graphResponse) => {
      if (!graphResponse.ok) {
        throw new Error('Failed to load catechism data');
      }
      return graphResponse.json() as Promise<CatechismData>;
    });
  }

  return graphPromise;
}

function loadLanguagePack(language: AppLanguage) {
  if (language === 'en') {
    return Promise.resolve(null);
  }

  const cached = packPromises.get(language);
  if (cached) {
    return cached;
  }

  const promise = fetch('/data/reader-generated/sv.json')
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`Failed to load ${language} content (${response.status})`);
      }

      return response.json() as Promise<LanguagePack>;
    })
    .catch((error: Error) => {
      console.warn(error.message);
      return null;
    });

  packPromises.set(language, promise);
  return promise;
}

function mergeData(graph: CatechismData, pack: LanguagePack | null): CatechismData {
  if (!pack) {
    return graph;
  }

  const localizedNodes = new Map(pack.nodes.map((node) => [node.id, node]));

  return {
    ...graph,
    source: {
      ...graph.source,
      corpus: pack.source.corpus,
    },
    hierarchyTitles: pack.hierarchyTitles ?? graph.hierarchyTitles ?? {},
    nodes: graph.nodes.map((node) => {
      const localized = localizedNodes.get(node.id);
      if (!localized) {
        return node;
      }

      return {
        ...node,
        ...localized,
        breadcrumbs: localized.breadcrumbs ?? node.breadcrumbs,
        headings: localized.headings ?? node.headings,
        footnotes: localized.footnotes ?? node.footnotes,
        externalReferences: localized.externalReferences ?? node.externalReferences,
        vaticanSource: localized.vaticanSource ?? node.vaticanSource,
      };
    }),
  };
}

export function useCatechismData(language: AppLanguage): LoadState {
  const [state, setState] = useState<LoadState>({
    data: null,
    error: null,
    loading: true,
    language: null,
  });

  useEffect(() => {
    let cancelled = false;

    Promise.all([loadGraph(), loadLanguagePack(language)])
      .then(([graph, pack]) => {
        if (cancelled) {
          return;
        }

        setState({
          data: mergeData(graph, pack),
          error: null,
          loading: false,
          language,
        });
      })
      .catch((error: Error) => {
        if (cancelled) {
          return;
        }

        setState({
          data: null,
          error: error.message,
          loading: false,
          language,
        });
      });

    return () => {
      cancelled = true;
    };
  }, [language]);

  return state;
}

export function loadExternalSource(sourceId: string) {
  const cached = sourcePromises.get(sourceId);
  if (cached) return cached;
  sourceIndexPromise ??= fetch('/data/reader-generated/source-index.json').then((response) => {
    if (!response.ok) throw new Error('Failed to load citation index');
    return response.json() as Promise<Record<string, string>>;
  });
  const promise = sourceIndexPromise.then(async (index) => {
    const file = index[sourceId];
    if (!file) return null;
    const response = await fetch(`/data/reader-generated/sources/${file}`);
    if (!response.ok) return null;
    return response.json() as Promise<ExternalSource>;
  }).catch(() => null);
  sourcePromises.set(sourceId, promise);
  return promise;
}
