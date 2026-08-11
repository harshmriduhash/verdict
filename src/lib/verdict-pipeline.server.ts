import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { DraftFinding, ProjectTimeline, VerdictType } from "./verdict-types";
import {
  computePacingStats,
  decideVerdict,
  deterministicPacingFindings,
  runTechnicalQA,
  scoreFromFindings,
} from "./technical-qa";
import {
  runBrandAgent,
  runOrchestrator,
  runPacingAgent,
  type BrandContext,
} from "./verdict-agents.server";

type Client = SupabaseClient<Database>;

export function signalKey(agent: string, title: string) {
  return `${agent}:${title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60)}`;
}

const MIN_REINFORCEMENTS = 3;

export interface RunVerdictInput {
  projectId: string;
  timeline: ProjectTimeline;
}

export async function runVerdictPipeline(
  supabase: Client,
  userId: string,
  input: RunVerdictInput,
) {
  const { projectId, timeline } = input;

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("*, brand_kits(*)")
    .eq("id", projectId)
    .maybeSingle();

  if (projectError) throw new Error(projectError.message);
  if (!project) throw new Error("Project not found or you don't have access to it.");

  await supabase
    .from("projects")
    .update({ status: "reviewing", error_message: null })
    .eq("id", projectId);

  const kit = project.brand_kits;
  const pacingProfile = (kit?.pacing_profile ?? {}) as {
    target_avg_shot_seconds?: number;
  };
  const targetAvg = Number(pacingProfile.target_avg_shot_seconds ?? 2.5);

  const [{ data: tastePrefs }, { data: refVideos }] = await Promise.all([
    kit
      ? supabase
          .from("taste_preferences")
          .select("*")
          .eq("brand_kit_id", kit.id)
          .order("override_count", { ascending: false })
          .limit(5)
      : Promise.resolve({ data: [] as never[] }),
    kit
      ? supabase
          .from("reference_videos")
          .select("avg_shot_seconds")
          .eq("brand_kit_id", kit.id)
      : Promise.resolve({ data: [] as never[] }),
  ]);

  const activePrefs = (tastePrefs ?? []).filter(
    (p) => p.override_count >= MIN_REINFORCEMENTS,
  );
  const refAverages = (refVideos ?? [])
    .map((r) => Number(r.avg_shot_seconds))
    .filter((n) => Number.isFinite(n) && n > 0);

  const brand: BrandContext = {
    name: kit?.name ?? "Unspecified brand",
    toneOfVoice: kit?.tone_of_voice ?? null,
    colors: Array.isArray(kit?.primary_colors)
      ? (kit!.primary_colors as string[])
      : [],
    fonts: Array.isArray(kit?.fonts) ? (kit!.fonts as string[]) : [],
    targetAvgShotSeconds: targetAvg,
    referenceAvgShotSeconds: refAverages.length
      ? Number(
          (refAverages.reduce((a, b) => a + b, 0) / refAverages.length).toFixed(2),
        )
      : null,
    tasteMemory: activePrefs.map((p) => ({
      text: p.preference_text,
      overrides: p.override_count,
      confidence: Number(p.confidence_score),
    })),
  };

  const stats = computePacingStats(timeline);

  // ---- Layer 1: deterministic (never fails) ----
  const deterministic: DraftFinding[] = [
    ...runTechnicalQA(timeline),
    ...deterministicPacingFindings(timeline, stats, targetAvg),
  ];

  // ---- Layer 2: LLM specialists (fail soft) ----
  const [pacing, brandReport] = await Promise.all([
    runPacingAgent(timeline, brand, project.context_note).catch(() => ({
      findings: [],
      score: null,
      summary: null,
    })),
    runBrandAgent(timeline, brand, project.context_note).catch(() => ({
      findings: [],
      score: null,
      summary: null,
    })),
  ]);

  const degradedAgents: string[] = [];
  if (pacing.score === null && pacing.findings.length === 0)
    degradedAgents.push("Pacing & Story-Arc");
  if (brandReport.score === null && brandReport.findings.length === 0)
    degradedAgents.push("Brand Style");

  let all: DraftFinding[] = [
    ...deterministic,
    ...pacing.findings,
    ...brandReport.findings,
  ];

  // ---- Layer 3: taste memory down-weighting ----
  const tasteApplied: string[] = [];
  all = all.map((f) => {
    if (f.deterministic) return f;
    const key = signalKey(f.agent, f.title);
    const match = activePrefs.find(
      (p) =>
        p.direction === "approve" &&
        (p.signal_key === key ||
          keyOverlap(p.signal_key, key) ||
          p.agent === f.agent),
    );
    if (!match) return f;
    tasteApplied.push(match.preference_text);
    return {
      ...f,
      severity: f.severity === "critical" ? "warn" : "info",
      explanation: `${f.explanation}\n\nDown-weighted by taste memory: ${match.preference_text} (${match.override_count} prior overrides).`,
    } satisfies DraftFinding;
  });

  const verdict: VerdictType = decideVerdict(all);
  const scores = {
    technical: scoreFromFindings(all, "technical"),
    pacing: pacing.score ?? scoreFromFindings(all, "pacing"),
    brand: brandReport.score ?? scoreFromFindings(all, "brand"),
    overall: 0,
  };
  scores.overall = Math.round(
    (scores.technical * 0.4 + scores.pacing * 0.35 + scores.brand * 0.25) as number,
  );

  const degraded = degradedAgents.length > 0;
  const orchestratorSummary =
    (await runOrchestrator({ verdict, findings: all, brand, degraded })) ??
    fallbackSummary(verdict, all, degradedAgents);

  // ---- Persist ----
  await Promise.all([
    supabase.from("findings").delete().eq("project_id", projectId),
    supabase.from("project_shots").delete().eq("project_id", projectId),
    supabase.from("project_transcript_segments").delete().eq("project_id", projectId),
  ]);

  if (timeline.shots.length) {
    await supabase.from("project_shots").insert(
      timeline.shots.slice(0, 400).map((s) => ({
        project_id: projectId,
        workspace_id: project.workspace_id,
        shot_index: s.index,
        start_ms: Math.round(s.startMs),
        end_ms: Math.round(s.endMs),
      })),
    );
  }

  if (timeline.transcript.length) {
    await supabase.from("project_transcript_segments").insert(
      timeline.transcript.slice(0, 400).map((t) => ({
        project_id: projectId,
        workspace_id: project.workspace_id,
        start_ms: Math.round(t.startMs),
        end_ms: Math.round(t.endMs),
        text: t.text,
        speaker_label: t.speaker ?? null,
      })),
    );
  }

  if (all.length) {
    const { error: findingsError } = await supabase.from("findings").insert(
      all.map((f) => ({
        project_id: projectId,
        workspace_id: project.workspace_id,
        agent: f.agent,
        severity: f.severity,
        timestamp_ms: Math.round(f.timestampMs),
        end_ms: f.endMs ? Math.round(f.endMs) : null,
        title: f.title,
        explanation: f.explanation,
        evidence: f.evidence ?? null,
        deterministic: f.deterministic,
        downweighted: f.explanation.includes("Down-weighted by taste memory"),
      })),
    );
    if (findingsError) throw new Error(findingsError.message);
  }

  const { error: updateError } = await supabase
    .from("projects")
    .update({
      status: "complete",
      verdict,
      verdict_summary: orchestratorSummary,
      scores: { ...scores, stats },
      duration_seconds: Number((timeline.durationMs / 1000).toFixed(2)),
      width: timeline.width,
      height: timeline.height,
      degraded,
      degraded_reason: degraded
        ? `${degradedAgents.join(" and ")} unavailable — partial verdict.`
        : null,
      completed_at: new Date().toISOString(),
    })
    .eq("id", projectId);
  if (updateError) throw new Error(updateError.message);

  await supabase.from("audit_logs").insert({
    workspace_id: project.workspace_id,
    actor_user_id: userId,
    action: "verdict.completed",
    target_type: "project",
    target_id: projectId,
    metadata: { verdict, findings: all.length, degraded },
  });

  return {
    verdict,
    summary: orchestratorSummary,
    scores,
    findingCount: all.length,
    degraded,
    degradedReason: degraded
      ? `${degradedAgents.join(" and ")} unavailable — partial verdict.`
      : null,
    tasteApplied: [...new Set(tasteApplied)],
  };
}

function keyOverlap(a: string, b: string) {
  const at = new Set(a.split(/[:\-]/).filter((w) => w.length > 3));
  const bt = b.split(/[:\-]/).filter((w) => w.length > 3);
  const hits = bt.filter((w) => at.has(w)).length;
  return hits >= 2;
}

function fallbackSummary(
  verdict: VerdictType,
  findings: DraftFinding[],
  degradedAgents: string[],
) {
  const criticals = findings.filter((f) => f.severity === "critical").length;
  const base =
    verdict === "ship"
      ? "Nothing blocking. The deterministic checks are clean and no specialist raised a blocking flag."
      : verdict === "fix"
        ? `${findings.length} issue${findings.length === 1 ? "" : "s"} to resolve before this ships — start with the cited timestamps.`
        : `${criticals} critical issues. This needs a senior editor before it goes anywhere near spend.`;
  return degradedAgents.length
    ? `${base} Partial verdict: ${degradedAgents.join(" and ")} did not respond.`
    : base;
}

export async function recordOverride(
  supabase: Client,
  userId: string,
  input: { findingId: string; decision: "approved" | "fix_confirmed" },
) {
  const { data: finding, error } = await supabase
    .from("findings")
    .select("*, projects(brand_kit_id, workspace_id)")
    .eq("id", input.findingId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!finding) throw new Error("Finding not found.");

  await supabase
    .from("findings")
    .update({ status: input.decision, resolved_by: userId })
    .eq("id", input.findingId);

  const brandKitId = finding.projects?.brand_kit_id;
  const workspaceId = finding.workspace_id;
  let preference: { text: string; count: number } | null = null;

  if (brandKitId) {
    const key = signalKey(finding.agent, finding.title);
    const direction = input.decision === "approved" ? "approve" : "enforce";
    const text =
      input.decision === "approved"
        ? `Approved despite ${finding.agent} flag: "${finding.title}" is acceptable for this brand.`
        : `Confirmed as a real problem: ${finding.agent} flag "${finding.title}" should always be enforced for this brand.`;

    const { data: existing } = await supabase
      .from("taste_preferences")
      .select("*")
      .eq("brand_kit_id", brandKitId)
      .eq("signal_key", key)
      .eq("direction", direction)
      .maybeSingle();

    if (existing) {
      const count = existing.override_count + 1;
      await supabase
        .from("taste_preferences")
        .update({
          override_count: count,
          confidence_score: Math.min(0.98, 0.2 + count * 0.16),
          last_reinforced_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
      preference = { text: existing.preference_text, count };
    } else {
      await supabase.from("taste_preferences").insert({
        brand_kit_id: brandKitId,
        workspace_id: workspaceId,
        agent: finding.agent,
        signal_key: key,
        direction,
        preference_text: text,
        override_count: 1,
        confidence_score: 0.36,
        source_finding_id: finding.id,
      });
      preference = { text, count: 1 };
    }
  }

  await supabase.from("audit_logs").insert({
    workspace_id: workspaceId,
    actor_user_id: userId,
    action: `finding.${input.decision}`,
    target_type: "finding",
    target_id: input.findingId,
    metadata: { agent: finding.agent, title: finding.title },
  });

  return {
    preferenceText: preference?.text ?? null,
    overrideCount: preference?.count ?? 0,
    activeAfter: (preference?.count ?? 0) >= MIN_REINFORCEMENTS,
  };
}
