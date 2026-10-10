# Exactly As Shown

Implement exactly the screenshot and nothing else

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/9143665d-a103-43cd-84dd-b30e4e950783).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Optional Gemini preference

The game is fully playable offline. To let The Guest interpret free-text answers and direct later minigame variants from the player's accumulated behaviour, copy `.env.example` to `.env` and set a server-only `GEMINI_API_KEY`. `GEMINI_MODEL` is optional; the default is `gemini-3.5-flash-lite`.

Never expose the key through a `VITE_*` variable. If Gemini is missing, slow, or unavailable, the scene automatically uses validated local rules.

The adaptive director can only select validated difficulty curves, puzzle variants, hiding places, blackout pressure and dialogue. It never generates executable game rules, so checkpoints and offline play remain deterministic.

During chapters 3–5 the director also reacts at safe gameplay checkpoints: completed music-box rounds, repeated lock mistakes, the solved lock, completed bedtime tasks and the first failed toy search. Each reaction must quote a validated player fact in its dialogue and can only ease, hold or escalate the next safe portion of play. It never changes a solution that the player is currently attempting. Decisions are cached per checkpoint and use grounded local dialogue when Gemini is unavailable.

## Optional ElevenLabs voices

Character dialogue can use ElevenLabs while keeping credentials on the server. Configure `ELEVENLABS_API_KEY` and the three voice IDs shown in `.env.example`. `ELEVENLABS_MODEL` is optional and defaults to the low-latency `eleven_flash_v2_5` model.

When ElevenLabs is missing, slow, or unavailable, the game automatically uses the browser's English text-to-speech voices. If device speech is unavailable too, dialogue continues through the always-visible subtitles. The existing Sound control mutes music, effects, and speech together.
