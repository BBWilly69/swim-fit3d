# 3D Models Directory

This directory contains 3D models (GLTF/GLB) for the swimming visualization.

## Quick Start: Adding Mixamo Swimmer

### Prerequisites
- Adobe Account (free) for [mixamo.com](https://www.mixamo.com)
- Blender 3.0+ installed (`sudo apt install blender`)

### Step 1: Download Character from Mixamo

1. Go to [mixamo.com](https://www.mixamo.com) and sign in
2. Click "Characters" tab
3. Choose a character:
   - **Recommended**: "Y Bot" (gender-neutral, clean topology)
   - **Alternative**: "X Bot" or any slim athletic character
4. Click "Download"
5. Settings:
   - Format: **FBX for Unity (.fbx)**
   - Pose: **T-pose**
6. Save as `character.fbx` in this directory

### Step 2: Download Swimming Animations

Search and download each animation with these settings:
- Format: **FBX for Unity (.fbx)**
- Skin: **With Skin** (important!)
- Keyframe Reduction: **none**

| Animation | Mixamo Search | Save As |
|-----------|---------------|---------|
| Freestyle | "Swimming" | `swim_freestyle.fbx` |
| Breaststroke | "Swimming To Edge" or "Treading Water" | `swim_breaststroke.fbx` |
| Backstroke | "Swimming" (adjust rotation manually) | `swim_backstroke.fbx` |
| Butterfly | "Swimming" (modify arms in Blender) | `swim_butterfly.fbx` |
| Diving | "Diving" or "Jump" | `swim_dive.fbx` |
| Flip Turn | "Roll" or "Somersault" | `swim_turn_flip.fbx` |
| Open Turn | "Turn Around" | `swim_turn_open.fbx` |

**Note**: Not all swimming strokes are available on Mixamo. Start with freestyle ("Swimming") and add others later.

### Step 3: Combine in Blender

Run the provided Python script:

```bash
cd /path/to/swim-data/src/main/frontend/public/models

# Run with Blender in background mode
blender --background --python blender-export.py

# Or open Blender GUI and run script manually:
# 1. Open Blender
# 2. Go to Scripting workspace
# 3. Open blender-export.py
# 4. Click Run Script
```

This generates `swimmer.glb` with all animations embedded.

### Step 4: Verify Model

Start the dev server and the model will be automatically loaded:

```bash
cd src/main/frontend
yarn dev
```

The `MixamoSwimmer` component will:
- Load `swimmer.glb` if it exists
- Fall back to procedural `RealisticSwimmer` if not found

## Manual Blender Workflow

If you prefer manual control:

### Import Character
1. File → Import → FBX (.fbx)
2. Select `character.fbx`
3. Keep default settings, click Import

### Add Animation
1. File → Import → FBX (.fbx)
2. Select animation file (e.g., `swim_freestyle.fbx`)
3. In Animation Editor:
   - Select the imported armature
   - Go to Action Editor
   - Rename action (e.g., "Swimming")
   - Create NLA track: Push Down Action
4. Delete the imported mesh (keep only animation data)
5. Repeat for each animation

### Optimize
1. Select all meshes
2. Add Decimate modifier if > 10k polygons
3. Apply all modifiers except Armature

### Export
1. File → Export → glTF 2.0 (.glb)
2. Settings:
   - Format: glTF Binary (.glb)
   - Include: Selected Objects ✓
   - Transform: +Y Up ✓
   - Mesh: Apply Modifiers ✓
   - Animation: Export ✓
   - Compression: Draco ✓
3. Save as `swimmer.glb`

## Model Requirements

| Requirement | Value |
|-------------|-------|
| Format | GLTF/GLB |
| Rig | Humanoid skeleton |
| Animations | Embedded NLA tracks |
| Max file size | < 2MB (with Draco compression) |
| Polygon count | < 15,000 (per mesh) |

## Animation Naming Convention

The `MixamoSwimmer` component uses these animations from the GLB:

| GLB Animation Name | Stroke Type | Notes |
|--------------------|-------------|-------|
| `Freestyle` | Freestyle | InPlace animation |
| `SwimBreastStroke` | Breaststroke | InPlace animation |
| `SwimBackStroke` | Backstroke | InPlace animation |
| `SwimButterfly` | Butterfly | InPlace animation |
| `SwimIdle` | Idle/Standing | Treading water |

### Procedural Animations (built into component)

These animations are **not** in the GLB and are handled via code:

| Animation | Implementation |
|-----------|---------------|
| Diving/Start | Spring-based rotation + position arc |
| Flip Turn | Full somersault via rotX spring |
| Open Turn | Touch-and-push via position spring |

### Root Motion Animations (available but not used)

| Animation | Description |
|-----------|-------------|
| `FreestyleRoot` | Freestyle with forward movement |
| `SwimBreastStrokeRoot` | Breaststroke with movement |
| `SwimFreestyle2Root` | Alternative freestyle |
| `dogPaddleRoot` | Dog paddle with movement |

We use InPlace animations since position is controlled by the React component.

## Alternative Sources

If Mixamo doesn't have suitable animations:

- **Sketchfab**: [sketchfab.com](https://sketchfab.com) - Search "swimmer animated"
- **CGTrader**: [cgtrader.com](https://cgtrader.com) - Commercial options
- **Poly.pizza**: [poly.pizza](https://poly.pizza) - Free low-poly models
- **TurboSquid**: [turbosquid.com](https://turbosquid.com) - Premium quality

## Licensing

| Source | License |
|--------|---------|
| Mixamo | Free for commercial use (Adobe account required) |
| Sketchfab | Check individual model (CC-BY common) |
| poly.pizza | Mostly CC0/CC-BY |

## Troubleshooting

### Model not loading
- Check browser console for errors
- Verify file is named exactly `swimmer.glb`
- Ensure file is < 2MB

### Animations not playing
- Verify animation names match convention above
- Check Blender NLA tracks are properly set up
- Ensure "Export Animations" was enabled

### Model appears distorted
- Check armature bone orientations
- Verify T-pose is correct before adding animations
- Try re-importing with different FBX settings
