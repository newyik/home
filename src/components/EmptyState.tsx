import { Plus, Search, ShoppingBasket, Sparkles } from 'lucide-react';
import type { ReactNode } from 'react';

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  icon = 'basket',
}: {
  title: string;
  description: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  icon?: 'basket' | 'search' | 'sparkles';
}) {
  const Icon = icon === 'search' ? Search : icon === 'sparkles' ? Sparkles : ShoppingBasket;

  return (
    <div className="empty">
      <div className="empty__art" aria-hidden="true">
        <span className="empty__blob" />
        <span className="empty__icon">
          <Icon size={30} strokeWidth={1.7} />
        </span>
        <span className="empty__spark empty__spark--one" />
        <span className="empty__spark empty__spark--two" />
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      {actionLabel && onAction ? (
        <button type="button" className="button button--soft" onClick={onAction}>
          <Plus size={16} />
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
