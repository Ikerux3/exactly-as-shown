<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Game architecture
- The game lives in `src/game/` (store, audio, guest director, props, scenes) and renders from `src/routes/index.tsx` as one route switching scenes via zustand `screen` — keeps the experience a single uninterrupted window with no page reloads.
- Puzzle checkpoints live in the store; scenes remount on `phaseKey` after a full scare — so a scare restarts only the current phase without losing progress.
- The Guest can use server-side Gemini to interpret answers and select a typed adaptation plan, but it may only choose validated interventions and minigame variants; deterministic fallbacks must keep the full game playable offline.
- Scene art is generated raster backgrounds with SVG/PNG props positioned in percent of a fixed 2:3 frame — never stretch art to fit hitboxes.
- HUD (chapter, progress, Cordura, pause) and the dialogue bar (subtitles / Mommy's list + light switch) live in `src/game/Shell.tsx` bars above and below the art frame — don't overlay UI on the art, so it never hides props or hitboxes.
- The game saves a checkpoint at the start of each chapter (`go()` in the store); the title menu offers Continue from it.
- Rooms have four walls (WALLS in assets.ts); Stage handles swipe/arrows and scenes opt in with `spread` + `<OnWall n>`, otherwise content stays on the front wall — lets chapters spread puzzles without breaking older scenes.
- Scenes with their own views (e.g. dining tray/table) pass `noTurn` to Stage; collage jumpscares use `JumpScare` from fx.tsx rendered in Stage `above` — keeps scares local without triggering the phase-restart scare.
- Apply sanity displacement only to scene artwork, never overlay roots or SVG definitions — prevents blank rooms and moving flashlight masks.
- Curated preference props resolve through assets.ts and curated cache keys before image generation — known toy preferences stay visually distinct offline without changing the five checkpoint slots.
- Kitchen close-ups lock Stage navigation and use a full-frame shelf photograph; dining begins at the packing table — keeps object picking and touch placement separate from wall gestures.
- The studio splash mounts once per app opening before any game scene, with image-load timing, a tap skip and a timeout fallback — chapter changes and menu returns must not replay it or get stuck on a failed image.
