# Execution Checklist — how a review actually runs

A step-by-step trace of the system, useful for debugging and for onboarding new engineers.

## Happy path

1. **Select** — user picks a file on `/upload`. Guards: `video/*` MIME, ≤ 500 MB.
2. **Decompose (browser, `src/lib/decompose.ts`)**
   - Load metadata → duration, intrinsic width/height.
   - Seek-and-sample loop at 250 ms / 500 ms / 1 s depending on duration.
   - Per sample: mean luma, 3-colour quantised palette, mean absolute delta vs previous frame.
   - Shot boundaries where `delta > 0.16` and the shot is ≥ 400 ms long.
   - Audio via Web Audio: integrated RMS dBFS, peak dBFS, silence windows ≥ 700 ms.
   - Output: `ProjectTimeline`.
3. **Upload** — file → private `videos` bucket at `{workspaceId}/{uuid}.{ext}`.
4. **Create project** — row inserted with `status = reviewing`, brand kit, context note.
5. **Run panel (`runVerdict` server fn → `verdict-pipeline.server.ts`)**
   - Load project + brand kit + reference videos + taste preferences.
   - Layer 1 — deterministic technical QA and pacing findings (never fails).
   - Layer 2 — Pacing and Brand LLM specialists in parallel, each wrapped in `catch`.
   - Layer 3 — taste memory down-weights repeat-overridden signals.
   - Score: technical 40 % / pacing 35 % / brand 25 %.
   - Decide: ship / fix / escalate. Orchestrator writes the summary (fallback text if it fails).
   - Persist shots, transcript, findings; update project; write audit log.
6. **Review** — `/review/$projectId` loads project + findings, signs a 1 h playback URL, renders
   the player, findings ruler and per-agent lanes.
7. **Override** — Intentional / Real fix updates the finding, reinforces a `taste_preferences`
   row keyed by `agent:slug(title)`. At 3 reinforcements the signal is down-weighted on future runs.

## Failure paths

| Failure | Behaviour |
| --- | --- |
| Browser can't decode the file | Actionable error: re-export as H.264 + AAC |
| Audio decode fails | Neutral audio profile, review continues |
| One LLM specialist fails | Partial verdict + banner, deterministic findings still shown |
| Both specialists fail | Deterministic-only verdict, `degraded = true` |
| Orchestrator fails | Deterministic fallback summary |
| Storage upload fails | Review aborted before any DB write |

## Manual test script

- [ ] Sign up a fresh account → workspace, membership and default brand kit exist
- [ ] Edit brand kit → values persist and appear in the next verdict's reasoning
- [ ] Upload a clean 30 s export → expect `ship` or low-severity findings only
- [ ] Upload a clip with a 1 s black hole and clipped audio → expect technical criticals
- [ ] Click a finding timestamp → player seeks to that frame
- [ ] Override the same finding type on three reviews → it drops to `info` on the fourth
- [ ] Sign in as a `viewer` → no upload, no override controls
