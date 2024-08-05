export type IDType = string | number;

export type NormalizedEntity<T = unknown, K extends keyof T | undefined = undefined, Id = IDType> = {
  [P in keyof T]: P extends K
    ? T[P] extends NormalizedEntity<any, any, any>[] // Check if T[P] is an array type
      ? Id[]
      : Id | undefined
    : T[P];
};
