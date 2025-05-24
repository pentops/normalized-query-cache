import { schema as normalizrSchema } from 'normalizr';

export type IDType = string | number;

export type NormalizedEntity<T = unknown, K extends keyof T | undefined = undefined, Id = IDType> = {
  [P in keyof T]: P extends K
    ? T[P] extends NormalizedEntity<any, any, any>[] // Check if T[P] is an array type
      ? Id[]
      : Id | undefined
    : T[P];
};

export interface PSMEvent<TStateData = any, TKeys = any, TEvent = any, TStatus extends string = string> {
  id: string;
  // format: uint64
  sequence: string;
  // format: date-time
  timestamp: string;
  entityName: string;
  eventType: string;
  eventData: {
    '!type': string;
    'value': TEvent;
  };
  entityKeys: {
    '!type': string;
    'value': TKeys;
  };
  entityState: {
    '!type': string;
    'value': TStateData;
  };
  entityStatus: TStatus;
}

export type PSMEventUpdater = <TState = any, TKeys = any, TEvent = any>(
  event: PSMEvent<TState, TKeys, TEvent>,
) => { entity: normalizrSchema.Entity; data: TState; deleteEntity?: boolean; forceAdd?: boolean } | undefined;
