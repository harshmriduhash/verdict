import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { useActiveWorkspace, useBrandKits } from "@/lib/workspace";

export const Route = createFileRoute("/brand")({
  head: () => ({
    meta: [
      { title: "Brand kit — Verdict" },
      {
        name: "description",
        content:
          "Tone of voice, colours, fonts and pacing targets that Verdict's brand agent checks every export against.",
      },
      { property: "og:title", content: "Brand kit — Verdict" },
      {
        property: "og:description",
        content: "The taste profile Verdict reviews your videos against.",
      },
    ],
  }),
  component: BrandPage,
});

function BrandPage() {
  const { workspace } = useActiveWorkspace();
  const { data: kits = [], isLoading } = useBrandKits(workspace?.id);

  return (
    <AppShell>
      <h1 className="text-3xl font-semibold tracking-tight">Brand kit</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        What the brand agent measures every export against.
      </p>
      <div className="mt-8 space-y-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : kits.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            No brand kit yet.
          </div>
        ) : (
          kits.map((kit) => (
            <div key={kit.id} className="rounded-xl border border-border p-5">
              <p className="font-medium">{kit.name}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {kit.tone_of_voice ?? "No tone of voice set."}
              </p>
            </div>
          ))
        )}
      </div>
    </AppShell>
  );
}
