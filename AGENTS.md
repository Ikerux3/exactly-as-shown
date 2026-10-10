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
- The Guest only picks from a validated intervention list (`src/game/guest.ts`); no AI is wired yet — gameplay must stay deterministic and fully playable offline.
- Scene art is generated raster backgrounds with SVG/PNG props positioned in percent of a fixed 2:3 frame — never stretch art to fit hitboxes.
