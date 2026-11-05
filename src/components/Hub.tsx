import { useState } from 'react';
import homeArt from '../assets/little-home.svg';
import roadArt from '../assets/road-postcard.svg';
import bagArt from '../assets/market-bag.svg';
import {
  ArrowRight,
  ArrowUpRight,
  Car,
  CheckCircle2,
  Cloud,
  CloudOff,
  HardDrive,
  MapPinned,
  Settings2,
  ShoppingBag,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Avatar, MemberStack } from './Avatar';
import { LogoMark } from './Logo';
import { SettingsSheet } from './SettingsSheet';
import { countThisWeek, getGreeting } from '../lib/utils';
import { formatShortDate, roadtripStats, sortPlaces } from '../roadtrip/helpers';

export function Hub() {
  const { workspace, account, demoMode, syncStatus, offline } = useApp();
  const [settingsOpen, setSettingsOpen] = useState(false);

  if (!workspace || !account) return null;

  const stats = roadtripStats(workspace.places);
  const pending = workspace.items.filter((item) => !item.done);
  const weeklyDone = countThisWeek(workspace.items);
  const visited = sortPlaces(workspace.places.filter((place) => place.status === 'visited'));
  const latest = visited[0] ?? null;
  const nextPlan = sortPlaces(workspace.places.filter((place) => place.status === 'planned'))[0] ?? null;
  const syncLabel = syncStatus === 'syncing' ? '同步中' : offline || syncStatus === 'error' ? '离线' : '已同步';

  return (
    <div className="hub">
      <div className="hub__glow hub__glow--one" aria-hidden="true" />
      <div className="hub__glow hub__glow--two" aria-hidden="true" />

      <header className="hub-topbar">
        <div className="hub-brand">
          <LogoMark size={42} />
          <div>
            <strong>{workspace.household.name}</strong>
            <small>{demoMode ? '本地演示 · 2 人' : '两个人的小家'}</small>
          </div>
        </div>

        <div className="hub-topbar__right">
          <span className={`hub-sync${!demoMode && (offline || syncStatus === 'error') ? ' is-offline' : ''}`}>
            {demoMode ? (
              <HardDrive size={13} />
            ) : offline || syncStatus === 'error' ? (
              <CloudOff size={13} />
            ) : (
              <Cloud size={13} />
            )}
            {demoMode ? '本地' : syncLabel}
          </span>
          <MemberStack members={workspace.members.filter((member) => !member.isMe)} size={29} />
          <button
            type="button"
            className="avatar-button"
            onClick={() => setSettingsOpen(true)}
            aria-label="打开设置"
          >
            <Avatar name={workspace.me.displayName} color={workspace.me.color} size={40} />
            <span className="avatar-button__badge">
              <Settings2 size={10} />
            </span>
          </button>
        </div>
      </header>

      <main className="hub-main">
        <section className="hub-hero">
          <div className="hub-hero__copy">
            <span className="eyebrow eyebrow--accent">
              <Sparkles size={13} />
              {getGreeting()}，{workspace.me.displayName}
            </span>
            <h1>
              把日常过好，
              <br />
              <em>也一起去远方。</em>
            </h1>
            <p>一张清单，装下生活的小事；一张地图，收藏两个人的远方。</p>
          </div>
          <img className="hub-hero__art" src={homeArt} alt="" aria-hidden="true" />
        </section>

        <section className="hub-grid" aria-label="选择要进入的小家空间">
          <button
            type="button"
            className="hub-card hub-card--shop"
            onClick={() => {
              window.location.hash = '#/shopping';
            }}
          >
            <img className="hub-market-art" src={bagArt} alt="" aria-hidden="true" />

            <div className="hub-card__top">
              <span className="hub-card__label">
                <ShoppingBag size={15} />
                一起买
              </span>
              <span className="hub-card__arrow">
                <ArrowUpRight size={18} />
              </span>
            </div>

            <div className="hub-card__body">
              <h2>
                把小日子，
                <br />
                <em>一件件装满。</em>
              </h2>
              <p>
                {pending.length > 0
                  ? `${pending.slice(0, 2).map((item) => item.name).join('、')}${pending.length > 2 ? '……' : ''} 还在等你们。`
                  : nextPlan
                    ? `清单空了。接下来可以去 ${nextPlan.name}。`
                    : '想到要买什么，就来这里留一笔。'}
              </p>
            </div>

            <div className="hub-shop-chips">
              {pending.length > 0 ? (
                pending.slice(0, 3).map((item) => <span key={item.id}>{item.name}</span>)
              ) : (
                <span className="hub-shop-chips__empty">
                  <CheckCircle2 size={12} />
                  暂时没有待买
                </span>
              )}
            </div>

            <div className="hub-card__stats hub-card__stats--shop">
              <span>
                <strong>{pending.length}</strong>
                待买
              </span>
              <span>
                <strong>{weeklyDone}</strong>
                本周已买
              </span>
              <span>
                <strong>{workspace.items.length}</strong>
                全部
              </span>
            </div>

            <span className="hub-card__cta">
              去看看清单
              <ArrowRight size={15} />
            </span>
          </button>

          <button
            type="button"
            className="hub-card hub-card--trip"
            onClick={() => {
              window.location.hash = '#/roadtrip';
            }}
          >
            <img className="hub-postcard-art" src={roadArt} alt="" aria-hidden="true" />
            <div className="hub-card__top">
              <span className="hub-card__label">
                <Car size={15} />
                自驾打卡
              </span>
              <span className="hub-card__arrow">
                <ArrowUpRight size={18} />
              </span>
            </div>

            <div className="hub-card__body">
              <h2>
                下一站，
                <br />
                <em>一起出发。</em>
              </h2>
              <p>
                {latest
                  ? `最近一次是 ${latest.name}，${formatShortDate(latest.visitedOn)}。`
                  : '从想去的地方开始，慢慢画出你们的路线。'}
              </p>
            </div>

            <div className="hub-card__stats">
              <span>
                <strong>{stats.visited}</strong>
                去过
              </span>
              <span>
                <strong>{stats.planned}</strong>
                计划
              </span>
              <span>
                <strong>{stats.prefectureCount}</strong>
                都道府县
              </span>
            </div>

            <span className="hub-card__cta">
              打开日本地图
              <ArrowRight size={15} />
            </span>
          </button>
        </section>

        <footer className="hub-footer">
          <span>
            <MapPinned size={14} />
            {latest ? `上一站：${latest.prefectureName} · ${latest.name}` : '下一站，等你们决定'}
          </span>
          <span>
            <ShoppingBag size={14} />
            {pending.length > 0 ? `还有 ${pending.length} 件待买` : '日常小事，一起惦记'}
          </span>
        </footer>
      </main>

      <SettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
