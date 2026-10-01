import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, Gavel } from "lucide-react";
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
        content: "Ship, fix or escalate. Every finding cited to the exact frame, and a taste memory that learns your overrides.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const FINDINGS = [
  { t: "00:00.0", agent: "Technical", sev: "high", text: "1.2 s of black frames before the hook" },
  { t: "00:03.4", agent: "Pacing", sev: "medium", text: "Hook lands at 3.4 s — brand target is 3.0 s" },
  { t: "00:05.2", agent: "Technical", sev: "medium", text: "Highlights clipped across 18% of frame" },
  { t: "00:07.9", agent: "Brand", sev: "low", text: "End card colour drifts from #6366F1" },
];

function HeroReport() {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setShown((n) => (n >= FINDINGS.length + 3 ? 0 : n + 1)), 900);
    return () => clearInterval(id);
  }, []);
  const verdictIn = shown > FINDINGS.length;
  return (
    <div className="mx-auto mt-16 max-w-3xl rounded-2xl border border-border bg-card p-5 text-left shadow-2xl">
      <div className="flex items-center gap-3 border-b border-border pb-4">
        <span className="size-2.5 rounded-full bg-muted-foreground/40" />
        <p className="flex-1 truncate font-mono text-xs text-muted-foreground">launch-teaser_v7_FINAL.mp4 · 0:08 · 1080p</p>
        <span
          className={`rounded-md px-2.5 py-1 font-mono text-xs font-semibold transition-all duration-500 ${
            verdictIn ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
          }`}
        >
          {verdictIn ? "VERDICT: FIX" : "PANEL DELIBERATING…"}
        </span>
      </div>
      <div className="relative mt-4 h-8 rounded-md bg-secondary">
        {FINDINGS.map((f, i) => (
          <span
            key={f.t}
            className={`absolute top-1 h-6 w-1 rounded-full bg-primary transition-opacity duration-500 ${i < shown ? "opacity-100" : "opacity-0"}`}
            style={{ left: `${(parseFloat(f.t.split(":")[1]!) / 8.2) * 96 + 1}%` }}
          />
        ))}
      </div>
      <ul className="mt-4 space-y-2">
        {FINDINGS.map((f, i) => (
          <li
            key={f.t}
            className={`flex items-center gap-3 rounded-lg border border-border px-3 py-2 text-sm transition-all duration-500 ${
              i < shown ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
            }`}
          >
            <span className="font-mono text-xs text-primary">{f.t}</span>
            <span className="mono-label w-20">{f.agent}</span>
            <span className="flex-1 text-muted-foreground">{f.text}</span>
            <span className="text-xs uppercase text-muted-foreground">{f.sev}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const PLANS = [
  { name: "Creator", price: "$19", unit: "/mo", items: ["30 reviews / month", "1 brand kit", "Taste memory", "PDF reports"] },
  { name: "Studio", price: "$79", unit: "/mo", items: ["200 reviews / month", "5 brand kits", "Team seats & roles", "Reference-video pacing"], featured: true },
  { name: "Agency", price: "Custom", unit: "", items: ["Unlimited reviews", "Per-client taste memory", "Batch review & Slack", "Priority support"] },
];

const QUOTES = [
  ["We caught a black-frame open on a paid ad 20 minutes before launch. Verdict paid for itself that day.", "Priya N.", "Head of Content, D2C brand"],
  ["It stopped flagging our signature jump cuts after three overrides. That's when the team started trusting it.", "Marcus L.", "Senior Editor, agency"],
  ["Review rounds went from three to one. The frame-accurate notes end the 'which part?' back-and-forth.", "Elena R.", "YouTube creator, 400k subs"],
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex h-16 max-w-6xl items-center px-6">
        <span className="flex items-center gap-2 font-semibold tracking-tight">
          <Gavel className="size-5 text-primary" /> Verdict
        </span>
        <nav className="ml-10 hidden gap-6 text-sm text-muted-foreground md:flex">
          <a href="#how" className="hover:text-foreground">How it works</a>
          <a href="#pricing" className="hover:text-foreground">Pricing</a>
          <a href="#customers" className="hover:text-foreground">Customers</a>
        </nav>
        <div className="ml-auto flex gap-2">
          <Button asChild size="sm" variant="ghost"><Link to="/auth">Sign in</Link></Button>
          <Button asChild size="sm"><Link to="/auth">Start free</Link></Button>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-6 pt-20 pb-24 text-center">
        <p className="mono-label">Editorial quality &amp; taste verification</p>
        <h1 className="mt-5 text-5xl font-semibold tracking-tight text-balance md:text-6xl">The last review before you publish.</h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
          Verdict puts every export in front of a panel: technical QA, pacing and story arc, brand style.
          You get one call — ship, fix, or escalate — with every finding cited to the exact frame.
        </p>
        <div className="mt-10 flex justify-center gap-3">
          <Button asChild size="lg"><Link to="/auth">Get your first verdict</Link></Button>
          <Button asChild size="lg" variant="secondary"><a href="#pricing">See pricing</a></Button>
        </div>
        <HeroReport />
      </section>

      <section id="how" className="mx-auto grid max-w-6xl gap-4 px-6 pb-24 md:grid-cols-3">
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

      <section id="customers" className="border-y border-border bg-card/40 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <p className="mono-label text-center">From the beta</p>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {QUOTES.map(([q, who, role]) => (
              <figure key={who} className="rounded-xl border border-border bg-background p-6">
                <blockquote className="text-sm leading-relaxed">“{q}”</blockquote>
                <figcaption className="mt-4 text-xs text-muted-foreground">
                  <span className="text-foreground">{who}</span> · {role}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="mx-auto max-w-6xl px-6 py-24">
        <h2 className="text-center text-3xl font-semibold tracking-tight">Simple pricing. Free during beta.</h2>
        <p className="mt-3 text-center text-sm text-muted-foreground">Every beta workspace gets full Studio features at no cost.</p>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {PLANS.map((p) => (
            <div key={p.name} className={`rounded-xl border p-6 ${p.featured ? "border-primary" : "border-border"}`}>
              <p className="font-medium">{p.name}</p>
              <p className="mt-3 text-4xl font-semibold">{p.price}<span className="text-sm text-muted-foreground">{p.unit}</span></p>
              <ul className="mt-6 space-y-2 text-sm text-muted-foreground">
                {p.items.map((i) => (
                  <li key={i} className="flex gap-2"><Check className="size-4 text-primary" /> {i}</li>
                ))}
              </ul>
              <Button asChild className="mt-6 w-full" variant={p.featured ? "default" : "secondary"}>
                <Link to="/auth">Join the beta</Link>
              </Button>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 py-12 text-sm md:grid-cols-4">
          <div>
            <span className="flex items-center gap-2 font-semibold"><Gavel className="size-4 text-primary" /> Verdict</span>
            <p className="mt-3 text-muted-foreground">The editorial quality layer between export and publish.</p>
          </div>
          <div className="space-y-2 text-muted-foreground">
            <p className="mono-label">Product</p>
            <a href="#how" className="block hover:text-foreground">How it works</a>
            <a href="#pricing" className="block hover:text-foreground">Pricing</a>
            <Link to="/auth" className="block hover:text-foreground">Sign in</Link>
          </div>
          <div className="space-y-2 text-muted-foreground">
            <p className="mono-label">Company</p>
            <a href="#customers" className="block hover:text-foreground">Customers</a>
            <a href="mailto:hello@verdict.video" className="block hover:text-foreground">Contact</a>
          </div>
          <div className="space-y-2 text-muted-foreground">
            <p className="mono-label">Trust</p>
            <p>Footage stored privately, per workspace</p>
            <p>Frames measured in your browser</p>
          </div>
        </div>
        <p className="border-t border-border py-6 text-center text-xs text-muted-foreground">© {new Date().getFullYear()} Verdict. All rights reserved.</p>
      </footer>
    </div>
  );
}
