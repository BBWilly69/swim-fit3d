/**
 * AnalysisPool3D Component - Professional 5-Lane Analysis Pool
 *
 * A complete swimming pool environment for race analysis with:
 * - 5 competition lanes (2.5m each = 12.5m total width)
 * - Lane divider ropes with color-coded buoys (InstancedMesh for performance)
 * - Pool deck, starting blocks, and black bottom lines
 * - Swimming hall environment with windows, spectator stands, and timing display
 *
 * Based on the working SimpleLaneDemo implementation.
 *
 * @author Copilot
 * @version 1.0.0
 */

import React, { useState, useRef, useMemo, useEffect, useCallback, type JSX } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import {
  SimpleLaneSwimmer,
  type LengthData,
  type StrokeType,
  type SwimmerState,
} from './SimpleLaneSwimmer';

// ============================================================================
// CONFIGURATION CONSTANTS
// ============================================================================

/** Lane configuration for 5 competition lanes */
const LANE_CONFIG = {
  count: 5,
  width: 2.5, // FINA standard: 2.5m per lane
  totalWidth: 12.5, // 5 * 2.5m
  // X positions for each lane center (from left to right)
  positions: [-5.0, -2.5, 0.0, 2.5, 5.0],
};

/** Pool physical dimensions */
const POOL_CONFIG = {
  wallHeight: 1.5,
  wallThickness: 0.2,
  waterY: -0.2, // Water surface 30cm below deck level
  floorY: -1.8, // Pool depth: 1.5m below deck
  deckWidth: 2.0,
  deckHeight: 0.15,
  yOffset: 0.1, // Pool group offset
};

/** Lane rope buoy configuration */
const LANE_ROPE_CONFIG = {
  buoyRadius: 0.06,
  buoySpacing: 0.25, // Distance between buoys
  ropeRadius: 0.015,
  // Colors: red near walls (5m), yellow in middle, alternating
  redZoneStart: 0, // 0-5m from each end
  redZoneEnd: 5,
};

/** Swimming hall architecture configuration (based on Krokofit reference) */
const HALL_CONFIG = {
  // Main dimensions
  width: 22, // Total hall width
  extraLength: 8, // Extra length beyond pool
  wallHeight: 6, // Wall height (no roof)
  wallThickness: 0.25,
  
  // Window configuration (large glass front)
  window: {
    width: 3.0,
    height: 4.5,
    frameWidth: 0.12,
    spacing: 3.5,
    yOffset: 1.0, // Distance from floor
  },
  
  // Tribüne (spectator stands) configuration  
  tribune: {
    rows: 6,
    rowHeight: 0.45,
    rowDepth: 0.8,
    seatWidth: 0.5,
    seatSpacing: 0.55,
    seatBackHeight: 0.4,
  },
  
  // Lighting configuration
  lighting: {
    railHeight: 5.5,
    spotSpacing: 3.0,
    spotSize: 0.3,
  },
  
  // Floor tiles
  tileSize: 0.3,
  tileColor: '#e5e7eb',
  groutColor: '#d1d5db',
};

/** Swimmer Y positions per stroke type - 30cm deeper for wow effect water */
const SWIMMER_Y_BY_STROKE: Record<StrokeType, number> = {
  freestyle: -0.62,    // Knapp unter Wasseroberfläche bei waterY=-0.3
  breaststroke: -0.64, // Etwas tiefer für Brustschwimmen
  backstroke: -0.48,   // Rückenschwimmer sind höher (Kopf oben)
  butterfly: -0.65,    // Schmetterling taucht tiefer
};

/** Splash config per stroke (from SimpleLaneDemo) */
const SPLASH_CONFIG: Record<
  StrokeType,
  {
    hands: number;
    feet: number;
    foam: number;
    strokesPerCycle: number;
    handOffsetX: number;
    feetOffsetX: number;
    handEntryZ: number;
    feetZ: number;
    leftHandPhase: [number, number];
    rightHandPhase: [number, number];
    leftKickPhases: [number, number][];
    rightKickPhases: [number, number][];
  }
> = {
  breaststroke: {
    hands: 0.3,
    feet: 0.2,
    foam: 0.4,
    strokesPerCycle: 1,
    handOffsetX: 0.4,
    feetOffsetX: 0.12,
    handEntryZ: 0.7,
    feetZ: -0.8,
    leftHandPhase: [0.1, 0.2],
    rightHandPhase: [0.1, 0.2],
    leftKickPhases: [[0.6, 0.75]],
    rightKickPhases: [[0.6, 0.75]],
  },
  freestyle: {
    hands: 1.0,
    feet: 0.8,
    foam: 0.8,
    strokesPerCycle: 2,
    handOffsetX: 0.35,
    feetOffsetX: 0.12,
    handEntryZ: 0.8,
    feetZ: -0.7,
    leftHandPhase: [0.0, 0.12],
    rightHandPhase: [0.5, 0.62],
    leftKickPhases: [
      [0.1, 0.2],
      [0.6, 0.7],
    ],
    rightKickPhases: [
      [0.35, 0.45],
      [0.85, 0.95],
    ],
  },
  backstroke: {
    hands: 0.9,
    feet: 0.8,
    foam: 0.7,
    strokesPerCycle: 2,
    handOffsetX: 0.4,
    feetOffsetX: 0.12,
    handEntryZ: -0.5,
    feetZ: 0.6,
    leftHandPhase: [0.0, 0.12],
    rightHandPhase: [0.5, 0.62],
    leftKickPhases: [
      [0.1, 0.2],
      [0.6, 0.7],
    ],
    rightKickPhases: [
      [0.35, 0.45],
      [0.85, 0.95],
    ],
  },
  butterfly: {
    hands: 1.0,
    feet: 0.4,
    foam: 0.9,
    strokesPerCycle: 1,
    handOffsetX: 0.5,
    feetOffsetX: 0.1,
    handEntryZ: 0.9,
    feetZ: -0.8,
    leftHandPhase: [0.05, 0.18],
    rightHandPhase: [0.05, 0.18],
    leftKickPhases: [
      [0.2, 0.35],
      [0.7, 0.85],
    ],
    rightKickPhases: [
      [0.2, 0.35],
      [0.7, 0.85],
    ],
  },
};

// ============================================================================
// SWIMMER STATE MANAGEMENT
// ============================================================================

export interface LaneSwimmerData {
  laneIndex: number;
  lengthData: LengthData;
  color?: string;
  skinTone?: 'light' | 'medium' | 'tan' | 'dark';
  eyeColor?: 'green' | 'blue' | 'gray';
  swimsuitColor?: string;
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

/**
 * Camera position tracker for debug display
 */
function CameraTracker({ onUpdate }: { onUpdate: (pos: string) => void }) {
  const { camera } = useThree();
  useFrame(() => {
    const p = camera.position;
    onUpdate(`X:${p.x.toFixed(1)} Y:${p.y.toFixed(1)} Z:${p.z.toFixed(1)}`);
  });
  return null;
}

/**
 * Auto-advances through lengths/laps based on elapsed time
 */
function LengthAutoAdvance({
  isPlaying,
  speedMultiplier,
  lengths,
  currentLengthIndex,
  setCurrentLengthIndex,
  timelineProgress,
  setTimelineProgress,
  isDraggingTimeline,
}: {
  isPlaying: boolean;
  speedMultiplier: number;
  lengths: LengthData[];
  currentLengthIndex: number;
  setCurrentLengthIndex: (index: number) => void;
  timelineProgress: number;
  setTimelineProgress: (progress: number) => void;
  isDraggingTimeline: boolean;
}) {
  const elapsedRef = useRef(0);

  useEffect(() => {
    if (isDraggingTimeline) {
      const duration = lengths[currentLengthIndex]?.durationSeconds ?? 1;
      elapsedRef.current = timelineProgress * duration;
    }
  }, [timelineProgress, isDraggingTimeline, currentLengthIndex, lengths]);

  useEffect(() => {
    elapsedRef.current = 0;
    setTimelineProgress(0);
  }, [currentLengthIndex, setTimelineProgress]);

  useFrame((_, delta) => {
    if (isDraggingTimeline || lengths.length === 0) return;
    if (!isPlaying) return;

    elapsedRef.current += delta * speedMultiplier;
    const duration = lengths[currentLengthIndex]?.durationSeconds ?? 1;

    setTimelineProgress(Math.min(elapsedRef.current / duration, 1));

    if (elapsedRef.current >= duration) {
      if (currentLengthIndex >= lengths.length - 1) {
        elapsedRef.current = duration;
        setTimelineProgress(1);
        return;
      }

      elapsedRef.current = 0;
      setCurrentLengthIndex(currentLengthIndex + 1);
    }
  });

  return null;
}

// ============================================================================
// POOL FLOOR WITH CAUSTICS & TILES
// ============================================================================

/**
 * Pool floor with animated caustic light patterns and tile texture
 * Creates realistic underwater lighting effects
 */
function CausticsPoolFloor({
  width,
  length,
  floorY,
}: {
  width: number;
  length: number;
  floorY: number;
}) {
  const materialRef = useRef<THREE.ShaderMaterial>(null!);
  
  // Canvas-generated tile texture with grout lines - SMALL TILES
  const tileTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    
    // Base tile color (light blue)
    ctx.fillStyle = '#a5d8ff';
    ctx.fillRect(0, 0, 512, 512);
    
    // Tile grout lines (darker) - SMALLER tiles
    ctx.strokeStyle = '#64b5f6';
    ctx.lineWidth = 1;
    
    const tileSize = 8; // Smaller tiles (was 32)
    for (let x = 0; x <= 512; x += tileSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 512);
      ctx.stroke();
    }
    for (let y = 0; y <= 512; y += tileSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(512, y);
      ctx.stroke();
    }
    
    // Add subtle variation to tiles
    for (let x = 0; x < 512; x += tileSize) {
      for (let y = 0; y < 512; y += tileSize) {
        const variation = Math.random() * 15 - 7;
        ctx.fillStyle = `rgba(255, 255, 255, ${0.02 + variation / 500})`;
        ctx.fillRect(x + 1, y + 1, tileSize - 2, tileSize - 2);
      }
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(width / 1.5, length / 1.5); // More tile repetitions
    return texture;
  }, [width, length]);
  
  // Caustics shader for animated light patterns
  const causticsShader = useMemo(() => ({
    uniforms: {
      uTime: { value: 0 },
      uTileTexture: { value: tileTexture },
      uCausticIntensity: { value: 0.25 },
    },
    vertexShader: `
      varying vec2 vUv;
      
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      uniform float uTime;
      uniform sampler2D uTileTexture;
      uniform float uCausticIntensity;
      
      // Simplex noise functions for caustics
      vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }
      
      float snoise(vec2 v) {
        const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                           -0.577350269189626, 0.024390243902439);
        vec2 i  = floor(v + dot(v, C.yy));
        vec2 x0 = v - i + dot(i, C.xx);
        vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
        vec4 x12 = x0.xyxy + C.xxzz;
        x12.xy -= i1;
        i = mod289(i);
        vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
        vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
        m = m*m; m = m*m;
        vec3 x = 2.0 * fract(p * C.www) - 1.0;
        vec3 h = abs(x) - 0.5;
        vec3 ox = floor(x + 0.5);
        vec3 a0 = x - ox;
        m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
        vec3 g;
        g.x = a0.x * x0.x + h.x * x0.y;
        g.yz = a0.yz * x12.xz + h.yz * x12.yw;
        return 130.0 * dot(m, g);
      }
      
      void main() {
        // UV-VERZERRUNG durch Wasser-Wellen simulieren
        vec2 distortedUV = vUv;
        float distortion1 = snoise(vUv * 3.0 + vec2(uTime * 0.05, uTime * 0.03)) * 0.008;
        float distortion2 = snoise(vUv * 5.0 + vec2(-uTime * 0.04, uTime * 0.06)) * 0.005;
        distortedUV += vec2(distortion1, distortion2);
        
        // Base tile texture mit verzerrten UVs
        vec4 tileColor = texture2D(uTileTexture, distortedUV);
        
        // Animated caustic patterns (multiple layers for realism)
        vec2 causticUV1 = distortedUV * 8.0 + vec2(uTime * 0.03, uTime * 0.02);
        vec2 causticUV2 = distortedUV * 12.0 + vec2(-uTime * 0.02, uTime * 0.025);
        vec2 causticUV3 = distortedUV * 6.0 + vec2(uTime * 0.015, -uTime * 0.01);
        
        float caustic1 = snoise(causticUV1) * 0.5 + 0.5;
        float caustic2 = snoise(causticUV2) * 0.5 + 0.5;
        float caustic3 = snoise(causticUV3) * 0.5 + 0.5;
        
        // Combine caustic layers with varying intensities
        float caustics = (caustic1 * 0.5 + caustic2 * 0.3 + caustic3 * 0.2);
        caustics = pow(caustics, 1.5) * uCausticIntensity;
        
        // Apply caustics as bright overlay
        vec3 finalColor = tileColor.rgb + vec3(caustics);
        
        gl_FragColor = vec4(finalColor, 1.0);
      }
    `,
  }), [tileTexture]);
  
  // Animate caustics
  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    }
  });
  
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, floorY + 0.01, length / 2]}>
      <planeGeometry args={[width, length]} />
      <shaderMaterial
        ref={materialRef}
        args={[causticsShader]}
      />
    </mesh>
  );
}

/**
 * Pool wall with tile texture
 */
function TiledPoolWall({
  width,
  height,
  position,
  rotation = [0, 0, 0],
}: {
  width: number;
  height: number;
  position: [number, number, number];
  rotation?: [number, number, number];
}) {
  // Canvas-generated wall tile texture
  const tileTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    
    // Base wall color (cyan/turquoise)
    ctx.fillStyle = '#0891b2';
    ctx.fillRect(0, 0, 256, 256);
    
    // Tile grout lines
    ctx.strokeStyle = '#0e7490';
    ctx.lineWidth = 2;
    
    const tileSize = 32;
    for (let x = 0; x <= 256; x += tileSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 256);
      ctx.stroke();
    }
    for (let y = 0; y <= 256; y += tileSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(256, y);
      ctx.stroke();
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(width / 1.5, height / 1.5);
    return texture;
  }, [width, height]);
  
  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={[width, height]} />
      <meshStandardMaterial map={tileTexture} side={THREE.DoubleSide} />
    </mesh>
  );
}

/**
 * Pool overflow gutter (Überlaufrinne) around the pool edge
 * Creates realistic drainage channel with grate pattern
 */
function PoolGutter({
  poolLength,
  poolWidth,
}: {
  poolLength: number;
  poolWidth: number;
}) {
  const gutterWidth = 0.12;
  const gutterDepth = 0.06;
  const halfWidth = poolWidth / 2;
  
  // Gutter grate texture
  const grateTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    
    // Grate base (light gray)
    ctx.fillStyle = '#d1d5db';
    ctx.fillRect(0, 0, 128, 128);
    
    // Slot openings (dark)
    ctx.fillStyle = '#374151';
    const slotWidth = 4;
    const slotSpacing = 12;
    for (let x = 0; x < 128; x += slotSpacing) {
      ctx.fillRect(x, 0, slotWidth, 128);
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }, []);
  
  return (
    <group>
      {/* Left gutter */}
      <mesh position={[-halfWidth - gutterWidth / 2, 0.02, poolLength / 2]}>
        <boxGeometry args={[gutterWidth, gutterDepth, poolLength]} />
        <meshStandardMaterial map={grateTexture} metalness={0.3} roughness={0.7} />
      </mesh>
      
      {/* Right gutter */}
      <mesh position={[halfWidth + gutterWidth / 2, 0.02, poolLength / 2]}>
        <boxGeometry args={[gutterWidth, gutterDepth, poolLength]} />
        <meshStandardMaterial map={grateTexture} metalness={0.3} roughness={0.7} />
      </mesh>
      
      {/* Start gutter */}
      <mesh position={[0, 0.02, -gutterWidth / 2]}>
        <boxGeometry args={[poolWidth + gutterWidth * 2, gutterDepth, gutterWidth]} />
        <meshStandardMaterial map={grateTexture} metalness={0.3} roughness={0.7} />
      </mesh>
      
      {/* End gutter */}
      <mesh position={[0, 0.02, poolLength + gutterWidth / 2]}>
        <boxGeometry args={[poolWidth + gutterWidth * 2, gutterDepth, gutterWidth]} />
        <meshStandardMaterial map={grateTexture} metalness={0.3} roughness={0.7} />
      </mesh>
    </group>
  );
}

/**
 * Underwater handrail (Griffleiste)
 */
function PoolHandrail({
  poolLength,
  poolWidth,
}: {
  poolLength: number;
  poolWidth: number;
}) {
  const halfWidth = poolWidth / 2;
  const railY = -0.2; // Below water surface
  const railRadius = 0.025;
  
  return (
    <group>
      {/* Left rail */}
      <mesh 
        position={[-halfWidth + 0.05, railY, poolLength / 2]} 
        rotation={[Math.PI / 2, 0, 0]}
      >
        <cylinderGeometry args={[railRadius, railRadius, poolLength - 0.5, 16]} />
        <meshStandardMaterial 
          color="#94a3b8" 
          metalness={0.85} 
          roughness={0.15} 
        />
      </mesh>
      
      {/* Right rail */}
      <mesh 
        position={[halfWidth - 0.05, railY, poolLength / 2]} 
        rotation={[Math.PI / 2, 0, 0]}
      >
        <cylinderGeometry args={[railRadius, railRadius, poolLength - 0.5, 16]} />
        <meshStandardMaterial 
          color="#94a3b8" 
          metalness={0.85} 
          roughness={0.15} 
        />
      </mesh>
      
      {/* Rail brackets (every 3m) */}
      {Array.from({ length: Math.floor(poolLength / 3) }).map((_, i) => {
        const z = 1.5 + i * 3;
        return (
          <group key={`bracket-${i}`}>
            {/* Left bracket */}
            <mesh position={[-halfWidth + 0.02, railY + 0.03, z]}>
              <boxGeometry args={[0.04, 0.08, 0.03]} />
              <meshStandardMaterial color="#6b7280" metalness={0.7} roughness={0.3} />
            </mesh>
            {/* Right bracket */}
            <mesh position={[halfWidth - 0.02, railY + 0.03, z]}>
              <boxGeometry args={[0.04, 0.08, 0.03]} />
              <meshStandardMaterial color="#6b7280" metalness={0.7} roughness={0.3} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

// ============================================================================
// WATER SURFACE (Multi-Swimmer Support)
// ============================================================================

/**
 * Animated water surface with wave effect
 * Creates a realistic pool water with gentle waves and shimmer
 */
function AnimatedWaterSurface({
  width,
  length,
  waterY,
}: {
  width: number;
  length: number;
  waterY: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const materialRef = useRef<THREE.ShaderMaterial>(null!);
  
  // Custom water shader - realistic pool water without shimmer artifacts
  const waterShader = useMemo(() => ({
    uniforms: {
      uTime: { value: 0 },
      uDeepColor: { value: new THREE.Color('#0891b2') },    // Darker cyan at depth
      uShallowColor: { value: new THREE.Color('#22d3ee') }, // Lighter at surface
      uMidColor: { value: new THREE.Color('#06b6d4') },     // Mid-tone
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vWorldPos;
      varying vec3 vNormal;
      varying float vWave;
      uniform float uTime;
      
      void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        vec3 pos = position;
        
        // Sanfte, realistische Gerstner-artige Wellen
        float wave1 = sin(pos.x * 1.5 + uTime * 0.8) * 0.012;
        float wave2 = sin(pos.y * 2.0 + uTime * 0.6) * 0.008;
        float wave3 = sin((pos.x + pos.y) * 0.8 + uTime * 0.5) * 0.006;
        float wave4 = sin((pos.x * 0.7 - pos.y * 1.2) + uTime * 0.4) * 0.004;
        
        vWave = wave1 + wave2 + wave3 + wave4;
        pos.z += vWave;
        
        // Leichte Normalenvariation für Lichtbrechung
        vNormal = normalize(vNormal + vec3(wave1 * 2.0, wave2 * 2.0, 0.0));
        
        vec4 worldPos = modelMatrix * vec4(pos, 1.0);
        vWorldPos = worldPos.xyz;
        
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      varying vec3 vWorldPos;
      varying vec3 vNormal;
      varying float vWave;
      uniform float uTime;
      uniform vec3 uDeepColor;
      uniform vec3 uShallowColor;
      uniform vec3 uMidColor;
      
      void main() {
        // Tiefenbasierte Farbmischung (längs im Becken variieren)
        float depthFactor = smoothstep(0.0, 1.0, vUv.y) * 0.5 + 0.25;
        vec3 baseColor = mix(uShallowColor, uMidColor, depthFactor);
        baseColor = mix(baseColor, uDeepColor, depthFactor * 0.4);
        
        // Subtile Farbvariation ohne harte Punkte
        float variation = sin(vUv.x * 6.0 + uTime * 0.3) * sin(vUv.y * 4.0 + uTime * 0.2);
        baseColor = mix(baseColor, uShallowColor, variation * 0.06);
        
        // Stärkerer Fresnel-Effekt für Spiegelung und Verzerrung
        vec3 viewDir = normalize(cameraPosition - vWorldPos);
        float fresnel = pow(1.0 - max(dot(vNormal, viewDir), 0.0), 3.0);
        vec3 fresnelColor = vec3(0.88, 0.94, 1.0); // Leicht bläulich-weiß
        baseColor = mix(baseColor, fresnelColor, fresnel * 0.25);
        
        // Wellen-Helligkeitsvariation (stärker für sichtbaren Effekt)
        baseColor *= 1.0 + vWave * 0.8;
        
        // REDUZIERTE Transparenz (0.78-0.85) für weniger Durchsicht
        float alpha = 0.78 + fresnel * 0.07;
        
        gl_FragColor = vec4(baseColor, alpha);
      }
    `,
  }), []);
  
  // Animate water
  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    }
  });
  
  return (
    <mesh 
      ref={meshRef} 
      rotation={[-Math.PI / 2, 0, 0]} 
      position={[0, waterY, length / 2]}
    >
      <planeGeometry args={[width, length, 32, 32]} />
      <shaderMaterial
        ref={materialRef}
        args={[waterShader]}
        transparent
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

/**
 * Beautiful blue transparent pool water surface (legacy, kept for compatibility)
 * @deprecated Use Pool component instead
 */
export function _MultiSwimmerWaterSurface({
  width,
  length,
}: {
  width: number;
  length: number;
  swimmerStatesRef: React.MutableRefObject<SwimmerState[]>;
  foamIntensity: number;
}) {
  void width; void length;
  return null; // Replaced by AnimatedWaterSurface
}

// ============================================================================
// SPLASH PARTICLES (Multi-Swimmer)
// ============================================================================

function isInPhase(phase: number, window: [number, number]): boolean {
  if (window[0] <= window[1]) {
    return phase >= window[0] && phase <= window[1];
  }
  return phase >= window[0] || phase <= window[1];
}

/**
 * Particle-based splash system for multiple swimmers
 * Uses 1000 particles per swimmer for dramatic water effects
 */
function MultiSwimmerSplashParticles({
  swimmerStatesRef,
  strokeTypes,
  isPlaying,
  speedMultiplier,
}: {
  swimmerStatesRef: React.MutableRefObject<SwimmerState[]>;
  strokeTypes: StrokeType[];
  isPlaying: boolean;
  speedMultiplier: number;
}) {
  const PARTICLES_PER_SWIMMER = 1000;
  const MAX_SWIMMERS = 5;
  const TOTAL_PARTICLES = PARTICLES_PER_SWIMMER * MAX_SWIMMERS;

  const pointsRef = useRef<THREE.Points>(null!);

  const [positions, velocities, lifetimes, types, swimmerIndices] = useMemo(() => {
    const pos = new Float32Array(TOTAL_PARTICLES * 3);
    const vel = new Float32Array(TOTAL_PARTICLES * 3);
    const life = new Float32Array(TOTAL_PARTICLES);
    const typ = new Float32Array(TOTAL_PARTICLES);
    const swimIdx = new Float32Array(TOTAL_PARTICLES);

    for (let s = 0; s < MAX_SWIMMERS; s++) {
      const base = s * PARTICLES_PER_SWIMMER;
      for (let i = 0; i < PARTICLES_PER_SWIMMER; i++) {
        const idx = base + i;
        pos[idx * 3] = 0;
        pos[idx * 3 + 1] = -100;
        pos[idx * 3 + 2] = 0;
        life[idx] = 0;
        swimIdx[idx] = s;
        // 30% leftHand, 30% rightHand, 20% leftFoot, 20% rightFoot
        if (i < PARTICLES_PER_SWIMMER * 0.3) typ[idx] = 0;
        else if (i < PARTICLES_PER_SWIMMER * 0.6) typ[idx] = 1;
        else if (i < PARTICLES_PER_SWIMMER * 0.8) typ[idx] = 2;
        else typ[idx] = 3;
      }
    }
    return [pos, vel, life, typ, swimIdx];
  }, []);

  const spawnCooldownRef = useRef<Record<string, number>>({});

  useFrame((_, delta) => {
    if (!pointsRef.current || !isPlaying) return;

    const posAttr = pointsRef.current.geometry.attributes.position;
    const posArray = posAttr.array as Float32Array;
    const states = swimmerStatesRef.current;

    for (let i = 0; i < TOTAL_PARTICLES; i++) {
      const idx = i * 3;
      const swimmerIdx = swimmerIndices[i];
      const state = states[swimmerIdx];

      // Update living particles
      if (lifetimes[i] > 0) {
        lifetimes[i] -= delta * speedMultiplier;

        posArray[idx] += velocities[idx] * delta * speedMultiplier;
        posArray[idx + 1] += velocities[idx + 1] * delta * speedMultiplier;
        posArray[idx + 2] += velocities[idx + 2] * delta * speedMultiplier;

        velocities[idx + 1] -= 12.0 * delta * speedMultiplier;

        if (posArray[idx + 1] < 0.0) {
          lifetimes[i] = 0;
          posArray[idx + 1] = -100;
        }
        continue;
      }

      // Skip if no swimmer data or gliding
      if (!state || state.isGliding) continue;

      const strokeType = strokeTypes[swimmerIdx] ?? 'freestyle';
      const config = SPLASH_CONFIG[strokeType];
      const particleType = types[i];
      const cooldownKey = `${swimmerIdx}-${particleType}`;

      // Update cooldown
      if (spawnCooldownRef.current[cooldownKey] !== undefined) {
        spawnCooldownRef.current[cooldownKey] -= delta * speedMultiplier;
      }

      if ((spawnCooldownRef.current[cooldownKey] ?? 0) > 0) continue;

      const phase = state.strokePhase;
      const dir = state.direction;
      const swimmerZ = state.z;
      const swimmerX = state.x;

      const isLeftHandActive = isInPhase(phase, config.leftHandPhase);
      const isRightHandActive = isInPhase(phase, config.rightHandPhase);
      const isLeftKickActive = config.leftKickPhases.some((kp) => isInPhase(phase, kp));
      const isRightKickActive = config.rightKickPhases.some((kp) => isInPhase(phase, kp));

      let shouldSpawn = false;
      let spawnX = swimmerX;
      let spawnZ = swimmerZ;
      let intensity = 0;

      switch (particleType) {
        case 0:
          if (isLeftHandActive && Math.random() < config.hands) {
            shouldSpawn = true;
            spawnX = swimmerX - config.handOffsetX;
            spawnZ = swimmerZ + config.handEntryZ * dir;
            intensity = config.hands;
          }
          break;
        case 1:
          if (isRightHandActive && Math.random() < config.hands) {
            shouldSpawn = true;
            spawnX = swimmerX + config.handOffsetX;
            spawnZ = swimmerZ + config.handEntryZ * dir;
            intensity = config.hands;
          }
          break;
        case 2:
          if (isLeftKickActive && Math.random() < config.feet) {
            shouldSpawn = true;
            spawnX = swimmerX - config.feetOffsetX;
            spawnZ = swimmerZ + config.feetZ * dir;
            intensity = config.feet;
          }
          break;
        case 3:
          if (isRightKickActive && Math.random() < config.feet) {
            shouldSpawn = true;
            spawnX = swimmerX + config.feetOffsetX;
            spawnZ = swimmerZ + config.feetZ * dir;
            intensity = config.feet;
          }
          break;
      }

      if (shouldSpawn) {
        posArray[idx] = spawnX + (Math.random() - 0.5) * 0.09;
        posArray[idx + 1] = 0.02;
        posArray[idx + 2] = spawnZ + (Math.random() - 0.5) * 0.09;

        velocities[idx] = (Math.random() - 0.5) * 0.7 * intensity;
        velocities[idx + 1] = 1.5 + Math.random() * 1.4 * intensity;
        velocities[idx + 2] = (Math.random() - 0.5) * 0.3;

        lifetimes[i] = 0.4 + Math.random() * 0.5;
        spawnCooldownRef.current[cooldownKey] = 0.003;
      }
    }

    posAttr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef} frustumCulled={false} renderOrder={999}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.12}
        color="#ffffff"
        transparent
        opacity={0.95}
        sizeAttenuation
        depthWrite={false}
        depthTest={false}
      />
    </points>
  );
}

// ============================================================================
// LANE ROPES (InstancedMesh for Performance)
// ============================================================================

/**
 * Lane divider ropes with color-coded buoys using InstancedMesh
 * Red buoys: 0-5m from each wall (backstroke flags zone)
 * Yellow buoys: rest of the lane
 * Supports middle marker (12.5m for 25m pool)
 */
function LaneRopes({ poolLength }: { poolLength: number }) {
  const buoyGeometry = useMemo(() => new THREE.SphereGeometry(LANE_ROPE_CONFIG.buoyRadius, 8, 6), []);
  const ropeGeometry = useMemo(
    () => new THREE.CylinderGeometry(LANE_ROPE_CONFIG.ropeRadius, LANE_ROPE_CONFIG.ropeRadius, poolLength, 8),
    [poolLength]
  );

  // Calculate buoy positions
  const buoyCount = Math.floor(poolLength / LANE_ROPE_CONFIG.buoySpacing);
  // 4 Leinen für 5 Bahnen (nur zwischen den Bahnen, nicht am Rand)
  const ropeCount = LANE_CONFIG.count - 1; // 4 ropes between 5 lanes

  // Materials - Correct colors: Red at ends, blue-white alternating, yellow middle
  const redMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: '#dc2626', roughness: 0.3 }), []);
  const yellowMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: '#facc15', roughness: 0.3 }), []); // Middle marker
  const blueMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: '#2563eb', roughness: 0.3 }), []);
  const whiteMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.3 }), []);
  const ropeMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: '#1e3a5f', roughness: 0.5 }), []);

  // X positions for lane ropes (only between lanes, NOT at edges)
  const ropeXPositions = useMemo(() => {
    const positions: number[] = [];
    const halfWidth = LANE_CONFIG.totalWidth / 2;
    // Start at 1, end before LANE_CONFIG.count to exclude edge ropes
    for (let i = 1; i < LANE_CONFIG.count; i++) {
      positions.push(-halfWidth + i * LANE_CONFIG.width);
    }
    return positions;
  }, []);

  // Create instanced buoys
  const redBuoysRef = useRef<THREE.InstancedMesh>(null!);
  const yellowBuoysRef = useRef<THREE.InstancedMesh>(null!);
  const blueBuoysRef = useRef<THREE.InstancedMesh>(null!);
  const whiteBuoysRef = useRef<THREE.InstancedMesh>(null!);

  // Count buoys per color - RED at ends, BLUE/WHITE alternating, YELLOW middle
  const buoyData = useMemo(() => {
    const red: THREE.Matrix4[] = [];
    const yellow: THREE.Matrix4[] = [];
    const blue: THREE.Matrix4[] = [];
    const white: THREE.Matrix4[] = [];

    const middleZ = poolLength / 2;
    const matrix = new THREE.Matrix4();

    for (let rope = 0; rope < ropeCount; rope++) {
      const x = ropeXPositions[rope];

      for (let b = 0; b < buoyCount; b++) {
        const z = LANE_ROPE_CONFIG.buoySpacing / 2 + b * LANE_ROPE_CONFIG.buoySpacing;
        const lanebalsY = -0.14; // Slightly above water
        

        matrix.setPosition(x, lanebalsY, z);

        // Middle marker (YELLOW at 12.5m ± 0.25m)
        if (Math.abs(z - middleZ) < 0.3) {
          yellow.push(matrix.clone());
        }
        // Red zone: 0-5m from each end
        else if (z < LANE_ROPE_CONFIG.redZoneEnd || z > poolLength - LANE_ROPE_CONFIG.redZoneEnd) {
          red.push(matrix.clone());
        }
        // Middle section: alternating BLUE and WHITE
        else {
          // Alternate every ~0.5m (every 2 buoys)
          if (Math.floor(b / 2) % 2 === 0) {
            blue.push(matrix.clone());
          } else {
            white.push(matrix.clone());
          }
        }
      }
    }

    return { red, yellow, blue, white };
  }, [poolLength, buoyCount, ropeCount, ropeXPositions]);

  // Apply matrices to instanced meshes
  useEffect(() => {
    if (redBuoysRef.current) {
      buoyData.red.forEach((m, i) => redBuoysRef.current.setMatrixAt(i, m));
      redBuoysRef.current.instanceMatrix.needsUpdate = true;
    }
    if (yellowBuoysRef.current) {
      buoyData.yellow.forEach((m, i) => yellowBuoysRef.current.setMatrixAt(i, m));
      yellowBuoysRef.current.instanceMatrix.needsUpdate = true;
    }
    if (blueBuoysRef.current) {
      buoyData.blue.forEach((m, i) => blueBuoysRef.current.setMatrixAt(i, m));
      blueBuoysRef.current.instanceMatrix.needsUpdate = true;
    }
    if (whiteBuoysRef.current) {
      buoyData.white.forEach((m, i) => whiteBuoysRef.current.setMatrixAt(i, m));
      whiteBuoysRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [buoyData]);
  return (
    <group>
      {/* Rope cylinders */}
      {ropeXPositions.map((x, i) => (
        <mesh key={`rope-${i}`} position={[x, -0.15, poolLength / 2]} rotation={[Math.PI / 2, 0, 0]}>
          <primitive object={ropeGeometry} />
          <primitive object={ropeMaterial} />
        </mesh>
      ))}

      {/* Instanced buoys */}
      <instancedMesh ref={redBuoysRef} args={[buoyGeometry, redMaterial, buoyData.red.length]} />
      <instancedMesh ref={yellowBuoysRef} args={[buoyGeometry, yellowMaterial, buoyData.yellow.length]} />
      <instancedMesh ref={blueBuoysRef} args={[buoyGeometry, blueMaterial, buoyData.blue.length]} />
      <instancedMesh ref={whiteBuoysRef} args={[buoyGeometry, whiteMaterial, buoyData.white.length]} />
    </group>
  );
}

// ============================================================================
// 5M PENNANT LINES (Backstroke Flags)
// ============================================================================

/**
 * Pennant lines at 5m from each wall (backstroke turn warning)
 */
function PennantLines({ poolLength }: { poolLength: number }) {
  const pennantGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(0.08, 0.15);
    shape.lineTo(0, 0.12);
    shape.closePath();
    return new THREE.ShapeGeometry(shape);
  }, []);

  const flagPositions = [5, poolLength - 5]; // 5m from each end
  const poleHeight = 2.0;
  const halfWidth = LANE_CONFIG.totalWidth / 2 + 0.5;

  return (
    <group>
      {flagPositions.map((z, fi) => (
        <group key={`pennant-line-${fi}`}>
          {/* Poles */}
          <mesh position={[-halfWidth, poleHeight / 2, z]}>
            <cylinderGeometry args={[0.03, 0.03, poleHeight, 8]} />
            <meshStandardMaterial color="#6b7280" metalness={0.6} roughness={0.3} />
          </mesh>
          <mesh position={[halfWidth, poleHeight / 2, z]}>
            <cylinderGeometry args={[0.03, 0.03, poleHeight, 8]} />
            <meshStandardMaterial color="#6b7280" metalness={0.6} roughness={0.3} />
          </mesh>

          {/* Rope */}
          <mesh position={[0, poleHeight, z]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.01, 0.01, halfWidth * 2, 8]} />
            <meshStandardMaterial color="#374151" />
          </mesh>

          {/* Pennants */}
          {Array.from({ length: Math.floor(halfWidth * 2 / 0.4) }).map((_, pi) => (
            <mesh
              key={`pennant-${fi}-${pi}`}
              position={[-halfWidth + 0.2 + pi * 0.4, poleHeight - 0.15, z]}
              rotation={[0, 0, 0]}
            >
              <primitive object={pennantGeometry} />
              <meshStandardMaterial color={pi % 2 === 0 ? '#ef4444' : '#fbbf24'} side={THREE.DoubleSide} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

// ============================================================================
// BLACK LANE LINES (Pool Floor)
// ============================================================================

/**
 * Black lane lines on pool floor (T-shape at ends)
 */
function LaneLines({ poolLength }: { poolLength: number }) {
  const lineWidth = 0.25;
  const tCrossWidth = 0.5;
  const tDistanceFromEnd = 2.0;

  return (
    <group position={[0, POOL_CONFIG.floorY + 0.02, 0]}>
      {LANE_CONFIG.positions.map((x, i) => (
        <group key={`lane-line-${i}`}>
          {/* Main line */}
          <mesh position={[x, 0, poolLength / 2]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[lineWidth, poolLength - tDistanceFromEnd * 2]} />
            <meshStandardMaterial color="#1a1a1a" side={THREE.DoubleSide} />
          </mesh>

          {/* T-cross at start */}
          <mesh position={[x, 0, tDistanceFromEnd]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[tCrossWidth, lineWidth]} />
            <meshStandardMaterial color="#1a1a1a" side={THREE.DoubleSide} />
          </mesh>

          {/* T-cross at end */}
          <mesh position={[x, 0, poolLength - tDistanceFromEnd]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[tCrossWidth, lineWidth]} />
            <meshStandardMaterial color="#1a1a1a" side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ============================================================================
// POOL LADDERS (GLB Model)
// ============================================================================

/**
 * Pool ladder loaded from GLB
 * Uses ladder-pool.glb (public path)
 * Clones the scene to allow multiple instances
 */
function PoolLadderGlb({
  position,
  rotation = 0,
  scale = 1,
}: {
  position: [number, number, number];
  rotation?: number;
  scale?: number;
}) {
  const { scene } = useGLTF('/ladder-pool.glb');
  
  // Clone the scene for each instance to avoid WebGL conflicts
  const clonedScene = useMemo(() => {
    const clone = scene.clone(true);
    // Deep clone materials to ensure independence
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (mesh.material) {
          mesh.material = (mesh.material as THREE.Material).clone();
        }
      }
    });
    return clone;
  }, [scene]);

  return (
    <group position={position} rotation={[0, rotation, 0]} scale={[scale, scale, scale]}>
      <primitive object={clonedScene} />
    </group>
  );
}

// Preload the GLB to avoid loading delay
useGLTF.preload('/ladder-pool.glb');

// ============================================================================
// STARTING BLOCKS (Competition Standard)
// ============================================================================

/**
 * Simple black number digit using basic geometry
 */
function BlockNumber({ number }: { number: number }) {
  // Create a simple black number using a plane with custom shape
  // For simplicity, we'll use a contrasting black box as placeholder
  // In production, this would be a proper text/number mesh
  const digits: Record<number, JSX.Element> = {
    1: (
      <mesh>
        <boxGeometry args={[0.04, 0.16, 0.01]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
    ),
    2: (
      <group>
        <mesh position={[0, 0.06, 0]}><boxGeometry args={[0.1, 0.03, 0.01]} /><meshStandardMaterial color="#1a1a1a" /></mesh>
        <mesh position={[0.035, 0.03, 0]}><boxGeometry args={[0.03, 0.06, 0.01]} /><meshStandardMaterial color="#1a1a1a" /></mesh>
        <mesh position={[0, 0, 0]}><boxGeometry args={[0.1, 0.03, 0.01]} /><meshStandardMaterial color="#1a1a1a" /></mesh>
        <mesh position={[-0.035, -0.03, 0]}><boxGeometry args={[0.03, 0.06, 0.01]} /><meshStandardMaterial color="#1a1a1a" /></mesh>
        <mesh position={[0, -0.06, 0]}><boxGeometry args={[0.1, 0.03, 0.01]} /><meshStandardMaterial color="#1a1a1a" /></mesh>
      </group>
    ),
    3: (
      <group>
        <mesh position={[0, 0.06, 0]}><boxGeometry args={[0.1, 0.03, 0.01]} /><meshStandardMaterial color="#1a1a1a" /></mesh>
        <mesh position={[0.035, 0, 0]}><boxGeometry args={[0.03, 0.18, 0.01]} /><meshStandardMaterial color="#1a1a1a" /></mesh>
        <mesh position={[0, 0, 0]}><boxGeometry args={[0.08, 0.03, 0.01]} /><meshStandardMaterial color="#1a1a1a" /></mesh>
        <mesh position={[0, -0.06, 0]}><boxGeometry args={[0.1, 0.03, 0.01]} /><meshStandardMaterial color="#1a1a1a" /></mesh>
      </group>
    ),
    4: (
      <group>
        <mesh position={[-0.035, 0.03, 0]}><boxGeometry args={[0.03, 0.09, 0.01]} /><meshStandardMaterial color="#1a1a1a" /></mesh>
        <mesh position={[0, 0, 0]}><boxGeometry args={[0.1, 0.03, 0.01]} /><meshStandardMaterial color="#1a1a1a" /></mesh>
        <mesh position={[0.035, 0, 0]}><boxGeometry args={[0.03, 0.18, 0.01]} /><meshStandardMaterial color="#1a1a1a" /></mesh>
      </group>
    ),
    5: (
      <group>
        <mesh position={[0, 0.06, 0]}><boxGeometry args={[0.1, 0.03, 0.01]} /><meshStandardMaterial color="#1a1a1a" /></mesh>
        <mesh position={[-0.035, 0.03, 0]}><boxGeometry args={[0.03, 0.06, 0.01]} /><meshStandardMaterial color="#1a1a1a" /></mesh>
        <mesh position={[0, 0, 0]}><boxGeometry args={[0.1, 0.03, 0.01]} /><meshStandardMaterial color="#1a1a1a" /></mesh>
        <mesh position={[0.035, -0.03, 0]}><boxGeometry args={[0.03, 0.06, 0.01]} /><meshStandardMaterial color="#1a1a1a" /></mesh>
        <mesh position={[0, -0.06, 0]}><boxGeometry args={[0.1, 0.03, 0.01]} /><meshStandardMaterial color="#1a1a1a" /></mesh>
      </group>
    ),
  };
  
  return digits[number] || digits[1];
}

/**
 * Professional competition starting blocks with:
 * - Angled platform for dive start
 * - Back grip bar for backstroke start
 * - Front grip edge
 * - Lane number display with BLACK digits
 * - Anti-slip surface texture
 */
function StartingBlocks() {
  const blockHeight = 0.75;
  const blockWidth = 0.55;
  const blockDepth = 0.65;
  const platformAngle = -0.12; // ~7 degrees forward tilt

  return (
    <group position={[0, 0, -0.35]}>
      {LANE_CONFIG.positions.map((x, i) => (
        <group key={`block-${i}`} position={[x, 0, 0]}>
          {/* Main block body (slightly tapered) */}
          <mesh position={[0, blockHeight / 2, 0]} castShadow>
            <boxGeometry args={[blockWidth, blockHeight, blockDepth]} />
            <meshStandardMaterial color="#e5e5e5" roughness={0.4} metalness={0.1} />
          </mesh>
          
          {/* Angled top platform with anti-slip texture */}
          <mesh
            position={[0, blockHeight + 0.025, 0.08]}
            rotation={[platformAngle, 0, 0]}
            castShadow
          >
            <boxGeometry args={[blockWidth - 0.04, 0.05, blockDepth - 0.08]} />
            <meshStandardMaterial color="#a3a3a3" roughness={0.9} />
          </mesh>
          
          {/* Anti-slip surface pattern (subtle ridges) */}
          {Array.from({ length: 5 }).map((_, ri) => (
            <mesh
              key={`ridge-${ri}`}
              position={[
                0,
                blockHeight + 0.055,
                -blockDepth / 2 + 0.18 + ri * 0.1,
              ]}
              rotation={[platformAngle, 0, 0]}
            >
              <boxGeometry args={[blockWidth - 0.1, 0.01, 0.02]} />
              <meshStandardMaterial color="#737373" roughness={1} />
            </mesh>
          ))}
          
          {/* Front grip edge (for dive start) */}
          <mesh position={[0, blockHeight + 0.02, blockDepth / 2 - 0.03]}>
            <boxGeometry args={[blockWidth - 0.08, 0.04, 0.06]} />
            <meshStandardMaterial color="#525252" roughness={0.6} metalness={0.3} />
          </mesh>
          
          {/* Back grip bar (for backstroke start) */}
          <group position={[0, blockHeight - 0.08, -blockDepth / 2 + 0.05]}>
            {/* Horizontal bar */}
            <mesh rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.02, 0.02, blockWidth - 0.12, 8]} />
              <meshStandardMaterial color="#404040" metalness={0.7} roughness={0.3} />
            </mesh>
            {/* Left support */}
            <mesh position={[-blockWidth / 2 + 0.08, -0.08, 0]}>
              <boxGeometry args={[0.04, 0.16, 0.04]} />
              <meshStandardMaterial color="#525252" metalness={0.5} roughness={0.4} />
            </mesh>
            {/* Right support */}
            <mesh position={[blockWidth / 2 - 0.08, -0.08, 0]}>
              <boxGeometry args={[0.04, 0.16, 0.04]} />
              <meshStandardMaterial color="#525252" metalness={0.5} roughness={0.4} />
            </mesh>
          </group>
          
          {/* Lane number display (back face) - WHITE background, BLACK number */}
          <group position={[0, blockHeight * 0.65, -blockDepth / 2 - 0.01]}>
            {/* Number background - WHITE */}
            <mesh>
              <boxGeometry args={[0.28, 0.28, 0.02]} />
              <meshStandardMaterial color="#ffffff" />
            </mesh>
            {/* Black number digit */}
            <group position={[0, 0, 0.015]}>
              <BlockNumber number={i + 1} />
            </group>
          </group>
          
          {/* Step (front lower part) */}
          <mesh position={[0, 0.08, blockDepth / 2 + 0.08]}>
            <boxGeometry args={[blockWidth - 0.02, 0.16, 0.15]} />
            <meshStandardMaterial color="#d4d4d4" roughness={0.5} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ============================================================================
// POOL DECK
// ============================================================================

/**
 * Pool deck surrounding the pool
 */
function PoolDeck({ poolLength }: { poolLength: number }) {
  const deckWidth = POOL_CONFIG.deckWidth;
  const deckHeight = POOL_CONFIG.deckHeight;
  const poolWidth = LANE_CONFIG.totalWidth;
  const halfPoolWidth = poolWidth / 2;

  return (
    <group>
      {/* Left deck */}
      <mesh position={[-halfPoolWidth - deckWidth / 2 - POOL_CONFIG.wallThickness, deckHeight / 2, poolLength / 2]}>
        <boxGeometry args={[deckWidth, deckHeight, poolLength + deckWidth * 2]} />
        <meshStandardMaterial color="#e5e5e5" roughness={0.7} />
      </mesh>

      {/* Right deck */}
      <mesh position={[halfPoolWidth + deckWidth / 2 + POOL_CONFIG.wallThickness, deckHeight / 2, poolLength / 2]}>
        <boxGeometry args={[deckWidth, deckHeight, poolLength + deckWidth * 2]} />
        <meshStandardMaterial color="#e5e5e5" roughness={0.7} />
      </mesh>

      {/* Start deck */}
      <mesh position={[0, deckHeight / 2, -deckWidth / 2 - POOL_CONFIG.wallThickness]}>
        <boxGeometry args={[poolWidth + POOL_CONFIG.wallThickness * 2, deckHeight, deckWidth]} />
        <meshStandardMaterial color="#e5e5e5" roughness={0.7} />
      </mesh>

      {/* End deck */}
      <mesh position={[0, deckHeight / 2, poolLength + deckWidth / 2 + POOL_CONFIG.wallThickness]}>
        <boxGeometry args={[poolWidth + POOL_CONFIG.wallThickness * 2, deckHeight, deckWidth]} />
        <meshStandardMaterial color="#e5e5e5" roughness={0.7} />
      </mesh>
    </group>
  );
}

// ============================================================================
// SWIMMING HALL ENVIRONMENT (Krokofit-Style - No Roof)
// ============================================================================

/**
 * Instanced seat geometry for tribune (performance optimized)
 * Uses InstancedMesh for hundreds of seats without performance impact
 */
function InstancedTribuneSeats({
  rows,
  seatsPerRow,
  startPosition,
}: {
  rows: number;
  seatsPerRow: number;
  startPosition: [number, number, number];
}) {
  const seatGeometry = useMemo(() => new THREE.BoxGeometry(0.45, 0.08, 0.4), []);
  const backGeometry = useMemo(() => new THREE.BoxGeometry(0.45, 0.35, 0.06), []);
  const seatMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: '#2563eb', roughness: 0.6 }), []);
  const backMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: '#1d4ed8', roughness: 0.5 }), []);
  
  const seatRef = useRef<THREE.InstancedMesh>(null!);
  const backRef = useRef<THREE.InstancedMesh>(null!);
  
  const totalSeats = rows * seatsPerRow;
  
  useEffect(() => {
    const matrix = new THREE.Matrix4();
    const { rowHeight, rowDepth, seatSpacing } = HALL_CONFIG.tribune;
    
    let index = 0;
    for (let row = 0; row < rows; row++) {
      for (let seat = 0; seat < seatsPerRow; seat++) {
        const x = startPosition[0] + row * rowDepth * 0.7;
        const y = startPosition[1] + row * rowHeight + 0.04;
        const z = startPosition[2] - (seatsPerRow / 2) * seatSpacing + seat * seatSpacing;
        
        // Seat cushion
        matrix.setPosition(x, y, z);
        seatRef.current.setMatrixAt(index, matrix);
        
        // Seat back (slightly behind and higher)
        matrix.setPosition(x + 0.2, y + 0.22, z);
        backRef.current.setMatrixAt(index, matrix);
        
        index++;
      }
    }
    
    seatRef.current.instanceMatrix.needsUpdate = true;
    backRef.current.instanceMatrix.needsUpdate = true;
  }, [rows, seatsPerRow, startPosition]);
  
  return (
    <group>
      <instancedMesh ref={seatRef} args={[seatGeometry, seatMaterial, totalSeats]} castShadow />
      <instancedMesh ref={backRef} args={[backGeometry, backMaterial, totalSeats]} castShadow />
    </group>
  );
}

/**
 * Tribune platform steps (concrete base for seats)
 */
function TribunePlatforms({
  rows,
  hallLength,
  startX,
}: {
  rows: number;
  hallLength: number;
  startX: number;
}) {
  const { rowHeight, rowDepth } = HALL_CONFIG.tribune;
  
  return (
    <group>
      {Array.from({ length: rows }).map((_, row) => (
        <mesh
          key={`platform-${row}`}
          position={[
            startX + row * rowDepth * 0.7 + rowDepth / 2,
            row * rowHeight + rowHeight / 2,
            0,
          ]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[rowDepth, rowHeight, hallLength - 1]} />
          <meshStandardMaterial color="#9ca3af" roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * Large glass window panel with metal frame (Krokofit-style)
 */
function GlassWindowPanel({
  position,
  rotation = [0, 0, 0],
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
}) {
  const { width, height, frameWidth } = HALL_CONFIG.window;
  
  return (
    <group position={position} rotation={rotation}>
      {/* Metal frame - outer */}
      <mesh>
        <boxGeometry args={[width + frameWidth * 2, height + frameWidth * 2, frameWidth]} />
        <meshStandardMaterial color="#374151" metalness={0.7} roughness={0.3} />
      </mesh>
      
      {/* Glass pane */}
      <mesh position={[0, 0, 0.02]}>
        <boxGeometry args={[width, height, 0.02]} />
        <meshPhysicalMaterial
          color="#a5d8ff"
          transparent
          opacity={0.35}
          roughness={0.05}
          metalness={0.1}
          envMapIntensity={1}
        />
      </mesh>
      
      {/* Horizontal divider (middle) */}
      <mesh position={[0, 0, frameWidth / 2 + 0.01]}>
        <boxGeometry args={[width, frameWidth * 0.6, frameWidth * 0.5]} />
        <meshStandardMaterial color="#4b5563" metalness={0.6} roughness={0.4} />
      </mesh>
      
      {/* Vertical dividers */}
      {[-width / 3, width / 3].map((x, i) => (
        <mesh key={`vdiv-${i}`} position={[x, 0, frameWidth / 2 + 0.01]}>
          <boxGeometry args={[frameWidth * 0.6, height, frameWidth * 0.5]} />
          <meshStandardMaterial color="#4b5563" metalness={0.6} roughness={0.4} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * Overhead lighting rail with spots (Krokofit-style industrial lighting)
 * Uses emissive materials instead of PointLights to avoid WebGL shader limits
 */
function LightingRail({
  position,
  length,
}: {
  position: [number, number, number];
  length: number;
}) {
  const { spotSpacing, spotSize } = HALL_CONFIG.lighting;
  const spotCount = Math.floor(length / spotSpacing);
  
  return (
    <group position={position}>
      {/* Main rail */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.05, 0.05, length, 8]} />
        <meshStandardMaterial color="#6b7280" metalness={0.8} roughness={0.2} />
      </mesh>
      
      {/* Light spots - using emissive materials only (no PointLights to avoid shader limits) */}
      {Array.from({ length: spotCount }).map((_, i) => {
        const z = -length / 2 + spotSpacing / 2 + i * spotSpacing;
        return (
          <group key={`spot-${i}`} position={[0, -0.15, z]}>
            {/* Spot housing */}
            <mesh>
              <cylinderGeometry args={[spotSize, spotSize * 0.7, 0.25, 12]} />
              <meshStandardMaterial color="#1f2937" metalness={0.5} roughness={0.4} />
            </mesh>
            {/* Light lens - emissive glow effect */}
            <mesh position={[0, -0.13, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[spotSize * 0.6, 16]} />
              <meshBasicMaterial color="#fffbeb" />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

/**
 * Electronic timing scoreboard (professional competition style)
 */
function TimingScoreboard({
  position,
  rotation = [0, 0, 0],
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
}) {
  const displayWidth = 10;
  const displayHeight = 2.5;
  
  return (
    <group position={position} rotation={rotation}>
      {/* Display frame (black metal) */}
      <mesh>
        <boxGeometry args={[displayWidth + 0.4, displayHeight + 0.4, 0.2]} />
        <meshStandardMaterial color="#1f2937" metalness={0.4} roughness={0.6} />
      </mesh>
      
      {/* Screen background (dark) */}
      <mesh position={[0, 0, 0.11]}>
        <boxGeometry args={[displayWidth, displayHeight, 0.02]} />
        <meshStandardMaterial color="#0a0a0a" />
      </mesh>
      
      {/* Lane displays */}
      {LANE_CONFIG.positions.map((_, i) => (
        <group key={`lane-${i}`} position={[-displayWidth / 2 + 1 + i * 1.9, 0, 0.13]}>
          {/* Lane number (yellow) */}
          <mesh position={[0, 0.7, 0]}>
            <boxGeometry args={[0.6, 0.6, 0.02]} />
            <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={1.2} />
          </mesh>
          {/* Time display (green LED) */}
          <mesh position={[0, 0.1, 0]}>
            <boxGeometry args={[1.6, 0.5, 0.02]} />
            <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.9} />
          </mesh>
          {/* Rank (red) */}
          <mesh position={[0, -0.5, 0]}>
            <boxGeometry args={[0.9, 0.4, 0.02]} />
            <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.7} />
          </mesh>
        </group>
      ))}
      
      {/* Header bar (blue) */}
      <mesh position={[0, displayHeight / 2 - 0.2, 0.13]}>
        <boxGeometry args={[displayWidth - 0.3, 0.3, 0.02]} />
        <meshStandardMaterial color="#3b82f6" emissive="#3b82f6" emissiveIntensity={1} />
      </mesh>
    </group>
  );
}

/**
 * Swimming hall environment - Krokofit-style architecture
 * Features: No roof, large glass windows, tribune with instanced seats, industrial lighting
 * @deprecated Currently disabled - enable in main component when needed
 */
export function _SwimmingHall({ poolLength }: { poolLength: number }) {
  const hallWidth = HALL_CONFIG.width;
  const hallLength = poolLength + HALL_CONFIG.extraLength;
  const wallHeight = HALL_CONFIG.wallHeight;
  const halfWidth = hallWidth / 2;
  const halfLength = hallLength / 2;
  
  // Window calculations
  const windowCount = Math.floor((hallLength - 4) / HALL_CONFIG.window.spacing);
  const windowStartZ = -halfLength + HALL_CONFIG.window.spacing;
  
  // Tribune calculations
  const { rows } = HALL_CONFIG.tribune;
  const seatsPerRow = Math.floor((hallLength - 2) / HALL_CONFIG.tribune.seatSpacing);
  const tribuneStartX = halfWidth - 1;
  
  return (
    <group position={[0, 0, poolLength / 2]}>
      {/* ====== WALLS ====== */}
      
      {/* Back wall (behind starting blocks) - solid wall with scoreboard */}
      <mesh position={[0, wallHeight / 2, -halfLength - HALL_CONFIG.wallThickness / 2]}>
        <boxGeometry args={[hallWidth, wallHeight, HALL_CONFIG.wallThickness]} />
        <meshStandardMaterial color="#f3f4f6" roughness={0.85} />
      </mesh>
      
      {/* Timing scoreboard on back wall */}
      <TimingScoreboard
        position={[0, 4.5, -halfLength + 0.2]}
        rotation={[0, 0, 0]}
      />
      
      {/* Front wall (end of pool) - solid */}
      <mesh position={[0, wallHeight / 2, halfLength + HALL_CONFIG.wallThickness / 2]}>
        <boxGeometry args={[hallWidth, wallHeight, HALL_CONFIG.wallThickness]} />
        <meshStandardMaterial color="#f3f4f6" roughness={0.85} />
      </mesh>
      
      {/* Left wall - large glass windows (Krokofit-style) */}
      <group position={[-halfWidth, 0, 0]}>
        {/* Wall base (below windows) */}
        <mesh position={[-HALL_CONFIG.wallThickness / 2, HALL_CONFIG.window.yOffset / 2, 0]}>
          <boxGeometry args={[HALL_CONFIG.wallThickness, HALL_CONFIG.window.yOffset, hallLength]} />
          <meshStandardMaterial color="#e5e7eb" roughness={0.8} />
        </mesh>
        
        {/* Wall top (above windows) */}
        <mesh position={[-HALL_CONFIG.wallThickness / 2, wallHeight - 0.4, 0]}>
          <boxGeometry args={[HALL_CONFIG.wallThickness, 0.8, hallLength]} />
          <meshStandardMaterial color="#e5e7eb" roughness={0.8} />
        </mesh>
        
        {/* Pilasters between windows */}
        {Array.from({ length: windowCount + 1 }).map((_, i) => (
          <mesh
            key={`pilaster-${i}`}
            position={[
              -HALL_CONFIG.wallThickness / 2 - 0.05,
              HALL_CONFIG.window.yOffset + HALL_CONFIG.window.height / 2,
              windowStartZ - HALL_CONFIG.window.spacing / 2 + i * HALL_CONFIG.window.spacing,
            ]}
          >
            <boxGeometry args={[0.2, HALL_CONFIG.window.height + 0.4, 0.3]} />
            <meshStandardMaterial color="#d1d5db" roughness={0.7} />
          </mesh>
        ))}
        
        {/* Glass windows */}
        {Array.from({ length: windowCount }).map((_, i) => (
          <GlassWindowPanel
            key={`window-${i}`}
            position={[
              0.1,
              HALL_CONFIG.window.yOffset + HALL_CONFIG.window.height / 2,
              windowStartZ + i * HALL_CONFIG.window.spacing,
            ]}
            rotation={[0, Math.PI / 2, 0]}
          />
        ))}
      </group>
      
      {/* Right side - Tribune with instanced seats (no wall) */}
      <group position={[0, 0, 0]}>
        {/* Tribune platforms */}
        <TribunePlatforms rows={rows} hallLength={hallLength} startX={tribuneStartX} />
        
        {/* Instanced seats */}
        <InstancedTribuneSeats
          rows={rows}
          seatsPerRow={seatsPerRow}
          startPosition={[tribuneStartX + 0.3, 0.1, 0]}
        />
        
        {/* Safety railing at top */}
        <mesh
          position={[
            tribuneStartX + rows * HALL_CONFIG.tribune.rowDepth * 0.7 + 0.4,
            rows * HALL_CONFIG.tribune.rowHeight + 0.6,
            0,
          ]}
          rotation={[0, 0, Math.PI / 2]}
        >
          <cylinderGeometry args={[0.04, 0.04, hallLength - 1, 8]} />
          <meshStandardMaterial color="#6b7280" metalness={0.7} roughness={0.3} />
        </mesh>
      </group>
      
      {/* ====== FLOOR ====== */}
      <mesh
        position={[0, POOL_CONFIG.deckHeight - 0.01, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[hallWidth, hallLength]} />
        <meshStandardMaterial color={HALL_CONFIG.tileColor} roughness={0.7} />
      </mesh>
      
      {/* ====== LIGHTING RAILS (NO CEILING) ====== */}
      <LightingRail
        position={[-hallWidth / 4, HALL_CONFIG.lighting.railHeight, 0]}
        length={hallLength - 2}
      />
      <LightingRail
        position={[0, HALL_CONFIG.lighting.railHeight, 0]}
        length={hallLength - 2}
      />
      <LightingRail
        position={[hallWidth / 4, HALL_CONFIG.lighting.railHeight, 0]}
        length={hallLength - 2}
      />
    </group>
  );
}

/**
 * Spectator stands at the end of the pool (facing start blocks)
 * Uses simpler geometry since it's less prominent than side tribune
 * @deprecated Integrated into SwimmingHall tribune
 */
export function _SpectatorStands({ poolLength: _poolLength }: { poolLength: number }) {
  // Removed - integrated into SwimmingHall tribune
  void _poolLength; // Prevent unused variable warning
  return null;
}

/**
 * Electronic timing display board - now integrated into SwimmingHall as TimingScoreboard
 * This component is kept for backwards compatibility but returns null
 * @deprecated Integrated into SwimmingHall as TimingScoreboard
 */
export function _TimingDisplay() {
  // Integrated into SwimmingHall as TimingScoreboard on back wall
  return null;
}

// ============================================================================
// POOL STRUCTURE
// ============================================================================

/**
 * Main pool structure with walls, floor, and water
 * Simple and visible version
 */
function Pool({
  length,
  swimmerStatesRef,
  foamIntensity,
}: {
  length: number;
  swimmerStatesRef: React.MutableRefObject<SwimmerState[]>;
  foamIntensity: number;
}) {
  const width = LANE_CONFIG.totalWidth;
  const { wallThickness, floorY, waterY } = POOL_CONFIG;
  const halfWidth = width / 2;
  const wallHeight = Math.abs(floorY) + 0.1; // Wall extends slightly above deck
  
  // Suppress unused variable warnings
  void swimmerStatesRef;
  void foamIntensity;

  return (
    <group>
      {/* ANIMATED WATER SURFACE - high transparency to see through */}
      <AnimatedWaterSurface width={width} length={length} waterY={waterY} />

      {/* Pool floor with CAUSTICS and TILE pattern */}
      <CausticsPoolFloor width={width} length={length} floorY={floorY} />

      {/* Lane lines on floor */}
      <LaneLines poolLength={length} />

      {/* Pool walls with TILED texture */}
      {/* Left wall (inner face) */}
      <TiledPoolWall 
        width={length} 
        height={wallHeight} 
        position={[-halfWidth, floorY + wallHeight / 2, length / 2]}
        rotation={[0, Math.PI / 2, 0]}
      />
      {/* Right wall (inner face) */}
      <TiledPoolWall 
        width={length} 
        height={wallHeight} 
        position={[halfWidth, floorY + wallHeight / 2, length / 2]}
        rotation={[0, -Math.PI / 2, 0]}
      />
      {/* Start wall (inner face) */}
      <TiledPoolWall 
        width={width} 
        height={wallHeight} 
        position={[0, floorY + wallHeight / 2, 0]}
        rotation={[0, 0, 0]}
      />
      {/* End wall (inner face) */}
      <TiledPoolWall 
        width={width} 
        height={wallHeight} 
        position={[0, floorY + wallHeight / 2, length]}
        rotation={[0, Math.PI, 0]}
      />

      {/* Wall backing (solid boxes for depth) */}
      <mesh position={[-halfWidth - wallThickness / 2, floorY + wallHeight / 2, length / 2]}>
        <boxGeometry args={[wallThickness, wallHeight, length]} />
        <meshStandardMaterial color="#0e7490" />
      </mesh>
      <mesh position={[halfWidth + wallThickness / 2, floorY + wallHeight / 2, length / 2]}>
        <boxGeometry args={[wallThickness, wallHeight, length]} />
        <meshStandardMaterial color="#0e7490" />
      </mesh>
      <mesh position={[0, floorY + wallHeight / 2, -wallThickness / 2]}>
        <boxGeometry args={[width + wallThickness * 2, wallHeight, wallThickness]} />
        <meshStandardMaterial color="#0e7490" />
      </mesh>
      <mesh position={[0, floorY + wallHeight / 2, length + wallThickness / 2]}>
        <boxGeometry args={[width + wallThickness * 2, wallHeight, wallThickness]} />
        <meshStandardMaterial color="#0e7490" />
      </mesh>

      {/* OVERFLOW GUTTER (Überlaufrinne) */}
      <PoolGutter poolLength={length} poolWidth={width} />

      {/* UNDERWATER HANDRAIL (Griffleiste) */}
      <PoolHandrail poolLength={length} poolWidth={width} />

      {/* POOL LADDERS (GLB) - 4 total (2 per side) */}
      {/* Left side - between pennant and pool end */}
      <PoolLadderGlb
        position={[-halfWidth - wallThickness - 0.1, 0, 2.5]}
        rotation={Math.PI / 2}
        scale={1}
      />
      <PoolLadderGlb
        position={[-halfWidth - wallThickness - 0.1, 0, length - 2.5]}
        rotation={Math.PI / 2}
        scale={1}
      />
      {/* Right side - between pennant and pool end */}
      <PoolLadderGlb
        position={[halfWidth + wallThickness + 0.1, 0, 2.5]}
        rotation={-Math.PI / 2}
        scale={1}
      />
      <PoolLadderGlb
        position={[halfWidth + wallThickness + 0.1, 0, length - 2.5]}
        rotation={-Math.PI / 2}
        scale={1}
      />

      {/* Pool deck/rim - white concrete */}
      {/* Left deck */}
      <mesh position={[-halfWidth - wallThickness - 1, 0, length / 2]}>
        <boxGeometry args={[2, 0.15, length + 4]} />
        <meshStandardMaterial color="#f1f5f9" roughness={0.8} />
      </mesh>
      {/* Right deck */}
      <mesh position={[halfWidth + wallThickness + 1, 0, length / 2]}>
        <boxGeometry args={[2, 0.15, length + 4]} />
        <meshStandardMaterial color="#f1f5f9" roughness={0.8} />
      </mesh>
      {/* Start deck */}
      <mesh position={[0, 0, -1.5]}>
        <boxGeometry args={[width + wallThickness * 2 + 4, 0.15, 3]} />
        <meshStandardMaterial color="#f1f5f9" roughness={0.8} />
      </mesh>
      {/* End deck */}
      <mesh position={[0, 0, length + 1.5]}>
        <boxGeometry args={[width + wallThickness * 2 + 4, 0.15, 3]} />
        <meshStandardMaterial color="#f1f5f9" roughness={0.8} />
      </mesh>

      {/* Pool edge/coping - slightly raised white edge */}
      <mesh position={[-halfWidth - wallThickness / 2, 0.08, length / 2]}>
        <boxGeometry args={[0.15, 0.08, length + 0.3]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <mesh position={[halfWidth + wallThickness / 2, 0.08, length / 2]}>
        <boxGeometry args={[0.15, 0.08, length + 0.3]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <mesh position={[0, 0.08, -wallThickness / 2]}>
        <boxGeometry args={[width + wallThickness * 2 + 0.3, 0.08, 0.15]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <mesh position={[0, 0.08, length + wallThickness / 2]}>
        <boxGeometry args={[width + wallThickness * 2 + 0.3, 0.08, 0.15]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>

      {/* Touch pads - Omega timing pads (transparent/invisible for now) */}
      {/* LANE_CONFIG.positions.map((x, i) => (
        <group key={`touchpad-${i}`}>
          <mesh position={[x, waterY - 0.3, 0.02]}>
            <boxGeometry args={[LANE_CONFIG.width - 0.15, 0.9, 0.04]} />
            <meshStandardMaterial color="#fbbf24" />
          </mesh>
          <mesh position={[x, waterY - 0.3, length - 0.02]}>
            <boxGeometry args={[LANE_CONFIG.width - 0.15, 0.9, 0.04]} />
            <meshStandardMaterial color="#fbbf24" />
          </mesh>
        </group>
      )) */}
    </group>
  );
}

// ============================================================================
// DEMO DATA
// ============================================================================

/** 
 * Demo race data: 2 lengths (50m total) per swimmer
 * Each swimmer has slightly different times to create race dynamics
 */
const DEMO_RACE_LENGTHS: LengthData[][] = [
  // Lane 1 - consistent swimmer
  [
    { index: 0, durationSeconds: 26.5, strokes: 11, strokeType: 'freestyle', cadence: 25 },
    { index: 1, durationSeconds: 27.0, strokes: 12, strokeType: 'freestyle', cadence: 27, isLastLap: true },
  ],
  // Lane 2 - fast start, slower return
  [
    { index: 0, durationSeconds: 24.8, strokes: 11, strokeType: 'freestyle', cadence: 27 },
    { index: 1, durationSeconds: 26.5, strokes: 12, strokeType: 'freestyle', cadence: 28, isLastLap: true },
  ],
  // Lane 3 - fastest swimmer (winner)
  [
    { index: 0, durationSeconds: 24.2, strokes: 10, strokeType: 'freestyle', cadence: 25 },
    { index: 1, durationSeconds: 24.8, strokes: 11, strokeType: 'freestyle', cadence: 27, isLastLap: true },
  ],
  // Lane 4 - negative split (faster return)
  [
    { index: 0, durationSeconds: 26.0, strokes: 12, strokeType: 'freestyle', cadence: 28 },
    { index: 1, durationSeconds: 25.2, strokes: 11, strokeType: 'freestyle', cadence: 26, isLastLap: true },
  ],
  // Lane 5 - slower but steady
  [
    { index: 0, durationSeconds: 27.5, strokes: 13, strokeType: 'freestyle', cadence: 28 },
    { index: 1, durationSeconds: 27.8, strokes: 13, strokeType: 'freestyle', cadence: 28, isLastLap: true },
  ],
];

/** Demo swimmer appearance config */
const DEMO_SWIMMER_CONFIG = [
  { skinTone: 'light' as const, swimsuitColor: '#1e40af' },
  { skinTone: 'medium' as const, swimsuitColor: '#dc2626' },
  { skinTone: 'tan' as const, swimsuitColor: '#16a34a' },
  { skinTone: 'light' as const, swimsuitColor: '#7c3aed' },
  { skinTone: 'dark' as const, swimsuitColor: '#0891b2' },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export interface AnalysisPool3DProps {
  /** Pool length in meters (25 or 50) */
  poolLength?: 25 | 50;
  /** Container height in pixels */
  height?: number;
  /** Show debug overlay */
  debug?: boolean;
}

/**
 * Professional 5-lane swimming pool for race analysis.
 *
 * Features:
 * - 5 competition lanes with lane ropes and markers
 * - Realistic swimming hall environment
 * - Multi-swimmer support with individual water effects
 * - Starting blocks and timing display
 *
 * @param poolLength - Pool length (25m or 50m)
 * @param height - Container height in pixels
 * @param debug - Show debug overlay
 */
export function AnalysisPool3D({
  poolLength = 25,
  height = 600,
  debug = false,
}: AnalysisPool3DProps) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [speedMultiplier, setSpeedMultiplier] = useState(1);
  const [cameraPos, setCameraPos] = useState('');
  const [currentLengthIndex, setCurrentLengthIndex] = useState(0);
  const [timelineProgress, setTimelineProgress] = useState(0);
  const [isDraggingTimeline, setIsDraggingTimeline] = useState(false);

  // Debug mode: enable keyboard control for swimmer positioning
  const DEBUG_KEYBOARD_CONTROL = debug; // Enable when debug=true
  // Track currently pressed keys for continuous movement
  const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set());
  // Accumulated offset/rotation (updated every frame while key held)
  const [debugOffset, setDebugOffset] = useState({ x: 0, y: 0, z: 0 });
  const [debugRotation, setDebugRotation] = useState({ x: 0, y: 0 });

  // Keyboard controls for debug mode - track key press/release
  useEffect(() => {
    if (!DEBUG_KEYBOARD_CONTROL) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if not typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      const validKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'PageUp', 'PageDown', ',', '.', '<', '>', 'r', 'R'];
      if (validKeys.includes(e.key)) {
        e.preventDefault();
        
        // Handle reset immediately
        if (e.key === 'r' || e.key === 'R') {
          setDebugOffset({ x: 0, y: 0, z: 0 });
          setDebugRotation({ x: 0, y: 0 });
          return;
        }
        
        setPressedKeys(prev => new Set(prev).add(e.key));
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      setPressedKeys(prev => {
        const next = new Set(prev);
        next.delete(e.key);
        return next;
      });
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [DEBUG_KEYBOARD_CONTROL]);
  
  // Update offsets continuously while keys are pressed (called from useFrame in DebugKeyboardHandler)
  const updateDebugOffsets = useCallback((delta: number) => {
    if (pressedKeys.size === 0) return;
    
    const MOVE_SPEED = 0.5; // 0.5m per second
    const ROTATE_SPEED = Math.PI * 0.3; // ~54 degrees per second
    
    let dy = 0, dz = 0, drx = 0;
    
    // ↑/↓ = Z position (closer/further from wall)
    if (pressedKeys.has('ArrowUp')) dz -= MOVE_SPEED * delta;
    if (pressedKeys.has('ArrowDown')) dz += MOVE_SPEED * delta;
    // ←/→ = Y position (up/down in water) - NOT X (lane change)
    if (pressedKeys.has('ArrowLeft')) dy -= MOVE_SPEED * delta;
    if (pressedKeys.has('ArrowRight')) dy += MOVE_SPEED * delta;
    // ,/. = X rotation (lean forward/backward)
    if (pressedKeys.has(',') || pressedKeys.has('<')) drx -= ROTATE_SPEED * delta;
    if (pressedKeys.has('.') || pressedKeys.has('>')) drx += ROTATE_SPEED * delta;
    
    if (dy !== 0 || dz !== 0) {
      setDebugOffset(prev => ({ x: 0, y: prev.y + dy, z: prev.z + dz })); // X always 0
    }
    if (drx !== 0) {
      setDebugRotation(prev => ({ ...prev, x: prev.x + drx }));
    }
  }, [pressedKeys]);

  // Swimmer states for water effects (one per lane)
  const swimmerStatesRef = useRef<SwimmerState[]>(
    Array(5)
      .fill(null)
      .map((_, i) => ({
        x: LANE_CONFIG.positions[i],
        y: SWIMMER_Y_BY_STROKE['freestyle'],
        z: 0,
        direction: 1 as 1 | -1,
        speed: 0,
        strokePhase: 0,
        isGliding: true,
        currentStrokeCount: 0,
        elapsedSeconds: 0,
        phase: 'START_GLIDE' as const,
        rotationX: 0,
        rotationY: 0,
      }))
  );

  // Get current length data for each swimmer based on currentLengthIndex
  const getCurrentLengthData = useCallback((laneIndex: number): LengthData => {
    const laneLengths = DEMO_RACE_LENGTHS[laneIndex] ?? DEMO_RACE_LENGTHS[0];
    const idx = Math.min(currentLengthIndex, laneLengths.length - 1);
    return { ...laneLengths[idx], index: currentLengthIndex };
  }, [currentLengthIndex]);

  // Get stroke types for splash particles (use first length's stroke type)
  const strokeTypes = useMemo(
    () => DEMO_RACE_LENGTHS.map((lengths) => lengths[0]?.strokeType ?? 'freestyle'),
    []
  );

  // Use fastest swimmer's time for length auto-advance (shortest duration)
  const currentLengths = useMemo(() => 
    DEMO_RACE_LENGTHS.map((lengths) => {
      const idx = Math.min(currentLengthIndex, lengths.length - 1);
      return lengths[idx];
    }),
    [currentLengthIndex]
  );
  
  // Find the longest duration (wait for slowest swimmer)
  const longestLength = useMemo(() => {
    const maxDuration = Math.max(...currentLengths.map(l => l?.durationSeconds ?? 0));
    return currentLengths.find(l => l?.durationSeconds === maxDuration) ?? currentLengths[0];
  }, [currentLengths]);
  
  const strokeType = longestLength?.strokeType ?? 'freestyle';
  const splashConfig = SPLASH_CONFIG[strokeType];
  
  // Total number of lengths in the race
  const totalLengths = DEMO_RACE_LENGTHS[0]?.length ?? 2;

  // Helper component to run updateDebugOffsets in useFrame
  const DebugKeyboardHandler = useCallback(() => {
    useFrame((_, delta) => {
      updateDebugOffsets(delta);
    });
    return null;
  }, [updateDebugOffsets]);

  return (
    <div className="relative w-full bg-gray-900" style={{ height }}>
      <Canvas camera={{ position: [12, 6, -5], fov: 50 }} shadows>
        {/* Sky background */}
        <color attach="background" args={['#87ceeb']} />
        
        {/* Debug keyboard handler for continuous movement */}
        {DEBUG_KEYBOARD_CONTROL && <DebugKeyboardHandler />}
        
        <CameraTracker onUpdate={setCameraPos} />
        <LengthAutoAdvance
          isPlaying={isPlaying}
          speedMultiplier={speedMultiplier}
          lengths={DEMO_RACE_LENGTHS[0]}
          currentLengthIndex={currentLengthIndex}
          setCurrentLengthIndex={(idx) => {
            if (idx < totalLengths) {
              setCurrentLengthIndex(idx);
            }
          }}
          timelineProgress={timelineProgress}
          setTimelineProgress={setTimelineProgress}
          isDraggingTimeline={isDraggingTimeline}
        />

        {/* Lighting */}
        <ambientLight intensity={0.7} />
        <directionalLight position={[10, 15, 10]} intensity={1.0} castShadow />
        <directionalLight position={[-10, 10, -5]} intensity={0.4} />
        <hemisphereLight intensity={0.5} groundColor="#87ceeb" />

        {/* Environment - DISABLED for now, only pool */}
        {/* <SwimmingHall poolLength={poolLength} /> */}
        {/* <SpectatorStands poolLength={poolLength} /> */}
        {/* <TimingDisplay /> */}

        {/* Pool structure - all elements lowered by yOffset */}
        <group position={[0, POOL_CONFIG.yOffset, 0]}>
          <Pool length={poolLength} swimmerStatesRef={swimmerStatesRef} foamIntensity={splashConfig.foam} />
          <PoolDeck poolLength={poolLength} />
          <StartingBlocks />

          {/* Lane equipment */}
          <LaneRopes poolLength={poolLength} />
          <PennantLines poolLength={poolLength} />

          {/* Splash particles for all swimmers */}
          <MultiSwimmerSplashParticles
            swimmerStatesRef={swimmerStatesRef}
            strokeTypes={strokeTypes}
            isPlaying={isPlaying}
            speedMultiplier={speedMultiplier}
          />
        </group>

        {/* Swimmers - 5 lanes */}
        {DEMO_RACE_LENGTHS.map((_, laneIdx) => {
          const config = DEMO_SWIMMER_CONFIG[laneIdx];
          const lengthData = getCurrentLengthData(laneIdx);
          // Apply debug override when PAUSED (not playing) - allows positioning at any point
          // Position and rotation offsets are ADDITIVE (see SimpleLaneSwimmer)
          const swimmerDebugOverride = (DEBUG_KEYBOARD_CONTROL && !isPlaying)
            ? { positionOffset: debugOffset, rotationOverride: debugRotation }
            : undefined;
          return (
            <group key={`swimmer-${laneIdx}`} position={[LANE_CONFIG.positions[laneIdx], POOL_CONFIG.yOffset, 0]}>
              <SimpleLaneSwimmer
                poolLength={poolLength}
                lengthData={lengthData}
                isPlaying={isPlaying && !isDraggingTimeline}
                speedMultiplier={speedMultiplier}
                skinTone={config.skinTone}
                swimsuitColor={config.swimsuitColor}
                disabledAnimationKeywords={['extreme']}
                timelineProgress={timelineProgress}
                debugOverride={swimmerDebugOverride}
                onPositionUpdate={(state) => {
                  swimmerStatesRef.current[laneIdx] = {
                    ...state,
                    x: LANE_CONFIG.positions[laneIdx],
                  };
                }}
              />
            </group>
          );
        })}

        <OrbitControls target={[0, 0, poolLength / 2]} maxPolarAngle={Math.PI / 2} />
      </Canvas>

      {/* Controls overlay */}
      <div className="absolute bottom-4 left-4 right-4 bg-white/90 dark:bg-gray-800/90 rounded-lg p-4 shadow-lg backdrop-blur">
        {/* Timeline */}
        <div className="mb-4">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-sm font-mono text-gray-600 dark:text-gray-400 w-16">
              {((longestLength?.durationSeconds ?? 0) * timelineProgress).toFixed(1)}s
            </span>
            <div className="flex-1 relative">
              <input
                type="range"
                min="0"
                max="1"
                step="0.001"
                value={timelineProgress}
                onChange={(e) => setTimelineProgress(Number(e.target.value))}
                onMouseDown={() => setIsDraggingTimeline(true)}
                onMouseUp={() => setIsDraggingTimeline(false)}
                onTouchStart={() => setIsDraggingTimeline(true)}
                onTouchEnd={() => setIsDraggingTimeline(false)}
                className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <div
                className="absolute top-0 left-0 h-2 bg-blue-500 rounded-l-lg pointer-events-none"
                style={{ width: `${timelineProgress * 100}%` }}
              />
            </div>
            <span className="text-sm font-mono text-gray-600 dark:text-gray-400 w-16 text-right">
              {(longestLength?.durationSeconds ?? 0).toFixed(1)}s
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium"
          >
            {isPlaying ? '⏸ Pause' : '▶ Play'}
          </button>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Speed:</span>
            <input
              type="range"
              min="0.25"
              max="3"
              step="0.25"
              value={speedMultiplier}
              onChange={(e) => setSpeedMultiplier(Number(e.target.value))}
              className="w-24"
            />
            <span className="text-sm text-gray-600 dark:text-gray-400">{speedMultiplier}x</span>
          </div>

          <div className="text-sm text-gray-600 dark:text-gray-400">
            Bahn {currentLengthIndex + 1}/{totalLengths} • 5 Schwimmer • {strokeType} • {poolLength}m
          </div>
        </div>
      </div>

      {/* Debug overlay */}
      {debug && (
        <div className="absolute top-4 left-4 bg-black/70 text-white text-xs font-mono p-2 rounded max-w-md">
          <div>Camera: {cameraPos}</div>
          
          {/* Swimmer Lane 1 detailed info */}
          {(() => {
            const s = swimmerStatesRef.current[0];
            const rotXDeg = s?.rotationX !== undefined ? (s.rotationX * 180 / Math.PI).toFixed(1) : '?';
            const rotYDeg = s?.rotationY !== undefined ? (s.rotationY * 180 / Math.PI).toFixed(1) : '?';
            return (
              <div className="mt-1 p-1 bg-blue-900/50 rounded">
                <div className="font-bold text-blue-300">Swimmer Lane 1:</div>
                <div>Pos: X={s?.x?.toFixed(2) ?? '?'} Y={s?.y?.toFixed(2) ?? '?'} Z={s?.z?.toFixed(2) ?? '?'}</div>
                <div>Rot: X={rotXDeg}° Y={rotYDeg}° (Wasser=0°)</div>
                <div>Phase: {s?.phase ?? '?'}</div>
              </div>
            );
          })()}
          
          {/* Debug controls info */}
          {DEBUG_KEYBOARD_CONTROL && (() => {
            return (
              <div className="mt-2 p-1 bg-yellow-900/50 rounded">
                <div className="font-bold text-yellow-300">Debug Controls (ALL Lanes):</div>
                <div className={!isPlaying ? 'text-green-400' : 'text-red-400'}>
                  Active: {!isPlaying ? 'YES (PAUSED)' : 'NO (playing)'}
                </div>
                <div>Offset: Y={debugOffset.y.toFixed(2)} Z={debugOffset.z.toFixed(2)}</div>
                <div>RotX: {(debugRotation.x * 180 / Math.PI).toFixed(1)}°</div>
                <div className="mt-1 text-gray-400">
                  ↑↓: Z (Wand) | ←→: Y (hoch/runter)
                </div>
                <div className="text-gray-400">
                  ,/.: rotate X | R: reset
                </div>
              </div>
            );
          })()}
          
          <div className="mt-2 border-t border-white/30 pt-2">
            <div>Pool: {poolLength}m × {LANE_CONFIG.totalWidth}m</div>
            <div>Playing: {isPlaying ? 'Yes' : 'No'} | Speed: {speedMultiplier}x</div>
            <div>Length: {currentLengthIndex + 1}/{totalLengths}</div>
          </div>
          
          {/* All lanes summary */}
          <div className="mt-2 border-t border-white/30 pt-2 text-[10px]">
            {LANE_CONFIG.positions.map((_, laneIdx) => {
              const state = swimmerStatesRef.current[laneIdx];
              return (
                <div key={laneIdx}>
                  L{laneIdx + 1}: Z={state?.z.toFixed(1) ?? '?'} {state?.phase ?? '?'}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default AnalysisPool3D;
