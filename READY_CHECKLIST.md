# Ready Checklist — one-page go/no-go

| Area | Gate | Status |
| --- | --- | --- |
| Auth | Sign up / in / out, session persists, protected routes gated | ✅ |
| Tenancy | Workspace + owner membership + default brand kit on signup | ✅ |
| Upload | Type + size guards, step tracker, live upload %, retry | ✅ |
| Reports | PDF export of verdict, scores and findings | ✅ |
| Pipeline | Deterministic layer always returns a verdict | ✅ |
| Agents | Pacing + Brand + Orchestrator, fail-soft | ✅ |
| Citations | Every finding carries a timestamp; ruler seeks to it | ✅ |
| Taste memory | Overrides with reasons persist, undoable, down-weight after 3 | ✅ |
| Security | RLS + GRANTs + private bucket + signed URLs + CSRF | ✅ |
| Roles | owner / admin / editor / viewer enforced in SQL | ✅ |
| SEO | Unique title, description and OG tags per route | ✅ |
| Docs | README, launch / production / execution checklists | ✅ |
| Invites UI | Multi-user workspace management | ⏳ |
| Transcription | Speech lane for dialogue pacing | ⏳ |
| Retention | Automated purge of source footage | ⏳ |

**Go/no-go:** ready for invited beta. Not yet ready for self-serve GA until the ⏳ rows close.

- [x] Google sign-in, email verification gate, password reset
- [x] First-run wizard + sample video
- [x] Dashboard stats + workspace switcher
- [x] Reference videos + taste-memory log
- [x] Landing hero, pricing, testimonials, footer
