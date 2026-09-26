# VersantPro Stickman Fight — Plan

## Product target
A premium 1v1 browser arena where players react to independent alphabet prompts to attack. The first shipped slice is playable offline and in deterministic `?demo` mode, with Firebase Realtime Database room/matchmaking hooks ready for online play.

## Risk slices
1. **Babylon lifecycle** — one engine per mount, resize cleanup, scene disposal.
2. **Readable combat** — large prompt, instant keyboard response, health/round feedback, attack/hit animation.
3. **Multiplayer transport** — anonymous Firebase auth, random queue, room code, opponent state subscription; keep rendering local and send only meaningful state.
4. **Visual QA** — arena composition, HUD hierarchy, responsive lobby, deterministic demo screenshot.

## Verification criteria
- `pnpm check` passes.
- `pnpm build` passes.
- `/` renders a full-screen arena and lobby without console errors.
- `/?demo` enters a deterministic fight with visible prompt cycling, attacks, health changes, timer, and round result.
- Keyboard A–Z only triggers a hit when it matches the current prompt.
- Random match and room flows fail gracefully when Firebase Anonymous Auth/Realtime Database is not enabled.
- Mobile layout keeps prompt, health bars, and primary controls usable.
