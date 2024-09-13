import { MutationCache, type MutationCacheNotifyEvent } from '@tanstack/react-query';
import { NormalizationEntityCache } from './normalization-entity-cache';

export class MutationNormalizationCache extends MutationCache {
  entityCache: NormalizationEntityCache;

  constructor(entityCache: NormalizationEntityCache, ...args: ConstructorParameters<typeof MutationCache>) {
    super(...args);

    this.entityCache = entityCache;
  }

  notify(event: MutationCacheNotifyEvent): void {
    super.notify(event);

    switch (event.type) {
      case 'updated':
        this.entityCache.processEventData(event.mutation, 'data' in event.action ? event.action.data : undefined);
        break;
    }
  }

  clear(): void {
    super.clear();
    this.entityCache.reset();
  }
}
