import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Brain, Film, Trash2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { signedVideoUrl } from "@/lib/workspace";

function probe(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => {
      resolve(Number.isFinite(v.duration) ? v.duration : null);
      URL.revokeObjectURL(v.src);
    };
    v.onerror = () => resolve(null);
    v.src = URL.createObjectURL(file);
  });
}

export function ReferenceGallery({ workspaceId, kitId, editable }: { workspaceId: string; kitId: string; editable: boolean }) {
  const qc = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const key = ["reference-videos", kitId];
  const { data: refs = [] } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reference_videos")
        .select("*")
        .eq("brand_kit_id", kitId)
        .order("added_at", { ascending: false });
      if (error) throw error;
      return Promise.all(data.map(async (r) => ({ ...r, url: await signedVideoUrl(r.storage_path) })));
    },
  });

  const add = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("video/")) return toast.error("Choose a video file.");
    if (file.size > 200 * 1024 * 1024) return toast.error("Reference clips are capped at 200 MB.");
    setBusy(true);
    try {
      const duration = await probe(file);
      const ext = file.name.split(".").pop() ?? "mp4";
      const path = `${workspaceId}/refs/${crypto.randomUUID()}.${ext}`;
      const up = await supabase.storage.from("videos").upload(path, file, { contentType: file.type });
      if (up.error) throw up.error;
      const { error } = await supabase.from("reference_videos").insert({
        workspace_id: workspaceId,
        brand_kit_id: kitId,
        storage_path: path,
        label: file.name.replace(/\.[^.]+$/, ""),
        duration_seconds: duration ? Number(duration.toFixed(2)) : null,
      });
      if (error) throw error;
      toast.success("Reference added to your brand kit.");
      qc.invalidateQueries({ queryKey: key });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string, path: string) => {
    await supabase.storage.from("videos").remove([path]);
    const { error } = await supabase.from("reference_videos").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: key });
  };

  return (
    <section className="mt-14">
      <div className="flex items-end gap-4">
        <div className="flex-1">
          <h2 className="flex items-center gap-2 text-xl font-semibold"><Film className="size-5 text-primary" /> Reference videos</h2>
          <p className="mt-1 text-sm text-muted-foreground">Edits you consider on-brand. They define the rhythm the pacing agent aims for.</p>
        </div>
        {editable && (
          <>
            <input ref={input} type="file" accept="video/*" hidden onChange={(e) => add(e.target.files?.[0])} />
            <Button size="sm" variant="secondary" disabled={busy} onClick={() => input.current?.click()}>
              <UploadCloud className="size-4" /> {busy ? "Uploading…" : "Add reference"}
            </Button>
          </>
        )}
      </div>
      {refs.length === 0 ? (
        <p className="mt-5 rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No references yet. Add 2–3 of your best-performing edits.
        </p>
      ) : (
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {refs.map((r) => (
            <div key={r.id} className="overflow-hidden rounded-xl border border-border">
              {r.url ? <video src={r.url} controls preload="metadata" className="aspect-video w-full bg-secondary" /> : <div className="aspect-video bg-secondary" />}
              <div className="flex items-center gap-2 p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{r.label ?? "Reference"}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.duration_seconds ? `${r.duration_seconds}s` : "—"} · added {new Date(r.added_at).toLocaleDateString()}
                  </p>
                </div>
                {editable && (
                  <Button size="icon" variant="ghost" aria-label="Remove reference" onClick={() => remove(r.id, r.storage_path)}>
                    <Trash2 className="size-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export function TasteLog({ kitId, editable }: { kitId: string; editable: boolean }) {
  const qc = useQueryClient();
  const key = ["taste-log", kitId];
  const { data: prefs = [] } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("taste_preferences")
        .select("*")
        .eq("brand_kit_id", kitId)
        .order("last_reinforced_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const forget = async (id: string) => {
    const { error } = await supabase.from("taste_preferences").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Forgotten. The panel will flag this again.");
    qc.invalidateQueries({ queryKey: key });
  };

  return (
    <section className="mt-14">
      <h2 className="flex items-center gap-2 text-xl font-semibold"><Brain className="size-5 text-primary" /> Taste memory</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Everything Verdict has learned from your overrides, in plain words. After 3 matching overrides a rule is applied automatically.
      </p>
      {prefs.length === 0 ? (
        <p className="mt-5 rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Nothing learned yet. Mark a finding as "Intentional" on a review and it shows up here.
        </p>
      ) : (
        <ul className="mt-5 divide-y divide-border rounded-xl border border-border">
          {prefs.map((p) => {
            const active = p.override_count >= 3;
            return (
              <li key={p.id} className="flex items-start gap-4 p-4">
                <div className="min-w-0 flex-1">
                  <p className="text-sm">{p.preference_text}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    <span className="mono-label">{p.agent}</span> · {p.direction === "approve" ? "you keep approving this" : "you keep confirming this"} · {p.override_count} override{p.override_count === 1 ? "" : "s"} · {Math.round(p.confidence_score * 100)}% confidence · {active ? "applied" : `${3 - p.override_count} more to apply`}
                  </p>
                  <div className="mt-2 h-1 w-40 rounded-full bg-secondary">
                    <div className="h-1 rounded-full bg-primary" style={{ width: `${Math.min(100, p.confidence_score * 100)}%` }} />
                  </div>
                </div>
                {editable && (
                  <Button size="sm" variant="ghost" onClick={() => forget(p.id)}>Forget</Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
