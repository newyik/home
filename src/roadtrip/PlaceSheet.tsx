import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react';
import {
  Building2,
  Check,
  LoaderCircle,
  LocateFixed,
  MapPin,
  MapPinned,
  Search,
  Star,
  Trash2,
} from 'lucide-react';
import { PREFECTURES, nearestPrefecture, prefectureFor } from './prefectures';
import { searchJapanSpots, spotById } from './spots';
import { searchAdminPlaces, type AdminPlace } from './adminPlaces';
import { searchOnlinePlaces, type OnlinePlace } from './onlineSearch';
import { todayISO } from './dates';
import {
  ROADTRIP_CATEGORIES,
  type RoadtripCategory,
  type RoadtripPlace,
  type RoadtripPlaceInput,
  type RoadtripStatus,
} from './types';
import { RoadtripCategoryIcon } from './CategoryIcon';
import { Sheet } from '../components/Sheet';
import { cx } from '../lib/utils';

type Props = {
  open: boolean;
  place?: RoadtripPlace | null;
  initialPoint?: { lat: number; lng: number } | null;
  initialName?: string;
  onClose: () => void;
  onSubmit: (input: RoadtripPlaceInput) => Promise<void> | void;
  onDelete?: (id: string) => Promise<void> | void;
  onPickOnMap: () => void;
};

export function PlaceSheet({
  open,
  place = null,
  initialPoint = null,
  initialName = '',
  onClose,
  onSubmit,
  onDelete,
  onPickOnMap,
}: Props) {
  const formId = useId();
  const [name, setName] = useState('');
  const [nameJa, setNameJa] = useState('');
  const [prefectureCode, setPrefectureCode] = useState('13');
  const [lat, setLat] = useState(35.6895);
  const [lng, setLng] = useState(139.6917);
  const [pointExact, setPointExact] = useState(false);
  const [category, setCategory] = useState<RoadtripCategory>('other');
  const [status, setStatus] = useState<RoadtripStatus>('planned');
  const [visitedOn, setVisitedOn] = useState(todayISO());
  const [note, setNote] = useState('');
  const [rating, setRating] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [onlineStatus, setOnlineStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [onlineResults, setOnlineResults] = useState<OnlinePlace[]>([]);
  const [onlineError, setOnlineError] = useState<string | null>(null);
  const onlineAbort = useRef<AbortController | null>(null);

  const editing = Boolean(place);
  const results = useMemo(() => searchJapanSpots(query), [query]);
  const adminResults = useMemo(() => searchAdminPlaces(query), [query]);
  const prefecture = prefectureFor(prefectureCode);

  useEffect(() => {
    if (!open) return;

    if (place) {
      setName(place.name);
      setNameJa(place.nameJa);
      setCategory(place.category);
      setStatus(place.status);
      setVisitedOn(place.visitedOn ?? todayISO());
      setNote(place.note);
      setRating(place.rating);

      if (initialPoint) {
        const pref = nearestPrefecture(initialPoint.lat, initialPoint.lng);
        setPrefectureCode(pref.code);
        setLat(initialPoint.lat);
        setLng(initialPoint.lng);
        setPointExact(true);
      } else {
        setPrefectureCode(place.prefectureCode);
        setLat(place.lat);
        setLng(place.lng);
        setPointExact(true);
      }
    } else {
      const point = initialPoint;
      const pref = point ? nearestPrefecture(point.lat, point.lng) : prefectureFor('13');
      setName(initialName);
      setNameJa('');
      setPrefectureCode(pref.code);
      setLat(point?.lat ?? pref.lat);
      setLng(point?.lng ?? pref.lng);
      setPointExact(Boolean(point));
      setCategory('other');
      setStatus('planned');
      setVisitedOn(todayISO());
      setNote('');
      setRating(null);
    }

    setQuery('');
    setOnlineStatus('idle');
    setOnlineResults([]);
    setOnlineError(null);
    onlineAbort.current?.abort();
    setBusy(false);
    setError(null);
    setConfirmDelete(false);
  }, [open, place?.id, initialPoint, initialName]);

  useEffect(() => {
    return () => onlineAbort.current?.abort();
  }, []);

  const chooseSpot = (spotId: string) => {
    const spot = spotById(spotId);
    if (!spot) return;
    setName(spot.name);
    setNameJa(spot.nameJa);
    setPrefectureCode(spot.prefectureCode);
    setLat(spot.lat);
    setLng(spot.lng);
    setPointExact(true);
    setCategory(spot.category);
    setQuery('');
    setOnlineStatus('idle');
    setOnlineResults([]);
    setOnlineError(null);
  };

  const runOnlineSearch = async () => {
    const clean = query.trim();
    if (clean.length < 2 || onlineStatus === 'loading') return;

    onlineAbort.current?.abort();
    const controller = new AbortController();
    onlineAbort.current = controller;
    setOnlineStatus('loading');
    setOnlineError(null);

    try {
      const found = await searchOnlinePlaces(clean, controller.signal);
      if (controller.signal.aborted) return;
      setOnlineResults(found);
      setOnlineStatus('done');
    } catch (caught) {
      if (controller.signal.aborted) return;
      setOnlineError(
        caught instanceof Error ? caught.message : '在线搜索暂时不可用，可以在地图上选点。',
      );
      setOnlineStatus('error');
    }
  };

  const chooseAdminPlace = (admin: AdminPlace) => {
    setName(admin.name);
    setNameJa(admin.nameJa);
    setPrefectureCode(admin.prefectureCode);
    setLat(admin.lat);
    setLng(admin.lng);
    setPointExact(true);
    setCategory(admin.category);
    setQuery('');
    setOnlineStatus('idle');
    setOnlineResults([]);
    setOnlineError(null);
  };

  const chooseOnlinePlace = (online: OnlinePlace) => {
    setName(online.name);
    setNameJa(online.name);
    setPrefectureCode(online.prefectureCode);
    setLat(online.lat);
    setLng(online.lng);
    setPointExact(true);
    setCategory(online.category);
    setQuery('');
    setOnlineStatus('idle');
    setOnlineResults([]);
    setOnlineError(null);
  };

  const choosePrefecture = (code: string) => {
    setPrefectureCode(code);
    const pref = prefectureFor(code);
    setLat(pref.lat);
    setLng(pref.lng);
    setPointExact(false);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      setError('给这个地方起个名字吧。');
      return;
    }
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      setError('还没有选择地图位置。');
      return;
    }

    setBusy(true);
    setError(null);
    const input: RoadtripPlaceInput = {
      name: name.trim(),
      nameJa: nameJa.trim(),
      prefectureCode,
      lat,
      lng,
      category,
      status,
      visitedOn: status === 'visited' ? visitedOn || todayISO() : null,
      note: note.trim(),
      rating: status === 'visited' ? rating : null,
    };

    try {
      await Promise.resolve(onSubmit(input));
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '保存失败，请重试。');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!place || !onDelete) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await Promise.resolve(onDelete(place.id));
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '删除失败，请重试。');
      setBusy(false);
      setConfirmDelete(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={() => {
        if (!busy) onClose();
      }}
      title={editing ? '编辑打卡地点' : '记一个地方'}
      description={editing ? '改完保存，地图会马上更新。' : '去过的地方，或者下次想去的。'}
      footer={
        <div className="sheet-actions">
          {editing && onDelete ? (
            <button
              type="button"
              className={cx('button button--ghost button--danger', confirmDelete && 'is-confirming')}
              onClick={() => void remove()}
              disabled={busy}
            >
              <Trash2 size={16} />
              {confirmDelete ? '再点一次删除' : '删除'}
            </button>
          ) : (
            <button type="button" className="button button--ghost" onClick={onClose} disabled={busy}>
              取消
            </button>
          )}
          <button type="submit" form={formId} className="button button--primary" disabled={busy}>
            {busy ? <LoaderCircle size={17} className="spin" /> : <Check size={17} />}
            {editing ? '保存' : '加入地图'}
          </button>
        </div>
      }
    >
      <div className="rt-form">
        <div className="rt-search-field">
          <label className="field__label" htmlFor="rt-spot-search">
            先搜县市或景点
          </label>
          <div className="rt-search-field__control">
            <Search size={17} />
            <input
              id="rt-spot-search"
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setOnlineStatus('idle');
                setOnlineResults([]);
                setOnlineError(null);
                onlineAbort.current?.abort();
              }}
              placeholder="山口县、下关市、箱根……"
              autoComplete="off"
            />
          </div>
          {query.trim() ? (
            <div className="rt-search-results">
              {adminResults.map((admin) => (
                <button
                  key={admin.id}
                  type="button"
                  className="rt-search-result"
                  onClick={() => chooseAdminPlace(admin)}
                >
                  <span className="rt-search-result__icon">
                    {admin.kind === 'prefecture' ? <MapPinned size={15} /> : <Building2 size={15} />}
                  </span>
                  <span>
                    <strong>{admin.name}</strong>
                    <small>
                      {prefectureFor(admin.prefectureCode).name} ·{' '}
                      {admin.kind === 'prefecture' ? '都道府县' : '城市'}
                    </small>
                  </span>
                  <span className="rt-search-kind">
                    {admin.kind === 'prefecture' ? '县' : '市'}
                  </span>
                </button>
              ))}

              {results.length > 0 ? (
                results.map((spot) => (
                  <button
                    key={spot.id}
                    type="button"
                    className="rt-search-result"
                    onClick={() => chooseSpot(spot.id)}
                  >
                    <span className="rt-search-result__icon">
                      <RoadtripCategoryIcon category={spot.category} size={15} />
                    </span>
                    <span>
                      <strong>{spot.name}</strong>
                      <small>
                        {prefectureFor(spot.prefectureCode).name} · {spot.nameJa}
                      </small>
                    </span>
                  </button>
                ))
              ) : adminResults.length === 0 ? (
                <div className="rt-search-empty">
                  常用地点库里没有，试试下面的在线搜索。
                </div>
              ) : null}

              <div className="rt-online-search">
                <button
                  type="button"
                  className="rt-online-search__button"
                  onClick={() => void runOnlineSearch()}
                  disabled={onlineStatus === 'loading'}
                >
                  {onlineStatus === 'loading' ? (
                    <LoaderCircle size={15} className="spin" />
                  ) : (
                    <Search size={15} />
                  )}
                  {onlineStatus === 'loading'
                    ? '正在搜索日本地址…'
                    : `在日本地图上搜索「${query.trim()}」`}
                </button>

                {onlineStatus === 'done' && onlineResults.length === 0 ? (
                  <div className="rt-search-empty">
                    OpenStreetMap 也没找到。可以直接在地图上点选位置。
                  </div>
                ) : null}

                {onlineResults.map((online) => (
                  <button
                    key={online.id}
                    type="button"
                    className="rt-search-result rt-search-result--online"
                    onClick={() => chooseOnlinePlace(online)}
                  >
                    <span className="rt-search-result__icon">
                      <RoadtripCategoryIcon category={online.category} size={15} />
                    </span>
                    <span>
                      <strong>{online.name}</strong>
                      <small>{online.displayName}</small>
                    </span>
                    <span className="rt-search-source">在线</span>
                  </button>
                ))}

                {onlineError ? <div className="rt-search-empty">{onlineError}</div> : null}
                {onlineStatus !== 'idle' ? (
                  <small className="rt-online-search__credit">
                    在线结果来自 OpenStreetMap，地址可能不精确，保存前请确认都道府县和地图位置。
                  </small>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        <form id={formId} className="rt-form__fields" onSubmit={(event) => void submit(event)} noValidate>
          <label className="field">
            <span className="field__label">地点名字</span>
            <span className="field__control">
              <MapPin size={18} />
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="比如：箱根"
                maxLength={60}
                autoComplete="off"
              />
            </span>
          </label>

          <div className="field">
            <span className="field__label">都道府县</span>
            <span className="field__control">
              <select
                className="rt-select"
                value={prefectureCode}
                onChange={(event) => choosePrefecture(event.target.value)}
                aria-label="都道府县"
              >
                {PREFECTURES.map((pref) => (
                  <option key={pref.code} value={pref.code}>
                    {pref.name}
                  </option>
                ))}
              </select>
            </span>
          </div>

          <div className="rt-location-row">
            <span className={cx('rt-location-status', pointExact && 'is-exact')}>
              <LocateFixed size={14} />
              {pointExact
                ? '已选择地图位置'
                : `现在先用${prefecture.name}中心点标记，建议在地图上选点`}
            </span>
            <button
              type="button"
              className="text-button"
              onClick={onPickOnMap}
              disabled={busy}
            >
              在地图上选点
            </button>
          </div>

          <fieldset className="field field--fieldset">
            <legend className="field__label">类型</legend>
            <div className="rt-category-grid">
              {ROADTRIP_CATEGORIES.map((meta) => (
                <button
                  key={meta.id}
                  type="button"
                  className={cx('rt-category-choice', category === meta.id && 'is-active')}
                  style={
                    category === meta.id
                      ? { color: meta.color, backgroundColor: meta.soft, borderColor: meta.color }
                      : undefined
                  }
                  onClick={() => setCategory(meta.id)}
                  aria-pressed={category === meta.id}
                >
                  <RoadtripCategoryIcon category={meta.id} size={16} />
                  {meta.label}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="field">
            <span className="field__label">状态</span>
            <div className="rt-status-toggle">
              <button
                type="button"
                className={cx(status === 'planned' && 'is-active')}
                onClick={() => setStatus('planned')}
                aria-pressed={status === 'planned'}
              >
                计划去
              </button>
              <button
                type="button"
                className={cx(status === 'visited' && 'is-active')}
                onClick={() => setStatus('visited')}
                aria-pressed={status === 'visited'}
              >
                已经去过
              </button>
            </div>
          </div>

          {status === 'visited' ? (
            <label className="field">
              <span className="field__label">打卡日期</span>
              <span className="field__control">
                <input
                  type="date"
                  value={visitedOn}
                  onChange={(event) => setVisitedOn(event.target.value)}
                  aria-label="打卡日期"
                />
              </span>
            </label>
          ) : null}

          {status === 'visited' ? (
            <div className="field">
              <span className="field__label">
                评分 <span className="field__optional">可选</span>
              </span>
              <div className="rt-rating" role="group" aria-label="评分">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={cx(rating !== null && rating >= value && 'is-filled')}
                    onClick={() => setRating((current) => (current === value ? null : value))}
                    aria-label={`${value} 星`}
                    aria-pressed={rating === value}
                  >
                    <Star size={22} fill={rating !== null && rating >= value ? 'currentColor' : 'none'} />
                  </button>
                ))}
                {rating !== null ? (
                  <button
                    type="button"
                    className="rt-rating__clear"
                    onClick={() => setRating(null)}
                  >
                    清除
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}

          <label className="field">
            <span className="field__label">
              备注 <span className="field__optional">可选</span>
            </span>
            <span className="field__control">
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="路上发生了什么、吃了什么、下次想再去哪里……"
                rows={3}
                maxLength={500}
              />
            </span>
          </label>

          {error ? (
            <div className="form-alert" role="alert">
              {error}
            </div>
          ) : null}
        </form>
      </div>
    </Sheet>
  );
}
