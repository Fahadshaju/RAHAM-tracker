// Zoom-in detail for the two garden moods: a radiant Jannah vs. a burning wasteland.
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
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

function Lanterns({ count }: { count: number }) {
  const posts = useRef<THREE.InstancedMesh>(null);
  const lights = useRef<THREE.InstancedMesh>(null);
  useEffect(() => {
    const post = posts.current, light = lights.current;
    if (!post || !light) return;
    const object = new THREE.Object3D();
    spots(count, 19).forEach(([x, z], i) => {
      object.position.set(x, 0.45, z);
      object.updateMatrix();
      post.setMatrixAt(i, object.matrix);
      object.position.y = 0.98;
      object.updateMatrix();
      light.setMatrixAt(i, object.matrix);
    });
    post.instanceMatrix.needsUpdate = light.instanceMatrix.needsUpdate = true;
  }, [count]);
  return (
    <group>
      <instancedMesh ref={posts} args={[undefined, undefined, count]}><cylinderGeometry args={[0.025, 0.035, 0.9, 6]} /><meshStandardMaterial color="#d8b25a" metalness={0.8} roughness={0.3} /></instancedMesh>
      <instancedMesh ref={lights} args={[undefined, undefined, count]}><octahedronGeometry args={[0.11]} /><meshStandardMaterial color="#ffe6a0" emissive="#ffc95a" emissiveIntensity={2} /></instancedMesh>
    </group>
  );
}

/** Repeating geometric inlays: a single draw call even at the full ten-year stage. */
function Inlays({ count, color }: { count: number; color: THREE.Color }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  useEffect(() => {
    const m = mesh.current;
    if (!m) return;
    const object = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
      const side = i % 4, along = -HALF + 0.4 + Math.floor(i / 4) / Math.max(1, count / 4 - 1) * (HALF * 2 - 0.8);
      object.position.set(side < 2 ? along : (side === 2 ? -1 : 1) * (HALF - 0.15), 0.035, side >= 2 ? along : (side === 0 ? -1 : 1) * (HALF - 0.15));
      object.rotation.set(-Math.PI / 2, 0, Math.PI / 4);
      object.updateMatrix();
      m.setMatrixAt(i, object.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  }, [count]);
  return <instancedMesh name="garden-inlays" ref={mesh} args={[undefined, undefined, count]}><ringGeometry args={[0.09, 0.13, 4]} /><meshStandardMaterial color={color} metalness={0.7} roughness={0.3} /></instancedMesh>;
}

function Arcades({ color }: { color: THREE.Color }) {
  const arches = useRef<THREE.InstancedMesh>(null);
  const columns = useRef<THREE.InstancedMesh>(null);
  useEffect(() => {
    const a = arches.current, c = columns.current;
    if (!a || !c) return;
    const object = new THREE.Object3D();
    for (let i = 0; i < 10; i++) {
      const x = -4 + (i % 5) * 2, z = i < 5 ? -5.5 : 5.5;
      object.position.set(x, 1.35, z);
      object.rotation.set(0, 0, 0);
      object.updateMatrix();
      a.setMatrixAt(i, object.matrix);
      for (let j = 0; j < 2; j++) {
        object.position.set(x + (j ? 0.7 : -0.7), 0.65, z);
        object.updateMatrix();
        c.setMatrixAt(i * 2 + j, object.matrix);
      }
    }
    a.instanceMatrix.needsUpdate = c.instanceMatrix.needsUpdate = true;
  }, []);
  return <group name="garden-arcades"><instancedMesh ref={arches} args={[undefined, undefined, 10]}><torusGeometry args={[0.7, 0.055, 6, 16, Math.PI]} /><meshStandardMaterial color={color} roughness={0.35} /></instancedMesh><instancedMesh ref={columns} args={[undefined, undefined, 20]}><cylinderGeometry args={[0.065, 0.085, 1.3, 6]} /><meshStandardMaterial color={color} roughness={0.35} /></instancedMesh></group>;
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
  const bushes = useRef<THREE.InstancedMesh>(null);
  const fruit = useRef<THREE.InstancedMesh>(null);
  useEffect(() => {
    const b = bushes.current, f = fruit.current;
    if (!b || !f) return;
    const object = new THREE.Object3D();
    const red = new THREE.Color("#ff5a6a"), yellow = new THREE.Color("#ffd24a");
    spots(10, 31).forEach(([x, z, r], i) => {
      object.position.set(x, 0.25, z);
      object.scale.setScalar(1 + r * 0.35);
      object.updateMatrix();
      b.setMatrixAt(i, object.matrix);
      object.scale.setScalar(1);
      for (let k = 0; k < 4; k++) {
        object.position.set(x + Math.cos(k * 1.6) * 0.25, 0.3 + (k % 2) * 0.12, z + Math.sin(k * 1.6) * 0.25);
        object.updateMatrix();
        f.setMatrixAt(i * 4 + k, object.matrix);
        f.setColorAt(i * 4 + k, k % 2 ? red : yellow);
      }
    });
    b.instanceMatrix.needsUpdate = f.instanceMatrix.needsUpdate = true;
    if (f.instanceColor) f.instanceColor.needsUpdate = true;
  }, []);
  return (
    <>
      <instancedMesh ref={bushes} args={[undefined, undefined, 10]} castShadow><icosahedronGeometry args={[0.28, 1]} /><meshStandardMaterial color="#2f8a4a" roughness={0.8} flatShading /></instancedMesh>
      <instancedMesh ref={fruit} args={[undefined, undefined, 40]}><sphereGeometry args={[0.05, 6, 4]} /><meshStandardMaterial /></instancedMesh>
    </>
  );
}

function Lotus() {
  const pads = useRef<THREE.InstancedMesh>(null);
  const flowers = useRef<THREE.InstancedMesh>(null);
  useEffect(() => {
    const p = pads.current, f = flowers.current;
    if (!p || !f) return;
    const object = new THREE.Object3D();
    spots(9, 53, HALF - 1).forEach(([x, z], i) => {
      object.position.set(x, 0.03, z * 0.3);
      object.rotation.x = -Math.PI / 2;
      object.updateMatrix();
      p.setMatrixAt(i, object.matrix);
      object.rotation.x = 0;
      object.position.y = 0.08;
      object.updateMatrix();
      f.setMatrixAt(i, object.matrix);
    });
    p.instanceMatrix.needsUpdate = f.instanceMatrix.needsUpdate = true;
  }, []);
  return (
    <>
      <instancedMesh ref={pads} args={[undefined, undefined, 9]}><circleGeometry args={[0.16, 10]} /><meshStandardMaterial color="#3fa86a" /></instancedMesh>
      <instancedMesh ref={flowers} args={[undefined, undefined, 9]}><coneGeometry args={[0.07, 0.12, 6]} /><meshStandardMaterial color="#ffd6ef" emissive="#a0407a" emissiveIntensity={0.5} /></instancedMesh>
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
export function HeavenDetails({ tier, mobile = false, gold, pearl }: { tier: number; mobile?: boolean; gold: THREE.Color; pearl: THREE.Color }) {
  const detailTier = Math.min(12, tier);
  return (
    <group>
      <Lotus />
      <Inlays count={mobile ? 48 : 80 + detailTier * 8} color={gold} />
      <Lanterns count={Math.min(mobile ? 20 : 40, 4 + detailTier * 3)} />
      {tier >= 1 && <Gate />}
      {tier >= 2 && <FruitBushes />}
      {tier >= 3 && <Dome p={[-HALF + 1.3, 0, -HALF + 1.3]} s={1.2} />}
      {tier >= 4 && <Dome p={[HALF - 1.2, 0, -HALF + 1.6]} s={0.8} />}
      {tier >= 5 && <LightPillar />}
      {tier >= 6 && <Angels count={Math.min(mobile ? 4 : 8, tier >= 12 ? 8 : tier >= 10 ? 6 : tier >= 8 ? 4 : 2)} />}
      {tier >= 7 && <PearlArches />}
      {tier >= 8 && <Palace />}
      {tier >= 8 && <Arcades color={pearl} />}
      {tier >= 9 && <FloatingIslands n={mobile ? 3 : tier >= 11 ? 5 : 3} />}
      {tier >= 10 && <Sidrah />}
      {tier >= 11 && <Halo r={9} y={9} />}
      {tier >= 12 && Array.from({ length: mobile ? 1 : 3 }, (_, i) => <Halo key={i} r={8 + i * 1.3} y={6.5 + i * 1.2} />)}
      <Motes count={Math.min(mobile ? 120 : 320, 40 + detailTier * 24)} color="#fff0a8" rise={0.25} />
      <pointLight position={[0, 3, 0]} intensity={3 + Math.min(tier, 12) * 1.5} distance={14} color="#ffe2a0" />
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

/** Angels of light: abstract winged forms of nur gliding in orbit (no faces or figures). */
function Angels({ count }: { count: number }) {
  const wings = useRef<THREE.InstancedMesh>(null);
  const cores = useRef<THREE.InstancedMesh>(null);
  const wingGeometry = useMemo(() => {
    const parts: THREE.BufferGeometry[] = [];
    for (const side of [-1, 1]) {
      for (let k = 0; k < 3; k++) {
        const feather = new THREE.PlaneGeometry(0.55 - k * 0.1, 0.18);
        feather.rotateZ(side * (0.3 - k * 0.15));
        feather.translate(side * (0.35 + k * 0.22), 0.05 - k * 0.07, 0);
        parts.push(feather);
      }
    }
    const merged = mergeGeometries(parts);
    parts.forEach((part) => part.dispose());
    return merged ?? new THREE.PlaneGeometry(1.6, 0.18);
  }, []);
  const object = useMemo(() => new THREE.Object3D(), []);
  useFrame((s) => {
    const w = wings.current, c = cores.current;
    if (!w || !c) return;
    const t = s.clock.elapsedTime;
    for (let i = 0; i < count; i++) {
      const r = i % 2 ? 4.2 : 6.5, a = t * (i % 2 ? 0.25 : -0.18) + (i * Math.PI * 2) / count;
      object.position.set(Math.cos(a) * r, 4.5 + (i % 2) * 1.6 + Math.sin(t + i) * 0.3, Math.sin(a) * r);
      object.rotation.set(0, -a + (i % 2 ? 0 : Math.PI), Math.sin(t * 2 + i) * 0.12);
      object.scale.set(1, 0.85 + Math.sin(t * 2 + i) * 0.15, 1);
      object.updateMatrix();
      w.setMatrixAt(i, object.matrix);
      object.scale.setScalar(1);
      object.updateMatrix();
      c.setMatrixAt(i, object.matrix);
    }
    w.instanceMatrix.needsUpdate = c.instanceMatrix.needsUpdate = true;
  });
  return (
    <group name="garden-angels">
      <instancedMesh ref={wings} args={[wingGeometry, undefined, count]}><meshBasicMaterial color="#fff6d6" transparent opacity={0.8} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} /></instancedMesh>
      <instancedMesh ref={cores} args={[undefined, undefined, count]}><sphereGeometry args={[0.14, 8, 6]} /><meshBasicMaterial color="#fff3c0" /></instancedMesh>
    </group>
  );
}

function PearlArches() {
  return (
    <>
      {[-1, 1].map((s) => (
        <group key={s} position={[s * (HALF - 0.4), 0, 0]} rotation-y={Math.PI / 2}>
          <mesh position={[0, 1.5, 0]} rotation-z={Math.PI / 2}><torusGeometry args={[1.1, 0.1, 10, 32, Math.PI]} /><meshStandardMaterial color="#f8f4ee" emissive="#c8b8ff" emissiveIntensity={0.4} roughness={0.2} /></mesh>
          {[-1.1, 1.1].map((x) => <mesh key={x} position={[x, 0.75, 0]}><cylinderGeometry args={[0.1, 0.12, 1.5, 10]} /><meshStandardMaterial color="#f8f4ee" /></mesh>)}
        </group>
      ))}
    </>
  );
}

function Palace() {
  return (
    <group name="garden-palace" position={[0, 0, -HALF + 1.8]} scale={1.25}>
      {[0, 1, 2].map((k) => (
        <mesh key={k} position={[0, 0.35 + k * 0.6, 0]} castShadow><boxGeometry args={[3 - k * 0.8, 0.6, 1.6 - k * 0.35]} /><meshStandardMaterial color="#f6f1e8" roughness={0.3} emissive="#3a2a10" emissiveIntensity={0.2} /></mesh>
      ))}
      <mesh position={[0, 2.1, 0]}><sphereGeometry args={[0.55, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#e8c46a" metalness={0.9} roughness={0.2} emissive="#7a5a10" /></mesh>
      {[-1.6, 1.6].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <mesh position={[0, 1.6, 0]}><cylinderGeometry args={[0.12, 0.16, 3.2, 10]} /><meshStandardMaterial color="#f6f1e8" /></mesh>
          <mesh position={[0, 3.4, 0]}><coneGeometry args={[0.18, 0.5, 10]} /><meshStandardMaterial color="#e8c46a" metalness={0.9} emissive="#7a5a10" /></mesh>
        </group>
      ))}
    </group>
  );
}

function FloatingIslands({ n }: { n: number }) {
  const g = useRef<THREE.Group>(null);
  useFrame((s) => g.current?.children.forEach((c, i) => (c.position.y = 6 + (i % 2) + Math.sin(s.clock.elapsedTime * 0.5 + i) * 0.3)));
  return (
    <group ref={g}>
      {Array.from({ length: n }, (_, i) => {
        const a = (i / n) * Math.PI * 2;
        return (
          <group key={i} position={[Math.cos(a) * 8, 6, Math.sin(a) * 8]}>
            <mesh rotation-x={Math.PI}><coneGeometry args={[1, 1.4, 8]} /><meshStandardMaterial color="#6a5a8a" flatShading /></mesh>
            <mesh position={[0, 0.72, 0]}><cylinderGeometry args={[1, 1, 0.1, 16]} /><meshStandardMaterial color="#3fa86a" /></mesh>
            <mesh position={[0, 1.2, 0]}><icosahedronGeometry args={[0.45, 0]} /><meshStandardMaterial color="#ffe082" emissive="#c89a2a" emissiveIntensity={1} flatShading /></mesh>
          </group>
        );
      })}
    </group>
  );
}

function Sidrah() {
  return (
    <group position={[HALF - 1.4, 0, HALF - 1.6]}>
      <mesh position={[0, 2, 0]} castShadow><cylinderGeometry args={[0.2, 0.4, 4, 10]} /><meshStandardMaterial color="#c89a5a" emissive="#5a3a10" /></mesh>
      {[0, 1, 2, 3, 4].map((k) => (
        <mesh key={k} position={[Math.cos(k * 1.3) * 0.7, 4 + (k % 3) * 0.5, Math.sin(k * 1.3) * 0.7]}><icosahedronGeometry args={[0.9 - (k % 2) * 0.2, 1]} /><meshStandardMaterial color="#ffd86a" emissive="#c8901a" emissiveIntensity={1.2} flatShading transparent opacity={0.9} /></mesh>
      ))}
    </group>
  );
}

function Halo({ r, y }: { r: number; y: number }) {
  const m = useRef<THREE.Mesh>(null);
  useFrame((_, d) => m.current && (m.current.rotation.z += Math.min(d, 0.05) * 0.1));
  return <mesh ref={m} position={[0, y, 0]} rotation-x={Math.PI / 2}><torusGeometry args={[r, 0.05, 6, 96]} /><meshBasicMaterial color="#ffe6a0" transparent opacity={0.5} blending={THREE.AdditiveBlending} depthWrite={false} /></mesh>;
}
