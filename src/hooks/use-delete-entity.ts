import { useCallback } from 'react';
import { schema as normalizrSchema } from 'normalizr';
import { useQueryClient } from '@tanstack/react-query';
import { QueryNormalizationCache } from '../core';
import type { IDType } from '../types';

export function useDeleteEntity() {
  const client = useQueryClient();
  const cache = client.getQueryCache();

  return useCallback(
    <T = IDType>(entity: normalizrSchema.Entity, entityId: T) => {
      if (!(cache instanceof QueryNormalizationCache)) {
        console.warn('useDeleteEntity should only be used with a NormalizedCache instance');
        return;
      }

      cache.entityCache.deleteEntity<T>(entity, entityId);
    },
    [cache],
  );
}
