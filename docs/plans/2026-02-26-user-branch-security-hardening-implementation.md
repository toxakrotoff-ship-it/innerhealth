# USER Branch Security Hardening Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Harden customer-facing auth and input flows against disposable emails, abusive retries, and malicious input payloads, while implementing a secure 6-cell email 2FA UX with paste distribution.

**Architecture:** Add a dedicated boundary-hardening layer (`sanitizers` + email-risk checks), move auth rate limiting to shared storage, and keep API handlers thin by delegating validation and policy logic to `src/lib/*` and `src/services/*`. Update 2FA UI as an isolated client-side component with strict input constraints and deterministic code assembly.

**Tech Stack:** Next.js App Router, TypeScript, Zod, NextAuth v5, Prisma 7, Upstash Redis (for distributed rate-limit), Tailwind.

---

## Execution Rules

- Follow `@superpowers:test-driven-development` for each behavior change.
- Keep one concern per commit.
- Prefer schema/service-level guards over ad-hoc route logic.
- Do not change unrelated checkout/business logic.

### Task 1: Add email/domain risk boundary primitives

**Files:**
- Create: `nextjs-project/src/lib/security/email-risk.ts`
- Create: `nextjs-project/src/lib/security/disposable-email-domains.ts`
- Test: `nextjs-project/src/lib/security/email-risk.test.ts`

**Step 1: Write failing tests**

Add tests for:
- disposable domain returns `block`
- normal domain returns `allow`
- uppercase/mixed-case emails are normalized before verdict

**Step 2: Run tests to confirm failure**

Run: `cd nextjs-project && npm run test -- src/lib/security/email-risk.test.ts`
Expected: FAIL because module/functions do not exist yet.

**Step 3: Implement minimal module**

Implement:
- `normalizeEmailAddress(input: string): string`
- `extractEmailDomain(email: string): string`
- `getEmailRiskVerdict(email: string): 'allow' | 'block'`
- denylist lookup in `disposable-email-domains.ts`

**Step 4: Re-run tests**

Run: `cd nextjs-project && npm run test -- src/lib/security/email-risk.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
cd nextjs-project
git add src/lib/security/email-risk.ts src/lib/security/disposable-email-domains.ts src/lib/security/email-risk.test.ts
git commit -m "feat: add email risk boundary for disposable domains"
```

### Task 2: Add input sanitizers for profile/auth fields

**Files:**
- Create: `nextjs-project/src/lib/security/input-sanitizers.ts`
- Modify: `nextjs-project/src/lib/validations/account.ts`
- Test: `nextjs-project/src/lib/security/input-sanitizers.test.ts`

**Step 1: Write failing tests**

Add tests that verify:
- control characters are removed
- repeated spaces collapse to one
- phone keeps only allowed characters (`+`, digits, space, `-`, `(`, `)`)
- resulting strings match expected sanitized values

**Step 2: Run tests to confirm failure**

Run: `cd nextjs-project && npm run test -- src/lib/security/input-sanitizers.test.ts`
Expected: FAIL because sanitizer functions are missing.

**Step 3: Implement minimal sanitizers**

Implement:
- `sanitizeHumanName(value: string): string`
- `sanitizePhone(value: string): string`
- `stripControlAndInvisibleChars(value: string): string`

Then wire them into Zod transforms in `account.ts` for:
- `name`
- `lastName`
- `phone`

**Step 4: Re-run tests and lint**

Run: `cd nextjs-project && npm run test -- src/lib/security/input-sanitizers.test.ts && npm run lint`
Expected: PASS.

**Step 5: Commit**

```bash
cd nextjs-project
git add src/lib/security/input-sanitizers.ts src/lib/security/input-sanitizers.test.ts src/lib/validations/account.ts
git commit -m "feat: harden auth boundary input sanitization"
```

### Task 3: Integrate email risk and anti-enumeration in auth routes

**Files:**
- Modify: `nextjs-project/src/app/api/auth/register/route.ts`
- Modify: `nextjs-project/src/app/api/auth/verify-email/request/route.ts`
- Test: `nextjs-project/src/app/api/auth/register/route.test.ts`
- Test: `nextjs-project/src/app/api/auth/verify-email/request/route.test.ts`

**Step 1: Write failing route tests**

Add tests for:
- register with disposable domain returns `400` (or agreed domain-policy status)
- verify-email request keeps neutral response payload (`{ ok: true }`) for unknown/existing users
- register does not expose sensitive internals in error text

**Step 2: Run route tests to confirm failure**

Run: `cd nextjs-project && npm run test -- src/app/api/auth/register/route.test.ts src/app/api/auth/verify-email/request/route.test.ts`
Expected: FAIL.

**Step 3: Implement minimal route hardening**

In `register/route.ts`:
- evaluate `getEmailRiskVerdict(payload.email)` before user creation
- return safe error for blocked domain
- keep normalized email path

In `verify-email/request/route.ts`:
- keep neutral success for enumeration-sensitive branches
- if payload includes blocked domain, still return neutral response (no leakage)

**Step 4: Re-run tests and lint**

Run: `cd nextjs-project && npm run test -- src/app/api/auth/register/route.test.ts src/app/api/auth/verify-email/request/route.test.ts && npm run lint`
Expected: PASS.

**Step 5: Commit**

```bash
cd nextjs-project
git add src/app/api/auth/register/route.ts src/app/api/auth/verify-email/request/route.ts src/app/api/auth/register/route.test.ts src/app/api/auth/verify-email/request/route.test.ts
git commit -m "fix: harden email verification and registration anti-abuse behavior"
```

### Task 4: Migrate auth limiter to distributed storage

**Files:**
- Modify: `nextjs-project/src/lib/rate-limit.ts`
- Modify: `nextjs-project/src/app/api/auth/login-step1/route.ts`
- Modify: `nextjs-project/src/app/api/auth/verify-2fa/route.ts`
- Modify: `nextjs-project/src/app/api/auth/2fa/send-code/route.ts`
- Modify: `nextjs-project/src/app/api/auth/register/route.ts`
- Modify: `nextjs-project/src/app/api/auth/verify-email/request/route.ts`
- Modify: `nextjs-project/src/app/api/auth/verify-email/confirm/route.ts`
- Test: `nextjs-project/src/lib/rate-limit.test.ts`

**Step 1: Write failing limiter tests**

Add tests for:
- key composition by prefix + identifier
- window reset behavior
- fallback behavior if remote store is unavailable

**Step 2: Run tests to confirm current gap**

Run: `cd nextjs-project && npm run test -- src/lib/rate-limit.test.ts`
Expected: FAIL for distributed-path expectations.

**Step 3: Implement shared limiter**

Implement Redis-backed limiter (Upstash), with:
- same `checkRateLimit` interface
- deterministic fallback to in-memory if env not configured
- route-specific identifiers for auth endpoints

Add explicit limit call to `2fa/send-code` route.

**Step 4: Re-run tests and build**

Run: `cd nextjs-project && npm run test -- src/lib/rate-limit.test.ts && npm run lint && npm run build`
Expected: PASS.

**Step 5: Commit**

```bash
cd nextjs-project
git add src/lib/rate-limit.ts src/lib/rate-limit.test.ts src/app/api/auth/login-step1/route.ts src/app/api/auth/verify-2fa/route.ts src/app/api/auth/2fa/send-code/route.ts src/app/api/auth/register/route.ts src/app/api/auth/verify-email/request/route.ts src/app/api/auth/verify-email/confirm/route.ts
git commit -m "feat: move auth rate limiting to distributed store with resend protection"
```

### Task 5: Implement 6-cell OTP UI with secure paste support

**Files:**
- Modify: `nextjs-project/src/app/login/2fa/page.tsx`
- Create: `nextjs-project/src/components/auth/otp-six-input.tsx`
- Test: `nextjs-project/src/components/auth/otp-six-input.test.tsx`

**Step 1: Write failing component tests**

Add tests for:
- each cell accepts max one digit
- typing auto-advances focus
- backspace on empty cell moves focus backward
- paste `123456` into any cell fills all 6 in order
- non-digits are ignored during paste and input

**Step 2: Run tests to confirm failure**

Run: `cd nextjs-project && npm run test -- src/components/auth/otp-six-input.test.tsx`
Expected: FAIL because component not implemented.

**Step 3: Implement minimal component**

Create reusable `OtpSixInput`:
- internal `string[6]` model
- controlled `value`/`onChange` API returning concatenated code
- keyboard handlers for arrows/backspace
- paste handler that distributes cleaned digits

Integrate into `/login/2fa` page and keep submit validation `^\d{6}$`.

**Step 4: Re-run tests, lint, build**

Run: `cd nextjs-project && npm run test -- src/components/auth/otp-six-input.test.tsx && npm run lint && npm run build`
Expected: PASS.

**Step 5: Commit**

```bash
cd nextjs-project
git add src/components/auth/otp-six-input.tsx src/components/auth/otp-six-input.test.tsx src/app/login/2fa/page.tsx
git commit -m "feat: add secure six-cell 2fa input with paste distribution"
```

### Task 6: Final verification and security smoke checks

**Files:**
- Modify: only follow-up fixes discovered during verification
- Update: `docs/plans/2026-02-26-lk-users-design.md` (if acceptance notes changed)

**Step 1: Run full verification**

Run:
- `cd nextjs-project && npm run lint`
- `cd nextjs-project && npm run build`
- `cd nextjs-project && npm run test`

Expected: all pass.

**Step 2: Manual smoke checks**

Check:
- register with disposable email is blocked
- register with valid email succeeds and sends verification link
- verify-email request response remains neutral
- repeated `verify-2fa` and `send-code` attempts hit rate limit
- six-cell input works for typing/backspace/paste

**Step 3: Final commit**

```bash
cd nextjs-project
git add .
git commit -m "chore: finalize user-branch security hardening and otp ux"
```

---

## Task 6 verification (completed)

**Automated (worktree `feature/user-branch-security-hardening`):**

| Check   | Result |
|--------|--------|
| `npm run lint` | ✅ 0 errors (existing warnings only) |
| `npm run test` | ✅ 23 tests, 6 files |
| `npm run build` | ⚠️ Fails at "Collecting page data" when `DATABASE_URL` is unset (expected without `.env`). Run with valid `DATABASE_URL` for full build. |

**Manual smoke checklist (run with app + DB):**

- [ ] Register with disposable email (e.g. `*@tempmail.com`) → blocked, safe message
- [ ] Register with valid email → 201, verification email sent
- [ ] `POST /api/auth/verify-email/request` (unknown or disposable email) → `{ "ok": true }` only
- [ ] Repeated `verify-2fa` / `2fa/send-code` → 429 after limit
- [ ] `/login/2fa`: six cells accept one digit each, typing advances focus, backspace on empty moves back, paste `123456` fills all six
