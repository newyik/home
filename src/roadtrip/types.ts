export type RoadtripStatus = 'planned' | 'visited';

export type RoadtripCategory =
  | 'nature'
  | 'onsen'
  | 'city'
  | 'food'
  | 'shrine'
  | 'park'
  | 'other';

export type Region =
  | '北海道'
  | '东北'
  | '关东'
  | '中部'
  | '近畿'
  | '中国'
  | '四国'
  | '九州'
  | '冲绳';

export type Prefecture = {
  code: string;
  name: string;
  nameJa: string;
  region: Region;
  lat: number;
  lng: number;
};

export type JapanSpot = {
  id: string;
  name: string;
  nameJa: string;
  aliases: string[];
  prefectureCode: string;
  lat: number;
  lng: number;
  category: RoadtripCategory;
};

export type RoadtripPlace = {
  id: string;
  name: string;
  nameJa: string;
  prefectureCode: string;
  prefectureName: string;
  region: Region;
  lat: number;
  lng: number;
  category: RoadtripCategory;
  status: RoadtripStatus;
  visitedOn: string | null;
  note: string;
  rating: number | null;
  createdByName: string;
  visitedByName: string | null;
  createdAt: string;
  updatedAt: string;
  pending?: boolean;
};

export type RoadtripPlaceInput = {
  name: string;
  nameJa?: string;
  prefectureCode: string;
  lat: number;
  lng: number;
  category: RoadtripCategory;
  status: RoadtripStatus;
  visitedOn: string | null;
  note: string;
  rating: number | null;
};

export const ROADTRIP_CATEGORIES: Array<{
  id: RoadtripCategory;
  label: string;
  color: string;
  soft: string;
}> = [
  { id: 'nature', label: '自然', color: '#5f8f72', soft: '#e8f1e9' },
  { id: 'onsen', label: '温泉', color: '#c47058', soft: '#faeae3' },
  { id: 'city', label: '城市', color: '#5b84d7', soft: '#e9eefb' },
  { id: 'food', label: '美食', color: '#c68b35', soft: '#fbf0dd' },
  { id: 'shrine', label: '神社寺庙', color: '#9a6b8f', soft: '#f5eaf2' },
  { id: 'park', label: '乐园', color: '#d07a9b', soft: '#fbeaf0' },
  { id: 'other', label: '其他', color: '#8d7aa8', soft: '#f0ebf7' },
];

export const ROADTRIP_CATEGORY_MAP = Object.fromEntries(
  ROADTRIP_CATEGORIES.map((category) => [category.id, category]),
) as Record<RoadtripCategory, (typeof ROADTRIP_CATEGORIES)[number]>;

export const REGIONS: Region[] = [
  '北海道',
  '东北',
  '关东',
  '中部',
  '近畿',
  '中国',
  '四国',
  '九州',
  '冲绳',
];
