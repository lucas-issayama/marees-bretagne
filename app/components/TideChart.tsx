"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Point = { time: string; height: number };

// Our `time` strings are Europe/Paris naive ("2026-04-20T09:00"). Treat them
// as UTC for arithmetic so Date math and formatting are timezone-free.
function parseNaive(iso: string): Date {
  return new Date(iso + "Z");
}
function formatNaiveHHmm(iso: string): string {
  return iso.slice(11, 16);
}
function formatNaiveDayHour(iso: string): string {
  const d = parseNaive(iso);
  const weekday = d.toLocaleDateString("fr-FR", {
    weekday: "short",
    timeZone: "UTC",
  });
  return `${weekday} ${iso.slice(11, 16)}`;
}

// Linear interpolation between two naive timestamps, parameter t in [0,1].
function lerpNaiveTime(a: string, b: string, t: number): string {
  const ta = parseNaive(a).getTime();
  const tb = parseNaive(b).getTime();
  const ms = ta + (tb - ta) * t;
  return new Date(ms).toISOString().slice(0, 16);
}

// Catmull-Rom scalar interpolation between p1 and p2 given p0 and p3.
// Matches the visible curve so the tooltip dot always sits on the stroke.
function catmullRom(p0: number, p1: number, p2: number, p3: number, t: number) {
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    0.5 *
    (2 * p1 +
      (-p0 + p2) * t +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
      (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
  );
}

function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return "";
  if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
  const cmds: string[] = [`M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i === 0 ? 0 : i - 1];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2 < pts.length ? i + 2 : i + 1];
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    cmds.push(
      `C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`,
    );
  }
  return cmds.join(" ");
}

function niceTicks(min: number, max: number, target = 4): number[] {
  const span = max - min;
  if (span <= 0) return [min];
  const step = Math.pow(10, Math.floor(Math.log10(span / target)));
  const candidates = [1, 2, 2.5, 5, 10].map((m) => m * step);
  const stepChosen =
    candidates.find((s) => span / s <= target * 1.5) ??
    candidates[candidates.length - 1];
  const first = Math.ceil(min / stepChosen) * stepChosen;
  const ticks: number[] = [];
  for (let v = first; v <= max + 1e-9; v += stepChosen)
    ticks.push(Number(v.toFixed(4)));
  return ticks;
}

export default function TideChart({
  points,
  showDayLabels = true,
}: {
  points: Point[];
  showDayLabels?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [width, setWidth] = useState<number>(800);
  const [hoverFrac, setHoverFrac] = useState<number | null>(null);
  // Deferred until mount so SSR output never depends on Date.now() — avoids
  // hydration mismatches on the "now" marker.
  const [nowMs, setNowMs] = useState<number | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    setWidth(Math.max(280, Math.round(el.getBoundingClientRect().width)));
    const ro = new ResizeObserver(([entry]) => {
      setWidth(Math.max(280, Math.round(entry.contentRect.width)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    setNowMs(Date.now());
    const id = setInterval(() => setNowMs(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const height = 200;
  const padding = { top: 14, right: 14, bottom: 28, left: 40 };

  const geometry = useMemo(() => {
    if (points.length === 0) return null;
    const heights = points.map((p) => p.height);
    const minH = Math.min(...heights);
    const maxH = Math.max(...heights);
    const pad = (maxH - minH) * 0.1 || 0.5;
    const yMin = minH - pad;
    const yMax = maxH + pad;
    const range = yMax - yMin || 1;
    const innerW = width - padding.left - padding.right;
    const innerH = height - padding.top - padding.bottom;

    const xAt = (i: number) =>
      padding.left + (i / Math.max(1, points.length - 1)) * innerW;
    const yAt = (h: number) =>
      padding.top + innerH - ((h - yMin) / range) * innerH;

    const pxPoints = points.map((p, i) => ({ x: xAt(i), y: yAt(p.height) }));
    const line = smoothPath(pxPoints);
    const baseline = padding.top + innerH;
    const area = `${line} L ${pxPoints[pxPoints.length - 1].x.toFixed(2)} ${baseline.toFixed(2)} L ${pxPoints[0].x.toFixed(2)} ${baseline.toFixed(2)} Z`;

    return { xAt, yAt, pxPoints, line, area, innerW, innerH, yMin, yMax };
  }, [points, width]);

  if (points.length === 0 || !geometry) {
    return (
      <div ref={containerRef} className="w-full">
        <div className="text-sm text-slate-500">Pas de données.</div>
      </div>
    );
  }

  const { xAt, yAt, line, area, innerW, innerH, yMin, yMax } = geometry;

  // Interpolated "now" position as a fractional index. Null until mount so
  // server-rendered SVG matches the first client render.
  let nowFrac: number | null = null;
  if (nowMs != null) {
    for (let i = 0; i < points.length - 1; i++) {
      const t0 = parseNaive(points[i].time).getTime();
      const t1 = parseNaive(points[i + 1].time).getTime();
      if (nowMs >= t0 && nowMs <= t1) {
        nowFrac = i + (nowMs - t0) / (t1 - t0);
        break;
      }
    }
  }

  const totalHours = Math.max(1, points.length - 1);
  const hourStep = totalHours <= 12 ? 2 : totalHours <= 30 ? 3 : 6;
  const hourTicks = points
    .map((p, i) => ({ i, p }))
    .filter(({ p }) => {
      const hh = Number(p.time.slice(11, 13));
      const mm = Number(p.time.slice(14, 16));
      return mm === 0 && hh % hourStep === 0;
    });

  const yTicks = niceTicks(yMin, yMax, 4);

  const handleMove = (evt: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const px = ((evt.clientX - rect.left) / rect.width) * width;
    const ratio = (px - padding.left) / innerW;
    const frac = Math.max(
      0,
      Math.min(points.length - 1, ratio * (points.length - 1)),
    );
    setHoverFrac(frac);
  };

  const hoverInfo = (() => {
    if (hoverFrac == null) return null;
    const i = Math.min(points.length - 2, Math.max(0, Math.floor(hoverFrac)));
    const t = Math.max(0, Math.min(1, hoverFrac - i));
    const nextI = Math.min(points.length - 1, i + 1);

    const time = lerpNaiveTime(points[i].time, points[nextI].time, t);
    const p0 = points[Math.max(0, i - 1)].height;
    const p1 = points[i].height;
    const p2 = points[nextI].height;
    const p3 = points[Math.min(points.length - 1, i + 2)].height;
    const heightVal = catmullRom(p0, p1, p2, p3, t);

    const xFrac = padding.left + (hoverFrac / (points.length - 1)) * innerW;
    const yFrac = yAt(heightVal);
    return { time, height: heightVal, x: xFrac, y: yFrac };
  })();

  const tooltipW = 118;
  const tooltipH = 40;
  const tipX = hoverInfo
    ? Math.min(
        width - padding.right - tooltipW,
        Math.max(padding.left, hoverInfo.x - tooltipW / 2),
      )
    : 0;
  const tipY = hoverInfo
    ? Math.max(padding.top, hoverInfo.y - tooltipH - 10)
    : 0;

  return (
    <div ref={containerRef} className="w-full">
      <svg
        ref={svgRef}
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="block touch-none select-none"
        role="img"
        aria-label="Courbe de hauteur d'eau"
        onMouseMove={handleMove}
        onMouseLeave={() => setHoverFrac(null)}
      >
        <defs>
          <linearGradient id="tideArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.35" />
            <stop offset="60%" stopColor="#0ea5e9" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="tideLine" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0369a1" />
            <stop offset="100%" stopColor="#0ea5e9" />
          </linearGradient>
        </defs>

        {yTicks.map((t) => (
          <g key={`g-${t}`}>
            <line
              x1={padding.left}
              x2={width - padding.right}
              y1={yAt(t)}
              y2={yAt(t)}
              stroke="#e2e8f0"
              strokeWidth={1}
            />
            <text
              x={padding.left - 6}
              y={yAt(t)}
              fontSize="10"
              fill="#64748b"
              textAnchor="end"
              dominantBaseline="middle"
            >
              {t.toFixed(1)}
            </text>
          </g>
        ))}

        {hourTicks.map(({ i, p }) => (
          <g key={`h-${i}`}>
            <line
              x1={xAt(i)}
              x2={xAt(i)}
              y1={padding.top + innerH}
              y2={padding.top + innerH + 3}
              stroke="#cbd5e1"
            />
            <text
              x={xAt(i)}
              y={padding.top + innerH + 15}
              fontSize="10"
              fill="#64748b"
              textAnchor="middle"
            >
              {formatNaiveHHmm(p.time)}
            </text>
          </g>
        ))}

        <path d={area} fill="url(#tideArea)" />
        <path
          d={line}
          fill="none"
          stroke="url(#tideLine)"
          strokeWidth={2.2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {nowFrac != null && (
          <g>
            <line
              x1={padding.left + (nowFrac / (points.length - 1)) * innerW}
              x2={padding.left + (nowFrac / (points.length - 1)) * innerW}
              y1={padding.top}
              y2={padding.top + innerH}
              stroke="#dc2626"
              strokeWidth={1.25}
              strokeDasharray="2 3"
            />
            <circle
              cx={padding.left + (nowFrac / (points.length - 1)) * innerW}
              cy={padding.top}
              r={2.5}
              fill="#dc2626"
            />
          </g>
        )}

        {hoverInfo && (
          <g pointerEvents="none">
            <line
              x1={hoverInfo.x}
              x2={hoverInfo.x}
              y1={padding.top}
              y2={padding.top + innerH}
              stroke="#0f172a"
              strokeOpacity="0.2"
            />
            <circle
              cx={hoverInfo.x}
              cy={hoverInfo.y}
              r={5}
              fill="#0369a1"
              stroke="#fff"
              strokeWidth={2}
            />
            <rect
              x={tipX}
              y={tipY}
              width={tooltipW}
              height={tooltipH}
              rx={8}
              fill="#0f172a"
              opacity="0.95"
            />
            <text
              x={tipX + tooltipW / 2}
              y={tipY + 16}
              textAnchor="middle"
              fontSize="11.5"
              fontWeight={600}
              fill="#f8fafc"
            >
              {showDayLabels
                ? formatNaiveDayHour(hoverInfo.time)
                : formatNaiveHHmm(hoverInfo.time)}
            </text>
            <text
              x={tipX + tooltipW / 2}
              y={tipY + 31}
              textAnchor="middle"
              fontSize="11.5"
              fill="#7dd3fc"
            >
              {hoverInfo.height.toFixed(2)} m
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}
