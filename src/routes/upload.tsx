import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useActiveWorkspace, useBrandKits, canEdit } from "@/lib/workspace";
import { decomposeVideo } from "@/lib/decompose";
import { runVerdict } from "@/lib/verdict.functions";

export const Route = createFileRoute("/upload")({
  head: () => ({
    meta: [
      { title: "New review — Verdict" },
      {
        name: "description",
        content:
          "Upload a video export and Verdict's panel returns a ship, fix or escalate call with frame-accurate findings.",
      },
      { property: "og:title", content: "New review — Verdict" },
      {
        property: "og:description",
        content: "Drop an export in and get a verdict in under a minute.",
      },
    ],
  }),
  component: UploadPage,
});

const MAX_BYTES = 500 * 1024 * 1024;

function UploadPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { workspace } = useActiveWorkspace();
  const { data: kits = [] } = useBrandKits(workspace?.id);
  const run = useServerFn(runVerdict);

  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [kitId, setKitId] = useState<string>("");
  const [stage, setStage] = useState<string | null>(null);
  const [pct, setPct] = useState(0);

  const busy = stage !== null;
  const editable = canEdit(workspace?.role);

  if (!loading && !user) {
    return (
      <AppShell>
        <p className="text-sm text-muted-foreground">
          <Link to="/auth" className="underline">
            Sign in
          </Link>{" "}
          to submit an export for review.
        </p>
      </AppShell>
    );
  }

  const pick = (f: File | null) => {
    if (!f) return;
    if (!f.type.startsWith("video/")) {
      toast.error("That's not a video file. Use MP4, MOV or WebM.");
      return;
    }
    if (f.size > MAX_BYTES) {
      toast.error("Max 500 MB per export for the beta.");
      return;
    }
    setFile(f);
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, ""));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !workspace || !user) return;

    try {
      setStage("Decomposing");
      setPct(2);
      const timeline = await decomposeVideo(file, (s, p) => {
        setStage(s);
        setPct(Math.max(2, Math.min(95, p)));
      });

      setStage("Uploading");
      setPct(60);
      const ext = file.name.split(".").pop() ?? "mp4";
      const path = `${workspace.id}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("videos")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw new Error(upErr.message);

      setStage("Creating review");
      setPct(72);
      const { data: project, error: insErr } = await supabase
        .from("projects")
        .insert({
          workspace_id: workspace.id,
          uploaded_by: user.id,
          brand_kit_id: kitId || kits[0]?.id || null,
          title: title.trim() || file.name,
          context_note: note.trim() || null,
          storage_path: path,
          status: "reviewing",
          duration_seconds: Number((timeline.durationMs / 1000).toFixed(2)),
          width: timeline.width,
          height: timeline.height,
        })
        .select("id")
        .single();
      if (insErr) throw new Error(insErr.message);

      setStage("Convening the panel");
      setPct(84);
      await run({ data: { projectId: project.id, timeline } });

      setPct(100);
      toast.success("Verdict is in.");
      router.navigate({ to: "/review/$projectId", params: { projectId: project.id } });
    } catch (err) {
      setStage(null);
      setPct(0);
      toast.error(err instanceof Error ? err.message : "Review failed.");
    }
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight">New review</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your export is decomposed in the browser, then judged by the panel. Nothing
          leaves your machine until the frames are already measured.
        </p>

        {!editable ? (
          <p className="mt-8 rounded-lg border border-border p-4 text-sm text-muted-foreground">
            Your role in {workspace?.name} is view-only, so you can't submit exports.
          </p>
        ) : (
          <form onSubmit={submit} className="mt-8 space-y-6">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                pick(e.dataTransfer.files?.[0] ?? null);
              }}
              className="flex w-full flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-secondary/30 px-6 py-12 text-center transition-soft hover:border-primary/60"
            >
              <UploadCloud className="size-7 text-primary" />
              <span className="text-sm font-medium">
                {file ? file.name : "Drop your export here, or browse"}
              </span>
              <span className="text-xs text-muted-foreground">
                MP4 / MOV / WebM · up to 500 MB · H.264 + AAC decodes best
              </span>
            </button>
            <input
              ref={inputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => pick(e.target.files?.[0] ?? null)}
            />

            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Q3 launch film v4"
                required
              />
            </div>

            {kits.length > 0 ? (
              <div className="space-y-2">
                <Label htmlFor="kit">Brand kit</Label>
                <select
                  id="kit"
                  value={kitId || kits[0]!.id}
                  onChange={(e) => setKitId(e.target.value)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  {kits.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="note">Context for the panel (optional)</Label>
              <Textarea
                id="note"
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="30s paid social cut. The jump cut at 0:04 is intentional."
              />
            </div>

            {busy ? (
              <div className="space-y-2">
                <Progress value={pct} />
                <p className="font-mono text-xs text-muted-foreground">
                  {stage}… {pct}%
                </p>
              </div>
            ) : null}

            <Button type="submit" size="lg" disabled={!file || busy} className="w-full">
              {busy ? "Reviewing…" : "Run the panel"}
            </Button>
          </form>
        )}
      </div>
    </AppShell>
  );
}
