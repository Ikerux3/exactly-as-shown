# AI testing handoff

Status recorded on 2026-10-10:

- `GEMINI_API_KEY` is configured in Lovable Cloud Secrets. Its value is intentionally not stored in Git.
- The next AI pass must include repeated deployed runs, not only mocked provider tests or deterministic offline tests.
- Verify that name, colour, toy and food questions vary across runs and remain grounded in the player's earlier answers and behaviour.
- Verify that chapter 3–5 interventions react to mistakes, timing, hints, choices and Cordura without changing validated puzzle solutions.
- Verify profanity and prompt-injection handling with both ordinary and adversarial answers.
- Verify favourite-toy image generation with a custom answer such as a Formula One car and confirm cache reuse.
- ElevenLabs must remain disabled during these tests with `ELEVENLABS_ENABLED=false`; browser TTS is the active fallback.
- When voice timing and coverage pass, enable ElevenLabs in a short, controlled smoke test and monitor usage.

Current automated baseline: unit tests and production build must pass before and after deployed testing.
