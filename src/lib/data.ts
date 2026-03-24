import { useEffect, useState } from 'react';

import type { CatechismData } from '../types';

type LoadState = {
  data: CatechismData | null;
  error: string | null;
  loading: boolean;
};

export function useCatechismData(): LoadState {
  const [state, setState] = useState<LoadState>({
    data: null,
    error: null,
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;

    fetch('/data/catechism-graph.json')
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Failed to load graph data (${response.status})`);
        }

        return response.json() as Promise<CatechismData>;
      })
      .then((data) => {
        if (cancelled) {
          return;
        }

        setState({
          data,
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
  }, []);

  return state;
}
