# MVP Launch Checklist — beta cohort

Scope: 10–50 invited editors and creative leads.

## Must-have (all shipped)
- [x] Sign up, sign in, sign out
- [x] One workspace per user, auto-provisioned
- [x] Upload an export and get a verdict end to end
- [x] Frame-accurate citations on every finding
- [x] Ship / Fix / Escalate call with a written rationale
- [x] Brand kit the panel actually reads
- [x] Overrides that train taste memory
- [x] Never a blank screen: deterministic verdict when models fail
- [x] Role-based permissions enforced in the database, not the UI

## Nice-to-have (post-beta)
- [ ] Team invites and shared workspaces UI
- [ ] Transcript lane and dialogue-aware pacing
- [ ] Comparison against reference videos you upload
- [ ] Export a review as PDF / share link
- [ ] Slack and Frame.io notifications

## Beta guardrails
- 500 MB per export, ~10 min duration practical ceiling
- H.264 MP4 with AAC audio decodes most reliably
- Chrome / Edge give frame-accurate playback; Safari and Firefox degrade gracefully

## Feedback loop
1. Every beta user gets a 15-minute onboarding call.
2. Log every false positive as an override — that is the training signal.
3. Weekly: review override counts per signal, tune deterministic thresholds.
