import type { RoadtripPlace } from './roadtrip/types';

export const CATEGORIES = [
  { id: 'food', label: '食品', color: '#d9913b', soft: '#fbf0dd', icon: 'apple' },
  { id: 'daily', label: '日用品', color: '#5b84d7', soft: '#e9eefb', icon: 'sparkles' },
  { id: 'clean', label: '清洁', color: '#58977a', soft: '#e5f1ea', icon: 'spray' },
  { id: 'medicine', label: '药品', color: '#c96b84', soft: '#fae9ed', icon: 'pill' },
  { id: 'other', label: '其他', color: '#8d7aa8', soft: '#f0ebf7', icon: 'package' },
] as const;

export type Category = (typeof CATEGORIES)[number]['id'];
export type CategoryMeta = (typeof CATEGORIES)[number];

export type Account = {
  userId: string;
  email: string;
  displayName: string;
  color: string;
};

export type Member = {
  id: string;
  displayName: string;
  color: string;
  isMe: boolean;
};

export type Household = {
  id: string;
  name: string;
  inviteCode: string;
  createdAt: string;
};

export type Item = {
  id: string;
  name: string;
  quantity: string;
  note: string | null;
  category: Category;
  done: boolean;
  createdBy: string | null;
  createdByName: string;
  completedByName: string | null;
  createdAt: string;
  completedAt: string | null;
  updatedAt: string;
  pending?: boolean;
};

export type Workspace = {
  household: Household;
  members: Member[];
  items: Item[];
  places: RoadtripPlace[];
  me: Member;
};

export type NewItem = {
  name: string;
  quantity: string;
  note: string;
  category: Category;
};

export type ItemPatch = Partial<Pick<Item, 'name' | 'quantity' | 'note' | 'category' | 'done'>>;

export type DeepLink = {
  add?: string;
  quick?: boolean;
  join?: string;
  demo?: boolean;
};

export type SyncStatus = 'idle' | 'syncing' | 'error';

export const CATEGORY_MAP: Record<Category, CategoryMeta> = Object.fromEntries(
  CATEGORIES.map((category) => [category.id, category]),
) as Record<Category, CategoryMeta>;

export const DEFAULT_CATEGORY: Category = 'other';
