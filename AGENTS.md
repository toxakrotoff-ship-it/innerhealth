# Project Instructions

- Prefer `code-graph` for project-wide file and code discovery whenever it is available in the current agent session.
- If `code-graph` is not available in the current session, fall back to `rg`/`rg --files` without blocking work.
- Treat `code-graph` as the default search path for this repository in future tasks.

## Ruflo

- Default to one agent. Do not start a swarm, daemon, autopilot, or unattended task.
- For a bug: use `coder`, then a separate `reviewer` pass. For a large feature, use the smallest necessary subset of `backend`, `frontend`, and `tester` work, with isolated write scopes.
- Use security and an extra review only when the user explicitly requests them.
- Search project Ruflo memory before work and store only non-secret, reusable conclusions after validation. Never put credentials, `.env` values, or production data into memory.
