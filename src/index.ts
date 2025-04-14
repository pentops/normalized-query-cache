import { QueryClient, type QueryClientConfig } from '@tanstack/react-query';
import { MutationNormalizationCache, NormalizationEntityCache, NormalizationEntityCacheOptions, QueryNormalizationCache } from './core';

export function buildNormalizedQueryClient(entityCacheOptions?: NormalizationEntityCacheOptions, config?: QueryClientConfig): QueryClient {
  const normalizationEntityCache = new NormalizationEntityCache(entityCacheOptions);

  return new QueryClient({
    ...config,
    queryCache: new QueryNormalizationCache(normalizationEntityCache),
    mutationCache: new MutationNormalizationCache(normalizationEntityCache),
  });
}

export * from './core';
export * from './hooks';
export * from './types';
