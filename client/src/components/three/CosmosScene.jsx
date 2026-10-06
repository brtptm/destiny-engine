import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Float, Line } from '@react-three/drei';

const GOLD = new THREE.Color('#e9bf6b');
const GOLD_SOFT = new THREE.Color('#f3cf88');
const WHITE = new THREE.Color('#f2f0eb');

/** Soft round sprite used for stars and glows (generated once, no network). */
function useGlowTexture() {
  return useMemo(() => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(0.25, 'rgba(255,255,255,0.55)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
}

function Starfield({ count = 1800, radius = 60 }) {
  const ref = useRef();
  const tex = useGlowTexture();
  const { positions, colors } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = radius * (0.35 + Math.random() * 0.65);
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      positions.set([r * Math.sin(ph) * Math.cos(th), r * Math.sin(ph) * Math.sin(th), r * Math.cos(ph) - 10], i * 3);
      const c = Math.random() < 0.12 ? GOLD : WHITE;
      const dim = 0.35 + Math.random() * 0.65;
      colors.set([c.r * dim, c.g * dim, c.b * dim], i * 3);
    }
    return { positions, colors };
  }, [count, radius]);
  useFrame((_, dt) => { if (ref.current) { ref.current.rotation.y += dt * 0.008; ref.current.rotation.x += dt * 0.002; } });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.32} map={tex} vertexColors transparent depthWrite={false} blending={THREE.AdditiveBlending} sizeAttenuation />
    </points>
  );
}

function starShape(r) {
  const k = r * 0.3;
  const s = new THREE.Shape();
  const pts = [[0, r], [k, k], [r, 0], [k, -k], [0, -r], [-k, -k], [-r, 0], [-k, k]];
  s.moveTo(...pts[0]);
  pts.slice(1).forEach((p) => s.lineTo(...p));
  s.closePath();
  return s;
}

function StarNode({ position, milestone, lit, current, glow, index }) {
  const geo = useMemo(() => new THREE.ExtrudeGeometry(starShape(milestone ? 0.42 : 0.2), {
    depth: milestone ? 0.12 : 0.07, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.03, bevelSegments: 2,
  }).center(), [milestone]);
  const mesh = useRef();
  const halo = useRef();
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (mesh.current) mesh.current.rotation.y = Math.sin(t * 0.6 + index) * 0.6;
    if (halo.current && current) {
      const s = 1.6 + Math.sin(t * 2.2) * 0.35;
      halo.current.scale.setScalar(s);
      halo.current.material.opacity = 0.45 + Math.sin(t * 2.2) * 0.2;
    }
  });
  return (
    <Float speed={1.4 + (index % 3) * 0.3} rotationIntensity={0.25} floatIntensity={0.6} floatingRange={[-0.12, 0.12]}>
      <group position={position}>
        <mesh ref={mesh} geometry={geo}>
          <meshStandardMaterial
            color={lit ? GOLD : '#141417'} metalness={lit ? 0.55 : 0.85} roughness={lit ? 0.3 : 0.25}
            emissive={lit ? GOLD : '#000000'} emissiveIntensity={lit ? (current ? 1.5 : 1.0) : 0} toneMapped={!lit} />
        </mesh>
        {!lit && (
          <lineSegments>
            <edgesGeometry args={[geo]} />
            <lineBasicMaterial color={GOLD} transparent opacity={0.45} />
          </lineSegments>
        )}
        {lit && (
          <sprite ref={halo} scale={current ? 1.8 : milestone ? 1.5 : 0.9}>
            <spriteMaterial map={glow} color={GOLD_SOFT} transparent opacity={current ? 0.55 : 0.32} depthWrite={false} blending={THREE.AdditiveBlending} />
          </sprite>
        )}
      </group>
    </Float>
  );
}

/** Gold tube that "draws" the travelled part of the journey on mount. */
function TravelledPath({ curve, upTo }) {
  const ref = useRef();
  const geo = useMemo(() => new THREE.TubeGeometry(curve, 240, 0.028, 8, false), [curve]);
  const target = Math.floor(geo.index.count * upTo / 6) * 6;
  const drawn = useRef(0);
  useFrame((_, dt) => {
    if (!ref.current) return;
    drawn.current = Math.min(target, drawn.current + target * dt * 0.55);
    ref.current.geometry.setDrawRange(0, Math.floor(drawn.current / 6) * 6);
  });
  return (
    <mesh ref={ref} geometry={geo}>
      <meshBasicMaterial color={GOLD} toneMapped={false} />
    </mesh>
  );
}

function Constellation({ nodes = 8, progress = 1.6, milestones = [1, 3, 5, 7], offset = [3.2, 0.2, 0], scale = 1 }) {
  const glow = useGlowTexture();
  const { points, curve } = useMemo(() => {
    const pts = [];
    for (let i = 0; i < nodes; i++) {
      const t = i / (nodes - 1);
      pts.push(new THREE.Vector3(
        (-4.2 + t * 8.4) * scale,
        (Math.sin(t * Math.PI * 1.6 + 0.4) * 1.3 + (t - 0.5) * 1.6) * scale,
        (Math.cos(t * Math.PI * 1.2) * 1.8 - t * 1.2) * scale,
      ));
    }
    return { points: pts, curve: new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.5) };
  }, [nodes, scale]);
  const linePts = useMemo(() => curve.getPoints(200), [curve]);
  const group = useRef();
  useFrame((state) => {
    if (group.current) group.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.12) * 0.18 - 0.25;
  });
  const currentIdx = Math.floor(progress);
  return (
    <group ref={group} position={offset}>
      <Line points={linePts} color="#e9bf6b" lineWidth={1} dashed dashSize={0.08} gapSize={0.14} transparent opacity={0.35} />
      <TravelledPath curve={curve} upTo={progress / (nodes - 1)} />
      {points.map((p, i) => (
        <StarNode key={i} index={i} position={p} glow={glow} milestone={milestones.includes(i)} lit={i <= currentIdx} current={i === currentIdx} />
      ))}
    </group>
  );
}

/** Obsidian crystals with gold edges, drifting in the background. */
function Crystals({ items }) {
  return items.map(({ pos, size, shape, speed }, i) => {
    const Geo = shape === 'oct' ? 'octahedronGeometry' : 'icosahedronGeometry';
    return (
      <Float key={i} speed={speed} rotationIntensity={1.2} floatIntensity={1.4} floatingRange={[-0.3, 0.3]}>
        <group position={pos}>
          <mesh>
            <Geo args={[size, 0]} />
            <meshStandardMaterial color="#0d0d10" metalness={0.9} roughness={0.18} flatShading />
          </mesh>
          <lineSegments>
            <edgesGeometry args={[shape === 'oct' ? new THREE.OctahedronGeometry(size, 0) : new THREE.IcosahedronGeometry(size, 0)]} />
            <lineBasicMaterial color={GOLD} transparent opacity={0.55} />
          </lineSegments>
        </group>
      </Float>
    );
  });
}

/** Camera follows the pointer a little — depth without asking for interaction. */
function ParallaxRig({ strength = 0.6 }) {
  const { camera, pointer } = useThree();
  const base = useRef(camera.position.clone());
  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    const tx = base.current.x + pointer.x * strength + Math.sin(t * 0.15) * 0.15;
    const ty = base.current.y + pointer.y * strength * 0.6 + Math.cos(t * 0.12) * 0.1;
    camera.position.x += (tx - camera.position.x) * Math.min(1, dt * 2);
    camera.position.y += (ty - camera.position.y) * Math.min(1, dt * 2);
    camera.lookAt(0, 0, 0);
  });
  return null;
}

const VARIANTS = {
  hero: {
    camera: [0, 0, 11],
    constellation: { offset: [3.7, 0.4, 0], scale: 0.8, progress: 1.6 },
    crystals: [
      { pos: [-6.5, 3.2, -4], size: 0.55, shape: 'oct', speed: 1.1 },
      { pos: [7.2, -3.4, -3], size: 0.75, shape: 'ico', speed: 0.9 },
      { pos: [-2.4, -4.2, -6], size: 0.45, shape: 'ico', speed: 1.3 },
      { pos: [5.5, 4.2, -7], size: 0.4, shape: 'oct', speed: 1.2 },
    ],
    stars: 2000,
  },
  compact: {
    camera: [0, 0, 12.5],
    constellation: { offset: [0, 0.3, 0], scale: 0.62, progress: 3.4 },
    crystals: [
      { pos: [-3.6, 2.8, -3], size: 0.45, shape: 'oct', speed: 1.1 },
      { pos: [3.4, -2.9, -2], size: 0.55, shape: 'ico', speed: 0.9 },
    ],
    stars: 900,
  },
};

export default function CosmosScene({ variant = 'hero', progress, paused = false }) {
  const v = VARIANTS[variant];
  const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const frameloop = paused ? 'never' : reduced ? 'demand' : 'always';
  return (
    <Canvas
      frameloop={frameloop}
      dpr={[1, 1.75]}
      camera={{ position: v.camera, fov: 45, near: 0.1, far: 200 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      style={{ position: 'absolute', inset: 0 }}
      // Listen on the app root so parallax works even with copy layered above the canvas.
      eventSource={document.getElementById('root')}
      eventPrefix="client"
      aria-hidden="true"
    >
      <ambientLight intensity={0.35} />
      <directionalLight position={[5, 6, 8]} intensity={1.4} color="#fff3dc" />
      <pointLight position={[3, 1, 3]} intensity={18} distance={14} color="#e9bf6b" />
      <pointLight position={[-6, -3, 2]} intensity={6} distance={14} color="#8f8ad6" />
      <Starfield count={v.stars} />
      <Constellation {...v.constellation} progress={progress ?? v.constellation.progress} />
      <Crystals items={v.crystals} />
      {!reduced && <ParallaxRig strength={variant === 'hero' ? 0.7 : 0.4} />}
    </Canvas>
  );
}
