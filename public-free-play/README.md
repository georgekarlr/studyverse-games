# Car parking — direct public Free Play host

This is a dedicated **unprivileged**, independently hosted production Free Play Game, not a signed StudyVerse Study Item player.

From the repository root run `node public-free-play/build.mjs`. The build verifies every original source byte and SHA256 against the canonical source manifest before producing the sole Cloudflare Worker bundle. The public deployment uploads the built module as `worker.mjs` with **zero bindings**, and enables its separate workers.dev subdomain. Never pass creator source via a request, build from unverified GitHub branches or allow the worker to fetch external code.

The only transform is starting the author's pre-existing, no-grade sample session on pages with no GameSDK. Full keyboard, pointer, animation and display use normal browser APIs on this isolated origin. The production CSP blocks all outgoing browser connections; the Worker has no account data or secrets. Requests other than GET/HEAD fail and only nine explicitly pinned static assets plus health status are served.

Public version remains independent from saved immutable Car parking v2. New private saved versions and signed StudyVerse Play require their own review. Keep production global Game release locked. Rollback: disable or delete only this standalone worker.
