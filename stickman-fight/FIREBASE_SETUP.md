# Firebase setup

The game uses Firebase Anonymous Authentication and Realtime Database for random matchmaking, private room codes, and opponent state. In the Firebase Console for `versantpro-7a2af`, enable **Authentication → Sign-in method → Anonymous** and create/enable **Realtime Database**. Apply `firebase-database.rules.json` after reviewing it.

The browser SDK contains the Firebase web configuration, which is normal for Firebase client applications. Realtime Database Rules are the security boundary. The current prototype uses client-authoritative health for a responsive demo; a production competitive game should validate damage and match outcomes on a trusted server.
