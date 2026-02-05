/**
 * SwimPool3D Component
 *
 * 3D swimming pool visualization using React Three Fiber.
 * Supports 5 lanes for multi-athlete comparison and session replay.
 * Uses SimpleLaneSwimmer with stroke-synchronized animations.
 *
 * Features:
 * - Dynamic water surface with ripples and V-shaped wakes per swimmer
 * - Splash particles (1000 per swimmer)
 * - Camera and pool info overlay
 * - Lane selection with activity/fastest-lap options
 *
 * @module components/3d/SwimPool3D
 */

import React, { useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  OrbitControls,
  Environment,
  Text,
  Float,
} from '@react-three/drei';
import * as THREE from 'three';
import { SimpleLaneSwimmer, type LengthData, type SwimmerState, type StrokeType } from './SimpleLaneSwimmer';
import { 
  MultiSwimmerWaterSurface, 
  MultiSwimmerSplashParticles,
  type SwimmerEffectsData,
} from './MultiSwimmerWaterEffects';

export interface LaneData {
  athleteId: string;
  athleteName: string;
  color: string;
  /** Length data for the current lap (for SimpleLaneSwimmer) */
  lengthData?: LengthData;
  /** All lengths for this swimmer's activity */
  allLengths?: LengthData[];
  /** Current length index in allLengths */
  currentLengthIndex?: number;
  /** Whether swimmer is active */
  isActive: boolean;
  /** Speed multiplier for animation */
  speedMultiplier?: number;
  /** Gender for appearance */
  gender?: 'male' | 'female';
  /** Level of detail */
  lod?: 'high' | 'medium' | 'low';
  /** Whether animation is playing */
  isPlaying?: boolean;
  /** Timeline progress for scrubbing (0-1) */
  timelineProgress?: number;
}

/** Lane selection option type */
export type LaneSelectionType = 'none' | 'activity' | 'fastest-freestyle' | 'fastest-breaststroke' | 'fastest-backstroke' | 'fastest-butterfly';

/** Lane selection state */
export interface LaneSelection {
  type: LaneSelectionType;
  /** Activity ID if type is 'activity' */
  activityId?: string;
  /** Activity name for display */
  activityName?: string;
}

export interface SwimPool3DProps {
  /** Pool length in meters */
  poolLength?: 25 | 50;
  /** Number of lanes (1-5) */
  laneCount?: number;
  /** Lane data for each swimmer */
  lanes: LaneData[];
  /** Show water caustics effect */
  showCaustics?: boolean;
  /** Enable camera controls */
  enableControls?: boolean;
  /** Camera view preset */
  viewPreset?: 'side' | 'top' | 'perspective' | 'follow';
  /** Height of the component */
  height?: number;
  /** Callback when a lane is clicked */
  onLaneClick?: (laneIndex: number) => void;
  /** Whether all animations are playing */
  isPlaying?: boolean;
  /** Global speed multiplier */
  speedMultiplier?: number;
  /** Global timeline progress for synchronized scrubbing (0-1) */
  timelineProgress?: number;
  /** Callback for camera position updates */
  onCameraUpdate?: (position: THREE.Vector3, target: THREE.Vector3) => void;
  /** Foam intensity (0-1) */
  foamIntensity?: number;
}

/**
 * Track camera position and report it
 */
const CameraTracker: React.FC<{
  onUpdate?: (position: THREE.Vector3, target: THREE.Vector3) => void;
}> = ({ onUpdate }) => {
  const { camera } = useThree();
  const targetRef = useRef(new THREE.Vector3());
  
  useFrame(() => {
    if (onUpdate) {
      camera.getWorldDirection(targetRef.current);
      targetRef.current.multiplyScalar(10).add(camera.position);
      onUpdate(camera.position.clone(), targetRef.current);
    }
  });
  
  return null;
};

/**
 * Pool walls and bottom with lane markings.
 */
const PoolStructure: React.FC<{
  width: number;
  length: number;
  depth: number;
  laneCount: number;
}> = ({ width, length, depth, laneCount }) => {
  const tileColor = '#e0f2fe';
  const lineColor = '#0369a1';
  const laneWidth = width / laneCount;

  return (
    <group>
      {/* Pool bottom */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -depth, 0]}>
        <planeGeometry args={[width, length]} />
        <meshStandardMaterial color={tileColor} />
      </mesh>

      {/* Pool walls */}
      <mesh position={[0, -depth / 2, length / 2]}>
        <boxGeometry args={[width, depth, 0.1]} />
        <meshStandardMaterial color={tileColor} />
      </mesh>
      <mesh position={[0, -depth / 2, -length / 2]}>
        <boxGeometry args={[width, depth, 0.1]} />
        <meshStandardMaterial color={tileColor} />
      </mesh>
      <mesh position={[-width / 2, -depth / 2, 0]}>
        <boxGeometry args={[0.1, depth, length]} />
        <meshStandardMaterial color={tileColor} />
      </mesh>
      <mesh position={[width / 2, -depth / 2, 0]}>
        <boxGeometry args={[0.1, depth, length]} />
        <meshStandardMaterial color={tileColor} />
      </mesh>

      {/* Lane lines on bottom */}
      {[...Array(laneCount + 1)].map((_, i) => (
        <mesh
          key={`line-${i}`}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[-width / 2 + i * laneWidth, -depth + 0.01, 0]}
        >
          <planeGeometry args={[0.05, length]} />
          <meshStandardMaterial color={lineColor} />
        </mesh>
      ))}

      {/* T-markers at ends */}
      {[...Array(laneCount)].map((_, i) => {
        const xPos = -width / 2 + laneWidth / 2 + i * laneWidth;
        return (
          <group key={`t-${i}`}>
            {/* Start T */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[xPos, -depth + 0.01, length / 2 - 2]}>
              <planeGeometry args={[0.8, 0.1]} />
              <meshStandardMaterial color={lineColor} />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[xPos, -depth + 0.01, length / 2 - 2.5]}>
              <planeGeometry args={[0.1, 1]} />
              <meshStandardMaterial color={lineColor} />
            </mesh>
            {/* End T */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[xPos, -depth + 0.01, -length / 2 + 2]}>
              <planeGeometry args={[0.8, 0.1]} />
              <meshStandardMaterial color={lineColor} />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[xPos, -depth + 0.01, -length / 2 + 2.5]}>
              <planeGeometry args={[0.1, 1]} />
              <meshStandardMaterial color={lineColor} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
};

/**
 * Pool deck (wide edge around the pool).
 */
const PoolDeck: React.FC<{
  width: number;
  length: number;
}> = ({ width, length }) => {
  const deckWidth = 3;
  const deckColor = '#d1d5db';
  const deckHeight = 0.15;

  return (
    <group>
      <mesh position={[0, deckHeight / 2, length / 2 + deckWidth / 2]}>
        <boxGeometry args={[width + deckWidth * 2, deckHeight, deckWidth]} />
        <meshStandardMaterial color={deckColor} roughness={0.8} />
      </mesh>
      <mesh position={[0, deckHeight / 2, -length / 2 - deckWidth / 2]}>
        <boxGeometry args={[width + deckWidth * 2, deckHeight, deckWidth]} />
        <meshStandardMaterial color={deckColor} roughness={0.8} />
      </mesh>
      <mesh position={[-width / 2 - deckWidth / 2, deckHeight / 2, 0]}>
        <boxGeometry args={[deckWidth, deckHeight, length]} />
        <meshStandardMaterial color={deckColor} roughness={0.8} />
      </mesh>
      <mesh position={[width / 2 + deckWidth / 2, deckHeight / 2, 0]}>
        <boxGeometry args={[deckWidth, deckHeight, length]} />
        <meshStandardMaterial color={deckColor} roughness={0.8} />
      </mesh>
      {/* Corners */}
      {[[-1, 1], [1, 1], [-1, -1], [1, -1]].map(([x, z], i) => (
        <mesh key={`corner-${i}`} position={[x * (width / 2 + deckWidth / 2), deckHeight / 2, z * (length / 2 + deckWidth / 2)]}>
          <boxGeometry args={[deckWidth, deckHeight, deckWidth]} />
          <meshStandardMaterial color={deckColor} roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
};

/**
 * Starting blocks for each lane.
 */
const StartingBlocks: React.FC<{
  width: number;
  length: number;
  laneCount: number;
}> = ({ width, length, laneCount }) => {
  const blockWidth = 0.5;
  const blockDepth = 0.6;
  const blockHeight = 0.7;
  const blockColor = '#1e3a5f';
  const platformColor = '#f8fafc';
  const laneWidth = width / laneCount;

  return (
    <group>
      {[...Array(laneCount)].map((_, i) => {
        const xPos = -width / 2 + laneWidth / 2 + i * laneWidth;
        return (
          <group key={`block-${i}`} position={[xPos, 0, length / 2 + 0.3]}>
            <mesh position={[0, blockHeight / 2, 0]}>
              <boxGeometry args={[blockWidth, blockHeight, blockDepth]} />
              <meshStandardMaterial color={blockColor} roughness={0.4} metalness={0.3} />
            </mesh>
            <mesh position={[0, blockHeight + 0.02, -0.05]} rotation={[-0.15, 0, 0]}>
              <boxGeometry args={[blockWidth - 0.02, 0.04, blockDepth - 0.1]} />
              <meshStandardMaterial color={platformColor} roughness={0.3} />
            </mesh>
            <mesh position={[-blockWidth / 2 + 0.03, blockHeight - 0.1, -blockDepth / 2 + 0.1]}>
              <cylinderGeometry args={[0.015, 0.015, 0.2, 8]} />
              <meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.2} />
            </mesh>
            <mesh position={[blockWidth / 2 - 0.03, blockHeight - 0.1, -blockDepth / 2 + 0.1]}>
              <cylinderGeometry args={[0.015, 0.015, 0.2, 8]} />
              <meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.2} />
            </mesh>
            <Text position={[0, blockHeight + 0.1, blockDepth / 2 - 0.1]} fontSize={0.15} color="#ffffff" anchorX="center" anchorY="middle">
              {i + 1}
            </Text>
          </group>
        );
      })}
    </group>
  );
};

/**
 * Lane rope dividers.
 */
const LaneRopes: React.FC<{
  width: number;
  length: number;
  laneCount: number;
}> = ({ width, length, laneCount }) => {
  const ropeColors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6'];
  const laneWidth = width / laneCount;

  return (
    <group>
      {[...Array(laneCount - 1)].map((_, i) => {
        const xPos = -width / 2 + (i + 1) * laneWidth;
        return (
          <group key={i}>
            <mesh position={[xPos, -0.1, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.05, 0.05, length, 16]} />
              <meshStandardMaterial color={ropeColors[i % ropeColors.length]} />
            </mesh>
            {[...Array(Math.floor(length / 2))].map((_, j) => (
              <mesh key={j} position={[xPos, -0.1, -length / 2 + j * 2 + 1]}>
                <sphereGeometry args={[0.08, 16, 16]} />
                <meshStandardMaterial color={j % 2 === 0 ? ropeColors[i % ropeColors.length] : '#ffffff'} />
              </mesh>
            ))}
          </group>
        );
      })}
    </group>
  );
};

/**
 * Lane markers with names.
 */
const LaneMarkers: React.FC<{
  width: number;
  length: number;
  laneCount: number;
  lanes: LaneData[];
}> = ({ width, length, laneCount, lanes }) => {
  const laneWidth = width / laneCount;
  
  return (
    <group>
      {lanes.map((lane, i) => {
        const xPos = -width / 2 + laneWidth / 2 + i * laneWidth;
        return (
          <group key={i}>
            <Float speed={2} rotationIntensity={0.1} floatIntensity={0.2}>
              <Text position={[xPos, 0.5, length / 2 + 0.5]} fontSize={0.5} color={lane.color} anchorX="center" anchorY="middle">
                {i + 1}
              </Text>
            </Float>
            <Text position={[xPos, 0.3, length / 2 + 1]} fontSize={0.2} color="#64748b" anchorX="center" anchorY="middle">
              {lane.athleteName}
            </Text>
          </group>
        );
      })}
    </group>
  );
};

/** Default swimmer state */
const createDefaultSwimmerState = (): SwimmerState => ({
  x: 0,
  y: 0,
  z: 0,
  direction: 1,
  speed: 0,
  strokePhase: 0,
  isGliding: false,
  currentStrokeCount: 0,
  elapsedSeconds: 0,
  phase: 'START_GLIDE',
  rotationX: 0,
  rotationY: 0,
});

/**
 * Main pool scene with SimpleLaneSwimmer and water effects.
 */
const PoolScene: React.FC<{
  poolLength: number;
  laneCount: number;
  lanes: LaneData[];
  showCaustics: boolean;
  isPlaying: boolean;
  speedMultiplier: number;
  timelineProgress?: number;
  foamIntensity: number;
  onCameraUpdate?: (position: THREE.Vector3, target: THREE.Vector3) => void;
}> = ({ poolLength, laneCount, lanes, showCaustics: _showCaustics, isPlaying, speedMultiplier, timelineProgress, foamIntensity, onCameraUpdate }) => {
  void _showCaustics; // Reserved for future caustics support
  
  const poolWidth = laneCount * 2.5; // 2.5m per lane
  const poolDepth = 2;
  const laneWidth = poolWidth / laneCount;

  // Create refs for each swimmer's state
  const swimmerStateRefs = useRef<React.MutableRefObject<SwimmerState>[]>([]);
  
  // Initialize refs if needed
  useMemo(() => {
    while (swimmerStateRefs.current.length < laneCount) {
      const stateRef = { current: createDefaultSwimmerState() };
      swimmerStateRefs.current.push(stateRef);
    }
  }, [laneCount]);

  // Build swimmer effects data for water surface and particles
  const swimmerEffectsData: SwimmerEffectsData[] = useMemo(() => {
    return lanes.map((lane, i) => ({
      stateRef: swimmerStateRefs.current[i] ?? { current: createDefaultSwimmerState() },
      laneX: -poolWidth / 2 + laneWidth / 2 + i * laneWidth,
      strokeType: (lane.lengthData?.strokeType ?? 'freestyle') as StrokeType,
      isActive: lane.isActive,
      color: lane.color,
    }));
  }, [lanes, poolWidth, laneWidth]);

  return (
    <group>
      {/* Camera tracker */}
      <CameraTracker onUpdate={onCameraUpdate} />
      
      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 20, 10]} intensity={1.2} castShadow />
      <pointLight position={[0, 5, 0]} intensity={0.6} color="#7dd3fc" />
      <pointLight position={[0, 3, -poolLength / 2]} intensity={0.3} color="#ffffff" />
      <pointLight position={[0, 3, poolLength / 2]} intensity={0.3} color="#ffffff" />

      {/* Pool deck */}
      <PoolDeck width={poolWidth} length={poolLength} />

      {/* Starting blocks */}
      <StartingBlocks width={poolWidth} length={poolLength} laneCount={laneCount} />

      {/* Pool structure */}
      <PoolStructure width={poolWidth} length={poolLength} depth={poolDepth} laneCount={laneCount} />

      {/* Dynamic water surface with swimmer effects */}
      <MultiSwimmerWaterSurface
        width={poolWidth}
        length={poolLength}
        swimmers={swimmerEffectsData}
        foamIntensity={foamIntensity}
      />

      {/* Splash particles (1000 per swimmer) */}
      <MultiSwimmerSplashParticles
        swimmers={swimmerEffectsData}
        isPlaying={isPlaying}
        speedMultiplier={speedMultiplier}
      />

      {/* Lane ropes */}
      <LaneRopes width={poolWidth} length={poolLength} laneCount={laneCount} />

      {/* Lane markers */}
      <LaneMarkers width={poolWidth} length={poolLength} laneCount={laneCount} lanes={lanes} />

      {/* SimpleLaneSwimmers */}
      {lanes.map((lane, i) => {
        if (!lane.isActive || !lane.lengthData) return null;
        
        const xPos = -poolWidth / 2 + laneWidth / 2 + i * laneWidth;
        const stateRef = swimmerStateRefs.current[i];
        
        return (
          <group key={`swimmer-${lane.athleteId}-lane-${i}`} position={[xPos, 0, 0]}>
            <SimpleLaneSwimmer
              poolLength={poolLength}
              lengthData={lane.lengthData}
              isPlaying={lane.isPlaying ?? isPlaying}
              speedMultiplier={lane.speedMultiplier ?? speedMultiplier}
              timelineProgress={lane.timelineProgress ?? timelineProgress}
              onPositionUpdate={(state) => {
                if (stateRef) {
                  stateRef.current = state;
                }
              }}
            />
          </group>
        );
      })}

      {/* Environment */}
      <Environment preset="sunset" />
    </group>
  );
};

/**
 * Camera presets optimized for pool visualization.
 */
const cameraPositions = {
  side: { position: [25, 8, 0] as [number, number, number], target: [0, -1, 0] as [number, number, number] },
  top: { position: [0, 35, 5] as [number, number, number], target: [0, 0, 0] as [number, number, number] },
  perspective: { position: [-8, 25, -12] as [number, number, number], target: [0, 0, 0] as [number, number, number] },
  follow: { position: [0, 4, 18] as [number, number, number], target: [0, -0.5, 0] as [number, number, number] },
};

/**
 * Loading fallback.
 */
const LoadingFallback: React.FC = () => (
  <mesh>
    <boxGeometry args={[1, 1, 1]} />
    <meshStandardMaterial color="#0ea5e9" wireframe />
  </mesh>
);

/**
 * SwimPool3D for 3D swimming pool visualization.
 *
 * @example
 * ```tsx
 * <SwimPool3D
 *   poolLength={25}
 *   laneCount={5}
 *   lanes={swimmerData}
 *   showCaustics
 *   viewPreset="perspective"
 *   isPlaying={true}
 *   speedMultiplier={1}
 * />
 * ```
 */
export const SwimPool3D: React.FC<SwimPool3DProps> = ({
  poolLength = 25,
  laneCount = 5,
  lanes,
  showCaustics = true,
  enableControls = true,
  viewPreset = 'perspective',
  height = 400,
  onLaneClick: _onLaneClick,
  isPlaying = true,
  speedMultiplier = 1,
  timelineProgress,
  onCameraUpdate,
  foamIntensity = 0.5,
}) => {
  void _onLaneClick; // Reserved for future click handling

  const cameraConfig = cameraPositions[viewPreset];

  // Fill lanes with empty data for missing lanes
  const filledLanes = useMemo(() => {
    const result: LaneData[] = [];
    for (let i = 0; i < laneCount; i++) {
      if (lanes[i]) {
        result.push(lanes[i]);
      } else {
        result.push({
          athleteId: `empty-${i}`,
          athleteName: `Lane ${i + 1}`,
          color: '#94a3b8',
          isActive: false,
        });
      }
    }
    return result;
  }, [lanes, laneCount]);

  return (
    <div style={{ width: '100%', height }} className="rounded-xl overflow-hidden">
      <Canvas
        camera={{
          position: cameraConfig.position,
          fov: 50,
          near: 0.1,
          far: 1000,
        }}
        shadows
      >
        <Suspense fallback={<LoadingFallback />}>
          <PoolScene
            poolLength={poolLength}
            laneCount={laneCount}
            lanes={filledLanes}
            showCaustics={showCaustics}
            isPlaying={isPlaying}
            speedMultiplier={speedMultiplier}
            timelineProgress={timelineProgress}
            foamIntensity={foamIntensity}
            onCameraUpdate={onCameraUpdate}
          />
        </Suspense>

        {enableControls && (
          <OrbitControls
            target={cameraConfig.target}
            enablePan
            enableZoom
            enableRotate
            maxPolarAngle={Math.PI / 2 - 0.1}
            minDistance={5}
            maxDistance={50}
          />
        )}
      </Canvas>
    </div>
  );
};

export default SwimPool3D;
