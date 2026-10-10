# MG01 integration with Lovable
Date: 2026-10-10. Owner: Codex for MJ. Branch main authorized.
Base: da8befa9a1cb60d67d514f49beaac186cd449365 (merged Lovable work).
Reviewed Lovable changes since English UI commit 78253286: mobile navigation/touch improvements; scene-only sanity displacement; opened toybox asset; dark toy roaming; alternate hiding prop; kitchen shelf close-ups/navigation lock; dining packing table, cinematic cleanup/reveal, food graphics and curated toys.
Already present and retained: English UI; clean jacket wall asset; five toys / four walls with two by jacket; one first-pickup escape and persisted recovery.
Minimal integration:
- Remove only the transient toybox duplicate from non-front walls. Keep Lovable's open/closed chest artwork in front.
- Bound escaped toy's dark movement to its original wall (x<=70), retaining walking and dark movement. Keep all roaming of uncollected toys and pointer reactions.
- Synchronize jacket/alternate keepsake reveal so the toy is exposed when either interaction is used in shuffled runs; retain both Lovable props/controls.
Changed gameplay only inside Ch1. Chapter 2 and later contents in Ch1Ch2.tsx byte-identical to base; no other gameplay/UI/assets modified.
Files: src/game/scenes/Ch1Ch2.tsx, src/game/scenes/Ch1.test.tsx, this handoff.
PROVEN locally: TypeScript PASS; 10/10 MG01 + room-layout tests PASS. Cases include non-front first pickup with no chest, 20 seconds darkness without escaped toy changing wall, recovered first toy stays stored, shuffled jacket/keepsake interactions and full completion. Existing tests were adapted to locate uncollected toys after preserved Lovable dark roaming.
Production build and whole suite: CI to verify with actual newly merged assets; local copy lacks the new binary assets, so no local build/visual QA claim.
Drive not used. Public Lovable deployment not verified. Next step: CI confirmation and publish/update Lovable, then physical mobile QA.
