// src/components/logistics/bag/Bag3DModel.jsx
import { useRef, useEffect, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, RoundedBox, Html, AccumulativeShadows, RandomizedLight } from '@react-three/drei';
import * as THREE from 'three';
import { SKINS } from './bagSkins';

// Zone label anchors in world-space — left-side column for readability
const ZONE_ANCHORS = {
  top_lid:      [-0.68, 0.90, 0.0],
  main:         [-0.68, 0.18, 0.0],
  front_pocket: [-0.68, -0.30, 0.0],
  hip_belt:     [-0.68, -0.84, 0.0],
  side_pocket:  [-0.68, 0.54, 0.0],
};

// Per-skin palette overrides for the photorealistic build
const PHOTO_PALETTE = {
  tactical: {
    canvasHex:  '#1c2124',
    leatherHex: '#111416',
    buckleHex:  '#E67E22',
    envBg:      '#0a0d10',
    ambientInt: 0.45,
    rimColor:   '#ff9040',
  },
  heritage: {
    canvasHex:  '#2a3d1c',   // deep forest green — matches reference
    leatherHex: '#5c3018',   // rich dark leather
    buckleHex:  '#c8a040',   // worn brass
    envBg:      '#0d1108',
    ambientInt: 0.5,
    rimColor:   '#a07840',
  },
  desert: {
    canvasHex:  '#8a6830',   // sun-bleached khaki
    leatherHex: '#6b4220',   // tan leather
    buckleHex:  '#d4a843',   // bright brass
    envBg:      '#100e06',
    ambientInt: 0.55,
    rimColor:   '#e0b060',
  },
};

// Canvas weave texture — coarser, more pronounced than before
function makeCanvasTexture(hexColor, coarseness = 48) {
  const c = document.createElement('canvas');
  c.width = coarseness; c.height = coarseness;
  const ctx = c.getContext('2d');

  const r = parseInt(hexColor.slice(1,3),16);
  const g = parseInt(hexColor.slice(3,5),16);
  const b = parseInt(hexColor.slice(5,7),16);

  ctx.fillStyle = `rgb(${r},${g},${b})`;
  ctx.fillRect(0,0,coarseness,coarseness);

  const step = 4;
  // Warp (horizontal bands — slightly lighter)
  for (let y = 0; y < coarseness; y += step*2) {
    ctx.fillStyle = `rgba(255,255,255,0.06)`;
    ctx.fillRect(0, y, coarseness, step);
    ctx.fillStyle = `rgba(0,0,0,0.14)`;
    ctx.fillRect(0, y+step, coarseness, step);
  }
  // Weft (vertical bands — subtle cross)
  for (let x = 0; x < coarseness; x += step*2) {
    ctx.fillStyle = `rgba(0,0,0,0.09)`;
    ctx.fillRect(x, 0, step, coarseness);
  }
  // Micro noise
  for (let i = 0; i < 300; i++) {
    const px = Math.random()*coarseness|0, py = Math.random()*coarseness|0;
    ctx.fillStyle = `rgba(0,0,0,${(Math.random()*0.12).toFixed(3)})`;
    ctx.fillRect(px, py, 1, 1);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(10, 10);
  tex.anisotropy = 8;
  return tex;
}

// Leather bump texture
function makeLeatherTexture(hexColor) {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  const ctx = c.getContext('2d');
  const r = parseInt(hexColor.slice(1,3),16);
  const g = parseInt(hexColor.slice(3,5),16);
  const b = parseInt(hexColor.slice(5,7),16);
  ctx.fillStyle = `rgb(${r},${g},${b})`;
  ctx.fillRect(0,0,64,64);
  // Leather grain lines
  for (let i = 0; i < 40; i++) {
    const y = Math.random()*64;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(16, y+(Math.random()*3-1.5), 48, y+(Math.random()*3-1.5), 64, y+(Math.random()*2-1));
    ctx.strokeStyle = `rgba(0,0,0,${(Math.random()*0.2+0.05).toFixed(3)})`;
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 4);
  return tex;
}

function useMaterials(palette) {
  return useMemo(() => {
    const canvasTex  = makeCanvasTexture(palette.canvasHex);
    const leatherTex = makeLeatherTexture(palette.leatherHex);

    // Main canvas body — MeshPhysicalMaterial with sheen for cloth look
    const canvas = new THREE.MeshPhysicalMaterial({
      color: palette.canvasHex,
      roughness: 0.94,
      metalness: 0.0,
      map: canvasTex,
      sheen: 0.35,
      sheenRoughness: 0.85,
      sheenColor: new THREE.Color(palette.canvasHex).multiplyScalar(1.4),
    });

    // Leather straps — clearcoat for worn shine
    const leather = new THREE.MeshPhysicalMaterial({
      color: palette.leatherHex,
      roughness: 0.62,
      metalness: 0.0,
      map: leatherTex,
      clearcoat: 0.25,
      clearcoatRoughness: 0.55,
    });

    // Buckles — polished metal
    const buckle = new THREE.MeshPhysicalMaterial({
      color: palette.buckleHex,
      roughness: 0.28,
      metalness: 0.88,
      clearcoat: 0.6,
      clearcoatRoughness: 0.2,
    });

    // Front pocket — slightly darker canvas
    const pocket = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(palette.canvasHex).multiplyScalar(0.78),
      roughness: 0.96,
      metalness: 0.0,
      map: canvasTex,
      sheen: 0.2,
      sheenRoughness: 0.9,
    });

    // Zipper tape / accent seams
    const seam = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(palette.leatherHex).multiplyScalar(0.7),
      roughness: 0.8,
      metalness: 0.0,
    });

    return { canvas, leather, buckle, pocket, seam };
  }, [palette]);
}

// Generic bag mesh driven by bagType.geometry — used for all non-backpack types
function BagMesh({ bagType, mat }) {
  const { geometry } = bagType;

  return (
    <group>
      {/* Main body */}
      <RoundedBox
        args={[geometry.body.w, geometry.body.h, geometry.body.d]}
        radius={geometry.body.radius ?? 0.05}
        smoothness={4}
      >
        <primitive object={mat.canvas} attach="material" />
      </RoundedBox>

      {/* Lid (if defined) */}
      {geometry.lid && (
        <RoundedBox
          args={[geometry.lid.w, geometry.lid.h, geometry.lid.d]}
          radius={0.04}
          smoothness={4}
          position={geometry.lid.position}
        >
          <primitive object={mat.canvas} attach="material" />
        </RoundedBox>
      )}

      {/* Pockets */}
      {geometry.pockets?.map((pocket) => (
        <RoundedBox
          key={pocket.label}
          args={[pocket.w, pocket.h, pocket.d]}
          radius={0.03}
          smoothness={3}
          position={pocket.position}
        >
          <primitive object={mat.leather} attach="material" />
        </RoundedBox>
      ))}

      {/* Handles */}
      {geometry.handles?.map((handle, i) => {
        if (handle.type === 'bar') return (
          <mesh key={i} position={handle.position}>
            <boxGeometry args={[0.28, 0.06, 0.06]} />
            <primitive object={mat.leather} attach="material" />
          </mesh>
        );
        if (handle.type === 'arc') return (
          <mesh key={i} position={handle.position}>
            <torusGeometry args={[0.18, 0.03, 8, 20, Math.PI]} />
            <primitive object={mat.leather} attach="material" />
          </mesh>
        );
        if (handle.type === 'telescoping') return (
          <group key={i} position={handle.position}>
            <mesh position={[-0.12, 0, 0]}>
              <boxGeometry args={[0.04, 0.45, 0.04]} />
              <primitive object={mat.buckle} attach="material" />
            </mesh>
            <mesh position={[0.12, 0, 0]}>
              <boxGeometry args={[0.04, 0.45, 0.04]} />
              <primitive object={mat.buckle} attach="material" />
            </mesh>
            <mesh position={[0, 0.22, 0]}>
              <boxGeometry args={[0.28, 0.06, 0.04]} />
              <primitive object={mat.leather} attach="material" />
            </mesh>
          </group>
        );
        if (handle.type === 'wheel') return (
          <mesh key={i} position={handle.position} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.07, 0.07, 0.05, 12]} />
            <primitive object={mat.buckle} attach="material" />
          </mesh>
        );
        if (handle.type === 'strap') return (
          <mesh key={i} position={handle.position}>
            <boxGeometry args={[0.08, 0.80, 0.02]} />
            <primitive object={mat.leather} attach="material" />
          </mesh>
        );
        return null;
      })}
    </group>
  );
}

// Generic bag wrapper with auto-rotate + drag-to-pause, passes materials to BagMesh
function GenericBagMesh({ bagType, palette, zoneMap, packed, onZoneClick }) {
  const groupRef   = useRef();
  const isDragging = useRef(false);
  const mat        = useMaterials(palette);

  useFrame((_, delta) => {
    if (!isDragging.current && groupRef.current) {
      groupRef.current.rotation.y += delta * 0.28;
    }
  });

  useEffect(() => {
    const dn = () => { isDragging.current = true; };
    const up = () => { isDragging.current = false; };
    window.addEventListener('pointerdown', dn);
    window.addEventListener('pointerup',   up);
    return () => {
      window.removeEventListener('pointerdown', dn);
      window.removeEventListener('pointerup',   up);
    };
  }, []);

  // Derive zone anchors from bagType zones so Html labels follow the model
  const zones = bagType.zones ?? {};
  const accentColor = palette.buckleHex;

  return (
    <group ref={groupRef} position={[0.1, 0, 0]}>
      <BagMesh bagType={bagType} mat={mat} />

      {/* Zone Html overlays */}
      {Object.entries(zones).map(([zone], idx) => {
        const items = zoneMap?.[zone] ?? [];
        const packedCount = items.filter(i => packed?.[i.id]).length;
        // Spread labels evenly up the left side of the viewport
        const yStep = 0.55;
        const yStart = ((Object.keys(zones).length - 1) * yStep) / 2;
        const pos = [-0.72, yStart - idx * yStep, 0.0];
        return (
          <Html key={zone} position={pos} center>
            <button
              onClick={() => onZoneClick?.(zone)}
              style={{
                background: 'rgba(8,10,12,0.88)',
                border: `1px solid ${accentColor}`,
                borderRadius: 4,
                padding: '2px 8px',
                fontSize: 8,
                color: accentColor,
                fontFamily: 'JetBrains Mono, monospace',
                letterSpacing: '0.07em',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                lineHeight: 1.7,
                pointerEvents: 'auto',
                boxShadow: `0 0 6px ${accentColor}33`,
              }}
            >
              {zone.replace(/_/g, ' ').toUpperCase()}
              <span style={{ opacity: 0.6, marginLeft: 4 }}>{packedCount}/{items.length}</span>
            </button>
          </Html>
        );
      })}
    </group>
  );
}

function BackpackMesh({ palette, zoneMap, packed, onZoneClick }) {
  const groupRef  = useRef();
  const isDragging = useRef(false);
  const mat = useMaterials(palette);

  useFrame((_, delta) => {
    if (!isDragging.current && groupRef.current) {
      groupRef.current.rotation.y += delta * 0.28;
    }
  });

  useEffect(() => {
    const dn = () => { isDragging.current = true; };
    const up = () => { isDragging.current = false; };
    window.addEventListener('pointerdown', dn);
    window.addEventListener('pointerup',   up);
    return () => { window.removeEventListener('pointerdown', dn); window.removeEventListener('pointerup', up); };
  }, []);

  return (
    <group ref={groupRef} position={[0.1, 0, 0]}>

      {/* ── Main body ── deep canvas block */}
      <RoundedBox args={[1.02, 1.45, 0.66]} radius={0.07} smoothness={5} position={[0, 0, 0]}>
        <primitive object={mat.canvas} attach="material" />
      </RoundedBox>

      {/* Body side panels — slightly recessed for depth */}
      <mesh position={[0.50, 0, 0]}>
        <boxGeometry args={[0.03, 1.3, 0.60]} />
        <primitive object={mat.leather} attach="material" />
      </mesh>
      <mesh position={[-0.50, 0, 0]}>
        <boxGeometry args={[0.03, 1.3, 0.60]} />
        <primitive object={mat.leather} attach="material" />
      </mesh>

      {/* ── Top lid — raised flap with leather trim */}
      <RoundedBox args={[0.94, 0.24, 0.62]} radius={0.05} smoothness={4} position={[0, 0.845, 0]}>
        <primitive object={mat.canvas} attach="material" />
      </RoundedBox>
      {/* Lid leather trim edge */}
      <mesh position={[0, 0.845, 0.32]}>
        <boxGeometry args={[0.92, 0.24, 0.02]} />
        <primitive object={mat.leather} attach="material" />
      </mesh>
      {/* Lid compression strap */}
      <mesh position={[0, 0.845, 0.34]} rotation={[0,0,0]}>
        <boxGeometry args={[0.36, 0.045, 0.01]} />
        <primitive object={mat.leather} attach="material" />
      </mesh>

      {/* ── Front pocket — prominent with stitching */}
      <RoundedBox args={[0.74, 0.72, 0.17]} radius={0.045} smoothness={4} position={[0, -0.24, 0.415]}>
        <primitive object={mat.pocket} attach="material" />
      </RoundedBox>
      {/* Pocket zipper rail */}
      <mesh position={[0, 0.12, 0.505]}>
        <boxGeometry args={[0.74, 0.022, 0.018]} />
        <primitive object={mat.seam} attach="material" />
      </mesh>
      {/* Zipper pull tab */}
      <mesh position={[0.18, 0.12, 0.515]}>
        <boxGeometry args={[0.04, 0.06, 0.015]} />
        <primitive object={mat.buckle} attach="material" />
      </mesh>
      {/* Pocket leather trim bottom */}
      <mesh position={[0, -0.595, 0.415]}>
        <boxGeometry args={[0.72, 0.025, 0.16]} />
        <primitive object={mat.leather} attach="material" />
      </mesh>

      {/* ── Hip belt — thick padded bar */}
      <RoundedBox args={[1.34, 0.20, 0.42]} radius={0.05} smoothness={3} position={[0, -0.875, -0.04]}>
        <primitive object={mat.leather} attach="material" />
      </RoundedBox>
      {/* Hip belt pad insets */}
      {[-0.32, 0.32].map((x, i) => (
        <mesh key={i} position={[x, -0.875, 0.16]}>
          <boxGeometry args={[0.38, 0.16, 0.06]} />
          <primitive object={mat.canvas} attach="material" />
        </mesh>
      ))}

      {/* ── Side pocket (right) */}
      <RoundedBox args={[0.19, 0.56, 0.24]} radius={0.03} smoothness={3} position={[0.61, 0.14, 0.0]}>
        <primitive object={mat.pocket} attach="material" />
      </RoundedBox>
      <mesh position={[0.61, 0.42, 0.13]}>
        <boxGeometry args={[0.18, 0.022, 0.022]} />
        <primitive object={mat.seam} attach="material" />
      </mesh>

      {/* ── Shoulder straps — thick, padded */}
      {[[-0.23, 0.08], [0.23, -0.08]].map(([x, rz], i) => (
        <group key={i}>
          <mesh position={[x, 0.52, -0.26]} rotation={[0.18, 0, rz]}>
            <boxGeometry args={[0.11, 0.78, 0.08]} />
            <primitive object={mat.leather} attach="material" />
          </mesh>
          {/* Strap adjustment buckle */}
          <mesh position={[x, 0.18, -0.22]}>
            <boxGeometry args={[0.11, 0.04, 0.022]} />
            <primitive object={mat.buckle} attach="material" />
          </mesh>
        </group>
      ))}

      {/* ── Top carry handle — thick leather arch */}
      <mesh position={[0, 0.99, 0.04]}>
        <torusGeometry args={[0.13, 0.038, 10, 20, Math.PI]} />
        <primitive object={mat.leather} attach="material" />
      </mesh>

      {/* ── Main buckles — lid */}
      {[[-0.30, 0.73, 0.34], [0.30, 0.73, 0.34]].map((pos, i) => (
        <group key={i} position={pos}>
          <mesh>
            <boxGeometry args={[0.08, 0.062, 0.028]} />
            <primitive object={mat.buckle} attach="material" />
          </mesh>
          {/* Buckle frame hole */}
          <mesh position={[0, 0, 0.016]}>
            <boxGeometry args={[0.042, 0.028, 0.006]} />
            <primitive object={mat.seam} attach="material" />
          </mesh>
          {/* Strap below buckle */}
          <mesh position={[0, -0.12, 0.01]}>
            <boxGeometry args={[0.06, 0.18, 0.018]} />
            <primitive object={mat.leather} attach="material" />
          </mesh>
        </group>
      ))}

      {/* Hip belt buckles */}
      {[[-0.52, -0.875, 0.22], [0.52, -0.875, 0.22]].map((pos, i) => (
        <mesh key={i} position={pos}>
          <boxGeometry args={[0.075, 0.055, 0.026]} />
          <primitive object={mat.buckle} attach="material" />
        </mesh>
      ))}

      {/* ── Compression straps (side) */}
      {[0.44, -0.18].map((y, i) => (
        <mesh key={i} position={[0.515, y, 0.04]} rotation={[0, 0, Math.PI/2]}>
          <boxGeometry args={[0.045, 1.0, 0.032]} />
          <primitive object={mat.leather} attach="material" />
        </mesh>
      ))}

      {/* ── Decorative stitching lines on main body */}
      {[0.34, -0.34].map((y, i) => (
        <mesh key={i} position={[0, y, 0.335]}>
          <boxGeometry args={[0.88, 0.008, 0.004]} />
          <primitive object={mat.seam} attach="material" />
        </mesh>
      ))}

      {/* ── Zone Html overlays ── */}
      {Object.entries(ZONE_ANCHORS).map(([zone, pos]) => {
        const items = (zoneMap ?? {})[zone] ?? [];
        const packedCount = items.filter(i => (packed ?? {})[i.id]).length;
        const accentColor = palette.buckleHex;
        return (
          <Html key={zone} position={pos} center>
            <button
              onClick={() => onZoneClick?.(zone)}
              style={{
                background: 'rgba(8,10,12,0.88)',
                border: `1px solid ${accentColor}`,
                borderRadius: 4,
                padding: '2px 8px',
                fontSize: 8,
                color: accentColor,
                fontFamily: 'JetBrains Mono, monospace',
                letterSpacing: '0.07em',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                lineHeight: 1.7,
                pointerEvents: 'auto',
                boxShadow: `0 0 6px ${accentColor}33`,
              }}
            >
              {zone.replace(/_/g, ' ').toUpperCase()}
              <span style={{ opacity: 0.6, marginLeft: 4 }}>{packedCount}/{items.length}</span>
            </button>
          </Html>
        );
      })}
    </group>
  );
}

export default function Bag3DModel({ bagType, zoneMap, packed, activeSkin = 'tactical', onZoneClick }) {
  const palette = PHOTO_PALETTE[activeSkin] ?? PHOTO_PALETTE.tactical;
  const isBackpack = !bagType || bagType.id === 'backpack';

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', minHeight: 340 }}>
      <Canvas
        shadows
        camera={{ position: [0.4, 0.2, 3.1], fov: 40 }}
        style={{ background: 'transparent' }}
        gl={{ antialias: true, alpha: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.1 }}
      >
        {/* Three-point lighting — cinematic */}
        <ambientLight intensity={palette.ambientInt} color="#c8d4e0" />

        {/* Key light — warm from upper-right front */}
        <directionalLight
          position={[2.5, 4, 3.5]} intensity={1.4}
          color="#ffe8c8" castShadow
          shadow-mapSize={[1024, 1024]}
        />
        {/* Fill light — cooler from left */}
        <directionalLight position={[-3, 1, 2]} intensity={0.35} color="#c0d8ff" />
        {/* Rim/back light — separates bag from dark bg */}
        <pointLight position={[-1, 1.5, -2.5]} intensity={0.7} color={palette.rimColor} />
        {/* Bottom bounce */}
        <pointLight position={[0, -2, 1.5]} intensity={0.18} color="#a08060" />

        {isBackpack ? (
          <BackpackMesh
            palette={palette}
            zoneMap={zoneMap}
            packed={packed}
            onZoneClick={onZoneClick}
          />
        ) : (
          <GenericBagMesh
            bagType={bagType}
            palette={palette}
            zoneMap={zoneMap}
            packed={packed}
            onZoneClick={onZoneClick}
          />
        )}

        <OrbitControls
          enableZoom={false}
          enablePan={false}
          minPolarAngle={Math.PI / 6}
          maxPolarAngle={Math.PI / 1.5}
        />
      </Canvas>

      <div style={{
        position: 'absolute', bottom: 6, right: 10,
        fontSize: 8, color: '#444',
        fontFamily: 'JetBrains Mono, monospace',
        pointerEvents: 'none',
      }}>
        ↻ drag to spin
      </div>
    </div>
  );
}
