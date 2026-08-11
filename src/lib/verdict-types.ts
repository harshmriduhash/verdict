// Shared, browser-safe types for the Verdict decomposition + agent pipeline.

export type AgentType = "technical" | "pacing" | "brand";
export type Severity = "info" | "warn" | "critical";
export type VerdictType = "ship" | "fix" | "escalate";

export interface ShotSpan {
  index: number;
  startMs: number;
  endMs: number;
}

export interface TranscriptSegment {
  startMs: number;
  endMs: number;
  text: string;
  speaker?: string;
}

export interface AudioProfile {
  /** Integrated loudness approximation in dBFS RMS. */
  integratedDb: number;
  peakDb: number;
  /** Silence windows in ms (start, end). */
  silences: Array<{ startMs: number; endMs: number }>;
  hasAudioTrack: boolean;
}

export interface FrameSample {
  timeMs: number;
  /** Mean luma 0..1 */
  luma: number;
  /** Dominant colors as hex, up to 3 */
  palette: string[];
  /** Mean absolute difference vs previous sample, 0..1 */
  delta: number;
}

export interface ProjectTimeline {
  durationMs: number;
  width: number;
  height: number;
  fps: number;
  shots: ShotSpan[];
  frames: FrameSample[];
  audio: AudioProfile;
  transcript: TranscriptSegment[];
}

export interface DraftFinding {
  agent: AgentType;
  severity: Severity;
  timestampMs: number;
  endMs?: number | null;
  title: string;
  explanation: string;
  evidence?: string | null;
  deterministic: boolean;
}

export interface VerdictResult {
  verdict: VerdictType;
  summary: string;
  scores: {
    technical: number;
    pacing: number;
    brand: number;
    overall: number;
  };
  findings: DraftFinding[];
  degraded: boolean;
  degradedReason?: string | null;
  tasteApplied: string[];
}

export const AGENT_LABEL: Record<AgentType, string> = {
  technical: "Technical QA",
  pacing: "Pacing & Story Arc",
  brand: "Brand Style",
};

export const VERDICT_COPY: Record<VerdictType, { label: string; blurb: string }> =
  {
    ship: { label: "Ship", blurb: "Meets the bar. Publish it." },
    fix: { label: "Fix Required", blurb: "Fix the cited moments, then ship." },
    escalate: {
      label: "Escalate",
      blurb: "Needs a senior editor before this goes anywhere.",
    },
  };

export function formatTimestamp(ms: number): string {
  const total = Math.max(0, Math.round(ms));
  const minutes = Math.floor(total / 60000);
  const seconds = Math.floor((total % 60000) / 1000);
  const frames = Math.floor(((total % 1000) / 1000) * 30);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(frames).padStart(2, "0")}`;
}
