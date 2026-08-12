import { Link } from "@tanstack/react-router";
import { Check, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface OnboardingState {
  brandKitReady: boolean;
  firstReview: boolean;
  firstOverride: boolean;
}

/**
 * Beta onboarding: three steps that dismiss themselves as the user completes
 * the loop (brand kit → first verdict → first override that trains taste memory).
 */
export function OnboardingCard({ state }: { state: OnboardingState }) {
  const steps = [
    {
      done: state.brandKitReady,
      title: "Tune your brand kit",
      body: "Tone, colours, fonts and a target shot length. The brand agent judges against this.",
      to: "/brand" as const,
      cta: "Open brand kit",
    },
    {
      done: state.firstReview,
      title: "Run your first review",
      body: "Drop in an export. Decomposition happens in your browser; the panel returns a verdict.",
      to: "/upload" as const,
      cta: "Upload an export",
    },
    {
      done: state.firstOverride,
      title: "Teach it your taste",
      body: "Mark a finding intentional. After three of the same, Verdict stops flagging it.",
      to: "/dashboard" as const,
      cta: "Open a review",
    },
  ];

  if (steps.every((s) => s.done)) return null;

  return (
    <section className="rounded-xl border border-border bg-secondary/30 p-6">
      <p className="mono-label">Beta onboarding</p>
      <h2 className="mt-1 text-lg font-semibold tracking-tight">
        Three steps to a working review loop
      </h2>
      <ol className="mt-5 grid gap-4 md:grid-cols-3">
        {steps.map((s) => (
          <li
            key={s.title}
            className={cn(
              "rounded-lg border p-4",
              s.done ? "border-ship/40 bg-ship-soft/40" : "border-border bg-background",
            )}
          >
            <div className="flex items-center gap-2">
              {s.done ? (
                <Check className="size-4 text-ship" />
              ) : (
                <Circle className="size-4 text-muted-foreground" />
              )}
              <span className="text-sm font-medium">{s.title}</span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{s.body}</p>
            {!s.done ? (
              <Link
                to={s.to}
                className="mt-3 inline-block text-xs text-primary underline-offset-4 hover:underline"
              >
                {s.cta} →
              </Link>
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  );
}
