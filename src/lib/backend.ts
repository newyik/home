import type { User } from '@supabase/supabase-js';
import {
  CATEGORY_MAP,
  type Account,
  type Category,
  type Household,
  type Item,
  type ItemPatch,
  type Member,
  type NewItem,
  type Workspace,
} from '../types';
import { prefectureFor } from '../roadtrip/prefectures';
import {
  ROADTRIP_CATEGORY_MAP,
  type RoadtripPlace,
  type RoadtripPlaceInput,
} from '../roadtrip/types';
import { demoBackend } from './demo';
import { isSupabaseConfigured, supabase } from './supabase';

export type DemoIdentity = 'me' | 'partner';
export type AuthEvent = 'signed_in' | 'signed_out' | 'recovery';

export interface Backend {
  kind: 'supabase' | 'demo';
  restore(): Promise<Account | null>;
  onAuthStateChange(handler: (account: Account | null, event: AuthEvent) => void): () => void;
  signIn(email: string, password: string): Promise<Account>;
  signUp(
    email: string,
    password: string,
    displayName: string,
  ): Promise<{ account: Account | null; needsConfirmation: boolean }>;
  resetPassword(email: string): Promise<void>;
  updatePassword(password: string): Promise<void>;
  signOut(): Promise<void>;
  loadWorkspace(account: Account): Promise<Workspace | null>;
  createHousehold(account: Account, name: string, displayName: string): Promise<Workspace>;
  joinHousehold(account: Account, code: string, displayName: string): Promise<Workspace>;
  updateProfile(account: Account, displayName: string): Promise<Account>;
  addItem(householdId: string, input: NewItem): Promise<Item>;
  updateItem(id: string, patch: ItemPatch): Promise<Item>;
  deleteItem(id: string): Promise<void>;
  clearCompleted(householdId: string): Promise<void>;
  addPlace(householdId: string, input: RoadtripPlaceInput): Promise<RoadtripPlace>;
  updatePlace(id: string, input: RoadtripPlaceInput): Promise<RoadtripPlace>;
  deletePlace(id: string): Promise<void>;
  subscribe(householdId: string, onChange: () => void): () => void;
  enterDemo?: (identity: DemoIdentity) => Promise<Account>;
  switchDemoIdentity?: (identity: DemoIdentity) => Promise<Account>;
  resetDemo?: () => Promise<void>;
}

type ProfileRow = {
  id: string;
  display_name: string;
  avatar_color: string;
};

type HouseholdRow = {
  id: string;
  name: string;
  invite_code: string;
  created_at: string;
};

type MembershipRow = {
  household_id: string;
  joined_at: string;
  households: HouseholdRow | HouseholdRow[] | null;
};

type MemberRow = {
  user_id: string;
  joined_at: string;
  profiles: ProfileRow | ProfileRow[] | null;
};

type PlaceRow = {
  id: string;
  household_id: string;
  name: string;
  name_ja: string;
  prefecture_code: string;
  prefecture_name: string;
  region: string;
  lat: number;
  lng: number;
  category: string;
  status: string;
  visited_on: string | null;
  note: string;
  rating: number | null;
  created_by: string | null;
  created_by_name: string;
  visited_by_name: string | null;
  created_at: string;
  updated_at: string;
};

type ItemRow = {
  id: string;
  household_id: string;
  name: string;
  quantity: string;
  note: string | null;
  category: string;
  done: boolean;
  created_by: string | null;
  created_by_name: string | null;
  completed_by_name: string | null;
  created_at: string;
  completed_at: string | null;
  updated_at: string;
};

const AVATAR_COLORS = ['#d9613d', '#5b84d7', '#58977a', '#c96b84', '#8d7aa8', '#b58538'];
const ACCOUNT_CACHE_KEY = 'together-account';

function pickColor(seed: string): string {
  let total = 0;
  for (const char of seed) total += char.charCodeAt(0);
  return AVATAR_COLORS[total % AVATAR_COLORS.length];
}

function readCachedAccount(userId: string): Account | null {
  try {
    const raw = localStorage.getItem(ACCOUNT_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Account;
    return parsed.userId === userId ? parsed : null;
  } catch {
    return null;
  }
}

function cacheAccount(account: Account): void {
  try {
    localStorage.setItem(ACCOUNT_CACHE_KEY, JSON.stringify(account));
  } catch {
    // Ignore storage limits; the session itself still works online.
  }
}

function clearCachedAccount(): void {
  try {
    localStorage.removeItem(ACCOUNT_CACHE_KEY);
  } catch {
    // Ignore.
  }
}

function one<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function isCategory(value: string): value is Category {
  return value in CATEGORY_MAP;
}

function mapItem(row: ItemRow): Item {
  return {
    id: row.id,
    name: row.name,
    quantity: row.quantity || '1',
    note: row.note,
    category: isCategory(row.category) ? row.category : 'other',
    done: row.done,
    createdBy: row.created_by,
    createdByName: row.created_by_name ?? '有人',
    completedByName: row.completed_by_name,
    createdAt: row.created_at,
    completedAt: row.completed_at,
    updatedAt: row.updated_at,
  };
}

function mapPlace(row: PlaceRow): RoadtripPlace {
  return {
    id: row.id,
    name: row.name,
    nameJa: row.name_ja,
    prefectureCode: row.prefecture_code,
    prefectureName: row.prefecture_name,
    region: row.region as RoadtripPlace['region'],
    lat: row.lat,
    lng: row.lng,
    category:
      row.category in ROADTRIP_CATEGORY_MAP
        ? (row.category as RoadtripPlace['category'])
        : 'other',
    status: row.status === 'visited' ? 'visited' : 'planned',
    visitedOn: row.visited_on,
    note: row.note,
    rating: row.rating,
    createdByName: row.created_by_name || '有人',
    visitedByName: row.visited_by_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapHousehold(row: HouseholdRow): Household {
  return {
    id: row.id,
    name: row.name,
    inviteCode: row.invite_code,
    createdAt: row.created_at,
  };
}

class SupabaseBackend implements Backend {
  kind = 'supabase' as const;

  private get client() {
    if (!supabase) throw new Error('Supabase 还没有配置。');
    return supabase;
  }

  private async accountForUser(user: User): Promise<Account> {
    const { data: existing, error } = await this.client
      .from('profiles')
      .select('id, display_name, avatar_color')
      .eq('id', user.id)
      .maybeSingle<ProfileRow>();

    if (error) throw new Error(error.message);

    let profile = existing;
    if (!profile) {
      const metadataName =
        typeof user.user_metadata?.display_name === 'string'
          ? user.user_metadata.display_name.trim()
          : '';
      const displayName = metadataName || user.email?.split('@')[0] || '我';
      const { data: created, error: insertError } = await this.client
        .from('profiles')
        .insert({
          id: user.id,
          display_name: displayName.slice(0, 24),
          avatar_color: pickColor(user.id),
        })
        .select('id, display_name, avatar_color')
        .single<ProfileRow>();

      if (insertError) {
        const { data: retry } = await this.client
          .from('profiles')
          .select('id, display_name, avatar_color')
          .eq('id', user.id)
          .single<ProfileRow>();
        if (!retry) throw new Error(insertError.message);
        profile = retry;
      } else {
        profile = created;
      }
    }

    const account: Account = {
      userId: user.id,
      email: user.email ?? '',
      displayName: profile.display_name || '我',
      color: profile.avatar_color || pickColor(user.id),
    };
    cacheAccount(account);
    return account;
  }

  async restore(): Promise<Account | null> {
    const { data, error } = await this.client.auth.getSession();
    if (error) throw new Error(error.message);
    if (!data.session?.user) return null;
    try {
      return await this.accountForUser(data.session.user);
    } catch (caught) {
      const cached = readCachedAccount(data.session.user.id);
      if (cached) return cached;
      throw caught;
    }
  }

  onAuthStateChange(handler: (account: Account | null, event: AuthEvent) => void): () => void {
    const { data } = this.client.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') return;
      if (!session?.user) {
        clearCachedAccount();
        handler(null, 'signed_out');
        return;
      }
      const authEvent: AuthEvent = event === 'PASSWORD_RECOVERY' ? 'recovery' : 'signed_in';
      void this.accountForUser(session.user)
        .then((account) => handler(account, authEvent))
        .catch(() => handler(null, 'signed_out'));
    });
    return () => data.subscription.unsubscribe();
  }

  async signIn(email: string, password: string): Promise<Account> {
    const { data, error } = await this.client.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) throw new Error(error.message);
    if (!data.user) throw new Error('登录没有成功，请重试。');
    return this.accountForUser(data.user);
  }

  async signUp(
    email: string,
    password: string,
    displayName: string,
  ): Promise<{ account: Account | null; needsConfirmation: boolean }> {
    const redirectTo = new URL(import.meta.env.BASE_URL, window.location.origin).href;
    const { data, error } = await this.client.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { display_name: displayName.trim().slice(0, 24) },
        emailRedirectTo: redirectTo,
      },
    });
    if (error) throw new Error(error.message);
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      throw new Error('这个邮箱已经注册过了，直接登录吧。');
    }
    if (data.session?.user) {
      return { account: await this.accountForUser(data.session.user), needsConfirmation: false };
    }
    return { account: null, needsConfirmation: true };
  }

  async resetPassword(email: string): Promise<void> {
    const redirectTo = new URL(import.meta.env.BASE_URL, window.location.origin).href;
    const { error } = await this.client.auth.resetPasswordForEmail(email.trim(), { redirectTo });
    if (error) throw new Error(error.message);
  }

  async updatePassword(password: string): Promise<void> {
    if (password.length < 6) throw new Error('密码至少需要 6 位。');
    const { error } = await this.client.auth.updateUser({ password });
    if (error) throw new Error(error.message);
  }

  async signOut(): Promise<void> {
    const { error } = await this.client.auth.signOut();
    if (error) throw new Error(error.message);
    clearCachedAccount();
  }

  async loadWorkspace(account: Account): Promise<Workspace | null> {
    const { data: membershipData, error: membershipError } = await this.client
      .from('household_members')
      .select('household_id, joined_at, households!inner(id, name, invite_code, created_at)')
      .eq('user_id', account.userId)
      .maybeSingle<MembershipRow>();

    if (membershipError) throw new Error(membershipError.message);
    if (!membershipData) return null;

    const householdRow = one(membershipData.households);
    if (!householdRow) return null;

    const [membersResult, itemsResult, placesResult] = await Promise.all([
      this.client
        .from('household_members')
        .select('user_id, joined_at, profiles!inner(id, display_name, avatar_color)')
        .eq('household_id', householdRow.id)
        .order('joined_at', { ascending: true }),
      this.client
        .from('items')
        .select('*')
        .eq('household_id', householdRow.id)
        .order('created_at', { ascending: false }),
      this.client
        .from('roadtrip_places')
        .select('*')
        .eq('household_id', householdRow.id)
        .order('created_at', { ascending: false }),
    ]);

    if (membersResult.error) throw new Error(membersResult.error.message);
    if (itemsResult.error) throw new Error(itemsResult.error.message);
    if (placesResult.error) throw new Error(placesResult.error.message);

    const members: Member[] = ((membersResult.data ?? []) as unknown as MemberRow[])
      .map((row) => {
        const profile = one(row.profiles);
        if (!profile) return null;
        return {
          id: profile.id,
          displayName: profile.display_name || '有人',
          color: profile.avatar_color || '#d9613d',
          isMe: profile.id === account.userId,
        };
      })
      .filter((member): member is Member => Boolean(member));

    if (!members.some((member) => member.isMe)) {
      members.unshift({
        id: account.userId,
        displayName: account.displayName,
        color: account.color,
        isMe: true,
      });
    }

    return {
      household: mapHousehold(householdRow),
      members,
      items: ((itemsResult.data ?? []) as ItemRow[]).map(mapItem),
      places: ((placesResult.data ?? []) as PlaceRow[]).map(mapPlace),
      me: members.find((member) => member.isMe)!,
    };
  }

  async createHousehold(account: Account, name: string, displayName: string): Promise<Workspace> {
    const { error } = await this.client.rpc('create_household', {
      p_name: name.trim().slice(0, 40) || '我们的小家',
      p_display_name: displayName.trim().slice(0, 24) || account.displayName,
    });
    if (error) throw new Error(error.message);

    const updatedAccount: Account = {
      ...account,
      displayName: displayName.trim().slice(0, 24) || account.displayName,
    };
    const workspace = await this.loadWorkspace(updatedAccount);
    if (!workspace) throw new Error('小家创建好了，但读取失败，请刷新重试。');
    cacheAccount(updatedAccount);
    return workspace;
  }

  async joinHousehold(account: Account, code: string, displayName: string): Promise<Workspace> {
    const { error } = await this.client.rpc('join_household', {
      p_code: code.trim(),
      p_display_name: displayName.trim().slice(0, 24) || account.displayName,
    });
    if (error) throw new Error(error.message);

    const updatedAccount: Account = {
      ...account,
      displayName: displayName.trim().slice(0, 24) || account.displayName,
    };
    const workspace = await this.loadWorkspace(updatedAccount);
    if (!workspace) throw new Error('加入成功，但读取清单失败，请刷新重试。');
    cacheAccount(updatedAccount);
    return workspace;
  }

  async updateProfile(account: Account, displayName: string): Promise<Account> {
    const name = displayName.trim().slice(0, 24);
    if (!name) throw new Error('名字不能为空。');
    const { error } = await this.client
      .from('profiles')
      .update({ display_name: name })
      .eq('id', account.userId);
    if (error) throw new Error(error.message);
    const updated = { ...account, displayName: name };
    cacheAccount(updated);
    return updated;
  }

  async addItem(householdId: string, input: NewItem): Promise<Item> {
    const name = input.name.trim().slice(0, 80);
    if (!name) throw new Error('写点要买的东西吧。');
    const { data, error } = await this.client
      .from('items')
      .insert({
        household_id: householdId,
        name,
        quantity: input.quantity.trim().slice(0, 20) || '1',
        note: input.note.trim().slice(0, 200) || null,
        category: input.category,
      })
      .select('*')
      .single<ItemRow>();
    if (error) throw new Error(error.message);
    return mapItem(data);
  }

  async updateItem(id: string, patch: ItemPatch): Promise<Item> {
    const payload: Record<string, unknown> = {};
    if (patch.name !== undefined) {
      const name = patch.name.trim().slice(0, 80);
      if (!name) throw new Error('名字不能为空。');
      payload.name = name;
    }
    if (patch.quantity !== undefined) payload.quantity = patch.quantity.trim().slice(0, 20) || '1';
    if (patch.note !== undefined) payload.note = patch.note?.trim().slice(0, 200) || null;
    if (patch.category !== undefined) payload.category = patch.category;
    if (patch.done !== undefined) payload.done = patch.done;

    const { data, error } = await this.client
      .from('items')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single<ItemRow>();
    if (error) throw new Error(error.message);
    return mapItem(data);
  }

  async deleteItem(id: string): Promise<void> {
    const { error } = await this.client.from('items').delete().eq('id', id);
    if (error) throw new Error(error.message);
  }

  async clearCompleted(householdId: string): Promise<void> {
    const { error } = await this.client
      .from('items')
      .delete()
      .eq('household_id', householdId)
      .eq('done', true);
    if (error) throw new Error(error.message);
  }

  async addPlace(householdId: string, input: RoadtripPlaceInput): Promise<RoadtripPlace> {
    const name = input.name.trim().slice(0, 60);
    if (!name) throw new Error('给这个地方起个名字吧。');
    const prefecture = prefectureFor(input.prefectureCode);
    const { data, error } = await this.client
      .from('roadtrip_places')
      .insert({
        household_id: householdId,
        name,
        name_ja: input.nameJa?.trim().slice(0, 60) ?? '',
        prefecture_code: prefecture.code,
        prefecture_name: prefecture.name,
        region: prefecture.region,
        lat: input.lat,
        lng: input.lng,
        category: input.category,
        status: input.status,
        visited_on: input.status === 'visited' ? input.visitedOn : null,
        note: input.note.trim().slice(0, 500),
        rating: input.status === 'visited' ? input.rating : null,
      })
      .select('*')
      .single<PlaceRow>();
    if (error) throw new Error(error.message);
    return mapPlace(data);
  }

  async updatePlace(id: string, input: RoadtripPlaceInput): Promise<RoadtripPlace> {
    const name = input.name.trim().slice(0, 60);
    if (!name) throw new Error('给这个地方起个名字吧。');
    const prefecture = prefectureFor(input.prefectureCode);
    const { data, error } = await this.client
      .from('roadtrip_places')
      .update({
        name,
        name_ja: input.nameJa?.trim().slice(0, 60) ?? '',
        prefecture_code: prefecture.code,
        prefecture_name: prefecture.name,
        region: prefecture.region,
        lat: input.lat,
        lng: input.lng,
        category: input.category,
        status: input.status,
        visited_on: input.status === 'visited' ? input.visitedOn : null,
        note: input.note.trim().slice(0, 500),
        rating: input.status === 'visited' ? input.rating : null,
      })
      .eq('id', id)
      .select('*')
      .single<PlaceRow>();
    if (error) throw new Error(error.message);
    return mapPlace(data);
  }

  async deletePlace(id: string): Promise<void> {
    const { error } = await this.client.from('roadtrip_places').delete().eq('id', id);
    if (error) throw new Error(error.message);
  }

  subscribe(householdId: string, onChange: () => void): () => void {
    const channel = this.client
      .channel(`workspace-${householdId}-${Math.random().toString(36).slice(2, 8)}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'items',
          filter: `household_id=eq.${householdId}`,
        },
        onChange,
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'household_members',
          filter: `household_id=eq.${householdId}`,
        },
        onChange,
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
        },
        onChange,
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'roadtrip_places',
          filter: `household_id=eq.${householdId}`,
        },
        onChange,
      )
      .subscribe();

    return () => {
      void this.client.removeChannel(channel);
    };
  }
}

export const isDemoMode = !isSupabaseConfigured;

export const backend: Backend = isSupabaseConfigured ? new SupabaseBackend() : demoBackend;
