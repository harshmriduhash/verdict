<div align="center">

# ⚖️ Verdict

### The quality layer between **export** and **publish**.

*A panel of AI reviewers watches every cut before your audience does — and tells you one thing: **Ship**, **Fix**, or **Escalate**.*

`TanStack Start` · `React 19` · `TypeScript` · `Tailwind v4` · `Postgres + RLS` · `Multimodal AI panel`

</div>

---

## 📌 Summary

Verdict is an **editorial quality and taste verification layer for video**. You drop in an export; a
panel of specialist agents — Technical QA, Pacing & Story-Arc, and Brand Style — reviews it, cites
every issue to the exact frame, and an orchestrator returns a single defensible call.

Unlike a generic "AI video analyser", Verdict is opinionated in three ways that matter:

1. **Deterministic first.** Frame and audio measurements happen in the browser with Canvas and Web
   Audio. If every model call fails, you still get a real verdict — never a spinner, never a blank page.
2. **Citations, not vibes.** Every finding is anchored to a timestamp you can click and land on.
3. **It learns your taste.** Override a finding as intentional three times and Verdict stops
   flagging it — the panel adapts to your house style instead of arguing with it.

---

## 🎯 The problem

Editorial review is the most expensive unreviewed step in content production.

| Pain | Reality today |
| --- | --- |
| **Review is a bottleneck** | A senior editor or creative director watches every cut. That's the scarcest person on the team spending hours on black frames and clipped audio. |
| **Feedback is vague** | "Feels slow in the middle." Nobody knows which frame. Round trips multiply. |
| **Mistakes escape** | A 1-second black hole or a peaked audio track goes live and burns paid spend. |
| **Taste doesn't scale** | House style lives in one person's head. New editors relearn it by being corrected. |
| **Generic AI QA is noise** | Tools flag everything, including your intentional jump cuts, so teams stop reading the output. |

### How Verdict solves it

```
Export ──▶ Browser decomposition ──▶ Deterministic QA ──▶ Specialist agents ──▶ Orchestrator ──▶ Verdict
             (frames + audio)          (never fails)        (pacing, brand)      (synthesis)     (+ citations)
                                                                   ▲
                                                          Taste memory (your overrides)
```

- Catches the objective defects **automatically and for free** (client-side math, zero server CPU).
- Turns subjective notes into **timestamped, explained findings** an editor can act on in one pass.
- Compounds: every override makes the next review quieter and more accurate.

---

## 💰 Does it save time and money?

**Time.** A 3-minute export gets a full technical + pacing + brand pass in under a minute, versus
15–30 minutes of senior review plus a feedback round trip. On a team shipping 40 cuts a month,
that's roughly **10–20 senior hours reclaimed per month**.

**Money.** Three levers:

| Lever | Effect |
| --- | --- |
| Senior review time | Reviewers only touch cuts marked *Fix* or *Escalate* — triage instead of watch-everything |
| Compute cost | Frame sampling, shot detection and loudness analysis run in the user's browser. No transcode farm, no per-minute GPU bill. Two model calls plus one synthesis call per review. |
| Escaped defects | A black frame or blown audio in a paid placement costs the media spend, not just a re-export |

Verdict's marginal cost per review is a few AI-gateway tokens — the expensive part of video QA was
never the intelligence, it was the transcoding, and that now happens for free on the client.

---

## ✨ What's inside

| Capability | Detail |
| --- | --- |
| **Browser decomposition** | Adaptive frame sampling (250 ms–1 s), mean luma, 3-colour quantised palette, frame-delta shot detection, Web Audio RMS/peak/silence profiling |
| **Technical QA (deterministic)** | Black frames, overexposure, audio clipping, dead air, orphan shots — pure math, always available |
| **Pacing & Story-Arc agent** | Shot-length distribution vs. brand target, hook timing, mid-roll sag, rhythm breaks |
| **Brand Style agent** | Tone of voice, palette adherence, typography, pacing signature |
| **Orchestrator** | Weighted synthesis (technical 40 % / pacing 35 % / brand 25 %) → Ship, Fix, or Escalate + written rationale |
| **Findings ruler** | Three colour-coded agent lanes over the timeline; click a tick to seek that exact frame |
| **Frame-accurate player** | `requestVideoFrameCallback` where supported, graceful fallback everywhere else |
| **Taste memory** | Overrides reinforce a keyed preference; 3 hits down-weight the signal permanently |
| **Graceful degradation** | Any agent can fail; the verdict still ships with a partial-verdict banner |
| **Multi-tenant + RBAC** | Workspaces, owner/admin/editor/viewer, enforced in Postgres via RLS |
| **Beta onboarding** | A three-step guided loop: brand kit → first review → first override |

---

## 🏗️ Architecture

### High-Level Design (HLD)

```text
┌──────────────────────────────────────────────────────────────────────────┐
│                              BROWSER (React 19)                          │
│                                                                          │
│  /upload            /review/$id           /brand           /dashboard    │
│  ─────────          ────────────          ──────           ──────────    │
│  file picker        ReviewPlayer          brand kit        review queue  │
│  progress UI        FindingsRuler         editor           onboarding    │
│       │                   │                                              │
│       ▼                   │                                              │
│  decompose.ts             │  signed URL (1 h)                            │
│  Canvas + Web Audio       └──────────────────────────┐                   │
│  → ProjectTimeline                                    │                  │
└───────┬───────────────────────────────────────────────┼──────────────────┘
        │ ProjectTimeline (JSON)          direct upload  │
        │ via server function                            │
        ▼                                                ▼
┌───────────────────────────────┐            ┌────────────────────────────┐
│  EDGE SERVER (TanStack Start) │            │  OBJECT STORAGE (private)  │
│  createServerFn + Zod + auth  │            │  videos/{workspace}/{uuid} │
│                               │            │  membership-scoped policies│
│  verdict-pipeline.server.ts   │            └────────────────────────────┘
│   ├─ L1 deterministic QA      │
│   ├─ L2 specialist agents ────┼──────────▶ ┌────────────────────────────┐
│   ├─ L3 taste memory          │            │  AI GATEWAY (multimodal)   │
│   └─ orchestrator ────────────┼──────────▶ │  pacing · brand · synthesis│
└───────────────┬───────────────┘            └────────────────────────────┘
                │ RLS as the calling user
                ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  POSTGRES — profiles · workspaces · workspace_members · brand_kits ·      │
│  reference_videos · projects · project_shots · transcript_segments ·      │
│  findings · taste_preferences · audit_logs      (RLS on every table)      │
└──────────────────────────────────────────────────────────────────────────┘
```

### Low-Level Design (LLD) — the review pipeline

```text
decomposeVideo(file)
  ├─ loadedmetadata ─────────────▶ durationMs, width, height
  ├─ for t in 0..duration step S
  │    seek(t) → drawImage(96×54) → getImageData
  │      ├─ mean luma
  │      ├─ palette = top-3 quantised buckets (5-bit per channel)
  │      └─ delta   = mean |luma(t) − luma(t−S)|
  ├─ shots  = boundaries where delta > 0.16 && span > 400 ms
  └─ audio  = decodeAudioData → 250 ms RMS windows
                ├─ integrated dBFS, peak dBFS
                └─ silences ≥ 700 ms
                              │
                              ▼
runVerdictPipeline(supabase, userId, { projectId, timeline })
  ├─ load project + brand kit + reference videos + taste preferences
  ├─ status := reviewing
  ├─ L1  runTechnicalQA(timeline) ⊕ deterministicPacingFindings(timeline, stats, target)
  ├─ L2  Promise.all([ runPacingAgent(...).catch(∅), runBrandAgent(...).catch(∅) ])
  ├─ L3  for each non-deterministic finding:
  │        key = agent:slug(title)
  │        if taste_preferences[key].override_count ≥ 3 && direction = approve
  │           → severity downgraded, explanation annotated
  ├─ verdict = decideVerdict(findings)             # critical ⇒ escalate, warn ⇒ fix
  ├─ scores  = 0.40·technical + 0.35·pacing + 0.25·brand
  ├─ summary = runOrchestrator(...) ?? deterministicFallback(...)
  └─ persist: findings ▸ shots ▸ transcript ▸ project ▸ audit_log
```

```text
Override loop (how taste is learned)
  user clicks "Intentional" on finding F
        ▼
  findings.status := approved, resolved_by := user
        ▼
  upsert taste_preferences
    (brand_kit_id, signal_key = agent:slug(F.title), direction = approve)
    override_count += 1, confidence ↑, last_reinforced_at := now()
        ▼
  next review: override_count ≥ 3 ⇒ signal down-weighted before scoring
```

### Data model (core relations)

```text
auth.users ─1:1─ profiles
     │
     └─1:N─ workspace_members ─N:1─ workspaces ─1:N─ brand_kits ─1:N─ reference_videos
                                          │                 │
                                          │                 └─1:N─ taste_preferences
                                          └─1:N─ projects ─1:N─ findings
                                                     ├─1:N─ project_shots
                                                     └─1:N─ project_transcript_segments
     workspaces ─1:N─ audit_logs
```

### Security model

- **RLS on every public table**, scoped by `workspace_id` through `is_member()` / `has_workspace_role()`
  security-definer helpers with a locked `search_path` and EXECUTE revoked from `anon` and `public`.
- **Roles live in `workspace_members`**, never on a profile row — no privilege-escalation surface.
- **Private media.** The `videos` bucket is private; objects are keyed `{workspace_id}/…` and storage
  policies check membership. Playback uses 1-hour signed URLs.
- **Server functions** are authenticated (`requireSupabaseAuth`), Zod-validated, size-capped, and
  CSRF-protected. The service-role key never enters a client bundle.
- **Audit trail** for verdict completion and every human override.

---

## 🧭 Development

### ✅ What's built

| Area | Status |
| --- | --- |
| Multi-tenant schema, RLS, GRANTs, audit logs | ✅ |
| Auth + auto-provisioned workspace and brand kit | ✅ |
| Browser decomposition (frames, shots, audio) | ✅ |
| Deterministic technical QA + pacing statistics | ✅ |
| Pacing, Brand and Orchestrator agents | ✅ |
| Ship / Fix / Escalate scoring and rationale | ✅ |
| Upload → review flow with live progress | ✅ |
| Frame-accurate player + findings ruler + agent lanes | ✅ |
| Override controls and taste-memory reinforcement | ✅ |
| Editable brand kit (tone, colours, fonts, pacing targets) | ✅ |
| Review queue + beta onboarding checklist | ✅ |
| Graceful degradation and partial-verdict banner | ✅ |
| SEO metadata per route, launch/production/execution checklists | ✅ |

### 🚧 What's pending

- Team invites and workspace-management UI (schema is ready)
- Speech transcription lane for dialogue-aware pacing
- Reference-video comparison ("make it feel like these three")
- Shareable review links and PDF export
- Retry/resume for interrupted reviews, automated footage retention purge

### 🔭 What's next

| Horizon | Focus |
| --- | --- |
| **Now** | Beta cohort of 10–50 editors; tune deterministic thresholds against real overrides |
| **Next** | Invites + roles UI, transcript lane, share links, per-workspace quotas |
| **Later** | NLE plugins (Premiere / Resolve), CI-style "verdict gate" in publishing pipelines, cross-workspace taste benchmarks, agent marketplace for niche checks (accessibility, legal, platform specs) |

---

## 🚀 Running it

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

Requires Node.js (install via [nvm](https://github.com/nvm-sh/nvm#installing-and-updating)).
The backend (Postgres, auth, storage, AI gateway) is provisioned by Lovable Cloud — no local setup.

### Repo map

```text
src/
  lib/
    decompose.ts              browser frame + audio decomposition
    technical-qa.ts           deterministic rules and scoring
    verdict-agents.server.ts  specialist agents + orchestrator prompts
    verdict-pipeline.server.ts three-layer pipeline, persistence, taste memory
    verdict.functions.ts      authenticated server functions (runVerdict, overrideFinding)
    workspace.ts              workspace / brand-kit / project hooks
  components/verdict/         ReviewPlayer, FindingsRuler, VerdictBadge
  components/app/             AppShell, OnboardingCard
  routes/                     index, auth, dashboard, upload, review.$projectId, brand
```

### Companion docs

- [`LAUNCH_CHECKLIST.md`](./LAUNCH_CHECKLIST.md) — full beta launch scope
- [`PRODUCTION_CHECKLIST.md`](./PRODUCTION_CHECKLIST.md) — security, cost, observability gates
- [`EXECUTION_CHECKLIST.md`](./EXECUTION_CHECKLIST.md) — step-by-step pipeline trace + manual test script
- [`MVP_LAUNCH_CHECKLIST.md`](./MVP_LAUNCH_CHECKLIST.md) — beta cohort must-haves
- [`READY_CHECKLIST.md`](./READY_CHECKLIST.md) — one-page go/no-go

---

<div align="center">

**Verdict** — because the last review shouldn't be the first thing you skip.

</div>
