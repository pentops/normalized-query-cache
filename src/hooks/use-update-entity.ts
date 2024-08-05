import { useCallback } from 'react';
import { schema as normalizrSchema } from 'normalizr';
import { useQueryClient } from '@tanstack/react-query';
import type { IDType, NormalizedEntity } from '../types';
import { QueryNormalizationCache } from '../core';

export function useUpdateEntity() {
  const client = useQueryClient();
  const cache = client.getQueryCache();

  return useCallback(
    (entity: normalizrSchema.Entity, entityId: IDType, updater: (prevState: NormalizedEntity) => NormalizedEntity) => {
      if (!(cache instanceof QueryNormalizationCache)) {
        console.warn('useUpdateEntity should only be used with a NormalizedCache instance');
        return;
      }

      cache.entityCache.entities[entity.key][entityId] = updater(cache.entityCache.entities[entity.key][entityId]);
    },
    [cache],
  );
}
