import { PREFECTURES, nearestPrefecture } from './prefectures';
import type { RoadtripCategory } from './types';

export type OnlinePlace = {
  id: string;
  name: string;
  displayName: string;
  lat: number;
  lng: number;
  category: RoadtripCategory;
  prefectureCode: string;
};

type NominatimAddress = {
  state?: string;
  province?: string;
  region?: string;
  city?: string;
  town?: string;
  village?: string;
};

type NominatimResult = {
  place_id?: number;
  osm_type?: string;
  osm_id?: number;
  lat: string;
  lon: string;
  name?: string;
  display_name: string;
  class?: string;
  type?: string;
  address?: NominatimAddress;
};

const cache = new Map<string, OnlinePlace[]>();
let lastRequestAt = 0;

function mapCategory(result: NominatimResult): RoadtripCategory {
  const value = `${result.class ?? ''} ${result.type ?? ''}`.toLowerCase();
  if (/hot_spring|onsen|spa/.test(value)) return 'onsen';
  if (/restaurant|cafe|fast_food|food|bar|pub|bakery/.test(value)) return 'food';
  if (/shrine|temple|place_of_worship|monastery/.test(value)) return 'shrine';
  if (/theme_park|zoo|aquarium|amusement|water_park/.test(value)) return 'park';
  if (/city|town|village|municipality|administrative/.test(value)) return 'city';
  if (/peak|mountain|island|beach|viewpoint|water|bay|park|nature|wood|forest|waterfall/.test(value)) {
    return 'nature';
  }
  return 'other';
}

function resolvePrefecture(result: NominatimResult): string {
  const haystack = [
    result.display_name,
    result.address?.state,
    result.address?.province,
    result.address?.region,
    result.address?.city,
    result.address?.town,
    result.address?.village,
  ]
    .filter(Boolean)
    .join(' ');

  const match = PREFECTURES.find((prefecture) => {
    const variants = [
      prefecture.name,
      prefecture.nameJa,
      prefecture.name.replace(/[县府]$/, ''),
      prefecture.nameJa.replace(/[県府]$/, ''),
    ].filter(Boolean);
    return variants.some((variant) => haystack.includes(variant));
  });

  if (match) return match.code;
  return nearestPrefecture(Number(result.lat), Number(result.lon)).code;
}

function toOnlinePlace(result: NominatimResult): OnlinePlace | null {
  const lat = Number(result.lat);
  const lon = Number(result.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  const name = (result.name || result.display_name.split(',')[0] || '').trim();
  if (!name) return null;

  return {
    id: `${result.osm_type ?? 'place'}-${result.osm_id ?? result.place_id ?? `${lat}-${lon}`}`,
    name,
    displayName: result.display_name,
    lat,
    lng: lon,
    category: mapCategory(result),
    prefectureCode: resolvePrefecture(result),
  };
}

export async function searchOnlinePlaces(
  query: string,
  signal?: AbortSignal,
): Promise<OnlinePlace[]> {
  const clean = query.trim();
  if (clean.length < 2) return [];

  const cacheKey = clean.toLowerCase();
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const wait = Math.max(0, 1_100 - (Date.now() - lastRequestAt));
  if (wait > 0) {
    await new Promise<void>((resolve) => setTimeout(resolve, wait));
  }
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  lastRequestAt = Date.now();

  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('q', clean);
  url.searchParams.set('countrycodes', 'jp');
  url.searchParams.set('limit', '6');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('accept-language', 'zh,ja,en');

  const response = await fetch(url.toString(), {
    signal,
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`在线搜索失败（${response.status}）`);
  }

  const data = (await response.json()) as NominatimResult[];
  const seen = new Set<string>();
  const places: OnlinePlace[] = [];

  for (const item of data) {
    const place = toOnlinePlace(item);
    if (!place) continue;
    const key = `${place.lat.toFixed(4)},${place.lng.toFixed(4)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    places.push(place);
  }

  cache.set(cacheKey, places);
  return places;
}
