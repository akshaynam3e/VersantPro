export type GamePhase = "lobby" | "searching" | "room" | "battle" | "result";

export type NetworkPlayer = {
  uid: string;
  name: string;
  health: number;
  prompt: string;
  lastAttackId?: string;
  updatedAt?: number;
};

export type MatchRecord = {
  matchId: string;
  roomCode?: string;
  hostUid: string;
  guestUid?: string;
  status: "waiting" | "active" | "finished";
};

export type MatchCallbacks = {
  onMatched: (match: MatchRecord, role: "host" | "guest") => void;
  onOpponent: (player: NetworkPlayer | null) => void;
  onError: (message: string) => void;
};
