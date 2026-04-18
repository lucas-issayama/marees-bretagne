type Point = { time: string; height: number };

export default function TideChart({ points }: { points: Point[] }) {
  if (points.length === 0) {
    return <div className="text-sm text-slate-500">Pas de données.</div>;
  }

  const width = 600;
  const height = 140;
  const padding = { top: 10, right: 10, bottom: 20, left: 30 };

  const heights = points.map((p) => p.height);
  const minH = Math.min(...heights);
  const maxH = Math.max(...heights);
  const range = maxH - minH || 1;

  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const x = (i: number) =>
    padding.left + (i / (points.length - 1)) * innerW;
  const y = (h: number) =>
    padding.top + innerH - ((h - minH) / range) * innerH;

  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(p.height).toFixed(1)}`)
    .join(" ");

  const areaPath =
    path +
    ` L ${x(points.length - 1).toFixed(1)} ${(padding.top + innerH).toFixed(1)}` +
    ` L ${x(0).toFixed(1)} ${(padding.top + innerH).toFixed(1)} Z`;

  const nowIdx = points.findIndex(
    (p) => new Date(p.time).getTime() > Date.now(),
  );

  const firstDayChangeIdx = points.findIndex(
    (p, i) => i > 0 && new Date(p.time).getDate() !== new Date(points[0].time).getDate(),
  );

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-36"
      role="img"
      aria-label="Courbe de hauteur d'eau"
    >
      <defs>
        <linearGradient id="tideGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0284c7" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#0284c7" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#tideGrad)" />
      <path d={path} fill="none" stroke="#0369a1" strokeWidth="1.8" />
      {firstDayChangeIdx > 0 && (
        <line
          x1={x(firstDayChangeIdx)}
          x2={x(firstDayChangeIdx)}
          y1={padding.top}
          y2={padding.top + innerH}
          stroke="#cbd5e1"
          strokeDasharray="3 3"
        />
      )}
      {nowIdx > 0 && (
        <line
          x1={x(nowIdx)}
          x2={x(nowIdx)}
          y1={padding.top}
          y2={padding.top + innerH}
          stroke="#dc2626"
          strokeWidth="1"
        />
      )}
      <text x={padding.left} y={height - 4} fontSize="10" fill="#64748b">
        {new Date(points[0].time).toLocaleDateString("fr-FR", {
          weekday: "short",
          day: "numeric",
          month: "short",
        })}
      </text>
      <text
        x={width - padding.right}
        y={height - 4}
        fontSize="10"
        fill="#64748b"
        textAnchor="end"
      >
        {new Date(points[points.length - 1].time).toLocaleDateString("fr-FR", {
          weekday: "short",
          day: "numeric",
          month: "short",
        })}
      </text>
      <text x={2} y={padding.top + 8} fontSize="10" fill="#64748b">
        {maxH.toFixed(1)}m
      </text>
      <text x={2} y={padding.top + innerH} fontSize="10" fill="#64748b">
        {minH.toFixed(1)}m
      </text>
    </svg>
  );
}
