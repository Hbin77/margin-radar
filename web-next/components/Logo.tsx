// 레이더 모티프 마크 — currentColor로 색 상속(헤더에선 크림)
export function RadarMark({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <g stroke="currentColor" fill="none" strokeLinecap="round">
        <circle cx="16" cy="16" r="10.5" strokeWidth="1.5" opacity="0.4" />
        <circle cx="16" cy="16" r="6.4" strokeWidth="1.5" opacity="0.65" />
        <line x1="16" y1="16" x2="24.4" y2="8.6" strokeWidth="1.9" />
      </g>
      <circle cx="16" cy="16" r="1.8" fill="currentColor" />
      <circle cx="22.7" cy="10.6" r="2" fill="currentColor" />
    </svg>
  );
}
