# Public form protection implementation plan

> **For agentic workers:** Use superpowers:executing-plans; steps are tracked below.

**Goal:** Reject malformed and automated leads on both InnerHealth and Sprint Power.
**Architecture:** Shared client-safe validators and existing server email DNS checks; shared brand-aware routes.
**Tech Stack:** Next.js, React, TypeScript, Vitest, validator, libphonenumber-js.
**Spec:** ../specs/2026-10-30-public-form-protection-design.md; user-approved design in conversation: email/domain validation, valid phones, social @handles or HTTP(S) URLs, plain text messages, honeypot/timing and repeat limits.

## Global constraints
No new dependencies. Preserve optional fields and contact email-or-phone flow. No production writes or notifications during tests.

## Review focus
Reject overlong input before normalization; reject non-string optional values; preserve international names and normal prose; ensure both host brands retain routing; never persist or notify invalid leads.

### Task 1: Shared validators
- [x] Add failing tests for reported random strings, invalid phones, social formats and plain text.
- [x] Implement validators in src/lib/security/public-form-abuse.ts.
- [x] Run targeted tests.

### Task 2: Routes and forms
- [x] Add route regressions for both host brands including trap bypass attempts and valid leads.
- [x] Connect validators and traps to partnership and contact-help; strengthen existing B2B validation.
- [x] Add client validation and matching trap payloads.
- [x] Run route and component tests, lint, typecheck and suite.

## Execution notes
Work in the provided clean task checkout on branch work. No accessible Ruflo memory tools or project memory files were found. User explicitly approved implementation; continue without a second plan approval. Changes remain reviewable and uncommitted.

## Validation ledger
- Validators: reproduced 27 failures before implementation; then 35 tests passed.
- Route regressions: reproduced 47 failures before server changes; initial client regressions: 6 failures before client changes.
- Separate reviewer identified valid invite URL false positives and ignored malformed optional phones; added regression cases, observed failures, fixed them. Numeric invalid timing now produces a visible 400 instead of false success.
- Ruling: reuse provided clean task checkout and execute inline after explicit implementation approval; leave changes uncommitted for review.
- Ruling: preserve optional messages/social fields and existing contact-help Russian phone UI; generic partner/B2B phone validation supports valid international numbers.
- Full checks and final results are reported in the task response. No accessible Ruflo memory backend was available, so no memory write was performed.

Final evidence: all 142 focused form tests passed; ESLint on every changed TypeScript/TSX file passed; npm run typecheck passed after local prisma generate (no database operation). Full npm test: 1326 passed, 2 failed in unchanged max-api-client.test.ts (installed SDK API origin differs from expected v2) and ozon-delivery/cron-script.test.ts (spawnSync bash EPERM). git diff --check passed. Separate reviewer findings were fixed and regression-tested. No deployment performed.
