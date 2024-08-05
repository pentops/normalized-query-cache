import { useMemo } from 'react';
import { type Schema } from 'normalizr';
import { useQueryClient } from '@tanstack/react-query';
import type { NormalizedEntity } from '../types';
import { QueryNormalizationCache } from '../core';

export function usePreloadDataFromNormalizedCache<Data, NormalizedEntityKeys extends keyof Data | undefined>(
  schema: Schema,
  preloadData: NormalizedEntity<Data, NormalizedEntityKeys>,
) {
  const client = useQueryClient();
  const cache = client.getQueryCache();

  return useMemo(() => {
    if (!(cache instanceof QueryNormalizationCache)) {
      console.warn('usePreloadDataFromNormalizedCache should only be used with a NormalizedCache instance');
      return undefined;
    }

    return cache.preloadData(schema, preloadData);
  }, [cache, schema, preloadData]);
}
