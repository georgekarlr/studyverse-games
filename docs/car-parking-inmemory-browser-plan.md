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

**Exact creator Git source feature commit:** [`ffb248427cf9b037597e380d6d4fa9d8fd784ce2`](https://github.com/georgekarlr/studyverse-games/commit/ffb248427cf9b037597e380d6d4fa9d8fd784ce2), pushed nonforce with expected head `0e86be51ad68b360528eb31cf53d4a3c0ab35e64`. It adds the new bounded private source loader and 4 focused tests, changes only existing browser test **setup/delivery selection**, and adds this report. Follow-up private CI-only [`003e2f805f4064b3108ab1a081ac2dc4de10e961`](https://github.com/georgekarlr/studyverse-games/commit/003e2f805f4064b3108ab1a081ac2dc4de10e961) includes the 4 new loader tests in the existing scoped private workflow, preserving previous module, markup and browser checks. Zero original Game source file or source manifest changes.

**Verified all nine real committed Game files byte-for-byte:** Live private GitHub `stage-1` source at `ffb2484...` was re-read and compared against its unchanged owner source manifest with an independent byte-level SHA-256 calculation. All **9 / 9** exact original UTF-8 sizes and SHA-256 digests matched; fixed Game type is `multiple_choice`. Actual lengths: `index.html` 6,438; `styles.css` 18,847; `focus-layout.css` 7,549; `main.js` 9,822; `driving-physics.js` 4,502; `parking-lot.js` 7,485; `question-dialog.js` 2,542; `studyverse-session.js` 4,094; `traffic-obstacles.js` 2,235 bytes. Existing signed saved **v2** package, old receipt and private Game catalog unchanged; this is only a local-first editable Git checkout test mechanism.

**Executed local Node verification:** Node `v22.16.0` ran exactly `node --test tests/in-memory-source-loader.test.mjs` on local helper+test copies whose **Git blob hashes equal the committed GitHub blobs**: helper `89b4b32ee8948f963108f61495831306a1626c68`, focused tests `7d96ec8d135052f27c8a28a8c9e07abb9abe800d`. **4 passed / 0 failed**, proving stable nine-name manifest file inventory, exact CSS+HTML source embedding, modified bytes with original SHA blocked, missing relative import blocked before author code runs. These four cases use **controlled fixture sources**, not full real Game render acceptance.

**Executed local Chromium native ESM mechanism probe:** Installed Debian Chromium `144.0.7559.96` with Python Playwright. `page.set_content` created an in-memory document; two actual native `Blob` ES modules were imported via a local generated URL, changing the visible DOM. An additional **Node-generated manifest-hash-checked nine-file synthetic fixture**, created by the same GitHub-blob-equivalent source-loader helper, was loaded into real Chromium through the same in-memory module mapping; visible text became `Actual native ESM booted`, computed CSS was `rgb(0, 128, 0)`, **zero** page errors and network requests blocked. Chromium's administrative network policy blocked `http://127.0.0.1`, `data:`, external URLs and Playwright route-fulfilled navigation with `net::ERR_BLOCKED_BY_ADMINISTRATOR`; this fallback solves that **local environment route**, but **does not prove the actual Car Parking authored Game ran**.

**Private GitHub Actions provider:** [run `45054108586`](https://github.com/georgekarlr/studyverse-games/actions/runs/45054108586), triggered on exact source feature `ffb2484...`, failed in ~2 seconds with no executed job steps. The follow-up source `003e2f8...` generated [run `45054380798`](https://github.com/georgekarlr/studyverse-games/actions/runs/45054380798), `status=completed`, `conclusion=failure`; job `137306265468` has `steps=null` and `logs_url=null`. Like the previous run, this is a **pre-execution provider failure**; neither new loader tests nor source browser test executed in Actions. The underlying runner allocation problem is unknown and cannot be repaired by pretending the Game passed. The 4 locally executed fixture Node cases are separate positive evidence only. Do not claim a browser run of the author's real nine-file Car Parking Game.

**Owner-local independent reproduction** (private checkout of actual Game repository, no account or release credentials):

```bash
npm install --no-save --no-package-lock --ignore-scripts playwright@1.56.1
npx playwright install chromium
cd studyverse-games/4c84c21e-b797-4754-8d49-5134538dd468
node --test tests/module-contract.test.mjs tests/markup-profile.test.mjs \
  tests/in-memory-source-loader.test.mjs tests/parking-browser.test.mjs
```

Set `SV_PARKING_BROWSER_DELIVERY=loopback` to preserve native localhost-module-loading mode, or leave unset for `memory` mode with exact nine source manifest SHA verification and browser blob modules. Optional `SV_LOCAL_CHROMIUM_EXECUTABLE=/usr/bin/chromium` selects an installed binary. The documented command is **not claimed to have run against the nine author files here**; only the four local focused tests and a synthetic Chromium in-memory fixture were run.

**Production read-only check:** Supabase still reports `locked=true`, `executable_runtime_ready=false`, `release_signing_enabled=false`, `entitlement_ready=false`, historic `official_grading_ready=false`, **0 public signing keys, 0 guest certificates, 0 one-use grants, 2 published metadata-only Game showcases, 3 existing verified private saved packages**. No new saved private v3 or receipt, one-time rights, public executable runtime support, hosted JS module/RAF/key/pointer compatibility or official grading. No Cloudflare Pages/Worker runtime deploy for these private Git test-only changes; no production UI or User Manual change.

**Acceptance decision:** **Offline loader source-integrity and fixture Chromium mechanism validated; actual original Car Parking browser interaction not accepted**. Next use an authorized environment able to check out this private owner Game repository and run the exact four suites against real authored Game; diagnose any genuine gameplay failures, then create a separately verified immutable private saved version before attempting isolated public-player capability and revocable signed per-version rights. Global locked release must remain locked until all independent gates pass. Rollback remains deleting new helper/test and reverting only the browser setup + workflow invocation via fresh expected-head nonforce Git CAS; the nine authored source files, v2, catalog, RLS, signer, and Study Standard are untouched.
