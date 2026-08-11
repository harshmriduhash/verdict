import { Link, useRouter } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Gavel, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useActiveWorkspace } from "@/lib/workspace";
import { Button } from "@/components/ui/button";

export function AppShell({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const { workspace } = useActiveWorkspace();
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-6">
          <Link to="/dashboard" className="flex items-center gap-2 font-semibold tracking-tight">
            <Gavel className="size-5 text-primary" />
            Verdict
          </Link>
          <nav className="ml-6 hidden items-center gap-5 text-sm text-muted-foreground md:flex">
            <Link to="/dashboard" activeProps={{ className: "text-foreground" }}>
              Reviews
            </Link>
            <Link to="/brand" activeProps={{ className: "text-foreground" }}>
              Brand kit
            </Link>
          </nav>
          <div className="ml-auto flex items-center gap-3">
            {workspace ? (
              <span className="hidden text-xs text-muted-foreground sm:inline">
                {workspace.name} · {workspace.role}
              </span>
            ) : null}
            {user ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  await signOut();
                  router.navigate({ to: "/auth" });
                }}
              >
                <LogOut className="size-4" /> Sign out
              </Button>
            ) : null}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
    </div>
  );
}
