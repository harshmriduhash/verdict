import { CheckCircle2, AlertTriangle, ShieldAlert, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { VerdictType } from "@/lib/verdict-types";

const MAP = {
  ship: {
    label: "Ship",
    Icon: CheckCircle2,
    cls: "bg-ship-soft text-ship border-ship/40",
  },
  fix: {
    label: "Fix Required",
    Icon: AlertTriangle,
    cls: "bg-fix-soft text-fix border-fix/40",
  },
  escalate: {
    label: "Escalate",
    Icon: ShieldAlert,
    cls: "bg-escalate-soft text-escalate border-escalate/40",
  },
} as const;

export function VerdictBadge({
  verdict,
  processing,
  size = "md",
  className,
}: {
  verdict?: VerdictType | null;
  processing?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizing =
    size === "lg"
      ? "text-base px-5 py-2.5 gap-2.5"
      : size === "sm"
        ? "text-[11px] px-2.5 py-1 gap-1.5"
        : "text-sm px-3.5 py-1.5 gap-2";

  if (processing || !verdict) {
    return (
      <span
        className={cn(
          "inline-flex items-center rounded-full border border-border bg-secondary font-medium text-muted-foreground",
          sizing,
          className,
        )}
      >
        <Loader2
          className={cn("animate-spin", size === "lg" ? "size-5" : "size-3.5")}
        />
        {processing ? "Reviewing" : "No verdict"}
      </span>
    );
  }

  const { label, Icon, cls } = MAP[verdict];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border font-semibold tracking-tight",
        cls,
        sizing,
        className,
      )}
    >
      <Icon className={size === "lg" ? "size-5" : "size-3.5"} />
      {label}
    </span>
  );
}
