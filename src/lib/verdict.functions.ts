import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { ProjectTimeline } from "./verdict-types";

const timelineSchema = z.object({
  durationMs: z.number().positive().max(3_600_000),
  width: z.number().nonnegative(),
  height: z.number().nonnegative(),
  fps: z.number().positive(),
  shots: z
    .array(
      z.object({
        index: z.number(),
        startMs: z.number().nonnegative(),
        endMs: z.number().nonnegative(),
      }),
    )
    .max(1000),
  frames: z
    .array(
      z.object({
        timeMs: z.number().nonnegative(),
        luma: z.number(),
        palette: z.array(z.string()).max(5),
        delta: z.number(),
      }),
    )
    .max(4000),
  audio: z.object({
    integratedDb: z.number(),
    peakDb: z.number(),
    silences: z
      .array(z.object({ startMs: z.number(), endMs: z.number() }))
      .max(60),
    hasAudioTrack: z.boolean(),
  }),
  transcript: z
    .array(
      z.object({
        startMs: z.number(),
        endMs: z.number(),
        text: z.string().max(2000),
        speaker: z.string().max(80).optional(),
      }),
    )
    .max(500),
});

export const runVerdict = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({ projectId: z.string().uuid(), timeline: timelineSchema })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { runVerdictPipeline } = await import("./verdict-pipeline.server");
    return runVerdictPipeline(context.supabase, context.userId, {
      projectId: data.projectId,
      timeline: data.timeline as ProjectTimeline,
    });
  });

export const overrideFinding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        findingId: z.string().uuid(),
        decision: z.enum(["approved", "fix_confirmed"]),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { recordOverride } = await import("./verdict-pipeline.server");
    return recordOverride(context.supabase, context.userId, data);
  });
