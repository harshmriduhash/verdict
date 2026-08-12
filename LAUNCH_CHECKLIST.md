# Verdict — Launch Checklist (Beta)

Status legend: `[x]` shipped · `[~]` partial · `[ ]` pending

## 1. Product surface
- [x] Landing page with positioning, verdict model, CTA
- [x] Email + password auth (sign in / sign up, email confirmation)
- [x] Auto-provisioned workspace, owner membership and default brand kit on signup
- [x] Review queue (dashboard) with live verdict badges
- [x] Upload → decompose → panel → verdict flow (`/upload`)
- [x] Review page: frame-accurate player, findings ruler, per-agent lanes
- [x] Override controls (Intentional / Real fix) feeding taste memory
- [x] Editable brand kit (tone, colours, fonts, pacing targets)
- [x] Beta onboarding checklist on the dashboard
- [ ] Team invites UI (schema supports it; UI pending)

## 2. Pipeline
- [x] Browser decomposition: frame sampling, luma, palette, shot detection, audio RMS/peak/silence
- [x] Deterministic technical QA (black frames, overexposure, clipping, silence, orphan shots)
- [x] Deterministic pacing statistics vs brand target
- [x] LLM specialists: Pacing & Story-Arc, Brand Style (Lovable AI Gateway)
- [x] Orchestrator synthesis → ship / fix / escalate
- [x] Graceful degradation: deterministic verdict still returned if models fail
- [x] Taste memory: overrides reinforce preferences, down-weight after 3 hits
- [ ] Speech transcription lane (schema + types ready, capture pending)

## 3. Data & security
- [x] RLS enabled on every public table, workspace-scoped policies
- [x] Explicit GRANTs for `authenticated` / `service_role`
- [x] Roles in `workspace_members` (owner/admin/editor/viewer), never on profiles
- [x] `SECURITY DEFINER` helpers with locked `search_path`, EXECUTE revoked from `anon`/`public`
- [x] Private `videos` storage bucket, workspace-prefixed paths, membership-scoped policies
- [x] Signed URLs (1 h) for playback — no public media
- [x] Audit log on verdict completion and overrides
- [x] Server functions authenticated via `requireSupabaseAuth`; CSRF middleware on
- [x] Zod validation on every server-function input, size caps on arrays

## 4. Reliability
- [x] Fail-soft agent calls (`Promise.allSettled` semantics via catch)
- [x] Partial-verdict banner when a specialist is unavailable
- [x] Project status machine: uploaded → reviewing → complete / failed
- [x] Upload guards: type check, 500 MB cap, decode-failure messaging
- [ ] Retry / resume for interrupted reviews

## 5. Launch ops
- [x] SEO metadata per route (title, description, OG, Twitter)
- [x] robots.txt
- [x] README with architecture, HLD/LLD and roadmap
- [ ] Custom domain
- [ ] Analytics + error alerting thresholds
- [ ] Beta feedback channel wired into the app

## 6. Go-live sequence
1. Confirm auth email confirmation setting matches your beta policy.
2. Invite 10–20 beta editors; verify each lands in their own workspace.
3. Run one 30 s and one 3 min export end to end; confirm verdict < 60 s.
4. Watch the first 50 findings for false positives; override them to seed taste memory.
5. Publish, then monitor AI Gateway usage and storage growth weekly.
