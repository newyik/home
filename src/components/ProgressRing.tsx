export function ProgressRing({
  total,
  done,
  size = 92,
}: {
  total: number;
  done: number;
  size?: number;
}) {
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = total === 0 ? 0 : done / total;
  const offset = circumference * (1 - progress);

  return (
    <div className="progress-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255, 248, 239, 0.16)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#progress-gradient)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        <defs>
          <linearGradient id="progress-gradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#f2a46b" />
            <stop offset="1" stopColor="#e4603a" />
          </linearGradient>
        </defs>
      </svg>
      <div className="progress-ring__label">
        <strong>{total === 0 ? '0' : `${done}/${total}`}</strong>
        <span>{total === 0 ? '还没有' : '已买'}</span>
      </div>
    </div>
  );
}
