# Real Car Parking — offline in-memory Chromium source acceptance path

**Task:** SV-CAR-PARK-INMEMORY-REAL-BROWSER-001 · **session:** SV-A3-20261123-INMEMORY-GAME-149 · 2026-11-23 Asia/Manila · owner source `georgekarlr/studyverse-games` `stage-1`, project `4c84c21e-b797-4754-8d49-5134538dd468` · starting Git head `0e86be51ad68b360528eb31cf53d4a3c0ab35e64`. Shared coordination exclusive claim `c94fe3a3435d4d492c3873ea44909a0d38b59d12`.

## Goals, root causes, before/after and decisions

Goal: preserve the **actual owner-authored nine-file** Car Parking game and run true Chromium pointer/keyboard + Park + one normalized Module answer + Exit acceptance without requiring navigation to local HTTP where an operator environment blocks it. This is a private-source rehearsal, never a new saved Game version, production isolated QuickJS qualification, new release signature, general item grader, or public Game Play authorization.

Two **measured independent environmental blockers**:
1. The previous private GitHub Actions run [45050324960](https://github.com/georgekarlr/studyverse-games/actions/runs/45050324960) failed ~3 seconds after launch with **zero job steps** and no available job logs. There is no evidence a test or Chromium actually started. Cause remains unknown; do not infer a Game code failure, a billing issue or a successful run.
2. In this tool's local container, Debian Chromium 144 + Python Playwright are installed; navigation to `data:`, remote web and `http://127.0.0.1` returned `net::ERR_BLOCKED_BY_ADMINISTRATOR`, including with Playwright request interception. However, `page.set_content` rendered, and Chromium executed original-style ES `import` chains through browser-native `Blob` object URLs with no HTTP requests. This is an **operator environment restriction**, not evidence about the creator's normal browser or production Worker.

**Decision:** adapt the existing dark-blue Game source test, no UI redesign or code release. Keep existing `SV_PARKING_BROWSER_DELIVERY=loopback` path for operator environments where localhost works. Make default `memory` delivery read **all nine actual source bytes** and verify `size_bytes` plus `sha256_hex` against the Git source manifest, require a fixed `multiple_choice` type and an exact nine-file set. Build the in-memory document using the original `index.html` with only the two original stylesheet link elements and the original entry script transport removed and **their exact source CSS embedded inline**. Native Chromium import uses original module JS with only relative imports mapped to local `blob:` URLs in deterministic dependency order. No HTTP, no replacement Game physics, no creator data/key, no custom grade or answer key. Unexpected URL or source dependency fails closed. The same three preexisting desktop/mobile/fallback tests and fixture still test deliberate Park and Exit; no new synthetic Game is substituted.

| Area | Before | After |
| --- | --- | --- |
| Browser delivery | Ephemeral localhost, which this execution environment forbids | Default exact-hash-pinned in-memory author document + blob ES modules; opt-in original localhost path retained |
| Source provenance | Local server allowlisted nine names, but did not check each source byte hash | All nine actual author files must match the existing fixed-type private Git source manifest before any Game source executes |
| Game UI | Real dark-blue HTML/CSS/JS via localhost | Same actual HTML, both authored CSS files, and same six JavaScript modules. Only test transport of styles/entry/import URLs changes, not logic, layout, controls, accessibility or grading |
| Source browser tests | Three actual-game tests were committed but job failed before starting | Same three browser tests target both delivery modes; add four locally executable focused no-network Node helper checks |
| Public / installed rights | Current release locked and saved v2 immutable | Same, no real owner-authenticated new package/receipt/version or public runtime unlock |

## Architecture, general and specific logic

```mermaid
flowchart TD
 A[Private owner Git working tree: 9 actual source files] --> B[Strict manifest hash+byte+fixed-type validation]
 B --> C[Real HTML document; original CSS inlined; unchanged authored DOM]
 B --> D[Original six authored JS modules]
 D --> E[Static relative import URLs mapped to native browser Blob ESM]
 C --> F[Fresh headless Chromium page.setContent; no HTTP navigation]
 E --> F
 G[Synthetic answer-key-free fixed MC item] --> H[GameSDK.module mock, get/one submit/exit only]
 H --> F
 F --> I[Keyboard and pointer drive; real road physics and 5 traffic cars]
 I --> J[Assisted real Bay 2 movement]
 J --> K[Deliberate Park click -> one {item_id,response}]
 F --> L[Exit to Standard; 25-choice fall back]
 M[Later verified NEW immutable saved package] -. not produced .-> N[Separately qualified isolated public QuickJS + revocable signed rights]
 N -. production globally locked .-> O[Study Standard learner renderer + Study Standard grading]
```

Specific implementation: reuse existing `parking-browser.test.mjs` scenarios and one shared `installSyntheticModuleSdk` mock, install it after `setContent` and before importing owner modules in memory mode (unlike `addInitScript`, which only runs on page navigation). The authored `main.js` retains original Module getter, animation, real vehicle/bay parking logic, deliberate `submitAnswer({item_id,response:{value:optionId}})` and `exitToStandard()`. No evaluator, correctness data, real learner item, source mutation, compiled artifact or trusted browser entitlement enters this suite. In-memory mode denies **every** network request; HTTP mode permits exactly one ephemeral loopback origin and still blocks all external traffic. Genuine HTML document, JavaScript module import order, markup/CSS and responsive layout remain under the original Game author's control. The helper refuses extra/missing files, changed hash, unsupported stylesheet transport and unresolved local imports. An unrecognized delivery mode is rejected. Optional `SV_LOCAL_CHROMIUM_EXECUTABLE` chooses an already-installed Chromium binary.

## UI design and user-facing behavior

**Adapt existing environment UI.** The private test does not ship a new user interface. Existing dark-blue full-screen Car Parking, road, number-sized answer bays, keyboard steering, touch pad, question modal, sample, status, Exit and mobile layout remain unchanged. Internal filenames, source hashes or test configurations never appear in production application screens. No User Manual update: none of this source-only test delivery code is user-visible.

## Step-by-step, measured acceptance, next actions and rollback

1. Refresh real frontend, Worker and private creator Git branches, AGENTS/backlog, renderer-only contract, immutable private Game source, prior read-back and four historical active claims. Reserve exclusively this new test helper/new focused tests and narrow original browser test setup, never source/Studio/Worker/DB/public runtime.
2. Reproduce GitHub pre-step failure and the local Chromium navigation policy. Check that `page.set_content` + imported in-memory native Blob ES-module chain works **in the local container** without internet.
3. Add a composable pure helper, `verifiedInMemorySourceBundle` and `importVerifiedAuthorModules`, with all nine exact source manifest hashes, static allowlist and original CSS/JS byte preservation except transport substitutions.
4. Retain three existing Playwright scenarios with both delivery modes; use `SV_PARKING_BROWSER_DELIVERY=memory` by default and `loopback` for real local HTTP loader provenance. Add focused no-browser tests covering file inventory, exact embedded source, byte mismatch rejection and unresolved imports.
5. Run real local Node helper checks and local Chromium-native module import probe; record exact scope only. **Do not claim the owner's full Game source browser test was run** unless the private repository source bytes and browser are actually available to the same environment. GitHub CI remains an external runner blocker if it still fails before steps.
6. Commit to owner private Git source via exact-head nonforce CAS; record original source nine files/manifest unchanged; check fresh GitHub Actions run/job metadata and read-only production release lock. Update this report and release only this session's frontend coordination claim by nonforce CAS, preserving other agents.
7. **Next acceptance:** genuine nine-file owner checkout with Node Playwright and Chromium launches this suite (default memory) and passes keyboard/pointer/bay/submit/Exit with true screenshots/computed styles; new immutable private owner-authenticated build+Wasabi+CSS/HTML/JS qualification; independent isolated public engine and signed one-use revocable rights. These are **not bypassed** by this harness.
8. **Rollback:** revert only new helper, focused tests and the limited preexisting browser-test delivery setup (or set `SV_PARKING_BROWSER_DELIVERY=loopback` to use legacy behavior). No saved v2 package/receipt, source file manifest, real browser rights, production Worker/Pages/SQL or User Manual rollback.

## Observed evidence

Pending code commit and provider readback. Existing original game source is intentionally not overwritten.
