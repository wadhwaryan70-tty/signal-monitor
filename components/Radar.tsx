"use client";

// The account radar: every account is a blip. Distance from the centre = how cold it is
// (score 100 sits at the centre, quiet accounts drift to the rim). Colour = status.

import Link from "next/link";
import { useMemo, useState } from "react";
import type { SignalStatus } from "@/lib/db";
import { STATUS } from "@/lib/ui";

export interface Blip {
  id: string;
  name: string;
  score: number;
  status: SignalStatus;
  summary: string | null;
}

const SIZE = 360;
const C = SIZE / 2;
const R = C - 14;

/** Stable pseudo-random angle per account so blips don't jump around between renders. */
function angleFor(id: string): number {
  let h = 2166136261;
  for (const ch of id) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return ((h >>> 0) % 3600) / 10;
}

export function Radar({ blips }: { blips: Blip[] }) {
  const [hover, setHover] = useState<string | null>(null);
  const points = useMemo(
    () =>
      blips.map((b) => {
        const r = R * (0.12 + 0.86 * (1 - Math.min(100, b.score) / 100));
        const a = (angleFor(b.id) * Math.PI) / 180;
        return { ...b, x: C + r * Math.cos(a), y: C + r * Math.sin(a) };
      }),
    [blips],
  );
  const active = points.find((p) => p.id === hover);

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[360px]">
      <div className="absolute inset-[14px] overflow-hidden rounded-full">
        <div className="radar-sweep absolute inset-0 rounded-full" />
      </div>
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="relative h-full w-full" role="img" aria-label="Account radar">
        <defs>
          <radialGradient id="rg" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ff5a36" stopOpacity="0.16" />
            <stop offset="45%" stopColor="#ffb020" stopOpacity="0.05" />
            <stop offset="100%" stopColor="#000" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx={C} cy={C} r={R} fill="url(#rg)" stroke="#2a3542" />
        {[0.25, 0.5, 0.75].map((f) => (
          <circle key={f} cx={C} cy={C} r={R * f} fill="none" stroke="#1f2731" strokeDasharray="2 4" />
        ))}
        <line x1={C - R} y1={C} x2={C + R} y2={C} stroke="#1f2731" />
        <line x1={C} y1={C - R} x2={C} y2={C + R} stroke="#1f2731" />
        <text x={C + 4} y={C - R * 0.25 + 12} className="fill-faint" fontSize="8" fontFamily="var(--font-geist-mono)">HOT</text>
        <text x={C + 4} y={C - R * 0.75 + 12} className="fill-faint" fontSize="8" fontFamily="var(--font-geist-mono)">QUIET</text>
        {points.map((p) => {
          const s = STATUS[p.status];
          const big = p.status === "hot" || p.status === "warm";
          return (
            <g key={p.id} onMouseEnter={() => setHover(p.id)} onMouseLeave={() => setHover(null)} className="cursor-pointer">
              <Link href={`/accounts/${p.id}`}>
                {p.status === "hot" && <circle cx={p.x} cy={p.y} r={6} fill={s.color} className="ping" />}
                <circle cx={p.x} cy={p.y} r={14} fill="transparent" />
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={big ? 5.5 : 3.5}
                  fill={s.color}
                  stroke={hover === p.id ? "#fff" : "#07090c"}
                  strokeWidth={hover === p.id ? 2 : 1.5}
                  style={{ filter: big ? `drop-shadow(0 0 6px ${s.color})` : undefined }}
                />
                {big && (
                  <text x={p.x + 9} y={p.y + 3.5} fontSize="10" fill="#e8edf2" fontFamily="var(--font-geist-sans)" style={{ pointerEvents: "none" }}>
                    {p.name}
                  </text>
                )}
              </Link>
            </g>
          );
        })}
        <circle cx={C} cy={C} r={3} fill="#ff5a36" />
      </svg>
      {active && (
        <div className="glass pointer-events-none absolute left-1/2 top-full z-10 mt-2 w-64 -translate-x-1/2 rounded-lg p-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-medium text-text">{active.name}</span>
            <span className={STATUS[active.status].text}>
              {STATUS[active.status].label} · {active.score}
            </span>
          </div>
          <p className="mt-1 text-mute">{active.summary ?? "No trigger events in the last 14 days."}</p>
        </div>
      )}
    </div>
  );
}
