import type {
  AudioProfile,
  FrameSample,
  ProjectTimeline,
  ShotSpan,
} from "./verdict-types";

/**
 * Browser-side deterministic decomposition.
 *
 * This is the Verdict equivalent of the ffmpeg + PySceneDetect + pyloudnorm
 * stage in the PRD. It runs entirely on the client (no upload needed to
 * analyse), which keeps compute cost near zero and means the pipeline works
 * even if every model call fails.
 */

const SAMPLE_W = 96;
const SAMPLE_H = 54;
const SCENE_CUT_THRESHOLD = 0.16;

function toHex(r: number, g: number, b: number) {
  return `#${[r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("")}`;
}

function quantizePalette(data: Uint8ClampedArray): string[] {
  const buckets = new Map<string, { n: number; r: number; g: number; b: number }>();
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]!;
    const g = data[i + 1]!;
    const b = data[i + 2]!;
    const key = `${r >> 5}-${g >> 5}-${b >> 5}`;
    const cur = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
    cur.n += 1;
    cur.r += r;
    cur.g += g;
    cur.b += b;
    buckets.set(key, cur);
  }
  return [...buckets.values()]
    .sort((a, b) => b.n - a.n)
    .slice(0, 3)
    .map((c) => toHex(c.r / c.n, c.g / c.n, c.b / c.n));
}

async function seek(video: HTMLVideoElement, timeSec: number) {
  await new Promise<void>((resolve, reject) => {
    const onSeeked = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error("Seek failed"));
    };
    const cleanup = () => {
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("error", onError);
    };
    video.addEventListener("seeked", onSeeked);
    video.addEventListener("error", onError);
    video.currentTime = Math.min(timeSec, Math.max(0, video.duration - 0.05));
  });
}

async function analyseAudio(file: File): Promise<AudioProfile> {
  const fallback: AudioProfile = {
    integratedDb: -18,
    peakDb: -3,
    silences: [],
    hasAudioTrack: false,
  };
  try {
    const AudioCtx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return fallback;
    const ctx = new AudioCtx();
    const buffer = await ctx.decodeAudioData(await file.arrayBuffer());
    const ch = buffer.getChannelData(0);
    const sr = buffer.sampleRate;
    const windowSize = Math.floor(sr * 0.25);
    let sumSquares = 0;
    let peak = 0;
    const silences: Array<{ startMs: number; endMs: number }> = [];
    let silenceStart: number | null = null;

    for (let w = 0; w < ch.length; w += windowSize) {
      let acc = 0;
      const end = Math.min(w + windowSize, ch.length);
      for (let i = w; i < end; i++) {
        const v = ch[i]!;
        acc += v * v;
        const a = Math.abs(v);
        if (a > peak) peak = a;
      }
      sumSquares += acc;
      const rms = Math.sqrt(acc / Math.max(1, end - w));
      const windowStartMs = (w / sr) * 1000;
      if (rms < 0.0015) {
        if (silenceStart === null) silenceStart = windowStartMs;
      } else if (silenceStart !== null) {
        if (windowStartMs - silenceStart >= 700) {
          silences.push({ startMs: silenceStart, endMs: windowStartMs });
        }
        silenceStart = null;
      }
    }
    if (silenceStart !== null) {
      const endMs = (ch.length / sr) * 1000;
      if (endMs - silenceStart >= 700) silences.push({ startMs: silenceStart, endMs });
    }

    const overallRms = Math.sqrt(sumSquares / Math.max(1, ch.length));
    void ctx.close();
    return {
      integratedDb: Number((20 * Math.log10(Math.max(overallRms, 1e-6))).toFixed(2)),
      peakDb: Number((20 * Math.log10(Math.max(peak, 1e-6))).toFixed(2)),
      silences: silences.slice(0, 12),
      hasAudioTrack: overallRms > 1e-5,
    };
  } catch {
    return fallback;
  }
}

export interface DecodeProgress {
  (stage: string, pct: number): void;
}

export async function decomposeVideo(
  file: File,
  onProgress: DecodeProgress = () => {},
): Promise<ProjectTimeline> {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.src = url;

  try {
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () =>
        reject(
          new Error(
            "This file couldn't be decoded in the browser. Re-export as H.264 MP4 with AAC audio.",
          ),
        );
    });

    const durationMs = Math.round((video.duration || 0) * 1000);
    if (!Number.isFinite(durationMs) || durationMs <= 0) {
      throw new Error("Could not read this video's duration — try re-exporting it.");
    }

    const canvas = document.createElement("canvas");
    canvas.width = SAMPLE_W;
    canvas.height = SAMPLE_H;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("Canvas unavailable in this browser.");

    const stepMs = durationMs <= 20000 ? 250 : durationMs <= 90000 ? 500 : 1000;
    const frames: FrameSample[] = [];
    let prev: Uint8ClampedArray | null = null;

    onProgress("Sampling frames", 5);
    for (let t = 0; t < durationMs; t += stepMs) {
      await seek(video, t / 1000);
      ctx.drawImage(video, 0, 0, SAMPLE_W, SAMPLE_H);
      const img = ctx.getImageData(0, 0, SAMPLE_W, SAMPLE_H);
      const data = img.data;

      let lumaSum = 0;
      let delta = 0;
      for (let i = 0; i < data.length; i += 4) {
        const l =
          (0.2126 * data[i]! + 0.7152 * data[i + 1]! + 0.0722 * data[i + 2]!) / 255;
        lumaSum += l;
        if (prev) {
          const pl =
            (0.2126 * prev[i]! + 0.7152 * prev[i + 1]! + 0.0722 * prev[i + 2]!) / 255;
          delta += Math.abs(l - pl);
        }
      }
      const n = data.length / 4;
      frames.push({
        timeMs: t,
        luma: Number((lumaSum / n).toFixed(4)),
        palette: quantizePalette(data),
        delta: prev ? Number((delta / n).toFixed(4)) : 0,
      });
      prev = new Uint8ClampedArray(data);
      onProgress("Sampling frames", 5 + Math.round((t / durationMs) * 55));
    }

    // Shot boundaries from frame deltas (PySceneDetect equivalent).
    const shots: ShotSpan[] = [];
    let shotStart = 0;
    let index = 0;
    for (const f of frames) {
      if (f.delta > SCENE_CUT_THRESHOLD && f.timeMs - shotStart > 400) {
        shots.push({ index: index++, startMs: shotStart, endMs: f.timeMs });
        shotStart = f.timeMs;
      }
    }
    shots.push({ index: index++, startMs: shotStart, endMs: durationMs });

    onProgress("Analysing audio", 70);
    const audio = await analyseAudio(file);

    onProgress("Building timeline", 92);
    return {
      durationMs,
      width: video.videoWidth || 0,
      height: video.videoHeight || 0,
      fps: 30,
      shots,
      frames,
      audio,
      transcript: [],
    };
  } finally {
    video.src = "";
    URL.revokeObjectURL(url);
  }
}
