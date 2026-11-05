import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  Cloud,
  CloudOff,
  HardDrive,
  LoaderCircle,
  Plus,
  Search,
  Settings2,
  Smartphone,
  Sparkles,
  X,
} from 'lucide-react';
import { CATEGORIES, CATEGORY_MAP, type Category, type Item } from '../types';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { Avatar, MemberStack } from './Avatar';
import { CategoryIcon } from './CategoryIcon';
import { EmptyState } from './EmptyState';
import { ItemRow } from './ItemRow';
import { ItemSheet } from './ItemSheet';
import { LogoMark } from './Logo';
import { ProgressRing } from './ProgressRing';
import { SettingsSheet } from './SettingsSheet';
import {
  countThisWeek,
  cx,
  friendlyWorkspaceError,
  getGreeting,
  guessCategory,
  isIos,
  isStandalone,
  parseDeepLink,
  sortItems,
} from '../lib/utils';

type Filter = 'all' | 'todo' | 'done';

export function Home() {
  const { workspace, demoMode, syncStatus, offline, addItem, updateItem, deleteItem, refresh } =
    useApp();
  const { showToast } = useToast();
  const [filter, setFilter] = useState<Filter>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | Category>('all');
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [quickName, setQuickName] = useState('');
  const [adding, setAdding] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [prefillName, setPrefillName] = useState('');
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [doneExpanded, setDoneExpanded] = useState(false);
  const [installTip, setInstallTip] = useState(() => {
    if (!isIos() || isStandalone()) return false;
    return localStorage.getItem('together-install-tip') !== 'hidden';
  });
  const quickInputRef = useRef<HTMLInputElement>(null);
  const deepLinkHandled = useRef(false);
  const addingRef = useRef(false);

  const items = workspace?.items ?? [];
  const pending = items.filter((item) => !item.done);
  const done = items.filter((item) => item.done);
  const weeklyDone = countThisWeek(items);

  const searched = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return items;
    return items.filter((item) =>
      [item.name, item.note ?? '', item.createdByName, item.completedByName ?? '']
        .join(' ')
        .toLowerCase()
        .includes(value),
    );
  }, [items, query]);

  const filtered = useMemo(
    () =>
      sortItems(
        searched.filter((item) => categoryFilter === 'all' || item.category === categoryFilter),
      ),
    [searched, categoryFilter],
  );

  const visiblePending = filtered.filter((item) => !item.done);
  const visibleDone = filtered.filter((item) => item.done);

  const quickCategory = guessCategory(quickName);

  const addQuick = async (rawName: string) => {
    const name = rawName.trim();
    if (!name) {
      setPrefillName('');
      setAddOpen(true);
      return;
    }
    if (addingRef.current) return;
    addingRef.current = true;
    setAdding(true);
    try {
      const item = await addItem({
        name,
        quantity: '1',
        note: '',
        category: guessCategory(name),
      });
      setQuickName('');
      setCategoryFilter('all');
      if (filter === 'done') setFilter('todo');
      showToast(`「${item.name}」已加入清单。`, {
        tone: 'success',
        action: {
          label: '撤销',
          onClick: () => {
            void deleteItem(item.id).catch(() => {
              showToast('撤销失败，稍后再试。', { tone: 'error' });
            });
          },
        },
      });
      requestAnimationFrame(() => quickInputRef.current?.focus());
    } catch (caught) {
      showToast(friendlyWorkspaceError(caught instanceof Error ? caught.message : '添加失败。'), {
        tone: 'error',
      });
    } finally {
      addingRef.current = false;
      setAdding(false);
    }
  };

  useEffect(() => {
    if (deepLinkHandled.current) return;
    const link = parseDeepLink(window.location.search);
    if (!link.add) return;
    deepLinkHandled.current = true;
    const nextHash = window.location.hash || '#/shopping';
    window.history.replaceState({}, '', `${window.location.pathname}${nextHash}`);
    if (link.quick) {
      void addQuick(link.add);
    } else {
      setPrefillName(link.add);
      setAddOpen(true);
    }
    // The deep link is only processed on the first mount, after login.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleQuickSubmit = (event: FormEvent) => {
    event.preventDefault();
    void addQuick(quickName);
  };

  const toggleItem = (item: Item) => {
    void updateItem(item.id, { done: !item.done })
      .then(() => {
        if (!item.done) {
          showToast(`「${item.name}」买好了。`, { tone: 'success' });
        }
      })
      .catch((caught) => {
        showToast(caught instanceof Error ? caught.message : '同步失败，稍后再试。', {
          tone: 'error',
        });
      });
  };

  const openAdd = (prefill = '') => {
    setPrefillName(prefill);
    setAddOpen(true);
    if (prefill) setQuickName('');
  };

  const dismissInstallTip = () => {
    setInstallTip(false);
    localStorage.setItem('together-install-tip', 'hidden');
  };

  const resetFilters = () => {
    setCategoryFilter('all');
    setQuery('');
    setFilter('all');
  };

  const showSearchEmpty = query.trim().length > 0;
  const showCategoryEmpty = !showSearchEmpty && categoryFilter !== 'all';

  if (!workspace) return null;

  const syncLabel = demoMode
    ? '本地'
    : syncStatus === 'syncing'
      ? '同步中'
      : offline || syncStatus === 'error'
        ? '离线'
        : '已同步';

  return (
    <div className="app">
      <div className="app__glow app__glow--one" aria-hidden="true" />
      <div className="app__glow app__glow--two" aria-hidden="true" />

      <header className="topbar">
        <button
          type="button"
          className="topbar__brand"
          onClick={() => {
            window.location.hash = '#/';
          }}
          aria-label="回到首页"
          title="回到首页"
        >
          <LogoMark size={38} />
          <div>
            <span>{workspace.household.name}</span>
            <small>{demoMode ? '本地演示 · 2 人' : `${workspace.members.length} 人 · 一起维护`}</small>
          </div>
        </button>

        <div className="topbar__actions">
          <button
            type="button"
            className={cx('sync-badge', (offline || syncStatus === 'error') && 'sync-badge--offline')}
            onClick={() => void refresh()}
            aria-label={`${syncLabel}，点击刷新`}
            title="点击刷新"
          >
            {demoMode ? (
              <HardDrive size={13} />
            ) : syncStatus === 'syncing' ? (
              <LoaderCircle size={13} className="spin" />
            ) : offline || syncStatus === 'error' ? (
              <CloudOff size={13} />
            ) : (
              <Cloud size={13} />
            )}
            <span>{syncLabel}</span>
          </button>
          <MemberStack members={workspace.members.filter((member) => !member.isMe)} size={29} />
          <button
            type="button"
            className="avatar-button"
            onClick={() => setSettingsOpen(true)}
            aria-label="打开设置"
          >
            <Avatar name={workspace.me.displayName} color={workspace.me.color} avatar={workspace.me.avatar} size={38} />
            <span className="avatar-button__badge">
              <Settings2 size={10} />
            </span>
          </button>
        </div>
      </header>

      <main className="app__main">
        <section className="hello">
          <div>
            <span className="eyebrow">
              {getGreeting()}，{workspace.me.displayName}
            </span>
            <h1>把日常，装进清单。</h1>
          </div>
          <p>洗发水、晚餐的食材，或是忽然想到的小东西。</p>
        </section>

        <section className="overview">
          <div className="overview__main">
            <span className="overview__label">待买</span>
            <div className="overview__number">
              {pending.length}
              <small>件</small>
            </div>
            <p>
              {pending.length === 0
                ? '暂时没有待买，想到什么再添一笔。'
                : '出门前看一眼，少一点来回惦记。'}
            </p>
          </div>

          <ProgressRing total={items.length} done={done.length} />

          <div className="overview__aside">
            <span>本周已买</span>
            <strong>
              {weeklyDone}
              <small>件</small>
            </strong>
            <span className="overview__people">
              {workspace.members.map((member) => member.displayName).join(' · ')}
            </span>
          </div>
        </section>

        {offline || syncStatus === 'error' ? (
          <div className="offline-banner">
            <CloudOff size={16} />
            <span>现在连不上服务器，先显示上次同步的清单。</span>
            <button type="button" onClick={() => void refresh()}>
              重试
            </button>
          </div>
        ) : null}

        <section className="add-card" id="quick-add">
          <form className="quick-add" onSubmit={handleQuickSubmit}>
            <span className="quick-add__icon" aria-hidden="true">
              {adding ? <LoaderCircle size={19} className="spin" /> : <Plus size={19} />}
            </span>
            <input
              ref={quickInputRef}
              type="text"
              value={quickName}
              onChange={(event) => setQuickName(event.target.value)}
              placeholder="家里缺什么？"
              maxLength={80}
              enterKeyHint="done"
              aria-label="快速添加物品"
            />
            <button
              type="submit"
              className="quick-add__submit"
              disabled={adding || !quickName.trim()}
            >
              加入
            </button>
          </form>

          <div className="quick-add__footer">
            {quickName.trim() ? (
              <span className="quick-add__guess">
                <span style={{ backgroundColor: CATEGORY_MAP[quickCategory].color }} />
                会放进「{CATEGORY_MAP[quickCategory].label}」，添加后还能改
              </span>
            ) : (
              <span className="quick-add__label">从第一件东西开始</span>
            )}
            <button
              type="button"
              className="quick-add__detail"
              onClick={() => openAdd(quickName)}
            >
              详细添加
            </button>
          </div>
        </section>

        {installTip ? (
          <div className="install-tip">
            <span className="install-tip__icon">
              <Smartphone size={17} />
            </span>
            <div>
              <strong>把清单放到主屏幕</strong>
              <span>Safari 分享菜单 → 添加到主屏幕，出门一按就开。</span>
            </div>
            <button type="button" onClick={dismissInstallTip} aria-label="不再提示">
              <X size={15} />
            </button>
          </div>
        ) : null}

        <section className="list-section">
          <div className="list-toolbar">
            <div className="segmented" role="tablist" aria-label="筛选清单">
              {(
                [
                  ['all', '全部', items.length],
                  ['todo', '待买', pending.length],
                  ['done', '已买', done.length],
                ] as const
              ).map(([value, label, count]) => (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={filter === value}
                  className={filter === value ? 'is-active' : ''}
                  onClick={() => setFilter(value)}
                >
                  {label}
                  <span>{count}</span>
                </button>
              ))}
            </div>

            <div className="list-toolbar__tools">
              <button
                type="button"
                className={cx('icon-button icon-button--soft', searchOpen && 'is-active')}
                onClick={() => {
                  setSearchOpen((value) => !value);
                  if (searchOpen) setQuery('');
                }}
                aria-label={searchOpen ? '关闭搜索' : '搜索清单'}
              >
                {searchOpen ? <X size={17} /> : <Search size={17} />}
              </button>
            </div>
          </div>

          {searchOpen ? (
            <div className="search-row">
              <Search size={17} />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="搜名字、备注或添加人"
                aria-label="搜索清单"
                autoFocus
              />
              {query ? (
                <button type="button" onClick={() => setQuery('')} aria-label="清空搜索">
                  <X size={15} />
                </button>
              ) : null}
            </div>
          ) : null}

          <div className="category-filter" aria-label="按分类筛选">
            <button
              type="button"
              className={cx('category-chip', categoryFilter === 'all' && 'is-active')}
              onClick={() => setCategoryFilter('all')}
            >
              全部
            </button>
            {CATEGORIES.map((category) => (
              <button
                key={category.id}
                type="button"
                className={cx('category-chip', categoryFilter === category.id && 'is-active')}
                style={
                  categoryFilter === category.id
                    ? { color: category.color, backgroundColor: category.soft, borderColor: category.color }
                    : undefined
                }
                onClick={() => setCategoryFilter(category.id)}
              >
                <CategoryIcon category={category.id} size={14} />
                {category.label}
              </button>
            ))}
          </div>

          {filter !== 'done' ? (
            <div className="list-block">
              <div className="list-heading">
                <h2>
                  {filter === 'all' ? '待买' : '还没买'}
                  <span>{visiblePending.length}</span>
                </h2>
                {visiblePending.length > 0 ? (
                  <button
                    type="button"
                    className="text-button text-button--muted"
                    onClick={() => openAdd()}
                  >
                    <Plus size={14} />
                    添加
                  </button>
                ) : null}
              </div>

              {visiblePending.length > 0 ? (
                <ul className="item-list">
                  {visiblePending.map((item) => (
                    <ItemRow
                      key={item.id}
                      item={item}
                      onToggle={toggleItem}
                      onEdit={setEditingItem}
                    />
                  ))}
                </ul>
              ) : (
                <EmptyState
                  icon={showSearchEmpty ? 'search' : showCategoryEmpty ? 'basket' : 'sparkles'}
                  title={
                    showSearchEmpty
                      ? '没找到这件东西'
                      : showCategoryEmpty
                        ? '这个分类还是空的'
                        : '待买清单空了'
                  }
                  description={
                    showSearchEmpty
                      ? '换个关键词试试，或者直接添加一件新的。'
                      : showCategoryEmpty
                        ? '换个分类看看，或者把这件东西加进来。'
                        : '家里还缺什么？加一件，下次出门就记得了。'
                  }
                  actionLabel={showSearchEmpty || showCategoryEmpty ? '看全部' : '加一件'}
                  onAction={
                    showSearchEmpty || showCategoryEmpty
                      ? resetFilters
                      : () => openAdd()
                  }
                />
              )}
            </div>
          ) : null}

          {filter === 'done' ? (
            <div className="list-block">
              <div className="list-heading">
                <h2>
                  已经买好
                  <span>{visibleDone.length}</span>
                </h2>
              </div>
              {visibleDone.length > 0 ? (
                <ul className="item-list">
                  {visibleDone.map((item) => (
                    <ItemRow
                      key={item.id}
                      item={item}
                      onToggle={toggleItem}
                      onEdit={setEditingItem}
                    />
                  ))}
                </ul>
              ) : (
                <EmptyState
                  icon="basket"
                  title="还没有买好的东西"
                  description="在待买清单里勾一件，它就会出现在这里。"
                  actionLabel="看看待买"
                  onAction={() => setFilter('todo')}
                />
              )}
            </div>
          ) : null}

          {filter === 'all' && visibleDone.length > 0 ? (
            <div className="list-block list-block--done">
              <button
                type="button"
                className="done-toggle"
                onClick={() => setDoneExpanded((value) => !value)}
                aria-expanded={doneExpanded}
              >
                <CheckCircle2 size={17} />
                <span>已经买好</span>
                <em>{visibleDone.length}</em>
                <ChevronDown size={16} className={cx('done-toggle__chevron', doneExpanded && 'is-open')} />
              </button>
              {doneExpanded ? (
                <ul className="item-list item-list--done">
                  {visibleDone.map((item) => (
                    <ItemRow
                      key={item.id}
                      item={item}
                      onToggle={toggleItem}
                      onEdit={setEditingItem}
                    />
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </section>

        <div className="app__footer">
          <Sparkles size={14} />
          两个人一起，把日子过得清清楚楚。
        </div>
      </main>

      <button
        type="button"
        className="fab"
        onClick={() => openAdd(quickName)}
        aria-label="添加物品"
      >
        <Plus size={24} />
      </button>

      <ItemSheet
        open={addOpen}
        initialName={prefillName}
        onSaved={() => {
          setCategoryFilter('all');
          if (filter === 'done') setFilter('todo');
        }}
        onClose={() => {
          setAddOpen(false);
          setPrefillName('');
        }}
      />
      <ItemSheet
        open={Boolean(editingItem)}
        item={editingItem}
        onClose={() => setEditingItem(null)}
      />
      <SettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
