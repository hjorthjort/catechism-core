import { useEffect, useState } from 'react';

import type { CatechismData, LanguagePack } from '../types';
import type { AppLanguage } from './i18n';

type LoadState = {
  data: CatechismData | null;
  error: string | null;
  loading: boolean;
};

let graphPromise: Promise<CatechismData> | null = null;
const packPromises = new Map<AppLanguage, Promise<LanguagePack | null>>();

function loadGraph() {
  if (!graphPromise) {
    graphPromise = fetch('/data/catechism-graph.json').then(async (response) => {
      if (!response.ok) {
        throw new Error(`Failed to load graph data (${response.status})`);
      }

      return response.json() as Promise<CatechismData>;
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

  const promise = fetch(`/data/languages/${language}.json`)
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
        });
      });

    return () => {
      cancelled = true;
    };
  }, [language]);

  return state;
}
