import type {
  DraftFinding,
  ProjectTimeline,
  VerdictType,
} from "./verdict-types";

/**
 * Deterministic Technical QA + pacing statistics.
 * No LLM required. This is the floor the product degrades to.
 */

export interface PacingStats {
  shotCount: number;
  avgShotSeconds: number;
  medianShotSeconds: number;
  longestShotSeconds: number;
  hookDeltaScore: number;
  cutsPerMinute: number;
}

export function computePacingStats(timeline: ProjectTimeline): PacingStats {
  const lengths = timeline.shots.map((s) => (s.endMs - s.startMs) / 1000);
  const sorted = [...lengths].sort((a, b) => a - b);
  const median = sorted.length
    ? (sorted[Math.floor((sorted.length - 1) / 2)]! +
        sorted[Math.ceil((sorted.length - 1) / 2)]!) /
      2
    : 0;
  const hookFrames = timeline.frames.filter((f) => f.timeMs <= 3000);
  const hookDelta =
    hookFrames.length > 1
      ? hookFrames.reduce((a, f) => a + f.delta, 0) / (hookFrames.length - 1)
      : 0;
  const durationMin = Math.max(timeline.durationMs / 60000, 1 / 60);
  return {
    shotCount: timeline.shots.length,
    avgShotSeconds: Number(
      (lengths.reduce((a, b) => a + b, 0) / Math.max(1, lengths.length)).toFixed(2),
    ),
    medianShotSeconds: Number(median.toFixed(2)),
    longestShotSeconds: Number(Math.max(0, ...lengths).toFixed(2)),
    hookDeltaScore: Number(hookDelta.toFixed(4)),
    cutsPerMinute: Number((Math.max(0, timeline.shots.length - 1) / durationMin).toFixed(1)),
  };
}

export function runTechnicalQA(timeline: ProjectTimeline): DraftFinding[] {
  const findings: DraftFinding[] = [];

  // 1. Black / near-black frames mid-cut
  const blackRuns: Array<{ start: number; end: number }> = [];
  let runStart: number | null = null;
  for (const f of timeline.frames) {
    if (f.luma < 0.035) {
      if (runStart === null) runStart = f.timeMs;
    } else if (runStart !== null) {
      if (f.timeMs - runStart >= 400 && runStart > 200) {
        blackRuns.push({ start: runStart, end: f.timeMs });
      }
      runStart = null;
    }
  }
  for (const run of blackRuns.slice(0, 5)) {
    findings.push({
      agent: "technical",
      severity: run.end - run.start > 1000 ? "critical" : "warn",
      timestampMs: run.start,
      endMs: run.end,
      title: "Black frames detected",
      explanation: `Sampled luma stays below 3.5% for ${(
        (run.end - run.start) / 1000
      ).toFixed(2)}s. On most platforms this reads as a broken export or a dead beat in the cut.`,
      evidence: `mean_luma < 0.035 across sampled frames ${run.start}ms–${run.end}ms`,
      deterministic: true,
    });
  }

  // 2. Blown-out / overexposed stretch
  const blown = timeline.frames.filter((f) => f.luma > 0.965);
  if (blown.length >= 3) {
    findings.push({
      agent: "technical",
      severity: "warn",
      timestampMs: blown[0]!.timeMs,
      endMs: blown[blown.length - 1]!.timeMs,
      title: "Overexposed frames",
      explanation: `${blown.length} sampled frames exceed 96.5% mean luma. Detail is likely clipped in highlights.`,
      evidence: `mean_luma > 0.965 on ${blown.length} samples`,
      deterministic: true,
    });
  }

  // 3. Audio
  if (!timeline.audio.hasAudioTrack) {
    findings.push({
      agent: "technical",
      severity: "critical",
      timestampMs: 0,
      title: "No usable audio track",
      explanation:
        "No decodable audio signal was found. Silent video is auto-deprioritised by most social algorithms and fails most paid-placement specs.",
      evidence: "audio.hasAudioTrack = false",
      deterministic: true,
    });
  } else {
    if (timeline.audio.integratedDb < -30) {
      findings.push({
        agent: "technical",
        severity: "warn",
        timestampMs: 0,
        title: "Audio is under-levelled",
        explanation: `Integrated RMS is ${timeline.audio.integratedDb} dBFS — well below the −18 to −12 dBFS working range. Viewers will reach for the volume, and platform normalisation will raise your noise floor with it.`,
        evidence: `integrated_rms = ${timeline.audio.integratedDb} dBFS`,
        deterministic: true,
      });
    }
    if (timeline.audio.peakDb > -0.3) {
      findings.push({
        agent: "technical",
        severity: "critical",
        timestampMs: 0,
        title: "Audio peaks are clipping",
        explanation: `True peak hits ${timeline.audio.peakDb} dBFS. Anything above −1 dBFS risks audible distortion after platform transcode.`,
        evidence: `peak = ${timeline.audio.peakDb} dBFS`,
        deterministic: true,
      });
    }
    for (const s of timeline.audio.silences.filter(
      (x) => x.endMs - x.startMs > 1500 && x.startMs > 500,
    ).slice(0, 3)) {
      findings.push({
        agent: "technical",
        severity: "warn",
        timestampMs: Math.round(s.startMs),
        endMs: Math.round(s.endMs),
        title: "Audio dropout",
        explanation: `Silence of ${((s.endMs - s.startMs) / 1000).toFixed(
          1,
        )}s. If this isn't an intentional beat, it reads as a dropped track.`,
        evidence: `rms < 0.0015 for ${Math.round(s.endMs - s.startMs)}ms`,
        deterministic: true,
      });
    }
  }

  // 4. Resolution / aspect sanity
  if (timeline.height > 0 && timeline.height < 720) {
    findings.push({
      agent: "technical",
      severity: "warn",
      timestampMs: 0,
      title: "Below 720p export",
      explanation: `Export is ${timeline.width}×${timeline.height}. Paid placements re-compress aggressively; anything under 720p short-side visibly degrades.`,
      evidence: `resolution = ${timeline.width}x${timeline.height}`,
      deterministic: true,
    });
  }

  return findings;
}

export function deterministicPacingFindings(
  timeline: ProjectTimeline,
  stats: PacingStats,
  targetAvgShotSeconds: number,
): DraftFinding[] {
  const findings: DraftFinding[] = [];

  if (stats.hookDeltaScore < 0.012 && timeline.durationMs > 4000) {
    findings.push({
      agent: "pacing",
      severity: "warn",
      timestampMs: 0,
      endMs: 3000,
      title: "Static opening — weak hook",
      explanation:
        "Almost no visual change in the first 3 seconds. On feed placements the hook window is where 60%+ of drop-off happens; a static open gives the viewer nothing to stay for.",
      evidence: `hook_delta = ${stats.hookDeltaScore} (threshold 0.012)`,
      deterministic: true,
    });
  }

  const longShot = timeline.shots.find(
    (s) => (s.endMs - s.startMs) / 1000 > Math.max(6, targetAvgShotSeconds * 3),
  );
  if (longShot) {
    findings.push({
      agent: "pacing",
      severity: "info",
      timestampMs: longShot.startMs,
      endMs: longShot.endMs,
      title: "Shot runs long against brand pace",
      explanation: `This shot holds for ${(
        (longShot.endMs - longShot.startMs) / 1000
      ).toFixed(1)}s against a brand target of ~${targetAvgShotSeconds}s per shot.`,
      evidence: `shot_length = ${((longShot.endMs - longShot.startMs) / 1000).toFixed(1)}s`,
      deterministic: true,
    });
  }

  return findings;
}

export function scoreFromFindings(findings: DraftFinding[], agent: string) {
  const relevant = findings.filter((f) => f.agent === agent);
  const penalty = relevant.reduce(
    (a, f) => a + (f.severity === "critical" ? 26 : f.severity === "warn" ? 12 : 4),
    0,
  );
  return Math.max(5, 100 - penalty);
}

export function decideVerdict(findings: DraftFinding[]): VerdictType {
  const active = findings.filter((f) => f.severity !== "info");
  const criticals = active.filter((f) => f.severity === "critical").length;
  if (criticals >= 2) return "escalate";
  if (criticals === 1 || active.length >= 3) return "fix";
  if (active.length > 0) return "fix";
  return "ship";
}
