import { QueryCache, type QueryCacheNotifyEvent } from '@tanstack/react-query';
import { type Schema } from 'normalizr';
import { NormalizationEntityCache } from './normalization-entity-cache';
import type { NormalizedEntity } from '../types';

export class QueryNormalizationCache extends QueryCache {
  entityCache: NormalizationEntityCache;

  constructor(entityCache: NormalizationEntityCache, ...args: ConstructorParameters<typeof QueryCache>) {
    super(...args);
    this.entityCache = entityCache;
  }

  preloadData<Data = unknown, DataKey extends keyof Data | undefined = undefined>(
    schema: Schema,
    preloadData: NormalizedEntity<Data, DataKey>,
  ): Data | undefined {
    return this.entityCache.preloadData<Data, DataKey>(schema, preloadData);
  }

  notify(event: QueryCacheNotifyEvent): void {
    super.notify(event);

    switch (event.type) {
      case 'added': {
        if ('data' in event.query.state) {
          this.entityCache.processEventData(event.query, event.query.options.initialData);
        }

        break;
      }
      case 'updated': {
        this.entityCache.processEventData(event.query, 'data' in event.action ? event.action.data : undefined);
        break;
      }
      case 'removed': {
        this.entityCache.removeQuery(event.query);
        break;
      }
    }
  }

  clear(): void {
    super.clear();
    this.entityCache.reset();
  }
}
