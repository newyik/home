import { useState } from 'react';
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

function MapDoodle() {
  return (
    <svg
      className="hub-map-doodle"
      viewBox="0 0 300 220"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M16 182c31-6 45-34 48-63 4-42 40-47 68-65 31-20 61-18 94-2 21 11 36 30 56 38"
        stroke="rgba(255, 248, 239, 0.2)"
        strokeWidth="1.5"
        strokeDasharray="5 7"
        strokeLinecap="round"
      />
      <path
        d="M34 44c11-8 22-9 32-3 9 5 8 17 1 24-9 9-24 7-31-2-5-6-5-14-2-19Z"
        fill="rgba(255, 248, 239, 0.06)"
      />
      <circle cx="62" cy="136" r="5" fill="#f2a46b" />
      <circle cx="154" cy="82" r="5" fill="#f2a46b" />
      <circle cx="241" cy="114" r="5" fill="#f2a46b" />
      <circle cx="62" cy="136" r="12" stroke="#f2a46b" strokeOpacity=".22" />
      <circle cx="241" cy="114" r="12" stroke="#f2a46b" strokeOpacity=".22" />
      <g transform="translate(137 47)">
        <path
          d="M0 25C0 12 8 2 19 2s19 10 19 23c0 13-19 27-19 27S0 38 0 25Z"
          fill="#f4b58c"
        />
        <circle cx="19" cy="23" r="7" fill="#304338" />
      </g>
      <g transform="translate(224 80)">
        <path
          d="M0 20C0 9 6 1 15 1s15 8 15 19-15 21-15 21S0 31 0 20Z"
          fill="#fff8ef"
          fillOpacity=".9"
        />
        <circle cx="15" cy="18" r="5.5" fill="#3d5546" />
      </g>
      <text x="32" y="76" fill="rgba(255,248,239,.34)" fontSize="9" letterSpacing="2">
        JAPAN
      </text>
      <text x="185" y="177" fill="rgba(255,248,239,.25)" fontSize="8" letterSpacing="2">
        ROAD TRIP
      </text>
    </svg>
  );
}

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
          <span className="eyebrow eyebrow--accent">
            <Sparkles size={13} />
            {getGreeting()}，{workspace.me.displayName}
          </span>
          <h1>
            今天，想去
            <em>哪里？</em>
          </h1>
          <p>想去的先记在地图上，家里缺的顺手放进清单。两个人的日子，慢慢来。</p>
        </section>

        <section className="hub-grid" aria-label="选择要进入的小家空间">
          <button
            type="button"
            className="hub-card hub-card--trip"
            onClick={() => {
              window.location.hash = '#/roadtrip';
            }}
          >
            <MapDoodle />
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
                把去过的日本，
                <br />
                <em>再添一个图钉。</em>
              </h2>
              <p>
                {latest
                  ? `最近一次是 ${latest.name}，${formatShortDate(latest.visitedOn)}。`
                  : '第一枚图钉，等你们一起钉上去。'}
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

          <button
            type="button"
            className="hub-card hub-card--shop"
            onClick={() => {
              window.location.hash = '#/shopping';
            }}
          >
            <div className="hub-shop-art" aria-hidden="true">
              <span />
              <span />
              <span />
              <ShoppingBag size={82} strokeWidth={1.2} />
            </div>

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
                家里缺什么，
                <br />
                <em>记一下就好。</em>
              </h2>
              <p>
                {pending.length > 0
                  ? `${pending.slice(0, 2).map((item) => item.name).join('、')}${pending.length > 2 ? '……' : ''} 还在等你们。`
                  : nextPlan
                    ? `清单空了。接下来可以去 ${nextPlan.name}。`
                    : '清单空空的，今天可以轻松出门。'}
              </p>
            </div>

            <div className="hub-shop-chips">
              {pending.length > 0 ? (
                pending.slice(0, 3).map((item) => <span key={item.id}>{item.name}</span>)
              ) : (
                <span className="hub-shop-chips__empty">
                  <CheckCircle2 size={12} />
                  都买齐了
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
        </section>

        <footer className="hub-footer">
          <span>
            <MapPinned size={14} />
            {latest ? `上一站：${latest.prefectureName} · ${latest.name}` : '下一站，等你们决定'}
          </span>
          <span>
            <ShoppingBag size={14} />
            {pending.length > 0 ? `还有 ${pending.length} 件待买` : '清单已经清空'}
          </span>
        </footer>
      </main>

      <SettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
