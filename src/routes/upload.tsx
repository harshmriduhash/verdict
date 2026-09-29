import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { UploadCloud, Check, Loader2, AlertCircle, Circle } from "lucide-react";
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

const STEPS = [
  { key: "decompose", label: "Measuring frames & audio", hint: "In your browser" },
  { key: "upload", label: "Uploading export", hint: "Encrypted, private storage" },
  { key: "create", label: "Creating review", hint: "" },
  { key: "panel", label: "Convening the panel", hint: "Technical · Pacing · Brand" },
] as const;
type StepKey = (typeof STEPS)[number]["key"];

function fmtBytes(n: number) {
  return n > 1e6 ? `${(n / 1e6).toFixed(1)} MB` : `${Math.round(n / 1e3)} KB`;
}

/** Uploads with real byte progress via the storage REST endpoint. */
async function uploadWithProgress(path: string, file: File, onProgress: (loaded: number) => void) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Your session expired. Sign in again.");
  const url = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/videos/${path}`;
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("apikey", import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);
    xhr.setRequestHeader("Content-Type", file.type || "video/mp4");
    xhr.setRequestHeader("x-upsert", "false");
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded);
    xhr.onload = () =>
      xhr.status < 300
        ? resolve()
        : reject(new Error(`Upload failed (${xhr.status}). ${xhr.responseText.slice(0, 160)}`));
    xhr.onerror = () => reject(new Error("Network dropped during upload. Check your connection and retry."));
    xhr.send(file);
  });
}

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
  const [step, setStep] = useState<StepKey | null>(null);
  const [failed, setFailed] = useState<{ step: StepKey; message: string } | null>(null);
  const [uploaded, setUploaded] = useState(0);
  const [startedAt, setStartedAt] = useState(0);

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

    setFailed(null);
    setStartedAt(Date.now());
    let current: StepKey = "decompose";
    const go = (k: StepKey) => {
      current = k;
      setStep(k);
    };
    try {
      go("decompose");
      setStage("Decomposing");
      setPct(2);
      const timeline = await decomposeVideo(file, (s, p) => {
        setStage(s);
        setPct(Math.max(2, Math.min(55, Math.round(p * 0.55))));
      });

      go("upload");
      setStage("Uploading");
      setUploaded(0);
      const ext = file.name.split(".").pop() ?? "mp4";
      const path = `${workspace.id}/${crypto.randomUUID()}.${ext}`;
      await uploadWithProgress(path, file, (loaded) => {
        setUploaded(loaded);
        setPct(55 + Math.round((loaded / file.size) * 25));
      });

      go("create");
      setStage("Creating review");
      setPct(82);
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

      go("panel");
      setStage("Convening the panel");
      setPct(88);
      await run({ data: { projectId: project.id, timeline } });

      setPct(100);
      toast.success("Verdict is in.");
      router.navigate({ to: "/review/$projectId", params: { projectId: project.id } });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Review failed.";
      setFailed({ step: current, message });
      setStage(null);
      setStep(null);
      toast.error(message);
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

            {busy || failed ? (
              <div className="space-y-4 rounded-xl border border-border p-5">
                {busy ? (
                  <div className="space-y-2">
                    <Progress value={pct} />
                    <p className="flex justify-between font-mono text-xs text-muted-foreground">
                      <span>{stage}…</span>
                      <span>
                        {pct}% · {Math.round((Date.now() - startedAt) / 1000)}s
                      </span>
                    </p>
                  </div>
                ) : null}
                <ol className="space-y-3">
                  {STEPS.map((s, i) => {
                    const activeIdx = STEPS.findIndex((x) => x.key === (step ?? failed?.step));
                    const isFailed = failed?.step === s.key;
                    const done = i < activeIdx;
                    const active = busy && step === s.key;
                    return (
                      <li key={s.key} className="flex items-start gap-3 text-sm">
                        {isFailed ? (
                          <AlertCircle className="mt-0.5 size-4 text-escalate" />
                        ) : done ? (
                          <Check className="mt-0.5 size-4 text-ship" />
                        ) : active ? (
                          <Loader2 className="mt-0.5 size-4 animate-spin text-primary" />
                        ) : (
                          <Circle className="mt-0.5 size-4 text-muted-foreground/40" />
                        )}
                        <div className="min-w-0">
                          <p className={active || done ? "text-foreground" : "text-muted-foreground"}>
                            {s.label}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {isFailed
                              ? failed.message
                              : active && s.key === "upload" && file
                                ? `${fmtBytes(uploaded)} of ${fmtBytes(file.size)}`
                                : active && s.key === "decompose"
                                  ? stage
                                  : s.hint}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
                {failed ? (
                  <p className="text-xs text-muted-foreground">
                    Fix the issue above and press the button again to retry.
                  </p>
                ) : null}
              </div>
            ) : null}

            <Button type="submit" size="lg" disabled={!file || busy} className="w-full">
              {busy ? "Reviewing…" : failed ? "Retry" : "Run the panel"}
            </Button>
          </form>
        )}
      </div>
    </AppShell>
  );
}
