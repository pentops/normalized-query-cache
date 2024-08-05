import { QueryCache, type QueryCacheNotifyEvent } from '@tanstack/react-query';
import { P, match } from 'ts-pattern';
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

    match(event)
      .with({ type: 'added' }, e => {
        if (e.query.state.data) {
          this.entityCache.processEventData(e.query, e.query.options.initialData);
        } else if (e.query.options.meta?.initialNormalizedData) {
          this.entityCache.processEventData(e.query, e.query.options.meta.initialNormalizedData);
        }
      })
      .with({ type: 'updated', action: { data: P.not(P.nullish)} }, e => {
        this.entityCache.processEventData(e.query, e.action.data);
      })
      .with({ type: 'removed' }, e => {
        this.entityCache.removeQuery(e.query);
      })
      .otherwise(() => {})
  }

  reset(): void {

  }
}
