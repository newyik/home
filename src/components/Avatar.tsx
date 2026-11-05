import type { Member } from '../types';
import { cx } from '../lib/utils';

export function initials(name: string): string {
  const clean = name.trim();
  if (!clean) return '·';
  return Array.from(clean)[0] ?? '·';
}

export function Avatar({
  name,
  color,
  size = 36,
  className,
  title,
}: {
  name: string;
  color: string;
  size?: number;
  className?: string;
  title?: string;
}) {
  return (
    <span
      className={cx('avatar', className)}
      style={{
        width: size,
        height: size,
        backgroundColor: color,
        fontSize: Math.max(12, Math.round(size * 0.38)),
      }}
      title={title ?? name}
      aria-label={title ?? name}
    >
      {initials(name)}
    </span>
  );
}

export function MemberStack({ members, size = 30 }: { members: Member[]; size?: number }) {
  return (
    <div className="member-stack" aria-label={`${members.length} 位成员`}>
      {members.slice(0, 3).map((member, index) => (
        <span
          key={member.id}
          className="member-stack__item"
          style={{ zIndex: members.length - index }}
        >
          <Avatar
            name={member.displayName}
            color={member.color}
            size={size}
            title={`${member.displayName}${member.isMe ? '（我）' : ''}`}
          />
        </span>
      ))}
    </div>
  );
}
