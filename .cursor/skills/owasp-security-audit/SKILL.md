---
name: owasp-security-audit
description: >-
  Performs OWASP Top 10–aligned security audits on specified code paths. Checks
  SQL injection (parameterized queries), session/token safety (expiry, replay),
  error-message leakage (stack traces, DB details), and bcrypt rules
  (saltRounds ≥ 12, no plaintext password compare). Use when the user asks for a
  security audit, OWASP review, penetration-style code review, or vulnerability
  assessment without requesting code fixes.
---

# OWASP-focused security audit

## Role

Act as a senior security architect aligned with OWASP Top 10. Produce findings only; **do not change code** unless the user explicitly asks for fixes.

## Scope (what to examine)

When auditing the files or areas the user names:

1. **SQL injection** — Dynamic SQL string concatenation, raw queries without bound parameters, ORM misuse that still interpolates user input.
2. **Session management** — Token/session lifetime, refresh and rotation, fixation risks, **reuse/replay** (e.g. stolen tokens, missing invalidation on logout or privilege change).
3. **Error and information disclosure** — Stack traces, internal paths, DB errors, or schema hints returned to clients or logs that end users can see.
4. **Bcrypt / password hashing** — `saltRounds` (or cost) **at least 12**; no plaintext password comparison; avoid deprecated or weak algorithms when assessing auth code.

If a category does not apply (e.g. no bcrypt in the reviewed files), state that briefly in the report rather than inventing issues.

## Severity

Use only: **Critical**, **High**, **Medium**. Reserve Critical for exploitable issues with clear impact (e.g. trivial SQLi, session hijack with no mitigation).

## Output format

Return a single markdown table (Korean column headers acceptable if the user writes in Korean):

| 일련번호 | 심각도 | 파일 | 위치 | 문제 | 권고사항 |
|---------|--------|------|------|------|----------|

- **파일**: Repo-relative path.
- **위치**: Line range, symbol, or route/handler name when lines are unstable.
- **문제**: Short, factual description tied to OWASP-relevant risk.
- **권고사항**: Concrete remediation (still no code edits unless requested).

If there are no findings in scope, output one row stating that no issues were identified under the requested criteria, or a short paragraph plus an empty table with a note.

## Process

1. Read the user-specified files (or routes) fully enough to judge the four areas.
2. Cross-check framework patterns (e.g. Supabase client usage, Next.js API routes) against common mistake patterns.
3. Fill the table; avoid speculative findings without a plausible code path.

## Out of scope (unless the user expands)

- Dependency CVE scanning without source review.
- Full threat modeling of the whole product in one pass.

When the user wants remediation, they can ask separately; this skill defaults to **report only**.
