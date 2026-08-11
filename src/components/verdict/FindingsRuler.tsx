import { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { AgentType } from "@/lib/verdict-types";
import { formatTimestamp } from "@/lib/verdict-types";

export interface RulerFinding {
  id: string;
  agent: AgentType;
  severity: string;
  timestamp_ms: number;
  end_ms: number | null;
  title: string;
}

const LANE_COLOR: Record<AgentType, string> = {
  technical: "bg-escalate",
  pacing: "bg-fix",
  brand: "bg-brand",
};

/**
 * Findings ruler — custom timeline strip. Ticks positioned by timestamp
 * percentage; click seeks the player to that exact frame.
 */
export function FindingsRuler({
  durationMs,
  findings,
  currentMs,
  activeId,
  onSeek,
}: {
  durationMs: number;
  findings: RulerFinding[];
  currentMs: number;
  activeId?: string | null;
  onSeek: (ms: number, id: string) => void;
}) {
  const ticks = useMemo(
    () =>
      findings.map((f) => ({
        ...f,
        left: Math.min(99.4, Math.max(0, (f.timestamp_ms / Math.max(1, durationMs)) * 100)),
        width: f.end_ms
          ? Math.max(0.6, ((f.end_ms - f.timestamp_ms) / Math.max(1, durationMs)) * 100)
          : 0.6,
      })),
    [findings, durationMs],
  );

  const playhead = Math.min(100, (currentMs / Math.max(1, durationMs)) * 100);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="mono-label">Findings ruler</span>
        <span className="font-mono text-xs text-muted-foreground">
          {formatTimestamp(currentMs)} / {formatTimestamp(durationMs)}
        </span>
      </div>
      <div className="relative h-14 overflow-hidden rounded-lg border border-border bg-secondary/50">
        <div className="absolute inset-0 bg-grid opacity-60" aria-hidden />
        {(["technical", "pacing", "brand"] as AgentType[]).map((lane, i) => (
          <div
            key={lane}
            className="absolute left-0 right-0 h-px bg-border"
            style={{ top: `${(i + 1) * 25}%` }}
            aria-hidden
          />
        ))}
        {ticks.map((t, i) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onSeek(t.timestamp_ms, t.id)}
            title={`${formatTimestamp(t.timestamp_ms)} — ${t.title}`}
            aria-label={`Seek to ${formatTimestamp(t.timestamp_ms)}: ${t.title}`}
            className={cn(
              "absolute rounded-sm transition-soft hover:scale-y-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              LANE_COLOR[t.agent],
              activeId === t.id ? "opacity-100 ring-2 ring-foreground/70" : "opacity-70",
            )}
            style={{
              left: `${t.left}%`,
              width: `${t.width}%`,
              minWidth: 4,
              top: `${t.agent === "technical" ? 8 : t.agent === "pacing" ? 26 : 44}%`,
              height: "22%",
              zIndex: 2 + (i % 3),
            }}
          />
        ))}
        <div
          className="absolute top-0 bottom-0 z-10 w-px bg-foreground"
          style={{ left: `${playhead}%` }}
          aria-hidden
        />
      </div>
      <div className="flex flex-wrap gap-4">
        {(
          [
            ["technical", "Technical"],
            ["pacing", "Pacing"],
            ["brand", "Brand"],
          ] as Array<[AgentType, string]>
        ).map(([k, label]) => (
          <span key={k} className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className={cn("size-2 rounded-full", LANE_COLOR[k])} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
