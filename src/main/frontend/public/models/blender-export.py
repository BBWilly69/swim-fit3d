"""
Blender Script: Combine Mixamo Character with Swimming Animations

This script combines a Mixamo T-pose character with multiple swimming animations
and exports as an optimized GLB file for use in the swim-data visualization.

Usage:
    1. Download character from Mixamo (FBX for Unity, T-pose)
    2. Download swimming animations (FBX for Unity, with skin)
    3. Place all files in the same directory as this script
    4. Run in Blender: blender --background --python blender-export.py

Required files:
    - character.fbx (T-pose character)
    - swim_freestyle.fbx (freestyle animation)
    - swim_breaststroke.fbx (breaststroke animation)
    - swim_backstroke.fbx (backstroke animation)
    - swim_butterfly.fbx (butterfly animation, optional)

Output:
    - swimmer.glb (optimized model with all animations)

@module scripts/blender-export
@author Swim-Data Project
"""

import bpy
import os
import sys

# Configuration
OUTPUT_FILE = "swimmer.glb"
ANIMATIONS = {
    "swim_freestyle": "Swimming",
    "swim_breaststroke": "Breaststroke", 
    "swim_backstroke": "Backstroke",
    "swim_butterfly": "Butterfly",
    "swim_dive": "Diving",
    "swim_turn_flip": "FlipTurn",
    "swim_turn_open": "OpenTurn",
}

def clear_scene():
    """Remove all objects from scene."""
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    
    # Clear orphan data
    for block in bpy.data.meshes:
        if block.users == 0:
            bpy.data.meshes.remove(block)
    for block in bpy.data.armatures:
        if block.users == 0:
            bpy.data.armatures.remove(block)
    for block in bpy.data.actions:
        if block.users == 0:
            bpy.data.actions.remove(block)


def import_fbx(filepath: str) -> bpy.types.Object:
    """
    Import FBX file and return the armature object.
    
    Args:
        filepath: Path to the FBX file
        
    Returns:
        The armature object from the imported file
    """
    bpy.ops.import_scene.fbx(filepath=filepath)
    
    # Find armature in selected objects
    for obj in bpy.context.selected_objects:
        if obj.type == 'ARMATURE':
            return obj
    return None


def extract_animation(fbx_path: str, action_name: str, target_armature: bpy.types.Object):
    """
    Extract animation from FBX and apply to target armature.
    
    Args:
        fbx_path: Path to FBX file with animation
        action_name: Name for the extracted action
        target_armature: Armature to receive the animation
    """
    # Import animation file
    bpy.ops.import_scene.fbx(filepath=fbx_path)
    
    # Find the imported armature
    imported_armature = None
    for obj in bpy.context.selected_objects:
        if obj.type == 'ARMATURE':
            imported_armature = obj
            break
    
    if not imported_armature:
        print(f"Warning: No armature found in {fbx_path}")
        return
    
    # Get the action from imported armature
    if imported_armature.animation_data and imported_armature.animation_data.action:
        action = imported_armature.animation_data.action.copy()
        action.name = action_name
        
        # Add action to target armature
        if not target_armature.animation_data:
            target_armature.animation_data_create()
        
        # Create NLA track for this animation
        track = target_armature.animation_data.nla_tracks.new()
        track.name = action_name
        track.strips.new(action_name, 0, action)
        track.mute = True  # Keep tracks muted, let application control
        
        print(f"Added animation: {action_name}")
    
    # Remove imported armature and meshes
    for obj in bpy.context.selected_objects:
        bpy.data.objects.remove(obj, do_unlink=True)


def optimize_model(armature: bpy.types.Object):
    """
    Optimize model for web delivery.
    
    Args:
        armature: The armature object to optimize
    """
    # Find all meshes parented to armature
    meshes = [obj for obj in bpy.data.objects if obj.parent == armature and obj.type == 'MESH']
    
    for mesh in meshes:
        bpy.context.view_layer.objects.active = mesh
        mesh.select_set(True)
        
        # Apply modifiers
        for modifier in mesh.modifiers:
            if modifier.type != 'ARMATURE':
                bpy.ops.object.modifier_apply(modifier=modifier.name)
        
        # Reduce polygon count if very high
        if len(mesh.data.polygons) > 10000:
            bpy.ops.object.modifier_add(type='DECIMATE')
            mesh.modifiers["Decimate"].ratio = 0.5
            bpy.ops.object.modifier_apply(modifier="Decimate")
        
        mesh.select_set(False)


def export_glb(filepath: str):
    """
    Export scene as GLB with optimal settings.
    
    Args:
        filepath: Output path for GLB file
    """
    bpy.ops.export_scene.gltf(
        filepath=filepath,
        export_format='GLB',
        export_animations=True,
        export_skins=True,
        export_morph=False,
        export_lights=False,
        export_cameras=False,
        export_extras=True,
        export_draco_mesh_compression_enable=True,
        export_draco_mesh_compression_level=6,
        export_image_format='WEBP',
    )
    print(f"Exported: {filepath}")


def main():
    """Main export workflow."""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Clear scene
    clear_scene()
    
    # Import base character
    character_path = os.path.join(script_dir, "character.fbx")
    if not os.path.exists(character_path):
        print(f"Error: Character file not found: {character_path}")
        print("Please download a character from Mixamo as 'character.fbx'")
        sys.exit(1)
    
    print(f"Importing character: {character_path}")
    armature = import_fbx(character_path)
    
    if not armature:
        print("Error: No armature found in character file")
        sys.exit(1)
    
    # Rename armature for clarity
    armature.name = "Swimmer"
    
    # Import animations
    for filename, action_name in ANIMATIONS.items():
        fbx_path = os.path.join(script_dir, f"{filename}.fbx")
        if os.path.exists(fbx_path):
            print(f"Importing animation: {filename}")
            extract_animation(fbx_path, action_name, armature)
        else:
            print(f"Skipping (not found): {filename}")
    
    # Optimize
    print("Optimizing model...")
    optimize_model(armature)
    
    # Export
    output_path = os.path.join(script_dir, OUTPUT_FILE)
    print(f"Exporting to: {output_path}")
    export_glb(output_path)
    
    print("Done!")


if __name__ == "__main__":
    main()
