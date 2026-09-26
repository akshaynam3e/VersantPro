import { useCallback, useEffect, useRef, useState } from "react";
import { Engine } from "@babylonjs/core/Engines/engine";
import { createGameScene, type GameHandle } from "@/game/scene";
import { FirebaseMatchClient } from "@/game/firebaseAdapter";
import type { GamePhase, MatchRecord, NetworkPlayer } from "@/game/types";

const LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ".split("");
const ARENA_TEXTURE = "/assets/versantpro-arena-texture.png";
const DEMO_SEQUENCE = ["K", "R", "M", "T", "X", "B", "Q", "L", "A", "N"];

function nextLetter(current: string) {
  let value = LETTERS[Math.floor(Math.random() * LETTERS.length)];
  while (value === current) value = LETTERS[Math.floor(Math.random() * LETTERS.length)];
  return value;
}

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const startedRef = useRef(false);
  const sceneRef = useRef<GameHandle | null>(null);
  const clientRef = useRef<FirebaseMatchClient | null>(null);
  const matchRef = useRef<MatchRecord | null>(null);
  const roleRef = useRef<"host" | "guest" | null>(null);
  const opponentAttackRef = useRef("");
  const demoRef = useRef(new URLSearchParams(window.location.search).has("demo"));
  const [phase, setPhase] = useState<GamePhase>(demoRef.current ? "battle" : "lobby");
  const [name, setName] = useState("Player One");
  const [roomCodeInput, setRoomCodeInput] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [prompt, setPrompt] = useState(demoRef.current ? DEMO_SEQUENCE[0] : "A");
  const [localHealth, setLocalHealth] = useState(100);
  const [opponentHealth, setOpponentHealth] = useState(100);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [countdown, setCountdown] = useState(demoRef.current ? 0 : 3);
  const [status, setStatus] = useState(demoRef.current ? "Demo arena active" : "Choose a match mode to enter the arena.");
  const [error, setError] = useState("");
  const [opponentName, setOpponentName] = useState("Rival Unit");
  const [lastEvent, setLastEvent] = useState("Awaiting input");
  const [matchId, setMatchId] = useState("");

  const publish = useCallback(async (attackId?: string) => {
    const client = clientRef.current;
    const userName = name.trim() || "Player One";
    if (!client || !matchRef.current) return;
    await client.publishState({ name: userName, health: localHealth, prompt, lastAttackId: attackId, updatedAt: Date.now() }).catch(() => undefined);
  }, [localHealth, name, prompt]);

  const beginBattle = useCallback((nextPhase: "battle" = "battle") => {
    setError("");
    setPhase(nextPhase);
    setCountdown(3);
    let value = 3;
    const timer = window.setInterval(() => {
      value -= 1;
      setCountdown(value);
      if (value <= 0) window.clearInterval(timer);
    }, 700);
  }, []);

  const handleMatched = useCallback((match: MatchRecord, role: "host" | "guest") => {
    matchRef.current = match;
    roleRef.current = role;
    setMatchId(match.matchId);
    setRoomCode(match.roomCode || "");
    setStatus("Opponent found. Lock in your first input.");
    beginBattle();
  }, [beginBattle]);

  const handleOpponent = useCallback((player: NetworkPlayer | null) => {
    if (!player) return;
    setOpponentName(player.name || "Rival Unit");
    setOpponentHealth(Math.max(0, Math.min(100, player.health)));
    if (player.lastAttackId && player.lastAttackId !== opponentAttackRef.current) {
      opponentAttackRef.current = player.lastAttackId;
      sceneRef.current?.triggerAttack("opponent");
      setLocalHealth((health) => Math.max(0, health - 8));
      setLastEvent("Rival strike detected · brace for the next prompt");
    }
  }, []);

  const handleNetworkError = useCallback((message: string) => {
    setError(message);
    setStatus("Offline practice is still available.");
    setPhase("lobby");
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || startedRef.current) return;
    startedRef.current = true;
    const engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true, adaptToDeviceRatio: true });
    let handle: GameHandle | null = null;
    createGameScene(engine, canvas).then((created) => {
      handle = created;
      sceneRef.current = created;
      engine.runRenderLoop(() => created.scene.render());
      created.setPrompt(prompt);
    });
    const onResize = () => engine.resize();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      handle?.dispose();
      sceneRef.current = null;
      engine.dispose();
      startedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const client = new FirebaseMatchClient();
    clientRef.current = client;
    return () => { client.leave().catch(() => undefined); };
  }, []);

  useEffect(() => {
    sceneRef.current?.setPrompt(prompt);
    sceneRef.current?.setLocalHealth(localHealth);
    sceneRef.current?.setOpponentHealth(opponentHealth);
  }, [localHealth, opponentHealth, prompt]);

  useEffect(() => {
    if (!matchRef.current || !clientRef.current || !matchRef.current.guestUid) return;
    const opponentUid = roleRef.current === "host" ? matchRef.current.guestUid : matchRef.current.hostUid;
    return clientRef.current.watchOpponent(matchRef.current.matchId, opponentUid, { onMatched: handleMatched, onOpponent: handleOpponent, onError: handleNetworkError });
  }, [handleMatched, handleNetworkError, handleOpponent, matchId]);

  useEffect(() => {
    if (phase !== "battle" || countdown > 0) return;
    const promptTimer = window.setInterval(() => {
      setPrompt((current) => demoRef.current ? DEMO_SEQUENCE[(DEMO_SEQUENCE.indexOf(current) + 1) % DEMO_SEQUENCE.length] : nextLetter(current));
    }, demoRef.current ? 620 : 820);
    const rivalTimer = window.setInterval(() => {
      if (demoRef.current) {
        sceneRef.current?.triggerAttack("opponent");
        setLocalHealth((health) => Math.max(0, health - 5));
        setLastEvent("Rival attack · keep your focus");
      }
    }, 1800);
    return () => { window.clearInterval(promptTimer); window.clearInterval(rivalTimer); };
  }, [countdown, phase]);

  useEffect(() => {
    if (localHealth <= 0 || opponentHealth <= 0) setPhase("result");
  }, [localHealth, opponentHealth]);

  const triggerInput = useCallback((letter: string) => {
    if (phase !== "battle" || countdown > 0) return;
    const key = letter.toUpperCase();
    if (key === prompt) {
      const attackId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      sceneRef.current?.triggerAttack("local");
      setOpponentHealth((health) => Math.max(0, health - 10));
      setScore((value) => value + 100);
      setCombo((value) => value + 1);
      setLastEvent(`Perfect reaction · ${key} connected`);
      setPrompt(demoRef.current ? DEMO_SEQUENCE[(DEMO_SEQUENCE.indexOf(key) + 1) % DEMO_SEQUENCE.length] : nextLetter(key));
      if (!demoRef.current) publish(attackId);
    } else {
      setCombo(0);
      setLastEvent(`Missed input · expected ${prompt}`);
    }
  }, [countdown, phase, prompt, publish]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.length === 1 && /^[a-z]$/i.test(event.key)) {
        event.preventDefault();
        triggerInput(event.key);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [triggerInput]);

  useEffect(() => { if (!demoRef.current && phase === "battle" && countdown === 0) publish(); }, [countdown, phase, publish]);

  const startRandom = async () => {
    setError(""); setPhase("searching"); setStatus("Searching for another reaction pilot…");
    try { await clientRef.current?.findRandomMatch(name.trim() || "Player One", { onMatched: handleMatched, onOpponent: handleOpponent, onError: handleNetworkError }); }
    catch (e) { handleNetworkError(e instanceof Error ? e.message : "Firebase matchmaking is unavailable."); }
  };
  const createRoom = async () => {
    setError(""); setStatus("Creating a private room…");
    try { const room = await clientRef.current?.createRoom(name.trim() || "Player One", { onMatched: handleMatched, onOpponent: handleOpponent, onError: handleNetworkError }); if (room) { setRoomCode(room.roomCode || ""); setPhase("room"); setStatus("Share the room code with your opponent."); } }
    catch (e) { handleNetworkError(e instanceof Error ? e.message : "Could not create a room."); }
  };
  const joinRoom = async () => {
    setError(""); setStatus("Joining private room…");
    try { const room = await clientRef.current?.joinRoom(roomCodeInput.trim(), name.trim() || "Player One", { onMatched: handleMatched, onOpponent: handleOpponent, onError: handleNetworkError }); if (room) handleMatched(room, "guest"); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not join that room."); setStatus("Check the code and try again."); }
  };
  const startDemo = () => { demoRef.current = true; setLocalHealth(100); setOpponentHealth(100); setScore(0); setCombo(0); setPrompt(DEMO_SEQUENCE[0]); setLastEvent("Demo pilot ready"); beginBattle(); };
  const reset = () => { clientRef.current?.leave().catch(() => undefined); matchRef.current = null; setMatchId(""); setPhase("lobby"); setRoomCode(""); setCountdown(0); setLocalHealth(100); setOpponentHealth(100); setScore(0); setCombo(0); setPrompt("A"); setStatus("Choose a match mode to enter the arena."); setError(""); };

  return <div className="game-shell" style={{ backgroundImage: `linear-gradient(180deg, rgba(5,11,28,.12), rgba(5,11,28,.85)), url(${ARENA_TEXTURE})` }}>
    <canvas ref={canvasRef} className="game-canvas" />
    <div className="scanlines" />
    <header className="game-header">
      <div className="brand-lockup"><div className="brand-mark">V</div><div><div className="brand-name">VERSANT<span>PRO</span></div><div className="brand-kicker">REACTION COMBAT // ONLINE ARENA</div></div></div>
      <div className="header-readout"><span className="live-dot" /> {phase === "battle" ? "LIVE MATCH" : "SYSTEM READY"}<span className="header-id">{matchId ? `MATCH ${matchId.slice(0, 8).toUpperCase()}` : "BUILD 0.1"}</span></div>
    </header>

    <main className="game-content">
      {phase === "lobby" || phase === "searching" || phase === "room" ? <section className="lobby-grid">
        <div className="lobby-copy"><div className="eyebrow">TYPE // REACT // STRIKE</div><h1>Own the <em>moment.</em></h1><p className="hero-line">A reaction-driven duel where every correct letter becomes a hit. Read the prompt. Find your timing. Take the round.</p><div className="mini-stats"><div><b>01</b><span>INPUT WINDOW</span></div><div><b>1v1</b><span>LIVE DUEL</span></div><div><b>A–Z</b><span>COMBAT KEYS</span></div></div></div>
        <div className="lobby-card"><div className="card-eyebrow">MATCH CONTROL</div><h2>{phase === "searching" ? "Finding your rival" : phase === "room" ? "Private room ready" : "Enter the arena"}</h2><p className="card-copy">{phase === "searching" ? "Your signal is visible to nearby pilots. Stay ready." : phase === "room" ? "Send this code to another player. The fight begins when they connect." : "Choose a mode. Your prompt stream stays private."}</p>
          <label className="field-label">CALLSIGN<input value={name} onChange={(e) => setName(e.target.value)} maxLength={20} /></label>
          {phase === "room" ? <div className="room-code"><span>ROOM CODE</span><strong>{roomCode || "-----"}</strong></div> : <><button className="primary-cta" onClick={startRandom} disabled={phase === "searching"}><span>{phase === "searching" ? "SCANNING SIGNALS…" : "FIND RANDOM MATCH"}</span><b>↗</b></button><div className="split-actions"><button onClick={createRoom}>CREATE ROOM</button><div className="join-wrap"><input value={roomCodeInput} onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())} placeholder="CODE" maxLength={5} /><button onClick={joinRoom}>JOIN</button></div></div></>}
          {phase === "searching" && <button className="text-button" onClick={reset}>Cancel search</button>}{phase === "room" && <button className="text-button" onClick={reset}>Leave room</button>}
          <div className="demo-row"><span>Need a quick look?</span><button onClick={startDemo}>Launch demo duel →</button></div>{error && <div className="error-banner">{error}</div>}<div className="status-line"><span className="status-dot" />{status}</div></div>
      </section> : <section className="battle-wrap">
        <div className="battle-top"><div className="fighter-readout"><span className="player-tag cyan">YOU</span><strong>{name || "PLAYER ONE"}</strong><div className="health-track"><div className="health-fill cyan-fill" style={{ width: `${localHealth}%` }} /></div><span className="health-number">{localHealth}</span></div><div className="round-chip"><span>ROUND 01</span><b>{countdown > 0 ? `0${countdown}` : "VS"}</b></div><div className="fighter-readout opponent"><span className="player-tag pink">RIVAL</span><strong>{opponentName}</strong><div className="health-track"><div className="health-fill pink-fill" style={{ width: `${opponentHealth}%` }} /></div><span className="health-number">{opponentHealth}</span></div></div>
        <div className="prompt-stage"><div className="prompt-halo" /><div className="prompt-label">{countdown > 0 ? "GET READY" : "PRESS THE MATCHING KEY"}</div><div className="prompt-letter">{countdown > 0 ? countdown : prompt}</div><div className="prompt-sub">{lastEvent}</div></div>
        <div className="battle-bottom"><div><span className="score-label">SCORE</span><strong>{String(score).padStart(5, "0")}</strong></div><div className="combo"><span>COMBO</span><b>{String(combo).padStart(2, "0")}</b><i>×</i></div><div className="keys-hint">KEYBOARD INPUT <span>A–Z</span></div></div>
      </section>}
      {phase === "result" && <div className="result-overlay"><div className="result-card"><div className="eyebrow">MATCH COMPLETE</div><h2>{opponentHealth <= 0 ? "ROUND WON" : "ROUND LOST"}</h2><p>{opponentHealth <= 0 ? "Your reaction speed broke through the rival's guard." : "The rival found the opening. Reset and run it back."}</p><div className="result-score">{String(score).padStart(5, "0")} <span>FINAL SCORE</span></div><button className="primary-cta" onClick={reset}><span>RETURN TO LOBBY</span><b>↗</b></button></div></div>}
    </main>
    <footer className="game-footer"><span>VERSANTPRO // STICKMAN FIGHT</span><span>Use A–Z to attack · Wrong keys do nothing</span><span>Firebase-ready networking</span></footer>
  </div>;
}
