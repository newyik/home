import type { RoadtripPlace, Region } from './types';
import { ROADTRIP_CATEGORY_MAP } from './types';

export type RoadtripStats = {
  total: number;
  visited: number;
  planned: number;
  prefectureCount: number;
  prefectures: string[];
  regions: Region[];
  completion: number;
};

export function roadtripStats(places: RoadtripPlace[]): RoadtripStats {
  const visited = places.filter((place) => place.status === 'visited');
  const planned = places.filter((place) => place.status === 'planned');
  const prefectures = [...new Set(visited.map((place) => place.prefectureName))];
  const regions = [...new Set(visited.map((place) => place.region))] as Region[];

  return {
    total: places.length,
    visited: visited.length,
    planned: planned.length,
    prefectureCount: prefectures.length,
    prefectures,
    regions,
    completion: places.length === 0 ? 0 : Math.round((visited.length / places.length) * 100),
  };
}

export function matchesPlace(place: RoadtripPlace, query: string): boolean {
  const value = query.trim().toLowerCase();
  if (!value) return true;
  return [
    place.name,
    place.nameJa,
    place.prefectureName,
    place.region,
    place.note,
    ROADTRIP_CATEGORY_MAP[place.category].label,
  ]
    .join(' ')
    .toLowerCase()
    .includes(value);
}

export function sortPlaces(places: RoadtripPlace[]): RoadtripPlace[] {
  return [...places].sort((a, b) => {
    if (a.status !== b.status) return a.status === 'planned' ? -1 : 1;
    if (a.status === 'visited') {
      return (b.visitedOn ?? b.updatedAt).localeCompare(a.visitedOn ?? a.updatedAt);
    }
    return b.createdAt.localeCompare(a.createdAt);
  });
}

export function formatDate(value: string | null): string {
  if (!value) return '';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

export function formatShortDate(value: string | null): string {
  if (!value) return '';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  const now = new Date();
  return new Intl.DateTimeFormat('zh-CN', {
    ...(date.getFullYear() === now.getFullYear() ? {} : { year: 'numeric' }),
    month: 'short',
    day: 'numeric',
  }).format(date);
}
