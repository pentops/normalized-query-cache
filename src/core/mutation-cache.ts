import { MutationCache, type MutationCacheNotifyEvent } from "@tanstack/react-query";
import { match, P } from 'ts-pattern';
import { NormalizationEntityCache } from './normalization-entity-cache';

export class MutationNormalizationCache extends MutationCache {
  entityCache: NormalizationEntityCache;

  constructor(entityCache: NormalizationEntityCache, ...args: ConstructorParameters<typeof MutationCache>) {
    super(...args);

    this.entityCache = entityCache;
  }

  notify(event: MutationCacheNotifyEvent): void {
    super.notify(event);

    match(event)
      .with({ type: 'updated' }, e => {
        this.entityCache.processEventData(e.mutation, match(e.action).with({ data: P.not(P.nullish) }, a => a.data).otherwise(() => undefined));
      })
      .otherwise(() => {});
  }
}
