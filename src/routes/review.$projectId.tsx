import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Check, Wrench } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { VerdictBadge } from "@/components/verdict/VerdictBadge";
import { FindingsRuler, type RulerFinding } from "@/components/verdict/FindingsRuler";
import {
  ReviewPlayer,
  type ReviewPlayerHandle,
} from "@/components/verdict/ReviewPlayer";
import { supabase } from "@/integrations/supabase/client";
import { signedVideoUrl, useActiveWorkspace, canEdit } from "@/lib/workspace";
import { overrideFinding } from "@/lib/verdict.functions";
import {
  AGENT_LABEL,
  formatTimestamp,
  type AgentType,
  type VerdictType,
} from "@/lib/verdict-types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/review/$projectId")({
  head: () => ({
    meta: [
      { title: "Review — Verdict" },
      {
        name: "description",
        content:
          "Frame-accurate findings from the technical, pacing and brand agents, with the panel's final call.",
      },
      { property: "og:title", content: "Review — Verdict" },
      {
        property: "og:description",
        content: "Every finding cited to the exact frame, with override controls.",
      },
    ],
  }),
  component: ReviewPage,
});

function ReviewPage() {
  const { projectId } = Route.useParams();
  const queryClient = useQueryClient();
  const { workspace } = useActiveWorkspace();
  const override = useServerFn(overrideFinding);
  const playerRef = useRef<ReviewPlayerHandle>(null);
  const [currentMs, setCurrentMs] = useState(0);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [lane, setLane] = useState<AgentType | "all">("all");

  const { data, isLoading } = useQuery({
    queryKey: ["review", projectId],
    refetchInterval: (q) =>
      (q.state.data as { project?: { status?: string } } | undefined)?.project
        ?.status === "reviewing"
        ? 4000
        : false,
    queryFn: async () => {
      const [{ data: project, error }, { data: findings }] = await Promise.all([
        supabase
          .from("projects")
          .select("*, brand_kits(name)")
          .eq("id", projectId)
          .maybeSingle(),
        supabase
          .from("findings")
          .select("*")
          .eq("project_id", projectId)
          .order("timestamp_ms", { ascending: true }),
      ]);
      if (error) throw error;
      const url = await signedVideoUrl(project?.storage_path ?? null);
      return { project, findings: findings ?? [], url };
    },
  });

  if (isLoading) {
    return (
      <AppShell>
        <p className="text-sm text-muted-foreground">Loading review…</p>
      </AppShell>
    );
  }

  const project = data?.project;
  if (!project) {
    return (
      <AppShell>
        <p className="text-sm text-muted-foreground">
          This review doesn't exist or you don't have access.{" "}
          <Link to="/dashboard" className="underline">
            Back to the queue
          </Link>
        </p>
      </AppShell>
    );
  }

  const findings = data!.findings;
  const durationMs = Math.round((project.duration_seconds ?? 0) * 1000);
  const scores = (project.scores ?? {}) as Record<string, number>;
  const visible = findings.filter((f) => lane === "all" || f.agent === lane);
  const editable = canEdit(workspace?.role);

  const seek = (ms: number, id: string) => {
    setActiveId(id);
    setCurrentMs(ms);
    playerRef.current?.seekTo(ms);
  };

  const decide = async (
    findingId: string,
    decision: "approved" | "fix_confirmed",
  ) => {
    try {
      await override({ data: { findingId, decision } });
      await queryClient.invalidateQueries({ queryKey: ["review", projectId] });
      toast.success(
        decision === "approved"
          ? "Marked intentional — taste memory updated."
          : "Marked as a real fix.",
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't record that.");
    }
  };

  return (
    <AppShell>
      <div className="space-y-8">
        <div className="flex flex-wrap items-start gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-3xl font-semibold tracking-tight">
              {project.title}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {project.brand_kits?.name ?? "No brand kit"} ·{" "}
              {formatTimestamp(durationMs)} · {project.width}×{project.height}
            </p>
          </div>
          <VerdictBadge
            verdict={project.verdict as VerdictType | null}
            processing={project.status === "reviewing"}
            size="lg"
          />
        </div>

        {project.verdict_summary ? (
          <p className="rounded-xl border border-border bg-secondary/40 p-5 text-sm leading-relaxed">
            {project.verdict_summary}
          </p>
        ) : null}

        {project.degraded ? (
          <p className="rounded-lg border border-fix/40 bg-fix-soft p-4 text-sm text-fix">
            {project.degraded_reason ?? "Partial verdict — a specialist was unavailable."}
          </p>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-4">
          {(
            [
              ["Overall", scores["overall"]],
              ["Technical", scores["technical"]],
              ["Pacing", scores["pacing"]],
              ["Brand", scores["brand"]],
            ] as Array<[string, number | undefined]>
          ).map(([label, v]) => (
            <div key={label} className="rounded-xl border border-border p-4">
              <p className="mono-label">{label}</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">
                {typeof v === "number" ? v : "—"}
              </p>
            </div>
          ))}
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <div className="space-y-4">
            <ReviewPlayer
              ref={playerRef}
              src={data!.url}
              onTimeUpdate={(ms) => setCurrentMs(ms)}
            />
            <FindingsRuler
              durationMs={durationMs}
              findings={findings as unknown as RulerFinding[]}
              currentMs={currentMs}
              activeId={activeId}
              onSeek={seek}
            />
          </div>

          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {(["all", "technical", "pacing", "brand"] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setLane(k)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs transition-soft",
                    lane === k
                      ? "border-foreground bg-foreground text-background"
                      : "border-border text-muted-foreground hover:text-foreground",
                  )}
                >
                  {k === "all" ? "All findings" : AGENT_LABEL[k]}
                </button>
              ))}
            </div>

            {visible.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                {project.status === "reviewing"
                  ? "The panel is still deliberating…"
                  : "No findings in this lane. Clean."}
              </div>
            ) : (
              <ul className="space-y-3">
                {visible.map((f) => (
                  <li
                    key={f.id}
                    className={cn(
                      "rounded-xl border p-4 transition-soft",
                      activeId === f.id ? "border-foreground" : "border-border",
                      f.status !== "open" && "opacity-60",
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => seek(f.timestamp_ms, f.id)}
                        className="font-mono text-xs text-primary underline-offset-4 hover:underline"
                      >
                        {formatTimestamp(f.timestamp_ms)}
                      </button>
                      <span className="mono-label">{AGENT_LABEL[f.agent]}</span>
                      <span
                        className={cn(
                          "ml-auto rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide",
                          f.severity === "critical"
                            ? "border-escalate/40 bg-escalate-soft text-escalate"
                            : f.severity === "warn"
                              ? "border-fix/40 bg-fix-soft text-fix"
                              : "border-border text-muted-foreground",
                        )}
                      >
                        {f.severity}
                      </span>
                    </div>
                    <p className="mt-2 font-medium">{f.title}</p>
                    <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">
                      {f.explanation}
                    </p>
                    {f.evidence ? (
                      <p className="mt-2 font-mono text-xs text-muted-foreground">
                        {f.evidence}
                      </p>
                    ) : null}
                    {editable && f.status === "open" ? (
                      <div className="mt-3 flex gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => decide(f.id, "approved")}
                        >
                          <Check className="size-3.5" /> Intentional
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => decide(f.id, "fix_confirmed")}
                        >
                          <Wrench className="size-3.5" /> Real fix
                        </Button>
                      </div>
                    ) : f.status !== "open" ? (
                      <p className="mt-3 text-xs text-muted-foreground">
                        {f.status === "approved"
                          ? "Overridden as intentional — taste memory learned this."
                          : "Confirmed as a real fix."}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
