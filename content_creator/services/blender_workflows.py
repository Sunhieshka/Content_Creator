"""Blender + Seedance workflow modes for the Blender 3D tool.

Each mode is one way creators use Blender to direct Seedance, distilled from the
case collection in Documents/Blender/Awesome-Blender-Seedance-Workflow-Usecases
(case numbers refer to its README). A mode adds script rules for Seed LLM, render
defaults, and a Seedance prompt template that hands the render over as @Video1 in
the coarse/fine blockout format of the Seedance 2.5 optimizer skill.
"""

# The free-scene mode keeps the original "make it look good" rules; every other mode is a
# Seedance reference and replaces them with blockout rules.
BLOCKOUT_RULES = """THIS IS A SEEDANCE MOTION REFERENCE (a blockout), NOT A FINAL RENDER. These rules override the look rules above:
- Use plain matte grey / flat colour materials only: no textures, no glossy or metallic surfaces, no particles, no text unless asked.
- Keep geometry minimal: people are Mannequin(...) proxies, everything else is boxes, cylinders and spheres. Detailed
  geometry leaks a CG look into the final video (case 41), so simplify.
- Match character proportions to the real cast (heights, builds), not just the height (case 27).
- Keep the background simple wherever exact alignment is not needed (case 27): a floor plus a few blocks.
- One clear subject path and one clear camera move; motion spans the whole frame range. Readable timing beats the detail.
- Camera distance: keep the camera at least 3 m from every figure for the whole shot unless a close-up is asked for.
  When the camera travels with moving figures, use cam.follow(figure, ...) on the rearmost figure (or move the camera
  at the same speed) so the distance stays constant; never drive the camera into, through or right behind a figure.
  Check the opening frame: every figure that matters is fully visible.
- Do not redefine FPS, FRAME_START, FRAME_END, DURATION_S, RES_X or RES_Y.
- Keep the scene well lit and evenly exposed: studio_lights() for EEVEE/Cycles (Workbench lights itself)."""

WORKFLOWS = [
    {
        "id": "scene",
        "label": "Free 3D scene",
        "blurb": "Finished-looking 3D renders: product turntables, logo reveals, landscapes, motion graphics.",
        "cases": [],
        "defaults": {"engine": "eevee"},
        "rules": "",
        "seedance": "",
    },
    {
        "id": "camera-blockout",
        "label": "Camera blockout",
        "blurb": "Grey-box set, animate ONLY the camera: timing, speed, a touch of handheld shake, spatial layout. Pair with a start frame for the look.",
        "cases": [1, 2, 4, 5, 42],
        "defaults": {"engine": "workbench"},
        "rules": BLOCKOUT_RULES + """
CAMERA BLOCKOUT: build the set from grey boxes only (subject + environment, no modelling or texturing) and animate ONLY
the camera with Cam(...): its path, speed and timing as described. Static subjects. Add cam.handheld(...) only if the
description asks for handheld / shaky / documentary feel. The first frame must already show the opening composition,
because it is used as the start frame.""",
        "seedance": """@Video1 is a coarse-blockout reference. Use it only for the camera position, camera movement, speed, timing and spatial layout; do not adopt its grey blockout appearance, materials or empty set.
@Image1 is the start frame: it defines the look, characters, set and lighting of the shot.
<Describe the final shot: subject, setting, action, mood.>
Preserve the camera path, speed and timing from @Video1.""",
    },
    {
        "id": "character-blocking",
        "label": "Character & action blocking",
        "blurb": "Mannequin stand-ins walk, run, turn and stage the action while the camera follows or orbits. For dialogue, chases, ambushes, group shots.",
        "cases": [6, 8, 9, 21, 32, 39],
        "defaults": {"engine": "workbench"},
        "rules": BLOCKOUT_RULES + """
CHARACTER BLOCKING: every person is a Mannequin with its own PALETTE colour (say which colour is which character in a
comment). Use m.travel(...) for walking/running paths, m.turn(...) for turns, m.pose(...) for key actions (crouch,
point, raise arms, aim), and stage obstacles/cover as boxes. The camera follows (cam.follow), orbits (cam.orbit) or
tracks as described. Keep every figure fully in frame at its key moments.""",
        "seedance": """@Video1 is a coarse-blockout reference. Use it only for the action paths, character blocking, facing directions, camera position and camera movement; do not adopt its mannequin appearance, flat colours or empty set.
The <colour> mannequin in @Video1 corresponds to <Character A>. The <colour> mannequin corresponds to <Character B>.
@Image1 defines <Character A>'s appearance and clothing. @Image2 defines <Character B>'s appearance and clothing.
<Describe the scene and what the characters do.>
Preserve the blocking, movement paths, timing and camera movement from @Video1.""",
    },
    {
        "id": "marker-stage",
        "label": "Marker stage",
        "blurb": "A floor grid with lettered position markers and facing arrows, so Seedance inherits where each character stands and faces relative to the camera.",
        "cases": [36],
        "defaults": {"engine": "workbench"},
        "rules": BLOCKOUT_RULES + """
MARKER STAGE: add_floor(grid=True) and one add_marker(label, (x, y), facing_deg) per character position (letters A, B,
C...), facing arrows pointing where each character looks. Stand a Mannequin on each marker in the marker's facing
direction (same PALETTE colour as its marker). Camera framed so every marker and figure is readable; keep any camera
move slow.""",
        "seedance": """@Video1 is a coarse-blockout reference of the stage layout. Use it only for where each character stands and faces, the spatial relationships and the camera position and movement; do not adopt the grid floor, markers, letters or mannequins.
The figure on marker A in @Video1 corresponds to <Character A>; the figure on marker B corresponds to <Character B>.
<Describe the scene, setting and action.>
Preserve the positions, facing directions and camera movement from @Video1.""",
    },
    {
        "id": "proxy-layout",
        "label": "Simple proxy layout",
        "blurb": "People and props reduced to plain blocks so Seedance reads only the layout, not the appearance. Use when detailed 3D keeps leaking a CG look.",
        "cases": [41, 23, 26],
        "defaults": {"engine": "workbench"},
        "rules": BLOCKOUT_RULES + """
PROXY LAYOUT: no mannequins and no detail at all. Each person is a single upright box or cylinder of their height
(colour-coded from PALETTE, with a small DARK box on the front to show facing); props and furniture are single boxes.
Only positions, sizes and movement matter.""",
        "seedance": """@Video1 is a coarse-blockout reference. Use it only for the positions, sizes and movement of the subjects and the camera framing; do not adopt its block shapes, flat colours or empty set.
The <colour> block corresponds to <Subject A>; the <colour> block corresponds to <Subject B>.
<Describe the final scene in detail, including the speed and energy of the action.>
Preserve the layout and camera framing from @Video1.""",
    },
    {
        "id": "multi-cut",
        "label": "Multi-camera cuts",
        "blurb": "Several cameras with hard cuts on a planned schedule (wide, medium, close, overhead...). Plans cut timing for an action sequence in one take.",
        "cases": [38],
        "defaults": {"engine": "workbench"},
        "rules": BLOCKOUT_RULES + """
MULTI-CAMERA CUTS: create one Cam per shot (active=False except the first) and schedule hard cuts with cut_to(cam, frame)
at the requested times (spread evenly over the duration if no times are given). Each camera has a clearly different
framing (wide / medium / close / overhead / low angle). The subject action is continuous across the cuts. Keep the set
minimal: a height-reference block and the subjects.""",
        "seedance": """@Video1 is a coarse-blockout reference. Use it only for the cut timing, the framing of each shot and the subject positions; do not adopt its grey blockout appearance.
<Describe the action sequence and its setting.>
Keep a hard cut at each cut in @Video1, with the same framing order and timing.""",
    },
    {
        "id": "focus-pull",
        "label": "Focus / depth test",
        "blurb": "Near and far subjects with a keyframed focus pull or depth change, to test whether Seedance keeps the camera's depth behaviour.",
        "cases": [37],
        "defaults": {"engine": "eevee"},
        "rules": BLOCKOUT_RULES + """
FOCUS / DEPTH: place clear foreground, midground and background subjects at different distances from the camera and
animate depth of field with cam.focus(frame, distance, fstop) (fstop 1.2-2.0 so the blur is obvious), pulling focus
between them as described. Light with studio_lights().""",
        "seedance": """@Video1 is a coarse-blockout reference. Use it only for the camera position, the depth layout and the focus pull (which plane is sharp and when focus shifts); do not adopt its grey blockout appearance.
@Image1 defines <the subject's appearance>.
<Describe the shot.>
Preserve the shallow depth of field and the focus shift timing from @Video1.""",
    },
    {
        "id": "choreography",
        "label": "Mannequin choreography",
        "blurb": "A jointed mannequin dances or performs a move on the beat. Drives timing when prompt-only motion is too coarse; the start frame sets style and cloth.",
        "cases": [30, 35, 14],
        "defaults": {"engine": "workbench"},
        "rules": BLOCKOUT_RULES + """
CHOREOGRAPHY: one (or a few) Mannequin(s) performing the described moves with m.pose(...) key poses on a steady beat
(e.g. every 0.5 s = FPS // 2 frames), mixing arms, legs, bounce, spine twist and turns; travel only short distances.
Front or three-quarter camera with the whole body in frame, mostly static or a slow arc.""",
        "seedance": """@Video1 is a coarse-blockout reference. Use it only for the body movement, choreography timing and camera framing; do not adopt the mannequin, its proportions' blockout look or the empty set.
The mannequin in @Video1 corresponds to <the dancer/performer>. @Image1 defines their appearance, outfit and style.
<Describe the performance, setting and music/energy.>
Preserve the moves, beat timing and camera framing from @Video1; clothing and hair move naturally.""",
    },
    {
        "id": "clay-pass",
        "label": "Clay pass (restyle)",
        "blurb": "A neutral clay render of the scene and camera move. Seedance re-renders the same motion as any world or style (anime, realistic, stylised).",
        "cases": [5, 16, 17, 18],
        "defaults": {"engine": "workbench"},
        "rules": BLOCKOUT_RULES + """
CLAY PASS: model the scene's main shapes a little more completely than a grey box (buildings, furniture, vehicles as
recognisable simple forms) but give EVERYTHING the same light-grey clay material (LIGHT). Mannequins also use LIGHT.
The camera move is the point of the shot.""",
        "seedance": """@Video1 is a fine-blockout reference. Preserve its subject structure, actions, spatial layout, camera position and camera movement; do not adopt its grey clay material or blank background.
@Image1 defines the visual style and world.
Rerender the scene in @Video1 as <the final world and style>.
Preserve the structure, actions, camera work and spatial relationships from @Video1.""",
    },
]

WORKFLOW_BY_ID = {w["id"]: w for w in WORKFLOWS}

# Seedance hand-over reminders that apply to every reference, from the cases' lessons.
SEEDANCE_TIPS = [
    "Reference videos are copied quite literally: if the motion comes out robotic, use Keyframe + black frames (case 31).",
    "Reinforce the reference with prompt text: describe the action and energy you want, not only 'follow @Video1' (cases 25, 23).",
    "A start frame (@Image1) carries the look; the blockout carries camera and timing (cases 1, 2, 4). Use 'Start frame' below.",
    "Complex or detailed 3D scenes drift more; simplify to proxies when it does (cases 33, 41).",
]


def get(workflow_id: str) -> dict:
    return WORKFLOW_BY_ID.get(workflow_id or "scene") or WORKFLOW_BY_ID["scene"]


def public_list() -> list:
    return [{k: w[k] for k in ("id", "label", "blurb", "cases", "defaults", "seedance")} for w in WORKFLOWS]
