# Car Parking — Full-screen game controls

## Goal and design decision

The private Car Parking Game must fill the entire available Game Preview viewport on desktop, tablet, portrait and landscape screens. The road, car and numbered bays are the full-screen content; the in-game controls are translucent overlays, not panels outside the game. Adapt the existing StudyVerse dark-blue game design rather than importing an unrelated design.

## Specific cause and solution

Before this update the camera reserved separate top and bottom space for instructions, arrows and Park even though those elements were already absolutely positioned over the playfield. As a result, the world occupied less of the desktop/landscape viewport, texts could overlap the game, and mobile often showed a smaller-feeling road.

Now the responsive camera scales the world to COVER the host viewport (maximum of viewport-width/world-width and viewport-height/world-height), follows the car across both axes and clamps it at the road edges. This lets the car travel behind the transparent game controls. Their backgrounds do not blur the car beneath.

Normal driving hints remain accessible to assistive technology without occupying visible road space. Important errors or completed submissions still appear as compact in-game messages. Decorative road words are hidden where they compete with the HUD.

## General and specific UI instructions

- Keyboard: Up accelerate, Down reverse, Left/Right steer, Space brake, P park, R reset, I open the full question/choices.
- Touch: Hold transparent arrows to drive. Hold accelerate and steer simultaneously using multiple touches. Brake is the middle square.
- Park: Align inside a numbered answer bay, nearly stop and press the translucent Park control on the right. Only this action submits the selected choice.
- Information: Tap the small i button in the upper right to pause and read the complete learner-visible question and numbered choices. Sample-only controls also live in this modal.
- Exit: The adjacent top-right X invokes the existing StudyVerse Module SDK exit method. It is intentionally hidden if no Module SDK is available for a standalone sample; the preview host still owns its outer Close button.
- All overlays remain inside the Game document; actual browser/OS fullscreen is controlled by the StudyVerse preview host and device.

### Moving road traffic (three obstacle cars)

- Exactly **three colorful traffic cars** move unpredictably along the roadway **outside** the numbered answer parking bays. Their speeds, direction reversals and gentle within-lane wandering change independently; all three stay in the driving zone, never inside an answer space.
- Watch for gaps before you accelerate or cross their lanes. If the player's car touches traffic, it returns to **START** with a brief warning. The question remains active; no answer is submitted, marked correct/incorrect or graded by a collision. You can try again immediately.
- The moving traffic freezes whenever the question modal pauses driving or the game is hidden; reset returns your player to START. Tapping a bay for optional assisted driving doesn't make traffic disappear; an assisted car can also be returned to START if it touches traffic.
- Only stopping and pressing **Park** inside a numbered answer bay submits a choice. Traffic cars do not contain answers and cannot select choices.
- All traffic uses the existing full-screen responsive camera and non-interactive decorative shapes; the HUD and touch controls remain available.


## Before and after

| Aspect | Before | After |
| --- | --- | --- |
| World size | Camera reserves top/bottom room | Road covers the entire Game iframe |
| Touch arrows and Park | Visually separated, heavy panels | Translucent, touch-tested controls over the road |
| Normal text | Visible status chips obstruct driving | Screen-reader hints; visual status only for errors/results |
| Exit | Long text in the question modal | Accessible X at upper-right edge |
| Desktop/phone | Different apparent game height | Same scene scaled/followed to each viewport |
| SDK | Fixed Multiple Choice, private preview only | Exactly the same trusted interface and restrictions |

## Architecture

Local Game Editor → Private Game Preview's opaque iframe → Car Parking Game shell

Car Parking Game shell:
- Full-viewport camera and existing physics
- Translucent HUD, keyboard/touch controls and Park
- Read-only question information modal
- Unmodified StudyVerse Multiple Choice SDK adapter

Parking event → actual offered option ID → GameSDK.module.submitAnswer → private synthetic host.

There is no answer key, self-scoring, release permission, public gameplay unlock or official grading inside the Game. The existing Game project ID, owner binding, source entry and fixed item type are preserved.

## Step-by-step implementation and verification

1. Confirm current Game folder and source-manifest identity on the stage-1 branch.
2. Move the exit from the modal to a top-right X. Put sample controls in the information modal.
3. Hide ordinary status text visually but retain status announcements to screen readers.
4. Implement the full-bleed cover/follow camera without changing driving physics.
5. Add a composable focus stylesheet after the base visual stylesheet.
6. Update the exact byte sizes and SHA-256 values in the source manifest and verify that SDK and owner files are unchanged.
7. Exercise the Game with a synthetic local SDK in Chromium at 1280x800, 1920x1080, 390x844, 320x568, 640x360, 768x1024 and 568x320. Verify full-screen sizing, keyboard movement, simultaneous simulated touch pointers, information modal, SDK exit and exactly one parking submission. These are LOCAL mocked-iframe game checks, not a verified production Private Preview build.
8. In the Local Game Editor, safely reload this exact branch's latest source before selecting Preview current edits; older unsaved local edits do not automatically receive GitHub changes.

## Rollback

Revert the scoped Car Parking source commit against the latest stage-1 head. No changes to the main StudyVerse frontend, Worker, Study Standard, database, account permissions, public release or payment system are needed.
