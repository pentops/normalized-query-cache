import { useMemo } from 'react';
import { type Schema } from 'normalizr';
import { useQueryClient } from '@tanstack/react-query';
import { preloadData } from '../core';
import type { NormalizedEntity } from '../types';

export function usePreloadDataFromNormalizedCache<Data, NormalizedEntityKeys extends keyof Data | undefined>(
  schema: Schema,
  dataToPreload: NormalizedEntity<Data, NormalizedEntityKeys>,
) {
  const client = useQueryClient();
  const cache = client.getQueryCache();

  return useMemo(() => {
    return preloadData(cache, schema, dataToPreload);
  }, [cache, schema, dataToPreload]);
}
