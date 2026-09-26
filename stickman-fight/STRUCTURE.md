# Structure

```text
client/src/
  App.tsx                         route shell
  components/GameCanvas.tsx      React picture frame + lobby/battle HUD
  game/scene.ts                   Babylon arena, fighters, hit animation, cleanup
  game/firebaseAdapter.ts         Firebase Auth + Realtime Database room/queue adapter
  game/types.ts                   shared game and network types
  index.css                      premium neon arena UI
```

## Ownership
- React owns lobby state, battle HUD, keyboard listener, demo orchestration, and user-visible errors.
- `game/scene.ts` owns Babylon Engine-facing meshes, fighter animation, arena, and cleanup. It exposes a small `GameHandle` API rather than leaking scene nodes into React.
- `game/firebaseAdapter.ts` owns Firebase initialization and network persistence. It sends prompt/health/attack state only on meaningful changes; the canvas remains responsive locally.
- Firebase uses anonymous auth for matchmaking identity. The project includes `firebase-database.rules.json` as a starting point for Realtime Database Rules.

## Multiplayer model
- Random match: `/matchmaking/{queueId}` records a waiting player; both clients converge on a deterministic match id derived from queue ids.
- Room code: `/rooms/{roomId}` stores host/guest presence and status.
- Match state: `/matches/{matchId}/players/{uid}` stores each player's health, prompt, last attack id, and updated timestamp.
- This is intentionally client-authoritative for the prototype; production competitive play should move damage validation to a trusted server.
