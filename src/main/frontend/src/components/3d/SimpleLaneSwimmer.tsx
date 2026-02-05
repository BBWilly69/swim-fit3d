/**
 * SimpleLaneSwimmer - GLB Schwimmer Animation
 * 
 * Das Modell swimming_animations_pack.glb ist extrem klein exportiert (~1.8cm).
 * Wir skalieren es auf realistische Größe (~1.8m) mit Faktor 100.
 */

import { useRef, useEffect, Suspense, useMemo, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

const MODEL_PATH = '/models/swimming_animations_pack.glb';
const MODEL_SCALE = 100;
//const SWIMMER_WATER_Y = -1.39;
const SWIMMER_BREASTSTROKE_Y = -1.44;
const SWIMMER_BACKSTROKE_Y = -1.48;
const SWIMMER_BUTTERFLY_Y = -1.45;
const SWIMMER_FREESTYLE_Y = -1.52;

// Stroke-specific Y positions for proper water line
const SWIMMER_Y_BY_STROKE: Record<StrokeType, number> = {
  freestyle: SWIMMER_FREESTYLE_Y,
  breaststroke: SWIMMER_BREASTSTROKE_Y,
  backstroke: SWIMMER_BACKSTROKE_Y,
  butterfly: SWIMMER_BUTTERFLY_Y,
};

export const EXAMPLE_LENGTH_DATA: LengthData[] = [
  { index: 0, durationSeconds: 27.312, strokes: 13, strokeType: 'breaststroke', cadence: 26 },
  { index: 1, durationSeconds: 21.999, strokes: 10, strokeType: 'freestyle', cadence: 33 },
];

export type StrokeType = 'freestyle' | 'breaststroke' | 'backstroke' | 'butterfly';

export interface LengthData {
  index: number;
  durationSeconds: number;
  strokes: number;
  strokeType: StrokeType;
  cadence?: number;
  animationName?: string;
  animationIndex?: number;
  /** Flag indicating this is a rest/idle lap */
  isRest?: boolean;
  /** Flag indicating this is the last lap of the activity/interval */
  isLastLap?: boolean;
}

/** Swim phase within a lap */
export type SwimPhase = 'START_GLIDE' | 'SWIMMING' | 'END_GLIDE' | 'TURNING' | 'REST' | 'FINISHED' | 'WAITING';

/** Y-position for standing/resting at pool edge - in water, holding wall */
const SWIMMER_REST_Y = -0.97;
/**
 * REST position Z coordinates.
 * Swimmer leans FORWARD toward wall (negative X rotation) with hands on block.
 * Body positioned close to wall edge, hands reach forward to touch block step.
 * Values calibrated via debug controls to position hands on starting block.
 */
const SWIMMER_REST_Z_START_WALL = -0.52; // body center - hands touch starting block
const SWIMMER_REST_Z_END_WALL_OFFSET = 0.52; // positive offset from end wall (poolLength - offset)
/** X rotation for REST pose - lean back to reach block with hands */
const SWIMMER_REST_ROTATION_X = Math.PI * 0.317; // ~57° back lean

/**
 * Push-off animation timing (breaststroke cycle).
 * Animation starts at squat position (legs bent, ready to push) and plays
 * until reaching glide position (streamlined). This simulates wall push-off.
 * Values are fractions of the breaststroke animation clip duration.
 */
const PUSH_OFF_ANIM_NAME = 'SwimBreastStroke';
const PUSH_OFF_START_FRAME = 0.55;  // Legs bent in squat-like position
const PUSH_OFF_END_FRAME = 0.85;    // Arms forward, legs extended (glide)
/** Speed multiplier for push-off animation (faster than normal swimming) */
const PUSH_OFF_ANIM_SPEED = 1.5;

/**
 * Turn animation timing (reverse of push-off).
 * Animation plays BACKWARDS from glide position to squat position,
 * simulating the swimmer tucking legs for wall turn.
 * For backstroke: same animation but swimmer is on their back (X rotation = π).
 */
const TURN_ANIM_NAME = 'SwimBreastStroke';
const TURN_START_FRAME = 0.85;  // Start at glide position (streamlined)
const TURN_END_FRAME = 0.55;    // End at squat position (legs bent)
/** Speed for manual time decrement (positive value, we subtract in useFrame) */
const TURN_ANIM_SPEED = 1.5;

export interface SwimmerState {
  x: number;
  y: number;
  z: number;
  direction: 1 | -1;
  speed: number;
  strokePhase: number;
  isGliding: boolean;
  /** Current stroke count since lap start (based on strokePhase cycles) */
  currentStrokeCount: number;
  /** Elapsed seconds within current lap */
  elapsedSeconds: number;
  /** Current phase within the lap */
  phase: SwimPhase;
  /** X rotation in radians (pitch - tilt forward/backward) */
  rotationX: number;
  /** Y rotation in radians (yaw - facing direction) */
  rotationY: number;
}

/** Debug override for manual position/rotation control */
export interface SwimmerDebugOverride {
  positionOffset?: { x: number; y: number; z: number };
  rotationOverride?: { x: number; y: number };
}

export interface SimpleLaneSwimmerProps {
  poolLength?: number;
  lengthData?: LengthData;
  strokeType?: StrokeType;
  speedMultiplier?: number;
  isPlaying?: boolean;
  /** Debug override for manual position/rotation control */
  debugOverride?: SwimmerDebugOverride;
  skinTone?: 'light' | 'medium' | 'tan' | 'dark';
  eyeColor?: 'green' | 'blue' | 'gray';
  swimsuitColor?: string;
  disabledAnimationKeywords?: string[];
  onPositionUpdate?: (state: SwimmerState) => void;
  timelineProgress?: number; // 0-1 progress within current length for scrubbing
}

const ANIMATIONS: Record<StrokeType, string> = {
  freestyle: 'Freestyle',
  breaststroke: 'SwimBreastStroke',
  backstroke: 'SwimBackStroke',
  butterfly: 'SwimButterfly',
};

function getStrokeAnimationNames(
  animations: THREE.AnimationClip[],
  disabledAnimationKeywords: string[] = [],
) {
  // Always exclude "Root" animations - they have built-in translation that conflicts
  // with our manual position control
  const defaultDisabled = ['root'];
  const allDisabled = [...defaultDisabled, ...disabledAnimationKeywords];
  
  const isDisabled = (name: string) =>
    allDisabled.some((keyword) => name.toLowerCase().includes(keyword.toLowerCase()));
  const names = animations.map((clip) => clip.name);
  const byStroke: Record<StrokeType, string[]> = {
    freestyle: names.filter((n) => /free.?style/i.test(n)).filter((n) => !isDisabled(n)),
    breaststroke: names.filter((n) => /breast/i.test(n)).filter((n) => !isDisabled(n)),
    backstroke: names.filter((n) => /back/i.test(n)).filter((n) => !isDisabled(n)),
    butterfly: names.filter((n) => /butter/i.test(n)).filter((n) => !isDisabled(n)),
  };
  return { names, byStroke };
}

// Hauttöne (light-medium Bereich)
const SKIN_TONES = {
  light: new THREE.Color(0.96, 0.87, 0.80),
  medium: new THREE.Color(0.91, 0.78, 0.68),
  tan: new THREE.Color(0.80, 0.65, 0.52),
  dark: new THREE.Color(0.55, 0.40, 0.30),
};

// Augenfarben
const EYE_COLORS = {
  green: new THREE.Color(0.25, 0.55, 0.35),
  blue: new THREE.Color(0.25, 0.45, 0.70),
  gray: new THREE.Color(0.45, 0.50, 0.55),
};

function applySwimsuitMask(
  material: THREE.MeshStandardMaterial,
  mesh: THREE.Mesh,
  swimsuitColor: string,
) {
  mesh.geometry.computeBoundingBox();
  const bbox = mesh.geometry.boundingBox;
  if (!bbox) return;

  const minY = bbox.min.y;
  const maxY = bbox.max.y;
  const minZ = bbox.min.z;
  const maxZ = bbox.max.z;

  material.onBeforeCompile = (shader) => {
    shader.uniforms.swimMinY = { value: minY };
    shader.uniforms.swimMaxY = { value: maxY };
    shader.uniforms.swimMinZ = { value: minZ };
    shader.uniforms.swimMaxZ = { value: maxZ };
    shader.uniforms.swimsuitColor = { value: new THREE.Color(swimsuitColor) };

    shader.vertexShader = shader.vertexShader
      .replace(
        'void main() {',
        'varying vec3 vModelPosition;\nvoid main() {'
      )
      .replace(
        '#include <skinning_vertex>',
        '#include <skinning_vertex>\n  vModelPosition = transformed;'
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        'void main() {',
        'varying vec3 vModelPosition;\nuniform float swimMinY;\nuniform float swimMaxY;\nuniform float swimMinZ;\nuniform float swimMaxZ;\nuniform vec3 swimsuitColor;\nvoid main() {'
      )
      .replace(
        '#include <color_fragment>',
        '#include <color_fragment>\nfloat yNorm = (vModelPosition.y - swimMinY) / max(0.0001, (swimMaxY - swimMinY));\nfloat zNorm = (vModelPosition.z - swimMinZ) / max(0.0001, (swimMaxZ - swimMinZ));\nfloat yBand = smoothstep(0.35, 0.45, yNorm) * (1.0 - smoothstep(0.62, 0.72, yNorm));\nfloat zBand = smoothstep(0.35, 0.65, zNorm);\nfloat mask = yBand * zBand;\ndiffuseColor.rgb = mix(diffuseColor.rgb, swimsuitColor, mask);'
      );
  };

  material.needsUpdate = true;
}

function SwimmerModel({
  poolLength = 25,
  lengthData,
  strokeType = 'breaststroke',
  speedMultiplier = 1,
  isPlaying = true,
  skinTone = 'light',
  eyeColor = 'blue',
  swimsuitColor = '#1a1a2e',
  disabledAnimationKeywords = [],
  onPositionUpdate,
  timelineProgress,
  debugOverride,
}: SimpleLaneSwimmerProps) {
  const groupRef = useRef<THREE.Group>(null!);
  const positionRef = useRef(0);
  const hipsBoneRef = useRef<THREE.Bone | null>(null);
  const directionRef = useRef<1 | -1>(1);
  const loggedAnimationsRef = useRef(false);
  const strokeTimeRef = useRef(0);
  
  // 3-Phase swim model: START_GLIDE -> SWIMMING -> END_GLIDE -> (next lap or REST)
  const phaseRef = useRef<SwimPhase>('START_GLIDE');
  const strokeCountRef = useRef(0);  // Counts completed strokes
  const glideStartPosRef = useRef(0);  // Start position of current glide
  const lapIndexRef = useRef<number | undefined>(undefined);  // Track lap changes
  const swimStartPosRef = useRef(0);  // Position where swimming phase started
  const isFinishedRef = useRef(false);  // Track if activity is finished
  const pushOffCompleteRef = useRef(false);  // Track if push-off animation completed
  const turnCompleteRef = useRef(false);  // Track if turn animation completed
  const turnInBackstrokeModeRef = useRef(false);  // Track if turn is in backstroke (supine) position
  const turnStartRotationYRef = useRef(0);  // Y rotation at turn start (for interpolation)
  
  // Legacy refs for compatibility
  const isGlidingRef = useRef(false);
  const swimAnimActiveRef = useRef(false);
  
  const { scene, animations } = useGLTF(MODEL_PATH);
  
  // Clone the model ONCE using useMemo - this ensures stable reference
  const clonedModel = useMemo(() => {
    const clonedScene = SkeletonUtils.clone(scene);
    clonedScene.scale.setScalar(MODEL_SCALE);
    
    // Materialien anpassen
    clonedScene.traverse((child) => {
      // Finde Hips Bone für Badehose
      if ((child as THREE.Bone).isBone) {
        const boneName = child.name.toLowerCase();
        if (boneName.includes('hip') || boneName.includes('pelvis') || boneName === 'hips') {
          hipsBoneRef.current = child as THREE.Bone;
        }
      }
      
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const name = mesh.name.toLowerCase();
        
        // Körper - Hautfarbe
        if (name.includes('male_base') || name.includes('skin')) {
          const skinMaterial = new THREE.MeshStandardMaterial({
            color: SKIN_TONES[skinTone],
            roughness: 0.65,
            metalness: 0,
          });
          applySwimsuitMask(skinMaterial, mesh, swimsuitColor);
          mesh.material = skinMaterial;
        }
        
        // Augen weiß
        if (name.includes('eye_ball')) {
          mesh.material = new THREE.MeshStandardMaterial({
            color: 0xfefefe,
            roughness: 0.1,
            metalness: 0,
          });
        }
        
        // Pupillen - wählbare Farbe
        if (name.includes('pupil')) {
          mesh.material = new THREE.MeshStandardMaterial({
            color: EYE_COLORS[eyeColor],
            roughness: 0.15,
            metalness: 0.1,
          });
        }
      }
    });
    
    return clonedScene;
  }, [scene, skinTone, eyeColor, swimsuitColor]);
  
  // Create AnimationMixer manually - bound directly to cloned model
  const mixer = useMemo(() => {
    const m = new THREE.AnimationMixer(clonedModel);
    return m;
  }, [clonedModel]);
  
  // Create actions map from animations
  const actions = useMemo(() => {
    const actionsMap: Record<string, THREE.AnimationAction> = {};
    animations.forEach((clip) => {
      actionsMap[clip.name] = mixer.clipAction(clip);
    });
    return actionsMap;
  }, [animations, mixer]);
  
  // Store speedMultiplier in a ref for mixer update
  const speedMultiplierRef = useRef(speedMultiplier);
  speedMultiplierRef.current = speedMultiplier;
  
  // Update mixer every frame with speedMultiplier applied
  // This ensures animation speed matches time progression
  useFrame((_, delta) => {
    mixer.update(delta * speedMultiplierRef.current);
  });
  
  const { names: animationNames, byStroke } = getStrokeAnimationNames(
    animations,
    disabledAnimationKeywords,
  );
  
  const swimDuration = lengthData?.durationSeconds ?? 25;
  const currentStroke = lengthData?.strokeType ?? strokeType;
  const explicitAnim = lengthData?.animationName;
  const explicitAnimIndex = lengthData?.animationIndex;
  const availableForStroke = byStroke[currentStroke] ?? [];
  const fallbackAnim = ANIMATIONS[currentStroke];
  // Use explicit animation if provided, otherwise use the FIRST available animation
  // (NOT rotating by lap index - different animations have different clip durations!)
  const animName = explicitAnim
    ? explicitAnim
    : (availableForStroke.length > 0
        ? availableForStroke[explicitAnimIndex ?? 0]  // Always use index 0 unless explicitly specified
        : fallbackAnim);
  // Glide animation - use breaststroke for best streamline pose
  const glideAnimName = 'SwimBreastStroke';
  // If current stroke is backstroke, do not force breaststroke glide
  const selectedGlideAnim = currentStroke === 'backstroke' ? animName : glideAnimName;
  
  // Constants for 3-phase swim model
  const WALL_TOUCH_OFFSET = 0.3;  // How close swimmer gets to wall
  const START_GLIDE_DISTANCE = 3.0;  // Push-off glide at lap start (max 3m)
  const END_GLIDE_DISTANCE = 1.2;  // Approach glide before wall touch (max 1.5m)
  
  // Fixed percentage time distribution for consistent feel across different lap durations
  // For lap > 0: TURNING phase takes time, reducing other phases proportionally
  const isLapWithTurn = (lengthData?.index ?? 0) > 0;
  const TURN_RATIO = isLapWithTurn ? 0.03 : 0;  // 3% of lap time for turn animation (only lap > 0)
  const START_GLIDE_RATIO = 0.10;  // 10% of lap time for push-off glide
  const END_GLIDE_RATIO = 0.05;    // 5% of lap time for approach glide
  const SWIM_RATIO = 1.0 - TURN_RATIO - START_GLIDE_RATIO - END_GLIDE_RATIO;  // 82-85% for active swimming
  
  // Get actual animation clip duration for accurate sync
  const animClip = animations.find(c => c.name === animName);
  const clipDuration = animClip?.duration ?? 1.2;
  
  // Calculate stroke-based values from FIT data
  const strokes = lengthData?.strokes ?? 12;
  const isRest = lengthData?.isRest ?? false;
  const isLastLap = lengthData?.isLastLap ?? false;
  
  // Calculate distances
  // Layout: |WALL|--START_GLIDE--|----SWIMMING----|--END_GLIDE--|WALL|
  const totalSwimmableDistance = poolLength - (2 * WALL_TOUCH_OFFSET);
  const swimDistance = totalSwimmableDistance - START_GLIDE_DISTANCE - END_GLIDE_DISTANCE;
  
  // Calculate time distribution based on fixed percentages
  const turnTime = swimDuration * TURN_RATIO;  // Time for turn animation (0 for first lap)
  const startGlideTime = swimDuration * START_GLIDE_RATIO;
  const endGlideTime = swimDuration * END_GLIDE_RATIO;
  const swimTime = swimDuration * SWIM_RATIO;
  
  // Calculate speeds derived from distance/time for EXACT timing
  // These ensure swimmer covers exact distance in exact time for each phase
  const glideSpeed = START_GLIDE_DISTANCE / startGlideTime;
  const endGlideSpeed = END_GLIDE_DISTANCE / endGlideTime;
  const swimSpeed = swimDistance / swimTime;  // EXACT: swimDistance in swimTime
  
  // Animation speed: sync animation cycles with actual strokes during swim phase
  // We need exactly `strokes` animation cycles in `swimTime` seconds
  // At timeScale=1, one cycle takes `clipDuration` seconds
  // For `strokes` cycles at timeScale=1, we need: strokes * clipDuration seconds
  // To fit that into swimTime: timeScale = (strokes * clipDuration) / swimTime
  // NOTE: speedMultiplier is applied separately in useFrame, NOT here!
  const animSpeed = (strokes * clipDuration) / swimTime;
  
  // Refs to track animation cycles for precise stroke counting
  const animCycleProgressRef = useRef(0);
  const animCycleCountRef = useRef(0);
  
  // Debug: One-line timing summary per lap
  // console.log(`[TIMING] Lap ${lengthData?.index ?? 0}: ${swimDuration.toFixed(1)}s total, swimTime=${swimTime.toFixed(2)}s, ${strokes} strokes, animSpeed=${animSpeed.toFixed(3)}`);
  
  // Track currently playing animation to avoid unnecessary resets
  const currentlyPlayingRef = useRef<string>('');
  
  // Start animation helper - only resets if animation actually changed
  const startAnimation = useCallback((name: string, speed: number, paused = false) => {
    const action = actions[name];
    if (!action) {
      console.warn('Animation not found:', name);
      return;
    }
    
    // Only reset if switching to a different animation
    if (currentlyPlayingRef.current !== name) {
      Object.values(actions).forEach(a => a?.stop());
      action.reset();
      action.setLoop(THREE.LoopRepeat, Infinity);
      currentlyPlayingRef.current = name;
    }
    
    action.setEffectiveTimeScale(speed);
    action.paused = paused;
    if (!action.isRunning()) {
      action.play();
    }
  }, [actions]);
  
  /**
   * Start push-off animation from squat position.
   * Used for freestyle, breaststroke, butterfly to simulate wall push-off.
   * Animation plays from PUSH_OFF_START_FRAME to PUSH_OFF_END_FRAME.
   */
  const startPushOffAnimation = useCallback(() => {
    const action = actions[PUSH_OFF_ANIM_NAME];
    if (!action) {
      console.warn('Push-off animation not found:', PUSH_OFF_ANIM_NAME);
      return;
    }
    
    Object.values(actions).forEach(a => a?.stop());
    action.reset();
    action.setLoop(THREE.LoopOnce, 1);  // Play once, don't loop
    action.clampWhenFinished = true;    // Hold final frame
    
    // Set animation to start at squat position
    const clipDuration = action.getClip().duration;
    action.time = clipDuration * PUSH_OFF_START_FRAME;
    action.setEffectiveTimeScale(PUSH_OFF_ANIM_SPEED);
    action.paused = false;
    action.play();
    
    currentlyPlayingRef.current = PUSH_OFF_ANIM_NAME + '_PUSHOFF';
    pushOffCompleteRef.current = false;
    
    console.log('[PUSH-OFF] Started at frame', PUSH_OFF_START_FRAME.toFixed(2), 
                'duration:', clipDuration.toFixed(2));
  }, [actions]);
  
  /**
   * Start turn animation from glide position (manual reverse playback to squat).
   * For backstroke: swimmer rotates to supine position (on back) during turn.
   * Animation time is manually decreased from TURN_START_FRAME to TURN_END_FRAME.
   */
  const startTurnAnimation = useCallback((isBackstroke: boolean) => {
    const action = actions[TURN_ANIM_NAME];
    if (!action) {
      console.warn('Turn animation not found:', TURN_ANIM_NAME);
      return;
    }
    
    Object.values(actions).forEach(a => a?.stop());
    action.reset();
    action.setLoop(THREE.LoopOnce, 1);  // Play once, don't loop
    action.clampWhenFinished = true;    // Hold final frame
    
    // Set animation to start at glide position
    const clipDur = action.getClip().duration;
    action.time = clipDur * TURN_START_FRAME;
    action.setEffectiveTimeScale(0);  // Paused - we control time manually
    action.paused = false;  // Must be false for mixer.update to work
    action.play();
    
    currentlyPlayingRef.current = TURN_ANIM_NAME + '_TURN';
    turnCompleteRef.current = false;
    turnInBackstrokeModeRef.current = isBackstroke;
    
    // Store starting Y rotation for smooth interpolation during turn
    if (groupRef.current) {
      turnStartRotationYRef.current = groupRef.current.rotation.y;
    }
    
    // For backstroke: rotate swimmer to supine position (on back)
    if (isBackstroke && groupRef.current) {
      groupRef.current.rotation.x = Math.PI;  // Flip to back
    }
    
    console.log('[TURN] Started at frame', TURN_START_FRAME.toFixed(2),
                'target frame:', TURN_END_FRAME.toFixed(2),
                'backstroke mode:', isBackstroke);
  }, [actions]);
  
  // Log available animations once (disabled)
  useEffect(() => {
    if (!loggedAnimationsRef.current) {
      loggedAnimationsRef.current = true;
    }
  }, [animationNames]);
  
  // Handle play/pause state
  useEffect(() => {
    if (mixer) {
      mixer.timeScale = isPlaying ? 1 : 0;
    }
  }, [isPlaying, mixer]);
  
  // Helper to set rest position (standing at pool edge, holding onto wall)
  const setRestPosition = useCallback(() => {
    if (!groupRef.current) return;
    
    // Determine which wall swimmer is at based on current position
    const currentZ = positionRef.current;
    const atStartWall = currentZ < poolLength / 2;
    
    // Position swimmer so extended hands touch the wall/start block
    // At start wall: body at Z=0.5 means hands reach Z≈0 (start block foot)
    // At end wall: body offset from wall
    const wallZ = atStartWall
      ? SWIMMER_REST_Z_START_WALL
      : poolLength - SWIMMER_REST_Z_END_WALL_OFFSET;
    
    groupRef.current.position.z = wallZ;
    // Keep internal positionRef in sync so waiting logic remains consistent
    positionRef.current = wallZ;
    
    // Y position: in water, holding onto wall edge
    groupRef.current.position.y = SWIMMER_REST_Y;
    
    // Face TOWARD the wall (looking at starting block)
    // At start wall (Z ≈ 0): face toward start (rotation.y = Math.PI)
    // At end wall (Z ≈ poolLength): face toward end (rotation.y = 0)
    groupRef.current.rotation.y = atStartWall ? Math.PI : 0;
    
    // Rotate swimmer to lean BACK toward the wall (hands reach block)
    // Positive X rotation = lean back toward wall
    groupRef.current.rotation.x = SWIMMER_REST_ROTATION_X; // ~57° back lean - hands on block
    
    // Set breaststroke animation at specific frame for holding wall pose
    const restAction = actions['SwimBreastStroke'];
    if (restAction) {
      Object.values(actions).forEach(a => a?.stop());
      restAction.reset();
      restAction.play();
      // Frame where arms are forward/down - good for holding wall
      restAction.time = (restAction.getClip().duration) * 0.75;
      restAction.paused = true;
      currentlyPlayingRef.current = 'SwimBreastStroke_REST';
    }
    
    phaseRef.current = 'REST';
    isFinishedRef.current = true;
  }, [actions, poolLength]);
  
  // Timeline scrubbing: update position based on timelineProgress (3-phase model)
  // NOTE: This should work even when isFinishedRef.current is true (allows scrubbing after finish)
  // CRITICAL: Do NOT run during TURNING or WAITING phase - useFrame handles lap transitions!
  useEffect(() => {
    // Guard: Never override TURNING or WAITING phases - they handle lap transitions
    if (phaseRef.current === 'TURNING' || phaseRef.current === 'WAITING') {
      return;
    }
    
    if (timelineProgress !== undefined && groupRef.current) {
      // Reset finished state when timeline is being scrubbed
      if (isFinishedRef.current && timelineProgress < 0.99) {
        isFinishedRef.current = false;
        phaseRef.current = 'START_GLIDE';
      }
      
      const isReturnLap = (lengthData?.index ?? 0) % 2 === 1;
      
      // Calculate phase boundaries as ratios of total duration
      const startGlideRatio = startGlideTime / swimDuration;
      const swimEndRatio = (startGlideTime + swimTime) / swimDuration;
      // endGlideRatio = 1.0 (remainder)
      
      let newPosition: number;
      let currentPhase: SwimPhase = 'START_GLIDE';
      
      if (timelineProgress < startGlideRatio) {
        // START_GLIDE phase
        currentPhase = 'START_GLIDE';
        const glideProgress = timelineProgress / startGlideRatio;
        newPosition = isReturnLap 
          ? (poolLength - WALL_TOUCH_OFFSET) - (glideProgress * START_GLIDE_DISTANCE)
          : WALL_TOUCH_OFFSET + (glideProgress * START_GLIDE_DISTANCE);
        startAnimation(selectedGlideAnim, 1, true);
      } else if (timelineProgress < swimEndRatio) {
        // SWIMMING phase
        currentPhase = 'SWIMMING';
        const swimProgress = (timelineProgress - startGlideRatio) / (swimEndRatio - startGlideRatio);
        const swimStartPos = isReturnLap 
          ? (poolLength - WALL_TOUCH_OFFSET - START_GLIDE_DISTANCE)
          : (WALL_TOUCH_OFFSET + START_GLIDE_DISTANCE);
        newPosition = isReturnLap
          ? swimStartPos - (swimProgress * swimDistance)
          : swimStartPos + (swimProgress * swimDistance);
        startAnimation(animName, animSpeed, false);
      } else {
        // END_GLIDE phase
        currentPhase = 'END_GLIDE';
        const endGlideProgress = (timelineProgress - swimEndRatio) / (1 - swimEndRatio);
        const endGlideStartPos = isReturnLap
          ? (WALL_TOUCH_OFFSET + END_GLIDE_DISTANCE)
          : (poolLength - WALL_TOUCH_OFFSET - END_GLIDE_DISTANCE);
        newPosition = isReturnLap
          ? endGlideStartPos - (endGlideProgress * END_GLIDE_DISTANCE)
          : endGlideStartPos + (endGlideProgress * END_GLIDE_DISTANCE);
        startAnimation(selectedGlideAnim, 1, true);
      }
      
      positionRef.current = newPosition;
      phaseRef.current = currentPhase;
      isGlidingRef.current = currentPhase !== 'SWIMMING';
      
      // Update visual position
      groupRef.current.position.z = newPosition;
      const yPos = SWIMMER_Y_BY_STROKE[currentStroke] ?? SWIMMER_FREESTYLE_Y;
      groupRef.current.position.y = yPos;
      
      // Update rotation for swim direction
      groupRef.current.rotation.y = isReturnLap ? Math.PI : 0;
      groupRef.current.rotation.x = 0; // horizontal during swimming
      
      // Call onPositionUpdate so UI stays in sync during timeline scrubbing
      onPositionUpdate?.({
        x: groupRef.current.position.x,
        y: groupRef.current.position.y,
        z: newPosition,
        direction: isReturnLap ? -1 : 1,
        speed: 0,
        strokePhase: 0,
        isGliding: isGlidingRef.current,
        currentStrokeCount: 0,
        elapsedSeconds: timelineProgress * swimDuration,
        phase: currentPhase,
        rotationX: groupRef.current.rotation.x,
        rotationY: groupRef.current.rotation.y,
      });
    }
  }, [timelineProgress, lengthData?.index, poolLength, currentStroke, swimDuration, startGlideTime, swimTime, swimDistance, START_GLIDE_DISTANCE, END_GLIDE_DISTANCE, WALL_TOUCH_OFFSET, animName, animSpeed, selectedGlideAnim, startAnimation, onPositionUpdate]);
  
  // Main animation loop - 3-phase position updates
  useFrame((_, delta) => {
    // Check for REST or activity finished
    if (isRest || isFinishedRef.current) {
      if (phaseRef.current !== 'REST' && phaseRef.current !== 'FINISHED') {
        setRestPosition();
      }
      // IMPORTANT: Still update position every frame for debug offset to work
      // setRestPosition() only runs once, but we need to reset position each frame
      // so that the debug useFrame can add offsets on top
      if (groupRef.current && (phaseRef.current === 'REST' || phaseRef.current === 'FINISHED')) {
        const currentZ = positionRef.current;
        const atStartWall = currentZ < poolLength / 2;
        const wallZ = atStartWall
          ? SWIMMER_REST_Z_START_WALL
          : poolLength - SWIMMER_REST_Z_END_WALL_OFFSET;
        groupRef.current.position.z = wallZ;
        groupRef.current.position.y = SWIMMER_REST_Y;
        groupRef.current.rotation.y = atStartWall ? Math.PI : 0;
        groupRef.current.rotation.x = SWIMMER_REST_ROTATION_X; // ~57° back lean
        
        // Apply debug offsets BEFORE calling onPositionUpdate
        if (debugOverride?.positionOffset) {
          groupRef.current.position.x += debugOverride.positionOffset.x;
          groupRef.current.position.y += debugOverride.positionOffset.y;
          groupRef.current.position.z += debugOverride.positionOffset.z;
        }
        if (debugOverride?.rotationOverride) {
          groupRef.current.rotation.x += debugOverride.rotationOverride.x;
        }
        
        // Call onPositionUpdate so UI stays in sync
        onPositionUpdate?.({
          x: groupRef.current.position.x,
          y: groupRef.current.position.y,
          z: groupRef.current.position.z,
          direction: directionRef.current,
          speed: 0,
          strokePhase: 0,
          isGliding: false,
          currentStrokeCount: 0,
          elapsedSeconds: swimDuration,
          phase: phaseRef.current,
          rotationX: groupRef.current.rotation.x,
          rotationY: groupRef.current.rotation.y,
        });
      }
      return;
    }
    
    // Check for new lap - initialize position and START_GLIDE phase
    const currentLapIndex = lengthData?.index ?? 0;
    if (lapIndexRef.current !== currentLapIndex) {
      lapIndexRef.current = currentLapIndex;
      isFinishedRef.current = false;
      
      const isReturnLap = currentLapIndex % 2 === 1;
      // Previous lap direction (opposite of current)
      const prevDirection = isReturnLap ? 1 : -1;
      
      // Reset common state for new lap
      strokeCountRef.current = 0;
      strokeTimeRef.current = 0;
      isGlidingRef.current = true;
      swimAnimActiveRef.current = false;
      animCycleProgressRef.current = 0;
      animCycleCountRef.current = 0;
      currentlyPlayingRef.current = '';
      turnCompleteRef.current = false;
      turnInBackstrokeModeRef.current = false;
      Object.values(actions).forEach(a => a?.stop());
      
      console.log('=== LAP START (3-Phase) ===', {
        lap: currentLapIndex,
        isLastLap,
        lapDuration: `${swimDuration}s`,
        strokes,
        phases: `${startGlideTime.toFixed(1)}s + ${swimTime.toFixed(1)}s + ${endGlideTime.toFixed(1)}s`,
      });
      
      // For lap 0: set initial position and start with push-off animation
      // For lap 1+: KEEP current position (at wall), start with TURNING animation
      if (currentLapIndex === 0) {
        // First lap - set initial position and start push-off
        positionRef.current = WALL_TOUCH_OFFSET;
        directionRef.current = 1;
        glideStartPosRef.current = WALL_TOUCH_OFFSET;
        if (groupRef.current) {
          groupRef.current.rotation.y = 0;
          groupRef.current.rotation.x = 0;
        }
        phaseRef.current = 'START_GLIDE';
        
        if (currentStroke !== 'backstroke') {
          startPushOffAnimation();
        } else {
          startAnimation(selectedGlideAnim, 1, true);
          pushOffCompleteRef.current = true;
        }
      } else {
        // Subsequent laps - swimmer is still at wall from previous lap
        // Keep position where it was (at wall), keep OLD direction during turn
        // Position: swimmer arrived at wall at end of previous lap
        const wallPos = prevDirection === 1 
          ? poolLength - WALL_TOUCH_OFFSET  // Arrived at end wall
          : WALL_TOUCH_OFFSET;               // Arrived at start wall
        positionRef.current = wallPos;
        glideStartPosRef.current = wallPos;
        
        // Direction stays as previous lap during turn (will flip after turn completes)
        directionRef.current = prevDirection;
        if (groupRef.current) {
          groupRef.current.rotation.y = prevDirection === 1 ? 0 : Math.PI;
          groupRef.current.rotation.x = 0;
        }
        
        // Start with TURNING phase
        phaseRef.current = 'TURNING';
        startTurnAnimation(currentStroke === 'backstroke');
        console.log('=== LAP START with TURNING ===', {
          lap: currentLapIndex,
          position: positionRef.current.toFixed(2),
          prevDirection,
          isBackstroke: currentStroke === 'backstroke',
        });
      }
    }
    
    // CRITICAL: Process TURNING phase BEFORE the isPlaying check!
    // Turn animation must run even when paused so it's visible at lap start
    if (phaseRef.current === 'TURNING' && groupRef.current) {
      const turnAction = actions[TURN_ANIM_NAME];
      if (turnAction && !turnCompleteRef.current) {
        const turnDelta = delta * speedMultiplier;
        const clipDur = turnAction.getClip().duration;
        
        // Calculate turn animation speed to fit exactly in turnTime
        // Animation goes from TURN_START_FRAME (0.85) to TURN_END_FRAME (0.55)
        // Distance in time: (0.85 - 0.55) * clipDur = 0.3 * clipDur
        // Speed needed: (0.3 * clipDur) / turnTime
        const turnAnimDistance = (TURN_START_FRAME - TURN_END_FRAME) * clipDur;
        const calculatedTurnSpeed = turnTime > 0 ? turnAnimDistance / turnTime : TURN_ANIM_SPEED;
        
        // Manually decrease animation time (reverse playback from glide to squat)
        turnAction.time -= turnDelta * calculatedTurnSpeed;
        
        const currentFrame = turnAction.time / clipDur;
        
        // Calculate turn progress: 0 = just started (glide), 1 = complete (squat)
        const turnProgress = Math.min(1, Math.max(0,
          (TURN_START_FRAME - currentFrame) / (TURN_START_FRAME - TURN_END_FRAME)
        ));
        
        // SIMULTANEOUS: Interpolate Y rotation during turn (180° flip)
        groupRef.current.rotation.y = turnStartRotationYRef.current + (turnProgress * Math.PI);
        
        // Debug: Log turn animation progress
        if (Math.floor(turnProgress * 10) !== Math.floor((turnProgress - 0.1) * 10)) {
          console.log('[TURN] Progress:', {
            time: turnAction.time.toFixed(3),
            frame: currentFrame.toFixed(3),
            progress: (turnProgress * 100).toFixed(0) + '%',
            rotationY: groupRef.current.rotation.y.toFixed(3),
            positionZ: positionRef.current.toFixed(2),
          });
        }
        
        // When we reach TURN_END_FRAME (squat position), turn is complete
        if (currentFrame <= TURN_END_FRAME) {
          // Clamp to exact end frame
          turnAction.time = clipDur * TURN_END_FRAME;
          turnCompleteRef.current = true;
          
          // Reset X rotation (was flipped for backstroke turn)
          if (turnInBackstrokeModeRef.current) {
            groupRef.current.rotation.x = 0;
            turnInBackstrokeModeRef.current = false;
          }
          
          // Direction change already happened via rotation interpolation
          // Just update the direction ref to match
          const newDirection = directionRef.current === 1 ? -1 : 1;
          directionRef.current = newDirection as 1 | -1;
          
          console.log('[TURN] Completed at frame', currentFrame.toFixed(2),
                      'new direction:', newDirection,
                      'rotation.y:', groupRef.current.rotation.y.toFixed(2),
                      'transitioning to START_GLIDE');
          
          // Transition to START_GLIDE - begin the new lap's push-off
          phaseRef.current = 'START_GLIDE';
          glideStartPosRef.current = positionRef.current;
          
          // Start push-off animation (continues from squat position)
          if (currentStroke !== 'backstroke') {
            startPushOffAnimation();
          } else {
            startAnimation(selectedGlideAnim, 1, true);
            pushOffCompleteRef.current = true;
          }
        }
      }
      
      // Update visual position during turn (swimmer stays at wall)
      groupRef.current.position.z = positionRef.current;
      const yPos = SWIMMER_Y_BY_STROKE[currentStroke] ?? SWIMMER_FREESTYLE_Y;
      groupRef.current.position.y = yPos;
      
      // Call onPositionUpdate during turn
      onPositionUpdate?.({
        x: groupRef.current.position.x,
        y: groupRef.current.position.y,
        z: positionRef.current,
        direction: directionRef.current,
        speed: 0,
        strokePhase: 0,
        isGliding: true,
        currentStrokeCount: 0,
        elapsedSeconds: 0,
        phase: phaseRef.current,
        rotationX: groupRef.current.rotation.x,
        rotationY: groupRef.current.rotation.y,
      });
      return;  // Early return - turn phase handled
    }
    
    if (!isPlaying || !groupRef.current) return;
    
    const effectiveDelta = delta * speedMultiplier;
    
    // Phase-based movement (TURNING is handled above, before isPlaying check)
    switch (phaseRef.current) {
      case 'START_GLIDE': {
        // Move at glide speed
        positionRef.current += glideSpeed * effectiveDelta * directionRef.current;
        
        // Check if push-off animation has reached glide position
        if (!pushOffCompleteRef.current && currentStroke !== 'backstroke') {
          const pushOffAction = actions[PUSH_OFF_ANIM_NAME];
          if (pushOffAction) {
            const clipDur = pushOffAction.getClip().duration;
            const currentFrame = pushOffAction.time / clipDur;
            
            // When animation reaches glide frame, freeze it
            if (currentFrame >= PUSH_OFF_END_FRAME) {
              pushOffAction.paused = true;
              pushOffCompleteRef.current = true;
              console.log('[PUSH-OFF] Completed at frame', currentFrame.toFixed(2));
            }
          }
        }
        
        const glidedDistance = Math.abs(positionRef.current - glideStartPosRef.current);
        
        // Transition to SWIMMING when start glide distance reached
        if (glidedDistance >= START_GLIDE_DISTANCE) {
          phaseRef.current = 'SWIMMING';
          isGlidingRef.current = false;
          swimAnimActiveRef.current = true;
          swimStartPosRef.current = positionRef.current;
          strokeTimeRef.current = 0;
          strokeCountRef.current = 0;
          
          console.log('=== START_GLIDE -> SWIMMING ===', { 
            lap: lengthData?.index,
            position: positionRef.current.toFixed(2),
            animName,
            animSpeed: animSpeed.toFixed(3),
            clipDuration: clipDuration.toFixed(3),
            swimTime: swimTime.toFixed(2),
            strokes,
            expectedStrokeInterval: (swimTime / strokes).toFixed(3),
          });
          // Animation speed is already calibrated - do NOT multiply with speedMultiplier!
          // speedMultiplier only affects time progression, not animation timeScale
          startAnimation(animName, animSpeed, false);
        }
        break;
      }
      
      case 'SWIMMING': {
        // Move at swim speed (exact: swimDistance in swimTime)
        positionRef.current += swimSpeed * effectiveDelta * directionRef.current;
        strokeTimeRef.current += effectiveDelta;
        
        // Count strokes based on TIME elapsed (deterministic)
        // strokes total in swimTime seconds → strokesPerSecond = strokes / swimTime
        // In effectiveDelta seconds: cyclesDelta = effectiveDelta * strokes / swimTime
        const action = actions[animName];
        if (swimAnimActiveRef.current) {
          // Simple: how many strokes should have happened by now?
          const strokesPerSecond = strokes / swimTime;
          const cyclesDelta = effectiveDelta * strokesPerSecond;
          animCycleProgressRef.current += cyclesDelta;
          animCycleCountRef.current = Math.floor(animCycleProgressRef.current);

          const newStrokeCount = Math.min(animCycleCountRef.current, strokes);
          if (newStrokeCount > strokeCountRef.current) {
            strokeCountRef.current = newStrokeCount;
            // DEBUG: Log every stroke
            console.log(`[LAP ${lengthData?.index}] Stroke ${newStrokeCount}/${strokes} at ${strokeTimeRef.current.toFixed(2)}s (expected: ${(newStrokeCount * swimTime / strokes).toFixed(2)}s)`);
          }

          // Ensure animation speed is correct
          // NOTE: speedMultiplier does NOT affect timeScale - only time progression
          if (action) {
            if (Math.abs(action.getEffectiveTimeScale() - animSpeed) > 0.01) {
              console.log(`[LAP ${lengthData?.index}] FIXING timeScale: was ${action.getEffectiveTimeScale().toFixed(3)}, setting to ${animSpeed.toFixed(3)}`);
              action.setEffectiveTimeScale(animSpeed);
            }
          }
        }
        
        // Transition to END_GLIDE when swimTime elapsed (time-based, not distance)
        // This ensures exact timing regardless of small calculation errors
        if (strokeTimeRef.current >= swimTime) {
          phaseRef.current = 'END_GLIDE';
          isGlidingRef.current = true;
          swimAnimActiveRef.current = false;
          glideStartPosRef.current = positionRef.current;
          
          const swimmedDistance = Math.abs(positionRef.current - swimStartPosRef.current);
          console.log('=== SWIMMING -> END_GLIDE ===', { 
            animatedStrokes: strokeCountRef.current,
            targetStrokes: strokes,
            strokeMatch: strokeCountRef.current === strokes ? '✓ EXACT' : '✗ MISMATCH',
            swimmedDistance: swimmedDistance.toFixed(2),
            targetDistance: swimDistance.toFixed(2),
            swimTimeElapsed: strokeTimeRef.current.toFixed(2),
            targetSwimTime: swimTime.toFixed(2),
          });
          startAnimation(selectedGlideAnim, 1, true);
        }
        break;
      }
      
      case 'END_GLIDE': {
        // Move at exact end glide speed (distance/time matched)
        positionRef.current += endGlideSpeed * effectiveDelta * directionRef.current;
        
        // Wall touch detection
        const reachedEndWall = directionRef.current === 1 && positionRef.current >= poolLength - WALL_TOUCH_OFFSET;
        const reachedStartWall = directionRef.current === -1 && positionRef.current <= WALL_TOUCH_OFFSET;
        
        if (reachedEndWall || reachedStartWall) {
          // Clamp position to wall
          positionRef.current = reachedEndWall 
            ? poolLength - WALL_TOUCH_OFFSET 
            : WALL_TOUCH_OFFSET;
          
          // If last lap, transition to REST/FINISHED
          if (isLastLap) {
            phaseRef.current = 'FINISHED';
            setRestPosition();
          } else {
            // Wait at wall for LengthAutoAdvance to increment the lap index
            // Turn animation will start at the BEGINNING of the next lap
            phaseRef.current = 'WAITING';
            console.log('=== END_GLIDE -> WAITING ===', {
              lap: lengthData?.index,
              position: positionRef.current.toFixed(2),
              waitingForNextLapIndex: (lengthData?.index ?? 0) + 1,
            });
          }
        }
        break;
      }
      
      case 'WAITING':
        // Swimmer waits at wall for LengthAutoAdvance to increment lap index
        // Position stays clamped, no movement
        // When lengthData.index changes, the lap init code above will trigger
        break;
        
      case 'REST':
      case 'FINISHED':
        // No movement
        break;
    }
    
    // Update visual position
    if (phaseRef.current === 'WAITING') {
      // Position waiting swimmer so hands touch the wall/start block
      const atStartWall = positionRef.current < poolLength / 2;
      const waitingZ = atStartWall
        ? SWIMMER_REST_Z_START_WALL
        : poolLength - SWIMMER_REST_Z_END_WALL_OFFSET;

      groupRef.current.position.z = waitingZ;
      positionRef.current = waitingZ;
      const yPos = SWIMMER_Y_BY_STROKE[currentStroke] ?? SWIMMER_FREESTYLE_Y;
      groupRef.current.position.y = yPos;
    } else if (phaseRef.current !== 'REST' && phaseRef.current !== 'FINISHED') {
      groupRef.current.position.z = positionRef.current;
      const yPos = SWIMMER_Y_BY_STROKE[currentStroke] ?? SWIMMER_FREESTYLE_Y;
      groupRef.current.position.y = yPos;
    }
    
    // Debug overrides are now applied in a separate useFrame that always runs
    // (even when paused or in REST phase)
    
    // Calculate stroke phase for splash effects
    const strokeDuration = swimTime / strokes;
    const strokePhase = phaseRef.current === 'SWIMMING' 
      ? (strokeTimeRef.current % strokeDuration) / strokeDuration 
      : 0;
    
    // Calculate elapsed seconds based on phase timing
    let elapsedSeconds = 0;
    switch (phaseRef.current) {
      case 'START_GLIDE': {
        const glidedDistance = Math.abs(positionRef.current - glideStartPosRef.current);
        elapsedSeconds = glidedDistance / glideSpeed;
        break;
      }
      case 'SWIMMING':
        elapsedSeconds = startGlideTime + strokeTimeRef.current;
        break;
      case 'END_GLIDE': {
        const endGlideDistance = Math.abs(positionRef.current - glideStartPosRef.current);
        elapsedSeconds = startGlideTime + swimTime + (endGlideDistance / endGlideSpeed);
        break;
      }
      default:
        elapsedSeconds = swimDuration;
    }
    
    onPositionUpdate?.({
      x: groupRef.current.position.x,
      y: groupRef.current.position.y,
      z: positionRef.current,
      direction: directionRef.current,
      speed: isGlidingRef.current ? 0 : swimSpeed * directionRef.current,
      strokePhase,
      isGliding: isGlidingRef.current,
      currentStrokeCount: strokeCountRef.current,
      elapsedSeconds,
      phase: phaseRef.current,
      rotationX: groupRef.current.rotation.x,
      rotationY: groupRef.current.rotation.y,
    });
  });
  
  // Debug overrides are now applied directly in the main useFrame's REST block
  // (no separate useFrame needed - that caused double-application issues)
  
  return (
    <group ref={groupRef}>
      <primitive object={clonedModel} />
    </group>
  );
}

export function SimpleLaneSwimmer(props: SimpleLaneSwimmerProps) {
  return (
    <Suspense fallback={
      <mesh><boxGeometry args={[0.5, 0.5, 0.5]} /><meshStandardMaterial color="orange" /></mesh>
    }>
      <SwimmerModel {...props} />
    </Suspense>
  );
}

useGLTF.preload(MODEL_PATH);
export default SimpleLaneSwimmer;
