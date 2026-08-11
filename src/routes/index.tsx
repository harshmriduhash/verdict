import { createFileRoute, Link } from "@tanstack/react-router";
import { Gavel } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Verdict — the quality layer between export and publish" },
      {
        name: "description",
        content:
          "Verdict runs a panel of AI reviewers over every video export: technical QA, pacing and story arc, and brand style — with frame-accurate citations.",
      },
      { property: "og:title", content: "Verdict — quality review for video exports" },
      {
        property: "og:description",
        content:
          "Ship, fix or escalate. Every finding cited to the exact frame, and a taste memory that learns your overrides.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex h-16 max-w-5xl items-center px-6">
        <span className="flex items-center gap-2 font-semibold tracking-tight">
          <Gavel className="size-5 text-primary" /> Verdict
        </span>
        <div className="ml-auto">
          <Button asChild size="sm" variant="secondary">
            <Link to="/auth">Sign in</Link>
          </Button>
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-6 py-24 text-center">
        <p className="mono-label">Editorial quality &amp; taste verification</p>
        <h1 className="mt-5 text-5xl font-semibold tracking-tight text-balance">
          The last review before you publish.
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
          Verdict puts every export in front of a panel: technical QA, pacing and
          story arc, brand style. You get one call — ship, fix, or escalate — with
          every finding cited to the exact frame.
        </p>
        <div className="mt-10 flex justify-center gap-3">
          <Button asChild size="lg">
            <Link to="/auth">Start reviewing</Link>
          </Button>
          <Button asChild size="lg" variant="secondary">
            <Link to="/dashboard">See the queue</Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-4 px-6 pb-24 md:grid-cols-3">
        {[
          ["Technical QA", "Black frames, blown highlights, clipped and silent audio — detected deterministically, never hallucinated."],
          ["Pacing & story arc", "Shot rhythm measured against your reference edits, with the slow stretches timestamped."],
          ["Brand style", "Tone, colour and type checked against your brand kit, softened by a taste memory that learns your overrides."],
        ].map(([title, body]) => (
          <div key={title} className="rounded-xl border border-border p-6 text-left">
            <h2 className="font-medium">{title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
