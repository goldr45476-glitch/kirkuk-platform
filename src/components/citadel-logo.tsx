/** Kirkuk Citadel silhouette: a walled hilltop fortress with corner towers, a central keep, crenellations and a gate. */
export function CitadelLogo({ className, gate = "#0f766e", flag = "#f59e0b" }: { className?: string; gate?: string; flag?: string }) {
  const merlons = (xs: number[], y: number, w: number, h: number) => xs.map((x) => <rect key={`${x}-${y}`} x={x} y={y} width={w} height={h} />);
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden fill="#fff">
      <path d="M1 61c5-10 15-14 31-14s26 4 31 14z" opacity=".5" />
      <rect x="8" y="35" width="48" height="14" rx="1" />
      {merlons([8, 16.6, 25.2, 33.8, 42.4, 51], 31, 5, 4)}
      <rect x="5" y="25" width="11" height="24" rx="1" />
      {merlons([5, 9.2, 13.4], 21.5, 3.2, 3.5)}
      <rect x="48" y="25" width="11" height="24" rx="1" />
      {merlons([48, 52.2, 56.4], 21.5, 3.2, 3.5)}
      <rect x="24.5" y="14" width="15" height="36" rx="1" />
      {merlons([24.5, 30, 35.5], 10.5, 4, 3.5)}
      <path d="M32 10.5V3.5" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M32.6 3.8l6 2.2-6 2.2z" fill={flag} />
      <path d="M28 50V43a4 4 0 0 1 8 0v7z" fill={gate} />
      <rect x="8.5" y="39" width="3" height="5" rx="1.5" fill={gate} />
      <rect x="52.5" y="39" width="3" height="5" rx="1.5" fill={gate} />
      <rect x="29.5" y="21" width="5" height="7" rx="2.5" fill={gate} />
    </svg>
  );
}
