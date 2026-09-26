import { initializeApp, getApps } from "firebase/app";
import { getAuth, signInAnonymously, type User } from "firebase/auth";
import {
  getDatabase,
  onDisconnect,
  onValue,
  push,
  ref,
  remove,
  set,
  update,
  get,
  type DatabaseReference,
  type Unsubscribe,
} from "firebase/database";
import type { MatchCallbacks, MatchRecord, NetworkPlayer } from "./types";

const firebaseConfig = {
  apiKey: "AIzaSyASKI0u0KBCPz0vg5ro0XhJlSSuWxrW8OU",
  authDomain: "versantpro-7a2af.firebaseapp.com",
  databaseURL: "https://versantpro-7a2af-default-rtdb.firebaseio.com",
  projectId: "versantpro-7a2af",
  storageBucket: "versantpro-7a2af.firebasestorage.app",
  messagingSenderId: "1032992540620",
  appId: "1:1032992540620:web:a77017677625c1fdedff69",
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

function randomCode(length = 5) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
}

function normalizePlayer(value: unknown): NetworkPlayer | null {
  if (!value || typeof value !== "object") return null;
  const data = value as Record<string, unknown>;
  if (typeof data.uid !== "string") return null;
  return {
    uid: data.uid,
    name: typeof data.name === "string" ? data.name : "Rival",
    health: typeof data.health === "number" ? data.health : 100,
    prompt: typeof data.prompt === "string" ? data.prompt : "A",
    lastAttackId: typeof data.lastAttackId === "string" ? data.lastAttackId : undefined,
    updatedAt: typeof data.updatedAt === "number" ? data.updatedAt : undefined,
  };
}

export class FirebaseMatchClient {
  private user: User | null = null;
  private matchId = "";
  private playerRef: DatabaseReference | null = null;
  private opponentUnsubscribe: Unsubscribe | null = null;
  private queueRef: DatabaseReference | null = null;
  private queueUnsubscribe: Unsubscribe | null = null;
  private roomUnsubscribe: Unsubscribe | null = null;

  async ensureUser() {
    if (this.user) return this.user;
    const credential = await signInAnonymously(auth);
    this.user = credential.user;
    return this.user;
  }

  async createRoom(name: string, callbacks: MatchCallbacks) {
    const user = await this.ensureUser();
    const roomRef = push(ref(database, "rooms"));
    const roomCode = randomCode();
    const room: MatchRecord = {
      matchId: roomRef.key || roomCode,
      roomCode,
      hostUid: user.uid,
      status: "waiting",
    };
    await set(roomRef, { ...room, hostName: name, createdAt: Date.now() });
    this.roomUnsubscribe = onValue(roomRef, (snapshot) => {
      const value = snapshot.val() as Record<string, unknown> | null;
      if (!value) return;
      if (typeof value.guestUid === "string") {
        callbacks.onMatched({ ...room, guestUid: value.guestUid, status: "active" }, "host");
      }
    });
    onDisconnect(roomRef).remove();
    return room;
  }

  async joinRoom(code: string, name: string, callbacks: MatchCallbacks) {
    const user = await this.ensureUser();
    const roomsSnapshot = await get(ref(database, "rooms"));
    const rooms = roomsSnapshot.val() as Record<string, Record<string, unknown>> | null;
    const found = Object.entries(rooms || {}).find(([, room]) => room.roomCode === code.toUpperCase() && room.status === "waiting");
    if (!found) throw new Error("Room not found or already active.");
    const [roomId, room] = found;
    await update(ref(database, `rooms/${roomId}`), { guestUid: user.uid, guestName: name, status: "active" });
    const match: MatchRecord = {
      matchId: typeof room.matchId === "string" ? room.matchId : roomId,
      roomCode: code.toUpperCase(),
      hostUid: typeof room.hostUid === "string" ? room.hostUid : "",
      guestUid: user.uid,
      status: "active",
    };
    callbacks.onMatched(match, "guest");
    return match;
  }

  async findRandomMatch(name: string, callbacks: MatchCallbacks) {
    const user = await this.ensureUser();
    this.queueRef = push(ref(database, "matchmaking"));
    const ownQueueId = this.queueRef.key || user.uid;
    await set(this.queueRef, { uid: user.uid, name, createdAt: Date.now(), status: "waiting" });
    onDisconnect(this.queueRef).remove();
    this.queueUnsubscribe = onValue(ref(database, "matchmaking"), async (snapshot) => {
      const entries = snapshot.val() as Record<string, Record<string, unknown>> | null;
      const candidate = Object.entries(entries || {}).find(([id, item]) => id !== ownQueueId && item.uid !== user.uid && item.status === "waiting");
      if (!candidate || !this.queueRef) return;
      const [otherId, other] = candidate;
      const matchId = [ownQueueId, otherId].sort().join("-");
      await update(ref(database, `matchmaking/${ownQueueId}`), { status: "matched", matchId, opponentUid: other.uid });
      await update(ref(database, `matchmaking/${otherId}`), { status: "matched", matchId, opponentUid: user.uid });
    });
    const ownUnsubscribe = onValue(this.queueRef, (snapshot) => {
      const value = snapshot.val() as Record<string, unknown> | null;
      if (value?.status === "matched" && typeof value.matchId === "string") {
        callbacks.onMatched({ matchId: value.matchId, hostUid: user.uid, guestUid: typeof value.opponentUid === "string" ? value.opponentUid : undefined, status: "active" }, "host");
        ownUnsubscribe();
      }
    });
    return () => ownUnsubscribe();
  }

  watchOpponent(matchId: string, opponentUid: string, callbacks: MatchCallbacks) {
    this.matchId = matchId;
    this.playerRef = ref(database, `matches/${matchId}/players/${this.user?.uid || "unknown"}`);
    const opponentRef = ref(database, `matches/${matchId}/players/${opponentUid}`);
    this.opponentUnsubscribe?.();
    this.opponentUnsubscribe = onValue(opponentRef, (snapshot) => callbacks.onOpponent(normalizePlayer(snapshot.val())));
    onDisconnect(this.playerRef).remove();
    return () => this.opponentUnsubscribe?.();
  }

  async publishState(state: Omit<NetworkPlayer, "uid">) {
    if (!this.playerRef || !this.user) return;
    await set(this.playerRef, { ...state, uid: this.user.uid });
  }

  async leave() {
    this.opponentUnsubscribe?.();
    this.queueUnsubscribe?.();
    this.roomUnsubscribe?.();
    if (this.queueRef) await remove(this.queueRef).catch(() => undefined);
    if (this.playerRef) await remove(this.playerRef).catch(() => undefined);
    this.matchId = "";
  }
}
