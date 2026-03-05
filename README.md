# CYA Playground - AI Code Review Tools Benchmark

A benchmark comparing 9 AI code review tools against Convex-specific code issues. The underlying app is a team task management tool built with Convex + React + Vite + Convex Auth.

## What This Is

I installed 9 AI code review bots on a single public GitHub repo, then opened 10 focused PRs, each containing one intentional issue (or in one case, no issue at all). Every tool reviewed every PR simultaneously, giving a side-by-side comparison of how well they catch real problems and how often they generate false positives.

This is testing **PR-based code review only**, not full codebase scanning. The question is: "Can these tools catch issues in newly added code via PRs?"

## Tools Under Test

CodeRabbit, Greptile, Macroscope, Cubic, Graphite AI Review, Qodo, CodeAnt AI, Sourcery, GitHub Copilot

## Results

Scored out of 40. Each PR is worth up to 4 points: 3 for the primary test (did the tool catch the issue or correctly avoid a false positive?) plus a quality bonus of +1 for genuinely useful secondary findings or -1 for significant false positives. Full scoring criteria in [`pr-expectations/SCORING.md`](pr-expectations/SCORING.md).

| Tool | PR1 | PR2 | PR3 | PR4 | PR5 | PR6 | PR7 | PR8 | PR9 | PR10 | **Total (/40)** |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 🥇 [**Qodo**](https://www.qodo.ai/) | 1 | 3 | 4 | 4 | 3 | 3 | 4 | 3 | 3 | 4 | **32** |
| 🥇 [**Copilot**](https://github.com/features/copilot) | 1 | 3 | 4 | 4 | 4 | 3 | 2 | 3 | 3 | 4 | **31** |
| 🥈 [**Cubic**](https://www.cubic.dev/) | 3 | 3 | 3 | 3 | 0 | 3 | 2 | 3 | 3 | 3 | **26** |
| 🥈 [**CodeRabbit**](https://coderabbit.ai/) | -1 | 3 | 4 | 0 | 0 | 4 | 4 | 3 | 4 | 3 | **24** |
| 🥈 [**Greptile**](https://www.greptile.com/) | 1 | 3 | 3 | 4 | 0 | 3 | -1 | 3 | 3 | 4 | **23** |
| 🥉 [**CodeAnt AI**](https://www.codeant.ai/) | -1 | -1 | 0 | 0 | 3 | 3 | 1 | 3 | 1 | 4 | **13** |
| [**Sourcery**](https://sourcery.ai/) | 0 | 1 | 1 | 0 | 3 | 4 | -1 | 0 | 1 | 0 | **9** |
| [**Macroscope**](https://macroscope.com/) | 3 | 0 | 0 | 0 | 0 | 0 | 0 | 3 | 0 | 3 | **9** |
| [**Graphite**](https://graphite.com/features/ai-review) | 3 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | **3** |

## The 10 PRs

Each PR targets one specific issue category. Click through to see every tool's review comments side by side.

| # | Category | What We Tested | PR |
|---|---|---|---|
| 1 | False Positive | Nested `ctx.db` calls are NOT N+1 in Convex. Tools should stay silent. | [PR #13](https://github.com/mikecann/cya-playground/pull/13) |
| 2 | Performance | `.filter()` used where a database index already exists (full table scan) | [PR #12](https://github.com/mikecann/cya-playground/pull/12) |
| 3 | Security | Public mutation missing `getAuthUserId` check, anyone can call it | [PR #14](https://github.com/mikecann/cya-playground/pull/14) |
| 4 | Security | `mutation` used instead of `internalMutation` for a cron-only function | [PR #15](https://github.com/mikecann/cya-playground/pull/15) |
| 5 | Performance | Unbounded `.collect()` on a query that can grow without limit | [PR #16](https://github.com/mikecann/cya-playground/pull/16) |
| 6 | Performance | `.collect().length` to count rows instead of a bounded approach | [PR #17](https://github.com/mikecann/cya-playground/pull/17) |
| 7 | Schema | Unbounded array stored inside a document (1MB document limit risk) | [PR #18](https://github.com/mikecann/cya-playground/pull/18) |
| 8 | Correctness | New mutation skips aggregate update that `create` and `remove` both do | [PR #20](https://github.com/mikecann/cya-playground/pull/20) |
| 9 | Concurrency | Every mutation writes to a singleton document, causing OCC contention | [PR #23](https://github.com/mikecann/cya-playground/pull/23) |
| 10 | Authorization | Auth check present but no membership/authorization check (IDOR) | [PR #22](https://github.com/mikecann/cya-playground/pull/22) |

Detailed expectations, tool-by-tool reviews, and per-PR scores are in the [`pr-expectations/`](pr-expectations/) folder.

## Methodology

- All tools installed on this one repo, reviewing every PR simultaneously
- Each PR adds a new feature with one naturally embedded issue (not modifying existing clean code)
- Issues are designed to look natural, not obviously planted
- PR #1 is the only false-positive test (tools should NOT flag anything), PRs 2-10 are true-positive tests
- No unit tests included intentionally, we're testing code review intelligence, not runtime correctness

## Scoring System

Each PR is scored on two dimensions:

1. **Primary Verdict** (0 or 1 or 3 points): Did the tool pass the core test?
   - Pass = 3, Mixed = 1, Fail = 0

2. **Quality Bonus** (-1 to +1): How useful was the rest of the output?
   - +1 for genuinely useful secondary findings with no significant false positives
   - 0 for clean output or minor extras that wash out
   - -1 for significant false positives that would mislead a developer

Range: -1 to 4 per PR, -10 to 40 total. See [`pr-expectations/SCORING.md`](pr-expectations/SCORING.md) for the full criteria.

## Tech Stack

- [Convex](https://convex.dev/) (backend: database, server functions, auth)
- React 19 + Vite (frontend)
- Tailwind CSS v4
- Convex Auth (password-based)

## Running Locally

```
npm install
npm run dev
```
