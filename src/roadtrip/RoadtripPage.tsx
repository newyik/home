import roadArt from '../assets/road-postcard.svg';
import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  CalendarDays,
  Car,
  ChevronRight,
  CircleCheck,
  CircleDashed,
  Cloud,
  Compass,
  HardDrive,
  Info,
  MapPinned,
  Plus,
  Search,
  Sparkles,
  Star,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { LogoMark } from '../components/Logo';
import { RoadtripMap } from './RoadtripMap';
import { PlaceSheet } from './PlaceSheet';
import { RoadtripCategoryIcon } from './CategoryIcon';
import { formatShortDate, matchesPlace, roadtripStats, sortPlaces } from './helpers';
import { REGIONS, type Region, type RoadtripPlace, type RoadtripPlaceInput, type RoadtripStatus } from './types';

type Filter = 'all' | RoadtripStatus;

type PickingTarget = { place: RoadtripPlace | null };

export function RoadtripPage({ onBack }: { onBack: () => void }) {
  const { workspace, addPlace, updatePlace, deletePlace, demoMode } = useApp();
  const { showToast } = useToast();
  const places = workspace?.places ?? [];
  const [filter, setFilter] = useState<Filter>('all');
  const [region, setRegion] = useState<'all' | Region>('all');
  const [query, setQuery] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetPlace, setSheetPlace] = useState<RoadtripPlace | null>(null);
  const [initialPoint, setInitialPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [initialName, setInitialName] = useState('');
  const [picking, setPicking] = useState(false);
  const [pickingTarget, setPickingTarget] = useState<PickingTarget | null>(null);

  const stats = useMemo(() => roadtripStats(places), [places]);
  const filtered = useMemo(
    () =>
      sortPlaces(
        places.filter((place) => {
          if (filter !== 'all' && place.status !== filter) return false;
          if (region !== 'all' && place.region !== region) return false;
          return matchesPlace(place, query);
        }),
      ),
    [places, filter, region, query],
  );

  const plannedCount = places.filter((place) => place.status === 'planned').length;
  const visitedCount = places.filter((place) => place.status === 'visited').length;

  const openAdd = () => {
    setSheetPlace(null);
    setInitialPoint(null);
    setInitialName('');
    setSheetOpen(true);
  };

  const openEdit = (place: RoadtripPlace) => {
    setSheetPlace(place);
    setInitialPoint(null);
    setInitialName('');
    setSheetOpen(true);
  };

  const startPicking = () => {
    setPickingTarget({ place: sheetPlace });
    setSheetOpen(false);
    setPicking(true);
    window.setTimeout(() => {
      document.querySelector('.rt-map-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 80);
  };

  const cancelPicking = () => {
    setPicking(false);
    if (pickingTarget?.place) {
      setSheetPlace(pickingTarget.place);
      setInitialPoint(null);
    } else {
      setSheetPlace(null);
      setInitialPoint(null);
    }
    setPickingTarget(null);
    setSheetOpen(true);
  };

  const handleMapPick = (lat: number, lng: number) => {
    const target = pickingTarget?.place ?? null;
    setPicking(false);
    setSheetOpen(true);
    setSheetPlace(target);
    setInitialPoint({ lat, lng });
    setInitialName(target ? '' : '');
    setPickingTarget(null);
  };

  const submitPlace = async (input: RoadtripPlaceInput) => {
    if (sheetPlace) {
      await updatePlace(sheetPlace.id, input);
      showToast('地点已经更新。', { tone: 'success' });
    } else {
      await addPlace(input);
      showToast(`「${input.name}」已加入地图。`, { tone: 'success' });
    }
  };

  const removePlace = async (id: string) => {
    await deletePlace(id);
    showToast('地点已经删除。', { tone: 'info' });
  };

  const resetFilters = () => {
    setFilter('all');
    setRegion('all');
    setQuery('');
  };

  const hasFilters = filter !== 'all' || region !== 'all' || query.trim().length > 0;

  return (
    <div className="rt-page">
      <div className="rt-page__glow rt-page__glow--one" aria-hidden="true" />
      <div className="rt-page__glow rt-page__glow--two" aria-hidden="true" />

      <header className="rt-topbar">
        <button type="button" className="rt-back" onClick={onBack} aria-label="返回首页">
          <ArrowLeft size={18} />
          <span>首页</span>
        </button>

        <div className="rt-brand">
          <LogoMark size={34} />
          <div>
            <strong>自驾打卡</strong>
            <small>{workspace?.household.name ?? '我们的小家'}</small>
          </div>
        </div>

        <div className="rt-topbar__right">
          <span
            className="rt-local-badge"
            title={demoMode ? '数据暂存在这台设备' : '和 TA 实时同步'}
          >
            {demoMode ? <HardDrive size={12} /> : <Cloud size={12} />}
            {demoMode ? '本地' : '同步'}
          </span>
          <button type="button" className="rt-add-button" onClick={openAdd}>
            <Plus size={17} />
            <span>打卡</span>
          </button>
        </div>
      </header>

      <main className="rt-main">
        <section className="rt-hero">
          <div className="rt-hero__copy">
            <span className="eyebrow eyebrow--accent">
              <Car size={13} />
              两个人的日本自驾地图
            </span>
            <h1>
              收藏沿途风景，
              <br />
              <em>慢慢走遍日本。</em>
            </h1>
            <p>海边、公路和偶遇的小城。去过的留个纪念，想去的约好下一次。</p>
          </div>
          <img className="rt-hero__art" src={roadArt} alt="" aria-hidden="true" />
          <div className="rt-hero__stamp" aria-hidden="true">
            <Compass size={20} />
            <strong>日本</strong>
            <span>自驾</span>
          </div>
        </section>

        <section className="rt-stats" aria-label="自驾统计">
          <div className="rt-stat rt-stat--visited">
            <span className="rt-stat__icon">
              <CircleCheck size={18} />
            </span>
            <div>
              <span>去过</span>
              <strong>
                {visitedCount}
                <small>个地方</small>
              </strong>
            </div>
          </div>
          <div className="rt-stat rt-stat--planned">
            <span className="rt-stat__icon">
              <CircleDashed size={18} />
            </span>
            <div>
              <span>计划去</span>
              <strong>
                {plannedCount}
                <small>个地方</small>
              </strong>
            </div>
          </div>
          <div className="rt-stat rt-stat--pref">
            <span className="rt-stat__icon">
              <MapPinned size={18} />
            </span>
            <div>
              <span>点亮</span>
              <strong>
                {stats.prefectureCount}
                <small>个都道府县</small>
              </strong>
            </div>
          </div>
        </section>

        <div className="rt-layout">
          <section className="rt-map-column">
            <div className="rt-map-card">
              <RoadtripMap
                places={places}
                picking={picking}
                onSelect={openEdit}
                onPick={handleMapPick}
                onCancelPick={cancelPicking}
              />
            </div>
            <p className="rt-map-note">
              <Info size={13} />
              地图来自日本国土地理院 · 放大看单点，点「全图」看冲绳 ·
              {demoMode ? ' 数据先保存在这台设备' : ' 和 TA 实时同步'}
            </p>
            {stats.prefectures.length > 0 ? (
              <div className="rt-prefectures">
                <span className="rt-prefectures__label">
                  <Sparkles size={13} />
                  已点亮
                </span>
                <div className="rt-prefectures__list">
                  {stats.prefectures.map((prefecture) => (
                    <span key={prefecture}>{prefecture}</span>
                  ))}
                </div>
              </div>
            ) : null}
          </section>

          <aside className="rt-list-panel">
            <div className="rt-list-panel__head">
              <div>
                <span className="eyebrow">MY PLACES</span>
                <h2>地点清单</h2>
              </div>
              <span className="rt-list-panel__count">{filtered.length}</span>
            </div>

            <div className="rt-search">
              <Search size={16} />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="搜地点、备注或都道府县"
                aria-label="搜索地点"
              />
            </div>

            <div className="rt-filter-row">
              <div className="rt-segmented" role="tablist" aria-label="按状态筛选">
                {(
                  [
                    ['all', '全部', places.length],
                    ['planned', '计划', plannedCount],
                    ['visited', '去过', visitedCount],
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
            </div>

            <div className="rt-region-filter">
              <button
                type="button"
                className={region === 'all' ? 'is-active' : ''}
                onClick={() => setRegion('all')}
              >
                全日本
              </button>
              {REGIONS.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={region === item ? 'is-active' : ''}
                  onClick={() => setRegion(item)}
                >
                  {item}
                </button>
              ))}
            </div>

            <div className="rt-place-list">
              {filtered.length > 0 ? (
                filtered.map((place) => (
                  <button
                    key={place.id}
                    type="button"
                    className="rt-place"
                    onClick={() => openEdit(place)}
                  >
                    <span className={`rt-place__status rt-place__status--${place.status}`}>
                      {place.status === 'visited' ? (
                        <CircleCheck size={19} />
                      ) : (
                        <CircleDashed size={19} />
                      )}
                    </span>
                    <span className="rt-place__body">
                      <span className="rt-place__title">
                        <strong>{place.name}</strong>
                        <span>{place.prefectureName}</span>
                      </span>
                      <span className="rt-place__note">
                        {place.note ||
                          (place.status === 'visited'
                            ? '去过这里，还没来得及写备注。'
                            : '先记下来，等下次出发。')}
                      </span>
                      <span className="rt-place__meta">
                        <RoadtripCategoryIcon category={place.category} size={12} />
                        {place.status === 'visited' ? (
                          <>
                            <CalendarDays size={12} />
                            {formatShortDate(place.visitedOn)} · {place.visitedByName ?? '有人'} 打卡
                          </>
                        ) : (
                          <>计划中 · {place.createdByName} 添加</>
                        )}
                      </span>
                    </span>
                    {place.rating ? (
                      <span className="rt-place__rating">
                        <Star size={13} fill="currentColor" />
                        {place.rating}
                      </span>
                    ) : (
                      <ChevronRight size={17} className="rt-place__chevron" />
                    )}
                  </button>
                ))
              ) : (
                <div className="rt-empty">
                  <span className="rt-empty__icon">
                    <MapPinned size={26} />
                  </span>
                  <h3>{hasFilters ? '没有找到这个地方' : '第一站，留给你们'}</h3>
                  <p>
                    {hasFilters
                      ? '换个关键词，或者看看全日本。'
                      : '从一个想去或去过的地方开始，收藏你们的旅程。'}
                  </p>
                  <button
                    type="button"
                    className="button button--soft button--small"
                    onClick={hasFilters ? resetFilters : openAdd}
                  >
                    <Plus size={15} />
                    {hasFilters ? '看全部' : '记第一个地方'}
                  </button>
                </div>
              )}
            </div>

            <p className="rt-list-note">
              <HardDrive size={12} />
              {demoMode ? '本地预览版：换一台设备不会同步' : '和 TA 共享 · 实时同步'}
            </p>
          </aside>
        </div>
      </main>

      <PlaceSheet
        open={sheetOpen}
        place={sheetPlace}
        initialPoint={initialPoint}
        initialName={initialName}
        onClose={() => {
          setSheetOpen(false);
          setInitialPoint(null);
        }}
        onSubmit={submitPlace}
        onDelete={removePlace}
        onPickOnMap={startPicking}
      />
    </div>
  );
}
