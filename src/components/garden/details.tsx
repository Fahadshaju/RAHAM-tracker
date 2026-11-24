// Zoom-in detail for the two garden moods: a radiant Jannah vs. a burning wasteland.
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { HALF } from "@/lib/garden";

function rng(seed: number) {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}
function spots(n: number, seed: number, r = HALF - 0.6) {
  const rand = rng(seed);
  return Array.from({ length: n }, () => [(rand() * 2 - 1) * r, (rand() * 2 - 1) * r, rand()] as const);
}

/** Drifting particles: fireflies in heaven, embers in hell. */
function Motes({ count, color, rise }: { count: number; color: string; rise: number }) {
  const ref = useRef<THREE.Points>(null);
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const p = new Float32Array(count * 3);
    spots(count, 7).forEach(([x, z, r], i) => p.set([x, r * 4, z], i * 3));
    g.setAttribute("position", new THREE.BufferAttribute(p, 3));
    return g;
  }, [count]);
  useFrame((s, d) => {
    const a = geo.attributes["position"] as THREE.BufferAttribute;
    const t = s.clock.elapsedTime;
    for (let i = 0; i < count; i++) {
      let y = a.getY(i) + Math.min(d, 0.05) * rise;
      if (y > 4.5) y = 0.1;
      a.setY(i, y);
      a.setX(i, a.getX(i) + Math.sin(t + i) * 0.002);
    }
    a.needsUpdate = true;
  });
  return (
    <points ref={ref} geometry={geo}>
      <pointsMaterial color={color} size={0.09} transparent opacity={0.95} depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  );
}

function Lantern({ p }: { p: [number, number, number] }) {
  const m = useRef<THREE.MeshStandardMaterial>(null);
  useFrame((s) => m.current && (m.current.emissiveIntensity = 2 + Math.sin(s.clock.elapsedTime * 2 + p[0]) * 0.6));
  return (
    <group position={p}>
      <mesh position={[0, 0.45, 0]}><cylinderGeometry args={[0.025, 0.035, 0.9]} /><meshStandardMaterial color="#d8b25a" metalness={0.8} roughness={0.3} /></mesh>
      <mesh position={[0, 0.98, 0]}><octahedronGeometry args={[0.11]} /><meshStandardMaterial ref={m} color="#ffe6a0" emissive="#ffc95a" emissiveIntensity={2} /></mesh>
    </group>
  );
}

function Gate() {
  return (
    <group position={[0, 0, HALF - 0.5]}>
      {[-0.9, 0.9].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <mesh position={[0, 1.1, 0]} castShadow><cylinderGeometry args={[0.13, 0.16, 2.2, 12]} /><meshStandardMaterial color="#f4efe6" roughness={0.35} /></mesh>
          <mesh position={[0, 2.35, 0]}><sphereGeometry args={[0.2, 16, 12]} /><meshStandardMaterial color="#e8c46a" metalness={0.9} roughness={0.2} /></mesh>
        </group>
      ))}
      <mesh position={[0, 2.2, 0]} rotation-z={Math.PI / 2}><torusGeometry args={[0.9, 0.08, 10, 32, Math.PI]} /><meshStandardMaterial color="#e8c46a" metalness={0.9} roughness={0.2} emissive="#7a5a10" /></mesh>
      <mesh position={[0, 1.2, 0]}><planeGeometry args={[1.6, 2.2]} /><meshBasicMaterial color="#fff3c8" transparent opacity={0.18} side={THREE.DoubleSide} depthWrite={false} /></mesh>
    </group>
  );
}

function Dome({ p, s }: { p: [number, number, number]; s: number }) {
  return (
    <group position={p} scale={s}>
      <mesh position={[0, 0.4, 0]} castShadow><cylinderGeometry args={[0.45, 0.5, 0.8, 8]} /><meshStandardMaterial color="#f2ede4" roughness={0.4} /></mesh>
      <mesh position={[0, 0.8, 0]}><sphereGeometry args={[0.46, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#8a7cf0" metalness={0.4} roughness={0.25} emissive="#2a1d70" /></mesh>
      <mesh position={[0, 1.35, 0]}><coneGeometry args={[0.05, 0.25, 6]} /><meshStandardMaterial color="#e8c46a" metalness={0.9} /></mesh>
      <mesh position={[0.62, 0.9, 0]}><cylinderGeometry args={[0.06, 0.07, 1.8, 8]} /><meshStandardMaterial color="#f2ede4" /></mesh>
      <mesh position={[0.62, 1.88, 0]}><coneGeometry args={[0.08, 0.3, 8]} /><meshStandardMaterial color="#e8c46a" metalness={0.9} /></mesh>
    </group>
  );
}

function FruitBushes() {
  return (
    <>
      {spots(10, 31).map(([x, z, r], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 0.25, 0]} castShadow><icosahedronGeometry args={[0.28 + r * 0.1, 1]} /><meshStandardMaterial color="#2f8a4a" roughness={0.8} flatShading /></mesh>
          {[0, 1, 2, 3].map((k) => (
            <mesh key={k} position={[Math.cos(k * 1.6) * 0.25, 0.3 + (k % 2) * 0.12, Math.sin(k * 1.6) * 0.25]}>
              <sphereGeometry args={[0.05, 8, 6]} /><meshStandardMaterial color={k % 2 ? "#ff5a6a" : "#ffd24a"} emissive={k % 2 ? "#5a0010" : "#5a3a00"} />
            </mesh>
          ))}
        </group>
      ))}
    </>
  );
}

function Lotus() {
  return (
    <>
      {spots(9, 53, HALF - 1).map(([x, z], i) => (
        <group key={i} position={[x, 0.03, z * 0.3]}>
          <mesh rotation-x={-Math.PI / 2}><circleGeometry args={[0.16, 14]} /><meshStandardMaterial color="#3fa86a" /></mesh>
          <mesh position={[0, 0.05, 0]}><coneGeometry args={[0.07, 0.12, 6]} /><meshStandardMaterial color="#ffd6ef" emissive="#a0407a" emissiveIntensity={0.5} /></mesh>
        </group>
      ))}
    </>
  );
}

function LightPillar() {
  const m = useRef<THREE.MeshBasicMaterial>(null);
  useFrame((s) => m.current && (m.current.opacity = 0.22 + Math.sin(s.clock.elapsedTime) * 0.08));
  return (
    <group>
      <mesh position={[0, 7, 0]}><cylinderGeometry args={[0.5, 1.1, 14, 24, 1, true]} /><meshBasicMaterial ref={m} color="#fff2c0" transparent opacity={0.25} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} /></mesh>
      <mesh position={[0, 4.2, 0]} rotation-x={Math.PI / 2}><torusGeometry args={[1.4, 0.04, 8, 48]} /><meshStandardMaterial color="#e8c46a" emissive="#c89a2a" emissiveIntensity={1.5} metalness={0.9} /></mesh>
    </group>
  );
}

/** Tier 0–5, unlocked by the prayer streak: each tier adds new things to find. */
export function HeavenDetails({ tier }: { tier: number }) {
  return (
    <group>
      <Lotus />
      {spots(4 + tier * 3, 19).map(([x, z], i) => <Lantern key={i} p={[x, 0, z]} />)}
      {tier >= 1 && <Gate />}
      {tier >= 2 && <FruitBushes />}
      {tier >= 3 && <Dome p={[-HALF + 1.3, 0, -HALF + 1.3]} s={1.2} />}
      {tier >= 4 && <Dome p={[HALF - 1.2, 0, -HALF + 1.6]} s={0.8} />}
      {tier >= 5 && <LightPillar />}
      <Motes count={40 + tier * 40} color="#fff0a8" rise={0.25} />
      <pointLight position={[0, 3, 0]} intensity={3 + tier * 1.5} distance={14} color="#ffe2a0" />
    </group>
  );
}

function FirePit({ p }: { p: [number, number, number] }) {
  const flame = useRef<THREE.Mesh>(null);
  const light = useRef<THREE.PointLight>(null);
  useFrame((s) => {
    const t = s.clock.elapsedTime * 8 + p[0] * 3;
    const f = 1 + Math.sin(t) * 0.15 + Math.sin(t * 2.3) * 0.1;
    flame.current?.scale.set(1, f, 1);
    if (light.current) light.current.intensity = 3 * f;
  });
  return (
    <group position={p}>
      {[0, 1, 2, 3, 4, 5].map((k) => (
        <mesh key={k} position={[Math.cos(k) * 0.32, 0.08, Math.sin(k) * 0.32]}><dodecahedronGeometry args={[0.12]} /><meshStandardMaterial color="#1a1212" roughness={1} flatShading /></mesh>
      ))}
      <mesh ref={flame} position={[0, 0.35, 0]}><coneGeometry args={[0.22, 0.7, 8]} /><meshBasicMaterial color="#ff5a14" transparent opacity={0.9} /></mesh>
      <mesh position={[0, 0.25, 0]}><coneGeometry args={[0.12, 0.4, 8]} /><meshBasicMaterial color="#ffd04a" /></mesh>
      <pointLight ref={light} position={[0, 0.6, 0]} color="#ff4a10" distance={4} intensity={3} />
    </group>
  );
}

function LavaCracks() {
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: "#ff3a0a" }), []);
  useFrame((s) => mat.color.setHSL(0.03, 1, 0.45 + Math.sin(s.clock.elapsedTime * 1.5) * 0.08));
  return (
    <>
      {spots(14, 71).map(([x, z, r], i) => (
        <mesh key={i} material={mat} position={[x, 0.012, z]} rotation={[-Math.PI / 2, 0, r * Math.PI]}>
          <planeGeometry args={[0.9 + r * 1.4, 0.06 + r * 0.05]} />
        </mesh>
      ))}
    </>
  );
}

function Spikes() {
  return (
    <>
      {spots(16, 89).map(([x, z, r], i) => (
        <mesh key={i} position={[x, 0.3 + r * 0.4, z]} rotation={[r * 0.4, r * 3, (r - 0.5) * 0.5]} castShadow>
          <coneGeometry args={[0.12 + r * 0.12, 0.7 + r * 0.9, 5]} /><meshStandardMaterial color="#231718" roughness={1} flatShading />
        </mesh>
      ))}
    </>
  );
}

function BrokenPillars() {
  return (
    <>
      {([[-HALF + 1.3, -HALF + 1.3, 0.3], [HALF - 1.4, -HALF + 1.8, -0.5], [0, HALF - 0.6, 0.2]] as [number, number, number][]).map(([x, z, tilt], i) => (
        <group key={i} position={[x, 0, z]} rotation-z={tilt}>
          <mesh position={[0, 0.5, 0]} castShadow><cylinderGeometry args={[0.15, 0.18, 1 + i * 0.3, 8]} /><meshStandardMaterial color="#3a2a2a" roughness={1} flatShading /></mesh>
          <mesh position={[0.4, 0.08, 0.2]} rotation-z={1.4}><cylinderGeometry args={[0.15, 0.15, 0.6, 8]} /><meshStandardMaterial color="#2e2222" flatShading /></mesh>
        </group>
      ))}
    </>
  );
}

function Smoke() {
  const g = useRef<THREE.Group>(null);
  useFrame((s) => {
    g.current?.children.forEach((c, i) => {
      c.position.y = ((s.clock.elapsedTime * 0.4 + i * 0.7) % 4) + 0.5;
      c.scale.setScalar(0.4 + c.position.y * 0.25);
    });
  });
  return (
    <group ref={g}>
      {spots(10, 101).map(([x, z], i) => (
        <mesh key={i} position={[x, 1, z]}><sphereGeometry args={[0.5, 10, 8]} /><meshStandardMaterial color="#2a2222" transparent opacity={0.35} depthWrite={false} /></mesh>
      ))}
    </group>
  );
}

/** Depth 1–4: consecutive negative days make the wasteland burn deeper. */
export function HellDetails({ depth }: { depth: number }) {
  return (
    <group>
      <LavaCracks />
      <Smoke />
      {depth >= 2 && spots(2 + depth, 113, HALF - 1.2).map(([x, z], i) => <FirePit key={i} p={[x, 0, z]} />)}
      {depth >= 3 && <Spikes />}
      {depth >= 3 && <BrokenPillars />}
      {depth >= 4 && <mesh position={[0, 0.02, 0]} rotation-x={-Math.PI / 2}><circleGeometry args={[1.6, 32]} /><meshBasicMaterial color="#ff4a0a" /></mesh>}
      <Motes count={60 + depth * 50} color="#ff6a1a" rise={1.2} />
      <pointLight position={[0, 1, 0]} intensity={4 + depth * 2} distance={16} color="#ff2a00" />
    </group>
  );
}
