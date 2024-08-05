import { QueryClient, type QueryClientConfig } from '@tanstack/react-query';
import { MutationNormalizationCache, NormalizationEntityCache, QueryNormalizationCache } from './core';

export function buildNormalizedQueryClient(config?: QueryClientConfig): QueryClient {
  const normalizationEntityCache = new NormalizationEntityCache();

  return new QueryClient({
    ...config,
    queryCache: new QueryNormalizationCache(normalizationEntityCache),
    mutationCache: new MutationNormalizationCache(normalizationEntityCache),
  })
}

export * from './core';
export * from './hooks';
export * from './types';
