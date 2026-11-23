// The 3D paradise garden: a floating "diorama box" of land drawn from plain garden state.
import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls, Environment, Lightformer } from "@react-three/drei";
import * as THREE from "three";
import type { OrbitControls as OrbitImpl } from "three-stdlib";
import { HALF, MAX_TREES, growth, riverZ, type GardenTree } from "@/lib/garden";

type Props = { trees: GardenTree[]; level: number; upgrades: number; withered?: boolean };

// Tiny seeded random so every tree/flower keeps its look across refreshes.
function rng(seed: number) {
  let s = seed % 2147483647 || 1;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}
const dummy = new THREE.Object3D();

/** Grass texture drawn on a canvas, so the meadow isn't a flat colour. */
function useGrassTexture(dry: boolean) {
  return useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const g = c.getContext("2d")!;
    g.fillStyle = dry ? "#6b5a3e" : "#41693a";
    g.fillRect(0, 0, 256, 256);
    const r = rng(7);
    for (let i = 0; i < 3000; i++) {
      g.fillStyle = dry ? `hsl(${30 + r() * 15},${20 + r() * 20}%,${22 + r() * 18}%)` : `hsl(${95 + r() * 30},${35 + r() * 25}%,${20 + r() * 18}%)`;
      g.fillRect(r() * 256, r() * 256, 2, 2 + r() * 4);
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(4, 4);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [dry]);
}

/** Land box: grass top, earth and stone sides, plus double-click to fly the camera there. */
function Land({ onFly, dry }: { onFly: (p: THREE.Vector3) => void; dry: boolean }) {
  const grass = useGrassTexture(dry);
  return (
    <group>
      <mesh position={[0, -0.8, 0]} receiveShadow castShadow>
        <boxGeometry args={[HALF * 2, 1.6, HALF * 2]} />
        <meshStandardMaterial color="#4a3426" roughness={1} />
      </mesh>
      <mesh position={[0, -1.75, 0]}>
        <boxGeometry args={[HALF * 2 + 0.2, 0.3, HALF * 2 + 0.2]} />
        <meshStandardMaterial color="#b9a7d8" roughness={0.4} metalness={0.3} />
      </mesh>
      <mesh
        rotation-x={-Math.PI / 2}
        position={[0, 0.001, 0]}
        receiveShadow
        onDoubleClick={(e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          onFly(e.point.clone());
        }}
      >
        <planeGeometry args={[HALF * 2, HALF * 2]} />
        <meshStandardMaterial map={grass} roughness={0.95} />
      </mesh>
    </group>
  );
}

/** River following riverZ(x), as a strip mesh with gently moving shine. */
function River() {
  const ref = useRef<THREE.MeshPhysicalMaterial>(null);
  const geo = useMemo(() => {
    const pts: number[] = [];
    const idx: number[] = [];
    const steps = 48;
    for (let i = 0; i <= steps; i++) {
      const x = -HALF + (i / steps) * HALF * 2;
      const z = riverZ(x);
      pts.push(x, 0.03, z - 0.7, x, 0.03, z + 0.7);
      if (i < steps) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }, []);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.roughness = 0.08 + Math.sin(clock.elapsedTime * 1.3) * 0.04;
  });
  return (
    <mesh geometry={geo}>
      <meshPhysicalMaterial ref={ref} color="#7cc6d6" transmission={0.4} roughness={0.1} metalness={0.1} side={THREE.DoubleSide} />
    </mesh>
  );
}

/** Marble pavilion: columns, arches and a dome. */
function Pavilion() {
  const marble = <meshStandardMaterial color="#f6f1e7" roughness={0.35} />;
  const cols = [0, 1, 2, 3, 4, 5].map((i) => (i / 6) * Math.PI * 2);
  return (
    <group position={[-2.5, 0, -2.5]}>
      <mesh position={[0, 0.1, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.6, 1.7, 0.2, 6]} />
        {marble}
      </mesh>
      {cols.map((a) => (
        <group key={a} rotation-y={a}>
          <mesh position={[1.25, 0.9, 0]} castShadow>
            <cylinderGeometry args={[0.09, 0.11, 1.4, 10]} />
            {marble}
          </mesh>
          <mesh position={[1.08, 1.6, 0]} rotation-y={Math.PI / 2 + Math.PI / 6}>
            <torusGeometry args={[0.62, 0.06, 6, 16, Math.PI]} />
            {marble}
          </mesh>
        </group>
      ))}
      <mesh position={[0, 1.75, 0]} castShadow>
        <cylinderGeometry args={[1.4, 1.4, 0.18, 6]} />
        {marble}
      </mesh>
      <mesh position={[0, 1.84, 0]} castShadow>
        <sphereGeometry args={[1, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        {marble}
      </mesh>
      <mesh position={[0, 2.95, 0]}>
        <coneGeometry args={[0.06, 0.4, 8]} />
        <meshStandardMaterial color="#d8b25a" metalness={0.8} roughness={0.3} />
      </mesh>
    </group>
  );
}

/** Fountain with a rising, falling ring of droplets (one instanced mesh). */
function Fountain() {
  const drops = useRef<THREE.InstancedMesh>(null);
  const N = 60;
  useFrame(({ clock }) => {
    const m = drops.current;
    if (!m) return;
    for (let i = 0; i < N; i++) {
      const t = (clock.elapsedTime * 0.6 + i / N) % 1;
      const a = (i / N) * Math.PI * 2;
      const r = t * 0.75;
      dummy.position.set(Math.cos(a) * r, 0.9 + t * 1.2 - t * t * 1.6, Math.sin(a) * r);
      dummy.scale.setScalar(1 - t * 0.5);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  });
  return (
    <group position={[2.2, 0, -1.8]}>
      <mesh position={[0, 0.15, 0]} castShadow>
        <cylinderGeometry args={[0.95, 1, 0.3, 24]} />
        <meshStandardMaterial color="#f3ede0" roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.31, 0]} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[0.85, 24]} />
        <meshStandardMaterial color="#8fd0dd" roughness={0.05} metalness={0.2} />
      </mesh>
      <mesh position={[0, 0.6, 0]}>
        <cylinderGeometry args={[0.08, 0.12, 0.6, 10]} />
        <meshStandardMaterial color="#f3ede0" />
      </mesh>
      <instancedMesh ref={drops} args={[undefined, undefined, N]}>
        <sphereGeometry args={[0.03, 6, 4]} />
        <meshStandardMaterial color="#e9fbff" emissive="#bfefff" emissiveIntensity={0.4} />
      </instancedMesh>
    </group>
  );
}

/** Flowers: instanced, count grows with forest level and streak. */
function Flowers({ count }: { count: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const MAX = 900;
  useEffect(() => {
    const m = ref.current;
    if (!m) return;
    const r = rng(3);
    const palette = ["#f7e7f0", "#f4c95d", "#e98aa8", "#ffffff", "#c8a2e8"].map((c) => new THREE.Color(c));
    for (let i = 0; i < MAX; i++) {
      const x = (r() * 2 - 1) * (HALF - 0.2);
      const z = (r() * 2 - 1) * (HALF - 0.2);
      const inRiver = Math.abs(z - riverZ(x)) < 0.8;
      dummy.position.set(x, 0.05, z);
      dummy.scale.setScalar(i < count && !inRiver ? 0.6 + r() * 0.6 : 0);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
      m.setColorAt(i, palette[i % palette.length]!);
    }
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [count]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, MAX]}>
      <icosahedronGeometry args={[0.06, 0]} />
      <meshStandardMaterial roughness={0.6} />
    </instancedMesh>
  );
}

/** Trees: three instanced meshes (trunk, canopy, fruit). Growth is animated per frame from plantedAt. */
function Trees({ trees, dry }: { trees: GardenTree[]; dry: boolean }) {
  const trunk = useRef<THREE.InstancedMesh>(null);
  const crown = useRef<THREE.InstancedMesh>(null);
  const fruit = useRef<THREE.InstancedMesh>(null);
  const greens = useMemo(() => (dry ? ["#6e5232", "#7a6038", "#5b4a30", "#836a3e"] : ["#3f7a3a", "#4d8f45", "#2f6a3a", "#5e9a4a"]).map((c) => new THREE.Color(c)), [dry]);
  useEffect(() => {
    trees.forEach((t, i) => crown.current?.setColorAt(i, greens[t.seed % greens.length]!));
    if (crown.current?.instanceColor) crown.current.instanceColor.needsUpdate = true;
  }, [trees, greens]);
  useFrame(() => {
    const now = Date.now();
    const [a, b, c] = [trunk.current, crown.current, fruit.current];
    if (!a || !b || !c) return;
    for (let i = 0; i < MAX_TREES; i++) {
      const t = trees[i];
      const { scale, mature } = t ? growth(t.plantedAt, now) : { scale: 0, mature: 0 };
      const s = t ? scale * (0.85 + (t.seed % 30) / 100) * (dry ? 0.8 : 1) : 0;
      dummy.rotation.set(0, t ? t.seed : 0, 0);
      dummy.position.set(t?.x ?? 0, 0.5 * s, t?.z ?? 0);
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      a.setMatrixAt(i, dummy.matrix);
      dummy.position.y = 1.25 * s;
      dummy.updateMatrix();
      b.setMatrixAt(i, dummy.matrix);
      dummy.scale.setScalar(mature > 0.3 && !dry ? s : 0);
      dummy.updateMatrix();
      c.setMatrixAt(i, dummy.matrix);
    }
    a.instanceMatrix.needsUpdate = b.instanceMatrix.needsUpdate = c.instanceMatrix.needsUpdate = true;
  });
  // Fruit: a handful of small spheres merged around the crown in one geometry.
  const fruitGeo = useMemo(() => {
    const parts: THREE.BufferGeometry[] = [];
    const r = rng(11);
    for (let i = 0; i < 7; i++) {
      const g = new THREE.SphereGeometry(0.07, 6, 4);
      const a = r() * Math.PI * 2;
      g.translate(Math.cos(a) * 0.5, (r() - 0.3) * 0.5, Math.sin(a) * 0.5);
      parts.push(g);
    }
    return mergeGeometries(parts);
  }, []);
  return (
    <>
      <instancedMesh ref={trunk} args={[undefined, undefined, MAX_TREES]} castShadow>
        <cylinderGeometry args={[0.06, 0.1, 1, 6]} />
        <meshStandardMaterial color="#6b4a32" roughness={1} />
      </instancedMesh>
      <instancedMesh ref={crown} args={[undefined, undefined, MAX_TREES]} castShadow>
        <icosahedronGeometry args={[0.55, 1]} />
        <meshStandardMaterial roughness={0.85} flatShading />
      </instancedMesh>
      <instancedMesh ref={fruit} args={[fruitGeo, undefined, MAX_TREES]}>
        <meshStandardMaterial color="#f0b54a" emissive="#c77a1a" emissiveIntensity={0.5} roughness={0.4} />
      </instancedMesh>
    </>
  );
}

function mergeGeometries(parts: THREE.BufferGeometry[]) {
  const pos: number[] = [];
  const nor: number[] = [];
  for (const p of parts) {
    const g = p.toNonIndexed();
    pos.push(...(g.getAttribute("position").array as Float32Array));
    nor.push(...(g.getAttribute("normal").array as Float32Array));
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  return g;
}

/** Stone path that appears at forest level 2. */
function Path() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const N = 26;
  useEffect(() => {
    const m = ref.current;
    if (!m) return;
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1);
      dummy.position.set(-2.5 + t * 4.7, 0.02, -1.2 + Math.sin(t * Math.PI) * 0.6 - t * 0.6);
      dummy.rotation.set(0, i, 0);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  }, []);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, N]} receiveShadow>
      <cylinderGeometry args={[0.16, 0.18, 0.04, 7]} />
      <meshStandardMaterial color="#e6dccb" roughness={0.8} />
    </instancedMesh>
  );
}

/** Small birds circling above the forest. */
function Birds({ count }: { count: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useFrame(({ clock }) => {
    const m = ref.current;
    if (!m) return;
    for (let i = 0; i < count; i++) {
      const a = clock.elapsedTime * (0.25 + i * 0.03) + i * 1.7;
      const r = 3 + (i % 4);
      dummy.position.set(Math.cos(a) * r, 3.5 + Math.sin(a * 2 + i) * 0.4 + (i % 3) * 0.5, Math.sin(a) * r);
      dummy.rotation.set(0, -a, Math.sin(clock.elapsedTime * 8 + i) * 0.5);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]}>
      <coneGeometry args={[0.06, 0.25, 3]} />
      <meshStandardMaterial color="#fbf6ec" />
    </instancedMesh>
  );
}

/** Drifting clouds: soft white spheres grouped together. */
function Clouds() {
  const g = useRef<THREE.Group>(null);
  useFrame((_, d) => {
    g.current?.children.forEach((c, i) => {
      c.position.x += Math.min(d, 0.05) * (0.15 + i * 0.05);
      if (c.position.x > 14) c.position.x = -14;
    });
  });
  return (
    <group ref={g}>
      {[[-9, 7, -9], [2, 8, -11], [10, 6.5, -7], [-11, 8, 1]].map((p, i) => (
        <group key={i} position={p as [number, number, number]}>
          {[0, 0.8, -0.7, 0.3].map((o, j) => (
            <mesh key={j} position={[o, j === 1 ? 0.3 : 0, j * 0.2]}>
              <sphereGeometry args={[0.9 - j * 0.12, 12, 10]} />
              <meshStandardMaterial color="#5a4f7a" transparent opacity={0.7} roughness={1} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

/** Golden light rays: soft additive cones from the sky. */
function Rays({ strong }: { strong: boolean }) {
  return (
    <group>
      {[-3, 0.5, 3.5].map((x, i) => (
        <mesh key={i} position={[x, 5, -1 + i]} rotation-z={0.35}>
          <coneGeometry args={[1.2, 10, 16, 1, true]} />
          <meshBasicMaterial color="#b9a8ff" transparent opacity={strong ? 0.05 : 0.025} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

/** Night details: stars, crescent moon, glowing lanterns, rocks and bushes along the river. */
function Night({ dry, river }: { dry: boolean; river: boolean }) {
  const stars = useMemo(() => {
    const r = rng(5);
    const a: number[] = [];
    for (let i = 0; i < 500; i++) {
      const th = r() * Math.PI * 2, ph = r() * 1.3, R = 40;
      a.push(Math.cos(th) * Math.sin(ph) * R, Math.cos(ph) * R * 0.8 + 4, Math.sin(th) * Math.sin(ph) * R);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(a, 3));
    return g;
  }, []);
  const lanterns = [[-5.2, -5.2], [5.2, -5.2], [-5.2, 5.2], [5.2, 5.2], [0.3, -0.6], [-4, 0.2], [4.2, 3.6]];
  const rocks = useMemo(() => {
    const r = rng(9);
    return Array.from({ length: 22 }, () => {
      const x = (r() * 2 - 1) * (HALF - 0.4);
      const side = r() > 0.5 ? 1 : -1;
      return { x, z: riverZ(x) + side * (0.8 + r() * 0.25), s: 0.08 + r() * 0.12, rot: r() * 3 };
    });
  }, []);
  return (
    <group>
      <points geometry={stars}>
        <pointsMaterial size={0.12} color="#f4ecff" sizeAttenuation transparent opacity={0.9} />
      </points>
      <group position={[-12, 12, -16]}>
        <mesh><sphereGeometry args={[1.4, 32, 16]} /><meshBasicMaterial color="#fff3cf" /></mesh>
        <mesh position={[0.55, 0.25, 0.4]}><sphereGeometry args={[1.25, 32, 16]} /><meshBasicMaterial color="#130c22" /></mesh>
      </group>
      {lanterns.map(([x, z], i) => (
        <group key={i} position={[x!, 0, z!]}>
          <mesh position={[0, 0.45, 0]}><cylinderGeometry args={[0.03, 0.04, 0.9, 6]} /><meshStandardMaterial color="#2c2238" metalness={0.6} /></mesh>
          <mesh position={[0, 0.98, 0]}>
            <octahedronGeometry args={[0.13, 0]} />
            <meshStandardMaterial color="#ffd27a" emissive="#ffb347" emissiveIntensity={dry ? 0.4 : 2.2} />
          </mesh>
          {i < 4 && <pointLight position={[0, 1.1, 0]} color="#ffbf6a" intensity={dry ? 0.6 : 2.4} distance={4.5} decay={2} />}
        </group>
      ))}
      {river && rocks.map((k, i) => (
        <mesh key={i} position={[k.x, k.s * 0.4, k.z]} rotation-y={k.rot} scale={[k.s * 1.4, k.s, k.s]} castShadow>
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="#7b7386" roughness={0.9} flatShading />
        </mesh>
      ))}
    </group>
  );
}

/** Camera: orbit + zoom from OrbitControls; double-click glides the target to a spot. */
function CameraRig({ fly }: { fly: React.MutableRefObject<THREE.Vector3 | null> }) {
  const controls = useRef<OrbitImpl>(null);
  const { gl } = useThree();
  useEffect(() => {
    gl.domElement.parentElement?.setAttribute("data-scene-ready", "true");
  }, [gl]);
  useFrame((_, d) => {
    const c = controls.current;
    const target = fly.current;
    if (!c || !target) return;
    const k = 1 - Math.exp(-4 * Math.min(d, 0.05));
    const offset = c.object.position.clone().sub(c.target);
    c.target.lerp(target, k);
    // ease in a little closer when flying
    const len = THREE.MathUtils.lerp(offset.length(), 9, k);
    c.object.position.copy(c.target).add(offset.setLength(len));
    if (c.target.distanceTo(target) < 0.02) fly.current = null;
    c.update();
  });
  return (
    <OrbitControls
      ref={controls}
      enablePan={false}
      enableDamping
      minDistance={5}
      maxDistance={30}
      maxPolarAngle={Math.PI / 2.15}
    />
  );
}

export default function GardenScene({ trees, level, upgrades, withered = false }: Props) {
  const fly = useRef<THREE.Vector3 | null>(null);
  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      camera={{ position: [11, 8.5, 11], fov: 40 }}
      gl={{ antialias: true }}
      onCreated={({ gl }) => (gl.toneMapping = THREE.ACESFilmicToneMapping)}
    >
      {/* Golden-hour sky and haze */}
      <color attach="background" args={[withered ? "#1a0f12" : "#120c22"]} />
      <fog attach="fog" args={[withered ? "#1a0f12" : "#120c22", 26, 60]} />
      <hemisphereLight args={[withered ? "#7a5a5a" : "#9a8cff", "#2a3a24", 0.95]} />
      <directionalLight
        position={[-8, 10, -6]}
        intensity={withered ? 0.8 : 1.4}
        color={withered ? "#c98a6a" : "#cfd6ff"}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-9}
        shadow-camera-right={9}
        shadow-camera-top={9}
        shadow-camera-bottom={-9}
      />
      <Environment resolution={64}>
        <Lightformer intensity={0.8} position={[0, 5, 0]} scale={[10, 10, 1]} color="#b9b0ff" />
        <Lightformer intensity={1} color="#b8d8e8" position={[-5, 1, -1]} rotation-y={Math.PI / 2} scale={[20, 1, 1]} />
      </Environment>

      <Land dry={withered} onFly={(p) => (fly.current = p)} />
      <Night dry={withered} river={upgrades >= 2} />
      <Flowers count={withered ? 20 : 60 + upgrades * 80 + level * 120} />
      {upgrades >= 2 && <River />}
      {upgrades >= 3 && <Fountain />}
      {upgrades >= 4 && <Pavilion />}
      {level >= 2 && <Path />}
      {level >= 2 && !withered && <Birds count={level >= 3 ? 14 : 6} />}
      <Trees trees={trees} dry={withered} />
      <Clouds />
      {!withered && <Rays strong={upgrades >= 5} />}
      <CameraRig fly={fly} />
    </Canvas>
  );
}
