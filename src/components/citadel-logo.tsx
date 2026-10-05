/** Kirkuk Citadel: a long crenellated wall meeting a round corner tower, with arrow slits and a sun disc behind (after the real citadel's silhouette). */
export function CitadelLogo({ className, gate = "#0f766e", sun = "#f59e0b" }: { className?: string; gate?: string; sun?: string }) {
  const merlons = (xs: number[], y: number, w: number, h: number) => xs.map((x) => <rect key={`${x}-${y}`} x={x} y={y} width={w} height={h} rx="1.1" />);
  const slits = (xs: number[], y: number, h: number) => xs.map((x) => <rect key={`${x}-${y}`} x={x} y={y} width="1.9" height={h} rx=".95" fill={gate} />);
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden fill="#fff">
      <circle cx="42" cy="27" r="19" fill={sun} opacity=".95" />
      <rect x="6" y="26" width="36" height="27" />
      {merlons([6, 12.4, 18.8, 25.2, 31.6], 21, 4, 5.5)}
      <path d="M40 45l-2.5 8h24L58 45z" />
      <rect x="40" y="20" width="18" height="32" />
      {merlons([40, 44.8, 49.6, 54.4], 14.5, 3.6, 6)}
      <rect x="2" y="54.5" width="60" height="4" rx="2" opacity=".6" />
      {slits([10.5, 18, 25.5, 33], 32, 9)}
      {slits([45.5, 52], 28, 10)}
    </svg>
  );
}
