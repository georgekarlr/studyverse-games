# Car parking — preserve true variable answer bays without a dynamic Grid count

**Source revision:** 2026-11-21. The currently published saved **v2 is immutable** and still unqualified for public Play. This document describes the next GitHub source revision; a new saved package and version must be built and verified before a release.

## Exact cause
The author source uses `repeat(var(--bay-count),minmax(0,1fr))` for numbered answer bays. The variable is assigned at runtime to `options.length` by the lot controller, and can vary from 2 through 24 depending on the actual Multiple Choice Study Item. Existing static isolated CSS rejects the unknown `repeat()` count; authoring a made-up fixed count or modifying the saved v2 digest would corrupt answer/parking geometry. The original static proof legitimately reports `static_repeat_variable_undefined`.

## Implementation
Replaced the single bay-container Grid with a one-row `display:flex` and added `flex:1 1 0%` to bay children. This yields exact equal widths for the number of actual option buttons. The existing `buildTrack` math computes world width `max(960,110+186*count)` and box width `(worldWidth-110)/count`. The CSS world margin is 55px left and right; therefore each flex child box has exactly the physical parking bay width. Removed only the obsolete `--bay-count` runtime setter and updated both file sizes/SHA256s in the canonical source manifest.

## UI and behavior
Before: the same original full-screen dark-blue Car parking road with answer-sized bays, but the static v2 CSS compiler could not authorize the dynamic grid-track count. After: identical intended road, bay order and equal-width geometry through flex; keyboard, hold-to-steer touch pad, P to park, question dialog and StudyVerse Standard answer checking remain authored behavior. Adapt the existing Game UI—no unrelated redesign, no filenames or source metadata on the user-facing page. The User Manual remains unchanged until a new verified user-facing build is actually published.

## Explicit remaining gates
The source modification is **not a saved v2 package rewrite**. The v2 compiler also reports one unsupported HTML element, five data attributes and four other attributes, and the isolated public QuickJS runtime is not yet proven compatible with this complex Game's dynamic DOM, animation and pointer controls. The correct next step is a fresh creator-source build/publish, then independent new-version CSS and markup compatibility, *actual* saved author Play → move car → park → Exit local browser proof, and genuine signed/public guest launch and revocation review. Public release SQL remains locked with zero public release keys/certificates/grants. Do not grant Play based solely on a source commit or CSS compile.
