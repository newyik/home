import { createElement, act } from 'react';
import { create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Account, Workspace } from '../types';
import { AppProvider, useApp } from './AppContext';

const fake = vi.hoisted(() => ({
  restore: vi.fn(), loadWorkspace: vi.fn(), signOut: vi.fn(), addItem: vi.fn(),
  onAuthStateChange: vi.fn(), subscribe: vi.fn(() => () => {}),
}));
vi.mock('../lib/backend', () => ({ backend: fake, isDemoMode: false }));

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}
const a: Account = { userId: 'a', email: 'a@example.test', displayName: 'A', color: '#fff' };
const b: Account = { ...a, userId: 'b', email: 'b@example.test', displayName: 'B' };
function workspace(account: Account): Workspace {
  const me = { id: account.userId, displayName: account.displayName, color: '#fff', isMe: true };
  return {
    household: { id: account.userId, name: account.displayName, inviteCode: 'ABC123', createdAt: '' },
    members: [me], me, items: [], places: [],
  };
}
let current: ReturnType<typeof useApp>;
let authChanged: (account: Account | null, event: string) => void;
let renderer: ReactTestRenderer | undefined;
function Probe() { current = useApp(); return null; }
async function mount() {
  await act(async () => { renderer = create(createElement(AppProvider, null, createElement(Probe))); });
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal('document', { visibilityState: 'visible', addEventListener() {}, removeEventListener() {} });
  vi.stubGlobal('localStorage', { getItem: () => null, setItem() {} });
  fake.onAuthStateChange.mockImplementation(handler => { authChanged = handler; return () => {}; });
  fake.signOut.mockResolvedValue(undefined);
  fake.restore.mockResolvedValue(a);
  fake.loadWorkspace.mockImplementation(async account => workspace(account));
});
afterEach(async () => {
  if (renderer) await act(async () => renderer!.unmount());
  renderer = undefined;
  vi.unstubAllGlobals();
});
describe('session isolation', () => {
  it('ignores workspace loading that completes after logout', async () => {
    const loading = deferred<Workspace>();
    fake.loadWorkspace.mockReturnValue(loading.promise);
    await mount();
    await act(async () => { await current.signOut(); });
    await act(async () => { loading.resolve(workspace(a)); });
    expect(current.phase).toBe('signedOut');
    expect(current.account).toBeNull();
    expect(current.workspace).toBeNull();
  });
  it('ignores an old refresh after switching accounts', async () => {
    await mount();
    const loading = deferred<Workspace>();
    fake.loadWorkspace.mockReturnValueOnce(loading.promise);
    let refreshing: Promise<void>;
    await act(async () => { refreshing = current.refresh(); });
    await act(async () => { authChanged(b, 'signed_in'); });
    await act(async () => { loading.resolve(workspace(a)); await refreshing; });
    expect(current.account?.userId).toBe('b');
    expect(current.workspace?.household.id).toBe('b');
  });
  it('ignores a late item write after switching accounts', async () => {
    await mount();
    const writing = deferred<any>();
    fake.addItem.mockReturnValue(writing.promise);
    let adding: Promise<unknown>;
    await act(async () => {
      adding = current.addItem({ name: 'A item', quantity: '1', category: 'other', note: '' });
    });
    await act(async () => { authChanged(b, 'signed_in'); });
    await act(async () => {
      writing.resolve({ id: 'late-item', name: 'A item' });
      await adding;
    });
    expect(current.workspace?.household.id).toBe('b');
    expect(current.workspace?.items).toEqual([]);
  });
  it('ignores session restoration that completes after logout', async () => {
    const restoring = deferred<Account | null>();
    fake.restore.mockReturnValue(restoring.promise);
    await mount();
    await act(async () => { await current.signOut(); });
    await act(async () => { restoring.resolve(a); });
    expect(current.phase).toBe('signedOut');
    expect(current.account).toBeNull();
  });
});
