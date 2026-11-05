import { describe, expect, it } from 'vitest';
import { matchesPlace, roadtripStats, sortPlaces } from './helpers';
import type { RoadtripPlace } from './types';

function place(overrides: Partial<RoadtripPlace> & Pick<RoadtripPlace, 'id'>): RoadtripPlace {
  return {
    id: overrides.id,
    name: '箱根',
    nameJa: '箱根',
    prefectureCode: '14',
    prefectureName: '神奈川县',
    region: '关东',
    lat: 35.232,
    lng: 139.106,
    category: 'onsen',
    status: 'visited',
    visitedOn: '2026-10-01',
    note: '温泉',
    rating: 5,
    createdByName: '小雨',
    visitedByName: '小雨',
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('roadtrip helpers', () => {
  it('counts visited, planned, prefectures and regions', () => {
    const stats = roadtripStats([
      place({ id: 'a' }),
      place({ id: 'b', prefectureCode: '22', prefectureName: '静冈县', region: '中部' }),
      place({ id: 'c', status: 'planned', visitedOn: null, visitedByName: null }),
    ]);
    expect(stats.visited).toBe(2);
    expect(stats.planned).toBe(1);
    expect(stats.prefectureCount).toBe(2);
    expect(stats.regions).toEqual(['关东', '中部']);
    expect(stats.completion).toBe(67);
  });

  it('searches names, prefectures, notes and categories', () => {
    expect(matchesPlace(place({ id: 'a' }), '箱根')).toBe(true);
    expect(matchesPlace(place({ id: 'a' }), '神奈川')).toBe(true);
    expect(matchesPlace(place({ id: 'a' }), '温泉')).toBe(true);
    expect(matchesPlace(place({ id: 'a' }), '大阪')).toBe(false);
  });

  it('sorts planned before visited and visited newest first', () => {
    const result = sortPlaces([
      place({ id: 'old', visitedOn: '2025-01-01' }),
      place({ id: 'new', visitedOn: '2026-10-01' }),
      place({ id: 'plan', status: 'planned', visitedOn: null, visitedByName: null }),
    ]);
    expect(result.map((entry) => entry.id)).toEqual(['plan', 'new', 'old']);
  });
});
