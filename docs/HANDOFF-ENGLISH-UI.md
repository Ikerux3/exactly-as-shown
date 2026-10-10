# English UI handoff
Date: 2026-10-10. Owner: Codex for MJ. Branch: main (authorized).
Base commit: 2c759ffe0298d59501415fbc0bcb35bc37aa2636.
Status: implemented and tested; public Lovable publication not verified.

Changes:
- Fear replaces the remaining Spanish Cordura label in the HUD, accessible meter name, how-to-play instructions and ending summary. The label matches the existing value increasing when frightened.
- Chapter shortcut notice now reads "Skipping to chapter".
- English name example now reads "e.g. Lucy".
- Reviewed menus, objectives, dialogue, errors, accessibility labels and AI response prompts across src/game and src/routes. Existing dialogue, AI English instructions, English speech synthesis and html lang=en remain intact.
- Player names and bilingual input recognition are retained; no gameplay, assets, saves or levels changed.
Files: src/game/Shell.tsx, src/game/scenes/Opening.tsx, src/game/scenes/Endings.tsx, src/routes/index.tsx.
Validation: TypeScript PASS; Vitest 71/71 in 18 files PASS; production build PASS. No new visual QA for this text-only revision.
Concurrent gameplay/AI updates on main preserved.
Drive not used, per MJ instruction.
Next step: publish/update Lovable and check the public URL on a phone.
