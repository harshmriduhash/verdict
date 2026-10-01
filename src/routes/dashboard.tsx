import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { OnboardingCard } from "@/components/app/OnboardingCard";
import { WelcomeWizard } from "@/components/app/WelcomeWizard";
import { VerdictBadge } from "@/components/verdict/VerdictBadge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useActiveWorkspace, useProjects, useBrandKits } from "@/lib/workspace";
import { supabase } from "@/integrations/supabase/client";
import type { VerdictType } from "@/lib/verdict-types";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Review queue — Verdict" },
      {
        name: "description",
        content:
          "Every video export in your workspace with its technical, pacing and brand verdict at a glance.",
      },
      { property: "og:title", content: "Review queue — Verdict" },
      {
        property: "og:description",
        content: "Track ship, fix and escalate verdicts across your video exports.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { user, loading } = useAuth();
  const { workspace } = useActiveWorkspace();
  const { data: projects = [], isLoading } = useProjects(workspace?.id);
  const { data: kits = [] } = useBrandKits(workspace?.id);

  const { data: overrideCount = 0 } = useQuery({
    queryKey: ["override-count", workspace?.id],
    enabled: !!workspace?.id,
    queryFn: async () => {
      const { count } = await supabase
        .from("findings")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspace!.id)
        .neq("status", "open");
      return count ?? 0;
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["dash-stats", workspace?.id],
    enabled: !!workspace?.id,
    queryFn: async () => {
      const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString();
      const [week, taste, open] = await Promise.all([
        supabase.from("projects").select("verdict").eq("workspace_id", workspace!.id).gte("created_at", weekAgo),
        supabase.from("taste_preferences").select("id", { count: "exact", head: true }).eq("workspace_id", workspace!.id),
        supabase.from("findings").select("id", { count: "exact", head: true }).eq("workspace_id", workspace!.id).eq("status", "open"),
      ]);
      const rows = week.data ?? [];
      return {
        week: rows.filter((r) => r.verdict).length,
        ship: rows.filter((r) => r.verdict === "ship").length,
        taste: taste.count ?? 0,
        open: open.count ?? 0,
      };
    },
  });

  if (!loading && !user) {
    return (
      <AppShell>
        <p className="text-sm text-muted-foreground">
          You need to{" "}
          <Link to="/auth" className="underline">
            sign in
          </Link>{" "}
          to view your review queue.
        </p>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-8">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1">
            <h1 className="text-3xl font-semibold tracking-tight">Review queue</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Exports waiting on a verdict, plus everything already judged.
            </p>
          </div>
          <Button asChild>
            <Link to="/upload">
              <Plus className="size-4" /> New review
            </Link>
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Verdicts this week", stats?.week ?? 0, "across all exports"],
            ["Shipped this week", stats?.ship ?? 0, "cleared on first pass"],
            ["Open findings", stats?.open ?? 0, "waiting on a decision"],
            ["Taste memory", stats?.taste ?? 0, "learned preferences"],
          ].map(([label, value, hint]) => (
            <div key={label as string} className="rounded-xl border border-border p-5">
              <p className="mono-label">{label}</p>
              <p className="mt-2 text-3xl font-semibold tabular-nums">{value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
            </div>
          ))}
        </div>

        {!isLoading && projects.length === 0 ? <WelcomeWizard workspaceId={workspace?.id} /> : null}

        <OnboardingCard
          state={{
            brandKitReady: kits.some((k) => !!k.tone_of_voice),
            firstReview: projects.length > 0,
            firstOverride: overrideCount > 0,
          }}
        />

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading reviews…</p>
        ) : projects.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-10 text-center">
            <p className="text-sm text-muted-foreground">
              No reviews yet. Upload an export to get your first verdict.
            </p>
            <div className="mt-5 flex justify-center gap-2">
              <Button asChild variant="secondary">
                <Link to="/upload">Upload an export</Link>
              </Button>
              <Button asChild>
                <a href="/upload?sample=1">Try the sample video</a>
              </Button>
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border">
            {projects.map((p) => (
              <li key={p.id} className="transition-soft hover:bg-secondary/40">
                <Link
                  to="/review/$projectId"
                  params={{ projectId: p.id }}
                  className="flex items-center gap-4 px-5 py-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{p.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {p.brand_kits?.name ?? "No brand kit"} ·{" "}
                      {new Date(p.created_at).toLocaleString()}
                    </p>
                  </div>
                  <VerdictBadge
                    verdict={(p.verdict as VerdictType | null) ?? null}
                    processing={p.status === "reviewing"}
                    size="sm"
                  />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
