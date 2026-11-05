import { cx } from '../lib/utils';

export function LogoMark({
  size = 44,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={cx('logo-mark', className)}
      aria-hidden="true"
    >
      <rect width="64" height="64" rx="18" fill="#df5833" />
      <circle cx="51" cy="13" r="5" fill="#f3a766" opacity=".55" />
      <path
        d="M24.5 24.5V21a7.5 7.5 0 0 1 15 0v3.5"
        fill="none"
        stroke="#fff8ef"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M18.7 24.5h26.6c1 0 1.8.8 1.9 1.8l2 23.6c.1 1.1-.8 2.1-1.9 2.1H16.7c-1.1 0-2-1-1.9-2.1l2-23.6c.1-1 .9-1.8 1.9-1.8Z"
        fill="#fff8ef"
      />
      <path
        d="M32 45.1c-.5 0-1-.2-1.4-.5-2.9-2.4-6.4-5.2-6.4-8.7 0-2.5 1.9-4.5 4.4-4.5 1.4 0 2.6.7 3.4 1.8.8-1.1 2-1.8 3.4-1.8 2.5 0 4.4 2 4.4 4.5 0 3.5-3.5 6.3-6.4 8.7-.4.3-.9.5-1.4.5Z"
        fill="#df5833"
      />
    </svg>
  );
}

export function Logo({
  size = 44,
  subtitle,
  className,
}: {
  size?: number;
  subtitle?: string;
  className?: string;
}) {
  return (
    <div className={cx('logo', className)}>
      <LogoMark size={size} />
      <div className="logo__text">
        <span className="logo__name">小家控</span>
        {subtitle ? <span className="logo__subtitle">{subtitle}</span> : null}
      </div>
    </div>
  );
}
