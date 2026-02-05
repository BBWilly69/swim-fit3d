/**
 * SimpleLaneDemo Component - Demo scene für GLB Schwimmer
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { SimpleLaneSwimmer, type LengthData, type StrokeType, type SwimmerState } from './SimpleLaneSwimmer';

/**
 * Splash configuration per stroke type
 * - Hand offset: lateral distance from swimmer center where hands enter water
 * - Feet offset: lateral distance for kick splashes
 * - Phase timings for when hands/feet hit water surface
 */
/**
 * Splash configuration per stroke type
 * - feetOffsetX: how far apart the feet splashes are (smaller = closer together)
 * - For freestyle/backstroke: alternating kick splashes (left/right separate phases)
 * - For butterfly/breaststroke: simultaneous kick splashes
 */
const SPLASH_CONFIG: Record<StrokeType, {
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
  leftKickPhases: [number, number][]; // Left foot kick phases
  rightKickPhases: [number, number][]; // Right foot kick phases (same as left for butterfly/breaststroke)
}> = {
  breaststroke: { 
    hands: 0.3, feet: 0.2, foam: 0.4, strokesPerCycle: 1,
    handOffsetX: 0.4, feetOffsetX: 0.12, handEntryZ: 0.7, feetZ: -0.8,
    leftHandPhase: [0.1, 0.2], rightHandPhase: [0.1, 0.2],
    // Breaststroke: both feet kick together
    leftKickPhases: [[0.6, 0.75]],
    rightKickPhases: [[0.6, 0.75]],
  },
  freestyle: { 
    hands: 1.0, feet: 0.8, foam: 0.8, strokesPerCycle: 2,
    handOffsetX: 0.35, feetOffsetX: 0.12, handEntryZ: 0.8, feetZ: -0.7,
    leftHandPhase: [0.0, 0.12], rightHandPhase: [0.5, 0.62],
    // Freestyle: alternating flutter kick - left and right at different phases
    leftKickPhases: [[0.1, 0.2], [0.6, 0.7]],
    rightKickPhases: [[0.35, 0.45], [0.85, 0.95]],
  },
  backstroke: { 
    hands: 0.9, feet: 0.8, foam: 0.7, strokesPerCycle: 2,
    handOffsetX: 0.4, feetOffsetX: 0.12, handEntryZ: -0.5, feetZ: 0.6,
    leftHandPhase: [0.0, 0.12], rightHandPhase: [0.5, 0.62],
    // Backstroke: alternating flutter kick - left and right at different phases
    leftKickPhases: [[0.1, 0.2], [0.6, 0.7]],
    rightKickPhases: [[0.35, 0.45], [0.85, 0.95]],
  },
  butterfly: { 
    hands: 1.0, feet: 0.4, foam: 0.9, strokesPerCycle: 1,
    handOffsetX: 0.5, feetOffsetX: 0.10, handEntryZ: 0.9, feetZ: -0.8,
    leftHandPhase: [0.05, 0.18], rightHandPhase: [0.05, 0.18],
    // Butterfly: dolphin kick - both feet together
    leftKickPhases: [[0.2, 0.35], [0.7, 0.85]],
    rightKickPhases: [[0.2, 0.35], [0.7, 0.85]],
  },
};

export interface SimpleLaneDemoProps {
  poolLength?: 25 | 50;
  height?: number;
  debug?: boolean;
}

interface ControlsProps {
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  currentLengthIndex: number;
  setCurrentLengthIndex: (index: number) => void;
  speedMultiplier: number;
  setSpeedMultiplier: (speed: number) => void;
  lengths: LengthData[];
  timelineProgress: number;
  setTimelineProgress: (progress: number) => void;
  onTimelineDragStart: () => void;
  onTimelineDragEnd: () => void;
}

// Kamera-Tracker Komponente
function CameraTracker({ onUpdate }: { onUpdate: (pos: string) => void }) {
  const { camera } = useThree();
  useFrame(() => {
    const p = camera.position;
    onUpdate(`X:${p.x.toFixed(1)} Y:${p.y.toFixed(1)} Z:${p.z.toFixed(1)}`);
  });
  return null;
}

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

  // Sync elapsed time when dragging timeline
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
    
    // Update timeline progress
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

// Demo: 2 laps freestyle with FIT file values from 21682457269_ACTIVITY.fit
// Garmin data: Lap 1.1 = 12 strokes in 27.3s, Lap 1.2 = 12 strokes in 22.0s
const DEMO_2_LAPS_FREESTYLE: LengthData[] = [
  { 
    index: 0, 
    durationSeconds: 27.3,  // First lap from FIT
    strokes: 12,            // 12 strokes from FIT
    strokeType: 'freestyle',
    cadence: 26,            // avg_swimming_cadence from FIT
  },
  { 
    index: 1, 
    durationSeconds: 22.0,  // Second lap from FIT
    strokes: 12,            // 12 strokes from FIT  
    strokeType: 'freestyle',
    cadence: 33,            // avg_swimming_cadence from FIT
    isLastLap: true,        // Mark as last lap for REST position
  },
];

// Demo: Variety pack with all stroke types (for later use)
// @ts-expect-error Reserved for future use
const _DEMO_50M_BY_STYLE: LengthData[] = [
  { index: 0, durationSeconds: 27.3, strokes: 12, strokeType: 'freestyle', cadence: 26, animationIndex: 0 },
  { index: 1, durationSeconds: 22.0, strokes: 12, strokeType: 'freestyle', cadence: 33, animationIndex: 0 },
  { index: 2, durationSeconds: 34.0, strokes: 16, strokeType: 'backstroke', cadence: 24, animationIndex: 0 },
  { index: 3, durationSeconds: 32.0, strokes: 16, strokeType: 'backstroke', cadence: 25, animationIndex: 0 },
  { index: 4, durationSeconds: 38.0, strokes: 14, strokeType: 'breaststroke', cadence: 22, animationIndex: 0 },
  { index: 5, durationSeconds: 36.0, strokes: 14, strokeType: 'breaststroke', cadence: 23, animationIndex: 0 },
  { index: 6, durationSeconds: 30.0, strokes: 18, strokeType: 'butterfly', cadence: 28 },
  { index: 7, durationSeconds: 29.0, strokes: 18, strokeType: 'butterfly', cadence: 29 },
];

const DemoControls: React.FC<ControlsProps> = ({
  isPlaying,
  setIsPlaying,
  currentLengthIndex,
  setCurrentLengthIndex,
  speedMultiplier,
  setSpeedMultiplier,
  lengths,
  timelineProgress,
  setTimelineProgress,
  onTimelineDragStart,
  onTimelineDragEnd,
}) => {
  const currentLength = lengths[currentLengthIndex];
  const currentTime = (currentLength?.durationSeconds ?? 0) * timelineProgress;
  const totalTime = currentLength?.durationSeconds ?? 0;

  return (
    <div className="absolute bottom-4 left-4 right-4 bg-white/90 dark:bg-gray-800/90 rounded-lg p-4 shadow-lg backdrop-blur">
      {/* Timeline Slider */}
      <div className="mb-4">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-sm font-mono text-gray-600 dark:text-gray-400 w-16">
            {currentTime.toFixed(1)}s
          </span>
          <div className="flex-1 relative">
            <input
              type="range"
              min="0"
              max="1"
              step="0.001"
              value={timelineProgress}
              onChange={(e) => setTimelineProgress(Number(e.target.value))}
              onMouseDown={onTimelineDragStart}
              onMouseUp={onTimelineDragEnd}
              onTouchStart={onTimelineDragStart}
              onTouchEnd={onTimelineDragEnd}
              className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            {/* Progress indicator bar */}
            <div
              className="absolute top-0 left-0 h-2 bg-blue-500 rounded-l-lg pointer-events-none"
              style={{ width: `${timelineProgress * 100}%` }}
            />
          </div>
          <span className="text-sm font-mono text-gray-600 dark:text-gray-400 w-16 text-right">
            {totalTime.toFixed(1)}s
          </span>
        </div>
        <div className="text-center text-xs text-gray-500 dark:text-gray-400">
          Length #{currentLengthIndex + 1}: {currentLength?.strokeType} • {currentLength?.strokes} strokes @ {currentLength?.cadence} spm
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
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Length:</span>
          <select
            value={currentLengthIndex}
            onChange={(e) => {
              setCurrentLengthIndex(Number(e.target.value));
              setTimelineProgress(0);
            }}
            className="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg"
          >
            {lengths.map((l, i) => (
              <option key={i} value={i}>
                #{i + 1} - {l.strokeType} ({l.durationSeconds.toFixed(1)}s)
              </option>
            ))}
          </select>
        </div>
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
      </div>
    </div>
  );
};

function WaterSurface({
  width,
  length,
  swimmerStateRef,
  foamIntensity,
}: {
  width: number;
  length: number;
  swimmerStateRef: React.MutableRefObject<SwimmerState>;
  foamIntensity: number;
}) {
  const materialRef = useRef<THREE.ShaderMaterial>(null!);

  useFrame(({ clock }) => {
    if (materialRef.current) {
      const state = swimmerStateRef.current;
      materialRef.current.uniforms.uTime.value = clock.getElapsedTime();
      // Convert swimmer world Z to water plane local coordinates
      // Plane is at position [0,0,length/2] with rotation [-PI/2,0,0]
      // Local plane Y goes from -length/2 to +length/2
      // World Z=0 (red) should map to local Y = -length/2
      // World Z=length (green) should map to local Y = +length/2
      // Formula: localY = worldZ - length/2
      // BUT the rotation flips the mapping, so we need: localY = -(worldZ - length/2) = length/2 - worldZ
      const localSwimmerY = length / 2 - state.z;
      materialRef.current.uniforms.uSwimmerZ.value = localSwimmerY;
      materialRef.current.uniforms.uSwimmerSpeed.value = Math.abs(state.speed);
      // Direction is also flipped due to rotation
      materialRef.current.uniforms.uSwimDirection.value = -state.direction;
      materialRef.current.uniforms.uStrokePhase.value = state.strokePhase;
      materialRef.current.uniforms.uFoamIntensity.value = foamIntensity;
    }
  });

  const uniforms = React.useMemo(
    () => ({
      uTime: { value: 0 },
      uSwimmerX: { value: 0.0 },
      uSwimmerZ: { value: 0.0 },
      uSwimmerSpeed: { value: 0.0 },
      uSwimDirection: { value: 1.0 },
      uStrokePhase: { value: 0.0 },
      uFoamIntensity: { value: 0.3 },
      uColorDeep: { value: new THREE.Color('#4bb7e8') },
      uColorShallow: { value: new THREE.Color('#8fdcff') },
    }),
    []
  );

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, length / 2]}>
      <planeGeometry args={[width, length, 128, 128]} />
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        transparent
        opacity={0.85}
        vertexShader={`
          uniform float uTime;
          uniform float uSwimmerX;
          uniform float uSwimmerZ;
          uniform float uSwimmerSpeed;
          uniform float uSwimDirection;
          uniform float uStrokePhase;
          varying float vWave;
          varying float vFoam;
          varying vec2 vUv;
          
          void main() {
            vUv = uv;
            vec3 pos = position;
            
            // 1. Subtle base waves
            float wave1 = sin(pos.x * 1.2 + uTime * 0.5) * 0.008;
            float wave2 = sin(pos.y * 1.5 + uTime * 0.4) * 0.006;
            float wave3 = sin(pos.x * 0.8 + pos.y * 0.9 + uTime * 0.3) * 0.004;
            
            // 2. Local ripple at swimmer (stronger)
            float dx = pos.x - uSwimmerX;
            float dz = pos.y - uSwimmerZ;  // pos.y = world Z (pool length axis)
            float dist = sqrt(dx * dx + dz * dz);
            float ripple = exp(-dist * dist * 0.2) * sin(uTime * 8.0 - dist * 12.0) * 0.035;
            
            // 3. V-shaped wake (Kelvin pattern) BEHIND swimmer
            // behindSwimmer > 0 means the water point is behind the swimmer
            float behindSwimmer = -dz * uSwimDirection;  // positive = behind swimmer
            float wake = 0.0;
            vFoam = 0.0;
            
            if (behindSwimmer > 0.5 && behindSwimmer < 12.0) {
              float kelvinAngle = 0.38;
              float wakeWidth = behindSwimmer * kelvinAngle;
              float distToWake = abs(abs(dx) - wakeWidth);
              float wakeFalloff = exp(-distToWake * distToWake * 4.0);
              float wakeDecay = exp(-behindSwimmer * 0.12);
              float wakePhase = behindSwimmer * 5.0 - uTime * 6.0;
              wake = wakeFalloff * wakeDecay * sin(wakePhase) * 0.045 * uSwimmerSpeed;
              
              // Foam line along wake arms (fades with distance)
              float distanceFade = exp(-behindSwimmer * 0.15);
              float foamLine = wakeFalloff * wakeDecay * distanceFade * 0.2;
              vFoam = max(vFoam, foamLine);
            }
            
            // 4. Stroke-synchronized splash disturbance (stronger)
            float strokePulse = sin(uStrokePhase * 6.28318) * 0.5 + 0.5;
            float splashDist = sqrt(dx * dx + dz * dz);
            float splash = exp(-splashDist * splashDist * 0.5) * strokePulse * 0.025 * uSwimmerSpeed;
            vFoam = max(vFoam, exp(-splashDist * splashDist * 0.4) * strokePulse * 0.2);
            
            pos.z += wave1 + wave2 + wave3 + ripple + wake + splash;
            vWave = wave1 + wave2 + wave3 + ripple + wake + splash;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
          }
        `}
        fragmentShader={`
          uniform vec3 uColorDeep;
          uniform vec3 uColorShallow;
          uniform float uFoamIntensity;
          varying float vWave;
          varying float vFoam;
          varying vec2 vUv;
          
          void main() {
            float depth = smoothstep(0.0, 1.0, vUv.y);
            vec3 color = mix(uColorDeep, uColorShallow, depth);
            color += vWave * 0.15;
            
            // Add foam (white) - MUCH STRONGER
            vec3 foamColor = vec3(1.0, 1.0, 1.0);
            float foamAmount = clamp(vFoam * uFoamIntensity, 0.0, 1.0);
            color = mix(color, foamColor, foamAmount * 0.85);
            
            gl_FragColor = vec4(color, 0.85);
          }
        `}
      />
    </mesh>
  );
}

function Pool({ 
  length, 
  swimmerStateRef,
  foamIntensity,
}: { 
  length: number; 
  swimmerStateRef: React.MutableRefObject<SwimmerState>;
  foamIntensity: number;
}) {
  const width = 4;
  const wallHeight = 1.2;
  const floorY = -0.35;
  const wallThickness = 0.2;

  return (
    <group>
      <WaterSurface width={width} length={length} swimmerStateRef={swimmerStateRef} foamIntensity={foamIntensity} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, floorY, length / 2]}>
        <planeGeometry args={[width, length, 1, 1]} />
        <meshStandardMaterial color="#6fb8de" roughness={0.8} metalness={0} />
      </mesh>
      <mesh position={[-width / 2 - wallThickness / 2, wallHeight / 2 + floorY, length / 2]}>
        <boxGeometry args={[wallThickness, wallHeight, length]} />
        <meshStandardMaterial color="#7ec3e4" roughness={0.6} />
      </mesh>
      <mesh position={[width / 2 + wallThickness / 2, wallHeight / 2 + floorY, length / 2]}>
        <boxGeometry args={[wallThickness, wallHeight, length]} />
        <meshStandardMaterial color="#7ec3e4" roughness={0.6} />
      </mesh>
      <mesh position={[0, wallHeight / 2 + floorY, -wallThickness / 2]}>
        <boxGeometry args={[width, wallHeight, wallThickness]} />
        <meshStandardMaterial color="#7ec3e4" roughness={0.6} />
      </mesh>
      <mesh position={[0, wallHeight / 2 + floorY, length + wallThickness / 2]}>
        <boxGeometry args={[width, wallHeight, wallThickness]} />
        <meshStandardMaterial color="#7ec3e4" roughness={0.6} />
      </mesh>
    </group>
  );
}

/**
 * Particle-based splash system synchronized to stroke phases
 * Spawns particles at actual hand and feet positions
 */

function isInPhase(phase: number, window: [number, number]): boolean {
  if (window[0] <= window[1]) {
    return phase >= window[0] && phase <= window[1];
  }
  return phase >= window[0] || phase <= window[1];
}

function SplashParticles({
  swimmerStateRef,
  strokeType,
  isPlaying,
  speedMultiplier,
}: {
  swimmerStateRef: React.MutableRefObject<SwimmerState>;
  strokeType: StrokeType;
  isPlaying: boolean;
  speedMultiplier: number;
}) {
  const PARTICLE_COUNT = 2000; // Many more particles for visible splashes
  const pointsRef = useRef<THREE.Points>(null!);
  const config = SPLASH_CONFIG[strokeType];
  
  // 0=leftHand, 1=rightHand, 2=leftFoot, 3=rightFoot
  const [positions, velocities, lifetimes, types] = useMemo(() => {
    const pos = new Float32Array(PARTICLE_COUNT * 4);
    const vel = new Float32Array(PARTICLE_COUNT * 4);
    const life = new Float32Array(PARTICLE_COUNT);
    const typ = new Float32Array(PARTICLE_COUNT);
    
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      pos[i * 3] = 0;
      pos[i * 3 + 1] = -1; // Hide far below until spawned
      pos[i * 3 + 2] = 0;
      life[i] = 0;
      // 30% leftHand, 30% rightHand, 20% leftFoot, 20% rightFoot
      if (i < PARTICLE_COUNT * 0.3) typ[i] = 0;
      else if (i < PARTICLE_COUNT * 0.6) typ[i] = 1;
      else if (i < PARTICLE_COUNT * 0.8) typ[i] = 2;
      else typ[i] = 3;
    }
    return [pos, vel, life, typ];
  }, []);

  const spawnCooldownRef = useRef<Record<number, number>>({ 0: 0, 1: 0, 2: 0, 3: 0 });

  useFrame((_, delta) => {
    if (!pointsRef.current || !isPlaying) return;
    
    const state = swimmerStateRef.current;
    
    // No particle spawning during glide phase
    if (state.isGliding) {
      // Still update existing particles (gravity, etc.)
      const posAttr = pointsRef.current.geometry.attributes.position;
      const posArray = posAttr.array as Float32Array;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const idx = i * 3;
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
        }
      }
      posAttr.needsUpdate = true;
      return;
    }
    
    const posAttr = pointsRef.current.geometry.attributes.position;
    const posArray = posAttr.array as Float32Array;
    const phase = state.strokePhase;
    const dir = state.direction;
    
    // Update cooldowns
    for (const key in spawnCooldownRef.current) {
      spawnCooldownRef.current[key] -= delta * speedMultiplier;
    }
    
    // Determine which splash points are active
    const isLeftHandActive = isInPhase(phase, config.leftHandPhase);
    const isRightHandActive = isInPhase(phase, config.rightHandPhase);
    // Separate left/right kick phases for alternating kicks (freestyle/backstroke)
    const isLeftKickActive = config.leftKickPhases.some(kp => isInPhase(phase, kp));
    const isRightKickActive = config.rightKickPhases.some(kp => isInPhase(phase, kp));
    
    // Calculate actual world positions for hands and feet
    const swimmerZ = state.z;
    const handZOffset = config.handEntryZ * dir;
    const feetZOffset = config.feetZ * dir;
    
    // Hand positions (X offset from center, Z in front/behind based on stroke)
    const leftHandX = -config.handOffsetX;
    const rightHandX = config.handOffsetX;
    const leftFootX = -config.feetOffsetX;
    const rightFootX = config.feetOffsetX;
    
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const idx = i * 3;
      const particleType = types[i];
      
      // Update living particles
      if (lifetimes[i] > 0) {
        lifetimes[i] -= delta * speedMultiplier;
        
        posArray[idx] += velocities[idx] * delta * speedMultiplier;
        posArray[idx + 1] += velocities[idx + 1] * delta * speedMultiplier;
        posArray[idx + 2] += velocities[idx + 2] * delta * speedMultiplier;
        
        // Gravity
        velocities[idx + 1] -= 12.0 * delta * speedMultiplier;
        
        // Remove when particle hits water surface (Y=0)
        if (posArray[idx + 1] < 0.0) {
          lifetimes[i] = 0;
          posArray[idx + 1] = -100; // Hide far below
        }
      }
      
      // Spawn new particles at correct positions
      if (lifetimes[i] <= 0 && spawnCooldownRef.current[particleType] <= 0) {
        let shouldSpawn = false;
        let spawnX = 0;
        let spawnZ = swimmerZ;
        let intensity = 0;
        
        switch (particleType) {
          case 0: // Left hand
            if (isLeftHandActive && Math.random() < config.hands) {
              shouldSpawn = true;
              spawnX = leftHandX;
              spawnZ = swimmerZ + handZOffset;
              intensity = config.hands;
            }
            break;
          case 1: // Right hand
            if (isRightHandActive && Math.random() < config.hands) {
              shouldSpawn = true;
              spawnX = rightHandX;
              spawnZ = swimmerZ + handZOffset;
              intensity = config.hands;
            }
            break;
          case 2: // Left foot
            if (isLeftKickActive && Math.random() < config.feet) {
              shouldSpawn = true;
              spawnX = leftFootX;
              spawnZ = swimmerZ + feetZOffset;
              intensity = config.feet;
            }
            break;
          case 3: // Right foot
            if (isRightKickActive && Math.random() < config.feet) {
              shouldSpawn = true;
              spawnX = rightFootX;
              spawnZ = swimmerZ + feetZOffset;
              intensity = config.feet;
            }
            break;
        }
        
        if (shouldSpawn) {
          // Wider spread for dramatic splashes
          posArray[idx] = spawnX + (Math.random() - 0.5) * 0.09;
          posArray[idx + 1] = 0.02;
          posArray[idx + 2] = spawnZ + (Math.random() - 0.5) * 0.09;
          
          // Velocity: bigger, more dramatic splashes
          velocities[idx] = (Math.random() - 0.5) * 0.7 * intensity;
          velocities[idx + 1] = 1.5 + Math.random() * 1.4 * intensity;
          velocities[idx + 2] = (Math.random() - 0.5) * 0.3;
          
          lifetimes[i] = 0.4 + Math.random() * 0.5;
          spawnCooldownRef.current[particleType] = 0.003; // Much faster spawn rate
        }
      }
    }
    
    posAttr.needsUpdate = true;
  });

  if (config.hands < 0.15 && config.feet < 0.15) {
    return null;
  }

  return (
    <points ref={pointsRef} frustumCulled={false} renderOrder={999}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
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

export function SimpleLaneDemo({ poolLength = 25, height = 600, debug = true }: SimpleLaneDemoProps) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentLengthIndex, setCurrentLengthIndex] = useState(0);
  const [speedMultiplier, setSpeedMultiplier] = useState(1);
  const [cameraPos, setCameraPos] = useState('');
  const [timelineProgress, setTimelineProgress] = useState(0); // 0-1 progress within current length
  const [isDraggingTimeline, setIsDraggingTimeline] = useState(false);
  const swimmerStateRef = useRef<SwimmerState>({ 
    x: 0, y: 0, z: 0, direction: 1, speed: 0, strokePhase: 0, 
    isGliding: false, currentStrokeCount: 0, elapsedSeconds: 0,
    phase: 'START_GLIDE', rotationX: 0, rotationY: 0
  });

  // Use 2-lap freestyle demo (can switch to _DEMO_50M_BY_STYLE for variety)
  const lengths = DEMO_2_LAPS_FREESTYLE;
  const currentLength = lengths[currentLengthIndex];
  const strokeType = currentLength?.strokeType ?? 'freestyle';
  const splashConfig = SPLASH_CONFIG[strokeType];

  return (
    <div className="relative w-full bg-gray-900" style={{ height }}>
      <Canvas camera={{ position: [8, 4, 12], fov: 50 }}>
        <CameraTracker onUpdate={setCameraPos} />
        <LengthAutoAdvance
          isPlaying={isPlaying}
          speedMultiplier={speedMultiplier}
          lengths={lengths}
          currentLengthIndex={currentLengthIndex}
          setCurrentLengthIndex={setCurrentLengthIndex}
          timelineProgress={timelineProgress}
          setTimelineProgress={setTimelineProgress}
          isDraggingTimeline={isDraggingTimeline}
        />
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 10, 10]} intensity={1} castShadow />
        <hemisphereLight intensity={0.3} />
        
        <Pool length={poolLength} swimmerStateRef={swimmerStateRef} foamIntensity={splashConfig.foam} />
        
        {/* Splash particles */}
        <SplashParticles
          swimmerStateRef={swimmerStateRef}
          strokeType={strokeType}
          isPlaying={isPlaying}
          speedMultiplier={speedMultiplier}
        />
        
        {/* Axis helper - X=rot, Y=grün, Z=blau */}
        <axesHelper args={[5]} />
        
        {/* Referenzwürfel bei Z=0 (Start) */}
        <mesh position={[0, 0.5, 0]}>
          <boxGeometry args={[0.5, 1, 0.5]} />
          <meshStandardMaterial color="#ef4444" />
        </mesh>
        
        {/* Referenzwürfel bei Z=poolLength (Ende) */}
        <mesh position={[0, 0.5, poolLength]}>
          <boxGeometry args={[0.5, 1, 0.5]} />
          <meshStandardMaterial color="#22c55e" />
        </mesh>

        {/* Schwimmer - meldet Position für Wasser-Effekte */}
        <SimpleLaneSwimmer
          poolLength={poolLength}
          lengthData={currentLength}
          isPlaying={isPlaying && !isDraggingTimeline}
          speedMultiplier={speedMultiplier}
          disabledAnimationKeywords={['extreme']}
          timelineProgress={timelineProgress}
          onPositionUpdate={(state) => {
            swimmerStateRef.current = state;
          }}
        />

        <OrbitControls target={[0, 0, poolLength / 2]} />
      </Canvas>

      <DemoControls
        isPlaying={isPlaying}
        setIsPlaying={setIsPlaying}
        currentLengthIndex={currentLengthIndex}
        setCurrentLengthIndex={setCurrentLengthIndex}
        speedMultiplier={speedMultiplier}
        setSpeedMultiplier={setSpeedMultiplier}
        lengths={lengths}
        timelineProgress={timelineProgress}
        setTimelineProgress={setTimelineProgress}
        onTimelineDragStart={() => setIsDraggingTimeline(true)}
        onTimelineDragEnd={() => setIsDraggingTimeline(false)}
      />

      {debug && (
        <div className="absolute top-4 left-4 bg-black/70 text-white text-xs font-mono p-2 rounded">
          <div>Camera: {cameraPos}</div>
          <div>Swimmer: X:{swimmerStateRef.current.x.toFixed(2)} Y:{swimmerStateRef.current.y.toFixed(2)} Z:{swimmerStateRef.current.z.toFixed(2)}</div>
          <div>Gliding: {swimmerStateRef.current.isGliding ? 'Yes' : 'No'}</div>
          <div>Pool: {poolLength}m (Z-Achse)</div>
          <div>Start: Z=0 (rot), Ende: Z={poolLength} (grün)</div>
          <div>Length: #{currentLengthIndex + 1}</div>
          <div>Stroke: {currentLength?.strokeType}</div>
          <div>Duration: {(swimmerStateRef.current.elapsedSeconds ?? 0).toFixed(1)}s/{currentLength?.durationSeconds.toFixed(1)}s</div>
          <div>Cadence: {currentLength?.cadence ?? 'N/A'} spm</div>
          <div>Strokes: {swimmerStateRef.current.currentStrokeCount ?? 0}/{currentLength?.strokes ?? 'N/A'}</div>
        </div>
      )}
    </div>
  );
}

export default SimpleLaneDemo;
