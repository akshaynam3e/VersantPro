import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { GlowLayer } from "@babylonjs/core/Layers/glowLayer";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";

export type GameHandle = {
  scene: Scene;
  setPrompt: (prompt: string) => void;
  triggerAttack: (side: "local" | "opponent") => void;
  setLocalHealth: (health: number) => void;
  setOpponentHealth: (health: number) => void;
  dispose: () => void;
};

type Fighter = { root: AbstractMesh; fist: AbstractMesh; baseX: number; color: Color3; attackUntil: number };

function material(scene: Scene, name: string, diffuse: Color3, emissive = diffuse) {
  const mat = new StandardMaterial(name, scene);
  mat.diffuseColor = diffuse;
  mat.emissiveColor = emissive;
  mat.specularColor = Color3.Black();
  return mat;
}

function createFighter(scene: Scene, name: string, x: number, color: Color3): Fighter {
  const root = MeshBuilder.CreateBox(`${name}-root`, { width: 0.1, height: 0.1, depth: 0.1 }, scene);
  root.position = new Vector3(x, 1.2, 0);
  root.isVisible = false;
  const bodyMat = material(scene, `${name}-body`, new Color3(0.035, 0.055, 0.09), color.scale(0.22));
  const glowMat = material(scene, `${name}-glow`, color.scale(0.75), color);
  const head = MeshBuilder.CreateSphere(`${name}-head`, { diameter: 0.52, segments: 16 }, scene);
  head.parent = root; head.position.y = 1.95; head.material = bodyMat;
  const torso = MeshBuilder.CreateCylinder(`${name}-torso`, { height: 1.1, diameterTop: 0.3, diameterBottom: 0.42, tessellation: 10 }, scene);
  torso.parent = root; torso.position.y = 1.32; torso.material = bodyMat;
  const hip = MeshBuilder.CreateCylinder(`${name}-hip`, { height: 0.24, diameter: 0.48, tessellation: 10 }, scene);
  hip.parent = root; hip.position.y = 0.78; hip.material = glowMat;
  const leftArm = MeshBuilder.CreateCylinder(`${name}-arm-l`, { height: 0.82, diameter: 0.11, tessellation: 8 }, scene);
  leftArm.parent = root; leftArm.position = new Vector3(-0.43, 1.35, 0); leftArm.rotation.z = -0.28; leftArm.material = glowMat;
  const rightArm = MeshBuilder.CreateCylinder(`${name}-arm-r`, { height: 0.82, diameter: 0.11, tessellation: 8 }, scene);
  rightArm.parent = root; rightArm.position = new Vector3(0.43, 1.35, 0); rightArm.rotation.z = 0.28; rightArm.material = glowMat;
  const leftLeg = MeshBuilder.CreateCylinder(`${name}-leg-l`, { height: 1.05, diameter: 0.14, tessellation: 8 }, scene);
  leftLeg.parent = root; leftLeg.position = new Vector3(-0.2, 0.2, 0); leftLeg.rotation.z = -0.12; leftLeg.material = bodyMat;
  const rightLeg = MeshBuilder.CreateCylinder(`${name}-leg-r`, { height: 1.05, diameter: 0.14, tessellation: 8 }, scene);
  rightLeg.parent = root; rightLeg.position = new Vector3(0.2, 0.2, 0); rightLeg.rotation.z = 0.12; rightLeg.material = bodyMat;
  const fist = MeshBuilder.CreateSphere(`${name}-fist`, { diameter: 0.22, segments: 10 }, scene);
  fist.parent = root; fist.position = new Vector3(0.78, 1.38, -0.05); fist.material = glowMat;
  return { root, fist, baseX: x, color, attackUntil: 0 };
}

function createGrid(scene: Scene) {
  const gridMat = material(scene, "grid", new Color3(0.02, 0.08, 0.13), new Color3(0.01, 0.035, 0.06));
  const floor = MeshBuilder.CreateGround("arena-floor", { width: 18, height: 6 }, scene);
  floor.position.y = -0.35; floor.material = gridMat;
  for (let x = -9; x <= 9; x += 1) {
    const line = MeshBuilder.CreateLines(`grid-x-${x}`, { points: [new Vector3(x, -0.32, -3), new Vector3(x, -0.32, 3)] }, scene);
    line.color = new Color3(0.06, 0.32, 0.42); line.alpha = 0.3;
  }
  for (let z = -3; z <= 3; z += 1) {
    const line = MeshBuilder.CreateLines(`grid-z-${z}`, { points: [new Vector3(-9, -0.31, z), new Vector3(9, -0.31, z)] }, scene);
    line.color = new Color3(0.12, 0.18, 0.42); line.alpha = 0.32;
  }
  const railMat = material(scene, "rail", new Color3(0.05, 0.18, 0.25), new Color3(0.02, 0.5, 0.65));
  [-8.5, 8.5].forEach((x) => { const rail = MeshBuilder.CreateBox(`rail-${x}`, { width: 0.08, height: 2.2, depth: 0.08 }, scene); rail.position = new Vector3(x, 0.7, 0); rail.material = railMat; });
}

export async function createGameScene(engine: Engine, _canvas: HTMLCanvasElement): Promise<GameHandle> {
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.008, 0.016, 0.04, 1);
  const camera = new FreeCamera("arena-camera", new Vector3(0, 2.7, -18), scene);
  camera.setTarget(new Vector3(0, 1.1, 0));
  camera.fov = 0.62;
  camera.minZ = 0.1;
  new HemisphericLight("arena-light", new Vector3(0, 1, -0.7), scene).intensity = 0.55;
  const glow = new GlowLayer("arena-glow", scene); glow.intensity = 0.7;
  createGrid(scene);
  const local = createFighter(scene, "local", -4.4, new Color3(0.05, 0.9, 1));
  const opponent = createFighter(scene, "opponent", 4.4, new Color3(1, 0.08, 0.48));
  opponent.root.rotation.y = Math.PI;
  const promptOrb = MeshBuilder.CreateTorus("prompt-orb", { diameter: 0.9, thickness: 0.05 }, scene);
  promptOrb.position = new Vector3(0, 2.6, 0.3); promptOrb.rotation.x = Math.PI / 2; promptOrb.material = material(scene, "prompt-orb-mat", new Color3(0.4, 0.9, 1), new Color3(0.12, 0.55, 0.9));
  const promptParticles: Mesh[] = [];
  for (let i = 0; i < 8; i++) { const p = MeshBuilder.CreateSphere(`prompt-particle-${i}`, { diameter: 0.04 }, scene); p.position = new Vector3(Math.cos(i) * 0.72, 2.6 + Math.sin(i) * 0.32, 0.2); p.material = promptOrb.material; promptParticles.push(p); }
  let prompt = "A"; let disposed = false;
  const observer = scene.onBeforeRenderObservable.add(() => {
    if (disposed) return;
    const now = performance.now();
    [local, opponent].forEach((fighter, index) => { const attacking = fighter.attackUntil > now; const direction = index === 0 ? 1 : -1; fighter.fist.position.x = (index === 0 ? 0.78 : -0.78) + (attacking ? direction * 0.42 : 0); fighter.root.position.y = 1.2 + (attacking ? Math.sin((fighter.attackUntil - now) / 80) * 0.05 : 0); });
    promptOrb.rotation.z += 0.012;
    promptParticles.forEach((particle, index) => { const phase = now / 650 + index; particle.position.y = 2.6 + Math.sin(phase) * 0.28; });
  });
  const setPrompt = (value: string) => { prompt = value; promptOrb.scaling.setAll(1.05 + (prompt.charCodeAt(0) % 5) * 0.02); };
  const triggerAttack = (side: "local" | "opponent") => { (side === "local" ? local : opponent).attackUntil = performance.now() + 240; };
  const setHealth = (fighter: Fighter, health: number) => { fighter.root.scaling.x = Math.max(0.6, 0.8 + health / 500); };
  return { scene, setPrompt, triggerAttack, setLocalHealth: (health) => setHealth(local, health), setOpponentHealth: (health) => setHealth(opponent, health), dispose: () => { disposed = true; scene.onBeforeRenderObservable.remove(observer); scene.dispose(); } };
}
