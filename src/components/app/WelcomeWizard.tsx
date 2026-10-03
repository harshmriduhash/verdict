import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Gavel, Palette, PlayCircle, UploadCloud } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useBrandKits } from "@/lib/workspace";

const KEY = "verdict.wizardDone";

export function WelcomeWizard({ workspaceId }: { workspaceId?: string | undefined }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [tone, setTone] = useState("");
  const { data: kits = [] } = useBrandKits(workspaceId);
  const qc = useQueryClient();

  useEffect(() => {
    if (!window.localStorage.getItem(KEY)) setOpen(true);
  }, []);

  const close = () => {
    window.localStorage.setItem(KEY, "1");
    setOpen(false);
  };

  const saveTone = async () => {
    const kit = kits[0];
    if (kit && tone.trim()) {
      const { error } = await supabase.from("brand_kits").update({ tone_of_voice: tone.trim() }).eq("id", kit.id);
      if (error) toast.error(error.message);
      else qc.invalidateQueries({ queryKey: ["brand-kits", workspaceId] });
    }
    setStep(2);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : close())}>
      <DialogContent className="max-w-lg">
        <div className="mb-2 flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <span key={i} className={`h-1 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-secondary"}`} />
          ))}
        </div>
        {step === 0 && (
          <>
            <Gavel className="size-8 text-primary" />
            <DialogTitle className="text-2xl">Welcome to Verdict</DialogTitle>
            <DialogDescription>
              Every export goes before a panel — Technical QA, Pacing, and Brand. You get one call:
              ship, fix or escalate, with each finding pinned to the exact frame. When you overrule
              the panel, it remembers.
            </DialogDescription>
            <Button className="mt-4" onClick={() => setStep(1)}>Set up in 60 seconds</Button>
          </>
        )}
        {step === 1 && (
          <>
            <Palette className="size-8 text-primary" />
            <DialogTitle className="text-2xl">How should your videos sound?</DialogTitle>
            <DialogDescription>
              One line about your tone of voice. The brand agent judges every export against it. You
              can refine colours, fonts and pacing later in Brand kit.
            </DialogDescription>
            <Textarea
              rows={3}
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              placeholder="Confident, precise, slightly editorial. Never salesy."
            />
            <div className="mt-2 flex justify-between">
              <Button variant="ghost" onClick={() => setStep(2)}>Skip</Button>
              <Button onClick={saveTone}>Continue</Button>
            </div>
          </>
        )}
        {step === 2 && (
          <>
            <PlayCircle className="size-8 text-primary" />
            <DialogTitle className="text-2xl">Get your first verdict</DialogTitle>
            <DialogDescription>
              Try our 8-second sample — it has deliberate problems so you can see the panel at work —
              or upload one of your own exports.
            </DialogDescription>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <Button asChild onClick={close}>
                <a href="/upload?sample=1"><PlayCircle className="size-4" /> Try the sample</a>
              </Button>
              <Button asChild variant="secondary" onClick={close}>
                <Link to="/upload"><UploadCloud className="size-4" /> Upload my own</Link>
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
