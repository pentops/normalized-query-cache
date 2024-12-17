import { QueryCache } from '@tanstack/react-query';
import type { Schema } from 'normalizr';
import { QueryNormalizationCache } from './query-cache';
import type { NormalizedEntity } from '../types';

export function preloadData<Data, NormalizedEntityKeys extends keyof Data | undefined>(cache: QueryCache, schema: Schema, dataToPreload: NormalizedEntity<Data, NormalizedEntityKeys>) {
  if (!(cache instanceof QueryNormalizationCache)) {
    console.warn('preloadData should only be used with a NormalizedCache instance');
    return undefined;
  }

  return cache.preloadData(schema, dataToPreload);
}
