import { useEffect, useImperativeHandle, useRef, useState, forwardRef } from "react";
import { Pause, Play, SkipBack, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatTimestamp } from "@/lib/verdict-types";

export interface ReviewPlayerHandle {
  seekTo: (ms: number) => void;
}

/**
 * Frame-accurate review player.
 * Uses requestVideoFrameCallback where available (Chrome/Edge) for exact frame
 * timing, and degrades to a standard <video> timeupdate loop everywhere else.
 */
export const ReviewPlayer = forwardRef<
  ReviewPlayerHandle,
  {
    src: string | null;
    onTimeUpdate?: (ms: number) => void;
    poster?: string;
  }
>(function ReviewPlayer({ src, onTimeUpdate }, ref) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentMs, setCurrentMs] = useState(0);
  const [frameAccurate, setFrameAccurate] = useState(false);

  useImperativeHandle(ref, () => ({
    seekTo: (ms: number) => {
      const v = videoRef.current;
      if (!v) return;
      v.currentTime = ms / 1000;
      setCurrentMs(ms);
      onTimeUpdate?.(ms);
    },
  }));

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    type WithRVFC = HTMLVideoElement & {
      requestVideoFrameCallback?: (cb: (now: number, meta: { mediaTime: number }) => void) => number;
    };
    const withRvfc = v as WithRVFC;
    let handle = 0;
    let cancelled = false;

    if (typeof withRvfc.requestVideoFrameCallback === "function") {
      setFrameAccurate(true);
      const tick = (_now: number, meta: { mediaTime: number }) => {
        if (cancelled) return;
        const ms = Math.round(meta.mediaTime * 1000);
        setCurrentMs(ms);
        onTimeUpdate?.(ms);
        handle = withRvfc.requestVideoFrameCallback!(tick);
      };
      handle = withRvfc.requestVideoFrameCallback(tick);
      return () => {
        cancelled = true;
        void handle;
      };
    }

    const onTime = () => {
      const ms = Math.round(v.currentTime * 1000);
      setCurrentMs(ms);
      onTimeUpdate?.(ms);
    };
    v.addEventListener("timeupdate", onTime);
    return () => v.removeEventListener("timeupdate", onTime);
  }, [onTimeUpdate, src]);

  const nudge = (deltaMs: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, v.currentTime + deltaMs / 1000);
  };

  const toggle = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      void v.play();
      setPlaying(true);
    } else {
      v.pause();
      setPlaying(false);
    }
  };

  return (
    <div
      className="space-y-3"
      onKeyDown={(e) => {
        if (e.key === " ") {
          e.preventDefault();
          toggle();
        }
        if (e.key === "ArrowRight") nudge(1000 / 30);
        if (e.key === "ArrowLeft") nudge(-1000 / 30);
      }}
      tabIndex={0}
      role="group"
      aria-label="Review player. Space toggles playback, arrow keys step frames."
    >
      <div className="relative overflow-hidden rounded-xl border border-border bg-black shadow-elevated">
        {src ? (
          <video
            ref={videoRef}
            src={src}
            className="aspect-video w-full"
            controls
            playsInline
            preload="metadata"
          />
        ) : (
          <div className="flex aspect-video w-full items-center justify-center text-sm text-muted-foreground">
            Video unavailable
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="secondary" onClick={() => nudge(-1000 / 30)}>
          <SkipBack className="size-4" /> Frame
        </Button>
        <Button size="sm" onClick={toggle}>
          {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
          {playing ? "Pause" : "Play"}
        </Button>
        <Button size="sm" variant="secondary" onClick={() => nudge(1000 / 30)}>
          Frame <SkipForward className="size-4" />
        </Button>
        <span className="ml-auto font-mono text-xs text-muted-foreground">
          {formatTimestamp(currentMs)} · {frameAccurate ? "frame-accurate" : "standard playback"}
        </span>
      </div>
    </div>
  );
});
