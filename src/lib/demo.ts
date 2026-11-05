import type {
  Account,
  Category,
  Household,
  Item,
  ItemPatch,
  Member,
  NewItem,
  Workspace,
} from '../types';
import { prefectureFor } from '../roadtrip/prefectures';
import { seedRoadtripPlaces } from '../roadtrip/seed';
import { todayISO } from '../roadtrip/dates';
import type { RoadtripPlace, RoadtripPlaceInput } from '../roadtrip/types';
import type { Backend, DemoIdentity } from './backend';

const STORAGE_KEY = 'together-demo-v2';

type DemoMember = {
  id: string;
  displayName: string;
  color: string;
};

type DemoState = {
  version: 2;
  entered: boolean;
  identity: DemoIdentity;
  household: Household;
  members: {
    me: DemoMember;
    partner: DemoMember;
  };
  items: Item[];
  places: RoadtripPlace[];
};

function minutesAgo(minutes: number): string {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

function seedState(): DemoState {
  const me: DemoMember = { id: 'demo-me', displayName: '小雨', color: '#d9613d' };
  const partner: DemoMember = { id: 'demo-partner', displayName: '阿哲', color: '#5b84d7' };

  const items: Item[] = [
    {
      id: 'demo-1',
      name: '洗发水',
      quantity: '1',
      note: '无硅油的',
      category: 'daily',
      done: false,
      createdBy: partner.id,
      createdByName: partner.displayName,
      completedByName: null,
      createdAt: minutesAgo(35),
      completedAt: null,
      updatedAt: minutesAgo(35),
    },
    {
      id: 'demo-2',
      name: '洗衣液',
      quantity: '2',
      note: '补充装',
      category: 'clean',
      done: false,
      createdBy: me.id,
      createdByName: me.displayName,
      completedByName: null,
      createdAt: minutesAgo(180),
      completedAt: null,
      updatedAt: minutesAgo(180),
    },
    {
      id: 'demo-3',
      name: '牛奶',
      quantity: '2',
      note: '低脂的',
      category: 'food',
      done: false,
      createdBy: me.id,
      createdByName: me.displayName,
      completedByName: null,
      createdAt: minutesAgo(60 * 20),
      completedAt: null,
      updatedAt: minutesAgo(60 * 20),
    },
    {
      id: 'demo-4',
      name: '纸巾',
      quantity: '1',
      note: '抽纸，放客厅',
      category: 'daily',
      done: false,
      createdBy: partner.id,
      createdByName: partner.displayName,
      completedByName: null,
      createdAt: minutesAgo(60 * 30),
      completedAt: null,
      updatedAt: minutesAgo(60 * 30),
    },
    {
      id: 'demo-5',
      name: '垃圾袋',
      quantity: '1',
      note: null,
      category: 'daily',
      done: true,
      createdBy: partner.id,
      createdByName: partner.displayName,
      completedByName: me.displayName,
      createdAt: minutesAgo(60 * 40),
      completedAt: minutesAgo(60 * 22),
      updatedAt: minutesAgo(60 * 22),
    },
    {
      id: 'demo-6',
      name: '维生素 C',
      quantity: '1',
      note: null,
      category: 'medicine',
      done: true,
      createdBy: me.id,
      createdByName: me.displayName,
      completedByName: partner.displayName,
      createdAt: minutesAgo(60 * 70),
      completedAt: minutesAgo(60 * 48),
      updatedAt: minutesAgo(60 * 48),
    },
    {
      id: 'demo-7',
      name: '酱油',
      quantity: '1',
      note: '生抽',
      category: 'food',
      done: false,
      createdBy: partner.id,
      createdByName: partner.displayName,
      completedByName: null,
      createdAt: minutesAgo(60 * 55),
      completedAt: null,
      updatedAt: minutesAgo(60 * 55),
    },
  ];

  return {
    version: 2,
    entered: false,
    identity: 'me',
    household: {
      id: 'demo-household',
      name: '我们的小家',
      inviteCode: 'H8M2K6',
      createdAt: minutesAgo(60 * 24 * 30),
    },
    members: { me, partner },
    items,
    places: seedRoadtripPlaces(),
  };
}

function readState(): DemoState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DemoState;
      if (parsed.version === 2 && parsed.household && parsed.members && Array.isArray(parsed.items)) {
        if (!Array.isArray(parsed.places)) {
          let oldPlaces: RoadtripPlace[] | null = null;
          try {
            const rawRoadtrip = localStorage.getItem('together-roadtrip-demo-v1');
            if (rawRoadtrip) {
              const oldStore = JSON.parse(rawRoadtrip) as { places?: RoadtripPlace[] };
              if (Array.isArray(oldStore.places)) oldPlaces = oldStore.places;
            }
          } catch {
            // Fall back to the seeded preview places.
          }
          const migrated: DemoState = { ...parsed, places: oldPlaces ?? seedRoadtripPlaces() };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
          return migrated;
        }
        return parsed;
      }
    }
  } catch {
    // Corrupt demo state should never block the preview.
  }
  const state = seedState();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  return state;
}

function saveState(state: DemoState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function memberFor(state: DemoState, identity: DemoIdentity): DemoMember {
  return identity === 'partner' ? state.members.partner : state.members.me;
}

function accountFor(state: DemoState, identity: DemoIdentity): Account {
  const member = memberFor(state, identity);
  return {
    userId: member.id,
    email: identity === 'partner' ? 'partner@demo.local' : 'me@demo.local',
    displayName: member.displayName,
    color: member.color,
  };
}

function makeId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `demo-${crypto.randomUUID()}`;
  }
  return `demo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

class DemoBackend implements Backend {
  kind = 'demo' as const;

  async restore(): Promise<Account | null> {
    const state = readState();
    if (!state.entered) return null;
    return accountFor(state, state.identity);
  }

  onAuthStateChange(): () => void {
    return () => undefined;
  }

  async signIn(): Promise<Account> {
    throw new Error('演示模式不需要密码，点下面的体验按钮就好。');
  }

  async signUp(): Promise<{ account: Account | null; needsConfirmation: boolean }> {
    throw new Error('演示模式不需要注册，点下面的体验按钮就好。');
  }

  async resetPassword(): Promise<void> {
    throw new Error('演示模式没有邮箱。');
  }

  async updatePassword(): Promise<void> {
    throw new Error('演示模式没有密码。');
  }

  async signOut(): Promise<void> {
    const state = readState();
    state.entered = false;
    saveState(state);
  }

  async loadWorkspace(account: Account): Promise<Workspace | null> {
    const state = readState();
    if (!state.entered) return null;

    const identity: DemoIdentity = account.userId === state.members.partner.id ? 'partner' : 'me';
    state.identity = identity;
    saveState(state);

    const members: Member[] = [
      {
        id: state.members.me.id,
        displayName: state.members.me.displayName,
        color: state.members.me.color,
        isMe: identity === 'me',
      },
      {
        id: state.members.partner.id,
        displayName: state.members.partner.displayName,
        color: state.members.partner.color,
        isMe: identity === 'partner',
      },
    ];

    return {
      household: state.household,
      members,
      items: state.items,
      places: state.places,
      me: members.find((member) => member.isMe)!,
    };
  }

  async createHousehold(): Promise<Workspace> {
    throw new Error('演示模式已经有小家了。');
  }

  async joinHousehold(): Promise<Workspace> {
    throw new Error('演示模式已经有小家了。');
  }

  async updateProfile(account: Account, displayName: string): Promise<Account> {
    const state = readState();
    const name = displayName.trim().slice(0, 24);
    if (!name) throw new Error('名字不能为空。');
    const isPartner = account.userId === state.members.partner.id;
    if (isPartner) state.members.partner.displayName = name;
    else state.members.me.displayName = name;
    saveState(state);
    return { ...account, displayName: name };
  }

  async addItem(_householdId: string, input: NewItem): Promise<Item> {
    const state = readState();
    const member = memberFor(state, state.identity);
    const now = new Date().toISOString();
    const item: Item = {
      id: makeId(),
      name: input.name.trim().slice(0, 80),
      quantity: input.quantity.trim().slice(0, 20) || '1',
      note: input.note.trim().slice(0, 200) || null,
      category: (input.category || 'other') as Category,
      done: false,
      createdBy: member.id,
      createdByName: member.displayName,
      completedByName: null,
      createdAt: now,
      completedAt: null,
      updatedAt: now,
    };
    if (!item.name) throw new Error('写点要买的东西吧。');
    state.items = [item, ...state.items];
    saveState(state);
    return item;
  }

  async updateItem(id: string, patch: ItemPatch): Promise<Item> {
    const state = readState();
    const index = state.items.findIndex((item) => item.id === id);
    if (index < 0) throw new Error('这件东西找不到了。');
    const current = state.items[index];
    const member = memberFor(state, state.identity);
    const now = new Date().toISOString();
    const next: Item = {
      ...current,
      ...patch,
      name: patch.name?.trim().slice(0, 80) ?? current.name,
      quantity: patch.quantity?.trim().slice(0, 20) || current.quantity,
      note: patch.note === undefined ? current.note : patch.note?.trim().slice(0, 200) || null,
      updatedAt: now,
    };
    if (patch.done !== undefined && patch.done !== current.done) {
      next.completedAt = patch.done ? now : null;
      next.completedByName = patch.done ? member.displayName : null;
    }
    if (!next.name) throw new Error('名字不能为空。');
    state.items[index] = next;
    saveState(state);
    return next;
  }

  async deleteItem(id: string): Promise<void> {
    const state = readState();
    state.items = state.items.filter((item) => item.id !== id);
    saveState(state);
  }

  async clearCompleted(): Promise<void> {
    const state = readState();
    state.items = state.items.filter((item) => !item.done);
    saveState(state);
  }

  async addPlace(_householdId: string, input: RoadtripPlaceInput): Promise<RoadtripPlace> {
    const state = readState();
    const member = memberFor(state, state.identity);
    const prefecture = prefectureFor(input.prefectureCode);
    const now = new Date().toISOString();
    const place: RoadtripPlace = {
      id: makeId(),
      name: input.name.trim().slice(0, 60),
      nameJa: input.nameJa?.trim().slice(0, 60) ?? '',
      prefectureCode: prefecture.code,
      prefectureName: prefecture.name,
      region: prefecture.region,
      lat: input.lat,
      lng: input.lng,
      category: input.category,
      status: input.status,
      visitedOn: input.status === 'visited' ? input.visitedOn || todayISO() : null,
      note: input.note.trim().slice(0, 500),
      rating: input.status === 'visited' ? input.rating : null,
      createdByName: member.displayName,
      visitedByName: input.status === 'visited' ? member.displayName : null,
      createdAt: now,
      updatedAt: now,
    };
    if (!place.name) throw new Error('给这个地方起个名字吧。');
    state.places = [place, ...state.places];
    saveState(state);
    return place;
  }

  async updatePlace(id: string, input: RoadtripPlaceInput): Promise<RoadtripPlace> {
    const state = readState();
    const current = state.places.find((place) => place.id === id);
    if (!current) throw new Error('这个地方找不到了。');
    const member = memberFor(state, state.identity);
    const prefecture = prefectureFor(input.prefectureCode);
    const becameVisited = input.status === 'visited' && current.status !== 'visited';
    const updated: RoadtripPlace = {
      ...current,
      name: input.name.trim().slice(0, 60),
      nameJa: input.nameJa?.trim().slice(0, 60) ?? '',
      prefectureCode: prefecture.code,
      prefectureName: prefecture.name,
      region: prefecture.region,
      lat: input.lat,
      lng: input.lng,
      category: input.category,
      status: input.status,
      visitedOn:
        input.status === 'visited' ? input.visitedOn || current.visitedOn || todayISO() : null,
      note: input.note.trim().slice(0, 500),
      rating: input.status === 'visited' ? input.rating : null,
      visitedByName:
        input.status === 'visited'
          ? becameVisited
            ? member.displayName
            : current.visitedByName ?? member.displayName
          : null,
      updatedAt: new Date().toISOString(),
    };
    if (!updated.name) throw new Error('给这个地方起个名字吧。');
    state.places = state.places.map((place) => (place.id === id ? updated : place));
    saveState(state);
    return updated;
  }

  async deletePlace(id: string): Promise<void> {
    const state = readState();
    state.places = state.places.filter((place) => place.id !== id);
    saveState(state);
  }

  subscribe(): () => void {
    return () => undefined;
  }

  async enterDemo(identity: DemoIdentity): Promise<Account> {
    const state = readState();
    state.entered = true;
    state.identity = identity;
    saveState(state);
    return accountFor(state, identity);
  }

  async switchDemoIdentity(identity: DemoIdentity): Promise<Account> {
    const state = readState();
    state.identity = identity;
    state.entered = true;
    saveState(state);
    return accountFor(state, identity);
  }

  async resetDemo(): Promise<void> {
    const state = seedState();
    state.entered = true;
    state.identity = 'me';
    saveState(state);
  }
}

export const demoBackend = new DemoBackend();
