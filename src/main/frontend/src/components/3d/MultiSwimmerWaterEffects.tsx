/**
 * MultiSwimmerWaterEffects - Water surface and splash particles for multiple swimmers
 * 
 * Supports multiple swimmers in a pool, each with their own:
 * - Dynamic water ripples and V-shaped wakes
 * - Foam effects based on stroke phase
 * - 1000 splash particles per swimmer
 * 
 * Designed for the 5-lane analysis pool (SwimPool3D).
 */

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { SwimmerState, StrokeType } from './SimpleLaneSwimmer';

/** Maximum number of swimmers supported */
const MAX_SWIMMERS = 8;

/** Particles per swimmer */
const PARTICLES_PER_SWIMMER = 1000;

/**
 * Splash configuration per stroke type
 * Controls when and how intensely splashes occur for hands and feet
 */
export const SPLASH_CONFIG: Record<StrokeType, {
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
}> = {
  breaststroke: { 
    hands: 0.3, feet: 0.2, foam: 0.4, strokesPerCycle: 1,
    handOffsetX: 0.4, feetOffsetX: 0.12, handEntryZ: 0.7, feetZ: -0.8,
    leftHandPhase: [0.1, 0.2], rightHandPhase: [0.1, 0.2],
    leftKickPhases: [[0.6, 0.75]],
    rightKickPhases: [[0.6, 0.75]],
  },
  freestyle: { 
    hands: 1.0, feet: 0.8, foam: 0.8, strokesPerCycle: 2,
    handOffsetX: 0.35, feetOffsetX: 0.12, handEntryZ: 0.8, feetZ: -0.7,
    leftHandPhase: [0.0, 0.12], rightHandPhase: [0.5, 0.62],
    leftKickPhases: [[0.1, 0.2], [0.6, 0.7]],
    rightKickPhases: [[0.35, 0.45], [0.85, 0.95]],
  },
  backstroke: { 
    hands: 0.9, feet: 0.8, foam: 0.7, strokesPerCycle: 2,
    handOffsetX: 0.4, feetOffsetX: 0.12, handEntryZ: -0.5, feetZ: 0.6,
    leftHandPhase: [0.0, 0.12], rightHandPhase: [0.5, 0.62],
    leftKickPhases: [[0.1, 0.2], [0.6, 0.7]],
    rightKickPhases: [[0.35, 0.45], [0.85, 0.95]],
  },
  butterfly: { 
    hands: 1.0, feet: 0.4, foam: 0.9, strokesPerCycle: 1,
    handOffsetX: 0.5, feetOffsetX: 0.10, handEntryZ: 0.9, feetZ: -0.8,
    leftHandPhase: [0.05, 0.18], rightHandPhase: [0.05, 0.18],
    leftKickPhases: [[0.2, 0.35], [0.7, 0.85]],
    rightKickPhases: [[0.2, 0.35], [0.7, 0.85]],
  },
};

export interface SwimmerEffectsData {
  /** Reference to swimmer state */
  stateRef: React.MutableRefObject<SwimmerState>;
  /** X position of the lane (lateral) */
  laneX: number;
  /** Stroke type for splash timing */
  strokeType: StrokeType;
  /** Whether this swimmer is active */
  isActive: boolean;
  /** Swimmer/Lane color for foam tint */
  color?: string;
}

export interface MultiSwimmerWaterSurfaceProps {
  /** Pool width in meters */
  width: number;
  /** Pool length in meters */
  length: number;
  /** Array of swimmer data for water effects */
  swimmers: SwimmerEffectsData[];
  /** Base foam intensity multiplier */
  foamIntensity?: number;
}

/**
 * Multi-swimmer water surface with dynamic ripples, wakes, and foam
 * 
 * The water surface responds to all active swimmers:
 * - Local ripples at each swimmer position
 * - V-shaped Kelvin wakes behind moving swimmers
 * - Stroke-synchronized splash disturbances
 * - Foam accumulation along wake arms
 */
export function MultiSwimmerWaterSurface({
  width,
  length,
  swimmers,
  foamIntensity = 0.5,
}: MultiSwimmerWaterSurfaceProps) {
  const materialRef = useRef<THREE.ShaderMaterial>(null!);

  // Update uniforms every frame with swimmer positions
  useFrame(({ clock }) => {
    if (!materialRef.current) return;
    
    const uniforms = materialRef.current.uniforms;
    uniforms.uTime.value = clock.getElapsedTime();
    
    // Update each swimmer's data
    swimmers.slice(0, MAX_SWIMMERS).forEach((swimmer, i) => {
      if (swimmer.isActive && swimmer.stateRef.current) {
        const state = swimmer.stateRef.current;
        // Convert world Z to water plane local Y
        const localSwimmerY = length / 2 - state.z;
        uniforms[`uSwimmer${i}X`].value = swimmer.laneX;
        uniforms[`uSwimmer${i}Z`].value = localSwimmerY;
        uniforms[`uSwimmer${i}Speed`].value = Math.abs(state.speed);
        uniforms[`uSwimmer${i}Dir`].value = -state.direction;
        uniforms[`uSwimmer${i}Phase`].value = state.strokePhase;
        uniforms[`uSwimmer${i}Active`].value = 1.0;
        uniforms[`uSwimmer${i}Foam`].value = SPLASH_CONFIG[swimmer.strokeType].foam;
      } else {
        uniforms[`uSwimmer${i}Active`].value = 0.0;
      }
    });
    
    uniforms.uFoamIntensity.value = foamIntensity;
  });

  // Create uniforms with swimmer data arrays
  const uniforms = useMemo(() => {
    const u: Record<string, { value: number | THREE.Color }> = {
      uTime: { value: 0 },
      uFoamIntensity: { value: foamIntensity },
      uColorDeep: { value: new THREE.Color('#4bb7e8') },
      uColorShallow: { value: new THREE.Color('#8fdcff') },
    };
    
    // Add uniforms for each potential swimmer
    for (let i = 0; i < MAX_SWIMMERS; i++) {
      u[`uSwimmer${i}X`] = { value: 0 };
      u[`uSwimmer${i}Z`] = { value: 0 };
      u[`uSwimmer${i}Speed`] = { value: 0 };
      u[`uSwimmer${i}Dir`] = { value: 1 };
      u[`uSwimmer${i}Phase`] = { value: 0 };
      u[`uSwimmer${i}Active`] = { value: 0 };
      u[`uSwimmer${i}Foam`] = { value: 0.5 };
    }
    
    return u;
  }, [foamIntensity]);

  // Generate GLSL uniform declarations
  const uniformDeclarations = useMemo(() => {
    let decl = `
      uniform float uTime;
      uniform float uFoamIntensity;
      uniform vec3 uColorDeep;
      uniform vec3 uColorShallow;
    `;
    for (let i = 0; i < MAX_SWIMMERS; i++) {
      decl += `
      uniform float uSwimmer${i}X;
      uniform float uSwimmer${i}Z;
      uniform float uSwimmer${i}Speed;
      uniform float uSwimmer${i}Dir;
      uniform float uSwimmer${i}Phase;
      uniform float uSwimmer${i}Active;
      uniform float uSwimmer${i}Foam;
      `;
    }
    return decl;
  }, []);

  // Generate swimmer effect calculation for vertex shader
  const swimmerEffectsCode = useMemo(() => {
    let code = '';
    for (let i = 0; i < MAX_SWIMMERS; i++) {
      code += `
      // Swimmer ${i} effects
      if (uSwimmer${i}Active > 0.5) {
        float dx${i} = pos.x - uSwimmer${i}X;
        float dz${i} = pos.y - uSwimmer${i}Z;
        float dist${i} = sqrt(dx${i} * dx${i} + dz${i} * dz${i});
        
        // Local ripple
        float ripple${i} = exp(-dist${i} * dist${i} * 0.25) * sin(uTime * 8.0 - dist${i} * 10.0) * 0.025 * uSwimmer${i}Speed;
        totalWave += ripple${i};
        
        // V-wake behind swimmer
        float behind${i} = -dz${i} * uSwimmer${i}Dir;
        if (behind${i} > 0.5 && behind${i} < 10.0) {
          float kelvinAngle = 0.38;
          float wakeWidth${i} = behind${i} * kelvinAngle;
          float distToWake${i} = abs(abs(dx${i}) - wakeWidth${i});
          float wakeFalloff${i} = exp(-distToWake${i} * distToWake${i} * 4.0);
          float wakeDecay${i} = exp(-behind${i} * 0.15);
          float wakePhase${i} = behind${i} * 5.0 - uTime * 6.0;
          float wake${i} = wakeFalloff${i} * wakeDecay${i} * sin(wakePhase${i}) * 0.035 * uSwimmer${i}Speed;
          totalWave += wake${i};
          
          // Foam line
          float distanceFade${i} = exp(-behind${i} * 0.18);
          totalFoam = max(totalFoam, wakeFalloff${i} * wakeDecay${i} * distanceFade${i} * 0.15 * uSwimmer${i}Foam);
        }
        
        // Stroke splash
        float strokePulse${i} = sin(uSwimmer${i}Phase * 6.28318) * 0.5 + 0.5;
        float splash${i} = exp(-dist${i} * dist${i} * 0.6) * strokePulse${i} * 0.02 * uSwimmer${i}Speed;
        totalWave += splash${i};
        totalFoam = max(totalFoam, exp(-dist${i} * dist${i} * 0.5) * strokePulse${i} * 0.15 * uSwimmer${i}Foam);
      }
      `;
    }
    return code;
  }, []);

  const vertexShader = `
    ${uniformDeclarations}
    varying float vWave;
    varying float vFoam;
    varying vec2 vUv;
    
    void main() {
      vUv = uv;
      vec3 pos = position;
      
      // Base waves
      float wave1 = sin(pos.x * 1.2 + uTime * 0.5) * 0.006;
      float wave2 = sin(pos.y * 1.5 + uTime * 0.4) * 0.005;
      float wave3 = sin(pos.x * 0.8 + pos.y * 0.9 + uTime * 0.3) * 0.003;
      
      float totalWave = wave1 + wave2 + wave3;
      float totalFoam = 0.0;
      
      ${swimmerEffectsCode}
      
      pos.z += totalWave;
      vWave = totalWave;
      vFoam = totalFoam;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `;

  const fragmentShader = `
    uniform vec3 uColorDeep;
    uniform vec3 uColorShallow;
    uniform float uFoamIntensity;
    varying float vWave;
    varying float vFoam;
    varying vec2 vUv;
    
    void main() {
      float depth = smoothstep(0.0, 1.0, vUv.y);
      vec3 color = mix(uColorDeep, uColorShallow, depth);
      color += vWave * 0.12;
      
      // Add foam (white)
      vec3 foamColor = vec3(1.0, 1.0, 1.0);
      float foamAmount = clamp(vFoam * uFoamIntensity, 0.0, 1.0);
      color = mix(color, foamColor, foamAmount * 0.8);
      
      gl_FragColor = vec4(color, 0.85);
    }
  `;

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, length / 2]}>
      <planeGeometry args={[width, length, 128, 128]} />
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        transparent
        opacity={0.85}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
      />
    </mesh>
  );
}

/**
 * Check if a phase value is within a phase window
 * Handles wrap-around (e.g., [0.9, 0.1] spans across 0)
 */
function isInPhase(phase: number, window: [number, number]): boolean {
  if (window[0] <= window[1]) {
    return phase >= window[0] && phase <= window[1];
  }
  return phase >= window[0] || phase <= window[1];
}

export interface MultiSwimmerSplashParticlesProps {
  /** Array of swimmer data for particle spawning */
  swimmers: SwimmerEffectsData[];
  /** Whether animation is playing */
  isPlaying: boolean;
  /** Speed multiplier for particle physics */
  speedMultiplier?: number;
}

/**
 * Multi-swimmer splash particle system
 * 
 * Spawns 1000 particles per active swimmer at actual hand and feet positions
 * synchronized to stroke phases.
 */
export function MultiSwimmerSplashParticles({
  swimmers,
  isPlaying,
  speedMultiplier = 1,
}: MultiSwimmerSplashParticlesProps) {
  const totalParticles = swimmers.length * PARTICLES_PER_SWIMMER;
  const pointsRef = useRef<THREE.Points>(null!);
  
  // Particle data arrays
  const [positions, velocities, lifetimes, swimmerIndices, particleTypes] = useMemo(() => {
    const pos = new Float32Array(totalParticles * 3);
    const vel = new Float32Array(totalParticles * 3);
    const life = new Float32Array(totalParticles);
    const indices = new Float32Array(totalParticles);
    const types = new Float32Array(totalParticles);
    
    for (let s = 0; s < swimmers.length; s++) {
      const base = s * PARTICLES_PER_SWIMMER;
      for (let i = 0; i < PARTICLES_PER_SWIMMER; i++) {
        const idx = base + i;
        pos[idx * 3] = 0;
        pos[idx * 3 + 1] = -100; // Hidden initially
        pos[idx * 3 + 2] = 0;
        life[idx] = 0;
        indices[idx] = s;
        
        // 30% leftHand, 30% rightHand, 20% leftFoot, 20% rightFoot
        if (i < PARTICLES_PER_SWIMMER * 0.3) types[idx] = 0;
        else if (i < PARTICLES_PER_SWIMMER * 0.6) types[idx] = 1;
        else if (i < PARTICLES_PER_SWIMMER * 0.8) types[idx] = 2;
        else types[idx] = 3;
      }
    }
    
    return [pos, vel, life, indices, types];
  }, [totalParticles, swimmers.length]);

  // Spawn cooldowns per swimmer per particle type
  const spawnCooldownsRef = useRef<Record<number, Record<number, number>>>({});
  
  // Initialize cooldowns
  useMemo(() => {
    for (let s = 0; s < swimmers.length; s++) {
      spawnCooldownsRef.current[s] = { 0: 0, 1: 0, 2: 0, 3: 0 };
    }
  }, [swimmers.length]);

  useFrame((_, delta) => {
    if (!pointsRef.current || !isPlaying) return;
    
    const posAttr = pointsRef.current.geometry.attributes.position;
    const posArray = posAttr.array as Float32Array;
    
    // Update cooldowns
    for (let s = 0; s < swimmers.length; s++) {
      for (const key in spawnCooldownsRef.current[s]) {
        spawnCooldownsRef.current[s][key] -= delta * speedMultiplier;
      }
    }
    
    for (let idx = 0; idx < totalParticles; idx++) {
      const swimmerIdx = swimmerIndices[idx];
      const swimmer = swimmers[swimmerIdx];
      
      if (!swimmer || !swimmer.isActive) {
        // Update existing particles even for inactive swimmers
        if (lifetimes[idx] > 0) {
          updateParticle(idx, posArray, velocities, lifetimes, delta, speedMultiplier);
        }
        continue;
      }
      
      const state = swimmer.stateRef.current;
      if (!state) continue;
      
      const config = SPLASH_CONFIG[swimmer.strokeType];
      const particleType = particleTypes[idx];
      const i3 = idx * 3;
      
      // Update living particles
      if (lifetimes[idx] > 0) {
        updateParticle(idx, posArray, velocities, lifetimes, delta, speedMultiplier);
        continue;
      }
      
      // No spawn during glide
      if (state.isGliding) continue;
      
      // Check spawn cooldown
      if (spawnCooldownsRef.current[swimmerIdx][particleType] > 0) continue;
      
      // Determine if this particle type should spawn
      const phase = state.strokePhase;
      const dir = state.direction;
      
      let shouldSpawn = false;
      let spawnX = swimmer.laneX;
      let spawnZ = state.z;
      let intensity = 0;
      
      const isLeftHandActive = isInPhase(phase, config.leftHandPhase);
      const isRightHandActive = isInPhase(phase, config.rightHandPhase);
      const isLeftKickActive = config.leftKickPhases.some(kp => isInPhase(phase, kp));
      const isRightKickActive = config.rightKickPhases.some(kp => isInPhase(phase, kp));
      
      const handZOffset = config.handEntryZ * dir;
      const feetZOffset = config.feetZ * dir;
      
      switch (particleType) {
        case 0: // Left hand
          if (isLeftHandActive && Math.random() < config.hands) {
            shouldSpawn = true;
            spawnX = swimmer.laneX - config.handOffsetX;
            spawnZ = state.z + handZOffset;
            intensity = config.hands;
          }
          break;
        case 1: // Right hand
          if (isRightHandActive && Math.random() < config.hands) {
            shouldSpawn = true;
            spawnX = swimmer.laneX + config.handOffsetX;
            spawnZ = state.z + handZOffset;
            intensity = config.hands;
          }
          break;
        case 2: // Left foot
          if (isLeftKickActive && Math.random() < config.feet) {
            shouldSpawn = true;
            spawnX = swimmer.laneX - config.feetOffsetX;
            spawnZ = state.z + feetZOffset;
            intensity = config.feet;
          }
          break;
        case 3: // Right foot
          if (isRightKickActive && Math.random() < config.feet) {
            shouldSpawn = true;
            spawnX = swimmer.laneX + config.feetOffsetX;
            spawnZ = state.z + feetZOffset;
            intensity = config.feet;
          }
          break;
      }
      
      if (shouldSpawn) {
        // Spawn particle
        posArray[i3] = spawnX + (Math.random() - 0.5) * 0.08;
        posArray[i3 + 1] = 0.02;
        posArray[i3 + 2] = spawnZ + (Math.random() - 0.5) * 0.08;
        
        // Velocity
        velocities[i3] = (Math.random() - 0.5) * 0.6 * intensity;
        velocities[i3 + 1] = 1.3 + Math.random() * 1.2 * intensity;
        velocities[i3 + 2] = (Math.random() - 0.5) * 0.3;
        
        lifetimes[idx] = 0.35 + Math.random() * 0.45;
        spawnCooldownsRef.current[swimmerIdx][particleType] = 0.004;
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
        size={0.1}
        color="#ffffff"
        transparent
        opacity={0.92}
        sizeAttenuation
        depthWrite={false}
        depthTest={false}
      />
    </points>
  );
}

/**
 * Updates a single particle's position and lifetime
 */
function updateParticle(
  idx: number,
  posArray: Float32Array,
  velocities: Float32Array,
  lifetimes: Float32Array,
  delta: number,
  speedMultiplier: number,
) {
  const i3 = idx * 3;
  
  lifetimes[idx] -= delta * speedMultiplier;
  
  // Update position
  posArray[i3] += velocities[i3] * delta * speedMultiplier;
  posArray[i3 + 1] += velocities[i3 + 1] * delta * speedMultiplier;
  posArray[i3 + 2] += velocities[i3 + 2] * delta * speedMultiplier;
  
  // Gravity
  velocities[i3 + 1] -= 10.0 * delta * speedMultiplier;
  
  // Kill particle when it hits water
  if (posArray[i3 + 1] < 0) {
    lifetimes[idx] = 0;
    posArray[i3 + 1] = -100;
  }
}

export default MultiSwimmerWaterSurface;
