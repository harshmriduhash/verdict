import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useActiveWorkspace, useBrandKits, canEdit } from "@/lib/workspace";

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
  const queryClient = useQueryClient();
  const kit = kits[0];
  const editable = canEdit(workspace?.role);

  const [name, setName] = useState("");
  const [tone, setTone] = useState("");
  const [colors, setColors] = useState("");
  const [fonts, setFonts] = useState("");
  const [shot, setShot] = useState("2.5");
  const [hook, setHook] = useState("3");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!kit) return;
    const pacing = (kit.pacing_profile ?? {}) as Record<string, number>;
    setName(kit.name);
    setTone(kit.tone_of_voice ?? "");
    setColors((Array.isArray(kit.primary_colors) ? kit.primary_colors : []).join(", "));
    setFonts((Array.isArray(kit.fonts) ? kit.fonts : []).join(", "));
    setShot(String(pacing["target_avg_shot_seconds"] ?? 2.5));
    setHook(String(pacing["hook_max_seconds"] ?? 3));
  }, [kit?.id]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kit) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("brand_kits")
        .update({
          name: name.trim() || "Default Brand",
          tone_of_voice: tone.trim() || null,
          primary_colors: colors
            .split(",")
            .map((c) => c.trim())
            .filter(Boolean),
          fonts: fonts
            .split(",")
            .map((f) => f.trim())
            .filter(Boolean),
          pacing_profile: {
            target_avg_shot_seconds: Number(shot) || 2.5,
            hook_max_seconds: Number(hook) || 3,
          },
        })
        .eq("id", kit.id);
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ["brand-kits", workspace?.id] });
      toast.success("Brand kit saved. The panel uses it on your next review.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save the brand kit.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight">Brand kit</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          What the brand and pacing agents measure every export against.
        </p>

        {isLoading ? (
          <p className="mt-8 text-sm text-muted-foreground">Loading…</p>
        ) : !kit ? (
          <div className="mt-8 rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            No brand kit yet.
          </div>
        ) : (
          <form onSubmit={save} className="mt-8 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Kit name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={!editable}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tone">Tone of voice</Label>
              <Textarea
                id="tone"
                rows={3}
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                disabled={!editable}
                placeholder="Confident, precise, slightly editorial. Never salesy."
              />
            </div>
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="colors">Primary colours</Label>
                <Input
                  id="colors"
                  value={colors}
                  onChange={(e) => setColors(e.target.value)}
                  disabled={!editable}
                  placeholder="#0A0A0B, #6366F1"
                />
                <div className="flex gap-2 pt-1">
                  {colors
                    .split(",")
                    .map((c) => c.trim())
                    .filter((c) => /^#[0-9a-fA-F]{3,8}$/.test(c))
                    .map((c) => (
                      <span
                        key={c}
                        className="size-6 rounded-full border border-border"
                        style={{ background: c }}
                      />
                    ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="fonts">Fonts</Label>
                <Input
                  id="fonts"
                  value={fonts}
                  onChange={(e) => setFonts(e.target.value)}
                  disabled={!editable}
                  placeholder="Inter, JetBrains Mono"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shot">Target average shot (seconds)</Label>
                <Input
                  id="shot"
                  type="number"
                  step="0.1"
                  min="0.3"
                  value={shot}
                  onChange={(e) => setShot(e.target.value)}
                  disabled={!editable}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hook">Hook must land by (seconds)</Label>
                <Input
                  id="hook"
                  type="number"
                  step="0.5"
                  min="0.5"
                  value={hook}
                  onChange={(e) => setHook(e.target.value)}
                  disabled={!editable}
                />
              </div>
            </div>
            {editable ? (
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save brand kit"}
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">
                Your role is view-only, so this kit is read-only.
              </p>
            )}
          </form>
        )}
      </div>
    </AppShell>
  );
}
