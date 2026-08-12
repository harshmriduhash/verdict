import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { OnboardingCard } from "@/components/app/OnboardingCard";
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
            <Button asChild className="mt-5" variant="secondary">
              <Link to="/upload">Upload an export</Link>
            </Button>
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
