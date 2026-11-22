# Actual Car Parking moving-traffic + Module proposal regression

**Task:** `SV-CAR-PARK-REAL-TRAFFIC-SDK-001`. **Agent:** 3, session `SV-A3-20261123-TRAFFIC-SDK-150`. **Date:** November 23, 2026 (Asia/Manila). Source repo `georgekarlr/studyverse-games` branch `stage-1`, project `4c84c21e-b797-4754-8d49-5134538dd468`. Start source SHA `79188141ddf21ff8afa12fa0476d27bdafff9adc`; exclusive frontend coordination claim `706507bf8e80c9a907cfc9b7a9cc7b2ca4946cf5`.

## Goals, decision, specific cause and solution

**Goal:** independently verify more than inert HTML markup or synthetic click behavior by invoking the **real creator Game source modules** for manual driving, all five moving NPC traffic cars, collision checks, assisted physical bay movement, and the fixed-type renderer-only `GameSDK.module` normalization/Exit rules. This adds deterministic, runnable Node tests without demanding the GitHub Actions hosted runner or a new Game source build. It does **not** substitute for the real authored DOM/touch/keyboard Chromium test, a new immutable saved package or qualified public QuickJS execution.

**Root cause:** prior `tests/module-contract.test.mjs` demonstrated bay geometry and SDK normalization but its assisted path simulated no traffic obstacles. The new `tests/parking-browser.test.mjs` would exercise traffic and the real DOM but the private repository's GitHub Actions [run 45054380798](https://github.com/georgekarlr/studyverse-games/actions/runs/45054380798), and previous two runs, failed in 2–3 seconds **before the first step**, `runner_id=0`, no runner name, no steps/logs. This establishes **no GitHub runner assigned**, not its cause. Account-level limits, Actions budget/payment restrictions, repository policy or service disruption can have similar symptoms; account billing/entitlement is not observable or changed here. GitHub's [Actions billing documentation](https://docs.github.com/en/actions/concepts/billing-and-usage) describes private repository limits; the owner may inspect run/check annotations and Settings → Billing & licensing → Budgets & alerts or GitHub Support if infrastructure remains blocked.

**Chosen solution:** keep the existing **nine original authored HTML/CSS/JS files and source manifest unchanged**. Add only a small independent no-dependency Node `node:test` suite importing the **real unmodified ESM source from local checkout** via `data:` URLs. Two focused physical-world scenarios: (1) 33 genuine 16.7ms manual-forward ticks, each advancing the actual five NPC cars; choose real Bay 2, move through the actual authored assisted waypoint route with traffic collision detection, verify full vehicle box fits the bay, then **separately** call session `submit` exactly once and `exit` (never grader), with duplicate rejection; (2) the same seeded real left-Bay path encounters a traffic collision and **cannot** be mistaken for an already parked answer. These use deterministic RNG only as a **test fixture** and preserve full authored driving dynamics.

## Before → after, general and specific logic

| Aspect | Before | After |
| --- | --- | --- |
| Source-level physical acceptance | Assists simulated without moving NPCs; no full connected session sequence against seeded traffic | Explicit 60Hz manual move, live five cars, first collision detector, Bay 2 reached, no early proposal, Park submits exactly `{item_id,response:{value:'choice-1'}}`, duplicate blocked, Exit invoked |
| Collision failure mode | Browser suite hangs/times out if route collides; pure tests don't distinguish actual collision | Reproducible left Bay NPC collision positive witness, parked=false and no SDK access from physics |
| Source/manifest | Real Git author nine hash-pinned files, fixed Multiple Choice | Exactly unchanged; all original source references are read from existing checkout, no fabricated saved version |
| Study SDK | Renderer only, no keys or separate grader, existing Standard grades after submission | Only sampled public fields are normalized; injected `answer_key` deliberately stripped, SDK mock records proposal and Exit but does not grade |
| CI and public release | GitHub runner assignment blocked, public QuickJS cannot run real author DOM | Unchanged; the local pure test does not unlock public Play or claim browser acceptance |

Specific pure path: `createTraffic(buildTrack(2),()=>.37)` spawns exactly five moving NPCs; `stepDriving`, `stepTraffic`, `hitTraffic`, `assistedRoute`, `driveAssisted`, and `parkingStatus` run with true 0.0167-second frame increments. The approved Bay 2 remains collision-free with this seed at 16ms/16.7ms/50ms timesteps; selecting Bay 1 from START with the same seed currently collides at ~4.4s, so a future UI/browser fixture cannot claim all assisted routes are independently guaranteed collision-free. User confirmation is not implied by touching a bay: only the explicit later `session.submit` triggers one proposal. The actual Game's `main.js`/DOM and Study Standard evaluation are not executed by these pure Node checks, and should never be inferred.

## Architecture

```mermaid
flowchart TD
 A[Real creator Git source, same immutable nine files] --> B[Local Node ESM import: actual authored physics + traffic + session]
 B --> C[Keyboard-equivalent manual-forward stepDriving]
 C --> D[Five moving NPCs stepTraffic / hitTraffic]
 D --> E[Assisted route to real second parking bay]
 E --> F[Full-car in-bay geometry and explicit Park decision]
 F --> G[One normalized item response via SDK module.submitAnswer]
 G --> H[Trusted Study Standard alone grades after submission]
 G --> I[SDK module.exitToStandard]
 B --> J[Separate left Bay collision witness; no submission]
 K[Real HTML/CSS/JS isolated Chromium run] -. NOT PROVEN .-> L[New owner-authenticated immutable saved Game version]
 L -. separately required .-> M[Public QuickJS capability + current Ed25519 signed revocable one-use grant]
 M -. global public Play locked .-> N[Installed Game renderer]
```

## UI and design

**Adapt the existing environment design.** No application component, CSS, button, Game source file, creator code display, Study Standard UI or layout changes. The original dark-blue parking road, controls, modal, numbered bays, confirmation, responsive touch arrows and accessibility remain authored source only; this test neither modifies nor renders them. No internal filenames displayed in the app, no new user-visible behavior; **User Manual intentionally unchanged**. This test is not a second standalone Study grader or a replacement for the renderer-only `GameSDK.module`.

## Step-by-step implementation, verification and rollback

1. Refresh exact frontend, Worker and creator Git branch heads, both AGENTS documents, owner SDK renderer-only contract, local-first source handoff, canonical backlog, exclusive active claims and the actual nine files/test suites.
2. Independently load original unmodified 3 pure Game source modules through connected private GitHub and execute 19 exact physical/SDK checks under a temporary trusted V8 isolate: **19/19 passed** on 2026-11-23 Manila. Additional traffic-coupled simulation with 33 manual ticks + seeded moving cars: Bay 2 reached with **no collision** at 16ms, 16.7ms and 50ms; leftmost Bay from START currently hits a moving car under the same deterministic seed. This is actual pure source execution, **not DOM/browser or compiled saved Game**.
3. Claim exclusive new private `tests/parking-traffic-module-journey.test.mjs` and this new report via frontend Git expected-SHA nonforced CAS `706507bf...`; preserve four historical Agent 3 active scopes and other agents, no version or signer writes.
4. Implement deterministic real source imported tests with no browser, network, answer keys or production credentials; preserve original 9 files and manifest; commit via owner private source Git exact-head nonforce CAS.
5. Verify new file readback and source HEAD, perform focused actual-source execution when available. **Do not claim Node `node --test` pass unless explicitly executed.** Leave separate Chromium 3-case suite blocked by GitHub runner assignment until a real runner/operator can execute it.
6. Verify live Supabase release lock and public signer/certificate/grant counts unchanged, optionally read current Actions runner job metadata. Append exact evidence here and release only this session's coordination claim by CAS.
7. Owner-usable command (from a private `studyverse-games` checkout, no credentials required):

```bash
cd studyverse-games/4c84c21e-b797-4754-8d49-5134538dd468
node --test tests/module-contract.test.mjs tests/parking-traffic-module-journey.test.mjs
```

8. **Rollback:** revert only this one newly added Node test and this report under a fresh nonforce owner-source Git CAS. No frontend/Worker/Cloudflare deployment, SQL data/RLS grants, actual authored source, saved v2 receipt, immutable private packages, public release, official grades or User Manual rollback.

## Observed delivery evidence

Pending source commit/readback. No app runtime deployment or UI acceptance from this task.
