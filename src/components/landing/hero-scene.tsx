"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, Edges, RoundedBox } from "@react-three/drei";
import * as THREE from "three";

// A low-poly lab shelf: 3D printer, oscilloscope and camera on a turntable, and a passport
// reader whose three pins rise one by one — Saajha's eligibility check as an object.

const PAPER = "#f4f7fc";
const STEEL = "#c9d6ec";
const INK = "#0b2e6f";
const STAMP = "#ff5a1f";

function Part({ size, position, color = PAPER, radius = 0.04 }: { size: [number, number, number]; position: [number, number, number]; color?: string; radius?: number }) {
  return (
    <RoundedBox args={size} radius={radius} smoothness={3} position={position} castShadow receiveShadow>
      <meshStandardMaterial color={color} roughness={0.75} metalness={0.05} />
      <Edges threshold={20} color={INK} lineWidth={1} />
    </RoundedBox>
  );
}

function Printer() {
  const head = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (head.current) head.current.position.x = Math.sin(clock.elapsedTime * 1.4) * 0.32;
  });
  return (
    <group position={[-1.05, 0.12, -0.15]}>
      <Part size={[1.1, 0.12, 0.9]} position={[0, 0, 0]} color={STEEL} />
      {[-0.48, 0.48].map((x) => (
        <Part key={x} size={[0.08, 1.05, 0.08]} position={[x, 0.58, -0.36]} />
      ))}
      <Part size={[1.04, 0.08, 0.1]} position={[0, 1.08, -0.36]} />
      <group ref={head} position={[0, 0.94, -0.28]}>
        <Part size={[0.22, 0.2, 0.2]} position={[0, 0, 0]} color={PAPER} />
        <mesh position={[0, -0.16, 0]}>
          <coneGeometry args={[0.04, 0.1, 12]} />
          <meshStandardMaterial color={INK} />
        </mesh>
      </group>
      <Part size={[0.7, 0.04, 0.6]} position={[0, 0.08, 0.05]} color="#ffffff" radius={0.02} />
      <Part size={[0.28, 0.22, 0.26]} position={[0, 0.21, 0.08]} color={STAMP} radius={0.03} />
    </group>
  );
}

function Scope() {
  const trace = useMemo(() => {
    const pts = Array.from({ length: 60 }, (_, i) => new THREE.Vector3(-0.3 + (i / 59) * 0.6, Math.sin(i / 4.5) * 0.09, 0));
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, []);
  return (
    <group position={[0.35, 0.12, -0.35]}>
      <Part size={[0.95, 0.62, 0.55]} position={[0, 0.31, 0]} />
      <mesh position={[-0.12, 0.36, 0.28]}>
        <planeGeometry args={[0.62, 0.38]} />
        <meshStandardMaterial color={INK} roughness={0.4} />
      </mesh>
      <primitive object={new THREE.Line(trace, new THREE.LineBasicMaterial({ color: "#7dd3fc" }))} position={[-0.12, 0.36, 0.285]} />
      {[0.12, 0.26, 0.4].map((y) => (
        <mesh key={y} position={[0.34, y, 0.29]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.045, 0.045, 0.05, 20]} />
          <meshStandardMaterial color={STEEL} />
        </mesh>
      ))}
    </group>
  );
}

function Camera() {
  return (
    <group position={[0.55, 0.12, 0.55]} rotation={[0, -0.5, 0]}>
      <Part size={[0.5, 0.32, 0.22]} position={[0, 0.16, 0]} color={INK} radius={0.05} />
      <mesh position={[0.02, 0.15, 0.17]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.11, 0.12, 0.18, 32]} />
        <meshStandardMaterial color="#2b3550" roughness={0.3} metalness={0.3} />
      </mesh>
      <mesh position={[0.02, 0.15, 0.265]}>
        <circleGeometry args={[0.08, 32]} />
        <meshStandardMaterial color="#3b82f6" roughness={0.1} metalness={0.6} />
      </mesh>
    </group>
  );
}

/** Three pins rise in turn: identity, induction badge, good standing. All up = approved. */
function Reader({ still }: { still: boolean }) {
  const pins = useRef<(THREE.Mesh | null)[]>([]);
  const glow = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(({ clock }) => {
    const t = still ? 2.4 : clock.elapsedTime % 6;
    pins.current.forEach((pin, i) => {
      if (!pin) return;
      const up = THREE.MathUtils.smoothstep(t, 0.6 + i * 0.5, 1.0 + i * 0.5) * (1 - THREE.MathUtils.smoothstep(t, 4.8, 5.4));
      pin.position.y = 0.2 + up * 0.16;
      (pin.material as THREE.MeshStandardMaterial).emissiveIntensity = up * 0.9;
    });
    if (glow.current) {
      const all = THREE.MathUtils.smoothstep(t, 2.0, 2.4) * (1 - THREE.MathUtils.smoothstep(t, 4.8, 5.4));
      glow.current.emissiveIntensity = all * 1.2;
    }
  });
  return (
    <group position={[-0.95, 0.12, 0.85]}>
      <Part size={[0.9, 0.22, 0.42]} position={[0, 0.11, 0]} />
      {[-0.25, 0, 0.25].map((x, i) => (
        <mesh key={x} ref={(m) => { pins.current[i] = m; }} position={[x, 0.2, 0]} castShadow>
          <cylinderGeometry args={[0.055, 0.055, 0.22, 24]} />
          <meshStandardMaterial color={STAMP} emissive={STAMP} emissiveIntensity={0} roughness={0.4} />
        </mesh>
      ))}
      <mesh position={[0.38, 0.225, 0.12]}>
        <sphereGeometry args={[0.035, 16, 16]} />
        <meshStandardMaterial ref={glow} color="#ffffff" emissive="#ff5a1f" emissiveIntensity={0} />
      </mesh>
      {/* passport card in the slot */}
      <Part size={[0.32, 0.015, 0.22]} position={[0.62, 0.17, 0]} color="#ffffff" radius={0.008} />
    </group>
  );
}

function Shelf({ still }: { still: boolean }) {
  const group = useRef<THREE.Group>(null);
  useFrame(({ clock, pointer }) => {
    if (!group.current) return;
    const idle = still ? 0 : Math.sin(clock.elapsedTime * 0.25) * 0.18;
    group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, -0.55 + idle + pointer.x * 0.25, 0.05);
    group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, pointer.y * -0.06, 0.05);
  });
  return (
    <group ref={group}>
      <mesh position={[0, -0.02, 0]} receiveShadow>
        <cylinderGeometry args={[1.75, 1.8, 0.16, 96]} />
        <meshStandardMaterial color="#dbe6f7" roughness={0.9} transparent opacity={0.92} />
        <Edges threshold={30} color="#ffffff" />
      </mesh>
      <Printer />
      <Scope />
      <Camera />
      <Reader still={still} />
    </group>
  );
}

export default function HeroScene({ still = false }: { still?: boolean }) {
  return (
    <Canvas
      shadows
      dpr={[1, 1.5]}
      frameloop={still ? "demand" : "always"}
      camera={{ position: [4.6, 3.5, 4.9], fov: 30 }}
      gl={{ antialias: true, alpha: true }}
      aria-hidden
    >
      <ambientLight intensity={0.9} />
      <directionalLight position={[3, 5, 2]} intensity={1.6} castShadow shadow-mapSize={[1024, 1024]} />
      <directionalLight position={[-4, 2, -2]} intensity={0.35} color="#c9d4ff" />
      <group position={[0, -0.45, 0]}>
        <Shelf still={still} />
        <ContactShadows position={[0, -0.11, 0]} color="#031033" opacity={0.55} scale={6} blur={2.6} far={2} />
      </group>
    </Canvas>
  );
}
