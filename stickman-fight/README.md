# VersantPro Stickman Fight

A premium neon 1v1 browser fighting game controlled by fast alphabet reactions. Each player sees an independent prompt stream; pressing the matching A–Z key triggers an attack, while wrong keys do nothing.

## Features

- Procedural Babylon.js stickman fighters and neon arena
- Keyboard-driven reaction combat
- Health, score, combo, attack and hit feedback
- Responsive lobby and mobile layout
- Deterministic demo mode at `/?demo`
- Random matchmaking adapter using Firebase Realtime Database
- Private room code adapter
- Anonymous Firebase Authentication support
- Bundled visual assets under `client/public/assets`

## Run locally

Requirements: Node.js 20+ and pnpm.

```bash
pnpm install
pnpm dev
```

Open the local URL shown by Vite. Use `/?demo` for a deterministic playable demo without Firebase matchmaking.

## Production build

```bash
pnpm check
pnpm build
```

## Firebase multiplayer setup

1. Open the Firebase project used by the website.
2. Enable **Authentication → Sign-in method → Anonymous**.
3. Create or enable **Realtime Database**.
4. Review and apply `firebase-database.rules.json`.
5. Verify the `databaseURL` in `client/src/game/firebaseAdapter.ts` matches the Firebase project.

The Firebase web configuration is client-side configuration. Realtime Database Rules are the security boundary. The prototype sends client state for responsive play; a competitive production release should validate damage and match outcomes on a trusted server.

## Project structure

```text
client/src/components/GameCanvas.tsx  React shell, lobby, HUD, input
client/src/game/scene.ts                Babylon arena and fighters
client/src/game/firebaseAdapter.ts      Matchmaking and room transport
client/src/game/types.ts                Shared game types
client/public/assets/                   Bundled visual assets
firebase-database.rules.json            Starting Realtime Database rules
FIREBASE_SETUP.md                       Firebase setup notes
PLAN.md / STRUCTURE.md / MEMORY.md      Build and architecture notes
```

## GitHub

This repository should not commit `node_modules`, `dist`, `.git`, or WebDev logs. The included source archive follows those exclusions. After extracting it:

```bash
git init
git add .
git commit -m "Initial VersantPro Stickman Fight game"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
git push -u origin main
```
