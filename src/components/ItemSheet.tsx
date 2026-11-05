import { useEffect, useId, useState, type FormEvent } from 'react';
import { Check, LoaderCircle, Minus, Plus, Trash2 } from 'lucide-react';
import { CATEGORIES, type Category, type Item, type NewItem } from '../types';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { CategoryIcon } from './CategoryIcon';
import { Sheet } from './Sheet';
import { cx, formatRelativeTime, guessCategory, quantityLabel } from '../lib/utils';

type ItemSheetProps = {
  open: boolean;
  item?: Item | null;
  initialName?: string;
  onClose: () => void;
  onSaved?: (item: Item) => void;
};

function numericQuantity(value: string): number | null {
  if (!/^\d{1,3}$/.test(value.trim())) return null;
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

export function ItemSheet({ open, item, initialName = '', onClose, onSaved }: ItemSheetProps) {
  const { addItem, updateItem, deleteItem } = useApp();
  const { showToast } = useToast();
  const formId = useId();
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [note, setNote] = useState('');
  const [category, setCategory] = useState<Category>('other');
  const [categoryTouched, setCategoryTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const editing = Boolean(item);

  useEffect(() => {
    if (!open) return;
    const nextName = item?.name ?? initialName;
    setName(nextName);
    setQuantity(item?.quantity ?? '1');
    setNote(item?.note ?? '');
    setCategory(item?.category ?? guessCategory(nextName));
    setCategoryTouched(Boolean(item));
    setError(null);
    setConfirmDelete(false);
    setBusy(false);
  }, [open, item?.id, initialName]);

  const close = () => {
    if (busy) return;
    onClose();
  };

  const stepQuantity = (delta: number) => {
    const current = numericQuantity(quantity) ?? 1;
    setQuantity(String(Math.max(1, Math.min(99, current + delta))));
  };

  const submit = async (event?: FormEvent) => {
    event?.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('写点要买的东西吧。');
      return;
    }

    setBusy(true);
    setError(null);
    const input: NewItem = {
      name: trimmed,
      quantity: quantity.trim() || '1',
      note: note.trim(),
      category,
    };

    try {
      if (item) {
        const updated = await updateItem(item.id, {
          name: input.name,
          quantity: input.quantity,
          note: input.note || null,
          category: input.category,
        });
        onSaved?.(updated);
        showToast('已经保存好了。', { tone: 'success' });
      } else {
        const created = await addItem(input);
        onSaved?.(created);
        showToast(`「${input.name}」已加入清单。`, { tone: 'success' });
      }
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '保存失败，请重试。');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!item) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await deleteItem(item.id);
      showToast('已经删掉了。', { tone: 'info' });
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
      onClose={close}
      title={editing ? '编辑这件东西' : '往清单里加点什么'}
      description={
        editing
          ? `${item?.createdByName ?? '有人'} 添加于 ${formatRelativeTime(item?.createdAt ?? new Date())}`
          : '写清楚一点，你们俩都能看懂。'
      }
      footer={
        <div className="sheet-actions">
          {editing ? (
            <button
              type="button"
              className={cx('button button--ghost button--danger', confirmDelete && 'is-confirming')}
              onClick={() => void remove()}
              disabled={busy}
            >
              <Trash2 size={17} />
              {confirmDelete ? '再点一次删除' : '删除'}
            </button>
          ) : (
            <button type="button" className="button button--ghost" onClick={close} disabled={busy}>
              取消
            </button>
          )}
          <button
            type="submit"
            form={formId}
            className="button button--primary"
            disabled={busy}
          >
            {busy ? <LoaderCircle size={17} className="spin" /> : <Check size={17} />}
            {editing ? '保存修改' : '加入清单'}
          </button>
        </div>
      }
    >
      <form id={formId} className="item-form" onSubmit={(event) => void submit(event)} noValidate>
        <label className="field">
          <span className="field__label">要买什么</span>
          <span className="field__control field__control--big">
            <input
              type="text"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                if (!editing && !categoryTouched) setCategory(guessCategory(event.target.value));
              }}
              placeholder="比如：洗衣液"
              maxLength={80}
              autoComplete="off"
            />
          </span>
        </label>

        <div className="form-row">
          <div className="field">
            <span className="field__label">数量</span>
            <div className="quantity">
              <button
                type="button"
                className="quantity__button"
                onClick={() => stepQuantity(-1)}
                aria-label="减少数量"
              >
                <Minus size={15} />
              </button>
              <input
                type="text"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                maxLength={20}
                inputMode="numeric"
                aria-label="数量"
              />
              <button
                type="button"
                className="quantity__button"
                onClick={() => stepQuantity(1)}
                aria-label="增加数量"
              >
                <Plus size={15} />
              </button>
            </div>
            {quantityLabel(quantity) ? (
              <span className="field__hint">也可以写「2 瓶」「半斤」</span>
            ) : (
              <span className="field__hint">默认 1 件</span>
            )}
          </div>
        </div>

        <label className="field">
          <span className="field__label">
            备注 <span className="field__optional">可选</span>
          </span>
          <span className="field__control">
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="牌子、口味、放在哪里……"
              rows={2}
              maxLength={200}
            />
          </span>
        </label>

        <fieldset className="field field--fieldset">
          <legend className="field__label">放在哪一类</legend>
          <div className="category-grid">
            {CATEGORIES.map((meta) => (
              <button
                key={meta.id}
                type="button"
                className={cx('category-choice', category === meta.id && 'is-active')}
                style={
                  category === meta.id
                    ? { color: meta.color, backgroundColor: meta.soft, borderColor: meta.color }
                    : undefined
                }
                onClick={() => {
                  setCategory(meta.id);
                  setCategoryTouched(true);
                }}
                aria-pressed={category === meta.id}
              >
                <CategoryIcon category={meta.id} size={17} />
                {meta.label}
              </button>
            ))}
          </div>
        </fieldset>

        {error ? (
          <div className="form-alert" role="alert">
            {error}
          </div>
        ) : null}
      </form>
    </Sheet>
  );
}
