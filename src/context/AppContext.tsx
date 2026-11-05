import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { Account, Item, ItemPatch, NewItem, SyncStatus, Workspace } from '../types';
import { prefectureFor } from '../roadtrip/prefectures';
import { todayISO } from '../roadtrip/dates';
import type { RoadtripPlace, RoadtripPlaceInput } from '../roadtrip/types';
import { backend, isDemoMode } from '../lib/backend';
import type { DemoIdentity } from '../lib/backend';
import { friendlyAuthError } from '../lib/utils';

type Phase = 'loading' | 'signedOut' | 'onboarding' | 'ready' | 'error';

type AppContextValue = {
  phase: Phase;
  account: Account | null;
  workspace: Workspace | null;
  demoMode: boolean;
  syncStatus: SyncStatus;
  offline: boolean;
  initError: string | null;
  recovery: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    displayName: string,
  ) => Promise<{ needsConfirmation: boolean }>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  cancelRecovery: () => void;
  signOut: () => Promise<void>;
  createHousehold: (name: string, displayName: string) => Promise<void>;
  joinHousehold: (code: string, displayName: string) => Promise<void>;
  updateProfile: (displayName: string) => Promise<void>;
  addItem: (input: NewItem) => Promise<Item>;
  updateItem: (id: string, patch: ItemPatch) => Promise<Item>;
  deleteItem: (id: string) => Promise<void>;
  clearCompleted: () => Promise<void>;
  addPlace: (input: RoadtripPlaceInput) => Promise<RoadtripPlace>;
  updatePlace: (id: string, input: RoadtripPlaceInput) => Promise<RoadtripPlace>;
  deletePlace: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
  retry: () => Promise<void>;
  enterDemo: (identity: DemoIdentity) => Promise<void>;
  switchDemoIdentity: (identity: DemoIdentity) => Promise<void>;
  resetDemo: () => Promise<void>;
};

const AppContext = createContext<AppContextValue | null>(null);

function cacheKey(userId: string): string {
  return `together-workspace-${userId}`;
}

function readCache(userId: string): Workspace | null {
  try {
    const raw = localStorage.getItem(cacheKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Workspace;
    if (!parsed.household?.id || !Array.isArray(parsed.items)) return null;
    if (!Array.isArray(parsed.places)) parsed.places = [];
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(userId: string, workspace: Workspace): void {
  try {
    localStorage.setItem(
      cacheKey(userId),
      JSON.stringify({
        ...workspace,
        items: workspace.items.filter((item) => !item.pending),
        places: workspace.places.filter((place) => !place.pending),
      }),
    );
  } catch {
    // A full localStorage should not break the list.
  }
}

function makeTempId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? `temp-${crypto.randomUUID()}`
    : `temp-${Date.now()}`;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<Phase>('loading');
  const [account, setAccount] = useState<Account | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [offline, setOffline] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [recovery, setRecovery] = useState(false);
  const loadSequence = useRef(0);

  const applyWorkspace = useCallback((next: Workspace | null, userId: string) => {
    setWorkspace(next);
    if (next) {
      setPhase('ready');
      setOffline(false);
      writeCache(userId, next);
    } else {
      setPhase('onboarding');
    }
  }, []);

  const loadAccountWorkspace = useCallback(
    async (nextAccount: Account, options: { allowCache?: boolean } = {}) => {
      const sequence = ++loadSequence.current;
      setAccount(nextAccount);
      setInitError(null);

      try {
        const next = await backend.loadWorkspace(nextAccount);
        if (sequence !== loadSequence.current) return;
        applyWorkspace(next, nextAccount.userId);
      } catch (error) {
        if (sequence !== loadSequence.current) return;
        const message = error instanceof Error ? error.message : '读取清单失败。';
        if (options.allowCache !== false) {
          const cached = readCache(nextAccount.userId);
          if (cached) {
            setWorkspace(cached);
            setPhase('ready');
            setOffline(true);
            setSyncStatus('error');
            return;
          }
        }
        setPhase('error');
        setInitError(message);
      }
    },
    [applyWorkspace],
  );

  const bootstrap = useCallback(async () => {
    setPhase('loading');
    setInitError(null);
    try {
      const restored = await backend.restore();
      if (!restored) {
        setAccount(null);
        setWorkspace(null);
        setPhase('signedOut');
        return;
      }
      await loadAccountWorkspace(restored);
    } catch (error) {
      const message = error instanceof Error ? error.message : '打开失败。';
      setPhase('error');
      setInitError(friendlyAuthError(message));
    }
  }, [loadAccountWorkspace]);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    const unsubscribe = backend.onAuthStateChange((nextAccount, event) => {
      if (!nextAccount) {
        setAccount(null);
        setWorkspace(null);
        setPhase('signedOut');
        setSyncStatus('idle');
        setRecovery(false);
        return;
      }
      void loadAccountWorkspace(nextAccount).then(() => {
        if (event === 'recovery') setRecovery(true);
      });
    });
    return unsubscribe;
  }, [loadAccountWorkspace]);

  const refresh = useCallback(async () => {
    if (!account) return;
    setSyncStatus('syncing');
    try {
      const next = await backend.loadWorkspace(account);
      if (next) {
        setWorkspace((current) => {
          if (!current) return next;
          const pending = current.items.filter((item) => item.pending);
          const realIds = new Set(next.items.map((item) => item.id));
          const keptPending = pending.filter((item) => !realIds.has(item.id));
          const pendingPlaces = current.places.filter((place) => place.pending);
          const realPlaceIds = new Set(next.places.map((place) => place.id));
          const keptPendingPlaces = pendingPlaces.filter((place) => !realPlaceIds.has(place.id));
          const merged = {
            ...next,
            items: [...keptPending, ...next.items],
            places: [...keptPendingPlaces, ...next.places],
          };
          writeCache(account.userId, merged);
          return merged;
        });
        setOffline(false);
      }
      setSyncStatus('idle');
    } catch {
      setSyncStatus('error');
    }
  }, [account]);

  const householdId = workspace?.household.id;

  useEffect(() => {
    if (!householdId) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = backend.subscribe(householdId, () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        void refresh();
      }, 350);
    });
    return () => {
      if (timer) clearTimeout(timer);
      unsubscribe();
    };
  }, [householdId, refresh]);

  useEffect(() => {
    if (!householdId) return;
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') void refresh();
    }, 45_000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [householdId, refresh]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      try {
        const nextAccount = await backend.signIn(email, password);
        await loadAccountWorkspace(nextAccount);
      } catch (error) {
        throw new Error(friendlyAuthError(error instanceof Error ? error.message : '登录失败。'));
      }
    },
    [loadAccountWorkspace],
  );

  const signUp = useCallback(
    async (email: string, password: string, displayName: string) => {
      try {
        const result = await backend.signUp(email, password, displayName);
        if (result.account) await loadAccountWorkspace(result.account);
        return { needsConfirmation: result.needsConfirmation };
      } catch (error) {
        throw new Error(friendlyAuthError(error instanceof Error ? error.message : '注册失败。'));
      }
    },
    [loadAccountWorkspace],
  );

  const resetPassword = useCallback(async (email: string) => {
    try {
      await backend.resetPassword(email);
    } catch (error) {
      throw new Error(friendlyAuthError(error instanceof Error ? error.message : '发送失败。'));
    }
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    try {
      await backend.updatePassword(password);
      setRecovery(false);
    } catch (error) {
      throw new Error(friendlyAuthError(error instanceof Error ? error.message : '密码更新失败。'));
    }
  }, []);

  const cancelRecovery = useCallback(() => setRecovery(false), []);

  const signOut = useCallback(async () => {
    await backend.signOut();
    setAccount(null);
    setWorkspace(null);
    setPhase('signedOut');
    setSyncStatus('idle');
    setRecovery(false);
  }, []);

  const createHousehold = useCallback(
    async (name: string, displayName: string) => {
      if (!account) throw new Error('登录状态过期了，请重新登录。');
      const next = await backend.createHousehold(account, name, displayName);
      const updatedAccount = { ...account, displayName: next.me.displayName };
      setAccount(updatedAccount);
      applyWorkspace(next, updatedAccount.userId);
    },
    [account, applyWorkspace],
  );

  const joinHousehold = useCallback(
    async (code: string, displayName: string) => {
      if (!account) throw new Error('登录状态过期了，请重新登录。');
      const next = await backend.joinHousehold(account, code, displayName);
      const updatedAccount = { ...account, displayName: next.me.displayName };
      setAccount(updatedAccount);
      applyWorkspace(next, updatedAccount.userId);
    },
    [account, applyWorkspace],
  );

  const updateProfile = useCallback(
    async (displayName: string) => {
      if (!account) throw new Error('登录状态过期了，请重新登录。');
      const updated = await backend.updateProfile(account, displayName);
      setAccount(updated);
      setWorkspace((current) => {
        if (!current) return current;
        const next: Workspace = {
          ...current,
          me: { ...current.me, displayName: updated.displayName },
          members: current.members.map((member) =>
            member.isMe ? { ...member, displayName: updated.displayName } : member,
          ),
        };
        writeCache(updated.userId, next);
        return next;
      });
    },
    [account],
  );

  const addItem = useCallback(
    async (input: NewItem) => {
      if (!workspace || !account) throw new Error('登录状态过期了，请重新登录。');
      const now = new Date().toISOString();
      const tempId = makeTempId();
      const temp: Item = {
        id: tempId,
        name: input.name.trim(),
        quantity: input.quantity.trim() || '1',
        note: input.note.trim() || null,
        category: input.category,
        done: false,
        createdBy: account.userId,
        createdByName: workspace.me.displayName,
        completedByName: null,
        createdAt: now,
        completedAt: null,
        updatedAt: now,
        pending: true,
      };

      setWorkspace((current) =>
        current ? { ...current, items: [temp, ...current.items] } : current,
      );

      try {
        const real = await backend.addItem(workspace.household.id, input);
        setWorkspace((current) => {
          if (!current) return current;
          const next = {
            ...current,
            items: [real, ...current.items.filter((item) => item.id !== tempId && item.id !== real.id)],
          };
          writeCache(account.userId, next);
          return next;
        });
        return real;
      } catch (error) {
        setWorkspace((current) =>
          current ? { ...current, items: current.items.filter((item) => item.id !== tempId) } : current,
        );
        throw error;
      }
    },
    [account, workspace],
  );

  const updateItem = useCallback(
    async (id: string, patch: ItemPatch) => {
      if (!workspace || !account) throw new Error('登录状态过期了，请重新登录。');
      const previous = workspace.items.find((item) => item.id === id);
      if (!previous) throw new Error('这件东西找不到了。');

      const now = new Date().toISOString();
      const optimistic: Item = {
        ...previous,
        ...patch,
        completedAt:
          patch.done === undefined || patch.done === previous.done
            ? previous.completedAt
            : patch.done
              ? now
              : null,
        completedByName:
          patch.done === undefined || patch.done === previous.done
            ? previous.completedByName
            : patch.done
              ? workspace.me.displayName
              : null,
        updatedAt: now,
      };

      setWorkspace((current) =>
        current
          ? { ...current, items: current.items.map((item) => (item.id === id ? optimistic : item)) }
          : current,
      );

      try {
        const real = await backend.updateItem(id, patch);
        setWorkspace((current) => {
          if (!current) return current;
          const next = {
            ...current,
            items: current.items.map((item) => (item.id === id ? real : item)),
          };
          writeCache(account.userId, next);
          return next;
        });
        return real;
      } catch (error) {
        setWorkspace((current) =>
          current
            ? {
                ...current,
                items: current.items.map((item) => (item.id === id ? previous : item)),
              }
            : current,
        );
        throw error;
      }
    },
    [account, workspace],
  );

  const deleteItem = useCallback(
    async (id: string) => {
      if (!workspace || !account) throw new Error('登录状态过期了，请重新登录。');
      const snapshot = workspace.items;
      setWorkspace((current) =>
        current ? { ...current, items: current.items.filter((item) => item.id !== id) } : current,
      );
      try {
        await backend.deleteItem(id);
        setWorkspace((current) => {
          if (!current) return current;
          writeCache(account.userId, current);
          return current;
        });
      } catch (error) {
        setWorkspace((current) => (current ? { ...current, items: snapshot } : current));
        throw error;
      }
    },
    [account, workspace],
  );

  const clearCompleted = useCallback(async () => {
    if (!workspace || !account) throw new Error('登录状态过期了，请重新登录。');
    const snapshot = workspace.items;
    setWorkspace((current) =>
      current ? { ...current, items: current.items.filter((item) => !item.done) } : current,
    );
    try {
      await backend.clearCompleted(workspace.household.id);
      setWorkspace((current) => {
        if (!current) return current;
        writeCache(account.userId, current);
        return current;
      });
    } catch (error) {
      setWorkspace((current) => (current ? { ...current, items: snapshot } : current));
      throw error;
    }
  }, [account, workspace]);

  const addPlace = useCallback(
    async (input: RoadtripPlaceInput) => {
      if (!workspace || !account) throw new Error('登录状态过期了，请重新登录。');
      const prefecture = prefectureFor(input.prefectureCode);
      const now = new Date().toISOString();
      const tempId = makeTempId();
      const temp: RoadtripPlace = {
        id: tempId,
        name: input.name.trim(),
        nameJa: input.nameJa?.trim() ?? '',
        prefectureCode: prefecture.code,
        prefectureName: prefecture.name,
        region: prefecture.region,
        lat: input.lat,
        lng: input.lng,
        category: input.category,
        status: input.status,
        visitedOn: input.status === 'visited' ? input.visitedOn || todayISO() : null,
        note: input.note.trim(),
        rating: input.status === 'visited' ? input.rating : null,
        createdByName: workspace.me.displayName,
        visitedByName: input.status === 'visited' ? workspace.me.displayName : null,
        createdAt: now,
        updatedAt: now,
        pending: true,
      };

      setWorkspace((current) =>
        current ? { ...current, places: [temp, ...current.places] } : current,
      );

      try {
        const real = await backend.addPlace(workspace.household.id, input);
        setWorkspace((current) => {
          if (!current) return current;
          const next = {
            ...current,
            places: [real, ...current.places.filter((place) => place.id !== tempId && place.id !== real.id)],
          };
          writeCache(account.userId, next);
          return next;
        });
        return real;
      } catch (error) {
        setWorkspace((current) =>
          current
            ? { ...current, places: current.places.filter((place) => place.id !== tempId) }
            : current,
        );
        throw error;
      }
    },
    [account, workspace],
  );

  const updatePlace = useCallback(
    async (id: string, input: RoadtripPlaceInput) => {
      if (!workspace || !account) throw new Error('登录状态过期了，请重新登录。');
      const previous = workspace.places.find((place) => place.id === id);
      if (!previous) throw new Error('这个地方找不到了。');
      const prefecture = prefectureFor(input.prefectureCode);
      const becameVisited = input.status === 'visited' && previous.status !== 'visited';
      const optimistic: RoadtripPlace = {
        ...previous,
        name: input.name.trim(),
        nameJa: input.nameJa?.trim() ?? '',
        prefectureCode: prefecture.code,
        prefectureName: prefecture.name,
        region: prefecture.region,
        lat: input.lat,
        lng: input.lng,
        category: input.category,
        status: input.status,
        visitedOn:
          input.status === 'visited' ? input.visitedOn || previous.visitedOn || todayISO() : null,
        note: input.note.trim(),
        rating: input.status === 'visited' ? input.rating : null,
        visitedByName:
          input.status === 'visited'
            ? becameVisited
              ? workspace.me.displayName
              : previous.visitedByName ?? workspace.me.displayName
            : null,
        updatedAt: new Date().toISOString(),
      };

      setWorkspace((current) =>
        current
          ? {
              ...current,
              places: current.places.map((place) => (place.id === id ? optimistic : place)),
            }
          : current,
      );

      try {
        const real = await backend.updatePlace(id, input);
        setWorkspace((current) => {
          if (!current) return current;
          const next = {
            ...current,
            places: current.places.map((place) => (place.id === id ? real : place)),
          };
          writeCache(account.userId, next);
          return next;
        });
        return real;
      } catch (error) {
        setWorkspace((current) =>
          current
            ? {
                ...current,
                places: current.places.map((place) => (place.id === id ? previous : place)),
              }
            : current,
        );
        throw error;
      }
    },
    [account, workspace],
  );

  const deletePlace = useCallback(
    async (id: string) => {
      if (!workspace || !account) throw new Error('登录状态过期了，请重新登录。');
      const snapshot = workspace.places;
      setWorkspace((current) =>
        current ? { ...current, places: current.places.filter((place) => place.id !== id) } : current,
      );
      try {
        await backend.deletePlace(id);
        setWorkspace((current) => {
          if (!current) return current;
          writeCache(account.userId, current);
          return current;
        });
      } catch (error) {
        setWorkspace((current) => (current ? { ...current, places: snapshot } : current));
        throw error;
      }
    },
    [account, workspace],
  );

  const retry = useCallback(async () => {
    if (account) {
      await loadAccountWorkspace(account);
    } else {
      await bootstrap();
    }
  }, [account, bootstrap, loadAccountWorkspace]);

  const enterDemo = useCallback(
    async (identity: DemoIdentity) => {
      if (!backend.enterDemo) return;
      const demoAccount = await backend.enterDemo(identity);
      await loadAccountWorkspace(demoAccount, { allowCache: false });
    },
    [loadAccountWorkspace],
  );

  const switchDemoIdentity = useCallback(
    async (identity: DemoIdentity) => {
      if (!backend.switchDemoIdentity) return;
      const demoAccount = await backend.switchDemoIdentity(identity);
      await loadAccountWorkspace(demoAccount, { allowCache: false });
    },
    [loadAccountWorkspace],
  );

  const resetDemo = useCallback(async () => {
    if (!backend.resetDemo) return;
    await backend.resetDemo();
    const demoAccount = await backend.restore();
    if (demoAccount) await loadAccountWorkspace(demoAccount, { allowCache: false });
  }, [loadAccountWorkspace]);

  const value = useMemo<AppContextValue>(
    () => ({
      phase,
      account,
      workspace,
      demoMode: isDemoMode,
      syncStatus,
      offline,
      initError,
      recovery,
      signIn,
      signUp,
      resetPassword,
      updatePassword,
      cancelRecovery,
      signOut,
      createHousehold,
      joinHousehold,
      updateProfile,
      addItem,
      updateItem,
      deleteItem,
      clearCompleted,
      addPlace,
      updatePlace,
      deletePlace,
      refresh,
      retry,
      enterDemo,
      switchDemoIdentity,
      resetDemo,
    }),
    [
      phase,
      account,
      workspace,
      syncStatus,
      offline,
      initError,
      recovery,
      signIn,
      signUp,
      resetPassword,
      updatePassword,
      cancelRecovery,
      signOut,
      createHousehold,
      joinHousehold,
      updateProfile,
      addItem,
      updateItem,
      deleteItem,
      clearCompleted,
      addPlace,
      updatePlace,
      deletePlace,
      refresh,
      retry,
      enterDemo,
      switchDemoIdentity,
      resetDemo,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used inside AppProvider');
  return context;
}
