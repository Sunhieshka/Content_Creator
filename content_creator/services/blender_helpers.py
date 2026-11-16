"""Blockout helpers injected into every Blender 3D script (after the app's globals).

They implement the building blocks the Blender + Seedance workflows rely on
(Awesome-Blender-Seedance-Workflow-Usecases): grey-box sets, mannequin proxies
with readable facing and simple walk/run/pose animation, cameras with handheld
shake, orbits, floor position markers and timed camera cuts. Premade library
scripts use them, and Seed LLM is told about them (HELPERS_DOC) so generated
blockouts stay simple and reliable.
"""

HELPERS = r'''
# ---- blockout helpers (added by the app) ----
import math, mathutils, random
try:
    bpy.context.preferences.edit.keyframe_new_interpolation_type = 'BEZIER'
except Exception:
    pass

GREY = (0.55, 0.55, 0.55)
DARK = (0.18, 0.18, 0.18)
LIGHT = (0.8, 0.8, 0.8)
PALETTE = [(0.85, 0.25, 0.2), (0.2, 0.45, 0.85), (0.95, 0.7, 0.15), (0.25, 0.65, 0.35),
           (0.6, 0.3, 0.75), (0.95, 0.5, 0.2), (0.2, 0.7, 0.75), (0.85, 0.35, 0.6)]


def lab_material(name, rgb=GREY, rough=0.85, emit=0.0):
    """Matte material that reads the same in Workbench (diffuse_color) and EEVEE/Cycles."""
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.diffuse_color = (rgb[0], rgb[1], rgb[2], 1.0)
    m.roughness = rough
    try:
        m.use_nodes = True
    except Exception:
        pass
    b = m.node_tree.nodes.get("Principled BSDF") if m.node_tree else None
    if b:
        b.inputs["Base Color"].default_value = (rgb[0], rgb[1], rgb[2], 1.0)
        if "Roughness" in b.inputs:
            b.inputs["Roughness"].default_value = rough
        if emit and "Emission Color" in b.inputs:
            b.inputs["Emission Color"].default_value = (rgb[0], rgb[1], rgb[2], 1.0)
            b.inputs["Emission Strength"].default_value = emit
    return m


def _finish(o, name, rgb, smooth=False):
    o.name = name
    o.data.materials.clear()
    o.data.materials.append(lab_material("mat_" + "_".join(f"{c:.2f}" for c in rgb), rgb))
    if smooth:
        for p in o.data.polygons:
            p.use_smooth = True
    return o


def add_box(name, size=(1, 1, 1), loc=(0, 0, 0), rgb=GREY, rot_deg=(0, 0, 0)):
    """Box of `size` (x, y, z) whose CENTER is at loc. Use loc z = size[2]/2 to rest on the floor."""
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=[math.radians(a) for a in rot_deg])
    o = bpy.context.active_object
    o.scale = size
    return _finish(o, name, rgb)


def add_cylinder(name, radius=0.5, depth=1.0, loc=(0, 0, 0), rgb=GREY, rot_deg=(0, 0, 0), vertices=32):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=loc,
                                        rotation=[math.radians(a) for a in rot_deg])
    return _finish(bpy.context.active_object, name, rgb, smooth=True)


def add_sphere(name, radius=0.5, loc=(0, 0, 0), rgb=GREY, scale=(1, 1, 1)):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12, radius=radius, location=loc)
    o = bpy.context.active_object
    o.scale = scale
    return _finish(o, name, rgb, smooth=True)


def add_empty(name, loc=(0, 0, 0), parent=None):
    e = bpy.data.objects.new(name, None)
    bpy.context.scene.collection.objects.link(e)
    e.empty_display_size = 0.2
    if parent is not None:
        e.parent = parent
    e.location = loc
    return e


def _attach(child, parent, local_loc):
    child.parent = parent
    child.location = local_loc
    return child


def add_floor(size=60, rgb=(0.42, 0.42, 0.42), grid=False, grid_step=1.0, grid_rgb=(0.3, 0.3, 0.3)):
    """Flat floor at z=0, optionally with grid lines every grid_step units (marker stages, spatial reads)."""
    bpy.ops.mesh.primitive_plane_add(size=size, location=(0, 0, 0))
    floor = _finish(bpy.context.active_object, "Floor", rgb)
    if grid:
        n = max(2, int(size / grid_step))
        bpy.ops.mesh.primitive_grid_add(x_subdivisions=n, y_subdivisions=n, size=size, location=(0, 0, 0.003))
        g = _finish(bpy.context.active_object, "FloorGrid", grid_rgb)
        mod = g.modifiers.new("lines", 'WIREFRAME')
        mod.thickness = 0.02
    return floor


def set_world(rgb=(0.5, 0.5, 0.52), strength=1.0):
    scene = bpy.context.scene
    if scene.world is None:
        scene.world = bpy.data.worlds.new("World")
    w = scene.world
    try:
        w.use_nodes = True
    except Exception:
        pass
    bg = w.node_tree.nodes.get("Background") if w.node_tree else None
    if bg:
        bg.inputs["Color"].default_value = (rgb[0], rgb[1], rgb[2], 1.0)
        bg.inputs["Strength"].default_value = strength
    w.color = rgb


def studio_lights(energy=1.0):
    """Even blockout lighting for EEVEE/Cycles (Workbench uses its own studio light)."""
    set_world((0.55, 0.55, 0.57), 0.6)
    sun_data = bpy.data.lights.new("Sun", 'SUN')
    sun_data.energy = 3.0 * energy
    sun = bpy.data.objects.new("Sun", sun_data)
    bpy.context.scene.collection.objects.link(sun)
    sun.rotation_euler = (math.radians(50), math.radians(10), math.radians(35))
    return sun


# ---- mannequins ----

class Mannequin:
    """Jointed proxy figure. Faces local +Y (a cone nose shows facing). root sits on the floor.

    Joints (pivot empties, rotate with rotation_euler in radians): hips (bounce/lean), chest,
    head, arm_l/arm_r (shoulders), elbow_l/elbow_r, leg_l/leg_r (hips), knee_l/knee_r.
    The character's RIGHT is local +X, LEFT is local -X.
    """

    def __init__(self, name, rgb=GREY, height=1.8, loc=(0, 0), facing_deg=0.0):
        h = height
        self.name, self.h = name, h
        self.leg_len = 0.47 * h
        self.thigh = self.shin = self.leg_len / 2
        self.root = add_empty(name, (loc[0], loc[1], 0))
        self.root.rotation_euler = (0, 0, math.radians(facing_deg))
        self.hips = add_empty(name + "_hips", (0, 0, self.leg_len), self.root)
        _attach(add_sphere(name + "_pelvis", 0.1 * h, rgb=rgb, scale=(1.0, 0.75, 0.6)), self.hips, (0, 0, 0.02 * h))
        self.chest = add_empty(name + "_chest", (0, 0, 0.06 * h), self.hips)
        _attach(add_sphere(name + "_torso", 0.15 * h, rgb=rgb, scale=(0.82, 0.55, 1.0)), self.chest, (0, 0, 0.15 * h))
        self.head = add_empty(name + "_neck", (0, 0, 0.33 * h), self.chest)
        _attach(add_sphere(name + "_head", 0.065 * h, rgb=rgb, scale=(0.9, 1.0, 1.15)), self.head, (0, 0, 0.07 * h))
        bpy.ops.mesh.primitive_cone_add(vertices=16, radius1=0.022 * h, depth=0.05 * h, rotation=(math.radians(-90), 0, 0))
        _attach(_finish(bpy.context.active_object, name + "_nose", DARK, smooth=True), self.head, (0, 0.07 * h, 0.075 * h))
        self.leg_l, self.knee_l = self._limb("leg_l", rgb, (-0.055 * h, 0, 0), self.hips, self.thigh, self.shin, 0.04 * h, foot=True)
        self.leg_r, self.knee_r = self._limb("leg_r", rgb, (0.055 * h, 0, 0), self.hips, self.thigh, self.shin, 0.04 * h, foot=True)
        self.arm_l, self.elbow_l = self._limb("arm_l", rgb, (-0.13 * h, 0, 0.28 * h), self.chest, 0.17 * h, 0.16 * h, 0.028 * h)
        self.arm_r, self.elbow_r = self._limb("arm_r", rgb, (0.13 * h, 0, 0.28 * h), self.chest, 0.17 * h, 0.16 * h, 0.028 * h)
        self.stride = 0.75 * h
        self.dist = 0.0

    def _limb(self, label, rgb, pivot, parent, upper, lower, radius, foot=False):
        top = add_empty(f"{self.name}_{label}", pivot, parent)
        _attach(add_cylinder(f"{self.name}_{label}_upper", radius, upper, rgb=rgb, vertices=16), top, (0, 0, -upper / 2))
        joint = add_empty(f"{self.name}_{label}_joint", (0, 0, -upper), top)
        _attach(add_cylinder(f"{self.name}_{label}_lower", radius * 0.85, lower, rgb=rgb, vertices=16), joint, (0, 0, -lower / 2))
        if foot:
            _attach(add_box(f"{self.name}_{label}_foot", (radius * 1.8, radius * 4.0, radius * 1.2), rgb=DARK), joint,
                    (0, radius * 1.2, -lower + radius * 0.4))
        return top, joint

    # -- keyframing --
    def key_pose(self, frame):
        for o in (self.root, self.hips, self.chest, self.head, self.arm_l, self.arm_r, self.elbow_l, self.elbow_r,
                  self.leg_l, self.leg_r, self.knee_l, self.knee_r):
            o.keyframe_insert("rotation_euler", frame=frame)
        self.root.keyframe_insert("location", frame=frame)
        self.hips.keyframe_insert("location", frame=frame)

    def pose(self, frame, arm_l=(0, 0), arm_r=(0, 0), elbow_l=0, elbow_r=0, leg_l=(0, 0), leg_r=(0, 0),
             knee_l=0, knee_r=0, spine=(0, 0), head=(0, 0), bounce=0.0):
        """Set a pose in DEGREES and keyframe it. arm/leg = (forward swing, sideways out), spine/head = (bend forward,
        turn). Positive sideways moves the limb away from the body on its own side. bounce lowers the hips (units)."""
        r = math.radians
        self.arm_l.rotation_euler = (r(arm_l[0]), r(arm_l[1]), 0)
        self.arm_r.rotation_euler = (r(arm_r[0]), r(-arm_r[1]), 0)
        self.elbow_l.rotation_euler = (r(elbow_l), 0, 0)
        self.elbow_r.rotation_euler = (r(elbow_r), 0, 0)
        self.leg_l.rotation_euler = (r(leg_l[0]), r(leg_l[1]), 0)
        self.leg_r.rotation_euler = (r(leg_r[0]), r(-leg_r[1]), 0)
        self.knee_l.rotation_euler = (r(-knee_l), 0, 0)
        self.knee_r.rotation_euler = (r(-knee_r), 0, 0)
        self.chest.rotation_euler = (r(spine[0]), 0, r(spine[1]))
        self.head.rotation_euler = (r(head[0]), 0, r(head[1]))
        self.hips.location = (0, 0, self.leg_len - bounce)
        self.key_pose(frame)

    def place(self, frame, loc, facing_deg=None):
        self.root.location = (loc[0], loc[1], 0)
        if facing_deg is not None:
            self.root.rotation_euler = (0, 0, math.radians(facing_deg))
        self.root.keyframe_insert("location", frame=frame)
        self.root.keyframe_insert("rotation_euler", frame=frame)

    def stand(self, frame):
        self.pose(frame, arm_l=(0, 6), arm_r=(0, 6))

    def travel(self, path, f0, f1, run=False, step=2):
        """Walk (or run) along a polyline of (x, y) points from frame f0 to f1 at constant speed, facing the
        direction of travel, with a leg/arm swing cycle. Returns the frame it arrives."""
        pts = [mathutils.Vector((p[0], p[1], 0)) for p in path]
        segs = [(a, b, (b - a).length) for a, b in zip(pts, pts[1:]) if (b - a).length > 1e-6]
        total = sum(s[2] for s in segs) or 1e-6
        swing, knee, arm = (55, 75, 60) if run else (28, 32, 24)
        stride = self.stride * (1.5 if run else 1.0)
        lean = 14 if run else 3
        for f in list(range(int(f0), int(f1) + 1, step)) + ([int(f1)] if (int(f1) - int(f0)) % step else []):
            t = (f - f0) / max(1, f1 - f0)
            d = t * total
            for a, b, ln in segs:
                if d <= ln or (a, b, ln) == segs[-1]:
                    u = min(1.0, d / ln)
                    pos, direction = a.lerp(b, u), (b - a).normalized()
                    break
                d -= ln
            heading = math.degrees(math.atan2(direction.y, direction.x)) - 90
            phase = (self.dist + t * total) / stride * 2 * math.pi
            s = math.sin(phase)
            self.root.location = (pos.x, pos.y, 0)
            self.root.rotation_euler = (0, 0, math.radians(heading))
            self.pose(f, arm_l=(-arm * s, 6), arm_r=(arm * s, 6), elbow_l=25 if run else 10, elbow_r=25 if run else 10,
                      leg_l=(swing * s, 0), leg_r=(-swing * s, 0),
                      knee_l=max(0.0, knee * -s) + 5, knee_r=max(0.0, knee * s) + 5,
                      spine=(lean, 0), bounce=abs(math.sin(phase)) * 0.03 * self.h)
        self.dist += total
        return f1

    def turn(self, f0, f1, to_deg, from_deg=None):
        """Turn in place to face to_deg (0 = +Y, 90 = -X, -90 = +X, 180 = -Y)."""
        if from_deg is not None:
            self.root.rotation_euler = (0, 0, math.radians(from_deg))
        self.root.keyframe_insert("rotation_euler", frame=f0)
        self.root.rotation_euler = (0, 0, math.radians(to_deg))
        self.root.keyframe_insert("rotation_euler", frame=f1)


def facing_toward(a, b):
    """Facing angle (degrees, for Mannequin facing_deg) for a figure at a=(x,y) to look at b=(x,y)."""
    return math.degrees(math.atan2(b[1] - a[1], b[0] - a[0])) - 90


# ---- cameras ----

class Cam:
    """Camera aimed at a target empty (TRACK_TO). Animate .move(frame, loc) / .aim(frame, loc)."""

    def __init__(self, name="Camera", loc=(0, -10, 1.6), target=(0, 0, 1.2), lens=35, active=True):
        data = bpy.data.cameras.new(name)
        data.lens = lens
        data.clip_end = 500
        self.rig = add_empty(name + "_rig", (0, 0, 0))
        self.obj = bpy.data.objects.new(name, data)
        bpy.context.scene.collection.objects.link(self.obj)
        self.obj.parent = self.rig
        self.obj.location = loc
        self.target = add_empty(name + "_target", target)
        c = self.obj.constraints.new('TRACK_TO')
        c.target = self.target
        c.track_axis = 'TRACK_NEGATIVE_Z'
        c.up_axis = 'UP_Y'
        if active:
            bpy.context.scene.camera = self.obj

    def move(self, frame, loc):
        self.obj.location = loc
        self.obj.keyframe_insert("location", frame=frame)

    def aim(self, frame, loc):
        self.target.location = loc
        self.target.keyframe_insert("location", frame=frame)

    def lens_key(self, frame, lens):
        self.obj.data.lens = lens
        self.obj.data.keyframe_insert("lens", frame=frame)

    def orbit(self, center, radius, height, start_deg, end_deg, f0, f1, step=2):
        """Circle around center (x, y, z) from start_deg to end_deg (0 deg = camera on -Y looking +Y)."""
        for f in list(range(int(f0), int(f1) + 1, step)) + [int(f1)]:
            t = (f - f0) / max(1, f1 - f0)
            a = math.radians(start_deg + (end_deg - start_deg) * t) - math.pi / 2
            self.move(f, (center[0] + radius * math.cos(a), center[1] + radius * math.sin(a), height))
        self.aim(f0, center)

    def follow(self, mannequin, f0, f1, offset=(0, -4.5, 1.7), look_height=1.2, step=4):
        """Trail a mannequin (offset in the figure's own frame: -Y = behind it)."""
        for f in list(range(int(f0), int(f1) + 1, step)) + [int(f1)]:
            bpy.context.scene.frame_set(f)
            m = mannequin.root.matrix_world
            self.move(f, m @ mathutils.Vector(offset))
            self.aim(f, m @ mathutils.Vector((0, 1.0, look_height)))

    def handheld(self, f0, f1, amount=0.04, every=5, seed=7):
        """Handheld shake: smooth random jitter on the rig (translation) and target (rotation feel)."""
        rnd = random.Random(seed)
        base_t = self.target.location.copy()
        for f in range(int(f0), int(f1) + 1, every):
            self.rig.location = (rnd.uniform(-amount, amount), rnd.uniform(-amount, amount), rnd.uniform(-amount, amount) * 0.6)
            self.rig.keyframe_insert("location", frame=f)
        if not (self.target.animation_data and self.target.animation_data.action):
            for f in range(int(f0), int(f1) + 1, every):
                self.target.location = base_t + mathutils.Vector((rnd.uniform(-amount, amount), 0, rnd.uniform(-amount, amount))) * 1.5
                self.target.keyframe_insert("location", frame=f)

    def focus(self, frame, distance, fstop=1.4):
        """Depth of field: keyframe the focus distance (EEVEE/Cycles)."""
        dof = self.obj.data.dof
        dof.use_dof = True
        dof.aperture_fstop = fstop
        dof.focus_distance = distance
        self.obj.data.keyframe_insert("dof.focus_distance", frame=frame)


def cut_to(cam, frame):
    """Hard cut: from `frame` on, render through `cam` (a Cam or camera object)."""
    obj = cam.obj if isinstance(cam, Cam) else cam
    m = bpy.context.scene.timeline_markers.new(f"cut_{frame}_{obj.name}", frame=int(frame))
    m.camera = obj
    if int(frame) <= FRAME_START:
        bpy.context.scene.camera = obj


# ---- stage markers ----

def add_marker(label, loc, facing_deg=0.0, rgb=(0.95, 0.75, 0.15), radius=0.45):
    """Floor position marker: a flat disc, an arrow showing facing (0 = +Y), and the label in large flat letters."""
    disc = add_cylinder(f"Marker_{label}", radius, 0.02, (loc[0], loc[1], 0.011), rgb, vertices=48)
    a = math.radians(facing_deg)
    fx, fy = -math.sin(a), math.cos(a)
    bpy.ops.mesh.primitive_cone_add(vertices=3, radius1=radius * 0.45, depth=0.02,
                                    location=(loc[0] + fx * radius * 1.45, loc[1] + fy * radius * 1.45, 0.012),
                                    rotation=(0, 0, a))
    _finish(bpy.context.active_object, f"Marker_{label}_arrow", rgb)
    cu = bpy.data.curves.new(f"Marker_{label}_text", type='FONT')
    cu.body = str(label)
    cu.size = radius * 1.2
    cu.align_x = 'CENTER'
    cu.align_y = 'CENTER'
    t = bpy.data.objects.new(f"Marker_{label}_text", cu)
    bpy.context.scene.collection.objects.link(t)
    t.location = (loc[0], loc[1], 0.025)
    t.data.materials.append(lab_material("marker_text", DARK))
    return disc
'''

HELPERS_DOC = """Blockout helpers are ALREADY defined before your script (do not redefine or import them). Prefer them:
- Colours: GREY, DARK, LIGHT, PALETTE (8 distinct RGB tuples for colour-coding characters). lab_material(name, rgb).
- add_box(name, size=(x,y,z), loc=(x,y,z), rgb, rot_deg) -- box CENTERED at loc (rest on floor: z = size_z/2).
  add_cylinder(name, radius, depth, loc, rgb, rot_deg), add_sphere(name, radius, loc, rgb, scale), add_empty(name, loc, parent).
- add_floor(size=60, rgb, grid=False, grid_step=1.0) -- floor at z=0 (grid=True draws grid lines). set_world(rgb, strength). studio_lights().
- m = Mannequin(name, rgb, height=1.8, loc=(x, y), facing_deg=0) -- jointed proxy figure standing on the floor; a dark
  cone nose shows where it faces. FACING ANGLES ARE NOT COMPASS ANGLES: facing_deg 0 faces +Y, 90 faces -X, -90 faces +X,
  180 faces -Y. Never guess an angle: to face a point always pass facing_deg=facing_toward((x, y), (target_x, target_y)).
  m.stand(frame); m.pose(frame, arm_l=(fwd,side), arm_r=(fwd,side), elbow_l, elbow_r, leg_l=(fwd,side), leg_r=(fwd,side),
  knee_l, knee_r, spine=(bend,turn), head=(bend,turn), bounce) -- degrees, keyframes the pose;
  m.place(frame, (x,y), facing_deg) (also use facing_toward here); m.travel([(x,y), (x,y), ...], f0, f1, run=False) -- walks/runs along the path with a
  leg/arm cycle facing the travel direction; m.turn(f0, f1, to_deg). facing_toward((x,y), (x,y)) -> facing_deg.
  Mannequin parts animate from their keys; after travel(), key a final m.stand(f) if it should stop.
- cam = Cam(name, loc=(x,y,z), target=(x,y,z), lens=35) -- camera aimed at a target empty, set as scene camera.
  cam.move(frame, loc); cam.aim(frame, loc); cam.lens_key(frame, lens); cam.orbit(center, radius, height, start_deg, end_deg, f0, f1);
  cam.follow(mannequin, f0, f1, offset=(0,-4.5,1.7)) (offset in the figure's frame, -Y = behind);
  cam.handheld(f0, f1, amount=0.04) (call LAST, after all other camera keys); cam.focus(frame, distance, fstop) (depth of field).
- cut_to(cam, frame) -- hard cut to that camera from frame on (create every Cam with active=False except the first shot's).
- add_marker(label, (x,y), facing_deg, rgb) -- floor position marker: disc + facing arrow + big flat letter.
Units are metres; people are ~1.7-1.85 tall. Keyframe interpolation is smooth (BEZIER) by default."""
