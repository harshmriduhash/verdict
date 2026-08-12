# Production Readiness Checklist

Operational gate before Verdict serves paying customers. Beta may ship with `[ ]` items open; GA may not.

## Security
- [x] Row Level Security on all `public` tables, workspace-scoped
- [x] Explicit GRANTs per role; no implicit PostgREST access
- [x] Roles stored in a dedicated `workspace_members` table
- [x] Security-definer helpers with fixed `search_path`, EXECUTE limited to `authenticated`
- [x] Private storage bucket + signed URLs only
- [x] CSRF middleware on server functions
- [x] Secrets server-side only; no service-role key in client bundles
- [ ] Periodic access review of workspace members
- [ ] Rate limiting on review submissions per workspace

## Data
- [x] Findings, shots and transcript rows scoped by `workspace_id`
- [x] Idempotency key column on projects
- [x] Audit log for verdicts and overrides
- [ ] Scheduled purge of source video after N days
- [ ] Backup/restore drill documented

## Performance
- [x] Decomposition runs client-side (zero server CPU per minute of video)
- [x] Adaptive sample step (250 ms / 500 ms / 1 s by duration)
- [x] Row caps on inserts (400 shots, 400 segments)
- [ ] CDN caching for static assets verified
- [ ] p95 verdict latency dashboard

## Cost
- [x] Two LLM calls per review + one orchestrator call
- [x] Deterministic layer answers without any model spend when models fail
- [ ] Per-workspace monthly review quota
- [ ] AI Gateway spend alert

## Observability
- [x] Client error reporting hook
- [x] Server error middleware with safe error page
- [ ] Structured logging of pipeline stages
- [ ] Uptime monitor on the published URL

## Compliance
- [ ] Privacy policy and terms pages
- [ ] Data processing / retention statement for uploaded footage
- [ ] Cookie and analytics disclosure
