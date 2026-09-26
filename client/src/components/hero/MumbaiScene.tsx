import { useLayoutEffect, useMemo, useRef, type ReactNode } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Html, Lightformer } from "@react-three/drei";
import { MATCHES, minutesAt, skyAt, sunAt, type StoryState } from "./story";

/* ------------------------------------------------------------------ */
/* Palette, helpers, shared geometry + materials                       */
/* ------------------------------------------------------------------ */

type V3 = [number, number, number];
type Pastel = "peach" | "rose" | "mint" | "butter" | "powder";

const C = {
  peach: "#F4C7A1",
  rose: "#E9B8B0",
  mint: "#B9D4C3",
  butter: "#F6DFA0",
  powder: "#CFE0E8",
  sand: "#F3E3C7",
  card: "#FFFDF8",
  trim: "#FFF8EC",
  stone: "#EFE4D2",
  road: "#E2D0B3",
  sea: "#A9CFD8",
  ink: "#2A1F1A",
  muted: "#7A6A5E",
  terracotta: "#D9653B",
  marigold: "#F2A93B",
  peacock: "#1F6F6B",
  pending: "#7A6FB0",
  glass: "#8FA7B2",
  lit: "#FFD27A",
  wood: "#C9996A",
  trunk: "#9A7456",
} as const;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (a: number, b: number, v: number) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const lerp = THREE.MathUtils.lerp;
function backOut(t: number) {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}
function seeded(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const std = (color: string, opts: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0, envMapIntensity: 0.3, ...opts });

const MAT = {
  body: {
    peach: std(C.peach),
    rose: std(C.rose),
    mint: std(C.mint),
    butter: std(C.butter),
    powder: std(C.powder),
  } as Record<Pastel, THREE.MeshStandardMaterial>,
  trim: std(C.trim),
  stone: std(C.stone),
  road: std(C.road, { roughness: 1 }),
  ground: std(C.sand, { roughness: 1 }),
  sea: std(C.sea, { roughness: 0.35, envMapIntensity: 0.9 }),
  card: std(C.card),
  ink: std("#3B2E27", { roughness: 0.6 }),
  muted: std(C.muted),
  terracotta: std(C.terracotta),
  marigold: std(C.marigold, { roughness: 0.6 }),
  peacock: std(C.peacock),
  powder: std(C.powder),
  rose: std(C.rose),
  butter: std(C.butter),
  wood: std(C.wood),
  trunk: std(C.trunk),
  gold: new THREE.MeshStandardMaterial({ color: C.marigold, metalness: 0.92, roughness: 0.26, envMapIntensity: 1.4 }),
  cushion: std("#FFF3E0"),
  leaf: new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.9, envMapIntensity: 0.3 }),
  window: new THREE.MeshBasicMaterial({ toneMapped: false }),
  bulb: new THREE.MeshStandardMaterial({ color: C.lit, emissive: new THREE.Color(C.marigold), emissiveIntensity: 0 }),
  flag: new THREE.MeshStandardMaterial({ color: C.terracotta, side: THREE.DoubleSide, roughness: 0.9 }),
  parapet: std(C.trim, { side: THREE.DoubleSide }),
  lampGlow: new THREE.MeshStandardMaterial({ color: C.lit, emissive: new THREE.Color(C.lit), emissiveIntensity: 1.2 }),
};

const GEO = {
  box: new THREE.BoxGeometry(1, 1, 1),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 20),
  cone: new THREE.ConeGeometry(1, 1, 10),
  dome: new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2),
  sphere: new THREE.SphereGeometry(1, 14, 10),
  plane: new THREE.PlaneGeometry(1, 1),
};

function Part({
  g = GEO.box,
  m,
  p,
  s,
  r,
  shadow = true,
}: {
  g?: THREE.BufferGeometry;
  m: THREE.Material;
  p: V3;
  s: V3;
  r?: V3;
  shadow?: boolean;
}) {
  return <mesh geometry={g} material={m} position={p} scale={s} rotation={r} castShadow={shadow} receiveShadow={shadow} />;
}

/* ------------------------------------------------------------------ */
/* City layout                                                         */
/* ------------------------------------------------------------------ */

type BuildingId = "hotel" | "office" | "restaurant" | "residency" | "ballroom" | "cinema" | "caterer";

interface DecoSpec {
  id: BuildingId;
  pos: [number, number];
  w: number;
  d: number;
  h: number;
  color: Pastel;
  tiers: number;
  tower?: { cx: 1 | -1; cz: 1 | -1; h: number; r: number };
  flag?: boolean;
  tank?: boolean;
}

const BUILDINGS: DecoSpec[] = [
  { id: "hotel", pos: [-5, -4.2], w: 3, d: 3, h: 8.4, color: "peach", tiers: 3, tower: { cx: 1, cz: 1, h: 9.4, r: 0.62 }, flag: true },
  { id: "office", pos: [-1.2, -4.4], w: 2.2, d: 2.4, h: 5.2, color: "rose", tiers: 2, flag: true },
  { id: "restaurant", pos: [2.6, -4.4], w: 2.6, d: 2.4, h: 3.2, color: "butter", tiers: 1, tower: { cx: -1, cz: 1, h: 4.1, r: 0.5 } },
  { id: "residency", pos: [5.8, -4.4], w: 2.2, d: 2.6, h: 6.2, color: "powder", tiers: 2, tank: true },
  { id: "ballroom", pos: [-5.2, 4.2], w: 4.2, d: 3, h: 3.0, color: "rose", tiers: 2 },
  { id: "cinema", pos: [-1.2, 4.4], w: 2.6, d: 2.6, h: 4.0, color: "peach", tiers: 2, tower: { cx: 1, cz: 1, h: 5.8, r: 0.72 }, flag: true },
  { id: "caterer", pos: [4.0, 4.4], w: 3, d: 2.6, h: 3.8, color: "mint", tiers: 1, tank: true },
];

const TIER_H = 0.42;
const roofTop = (b: DecoSpec) => b.h + b.tiers * TIER_H;
const bandYs = (h: number) => {
  const ys: number[] = [];
  for (let y = 1.25; y < h - 0.4; y += 1.4) ys.push(y);
  return ys;
};

const BY_ID = Object.fromEntries(BUILDINGS.map((b) => [b.id, b])) as Record<BuildingId, DecoSpec>;
const CATERER = BY_ID.caterer;
const BALLROOM = BY_ID.ballroom;

/* Marine Drive: an arc of road + promenade + sea, centred west of the block. */
const MD_CENTER: V3 = [-10, 0, 0];
const MD_PHI = 1.25;
const MD = { roadIn: 17.4, roadOut: 19, walkOut: 20.4 };

/* Idle chair cluster beside the ballroom. */
const CLUSTER = { x: -5.2, z: 7.5, cols: 8, rows: 5, gap: 0.36, scale: 0.22 };
const clusterSpots = (() => {
  const out: { x: number; z: number; order: number }[] = [];
  const n = CLUSTER.cols * CLUSTER.rows;
  for (let r = 0; r < CLUSTER.rows; r++) {
    for (let c = 0; c < CLUSTER.cols; c++) {
      out.push({
        x: CLUSTER.x + (c - (CLUSTER.cols - 1) / 2) * CLUSTER.gap,
        z: CLUSTER.z + (r - (CLUSTER.rows - 1) / 2) * CLUSTER.gap,
        order: (r * CLUSTER.cols + c) / (n - 1),
      });
    }
  }
  return out;
})();
/** The hero chair lands on the last cluster slot. */
const HERO_LANDING = clusterSpots[clusterSpots.length - 1];

function onLand(x: number, z: number, pad = 0.35) {
  for (const b of BUILDINGS) {
    if (Math.abs(x - b.pos[0]) < b.w / 2 + pad && Math.abs(z - b.pos[1]) < b.d / 2 + pad) return false;
  }
  if (Math.abs(z) < 1.25 && x < 7.6) return false; // east–west street
  if (Math.abs(x - 0.7) < 0.8 && Math.abs(z) < 9) return false; // north–south street
  if (Math.abs(x - CLUSTER.x) < 1.8 && Math.abs(z - CLUSTER.z) < 1.1) return false;
  const r = Math.hypot(x - MD_CENTER[0], z - MD_CENTER[2]);
  if (r > MD.roadIn - 0.3) return false;
  return true;
}

/* ------------------------------------------------------------------ */
/* Art-deco building                                                   */
/* ------------------------------------------------------------------ */

function CornerTower({ b }: { b: DecoSpec }) {
  const t = b.tower!;
  const x = (t.cx * b.w) / 2;
  const z = (t.cz * b.d) / 2;
  const rings = bandYs(t.h);
  return (
    <group position={[x, 0, z]}>
      <Part g={GEO.cyl} m={MAT.body[b.color]} p={[0, t.h / 2, 0]} s={[t.r, t.h, t.r]} />
      {rings.map((y) => (
        <Part key={y} g={GEO.cyl} m={MAT.trim} p={[0, y, 0]} s={[t.r + 0.04, 0.07, t.r + 0.04]} shadow={false} />
      ))}
      <Part g={GEO.cyl} m={MAT.trim} p={[0, t.h + 0.06, 0]} s={[t.r + 0.06, 0.12, t.r + 0.06]} />
      <Part g={GEO.dome} m={MAT.marigold} p={[0, t.h + 0.12, 0]} s={[t.r * 0.86, t.r * 0.7, t.r * 0.86]} />
      <Part g={GEO.cyl} m={MAT.marigold} p={[0, t.h + 0.12 + t.r * 0.7 + 0.25, 0]} s={[0.025, 0.5, 0.025]} />
    </group>
  );
}

function Flagpole({ y }: { y: number }) {
  return (
    <group position={[0, y, 0]}>
      <Part g={GEO.cyl} m={MAT.trim} p={[0, 0.7, 0]} s={[0.025, 1.4, 0.025]} />
      <Part g={GEO.plane} m={MAT.flag} p={[0.28, 1.22, 0]} s={[0.52, 0.32, 1]} r={[0, 0.25, 0]} />
    </group>
  );
}

function WaterTank({ p }: { p: V3 }) {
  return (
    <group position={p}>
      {[
        [-0.28, -0.28],
        [0.28, -0.28],
        [-0.28, 0.28],
        [0.28, 0.28],
      ].map(([x, z], i) => (
        <Part key={i} g={GEO.cyl} m={MAT.muted} p={[x, 0.22, z]} s={[0.035, 0.44, 0.035]} />
      ))}
      <Part g={GEO.cyl} m={MAT.terracotta} p={[0, 0.8, 0]} s={[0.42, 0.72, 0.42]} />
      <Part g={GEO.cone} m={MAT.muted} p={[0, 1.3, 0]} s={[0.46, 0.28, 0.46]} />
    </group>
  );
}

function DecoBuilding({ b }: { b: DecoSpec }) {
  const { w, d, h } = b;
  const top = roofTop(b);
  return (
    <group position={[b.pos[0], 0, b.pos[1]]}>
      <Part m={MAT.trim} p={[0, 0.16, 0]} s={[w + 0.16, 0.32, d + 0.16]} />
      <Part m={MAT.body[b.color]} p={[0, h / 2, 0]} s={[w, h, d]} />
      {bandYs(h).map((y) => (
        <Part key={y} m={MAT.trim} p={[0, y, 0]} s={[w + 0.07, 0.08, d + 0.07]} shadow={false} />
      ))}
      <Part m={MAT.trim} p={[0, h + 0.04, 0]} s={[w + 0.12, 0.1, d + 0.12]} />
      {Array.from({ length: b.tiers }).map((_, i) => {
        const inset = (i + 1) * 0.5;
        return (
          <Part
            key={i}
            m={i % 2 === 0 ? MAT.body[b.color] : MAT.trim}
            p={[0, h + TIER_H * (i + 0.5), 0]}
            s={[Math.max(0.6, w - inset), TIER_H, Math.max(0.6, d - inset)]}
          />
        );
      })}
      {b.tower && <CornerTower b={b} />}
      {b.flag && <Flagpole y={top} />}
      {b.tank && <WaterTank p={[w / 2 - 0.6, h + 0.09, -d / 2 + 0.6]} />}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Instanced windows (switch on one by one)                            */
/* ------------------------------------------------------------------ */

interface WinSpec {
  p: V3;
  ry: number;
  order: number;
}

function buildWindows(): WinSpec[] {
  const rand = seeded(11);
  const out: WinSpec[] = [];
  for (const b of BUILDINGS) {
    const { w, d, h } = b;
    const bands = bandYs(h);
    const faces = [
      { nx: 0, nz: 1, span: w, depth: d, ry: 0 },
      { nx: 0, nz: -1, span: w, depth: d, ry: Math.PI },
      { nx: 1, nz: 0, span: d, depth: w, ry: Math.PI / 2 },
      { nx: -1, nz: 0, span: d, depth: w, ry: -Math.PI / 2 },
    ];
    for (let y = 0.85; y < h - 0.35; y += 0.7) {
      if (bands.some((by) => Math.abs(by - y) < 0.25)) continue;
      for (const f of faces) {
        const cols = Math.max(1, Math.floor((f.span - 0.4) / 0.52));
        const spacing = (f.span - 0.4) / cols;
        for (let c = 0; c < cols; c++) {
          const along = -f.span / 2 + 0.2 + spacing * (c + 0.5);
          const off = f.depth / 2 + 0.011;
          const lx = f.nx !== 0 ? f.nx * off : along;
          const lz = f.nz !== 0 ? f.nz * off : along;
          if (b.tower) {
            const tx = (b.tower.cx * w) / 2;
            const tz = (b.tower.cz * d) / 2;
            if (Math.hypot(lx - tx, lz - tz) < b.tower.r + 0.2) continue;
          }
          out.push({ p: [b.pos[0] + lx, y, b.pos[1] + lz], ry: f.ry, order: rand() });
        }
      }
    }
  }
  return out;
}

function Windows({ S }: { S: StoryState }) {
  const specs = useMemo(buildWindows, []);
  const ref = useRef<THREE.InstancedMesh>(null);
  const last = useRef(-1);
  const col = useMemo(() => ({ glass: new THREE.Color(C.glass), lit: new THREE.Color(C.lit), tmp: new THREE.Color() }), []);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const o = new THREE.Object3D();
    specs.forEach((s, i) => {
      o.position.set(...s.p);
      o.rotation.set(0, s.ry, 0);
      o.scale.set(0.24, 0.34, 1);
      o.updateMatrix();
      mesh.setMatrixAt(i, o.matrix);
      mesh.setColorAt(i, col.glass);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    last.current = -1; // force the next frame to repaint from S.windows
  }, [specs, col]);

  useFrame(() => {
    const mesh = ref.current;
    const v = S.windows;
    if (!mesh || Math.abs(v - last.current) < 0.001) return;
    last.current = v;
    specs.forEach((s, i) => {
      const k = clamp01((v * 1.15 - s.order) / 0.15);
      col.tmp.copy(col.glass).lerp(col.lit, k);
      mesh.setColorAt(i, col.tmp);
    });
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return <instancedMesh ref={ref} args={[GEO.plane, MAT.window, specs.length]} frustumCulled={false} />;
}

/* ------------------------------------------------------------------ */
/* Static instancing (trees, lamps, dashes)                            */
/* ------------------------------------------------------------------ */

interface InstanceSpec {
  p: V3;
  s: V3;
  r?: V3;
  color?: THREE.Color;
}

function Instances({
  specs,
  g,
  m,
  shadow = false,
}: {
  specs: InstanceSpec[];
  g: THREE.BufferGeometry;
  m: THREE.Material;
  shadow?: boolean;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const o = new THREE.Object3D();
    specs.forEach((s, i) => {
      o.position.set(...s.p);
      o.rotation.set(...(s.r ?? [0, 0, 0]));
      o.scale.set(...s.s);
      o.updateMatrix();
      mesh.setMatrixAt(i, o.matrix);
      if (s.color) mesh.setColorAt(i, s.color);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [specs]);
  return (
    <instancedMesh ref={ref} args={[g, m, specs.length]} castShadow={shadow} receiveShadow={shadow} frustumCulled={false} />
  );
}

function Trees() {
  const { trunks, crowns } = useMemo(() => {
    const rand = seeded(5);
    const spots: [number, number][] = [];
    for (let x = -9; x <= 7; x += 1.55) {
      spots.push([x, 1.5], [x, -1.5]);
    }
    for (let phi = -1.1; phi <= 1.1; phi += 0.16) {
      const r = 16.85;
      spots.push([MD_CENTER[0] + r * Math.cos(phi), -r * Math.sin(phi)]);
    }
    for (const [x, z] of [
      [-8.4, -1.9],
      [-8.2, 6.6],
      [-2.9, 7.6],
      [1.9, 7.2],
      [6.4, 7.1],
      [-7.9, -6.8],
      [0.8, -7.8],
    ] as [number, number][]) {
      spots.push([x, z]);
    }
    const shades = ["#8DB89C", "#7FAF92", "#9CC4A6", "#6FA38A"].map((c) => new THREE.Color(c));
    const trunks: InstanceSpec[] = [];
    const crowns: InstanceSpec[] = [];
    for (const [x, z] of spots) {
      if (!onLand(x, z, 0.3)) continue;
      const s = 0.8 + rand() * 0.45;
      trunks.push({ p: [x, 0.22 * s, z], s: [0.07, 0.44 * s, 0.07] });
      crowns.push({
        p: [x, 0.44 * s + 0.42 * s, z],
        s: [0.34 * s, 0.9 * s, 0.34 * s],
        color: shades[Math.floor(rand() * shades.length)],
      });
    }
    return { trunks, crowns };
  }, []);

  return (
    <>
      <Instances specs={trunks} g={GEO.cyl} m={MAT.trunk} shadow />
      <Instances specs={crowns} g={GEO.cone} m={MAT.leaf} shadow />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Ground, streets, Marine Drive                                       */
/* ------------------------------------------------------------------ */

function Ground() {
  const circle = useMemo(() => new THREE.CircleGeometry(38, 72), []);
  const zebra = useMemo<InstanceSpec[]>(
    () => Array.from({ length: 5 }, (_, i) => ({ p: [-0.4, 0.012, -0.8 + i * 0.4], s: [0.7, 0.18, 1], r: [-Math.PI / 2, 0, 0] })),
    []
  );
  return (
    <group>
      <mesh geometry={circle} material={MAT.ground} rotation-x={-Math.PI / 2} receiveShadow />
      <mesh geometry={GEO.plane} material={MAT.road} rotation-x={-Math.PI / 2} position={[-1.3, 0.006, 0]} scale={[17.8, 2.2, 1]} receiveShadow />
      <mesh geometry={GEO.plane} material={MAT.road} rotation-x={-Math.PI / 2} position={[0.7, 0.007, 0]} scale={[1.2, 18, 1]} receiveShadow />
      <Instances specs={zebra} g={GEO.plane} m={MAT.trim} />
    </group>
  );
}

function MarineDrive({ S }: { S: StoryState }) {
  const geos = useMemo(
    () => ({
      road: new THREE.RingGeometry(MD.roadIn, MD.roadOut, 128, 1, -MD_PHI, 2 * MD_PHI),
      walk: new THREE.RingGeometry(MD.roadOut, MD.walkOut, 128, 1, -MD_PHI, 2 * MD_PHI),
      sea: new THREE.RingGeometry(MD.walkOut, 80, 128, 1, -MD_PHI - 0.7, 2 * MD_PHI + 1.4),
      parapet: new THREE.CylinderGeometry(MD.walkOut, MD.walkOut, 0.3, 128, 1, true, Math.PI / 2 - MD_PHI, 2 * MD_PHI),
    }),
    []
  );

  const { dashes, poles, bulbs } = useMemo(() => {
    const dashes: InstanceSpec[] = [];
    const poles: InstanceSpec[] = [];
    const bulbs: InstanceSpec[] = [];
    const rMid = (MD.roadIn + MD.roadOut) / 2;
    for (let phi = -MD_PHI + 0.02; phi < MD_PHI; phi += 0.045) {
      dashes.push({
        p: [rMid * Math.cos(phi), 0.012, -rMid * Math.sin(phi)],
        s: [0.06, 0.4, 1],
        r: [-Math.PI / 2, 0, phi],
      });
    }
    const rl = MD.walkOut - 0.25;
    for (let phi = -MD_PHI + 0.05; phi < MD_PHI; phi += 0.09) {
      const x = rl * Math.cos(phi);
      const z = -rl * Math.sin(phi);
      poles.push({ p: [x, 0.45, z], s: [0.03, 0.9, 0.03] });
      bulbs.push({ p: [x, 0.95, z], s: [0.09, 0.09, 0.09] });
    }
    return { dashes, poles, bulbs };
  }, []);

  useFrame(() => {
    const night = sunAt(minutesAt(S.p)).night;
    MAT.bulb.emissiveIntensity = night * 2.4;
  });

  return (
    <group position={MD_CENTER}>
      <mesh geometry={geos.sea} material={MAT.sea} rotation-x={-Math.PI / 2} position-y={-0.02} receiveShadow />
      <mesh geometry={geos.road} material={MAT.road} rotation-x={-Math.PI / 2} position-y={0.008} receiveShadow />
      <mesh geometry={geos.walk} material={MAT.stone} rotation-x={-Math.PI / 2} position-y={0.02} receiveShadow />
      <mesh geometry={geos.parapet} material={MAT.parapet} position-y={0.15} castShadow receiveShadow />
      <Instances specs={dashes} g={GEO.plane} m={MAT.trim} />
      <Instances specs={poles} g={GEO.cyl} m={MAT.muted} shadow />
      <Instances specs={bulbs} g={GEO.sphere} m={MAT.bulb} />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Props: gold chair + six floating items                              */
/* ------------------------------------------------------------------ */

/** Chiavari-style banquet chair, ~2.3 units tall, feet at y=0. */
function GoldChair() {
  const legs: [number, number][] = [
    [-0.4, -0.4],
    [0.4, -0.4],
    [-0.4, 0.4],
    [0.4, 0.4],
  ];
  return (
    <group>
      {legs.map(([x, z], i) => (
        <Part key={i} g={GEO.cyl} m={MAT.gold} p={[x, 0.5, z]} s={[0.045, 1, 0.045]} />
      ))}
      <Part g={GEO.cyl} m={MAT.gold} p={[0, 0.35, 0.4]} s={[0.025, 0.8, 0.025]} r={[0, 0, Math.PI / 2]} />
      <Part g={GEO.cyl} m={MAT.gold} p={[0, 0.35, -0.4]} s={[0.025, 0.8, 0.025]} r={[0, 0, Math.PI / 2]} />
      <Part m={MAT.gold} p={[0, 1.02, 0]} s={[0.92, 0.07, 0.92]} />
      <Part m={MAT.cushion} p={[0, 1.1, 0.02]} s={[0.84, 0.1, 0.84]} />
      {[-0.4, 0.4].map((x) => (
        <Part key={x} g={GEO.cyl} m={MAT.gold} p={[x, 1.65, -0.42]} s={[0.04, 1.2, 0.04]} />
      ))}
      <Part m={MAT.gold} p={[0, 2.26, -0.42]} s={[0.9, 0.1, 0.08]} />
      {[1.42, 1.68, 1.94].map((y) => (
        <Part key={y} g={GEO.cyl} m={MAT.gold} p={[0, y, -0.42]} s={[0.022, 0.8, 0.022]} r={[0, 0, Math.PI / 2]} />
      ))}
    </group>
  );
}

function Speaker() {
  return (
    <group>
      <Part m={MAT.ink} p={[0, 0.5, 0]} s={[0.6, 1, 0.5]} />
      <Part g={GEO.cyl} m={MAT.marigold} p={[0, 0.36, 0.26]} s={[0.2, 0.03, 0.2]} r={[Math.PI / 2, 0, 0]} />
      <Part g={GEO.cyl} m={MAT.marigold} p={[0, 0.78, 0.26]} s={[0.09, 0.03, 0.09]} r={[Math.PI / 2, 0, 0]} />
    </group>
  );
}

function Van() {
  const wheels: [number, number][] = [
    [-0.45, 0.34],
    [0.45, 0.34],
    [-0.45, -0.34],
    [0.45, -0.34],
  ];
  return (
    <group>
      <Part m={MAT.card} p={[-0.15, 0.55, 0]} s={[1.3, 0.72, 0.7]} />
      <Part m={MAT.powder} p={[-0.3, 0.98, 0]} s={[0.5, 0.16, 0.5]} />
      <Part m={MAT.card} p={[0.72, 0.45, 0]} s={[0.46, 0.54, 0.66]} />
      <Part m={MAT.ink} p={[0.9, 0.56, 0]} s={[0.12, 0.2, 0.56]} shadow={false} />
      <Part m={MAT.terracotta} p={[-0.15, 0.5, 0]} s={[1.32, 0.08, 0.72]} shadow={false} />
      {wheels.map(([x, z], i) => (
        <Part key={i} g={GEO.cyl} m={MAT.ink} p={[x, 0.16, z]} s={[0.16, 0.1, 0.16]} r={[Math.PI / 2, 0, 0]} />
      ))}
    </group>
  );
}

function Plates() {
  return (
    <group>
      {Array.from({ length: 6 }).map((_, i) => (
        <Part key={i} g={GEO.cyl} m={i === 5 ? MAT.marigold : MAT.card} p={[0, 0.04 + i * 0.075, 0]} s={[0.45, 0.06, 0.45]} />
      ))}
    </group>
  );
}

function LinenRoll() {
  return (
    <group>
      <Part g={GEO.cyl} m={MAT.rose} p={[0, 0.28, 0]} s={[0.28, 1.1, 0.28]} r={[0, 0, Math.PI / 2]} />
      <Part g={GEO.cyl} m={MAT.card} p={[0, 0.28, 0]} s={[0.1, 1.16, 0.1]} r={[0, 0, Math.PI / 2]} />
    </group>
  );
}

function Lamp() {
  return (
    <group>
      <Part g={GEO.cyl} m={MAT.ink} p={[0, 0.03, 0]} s={[0.26, 0.06, 0.26]} />
      <Part g={GEO.cyl} m={MAT.ink} p={[0, 0.55, 0]} s={[0.03, 1, 0.03]} />
      <Part g={GEO.cone} m={MAT.butter} p={[0, 1.15, 0]} s={[0.36, 0.42, 0.36]} />
      <Part g={GEO.sphere} m={MAT.lampGlow} p={[0, 0.98, 0]} s={[0.08, 0.08, 0.08]} shadow={false} />
    </group>
  );
}

function Crate() {
  return (
    <group>
      <Part m={MAT.wood} p={[0, 0.3, 0]} s={[0.8, 0.6, 0.6]} />
      {[0.12, 0.48].map((y) => (
        <Part key={y} m={MAT.trunk} p={[0, y, 0]} s={[0.82, 0.07, 0.62]} shadow={false} />
      ))}
    </group>
  );
}

const ITEM_MODELS = { speaker: Speaker, van: Van, plates: Plates, linen: LinenRoll, lamp: Lamp, crate: Crate } as const;
type ItemKind = keyof typeof ITEM_MODELS;

/* ------------------------------------------------------------------ */
/* Act 0 — hero chair + orbiting items                                 */
/* ------------------------------------------------------------------ */

const HERO_START = new THREE.Vector3(0, 13.6, 0);
const HERO_CENTER_OFFSET = 1.15;

function HeroChair({ S }: { S: StoryState }) {
  const ref = useRef<THREE.Group>(null);
  const spin = useRef(0);
  const end = useMemo(() => new THREE.Vector3(HERO_LANDING.x, 0, HERO_LANDING.z), []);

  useFrame((_, dt) => {
    const g = ref.current;
    if (!g) return;
    const k = smooth(0, 1, S.pull);
    spin.current = (spin.current + dt * 0.4 * (1 - k)) % (Math.PI * 2);
    const wrapped = spin.current > Math.PI ? spin.current - Math.PI * 2 : spin.current;
    g.position.lerpVectors(HERO_START, end, k);
    g.position.y += Math.sin(k * Math.PI) * 1.2;
    g.scale.setScalar(lerp(1, CLUSTER.scale, smooth(0, 0.85, S.pull)));
    g.rotation.set(0, lerp(wrapped, 0, k), 0);
  });

  return (
    <group ref={ref}>
      <GoldChair />
    </group>
  );
}

const ORBIT: { kind: ItemKind; r: number; y: number; speed: number; phase: number; s: number; depth: number }[] = [
  { kind: "speaker", r: 2.3, y: 0.9, speed: 0.32, phase: 0, s: 0.55, depth: 0.5 },
  { kind: "van", r: 3.1, y: -0.8, speed: 0.2, phase: 1.1, s: 0.5, depth: 1.1 },
  { kind: "plates", r: 2.0, y: 1.7, speed: 0.4, phase: 2.3, s: 0.6, depth: 0.3 },
  { kind: "linen", r: 2.7, y: -1.2, speed: 0.27, phase: 3.4, s: 0.6, depth: 0.8 },
  { kind: "lamp", r: 2.5, y: 0.1, speed: 0.36, phase: 4.4, s: 0.55, depth: 0.6 },
  { kind: "crate", r: 3.0, y: 1.3, speed: 0.24, phase: 5.4, s: 0.55, depth: 1.0 },
];

function OrbitItems({ S }: { S: StoryState }) {
  const group = useRef<THREE.Group>(null);
  const items = useRef<(THREE.Group | null)[]>([]);
  const pointer = useThree((s) => s.pointer);

  useFrame(({ clock }) => {
    const g = group.current;
    if (!g) return;
    const t = clock.elapsedTime;
    const intro = 1 - smooth(0, 0.55, S.pull);
    g.visible = intro > 0.001;
    if (!g.visible) return;

    g.position.copy(HERO_START).y += HERO_CENTER_OFFSET;
    g.rotation.x = lerp(g.rotation.x, -pointer.y * 0.12, 0.06);
    g.rotation.y = lerp(g.rotation.y, pointer.x * 0.22, 0.06);

    ORBIT.forEach((o, i) => {
      const it = items.current[i];
      if (!it) return;
      const a = o.phase + t * o.speed;
      const r = o.r * (1 + (1 - intro) * 1.4);
      it.position.set(
        Math.cos(a) * r + pointer.x * o.depth * 0.35,
        o.y + Math.sin(t * 0.8 + o.phase) * 0.18 + pointer.y * o.depth * 0.2,
        Math.sin(a) * r * 0.7
      );
      it.rotation.set(Math.sin(t * 0.5 + i) * 0.25, t * 0.6 + i, Math.cos(t * 0.4 + i) * 0.2);
      it.scale.setScalar(o.s * intro);
    });
  });

  return (
    <group ref={group}>
      {ORBIT.map((o, i) => {
        const Model = ITEM_MODELS[o.kind];
        return (
          <group key={o.kind} ref={(el) => void (items.current[i] = el)}>
            <group position={[0, -0.4, 0]}>
              <Model />
            </group>
          </group>
        );
      })}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Act 1 — idle chairs (instanced), props, tags, annotation            */
/* ------------------------------------------------------------------ */

function ChairCluster({ S }: { S: StoryState }) {
  const seat = useRef<THREE.InstancedMesh>(null);
  const back = useRef<THREE.InstancedMesh>(null);
  const legs = useRef<THREE.InstancedMesh>(null);
  const last = useRef(-1);
  const o = useMemo(() => new THREE.Object3D(), []);
  const n = clusterSpots.length;
  useLayoutEffect(() => {
    last.current = -1;
  }, []);
  const LEGS: [number, number][] = [
    [-0.4, -0.4],
    [0.4, -0.4],
    [-0.4, 0.4],
    [0.4, 0.4],
  ];

  useFrame(() => {
    const v = S.idle;
    if (!seat.current || !back.current || !legs.current || Math.abs(v - last.current) < 0.0005) return;
    last.current = v;
    clusterSpots.forEach((c, i) => {
      // The hero chair occupies the last slot.
      const pop = i === n - 1 ? 0 : backOut(clamp01((v * 1.5 - c.order * 0.5) / 0.35));
      const s = CLUSTER.scale * pop;
      o.rotation.set(0, 0, 0);

      o.position.set(c.x, 1.02 * s, c.z);
      o.scale.set(0.92 * s, 0.1 * s, 0.92 * s);
      o.updateMatrix();
      seat.current!.setMatrixAt(i, o.matrix);

      o.position.set(c.x, 1.7 * s, c.z - 0.42 * s);
      o.scale.set(0.9 * s, 1.2 * s, 0.08 * s);
      o.updateMatrix();
      back.current!.setMatrixAt(i, o.matrix);

      LEGS.forEach(([lx, lz], k) => {
        o.position.set(c.x + lx * s, 0.5 * s, c.z + lz * s);
        o.scale.set(0.05 * s, 1 * s, 0.05 * s);
        o.updateMatrix();
        legs.current!.setMatrixAt(i * 4 + k, o.matrix);
      });
    });
    seat.current.instanceMatrix.needsUpdate = true;
    back.current.instanceMatrix.needsUpdate = true;
    legs.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <>
      <instancedMesh ref={seat} args={[GEO.box, MAT.gold, n]} castShadow frustumCulled={false} />
      <instancedMesh ref={back} args={[GEO.box, MAT.gold, n]} castShadow frustumCulled={false} />
      <instancedMesh ref={legs} args={[GEO.cyl, MAT.gold, n * 4]} castShadow frustumCulled={false} />
    </>
  );
}

function PopIn({ S, delay, p, r = 0, s = 1, children }: { S: StoryState; delay: number; p: V3; r?: number; s?: number; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    const g = ref.current;
    if (!g) return;
    const k = backOut(clamp01((S.idle - delay) / 0.35));
    g.scale.setScalar(s * k);
    g.visible = k > 0.001;
  });
  return (
    <group ref={ref} position={p} rotation-y={r} scale={0}>
      {children}
    </group>
  );
}

function IdleProps({ S }: { S: StoryState }) {
  return (
    <>
      <PopIn S={S} delay={0.25} p={[3.2, 0, -2.2]} s={0.6}>
        <Van />
      </PopIn>
      <PopIn S={S} delay={0.4} p={[-1.5, 0, 2.3]} s={0.42}>
        <Speaker />
        <group position={[0, 1, 0]}>
          <Speaker />
        </group>
      </PopIn>
      <PopIn S={S} delay={0.5} p={[-2.6, 0, 2.3]} s={0.42} r={0.4}>
        <Lamp />
      </PopIn>
      {[
        [-5.6, -1.95],
        [-4.9, -1.95],
        [-5.25, -1.95],
      ].map(([x, z], i) => (
        <PopIn key={i} S={S} delay={0.55 + i * 0.05} p={[x, i === 2 ? 0.27 : 0, z]} s={0.42}>
          <Crate />
        </PopIn>
      ))}
    </>
  );
}

const pill =
  "pointer-events-none select-none whitespace-nowrap rounded-full border px-3 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.14em] shadow-[0_6px_20px_rgba(120,70,30,0.12)]";

const TAGS: { text: string; p: V3 }[] = [
  { text: "40 chairs · idle", p: [CLUSTER.x, 1.2, CLUSTER.z] },
  { text: "Reefer van · idle", p: [3.2, 1.5, -2.2] },
  { text: "Ballroom · free Tue", p: [BALLROOM.pos[0], roofTop(BALLROOM) + 0.7, BALLROOM.pos[1]] },
];

function Tags({ S }: { S: StoryState }) {
  const refs = useRef<(HTMLDivElement | null)[]>([]);
  const note = useRef<HTMLDivElement>(null);
  const arrow = useRef<SVGPathElement>(null);
  const head = useRef<SVGPathElement>(null);
  const noteText = useRef<HTMLSpanElement>(null);

  useFrame(() => {
    refs.current.forEach((el, i) => {
      if (!el) return;
      const a = clamp01(S.tags * 1.6 - i * 0.3);
      el.style.opacity = a.toFixed(3);
      el.style.transform = `translateY(${(1 - a) * 10}px) scale(${0.9 + a * 0.1})`;
    });
    const n = S.note;
    if (note.current) note.current.style.opacity = n > 0 ? "1" : "0";
    if (arrow.current) arrow.current.style.strokeDashoffset = String(160 * (1 - clamp01(n * 1.4)));
    if (head.current) head.current.style.opacity = n > 0.7 ? String(clamp01((n - 0.7) / 0.2)) : "0";
    if (noteText.current) noteText.current.style.clipPath = `inset(0 ${100 - clamp01((n - 0.15) / 0.6) * 100}% 0 0)`;
  });

  return (
    <>
      {TAGS.map((t, i) => (
        <Html key={t.text} position={t.p} center zIndexRange={[15, 0]}>
          <div
            ref={(el) => void (refs.current[i] = el)}
            style={{ opacity: 0 }}
            className={`${pill} border-marigold/50 bg-card/95 text-ink`}
          >
            <span className="mr-1.5 inline-block size-1.5 -translate-y-px rounded-full bg-marigold align-middle" />
            {t.text}
          </div>
        </Html>
      ))}
      <Html position={[CLUSTER.x + 1.9, 0.2, CLUSTER.z + 1.6]} zIndexRange={[15, 0]}>
        <div ref={note} style={{ opacity: 0 }} className="pointer-events-none relative select-none pl-2 pt-10">
          <span ref={noteText} className="block whitespace-nowrap font-hand text-2xl leading-none text-terracotta" style={{ clipPath: "inset(0 100% 0 0)" }}>
            sitting here since Sunday
          </span>
          <svg className="absolute -left-16 -top-6 overflow-visible" width="120" height="80" viewBox="0 0 120 80" fill="none" aria-hidden>
            <path
              ref={arrow}
              d="M92 58 C 70 56, 48 48, 36 32 S 16 10, 8 6"
              stroke="#D9653B"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeDasharray="160"
              strokeDashoffset="160"
            />
            <path ref={head} d="M20 4 L8 6 L12 18" stroke="#D9653B" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0 }} />
          </svg>
        </div>
      </Html>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Act 2 — rooftop request pulse                                       */
/* ------------------------------------------------------------------ */

function RooftopPulse({ S }: { S: StoryState }) {
  const rings = useRef<(THREE.Mesh | null)[]>([]);
  const geo = useMemo(() => new THREE.RingGeometry(0.9, 1, 64), []);
  const mats = useMemo(
    () =>
      [0, 1, 2].map(
        () => new THREE.MeshBasicMaterial({ color: C.pending, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide })
      ),
    []
  );

  useFrame(({ clock }) => {
    const a = S.ui2 * (1 - S.settle * 0.6);
    rings.current.forEach((m, i) => {
      if (!m) return;
      const ph = (clock.elapsedTime * 0.5 + i / 3) % 1;
      m.scale.setScalar(0.4 + ph * 2.4);
      mats[i].opacity = a * (1 - ph) * 0.8;
      m.visible = a > 0.001;
    });
  });

  return (
    <group position={[CATERER.pos[0] - 0.4, CATERER.h + 0.1, CATERER.pos[1] + 0.3]} rotation-x={-Math.PI / 2}>
      {mats.map((m, i) => (
        <mesh key={i} ref={(el) => void (rings.current[i] = el)} geometry={geo} material={m} />
      ))}
    </group>
  );
}


/* ================================================================== */
/* Act 3 — 02:00 PM MATCH                                              */
/* ================================================================== */

const PROVIDERS = MATCHES.map((m) => BY_ID[m.building]);
const VENUE = BALLROOM;

/** Screen-space (canvas px) position of each ranked provider's roof. */
export interface ScreenAnchor {
  x: number;
  y: number;
}

const fx = (color: string, opacity = 0) =>
  new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });

function AnchorProjector({ anchors }: { anchors: ScreenAnchor[] }) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const v = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    PROVIDERS.forEach((b, i) => {
      v.set(b.pos[0], roofTop(b) + 0.4, b.pos[1]).project(camera);
      const a = anchors[i] ?? (anchors[i] = { x: 0, y: 0 });
      a.x = ((v.x + 1) / 2) * size.width;
      a.y = ((1 - v.y) / 2) * size.height;
    });
  });
  return null;
}

function RadarSweep({ S }: { S: StoryState }) {
  const group = useRef<THREE.Group>(null);
  const ring = useRef<THREE.Mesh>(null);
  const echo = useRef<THREE.Mesh>(null);
  const wedge = useRef<THREE.Mesh>(null);
  const disc = useRef<THREE.Mesh>(null);
  const geo = useMemo(
    () => ({
      ring: new THREE.RingGeometry(0.965, 1, 128),
      wedge: new THREE.RingGeometry(0, 1, 48, 1, 0, 0.6),
      disc: new THREE.CircleGeometry(1, 96),
    }),
    []
  );
  const mats = useMemo(
    () => ({ ring: fx(C.peacock), echo: fx(C.peacock), wedge: fx(C.peacock), disc: fx(C.peacock) }),
    []
  );

  useFrame(() => {
    const r = S.radar;
    const g = group.current;
    if (!g) return;
    g.visible = r > 0.001 && r < 0.999;
    if (!g.visible) return;
    const R = lerp(0.6, 24, r);
    const fade = Math.pow(1 - r, 0.6);
    ring.current?.scale.setScalar(R);
    echo.current?.scale.setScalar(R * 0.82);
    wedge.current?.scale.setScalar(R);
    disc.current?.scale.setScalar(R);
    if (wedge.current) wedge.current.rotation.z = r * Math.PI * 4;
    mats.ring.opacity = 0.9 * fade;
    mats.echo.opacity = 0.4 * fade;
    mats.wedge.opacity = 0.2 * fade;
    mats.disc.opacity = 0.07 * fade;
  });

  return (
    <group ref={group} position={[CATERER.pos[0], 0.06, CATERER.pos[1]]} rotation-x={-Math.PI / 2} visible={false}>
      <mesh ref={disc} geometry={geo.disc} material={mats.disc} />
      <mesh ref={wedge} geometry={geo.wedge} material={mats.wedge} />
      <mesh ref={echo} geometry={geo.ring} material={mats.echo} />
      <mesh ref={ring} geometry={geo.ring} material={mats.ring} />
    </group>
  );
}

function ProviderGlow({ S }: { S: StoryState }) {
  const shells = useMemo(
    () =>
      PROVIDERS.map((b) => {
        const size: V3 = [b.w + 0.16, b.h + 0.14, b.d + 0.16];
        return {
          b,
          size,
          fill: fx(C.peacock),
          edge: new THREE.LineBasicMaterial({ color: C.peacock, transparent: true, opacity: 0 }),
          edges: new THREE.EdgesGeometry(new THREE.BoxGeometry(...size)),
        };
      }),
    []
  );

  useFrame(({ clock }) => {
    shells.forEach((s, i) => {
      const k = smooth(0, 1, clamp01((S.glow - i * 0.16) / 0.25));
      const pulse = 0.85 + 0.15 * Math.sin(clock.elapsedTime * 3 + i);
      s.fill.opacity = k * 0.3 * pulse;
      s.edge.opacity = k;
    });
  });

  return (
    <>
      {shells.map(({ b, size, fill, edge, edges }) => (
        <group key={b.id} position={[b.pos[0], b.h / 2 + 0.03, b.pos[1]]}>
          <mesh geometry={GEO.box} material={fill} scale={size} />
          <lineSegments geometry={edges} material={edge} />
        </group>
      ))}
    </>
  );
}

/* ================================================================== */
/* Act 4 — 05:30 PM MOVE                                               */
/* ================================================================== */

const VAN_ROUTES: V3[][] = [
  // from #1 (residency, east) all the way along the main road
  [
    [5.8, 0, -2.3],
    [6.3, 0, -0.55],
    [3, 0, -0.55],
    [0, 0, -0.55],
    [-3.2, 0, -0.55],
    [-4.6, 0, 0.15],
    [-4.5, 0, 1.9],
  ],
  // from #2 (cinema) — short hop
  [
    [-0.9, 0, 2.3],
    [-0.15, 0, 0.55],
    [-1.8, 0, 0.55],
    [-3.0, 0, 0.55],
    [-3.55, 0, 1.15],
    [-3.35, 0, 1.95],
  ],
];

function MovingVans({ S }: { S: StoryState }) {
  const refs = useRef<(THREE.Group | null)[]>([]);
  const curves = useMemo(
    () => VAN_ROUTES.map((pts) => new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)), false, "centripetal")),
    []
  );
  const tan = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    curves.forEach((curve, i) => {
      const g = refs.current[i];
      if (!g) return;
      const k = clamp01((S.drive - i * 0.12) / 0.85);
      const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      const pop = backOut(clamp01(S.drive * 8));
      g.visible = pop > 0.001;
      curve.getPointAt(e, g.position);
      curve.getTangentAt(Math.min(0.999, Math.max(0.001, e)), tan);
      g.rotation.y = Math.atan2(-tan.z, tan.x);
      g.scale.setScalar(0.45 * pop);
    });
  });

  return (
    <>
      {curves.map((_, i) => (
        <group key={i} ref={(el) => void (refs.current[i] = el)} visible={false}>
          <Van />
        </group>
      ))}
    </>
  );
}

const ARC_TUBULAR = 96;
const ARC_RADIAL = 8;
const ARC_CHAIRS = 5;

function arcTo(from: DecoSpec, side: number) {
  const a = new THREE.Vector3(from.pos[0], roofTop(from) + 0.25, from.pos[1]);
  const b = new THREE.Vector3(VENUE.pos[0] + side * 0.9, roofTop(VENUE) + 0.15, VENUE.pos[1]);
  const mid = a.clone().lerp(b, 0.5);
  mid.y += 3.5 + a.distanceTo(b) * 0.22;
  return new THREE.QuadraticBezierCurve3(a, mid, b);
}

function ChairArcs({ S }: { S: StoryState }) {
  const arcs = useMemo(
    () =>
      [PROVIDERS[0], PROVIDERS[1]].map((b, i) => {
        const curve = arcTo(b, i === 0 ? 1 : -1);
        return {
          curve,
          core: new THREE.TubeGeometry(curve, ARC_TUBULAR, 0.045, ARC_RADIAL, false),
          halo: new THREE.TubeGeometry(curve, ARC_TUBULAR, 0.15, ARC_RADIAL, false),
        };
      }),
    []
  );
  const mats = useMemo(() => ({ core: fx(C.marigold, 0.95), halo: fx(C.marigold, 0.18) }), []);
  const seat = useRef<THREE.InstancedMesh>(null);
  const back = useRef<THREE.InstancedMesh>(null);
  const o = useMemo(() => new THREE.Object3D(), []);
  const v = useMemo(() => new THREE.Vector3(), []);
  const n = arcs.length * ARC_CHAIRS;

  useFrame(() => {
    const fade = 1 - smooth(0, 0.6, S.lights);
    mats.core.opacity = 0.95 * fade;
    mats.halo.opacity = 0.18 * fade;

    arcs.forEach((arc, i) => {
      const reveal = clamp01((S.arcs - i * 0.1) / 0.45);
      const count = Math.floor(reveal * ARC_TUBULAR) * ARC_RADIAL * 6;
      arc.core.setDrawRange(0, count);
      arc.halo.setDrawRange(0, count);

      for (let j = 0; j < ARC_CHAIRS; j++) {
        const t = clamp01((S.arcs - i * 0.1 - 0.15 - j * 0.08) / 0.45);
        const idx = i * ARC_CHAIRS + j;
        const s = t > 0 && t < 1 ? 0.24 * Math.pow(Math.sin(Math.PI * t), 0.25) : 0;
        arc.curve.getPoint(t, v);
        o.rotation.set(0, t * Math.PI * 2, 0);

        o.position.set(v.x, v.y + 1.02 * s, v.z);
        o.scale.set(0.92 * s, 0.1 * s, 0.92 * s);
        o.updateMatrix();
        seat.current?.setMatrixAt(idx, o.matrix);

        o.position.set(v.x, v.y + 1.6 * s, v.z);
        o.scale.set(0.9 * s, 1.1 * s, 0.08 * s);
        o.translateZ(-0.42 * s);
        o.updateMatrix();
        back.current?.setMatrixAt(idx, o.matrix);
      }
    });
    if (seat.current) seat.current.instanceMatrix.needsUpdate = true;
    if (back.current) back.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <>
      {arcs.map((a, i) => (
        <group key={i}>
          <mesh geometry={a.halo} material={mats.halo} />
          <mesh geometry={a.core} material={mats.core} />
        </group>
      ))}
      <instancedMesh ref={seat} args={[GEO.box, MAT.gold, n]} frustumCulled={false} />
      <instancedMesh ref={back} args={[GEO.box, MAT.gold, n]} frustumCulled={false} />
    </>
  );
}

const PORTER_SHIRTS = [C.terracotta, C.peacock, C.rose, C.pending, C.marigold, C.powder];
const PORTERS = PORTER_SHIRTS.map((shirt, i) => ({
  phi0: -1.0 + i * 0.085,
  phi1: -0.25 + i * 0.085,
  r: MD.roadOut + 0.45 + (i % 2) * 0.5,
  shirt: new THREE.Color(shirt),
  delay: i * 0.05,
}));

function Porters({ S }: { S: StoryState }) {
  const body = useRef<THREE.InstancedMesh>(null);
  const head = useRef<THREE.InstancedMesh>(null);
  const seat = useRef<THREE.InstancedMesh>(null);
  const back = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => new THREE.CapsuleGeometry(0.07, 0.16, 4, 10), []);
  const mats = useMemo(() => ({ body: std("#ffffff", { roughness: 0.8 }), skin: std("#C68B63") }), []);
  const o = useMemo(() => new THREE.Object3D(), []);
  const n = PORTERS.length;

  useLayoutEffect(() => {
    PORTERS.forEach((p, i) => body.current?.setColorAt(i, p.shirt));
    if (body.current?.instanceColor) body.current.instanceColor.needsUpdate = true;
  }, []);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    PORTERS.forEach((p, i) => {
      const k = clamp01((S.walk - p.delay) / 0.7);
      const vis = S.walk > 0.001 ? backOut(clamp01(S.walk * 10)) : 0;
      const phi = lerp(p.phi0, p.phi1, k);
      const x = MD_CENTER[0] + p.r * Math.cos(phi);
      const z = MD_CENTER[2] - p.r * Math.sin(phi);
      const heading = Math.atan2(Math.cos(phi), -Math.sin(phi));
      const bob = Math.abs(Math.sin((k * 34 + i) * Math.PI)) * 0.05 + Math.sin(t * 2 + i) * 0.004;
      const set = (mesh: THREE.InstancedMesh | null, y: number, sx: number, sy: number, sz: number, dz = 0) => {
        if (!mesh) return;
        o.position.set(x, y + bob, z);
        o.rotation.set(0, heading, 0);
        o.scale.set(sx * vis, sy * vis, sz * vis);
        if (dz) o.translateX(dz * vis);
        o.updateMatrix();
        mesh.setMatrixAt(i, o.matrix);
      };
      set(body.current, 0.15 * vis, 1, 1, 1);
      set(head.current, 0.37 * vis, 0.06, 0.06, 0.06);
      set(seat.current, 0.49 * vis, 0.2, 0.025, 0.2);
      set(back.current, 0.57 * vis, 0.025, 0.16, 0.2, -0.09);
    });
    [body, head, seat, back].forEach((m) => {
      if (m.current) m.current.instanceMatrix.needsUpdate = true;
    });
  });

  return (
    <>
      <instancedMesh ref={body} args={[geo, mats.body, n]} castShadow frustumCulled={false} />
      <instancedMesh ref={head} args={[GEO.sphere, mats.skin, n]} castShadow frustumCulled={false} />
      <instancedMesh ref={seat} args={[GEO.box, MAT.gold, n]} frustumCulled={false} />
      <instancedMesh ref={back} args={[GEO.box, MAT.gold, n]} frustumCulled={false} />
    </>
  );
}

/* ================================================================== */
/* Act 5 — 08:00 PM THE EVENT                                          */
/* ================================================================== */

const LAWN_EDGE_Z = VENUE.pos[1] + VENUE.d / 2 + 0.03;
const POLE_Z = LAWN_EDGE_Z + 3.4;
const POLE_H = 2.4;
const STRAND_XS = [-1.7, 0, 1.7].map((dx) => VENUE.pos[0] + dx);
const STRANDS: [V3, V3][] = [
  ...STRAND_XS.map((x): [V3, V3] => [
    [x, VENUE.h - 0.05, LAWN_EDGE_Z],
    [x + 0.2, POLE_H, POLE_Z],
  ]),
  [
    [STRAND_XS[0] + 0.2, POLE_H, POLE_Z],
    [STRAND_XS[2] + 0.2, POLE_H, POLE_Z],
  ],
  [
    [STRAND_XS[0], VENUE.h - 0.05, LAWN_EDGE_Z],
    [STRAND_XS[2] + 0.2, POLE_H, POLE_Z],
  ],
];
const BULBS_PER_STRAND = 13;
const SAG = 0.42;

function catenary(a: V3, b: V3, t: number, out: THREE.Vector3) {
  out.set(lerp(a[0], b[0], t), lerp(a[1], b[1], t) - SAG * 4 * t * (1 - t), lerp(a[2], b[2], t));
  return out;
}

function StringLights({ S }: { S: StoryState }) {
  const bulbs = useRef<THREE.InstancedMesh>(null);
  const poles = useRef<THREE.Group>(null);
  const lights = useRef<(THREE.PointLight | null)[]>([]);
  const hall = useRef<THREE.PointLight>(null);
  const last = useRef(-1);
  const col = useMemo(() => ({ off: new THREE.Color("#6B5A48"), on: new THREE.Color("#FFE3A0"), tmp: new THREE.Color() }), []);

  const { wires, wireMat, count } = useMemo(() => {
    const wireMat = new THREE.LineBasicMaterial({ color: "#3B2E27", transparent: true, opacity: 0 });
    const v = new THREE.Vector3();
    const wires = STRANDS.map(([a, b]) => {
      const pts = Array.from({ length: 24 }, (_, i) => catenary(a, b, i / 23, v).clone());
      return new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), wireMat);
    });
    return { wires, wireMat, count: STRANDS.length * BULBS_PER_STRAND };
  }, []);

  const lightSpots = useMemo(() => {
    const v = new THREE.Vector3();
    return [0, 1, 2, 3].map((i) => catenary(STRANDS[i][0], STRANDS[i][1], 0.5, v).clone());
  }, []);

  useLayoutEffect(() => {
    const mesh = bulbs.current;
    if (!mesh) return;
    const o = new THREE.Object3D();
    const v = new THREE.Vector3();
    STRANDS.forEach(([a, b], si) => {
      for (let k = 0; k < BULBS_PER_STRAND; k++) {
        const i = si * BULBS_PER_STRAND + k;
        catenary(a, b, (k + 0.5) / BULBS_PER_STRAND, v);
        o.position.copy(v);
        o.position.y -= 0.05;
        o.scale.setScalar(0.055);
        o.updateMatrix();
        mesh.setMatrixAt(i, o.matrix);
        mesh.setColorAt(i, col.off);
      }
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    last.current = -1;
  }, [col]);

  useFrame(() => {
    const k = S.lights;
    wireMat.opacity = clamp01(k * 3) * 0.7;
    if (poles.current) {
      const g = backOut(clamp01(k * 4));
      poles.current.scale.set(1, g, 1);
      poles.current.visible = g > 0.001;
    }
    lights.current.forEach((l) => {
      if (l) l.intensity = smooth(0.2, 1, k) * 3;
    });
    if (hall.current) hall.current.intensity = smooth(0, 0.7, k) * 6;

    const mesh = bulbs.current;
    if (mesh) mesh.visible = k > 0.001;
    if (!mesh || Math.abs(k - last.current) < 0.001) return;
    last.current = k;
    for (let i = 0; i < count; i++) {
      const order = (i % BULBS_PER_STRAND) / BULBS_PER_STRAND * 0.7 + Math.floor(i / BULBS_PER_STRAND) * 0.06;
      const on = clamp01((k * 1.4 - order) / 0.1);
      mesh.setColorAt(i, col.tmp.copy(col.off).lerp(col.on, on));
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return (
    <group>
      <group ref={poles} visible={false}>
        {STRAND_XS.map((x) => (
          <Part key={x} g={GEO.cyl} m={MAT.ink} p={[x + 0.2, POLE_H / 2, POLE_Z]} s={[0.035, POLE_H, 0.035]} />
        ))}
      </group>
      {wires.map((w, i) => (
        <primitive key={i} object={w} />
      ))}
      <instancedMesh ref={bulbs} args={[GEO.sphere, MAT.window, count]} frustumCulled={false} visible={false} />
      {lightSpots.map((p, i) => (
        <pointLight
          key={i}
          ref={(el) => void (lights.current[i] = el)}
          position={p}
          color="#FFC870"
          intensity={0}
          distance={6}
          decay={1.5}
        />
      ))}
      <pointLight ref={hall} position={[VENUE.pos[0], 1.6, LAWN_EDGE_Z + 1]} color="#FFB45C" intensity={0} distance={9} decay={1.4} />
    </group>
  );
}

const PETAL_COUNT = 180;

function Petals({ S }: { S: StoryState }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const specs = useMemo(() => {
    const rand = seeded(23);
    const colors = [C.marigold, C.terracotta, C.butter, "#F7C04A"].map((c) => new THREE.Color(c));
    return Array.from({ length: PETAL_COUNT }, (_, i) => ({
      x: VENUE.pos[0] + (rand() - 0.5) * 7,
      z: VENUE.pos[1] + 1.2 + (rand() - 0.25) * 6,
      off: rand(),
      speed: 0.12 + rand() * 0.1,
      sway: 0.2 + rand() * 0.35,
      phase: rand() * Math.PI * 2,
      spin: 0.8 + rand() * 2.2,
      order: i / PETAL_COUNT,
      color: colors[Math.floor(rand() * colors.length)],
    }));
  }, []);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, toneMapped: false }), []);
  const o = useMemo(() => new THREE.Object3D(), []);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    specs.forEach((p, i) => mesh.setColorAt(i, p.color));
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [specs]);

  useFrame(({ clock }) => {
    const mesh = ref.current;
    if (!mesh) return;
    const k = S.petals;
    mesh.visible = k > 0.001;
    if (!mesh.visible) return;
    const t = clock.elapsedTime;
    specs.forEach((p, i) => {
      const fall = (t * p.speed + p.off) % 1;
      const s = p.order < k ? 0.085 : 0;
      o.position.set(
        p.x + Math.sin(t * 0.9 + p.phase) * p.sway,
        7 * (1 - fall),
        p.z + Math.cos(t * 0.7 + p.phase) * p.sway * 0.6
      );
      o.rotation.set(t * p.spin, t * p.spin * 0.7, p.phase);
      o.scale.set(s, s * 0.6, s);
      o.updateMatrix();
      mesh.setMatrixAt(i, o.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });

  return <instancedMesh ref={ref} args={[GEO.plane, mat, PETAL_COUNT]} frustumCulled={false} visible={false} />;
}

/* ------------------------------------------------------------------ */
/* Lighting driven by time of day                                      */
/* ------------------------------------------------------------------ */

const DAY_GROUND = new THREE.Color("#E9C39A");
const NIGHT_GROUND = new THREE.Color("#4A2E3A");

function DayLight({ S }: { S: StoryState }) {
  const dir = useRef<THREE.DirectionalLight>(null);
  const hemi = useRef<THREE.HemisphereLight>(null);
  const scene = useThree((s) => s.scene);

  useFrame(() => {
    const sky = skyAt(S.p);
    const sun = sunAt(minutesAt(S.p));
    const az = lerp(-0.9, 2.6, sun.t);
    const el = Math.max(0.3, sun.elevation * 1.05);
    if (dir.current) {
      dir.current.position.set(Math.cos(az) * Math.cos(el) * 40, Math.sin(el) * 40, Math.sin(az) * Math.cos(el) * 40);
      dir.current.color.set(sky.light);
      dir.current.intensity = sky.lightI;
    }
    if (hemi.current) {
      hemi.current.color.set(sky.top);
      hemi.current.groundColor.copy(DAY_GROUND).lerp(NIGHT_GROUND, sun.night);
      hemi.current.intensity = sky.hemiI;
    }
    // Reflections from the studio environment would keep the city bright at night.
    scene.environmentIntensity = lerp(1, 0.12, sun.night);
  });

  return (
    <>
      <hemisphereLight ref={hemi} args={["#FFF6E5", "#E9C39A", 0.75]} />
      <directionalLight
        ref={dir}
        castShadow
        position={[20, 30, 10]}
        intensity={1.2}
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
        shadow-camera-near={1}
        shadow-camera-far={100}
      />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Camera                                                              */
/* ------------------------------------------------------------------ */

const SHOTS = {
  hero: { target: new THREE.Vector3(0, HERO_START.y + HERO_CENTER_OFFSET, 0), az: 0.78, pitch: 0.1 },
  block: { target: new THREE.Vector3(2.5, 2.2, 0.5), az: 0.72, pitch: 0.58 },
  roof: { target: new THREE.Vector3(CATERER.pos[0], CATERER.h + 0.5, CATERER.pos[1]), az: 0.6, pitch: 0.5 },
  venue: { target: new THREE.Vector3(VENUE.pos[0] + 0.6, 1.6, VENUE.pos[1] + 2.2), az: 0.95, pitch: 0.42 },
};

function CameraRig({ S }: { S: StoryState }) {
  const camera = useThree((s) => s.camera) as unknown as THREE.OrthographicCamera;
  const size = useThree((s) => s.size);
  const target = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ clock }) => {
    const a = smooth(0, 1, S.pull);
    const b = smooth(0, 1, S.roof);
    const c = smooth(0, 1, S.venue);
    target.lerpVectors(SHOTS.hero.target, SHOTS.block.target, a).lerp(SHOTS.roof.target, b).lerp(SHOTS.venue.target, c);
    const az =
      lerp(lerp(lerp(SHOTS.hero.az, SHOTS.block.az, a), SHOTS.roof.az, b), SHOTS.venue.az, c) +
      (S.p / 100) * 0.3 +
      Math.sin(clock.elapsedTime * 0.12) * 0.012;
    const pitch = lerp(lerp(lerp(SHOTS.hero.pitch, SHOTS.block.pitch, a), SHOTS.roof.pitch, b), SHOTS.venue.pitch, c);

    const R = 60;
    camera.position.set(
      target.x + Math.cos(pitch) * Math.cos(az) * R,
      target.y + Math.sin(pitch) * R,
      target.z + Math.cos(pitch) * Math.sin(az) * R
    );
    camera.lookAt(target);

    const zHero = size.height / 7;
    const zBlock = Math.min(size.width / 44, size.height / 27);
    const zRoof = Math.min(size.width / 17, size.height / 11);
    const zVenue = Math.min(size.width / 19, size.height / 12);
    const zoom = lerp(lerp(lerp(zHero, zBlock, a), zRoof, b), zVenue, c);
    if (Math.abs(camera.zoom - zoom) > 0.001) {
      camera.zoom = zoom;
      camera.updateProjectionMatrix();
    }
  });

  return null;
}

/* ------------------------------------------------------------------ */
/* Scene                                                               */
/* ------------------------------------------------------------------ */

function City({ S }: { S: StoryState }) {
  return (
    <>
      <Ground />
      <MarineDrive S={S} />
      {BUILDINGS.map((b) => (
        <DecoBuilding key={b.id} b={b} />
      ))}
      <Windows S={S} />
      <Trees />
      <ChairCluster S={S} />
      <IdleProps S={S} />
      <Tags S={S} />
      <RooftopPulse S={S} />
      {/* Act 3 */}
      <RadarSweep S={S} />
      <ProviderGlow S={S} />
      {/* Act 4 */}
      <MovingVans S={S} />
      <ChairArcs S={S} />
      <Porters S={S} />
      {/* Act 5 */}
      <StringLights S={S} />
      <Petals S={S} />
    </>
  );
}

export interface MumbaiSceneProps {
  S: StoryState;
  active: boolean;
  /** Filled every frame with the screen position of each ranked provider (act 3 cards fly from here). */
  anchors: ScreenAnchor[];
}

export default function MumbaiScene({ S, active, anchors }: MumbaiSceneProps) {
  return (
    <Canvas
      orthographic
      flat
      shadows="soft"
      dpr={[1, 1.5]}
      frameloop={active ? "always" : "never"}
      camera={{ position: [40, 30, 40], zoom: 40, near: 0.1, far: 300 }}
      gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
      style={{ position: "absolute", inset: 0 }}
      aria-hidden
    >
      <Environment resolution={128} frames={1}>
        <color attach="background" args={["#F6DCC0"]} />
        <Lightformer form="rect" intensity={3} color="#FFF3DC" position={[0, 6, -6]} scale={[12, 4, 1]} />
        <Lightformer form="rect" intensity={2} color="#F7B27A" position={[-6, 2, 4]} rotation-y={Math.PI / 2} scale={[8, 3, 1]} />
        <Lightformer form="ring" intensity={4} color="#FFFFFF" position={[4, 5, 4]} scale={2} />
      </Environment>

      <DayLight S={S} />
      <CameraRig S={S} />
      <City S={S} />
      <HeroChair S={S} />
      <OrbitItems S={S} />
      <AnchorProjector anchors={anchors} />
    </Canvas>
  );
}
