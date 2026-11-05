import { Check, LoaderCircle, MoreHorizontal } from 'lucide-react';
import { CATEGORY_MAP, type Item } from '../types';
import { CategoryIcon } from './CategoryIcon';
import { cx, formatRelativeTime, quantityLabel } from '../lib/utils';

type ItemRowProps = {
  item: Item;
  onToggle: (item: Item) => void;
  onEdit: (item: Item) => void;
};

export function ItemRow({ item, onToggle, onEdit }: ItemRowProps) {
  const category = CATEGORY_MAP[item.category];
  const quantity = quantityLabel(item.quantity);

  const meta = item.pending
    ? '正在同步…'
    : item.done
      ? `${item.completedByName ?? '有人'} 买好了 · ${formatRelativeTime(item.completedAt ?? item.updatedAt)}`
      : [
          quantity ? `× ${quantity}` : '',
          item.note,
          `${item.createdByName} ${formatRelativeTime(item.createdAt)}`,
        ]
          .filter(Boolean)
          .join(' · ');

  return (
    <li className={cx('item', item.done && 'item--done', item.pending && 'item--pending')}>
      <button
        type="button"
        className="item__check"
        onClick={() => onToggle(item)}
        disabled={item.pending}
        aria-label={item.done ? `把「${item.name}」放回待买` : `标记「${item.name}」为已买`}
        aria-pressed={item.done}
        style={
          item.done
            ? { borderColor: category.color, backgroundColor: category.color }
            : undefined
        }
      >
        {item.pending ? (
          <LoaderCircle size={15} className="spin" />
        ) : item.done ? (
          <Check size={14} strokeWidth={3} />
        ) : null}
      </button>

      <button type="button" className="item__main" onClick={() => onEdit(item)}>
        <span className="item__name">{item.name}</span>
        <span className="item__meta">{meta}</span>
      </button>

      <span
        className="item__category"
        style={{ color: category.color, backgroundColor: category.soft }}
        title={category.label}
      >
        <CategoryIcon category={item.category} size={16} />
      </span>

      <button
        type="button"
        className="item__more"
        onClick={() => onEdit(item)}
        aria-label={`编辑「${item.name}」`}
      >
        <MoreHorizontal size={18} />
      </button>
    </li>
  );
}
