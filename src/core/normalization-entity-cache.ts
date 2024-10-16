import { Mutation, Query } from '@tanstack/react-query';
import { proxy, subscribe } from 'valtio';
import { denormalize, normalize, schema as normalizrSchema, Schema } from 'normalizr';
import deepEqual from 'fast-deep-equal';
import type { IDType, NormalizedEntity } from '../types';

export class NormalizationEntityCache {
  static getIsInfiniteQuery(query: Query | Mutation) {
    return query instanceof Query && query.options && 'getNextPageParam' in query.options;
  }

  static getNormalizationSchema(queryOrMutation: Query | Mutation) {
    const base = queryOrMutation.options.meta?.normalizationSchema as Schema | undefined;

    if (!base) {
      return undefined;
    }

    const isInfiniteQuery = NormalizationEntityCache.getIsInfiniteQuery(queryOrMutation);
    return isInfiniteQuery ? new normalizrSchema.Object({ pages: [base] }) : base;
  }

  normalizedResponses: Record<string, NormalizedEntity> = proxy({});

  entities: Record<string, Record<string, NormalizedEntity>> = proxy({});

  entityDependencies: Record<string, Record<string, Set<Query>>> = {};

  constructor() {
    this.initialize();
  }

  private initialize() {
    this.normalizedResponses = proxy({});
    this.entities = proxy({});
    this.entityDependencies = {};

    subscribe(this.entities, (state) => {
      const [op, path] = state[0];

      if (op === 'set' || op === 'delete') {
        const [entityName, entityId] = path;

        const queries = this.entityDependencies[entityName as string]?.[entityId as string];

        if (queries?.size) {
          for (const query of queries.values()) {
            const normalizationSchema = NormalizationEntityCache.getNormalizationSchema(query);

            if (normalizationSchema) {
              const denormalized = denormalize(this.normalizedResponses[query.queryHash], normalizationSchema, this.entities);

              if (!deepEqual(query.state.data, denormalized)) {
                query.setData(denormalized);
              }
            }
          }
        }
      }
    });
  }

  public reset() {
    this.initialize();
  }

  removeQuery(query: Query) {
    for (const [entityName, entities] of Object.entries(this.entityDependencies)) {
      for (const [entityId, queries] of Object.entries(entities)) {
        queries.delete(query);

        if (queries.size === 0) {
          delete this.entityDependencies[entityName][entityId];
          delete this.entities[entityName][entityId];
        }
      }
    }
  }

  private addEntities(normalizedEntities: Record<string, Record<string, NormalizedEntity>>, query?: Query) {
    for (const [entityName, entities] of Object.entries(normalizedEntities)) {
      if (!this.entities[entityName]) {
        this.entities[entityName] = proxy({});
      }

      // Add the entities for the response to the entity & entity dependency caches
      for (const [id, entity] of Object.entries(entities || {})) {
        if (query) {
          this.addEntityDependency(query, entityName, id);
        }

        if (!this.entities[entityName][id] || !deepEqual(this.entities[entityName][id], entity)) {
          this.entities[entityName][id] = entity;
        }
      }
    }
  }

  deleteEntity<T = IDType>(entity: normalizrSchema.Entity, entityId: T) {
    const entityIdAsIdType = entityId as IDType;
    const dependentQueries = this.entityDependencies[entity.key]?.[entityIdAsIdType];

    // If there are dependent queries, we need to remove the entity from the normalized response cache
    if (dependentQueries?.size) {
      let modifiedAQuery = false;

      for (const query of dependentQueries.values()) {
        if (this.normalizedResponses[query.queryHash]) {
          function removeEntityFromObject(response: NormalizedEntity<any, any, any>, parentSchema?: Schema): NormalizedEntity<any, any, any> {
            if (!response) {
              return response;
            }

            if (Array.isArray(response)) {
              return response.reduce((acc, curr) => {
                if (typeof curr === 'object') {
                  return [...acc, removeEntityFromObject(curr, parentSchema)];
                }

                if (curr === entityId && parentSchema) {
                  modifiedAQuery = true;
                  return acc;
                }

                return [...acc, curr];
              }, []);
            }

            if (typeof response === 'object') {
              return Object.entries(response).reduce((acc, [key, curr]) => {
                const baseCurrentKeySchema = (parentSchema as any)?.schema?.[key];
                const currentKeySchema = baseCurrentKeySchema && Array.isArray(baseCurrentKeySchema) ? baseCurrentKeySchema[0] : baseCurrentKeySchema;

                if (curr === entityId && currentKeySchema) {
                  modifiedAQuery = true;

                  return acc;
                }

                if (typeof curr === 'object' && currentKeySchema) {
                  return {
                    ...acc,
                    [key]: removeEntityFromObject(curr, currentKeySchema),
                  };
                }

                return {
                  ...acc,
                  [key]: curr,
                };
              }, {});
            }

            return response;
          }

          if (this.normalizedResponses[query.queryHash] === entityId) {
            delete this.normalizedResponses[query.queryHash];

            if (!dependentQueries.size) {
              delete this.entityDependencies[entity.key][entityIdAsIdType];
            }
          } else {
            const schemaToUse = NormalizationEntityCache.getNormalizationSchema(query);
            const newResponse = removeEntityFromObject(JSON.parse(JSON.stringify(this.normalizedResponses[query.queryHash])), schemaToUse);

            if (modifiedAQuery) {
              this.normalizedResponses[query.queryHash] = newResponse;
            }
          }
        }
      }
    } else if (this.entityDependencies[entity.key]) {
      // If there are no dependent queries, we can just delete the entity dependencies straight away
      delete this.entityDependencies[entity.key][entityIdAsIdType];
    }

    // Finally, delete the entity from the entities cache. Note that if there are dependent queries for the entity,
    // we aren't deleting the entityDependencies yet, as those will be deleted when the last dependent query is removed.
    // See the subscription callback in addQueryNotifier.
    delete this.entities[entity.key][entityIdAsIdType];
  }

  private addEntityDependency<T = IDType>(query: Query, entityName: string, entityId: T) {
    const entityIdAsIdType = entityId as IDType;

    if (!this.entityDependencies[entityName]) {
      this.entityDependencies[entityName] = {};
    }

    if (!this.entityDependencies[entityName][entityIdAsIdType]) {
      this.entityDependencies[entityName][entityIdAsIdType] = new Set();
    }

    this.entityDependencies[entityName][entityIdAsIdType].add(query);
  }

  preloadData<Data, DataKey extends keyof Data | undefined = undefined>(
    schema: Schema,
    preloadData: NormalizedEntity<Data, DataKey>,
    isInfiniteQuery?: boolean,
  ): Data | undefined {
    if (!preloadData) {
      return undefined;
    }

    const preloaded = (denormalize(preloadData, isInfiniteQuery ? new normalizrSchema.Object({ pages: [schema] }) : schema, this.entities) as Data);

    if (deepEqual(preloaded, preloadData)) {
      return undefined;
    }

    return preloaded;
  }

  processEventData<Data>(query: Query | Mutation, data: Data) {
    const schemaToUse = NormalizationEntityCache.getNormalizationSchema(query);

    // If no normalization schema is provided, no normalization will occur and everything will behave as with the default react-query QueryCache
    if (schemaToUse && data) {
      const normalizedData = normalize(data, schemaToUse);

      if (query instanceof Query) {
        // Store the normalized response
        this.normalizedResponses[query.queryHash] = normalizedData.result;
      }

      this.addEntities(normalizedData.entities as Record<string, Record<string, NormalizedEntity>>, query instanceof Query ? query : undefined);

      for (const [entityName, entities] of Object.entries(normalizedData.entities)) {
        if (!this.entities[entityName]) {
          this.entities[entityName] = proxy({});
        }

        // Add the entities for the response to the entity & entity dependency caches
        for (const [id, entity] of Object.entries(entities || {})) {
          if (query instanceof Query) {
            this.addEntityDependency(query, entityName, id);
          }

          if (!this.entities[entityName][id] || !deepEqual(this.entities[entityName][id], entity)) {
            this.entities[entityName][id] = entity;
          }
        }
      }
    }
  }
}
