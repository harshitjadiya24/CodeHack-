"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

// The station board as a real object: an enamelled plate on two posts, lit from the upper left.
// Its face is drawn to a 2D canvas with the page's own Anek fonts, so the Devanagari is shaped correctly.

const PLATE_W = 10;
const PLATE_H = 3.2;
const PLATE_D = 0.16;
const POST_H = 0.4;
const YELLOW = "#f2c230";
const INK = "#141414";

type Face = { campus: string; code: string; line: string };

function fontVar(name: string, fallback: string) {
  return getComputedStyle(document.body).getPropertyValue(name).trim() || fallback;
}

function drawFace({ campus, code, line }: Face) {
  const W = 2048;
  const H = Math.round((W * PLATE_H) / PLATE_W);
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  const latin = fontVar("--font-anek", "sans-serif");
  const deva = fontVar("--font-anek-deva", latin);

  g.fillStyle = YELLOW;
  g.fillRect(0, 0, W, H);
  // Black rim, yellow gap, thin keyline: the same frame as the HTML board.
  g.strokeStyle = INK;
  g.lineWidth = 26;
  g.strokeRect(13, 13, W - 26, H - 26);
  g.lineWidth = 9;
  g.strokeRect(52, 52, W - 104, H - 104);

  g.fillStyle = INK;
  g.textBaseline = "alphabetic";
  // Station-board lettering is narrow. Use the font's own width axis where canvas supports it,
  // otherwise compress horizontally by the same amount.
  const ctx = g;
  const probe = (stretch: CanvasFontStretch) => {
    ctx.fontStretch = stretch;
    ctx.font = `800 100px ${latin}`;
    return g.measureText("SAAJHA").width;
  };
  const native = "fontStretch" in ctx && probe("condensed") < probe("normal") * 0.92;
  ctx.fontStretch = native ? "condensed" : "normal";
  const squeeze = native ? 1 : 0.8;
  const text = (s: string, font: string, x: number, y: number, align: CanvasTextAlign = "left") => {
    g.save();
    g.font = font;
    g.textAlign = align;
    g.translate(x, y);
    g.scale(squeeze, 1);
    g.fillText(s, 0, 0);
    g.restore();
  };

  text("साझा", `800 160px ${deva}`, 120, 235);
  text("SAAJHA", `800 340px ${latin}`, 112, 548);
  text(campus, `600 46px ${latin}`, W - 120, 372, "right");
  text(code, `800 128px ${latin}`, W - 116, 482, "right");
  text(line, `600 46px ${latin}`, W - 120, 548, "right");

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/** Keeps the plate filling the canvas width at any aspect ratio. */
function FitCamera() {
  const { camera, size } = useThree();
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    const aspect = size.width / size.height;
    const half = THREE.MathUtils.degToRad(cam.fov / 2);
    const z = (PLATE_W * 1.02) / (2 * Math.tan(half) * aspect);
    cam.position.set(0, -0.19, z);
    cam.lookAt(0, -0.19, 0);
    cam.updateProjectionMatrix();
  }, [camera, size]);
  return null;
}

function Board({ face, onReady }: { face: THREE.Texture; onReady: () => void }) {
  const group = useRef<THREE.Group>(null);
  const t0 = useRef<number | null>(null);
  const ready = useRef(false);
  // The canvas ignores pointer events (it sits over the page), so follow the pointer on the window instead.
  const pointer = useRef({ x: 0, y: 0 });
  useEffect(() => {
    const move = (e: PointerEvent) => {
      pointer.current = { x: (e.clientX / innerWidth) * 2 - 1, y: -((e.clientY / innerHeight) * 2 - 1) };
    };
    addEventListener("pointermove", move, { passive: true });
    return () => removeEventListener("pointermove", move);
  }, []);

  const materials = useMemo(() => {
    const edge = new THREE.MeshStandardMaterial({ color: INK, roughness: 0.5, metalness: 0.2 });
    const front = new THREE.MeshStandardMaterial({ map: face, roughness: 0.42, metalness: 0.05 });
    // Box faces: +x, -x, +y, -y, +z (front), -z.
    return [edge, edge, edge, edge, front, edge];
  }, [face]);

  useFrame(({ clock }) => {
    const g = group.current;
    if (!g) return;
    if (t0.current === null) t0.current = clock.elapsedTime;
    const t = Math.min(1, (clock.elapsedTime - t0.current) / 1.1);
    const ease = 1 - Math.pow(1 - t, 4);
    // Drops in and settles, then follows the pointer a little, like a sign catching the wind.
    g.position.y = (1 - ease) * 0.9;
    const rx = (1 - ease) * -0.35 + -pointer.current.y * 0.06;
    const ry = pointer.current.x * 0.12;
    g.rotation.x += (rx - g.rotation.x) * 0.08;
    g.rotation.y += (ry - g.rotation.y) * 0.06;
    if (!ready.current) {
      ready.current = true;
      onReady();
    }
  });

  return (
    <group ref={group}>
      <mesh material={materials} castShadow>
        <boxGeometry args={[PLATE_W, PLATE_H, PLATE_D]} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * PLATE_W * 0.36, -PLATE_H / 2 - POST_H / 2 + 0.05, -0.12]}>
          <boxGeometry args={[0.16, POST_H, 0.16]} />
          <meshStandardMaterial color="#2b2b28" roughness={0.6} metalness={0.3} />
        </mesh>
      ))}
    </group>
  );
}

export default function Board3D({ campus, code, line, onReady }: Face & { onReady: () => void }) {
  const [face, setFace] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    let cancelled = false;
    void document.fonts.ready.then(() => {
      if (!cancelled) setFace(drawFace({ campus, code, line }));
    });
    return () => {
      cancelled = true;
    };
  }, [campus, code, line]);

  if (!face) return null;
  return (
    <Canvas flat dpr={[1, 2]} camera={{ fov: 28 }} gl={{ antialias: true, alpha: true }} aria-hidden>
      <FitCamera />
      <ambientLight intensity={2.2} />
      <directionalLight position={[-4, 5, 6]} intensity={1.4} />
      <directionalLight position={[5, -2, 4]} intensity={0.5} />
      <Board face={face} onReady={onReady} />
    </Canvas>
  );
}
