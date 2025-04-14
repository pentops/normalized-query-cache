import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { PSMEvent } from '../types';
import { QueryNormalizationCache } from '../core';

export function useProcessPSMEvent() {
  const client = useQueryClient();
  const cache = client.getQueryCache();

  return useCallback(
    <TState = any, TKeys = any, TEvent = any>(psmEvent: PSMEvent<TState, TKeys, TEvent>) => {
      if (!(cache instanceof QueryNormalizationCache)) {
        console.warn('useProcessPSMEvent should only be used with a NormalizedCache instance');
        return;
      }

      if (!cache.entityCache.psmEventUpdater) {
        console.warn('No psmEventUpdater function provided in NormalizationEntityCache');
        return;
      }

      cache.entityCache.processPSMEvent(psmEvent);
    },
    [cache],
  );
}
