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
