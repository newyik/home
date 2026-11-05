import { useEffect, useId, useMemo, useState, type FormEvent } from 'react';
import {
  Check,
  LoaderCircle,
  LocateFixed,
  MapPin,
  Search,
  Star,
  Trash2,
} from 'lucide-react';
import { PREFECTURES, nearestPrefecture, prefectureFor } from './prefectures';
import { searchJapanSpots, spotById } from './spots';
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

  const editing = Boolean(place);
  const results = useMemo(() => searchJapanSpots(query), [query]);
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
    setBusy(false);
    setError(null);
    setConfirmDelete(false);
  }, [open, place?.id, initialPoint, initialName]);

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
            先搜一下
          </label>
          <div className="rt-search-field__control">
            <Search size={17} />
            <input
              id="rt-spot-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="箱根、白川乡、金泽……"
              autoComplete="off"
            />
          </div>
          {query.trim() ? (
            <div className="rt-search-results">
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
              ) : (
                <div className="rt-search-empty">
                  没找到这个地点。可以直接在地图上选个位置。
                </div>
              )}
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
