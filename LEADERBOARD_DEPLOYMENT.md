# VersantPro leaderboard and profiles: implementation and deployment

## What is included

- A responsive `leaderboard.html` backed by Firestore `publicProfiles`, with a live top-three listener, paginated rankings, username search and signed-in rank.
- Homepage leaderboard navigation, a live podium preview and the signed-in learner's current rank.
- An editable public profile panel appended to the existing profile dashboard; the existing assessment-score dashboard remains in place. Supports username, display name, 150-character bio, one HTTPS/HTTP social link, and a JPEG/PNG/WebP avatar (2 MB maximum). `profile.html?user=username` is the public profile route.
- Firebase callable `updatePublicProfile` validates identity fields server-side, reserves unique usernames and commits public data. Profile image writes are authenticated and path-scoped.
- Firestore create triggers award XP for newly created, timestamped assessment result documents. A transaction provides duplicate-source idempotency and a 200 XP/day ceiling, and updates streak/session/accuracy aggregates. XP transaction documents are server-only.
- Security rules and Firebase deployment configuration are provided.

## Important limitations and required integration

The supplied source contains Firebase Authentication and profile code, but no practice module currently writes assessment completion documents. Its profile page only reads several possible result collections. Therefore this delivery intentionally does **not** award XP for opening a page, refreshing, client-side claims, or unsaved practice. The trigger recognizes creation in `assessmentResults/{id}`, `practiceResults/{id}`, `results/{id}`, and `users/{uid}/assessmentResults/{id}`. A practice module must write a genuine result once, after its existing completion/scoring logic, with a module/type, score, and server timestamp; for top-level result documents it must include `userId`. Secure that write path so users cannot fabricate scores or timestamps. Because the present modules do not have verifiable scoring/completion writes, automatic leaderboard activity begins only when a trusted result-writing path is integrated. Existing historical data is not retroactively converted to XP.

This static GitHub Pages project does not contain a tested Cloud Functions backend deployment or deployed Firestore indexes/rules. The code is a deployable starting integration, not a claim that Firebase has been deployed or exercised against the production project. No live Firebase credentials or production data were accessed during this work. The current ranks are maintained for the top 500 profiles by the ranking job; scale-out ranking should use a dedicated scheduled/queue ranker before larger production scale. Achievements presently include an early-adopter callable; other requested badges need trusted events (e.g. verified 7/30-day streak and reliable WPM/accuracy measures) before they can be awarded honestly.

## Deploy

1. Back up the Firebase project and existing Firestore/Storage rules. Install the Firebase CLI, authenticate as an authorized project administrator, and run `firebase use versantpro-7a2af` after confirming that project is the intended target.
2. **Merge** `firestore.rules` and `storage.rules` into the existing production rules before deployment. The supplied Firestore rules are a minimal standalone ruleset for the new collections and would replace unrelated site rules if deployed wholesale. Preserve existing access to questions, feedback, and other current collections.
3. Install backend packages: `cd functions && npm install`; from project root deploy functions with `firebase deploy --only functions`. Deploy the merged rules and storage rules only after reviewing their effect: `firebase deploy --only firestore:rules,storage`.
4. Configure Firebase Authentication authorized domains (including `versantpro.in`) and enable Firestore and Storage. The callable profile function and its indexes/region (`us-central1`) must be deployed before using the profile editor. Confirm Firebase billing/Blaze availability for Cloud Functions and Storage as applicable.
5. Connect each module's existing successful completion handler to a trusted result write that the backend can verify. Prefer an authenticated callable that checks answers/scoring against server-known exercise content, then writes a server-timestamped result; do not let browser code submit arbitrary XP or trusted scores. Test rate limits and idempotency before enabling XP publicly.
6. Deploy static files to the existing hosting provider. The new module paths and `profile.html?user=...` route work on ordinary static hosting.
7. Test with two controlled accounts: registration/login unchanged, public profile visibility and edit authorization, username collision, invalid social URLs, avatar MIME/size, verified result trigger, duplicate event, daily cap, top-three, pagination, live updates, mobile layout and existing practice modules. Inspect Cloud Function logs and Firestore rules simulator before opening broadly.

## Score transparency

For each eligible verified result with normalized score 0–10, XP is `round(score × 2)` clamped to 1–20, capped at 200 XP per UTC day. The server transaction permits one award per result document path. Session count and streak update only on eligible result creation. Opening modules and reloading pages never generate XP.
