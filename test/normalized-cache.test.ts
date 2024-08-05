import {
  FetchInfiniteQueryOptions,
  FetchQueryOptions,
  hashKey,
  MutationOptions,
  QueryClient,
} from '@tanstack/react-query';
import { schema } from 'normalizr';
import { buildNormalizedQueryClient, NormalizedEntity, QueryNormalizationCache } from '../src';

interface Sport {
  id: number;
  name: string;
}

interface TennisPlayer {
  id: number;
  firstName: string;
  lastName: string;
  rank: number;
  sport: Sport;
}

interface GetPlayerResponse {
  player: TennisPlayer;
}

interface ListPlayerResponse {
  players: TennisPlayer[];
  page?: number;
}

const sportEntity = new schema.Entity('sport', {}, { idAttribute: 'id' });
const tennisPlayerEntity = new schema.Entity('tennis-player', { sport: sportEntity }, { idAttribute: 'id' });
const getPlayerResponseSchema = new schema.Object<GetPlayerResponse>({ player: tennisPlayerEntity });
const listPlayerResponseSchema = new schema.Object<ListPlayerResponse>({ players: [tennisPlayerEntity] });

const mockSportData: Sport = {
  id: 1,
  name: 'tennis',
}

const mockData: TennisPlayer[] = [
  {
    id: 1,
    rank: 1,
    firstName: 'Jannik',
    lastName: 'Sinner',
    sport: mockSportData,
  },
  {
    id: 2,
    rank: 2,
    firstName: 'Novak',
    lastName: 'Djoković',
    sport: mockSportData,
  },
  {
    id: 3,
    rank: 3,
    firstName: 'Carlos',
    lastName: 'Alcaraz',
    sport: mockSportData,
  },
  {
    id: 4,
    rank: 4,
    firstName: 'Alexander',
    lastName: 'Zverev',
    sport: mockSportData,
  },
  {
    id: 5,
    rank: 5,
    firstName: 'Daniil',
    lastName: 'Medvedev',
    sport: mockSportData,
  },
];

function getQueryKey(id: number | undefined) {
  return id !== undefined ? [tennisPlayerEntity.key, id] : [tennisPlayerEntity.key];
}

function buildQueryOptions(id: number | undefined): FetchQueryOptions<GetPlayerResponse | undefined> {
  return {
    queryKey: getQueryKey(id),
    queryFn: () => {
      const player = mockData.find(player => player.id === id);

      return player ? { player } : undefined;
    },
    meta: { normalizationSchema: getPlayerResponseSchema },
  };
}

function buildInfiniteQueryOptions(pageSize: number = 2): FetchInfiniteQueryOptions<ListPlayerResponse | undefined> {
  return {
    queryKey: [tennisPlayerEntity.key],
    queryFn: ({ pageParam }) => {
      const nextPlayers = mockData.slice(pageParam as number - 1, pageParam as number * pageSize);

      return {
        players: nextPlayers,
        page: pageParam as number + 1,
      }
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage : ListPlayerResponse | undefined) => lastPage?.page,
    meta: { normalizationSchema: listPlayerResponseSchema },
  }
}

function buildMutationOptions(): MutationOptions<GetPlayerResponse, Error, Partial<TennisPlayer>> {
  return {
    mutationKey: [tennisPlayerEntity.key, 'update'],
    mutationFn: async (req: Partial<TennisPlayer>) => {
      const player = mockData.find(p => p.id === req.id);
      return { player: { ...player, ...req } } as GetPlayerResponse;
    },
    meta: { normalizationSchema: getPlayerResponseSchema },
  }
}

describe('NormalizedCache', () => {
  let client: QueryClient;

  beforeEach(() => {
    client = buildNormalizedQueryClient({});
  });

  function getNormalizedQueryCache() {
    const cache = client.getQueryCache();

    if (!(cache instanceof QueryNormalizationCache)) {
      fail('Expected client query cache to be instanceOf `QueryNormalizationCache`');
    }

    // It should initially be empty
    expect(cache.entityCache.normalizedResponses).toStrictEqual({});
    expect(cache.entityCache.entities).toStrictEqual({});

    return cache;
  }

  it('should populate the normalized cache when data is returned', async () => {
    const cache = getNormalizedQueryCache();

    for (const player of mockData) {
      const data = await client.fetchQuery<GetPlayerResponse | undefined>(buildQueryOptions(player.id));
      expect(data).toStrictEqual({ player });
    }

    expect(cache.entityCache.normalizedResponses).toStrictEqual(mockData.reduce((acc, curr) => ({
      ...acc,
      [hashKey(getQueryKey(curr.id))]: { player: curr.id },
    }), {}));

    expect(cache.entityCache.entities).toStrictEqual({
      [sportEntity.key]: {
        [`${mockSportData.id}`]: mockSportData,
      },
      [tennisPlayerEntity.key]: mockData.reduce<Record<string, NormalizedEntity<TennisPlayer, 'sport'>>>((acc, curr) => {
        const { sport, ...rest } = curr;

        return {
          ...acc,
          [`${rest.id}`]: { ...rest, sport: sport.id, },
        };
      }, {}),
    });

    // Ensure cached data is returned as intended
    for (const player of mockData) {
      const state = client.getQueryState<GetPlayerResponse | undefined>(getQueryKey(player.id));
      expect(state?.data).toStrictEqual({ player });
    }
  });

  it('should create an opportunity to preload individual results from a list', async() => {
    const cache = getNormalizedQueryCache();
    await client.fetchInfiniteQuery(buildInfiniteQueryOptions());
    const firstPlayer = mockData[0];

    const { sport, ...restOfPlayer } = firstPlayer;

    expect(cache.entityCache.entities[tennisPlayerEntity.key][firstPlayer.id]).toStrictEqual({
      ...restOfPlayer,
      sport: sport.id,
    });

    const preloadData = cache.preloadData(getPlayerResponseSchema, { player: firstPlayer.id });

    expect(preloadData).toStrictEqual({ player: firstPlayer });
  });

  it('should update cached values on mutation', async () => {
    const cache = getNormalizedQueryCache();
    const player = mockData[0];
    const updatedPlayer = { ...player, rank: mockData.length + 1 };

    const data = await client.fetchQuery<GetPlayerResponse | undefined>(buildQueryOptions(player.id));

    expect(data).toStrictEqual({ player });

    const { sport, ...restOfPlayer } = player;
    expect(cache.entityCache.entities[tennisPlayerEntity.key][player.id]).toStrictEqual({
      ...restOfPlayer,
      sport: sport.id,
    });

    const mutation = client.getMutationCache().build(client, buildMutationOptions());
    const mutationData = await mutation.execute(updatedPlayer);

    expect(mutationData).toStrictEqual({ player: updatedPlayer });

    const { sport: updatedPlayerSport, ...restOfUpdatedPlayer } = updatedPlayer;
    expect(cache.entityCache.entities[tennisPlayerEntity.key][player.id]).toStrictEqual({
      ...restOfUpdatedPlayer,
      sport: updatedPlayerSport.id,
    });
  });

  it('should handle deleting entities from the cache', async () => {
    const cache = getNormalizedQueryCache();
    await client.fetchInfiniteQuery(buildInfiniteQueryOptions(mockData.length));

    expect(cache.entityCache.normalizedResponses).toStrictEqual({
      [hashKey([tennisPlayerEntity.key])]: {
        pageParams: [1],
        pages: [
          {
            page: 2,
            players: mockData.map(data => data.id),
          }
        ]
      },
    });

    expect(cache.entityCache.entities).toStrictEqual({
      [sportEntity.key]: {
        [`${mockSportData.id}`]: mockSportData,
      },
      [tennisPlayerEntity.key]: mockData.reduce<Record<string, NormalizedEntity<TennisPlayer, 'sport'>>>((acc, curr) => {
        const { sport, ...rest } = curr;

        return {
          ...acc,
          [`${rest.id}`]: { ...rest, sport: sport.id, },
        };
      }, {}),
    });

    cache.entityCache.deleteEntity(tennisPlayerEntity, mockData[0].id);

    expect(cache.entityCache.normalizedResponses).toStrictEqual({
      [hashKey([tennisPlayerEntity.key])]: {
        pageParams: [1],
        pages: [
          {
            page: 2,
            players: mockData.reduce<number[]>((acc, curr) => {
              if (curr.id === mockData[0].id) {
                return acc;
              }

              return [
                ...acc,
                curr.id,
              ];
            }, []),
          }
        ]
      },
    });

    const expectedPlayersWithRemovedNumberOne = mockData.reduce<Record<string, NormalizedEntity<TennisPlayer, 'sport'>>>((acc, curr) => {
      if (curr.id === mockData[0].id) {
        return acc;
      }

      const { sport, ...rest } = curr;

      return {
        ...acc,
        [`${rest.id}`]: { ...rest, sport: sport.id, },
      };
    }, {});

    expect(cache.entityCache.entities).toStrictEqual({
      [sportEntity.key]: {
        [`${mockSportData.id}`]: mockSportData,
      },
      [tennisPlayerEntity.key]: expectedPlayersWithRemovedNumberOne,
    });

    cache.entityCache.deleteEntity(sportEntity, mockSportData.id);

    expect(cache.entityCache.entities).toStrictEqual({
      [sportEntity.key]: {},
      [tennisPlayerEntity.key]: expectedPlayersWithRemovedNumberOne,
    });
  });
});
