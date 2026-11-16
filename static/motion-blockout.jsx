/* motion-blockout.jsx — Motion Blockout: grey-box motion references for Seedance.
 *
 * Ported from CineForge's Motion Blockout app. Stage simple 3D primitives on
 * keyframed paths, move a camera through them, and export an MP4 — entirely in
 * the browser. The plate goes to Video Generation as a reference video
 * (window.sendBlenderClipToVideo, defined in frontend/app.jsx), where it pins down
 * blocking and camera motion that prompt text alone can't.
 *
 * Deliberately untextured: the flatter and greyer the plate, the more the prompt
 * drives the final look. Seedance reads layout from proxy blocks, so detailed
 * geometry mostly leaks CG artifacts into the generation.
 *
 * three.js renders the frames; MediaBunny (WebCodecs) encodes them to H.264.
 * Both load from esm.sh on first use. "Describe the shot" asks Seed LLM for the
 * scene JSON via /api/motion-blockout/generate. The scene is kept in
 * localStorage so it survives switching tools. Uses the app's own design classes.
 */
(function () {
  "use strict";
  const { useState, useEffect, useRef, useCallback } = React;

  const MBO_STORE_KEY = "cc_motion_blockout_v1";

  // ── Lazy module loaders ──────────────────────────────────────────────────────
  let _mboThree = null;
  function mboLoadThree() {
    if (_mboThree) return _mboThree;
    _mboThree = import("https://esm.sh/three@0.169.0").catch((e) => { _mboThree = null; throw e; });
    return _mboThree;
  }
  let _mboMB = null;
  function mboLoadMediaBunny() {
    if (_mboMB) return _mboMB;
    _mboMB = import("https://esm.sh/mediabunny@1.46.0").catch((e) => { _mboMB = null; throw e; });
    return _mboMB;
  }

  // ── Scene model ──────────────────────────────────────────────────────────────
  // Positions are [x, y, z] in Blender-ish terms with three.js's Y-up axis: x/z
  // are the ground plane, y is height.
  //
  // Each object carries a list of keyframes — { t, pos, rot, ease } — rather than
  // a single from→to pair. Two straight-line endpoints can't express the things
  // blockouts are actually for: an arc, a hold before an event, a fall that
  // accelerates, or a body pitching over backwards. Rotation is full XYZ Euler in
  // degrees, because most real falls are pitch or roll, not yaw.
  const MBO_SHAPES = ["box", "sphere", "cylinder", "cone", "capsule"];
  const MBO_EASES = ["linear", "in", "out", "inOut", "gravity"];

  let _mboSeq = 0;
  function mboNewId() { return `o${++_mboSeq}_${Math.random().toString(36).slice(2, 7)}`; }

  function mboKey(t, pos, rot, ease) { return { t, pos, rot: rot || [0, 0, 0], ease: ease || "linear" }; }

  function mboDefaultObjects() {
    return [
      { id: mboNewId(), name: "Block A", shape: "box", size: [1, 2, 1], color: "#b4b4b4",
        keys: [mboKey(0, [-7, 1, 0]), mboKey(1, [5, 1, 1])] },
      { id: mboNewId(), name: "Block B", shape: "box", size: [2, 1, 1.5], color: "#c8c8c8",
        keys: [mboKey(0, [3, 0.5, -5]), mboKey(1, [-2, 0.5, 3])] },
      { id: mboNewId(), name: "Pillar C", shape: "box", size: [0.6, 6, 0.6], color: "#a0a0a0",
        keys: [mboKey(0, [-5, 3, 6]), mboKey(1, [-5, 3, -1])] },
    ];
  }
  const MBO_DEFAULT_CAMERA = { from: [20, 11, -20], to: [16, 9, -16], target: [0, 1.5, 0], fov: 40 };

  // ── Sample builders ──────────────────────────────────────────────────────────
  // A few examples have too many keys to write out by hand. These build them.

  // Camera keys around a full circle. Linear segments between 8+ keys stay
  // close enough to the circle that the orbit reads as smooth.
  function mboOrbitKeys(radius, height, target, fov, steps = 12) {
    return Array.from({ length: steps + 1 }, (_, i) => {
      const a = (i / steps) * Math.PI * 2;
      return { t: i / steps, pos: [+(radius * Math.sin(a)).toFixed(3), height, +(radius * Math.cos(a)).toFixed(3)], target, fov, ease: "linear" };
    });
  }

  // One domino of a chain falling toward +x. It hinges on its +x bottom edge
  // (pivot) and holds until its turn. With a 0.7 gap it touches the next one at
  // about 25°, which is the moment that one starts to tip; it then follows the
  // next one down and settles leaning on it — or flat, for the last in line.
  function mboDomino(i, count, x0, gap, start, step) {
    const ts = start + i * step;
    const pos = [x0 + i * gap, 0.6, 0];
    const last = i === count - 1;
    const keys = [mboKey(0, pos, [0, 0, 0], "linear"), mboKey(ts, pos, [0, 0, 0], "gravity")];
    if (last) keys.push(mboKey(Math.min(1, ts + 0.12), pos, [0, 0, -90], "linear"));
    else keys.push(mboKey(ts + step, pos, [0, 0, -25], "in"), mboKey(Math.min(1, ts + step + 0.12), pos, [0, 0, -68], "linear"));
    keys.push(mboKey(1, pos, [0, 0, last ? -90 : -68]));
    return {
      name: `Domino ${i + 1}`, desc: i === 0 ? "Dominoes — each tips onto the next, left to right" : "Domino",
      shape: "box", size: [0.2, 1.2, 0.6], pivot: [0.1, -0.6, 0], color: i % 2 ? "#d9d4c7" : "#c9c3b4", keys,
    };
  }

  // A ball rolling off the top step, hopping down each stair, bouncing on the
  // floor and rolling out. Hops rise on "out" and fall on "gravity"; time is
  // shared out by weight so rolls take longer than hops, and the ball spins at
  // the rate it would roll.
  function mboStairBallKeys(heights, r) {
    const pts = [{ x: -0.4, y: heights[0] + r, ease: "linear", w: 0 }, { x: 0.3, y: heights[0] + r, ease: "out", w: 1.2 }];
    const hop = (x, y, h) => {
      const prev = pts[pts.length - 1];
      pts.push({ x: (prev.x + x) / 2, y: Math.max(prev.y, y) + h, ease: "gravity", w: 0.5 });
      pts.push({ x, y, ease: "out", w: 0.5 });
    };
    for (let k = 1; k < heights.length; k++) hop(k, heights[k] + r, 0.35);
    hop(heights.length + 0.4, r, 0.4);
    hop(heights.length + 1.3, r, 0.25);
    pts.push({ x: heights.length + 3.6, y: r, ease: "linear", w: 2 });
    const total = pts.reduce((a, p) => a + p.w, 0);
    let acc = 0;
    return pts.map((p) => {
      acc += p.w;
      const spin = -((p.x - pts[0].x) / r) * (180 / Math.PI);
      return mboKey(+(acc / total).toFixed(4), [+p.x.toFixed(3), +p.y.toFixed(3), 0], [0, 0, +spin.toFixed(1)], p.ease);
    });
  }

  // The stairs the ball goes down: one box per step, each resting on the floor.
  function mboStairs(heights) {
    return heights.map((h, k) => ({
      name: `Step ${k + 1}`, desc: k === 0 ? "Staircase (static), stepping down left to right" : "Step",
      shape: "box", size: [1, h, 3], pivot: [0, 0, 0], color: "#9c968c",
      keys: [mboKey(0, [k, h / 2, 0]), mboKey(1, [k, h / 2, 0])],
    }));
  }

  // Several parts that travel together (a helicopter's body, tail and rotor) —
  // one shared path, each part offset from it.
  function mboRide(path, offset, extraRot) {
    return path.map((k) => mboKey(k.t, [k.pos[0] + offset[0], k.pos[1] + offset[1], k.pos[2] + offset[2]], extraRot ? extraRot(k.t) : [0, 0, 0], k.ease));
  }

  const MBO_STAIR_HEIGHTS = [3, 2.5, 2, 1.5, 1, 0.5];
  const MBO_HELI_PATH = [
    { t: 0, pos: [0, 24, -14], ease: "out" },
    { t: 0.62, pos: [0, 4, 0], ease: "inOut" },
    { t: 0.86, pos: [0, 0.95, 0], ease: "linear" },
    { t: 1, pos: [0, 0.95, 0] },
  ];

  // ── Worked examples ──────────────────────────────────────────────────────────
  // These double as documentation: each one exercises the parts that make motion
  // read as physical — a pivot at the contact point, gravity easing on the fall,
  // rotation past 90°, and a settle after impact.
  const MBO_SAMPLES = [
    {
      id: "thrown-rider",
      label: "Rider thrown backwards off horse",
      about: "A horse runs left to right across frame. The red capsule is the cowboy: he rides for the first third, then is thrown backwards over the tail, arcing down and landing flat on his back while the horse runs on. The brown blocks are the horse's body, neck, head, legs and tail. Camera tracks right and drops toward the landing.",
      seconds: 4,
      // Horse runs +X. The rider pitches about the seat contact so the top of the
      // body swings toward -X (the tail) while the horse keeps going — so in world
      // space the rider is left behind rather than flung forward.
      camera: {
        shake: 0.05, fov: 45,
        from: [4, 3.5, 9], to: [10, 3, 9], target: [0, 2, 0],
        keys: [
          { t: 0, pos: [2, 3.5, 9], target: [-5, 2.2, 0], fov: 45, ease: "inOut" },
          { t: 0.55, pos: [6, 3.2, 8.5], target: [0, 2.2, 0], fov: 45, ease: "out" },
          { t: 1, pos: [9, 2.6, 8], target: [2.5, 0.8, 0], fov: 45 },
        ],
      },
      objects: [
        // Horse built from a few parts so it reads as an animal rather than a
        // block. Every part shares the same motion; only the offsets differ.
        { name: "Horse Body", desc: "Barrel of the horse — the main mass, running left to right", shape: "box", size: [2.4, 1.1, 0.85], pivot: [0, 0, 0], color: "#8a6a4a",
          keys: [mboKey(0, [-6, 1.35, 0], [0, 0, 0], "linear"), mboKey(1, [6, 1.35, 0])] },
        { name: "Horse Neck", desc: "Neck, angled up and forward from the chest", shape: "box", size: [0.45, 1.1, 0.5], pivot: [0, 0, 0], color: "#7d5f42",
          keys: [mboKey(0, [-4.95, 2.15, 0], [0, 0, -28], "linear"), mboKey(1, [7.05, 2.15, 0], [0, 0, -28])] },
        { name: "Horse Head", desc: "Head — marks which way the horse faces (+X)", shape: "box", size: [0.75, 0.38, 0.34], pivot: [0, 0, 0], color: "#7d5f42",
          keys: [mboKey(0, [-4.35, 2.6, 0], [0, 0, -12], "linear"), mboKey(1, [7.65, 2.6, 0], [0, 0, -12])] },
        { name: "Horse Legs Front", desc: "Front legs", shape: "box", size: [0.28, 1.5, 0.7], pivot: [0, 0, 0], color: "#6f5539",
          keys: [mboKey(0, [-5.1, 0.75, 0], [0, 0, 12], "linear"), mboKey(1, [6.9, 0.75, 0], [0, 0, -12])] },
        { name: "Horse Legs Rear", desc: "Hind legs", shape: "box", size: [0.28, 1.5, 0.7], pivot: [0, 0, 0], color: "#6f5539",
          keys: [mboKey(0, [-6.9, 0.75, 0], [0, 0, -12], "linear"), mboKey(1, [5.1, 0.75, 0], [0, 0, 12])] },
        { name: "Horse Tail", desc: "Tail — the rider is thrown back past this end", shape: "box", size: [0.5, 0.7, 0.2], pivot: [0, 0, 0], color: "#6f5539",
          keys: [mboKey(0, [-7.2, 1.5, 0], [0, 0, 32], "linear"), mboKey(1, [4.8, 1.5, 0], [0, 0, 32])] },
        // Airborne bodies rotate about their CENTRE of mass, not their feet —
        // hinging a thrown rider about its base drives the mesh through the floor
        // once it passes 90°. Pivot stays [0,0,0] and the arc is keyed directly.
        // One piece, no separate head or hat — a detached prop tumbling alongside
        // the body reads as the rider coming apart rather than being thrown.
        { name: "Rider", desc: "The cowboy (red). Sits on the horse, is thrown backwards, lands flat", shape: "capsule", size: [0.6, 1.8, 0.6], pivot: [0, 0, 0], color: "#c04a3a",
          keys: [
            mboKey(0, [-6, 2.75, 0], [0, 0, 0], "linear"),
            mboKey(0.35, [-1.8, 2.75, 0], [0, 0, 10], "gravity"),
            mboKey(0.60, [-1.4, 2.1, 0], [0, 0, 42], "gravity"),
            mboKey(0.82, [-0.4, 0.75, 0], [0, 0, 78], "out"),
            mboKey(1, [0.1, 0.35, 0], [0, 0, 92]),
          ] },
        { name: "Fence Post A", desc: "Static fence post — a fixed marker so the camera move is readable", shape: "cylinder", size: [0.3, 1.6, 0.3], pivot: [0, 0, 0], color: "#6f5b45",
          keys: [mboKey(0, [3, 0.8, -6]), mboKey(1, [3, 0.8, -6])] },
        { name: "Fence Post B", desc: "Static fence post", shape: "cylinder", size: [0.3, 1.6, 0.3], pivot: [0, 0, 0], color: "#6f5b45",
          keys: [mboKey(0, [-3, 0.8, -6]), mboKey(1, [-3, 0.8, -6])] },
        { name: "Ranch Hand", desc: "Bystander (blue), turns to watch as the rider goes down", shape: "capsule", size: [0.55, 1.75, 0.55], pivot: [0, 0, 0], color: "#4a6ea8",
          keys: [mboKey(0, [7, 0.88, -5], [0, 0, 0], "linear"), mboKey(1, [6.2, 0.88, -4.4], [0, -20, 0])] },
      ],
    },
    {
      id: "tower-topple",
      label: "Tower topples into the street",
      about: "A 14m stone tower (pale grey, with a blue-grey cone spire) hinges on its base edge and falls flat across the street. The tan and blue boxes are a van and a car fleeing the collapse; the red mass is a crowd of onlookers scattering. The other grey-brown boxes are neighbouring buildings. Camera cranes up and back as it goes.",
      seconds: 5,
      camera: {
        shake: 0.18, fov: 50,
        from: [22, 4, 24], to: [18, 12, 20], target: [0, 6, 0],
        keys: [
          { t: 0, pos: [22, 3, 24], target: [0, 6, 0], fov: 50, ease: "in" },
          { t: 0.6, pos: [20, 9, 22], target: [0, 7, 0], fov: 50, ease: "out" },
          { t: 1, pos: [17, 13, 19], target: [4, 2, 0], fov: 50 },
        ],
      },
      objects: [
        // A toppling tower stays in contact, so it DOES hinge — but about its base
        // EDGE, not the centre of its base. Pivot x = -halfWidth puts the hinge on
        // the leading edge, so at 90° it lies flat exactly on the ground.
        { name: "Tower", desc: "The collapsing stone tower — hinges on its base edge, lands flat", shape: "box", size: [3, 14, 3], pivot: [-1.5, -7, 0], color: "#b9b2a6",
          keys: [
            mboKey(0, [0, 7, 0], [0, 0, 0], "linear"),
            mboKey(0.25, [0, 7, 0], [0, 0, 4], "gravity"),
            mboKey(0.85, [0, 7, 0], [0, 0, 84], "out"),
            mboKey(1, [0, 7, 0], [0, 0, 90]),
          ] },
        { name: "Spire", desc: "Cone spire on top of the tower — falls with it", shape: "cone", size: [2.4, 3, 2.4], pivot: [-1.5, -8.5, 0], color: "#8f9aa8",
          keys: [
            mboKey(0, [0, 15.5, 0], [0, 0, 0], "linear"),
            mboKey(0.25, [0, 15.5, 0], [0, 0, 4], "gravity"),
            mboKey(0.85, [0, 15.5, 0], [0, 0, 84], "out"),
            mboKey(1, [0, 15.5, 0], [0, 0, 90]),
          ] },
        { name: "Low Block", desc: "Neighbouring building (static)", shape: "box", size: [6, 2, 5], pivot: [0, 0, 0], color: "#9a9488",
          keys: [mboKey(0, [12, 1, 2]), mboKey(1, [12, 1, 2])] },
        { name: "Terrace", desc: "Neighbouring building (static)", shape: "box", size: [8, 4, 6], pivot: [0, 0, 0], color: "#a8a196",
          keys: [mboKey(0, [-13, 2, -4]), mboKey(1, [-13, 2, -4])] },
        { name: "Fleeing Van", desc: "Van (ochre) accelerating away from the collapse", shape: "box", size: [4.5, 1.8, 2], pivot: [0, 0, 0], color: "#d8b64a",
          keys: [mboKey(0, [-4, 0.9, 9], [0, 0, 0], "in"), mboKey(1, [16, 0.9, 9])] },
        { name: "Fleeing Car", desc: "Car (blue) accelerating away", shape: "box", size: [4, 1.4, 1.9], pivot: [0, 0, 0], color: "#4a7fb8",
          keys: [mboKey(0, [-12, 0.7, 12], [0, 0, 0], "in"), mboKey(1, [10, 0.7, 12])] },
        // Onlookers scattering from the base.
        { name: "Crowd", desc: "220 onlookers scattering away from the tower base", shape: "capsule", size: [0.5, 1.7, 0.5], pivot: [0, 0, 0], color: "#c9584f",
          crowd: { count: 220, area: [26, 10], bob: 0.16, stride: 40, lag: 0.1,
            colors: ["#c9584f", "#b0705a", "#9c5a66", "#d08a72", "#8f5a52"] },
          keys: [mboKey(0, [-2, 0.85, 16], [0, 0, 0], "in"), mboKey(1, [-6, 0.85, 30])] },
      ],
    },
    {
      id: "charge-the-mountain",
      label: "1000s of soldiers charge the mountain (top-down)",
      about: "Seen from the mountain peak looking down over the plain. The red mass (2200 figures) is the vanguard charging toward you; the blue mass (1400) is a second wave held back and to the left. The brown blocks on the right flank are cavalry (260), the tall yellow poles are banners, and the large brown box is a siege tower. The three grey cones are the mountain and two ridges behind the camera position.",
      seconds: 6,
      // Camera sits on the peak looking down and out across the plain, so the
      // army reads as a mass moving toward you.
      camera: {
        shake: 0.07, fov: 55,
        from: [0, 34, -38], to: [0, 30, -44], target: [0, 0, 20],
        keys: [
          { t: 0, pos: [0, 36, -34], target: [0, 1, 34], fov: 55, ease: "inOut" },
          { t: 0.5, pos: [0, 33, -40], target: [0, 1, 18], fov: 55, ease: "linear" },
          { t: 1, pos: [0, 29, -46], target: [0, 1, 2], fov: 55 },
        ],
      },
      objects: [
        { name: "Mountain", desc: "The mountain the army is charging — camera sits on its peak", shape: "cone", size: [70, 30, 70], pivot: [0, 0, 0], color: "#6e6a63",
          keys: [mboKey(0, [0, 15, -60]), mboKey(1, [0, 15, -60])] },
        { name: "Ridge Left", desc: "Background ridge", shape: "cone", size: [40, 18, 40], pivot: [0, 0, 0], color: "#7a756d",
          keys: [mboKey(0, [-46, 9, -52]), mboKey(1, [-46, 9, -52])] },
        { name: "Ridge Right", desc: "Background ridge", shape: "cone", size: [46, 20, 46], pivot: [0, 0, 0], color: "#767068",
          keys: [mboKey(0, [48, 10, -50]), mboKey(1, [48, 10, -50])] },
        // The main body: 2200 instanced figures closing on the slope.
        { name: "Vanguard", desc: "2200 soldiers, red army — the main charge, closest to camera", shape: "capsule", size: [0.5, 1.7, 0.5], pivot: [0, 0, 0], color: "#b23a34",
          crowd: { count: 2200, area: [84, 26], bob: 0.2, stride: 44, lag: 0.14,
            // Mixed tones within the faction: a uniform block reads as one flat shape.
            colors: ["#b23a34", "#9c332e", "#c4544a", "#8e2f2a", "#a84a3e", "#7d4038"] },
          keys: [mboKey(0, [0, 0.85, 52], [0, 0, 0], "linear"), mboKey(1, [0, 0.85, -14])] },
        // A second wave, held back and off to one side, in a different colour so
        // the two formations stay legible where they overlap.
        { name: "Second Wave", desc: "1400 soldiers, blue army — second wave, held back and to the left", shape: "capsule", size: [0.5, 1.7, 0.5], pivot: [0, 0, 0], color: "#2f5f9e",
          crowd: { count: 1400, area: [60, 20], bob: 0.18, stride: 38, lag: 0.16,
            colors: ["#2f5f9e", "#27508a", "#4272ad", "#1f4478", "#3a6796", "#365e80"] },
          keys: [mboKey(0, [-14, 0.85, 88], [0, 0, 0], "linear"), mboKey(1, [-10, 0.85, 20])] },
        { name: "Flank Cavalry", desc: "260 mounted riders sweeping in on the right flank", shape: "box", size: [2.2, 1.6, 0.8], pivot: [0, 0, 0], color: "#7a4a2a",
          crowd: { count: 260, area: [22, 14], bob: 0.26, stride: 30, lag: 0.12,
            colors: ["#7a4a2a", "#8c5a33", "#6b4025", "#94663d"] },
          keys: [mboKey(0, [42, 0.8, 74], [0, 0, 0], "in"), mboKey(1, [24, 0.8, -6])] },
        { name: "Banner A", desc: "Tall banner pole carried with the red vanguard", shape: "box", size: [0.18, 5.5, 0.18], pivot: [0, 0, 0], color: "#e0c341",
          keys: [mboKey(0, [-6, 2.75, 50], [0, 0, -6], "linear"), mboKey(1, [-6, 2.75, -16], [0, 0, 6])] },
        { name: "Banner B", desc: "Second banner pole", shape: "box", size: [0.18, 5.5, 0.18], pivot: [0, 0, 0], color: "#e0c341",
          keys: [mboKey(0, [9, 2.75, 56], [0, 0, 5], "linear"), mboKey(1, [9, 2.75, -10], [0, 0, -5])] },
        { name: "Siege Tower", desc: "Wheeled siege tower advancing with the army", shape: "box", size: [4, 9, 4], pivot: [0, 0, 0], color: "#8c6b45",
          keys: [mboKey(0, [18, 4.5, 68], [0, 0, 0], "linear"), mboKey(1, [16, 4.5, 12])] },
      ],
    },
    {
      id: "train-ride",
      label: "Camera rides alongside a moving train",
      about: "The camera is rigged to the train and rides beside it, so the carriage stays locked in frame while the desert streaks past behind. The long cream slab is the carriage side; the blue panel is the open doorway with a figure (red) leaning out of it; the brown block galloping alongside is a horse and rider. Telegraph poles flick past to sell the speed. Deliberately crude — the plate only supplies camera path and blocking.",
      seconds: 5,
      camera: {
        shake: 0.09, fov: 42,
        from: [0, 2.4, 9], to: [0, 2.4, 9], target: [0, 2, 0],
        // Rigged to the carriage: the keyed positions below are offsets layered
        // on top of the ride, so the camera drifts back and down while travelling.
        follow: { object: "Carriage", offset: [0, 2.4, 9], targetObject: "Doorway", targetOffset: [0, 0, 0] },
        keys: [
          { t: 0, pos: [4, 0.4, 1.5], fov: 42, target: [0, 0, 0], ease: "inOut" },
          { t: 1, pos: [-3, -0.2, -1], fov: 46, target: [0, 0, 0] },
        ],
      },
      objects: [
        { name: "Carriage", desc: "Train carriage side — the long cream slab the camera rides beside", shape: "box", size: [26, 4.2, 3], pivot: [0, 0, 0], color: "#cfc4b4",
          keys: [mboKey(0, [-30, 2.6, 0], [0, 0, 0], "linear"), mboKey(1, [70, 2.6, 0])] },
        { name: "Doorway", desc: "Open door panel (blue) — the frame the figure leans out of", shape: "box", size: [2.6, 3, 0.2], pivot: [0, 0, 0], color: "#4f7fc4",
          keys: [mboKey(0, [-24, 2.5, 1.6], [0, 0, 0], "linear"), mboKey(1, [76, 2.5, 1.6])] },
        { name: "Leaning Figure", desc: "Figure (red) leaning out of the doorway, swinging further out as the shot runs", shape: "capsule", size: [0.6, 1.8, 0.6], pivot: [0, 0, 0], color: "#c04a3a",
          keys: [
            mboKey(0, [-24, 2.6, 2.1], [0, 0, -14], "inOut"),
            mboKey(0.6, [22, 2.5, 2.7], [0, 0, -34], "out"),
            mboKey(1, [76, 2.5, 2.9], [0, 0, -42]),
          ] },
        { name: "Chase Horse", desc: "Horse and rider (brown) galloping alongside the carriage", shape: "box", size: [2.4, 1.7, 0.85], pivot: [0, 0, 0], color: "#8a6a4a",
          keys: [mboKey(0, [-34, 0.9, 6], [0, 0, 0], "linear"), mboKey(1, [68, 0.9, 5.2])] },
        { name: "Rails", desc: "Track bed running the length of the shot (static)", shape: "box", size: [400, 0.3, 4.4], pivot: [0, 0, 0], color: "#8f8378",
          keys: [mboKey(0, [0, 0.15, 0]), mboKey(1, [0, 0.15, 0])] },
        { name: "Poles", desc: "40 telegraph poles flicking past — these are what read as speed", shape: "box", size: [0.25, 7, 0.25], pivot: [0, 0, 0], color: "#6f5b45",
          crowd: { count: 40, area: [380, 0.5], bob: 0, stride: 0, lag: 0,
            colors: ["#6f5b45", "#7a6650", "#65523e"] },
          keys: [mboKey(0, [0, 3.5, -9]), mboKey(1, [0, 3.5, -9])] },
      ],
    },
    {
      id: "whip-pass",
      label: "Car passes camera, whip pan to building",
      about: "A locked-off camera watches a pale car (the flat box) tear past left to right at speed. Just as it clears frame, the camera whips right and up to land on the grey tower block in the distance. The thin cylinder is a street lamp, there only to give the whip something to blur past. Nothing else moves.",
      seconds: 4,
      camera: {
        shake: 0.04, fov: 38,
        from: [0, 2.2, 14], to: [0, 2.2, 14], target: [0, 1.5, 0],
        keys: [
          // Camera holds position; only the target whips, which reads as a pan.
          { t: 0, pos: [0, 2.2, 14], target: [-14, 1.2, 0], fov: 38, ease: "linear" },
          { t: 0.45, pos: [0, 2.2, 14], target: [0, 1.2, 0], fov: 38, ease: "in" },
          { t: 0.7, pos: [0, 2.4, 14], target: [10, 3, -6], fov: 38, ease: "out" },
          { t: 1, pos: [0, 2.6, 13], target: [12, 5, -10], fov: 38 },
        ],
      },
      objects: [
        { name: "Car", desc: "The car — crosses frame left to right at constant speed", shape: "box", size: [4.5, 1.4, 2], pivot: [0, 0, 0], color: "#cccccc",
          keys: [mboKey(0, [-22, 0.7, 0], [0, 0, 0], "linear"), mboKey(1, [22, 0.7, 0])] },
        { name: "Building", desc: "Tower block the camera whips onto at the end (static)", shape: "box", size: [10, 16, 10], pivot: [0, 0, 0], color: "#a0a0a0",
          keys: [mboKey(0, [14, 8, -12]), mboKey(1, [14, 8, -12])] },
        { name: "Street Lamp", desc: "Foreground street lamp — gives the whip pan something to streak past", shape: "cylinder", size: [0.3, 6, 0.3], pivot: [0, 0, 0], color: "#8f8f8f",
          keys: [mboKey(0, [4, 3, -3]), mboKey(1, [4, 3, -3])] },
      ],
    },
    {
      id: "two-shot-push",
      label: "Slow push-in on a two-person conversation",
      about: "Two people stand facing each other across a small table — red on the left, blue on the right — in front of a grey back wall. Nobody moves; the camera dollies straight in from a wide two-shot to a tighter one at table height. The classic dialogue-scene opener.",
      seconds: 6,
      camera: {
        shake: 0.02, fov: 40,
        from: [0, 1.6, 8], to: [0, 1.5, 3.6], target: [0, 1.2, 0],
        keys: [
          { t: 0, pos: [0, 1.6, 8], target: [0, 1.2, 0], fov: 40, ease: "inOut" },
          { t: 1, pos: [0, 1.45, 3.6], target: [0, 1.25, 0], fov: 40 },
        ],
      },
      objects: [
        { name: "Table", desc: "Small table between them", shape: "box", size: [1.6, 0.75, 0.9], pivot: [0, 0, 0], color: "#8f7a62",
          keys: [mboKey(0, [0, 0.375, 0]), mboKey(1, [0, 0.375, 0])] },
        { name: "Person A", desc: "Speaker on the left (red), leans in slightly", shape: "capsule", size: [0.55, 1.75, 0.55], pivot: [0, -0.875, 0], color: "#c04a3a",
          keys: [mboKey(0, [-1.1, 0.875, 0], [0, 0, 0], "inOut"), mboKey(1, [-1.1, 0.875, 0], [0, 0, -5])] },
        { name: "Person B", desc: "Listener on the right (blue)", shape: "capsule", size: [0.55, 1.75, 0.55], pivot: [0, -0.875, 0], color: "#4a6ea8",
          keys: [mboKey(0, [1.1, 0.875, 0]), mboKey(1, [1.1, 0.875, 0])] },
        { name: "Back Wall", desc: "Wall behind them (static)", shape: "box", size: [12, 4, 0.3], pivot: [0, 0, 0], color: "#9a9a9a",
          keys: [mboKey(0, [0, 2, -3]), mboKey(1, [0, 2, -3])] },
      ],
    },
    {
      id: "hero-orbit",
      label: "360° orbit around a hero on a plinth",
      about: "A single figure (red) stands still on a low round plinth in a grey hall with four tall pillars. The camera makes one full circle around them at chest height, constant speed, always looking at the figure. The pillars pass behind as reference so the orbit reads.",
      seconds: 8,
      camera: {
        shake: 0, fov: 42,
        from: [0, 2.2, 7], to: [0, 2.2, 7], target: [0, 1.4, 0],
        keys: mboOrbitKeys(7, 2.2, [0, 1.4, 0], 42),
      },
      objects: [
        { name: "Plinth", desc: "Low round plinth (static)", shape: "cylinder", size: [3, 0.4, 3], pivot: [0, 0, 0], color: "#a8a39a",
          keys: [mboKey(0, [0, 0.2, 0]), mboKey(1, [0, 0.2, 0])] },
        { name: "Hero", desc: "The hero (red), standing still, the centre of the orbit", shape: "capsule", size: [0.6, 1.8, 0.6], pivot: [0, 0, 0], color: "#c04a3a",
          keys: [mboKey(0, [0, 1.3, 0]), mboKey(1, [0, 1.3, 0])] },
        { name: "Pillar NE", desc: "Pillars at the four corners — fixed markers", shape: "box", size: [0.8, 6, 0.8], pivot: [0, 0, 0], color: "#8f8f8f",
          keys: [mboKey(0, [6, 3, -6]), mboKey(1, [6, 3, -6])] },
        { name: "Pillar NW", desc: "Pillar", shape: "box", size: [0.8, 6, 0.8], pivot: [0, 0, 0], color: "#8f8f8f",
          keys: [mboKey(0, [-6, 3, -6]), mboKey(1, [-6, 3, -6])] },
        { name: "Pillar SE", desc: "Pillar", shape: "box", size: [0.8, 6, 0.8], pivot: [0, 0, 0], color: "#8f8f8f",
          keys: [mboKey(0, [6, 3, 6]), mboKey(1, [6, 3, 6])] },
        { name: "Pillar SW", desc: "Pillar", shape: "box", size: [0.8, 6, 0.8], pivot: [0, 0, 0], color: "#8f8f8f",
          keys: [mboKey(0, [-6, 3, 6]), mboKey(1, [-6, 3, 6])] },
      ],
    },
    {
      id: "crane-reveal-street",
      label: "Crane up from a walker to reveal the street",
      about: "A figure (red) walks away from camera up the middle of a grey city street lined with blocky buildings. The camera starts low behind them at walking height, then cranes up and back, tilting down to reveal the whole street.",
      seconds: 6,
      camera: {
        shake: 0.01, fov: 45,
        from: [0, 1, 9], to: [0, 16, 16], target: [0, 1.2, 0],
        keys: [
          { t: 0, pos: [0, 1.1, 9], target: [0, 1.2, 0], fov: 45, ease: "inOut" },
          { t: 1, pos: [0, 16, 16], target: [0, 0, -18], fov: 45 },
        ],
      },
      objects: [
        { name: "Walker", desc: "Figure (red) walking away up the street", shape: "capsule", size: [0.55, 1.75, 0.55], pivot: [0, 0, 0], color: "#c04a3a",
          keys: [mboKey(0, [0, 0.875, 4], [0, 0, 0], "linear"), mboKey(1, [0, 0.875, -3])] },
        { name: "Left Block 1", desc: "Buildings on both sides of the street (static)", shape: "box", size: [6, 8, 8], pivot: [0, 0, 0], color: "#9d978d",
          keys: [mboKey(0, [-7, 4, -5]), mboKey(1, [-7, 4, -5])] },
        { name: "Left Block 2", desc: "Building", shape: "box", size: [6, 14, 8], pivot: [0, 0, 0], color: "#a6a097",
          keys: [mboKey(0, [-7, 7, -15]), mboKey(1, [-7, 7, -15])] },
        { name: "Left Block 3", desc: "Building", shape: "box", size: [6, 6, 8], pivot: [0, 0, 0], color: "#958f86",
          keys: [mboKey(0, [-7, 3, -25]), mboKey(1, [-7, 3, -25])] },
        { name: "Right Block 1", desc: "Building", shape: "box", size: [6, 12, 8], pivot: [0, 0, 0], color: "#a39d93",
          keys: [mboKey(0, [7, 6, -5]), mboKey(1, [7, 6, -5])] },
        { name: "Right Block 2", desc: "Building", shape: "box", size: [6, 7, 8], pivot: [0, 0, 0], color: "#9a948a",
          keys: [mboKey(0, [7, 3.5, -15]), mboKey(1, [7, 3.5, -15])] },
        { name: "Right Block 3", desc: "Building", shape: "box", size: [6, 16, 8], pivot: [0, 0, 0], color: "#aaa49a",
          keys: [mboKey(0, [7, 8, -25]), mboKey(1, [7, 8, -25])] },
        { name: "Far Tower", desc: "Tall tower closing the end of the street", shape: "box", size: [10, 22, 6], pivot: [0, 0, 0], color: "#8e8f96",
          keys: [mboKey(0, [0, 11, -40]), mboKey(1, [0, 11, -40])] },
      ],
    },
    {
      id: "runner-tracking",
      label: "Side tracking shot of a runner along a wall",
      about: "A runner (red) sprints left to right along a long wall with regular pillars. The camera is rigged alongside at a fixed distance, so the runner stays in frame while the pillars stream past behind; it drifts slightly ahead by the end.",
      seconds: 5,
      camera: {
        shake: 0.06, fov: 45,
        from: [0, 1.6, 7], to: [0, 1.6, 7], target: [0, 1, 0],
        follow: { object: "Runner", offset: [0, 0.7, 7], targetObject: "Runner", targetOffset: [0, 0.2, 0] },
        keys: [
          { t: 0, pos: [-2, 0, 0], target: [0, 0, 0], fov: 45, ease: "inOut" },
          { t: 1, pos: [2, 0, -1.5], target: [0, 0, 0], fov: 45 },
        ],
      },
      objects: [
        { name: "Runner", desc: "The runner (red), leaning into a sprint", shape: "capsule", size: [0.55, 1.8, 0.55], pivot: [0, 0, 0], color: "#c04a3a",
          keys: [mboKey(0, [-20, 0.9, 0], [0, 0, -10], "linear"), mboKey(1, [20, 0.9, 0], [0, 0, -10])] },
        { name: "Wall", desc: "Long wall behind the runner (static)", shape: "box", size: [70, 3, 0.4], pivot: [0, 0, 0], color: "#a29c91",
          keys: [mboKey(0, [0, 1.5, -3]), mboKey(1, [0, 1.5, -3])] },
        { name: "Pillars", desc: "16 pillars along the wall — these stream past to sell the speed", shape: "box", size: [0.6, 3.4, 0.6], pivot: [0, 0, 0], color: "#7f7a72",
          crowd: { count: 16, area: [64, 0.1], bob: 0, stride: 0, lag: 0, colors: ["#7f7a72", "#878177", "#77726a"] },
          keys: [mboKey(0, [0, 1.7, -2.6]), mboKey(1, [0, 1.7, -2.6])] },
      ],
    },
    {
      id: "car-chase",
      label: "Car chase weaving through traffic",
      about: "On a wide road, the lead car (yellow) weaves between lanes away from camera with a pursuer (blue) close behind, copying its line. Four grey cars in the outer lanes are slower traffic being overtaken. The camera rides behind the lead car, low and close, drifting to one side.",
      seconds: 6,
      camera: {
        shake: 0.12, fov: 50,
        from: [0, 3, 30], to: [0, 3, -70], target: [0, 0.7, 0],
        follow: { object: "Lead Car", offset: [0, 2.6, 11], targetObject: "Lead Car", targetOffset: [0, 0.6, -8] },
        keys: [
          { t: 0, pos: [0, 0, 0], target: [0, 0, 0], fov: 50, ease: "inOut" },
          { t: 1, pos: [-3, -0.8, 2], target: [0, 0, 0], fov: 50 },
        ],
      },
      objects: [
        { name: "Road", desc: "Long road surface (static)", shape: "box", size: [16, 0.1, 220], pivot: [0, 0, 0], color: "#55565a",
          keys: [mboKey(0, [0, 0.05, -60]), mboKey(1, [0, 0.05, -60])] },
        { name: "Lead Car", desc: "The car being chased (yellow), weaving lanes", shape: "box", size: [2, 1.4, 4.4], pivot: [0, 0, 0], color: "#d8b64a",
          keys: [mboKey(0, [0, 0.8, 20], [0, 0, 0], "inOut"), mboKey(0.3, [1.6, 0.8, -12], [0, -8, 0], "inOut"), mboKey(0.6, [-1.6, 0.8, -44], [0, 8, 0], "inOut"), mboKey(1, [0.8, 0.8, -86], [0, 0, 0])] },
        { name: "Pursuer", desc: "Chasing car (blue), one beat behind on the same line", shape: "box", size: [2, 1.4, 4.4], pivot: [0, 0, 0], color: "#4a7fb8",
          keys: [mboKey(0, [0, 0.8, 30], [0, 0, 0], "inOut"), mboKey(0.36, [1.6, 0.8, -6], [0, -8, 0], "inOut"), mboKey(0.66, [-1.6, 0.8, -36], [0, 8, 0], "inOut"), mboKey(1, [0.6, 0.8, -74], [0, 0, 0])] },
        { name: "Traffic A", desc: "Slower traffic in the outer lanes (grey)", shape: "box", size: [2, 1.4, 4.4], pivot: [0, 0, 0], color: "#9c9c9c",
          keys: [mboKey(0, [-5, 0.8, 0], [0, 0, 0], "linear"), mboKey(1, [-5, 0.8, -30])] },
        { name: "Traffic B", desc: "Traffic", shape: "box", size: [2, 1.4, 4.4], pivot: [0, 0, 0], color: "#8c8c8c",
          keys: [mboKey(0, [5, 0.8, -18], [0, 0, 0], "linear"), mboKey(1, [5, 0.8, -46])] },
        { name: "Traffic C", desc: "Traffic", shape: "box", size: [2, 1.4, 4.4], pivot: [0, 0, 0], color: "#a8a8a8",
          keys: [mboKey(0, [-5, 0.8, -40], [0, 0, 0], "linear"), mboKey(1, [-5, 0.8, -66])] },
        { name: "Traffic D", desc: "Traffic", shape: "box", size: [2, 1.4, 4.4], pivot: [0, 0, 0], color: "#949494",
          keys: [mboKey(0, [5, 0.8, -60], [0, 0, 0], "linear"), mboKey(1, [5, 0.8, -88])] },
      ],
    },
    {
      id: "domino-chain",
      label: "Domino chain topples, triggered by a rolling ball",
      about: "A small ball (red) rolls in from the left and knocks the first of eight dominoes; each one tips onto the next until the last falls flat. Low, close camera tracking along the line from left to right.",
      seconds: 5,
      camera: {
        shake: 0, fov: 38,
        from: [-4, 1.2, 4], to: [3.5, 1.5, 4], target: [-2, 0.4, 0],
        keys: [
          { t: 0, pos: [-4, 1.1, 4], target: [-2.2, 0.4, 0], fov: 38, ease: "inOut" },
          { t: 1, pos: [3.4, 1.5, 4.2], target: [2.6, 0.3, 0], fov: 38 },
        ],
      },
      objects: [
        { name: "Ball", desc: "The ball (red) that starts the chain", shape: "sphere", size: [0.4, 0.4, 0.4], pivot: [0, 0, 0], color: "#c04a3a",
          keys: [mboKey(0, [-5.5, 0.2, 0], [0, 0, 0], "linear"), mboKey(0.1, [-3.1, 0.2, 0], [0, 0, -688]), mboKey(1, [-3.1, 0.2, 0], [0, 0, -688])] },
      ].concat(Array.from({ length: 8 }, (_, i) => mboDomino(i, 8, -2.8, 0.7, 0.1, 0.1))),
    },
    {
      id: "door-burst",
      label: "Door bursts open and a figure strides through",
      about: "A grey wall with a doorway faces the camera. After a beat the door (blue) is kicked open, swinging hard on its left hinge toward camera; the figure (red) behind it strides through and toward the lens. The camera holds, then eases in.",
      seconds: 5,
      camera: {
        shake: 0.03, fov: 40,
        from: [3, 1.6, 8], to: [1.6, 1.5, 5.5], target: [0, 1.3, 0],
        keys: [
          { t: 0, pos: [3, 1.6, 8], target: [0, 1.3, 0], fov: 40, ease: "linear" },
          { t: 0.35, pos: [3, 1.6, 8], target: [0, 1.3, 0], fov: 40, ease: "inOut" },
          { t: 1, pos: [1.6, 1.5, 5.6], target: [0.3, 1.2, 1], fov: 40 },
        ],
      },
      objects: [
        { name: "Wall Left", desc: "Wall either side of the doorway (static)", shape: "box", size: [5, 3, 0.3], pivot: [0, 0, 0], color: "#a09a90",
          keys: [mboKey(0, [-3.5, 1.5, 0]), mboKey(1, [-3.5, 1.5, 0])] },
        { name: "Wall Right", desc: "Wall", shape: "box", size: [5, 3, 0.3], pivot: [0, 0, 0], color: "#a09a90",
          keys: [mboKey(0, [3.5, 1.5, 0]), mboKey(1, [3.5, 1.5, 0])] },
        { name: "Lintel", desc: "Wall above the doorway", shape: "box", size: [2, 0.6, 0.3], pivot: [0, 0, 0], color: "#a09a90",
          keys: [mboKey(0, [0, 2.7, 0]), mboKey(1, [0, 2.7, 0])] },
        { name: "Door", desc: "The door (blue) — hinged on its left edge, slams open toward camera", shape: "box", size: [1.9, 2.4, 0.1], pivot: [-0.95, 0, 0], color: "#4f7fc4",
          keys: [mboKey(0, [0, 1.2, 0.1], [0, 0, 0], "linear"), mboKey(0.3, [0, 1.2, 0.1], [0, 0, 0], "out"), mboKey(0.42, [0, 1.2, 0.1], [0, -112, 0], "inOut"), mboKey(0.56, [0, 1.2, 0.1], [0, -96, 0]), mboKey(1, [0, 1.2, 0.1], [0, -96, 0])] },
        { name: "Intruder", desc: "Figure (red) who kicks the door and strides through", shape: "capsule", size: [0.6, 1.8, 0.6], pivot: [0, 0, 0], color: "#c04a3a",
          keys: [mboKey(0, [0.1, 0.9, -1.6], [0, 0, 0], "linear"), mboKey(0.3, [0.1, 0.9, -1.4], [0, 0, 0], "inOut"), mboKey(1, [0.4, 0.9, 3.2])] },
      ],
    },
    {
      id: "ball-down-stairs",
      label: "Ball bounces down a staircase",
      about: "A ball (red) rolls off the top step of a six-step staircase, hops down each step, bounces twice on the floor and rolls away to the right. Side-on camera pans with it, so the stairs read in profile.",
      seconds: 5,
      camera: {
        shake: 0, fov: 40,
        from: [1, 3.2, 11], to: [6, 1.6, 10], target: [0.5, 2.6, 0],
        keys: [
          { t: 0, pos: [1, 3.4, 11], target: [0.5, 2.8, 0], fov: 40, ease: "inOut" },
          { t: 1, pos: [6.5, 1.6, 10], target: [7, 0.6, 0], fov: 40 },
        ],
      },
      objects: [
        { name: "Ball", desc: "The ball (red), hopping down a step at a time", shape: "sphere", size: [0.6, 0.6, 0.6], pivot: [0, 0, 0], color: "#c04a3a",
          keys: mboStairBallKeys(MBO_STAIR_HEIGHTS, 0.3) },
      ].concat(mboStairs(MBO_STAIR_HEIGHTS)),
    },
    {
      id: "spaceship-flyby",
      label: "Spaceship flyby past a planet",
      about: "Deep-space plate: a black void with a large planet (blue) hanging in the sky. A ship (pale cone, nose first) streaks left to right through a field of drifting rocks (grey), banking as it passes. The camera holds its position and pans to follow the ship.",
      seconds: 5,
      look: { bg: "#05060a", groundColor: "#05060a", grid: false },
      camera: {
        shake: 0.03, fov: 50,
        from: [-4, 6, 22], to: [4, 7, 20], target: [0, 8, 0],
        follow: { targetObject: "Ship", targetOffset: [0, 0, 0] },
        keys: [
          { t: 0, pos: [-4, 6, 22], target: [0, 8, 0], fov: 50, ease: "inOut" },
          { t: 1, pos: [4, 7, 20], target: [0, 8, 0], fov: 50 },
        ],
      },
      objects: [
        { name: "Planet", desc: "Giant planet (blue) in the background sky", shape: "sphere", size: [120, 120, 120], pivot: [0, 0, 0], color: "#3c5f8a",
          keys: [mboKey(0, [-40, 66, -170]), mboKey(1, [-40, 66, -170])] },
        { name: "Ship", desc: "The ship (pale), nose pointing the way it flies, banking", shape: "cone", size: [1.4, 4.5, 1.4], pivot: [0, 0, 0], color: "#d8dde4",
          keys: [mboKey(0, [-34, 8, 0], [0, 0, -90], "linear"), mboKey(0.5, [0, 9, -3], [-25, 0, -90], "linear"), mboKey(1, [34, 10, -6], [0, 0, -90])] },
        { name: "Rocks", desc: "70 drifting rocks (grey) — near ones whip past to sell speed", shape: "sphere", size: [1, 1, 1], pivot: [0, 0, 0], color: "#6d6a66",
          crowd: { count: 70, area: [90, 50], bob: 0.6, stride: 4, lag: 0, colors: ["#6d6a66", "#5d5a56", "#7c7873", "#4f4c49"] },
          keys: [mboKey(0, [0, 7, -18], [0, 0, 0], "linear"), mboKey(1, [-3, 7, -18], [40, 60, 0])] },
      ],
    },
    {
      id: "concert-crane",
      label: "Crane over a concert crowd to the stage",
      about: "1500 fans (mixed warm colours) bounce in front of a stage; a singer (blue) sways at centre, flanked by speaker stacks under a lighting truss. The camera starts low behind the crowd and cranes up and over them toward the stage.",
      seconds: 6,
      camera: {
        shake: 0.02, fov: 48,
        from: [0, 2, 24], to: [0, 14, 10], target: [0, 2, -8],
        keys: [
          { t: 0, pos: [0, 2.2, 24], target: [0, 2.2, -8], fov: 48, ease: "inOut" },
          { t: 1, pos: [0, 14, 8], target: [0, 1.6, -10], fov: 48 },
        ],
      },
      objects: [
        { name: "Stage", desc: "Raised stage (static)", shape: "box", size: [14, 1.2, 6], pivot: [0, 0, 0], color: "#4b4b50",
          keys: [mboKey(0, [0, 0.6, -10]), mboKey(1, [0, 0.6, -10])] },
        { name: "Singer", desc: "The singer (blue), swaying at centre stage", shape: "capsule", size: [0.6, 1.8, 0.6], pivot: [0, -0.9, 0], color: "#4a6ea8",
          keys: [mboKey(0, [0, 2.1, -9], [0, 0, 8], "inOut"), mboKey(0.25, [0, 2.1, -9], [0, 0, -8], "inOut"), mboKey(0.5, [0, 2.1, -9], [0, 0, 8], "inOut"), mboKey(0.75, [0, 2.1, -9], [0, 0, -8], "inOut"), mboKey(1, [0, 2.1, -9], [0, 0, 8])] },
        { name: "Speakers Left", desc: "Speaker stacks either side of the stage", shape: "box", size: [2, 4, 2], pivot: [0, 0, 0], color: "#2f2f33",
          keys: [mboKey(0, [-8.5, 2, -10]), mboKey(1, [-8.5, 2, -10])] },
        { name: "Speakers Right", desc: "Speaker stack", shape: "box", size: [2, 4, 2], pivot: [0, 0, 0], color: "#2f2f33",
          keys: [mboKey(0, [8.5, 2, -10]), mboKey(1, [8.5, 2, -10])] },
        { name: "Truss", desc: "Lighting truss over the stage", shape: "box", size: [18, 0.4, 0.4], pivot: [0, 0, 0], color: "#b8b8b8",
          keys: [mboKey(0, [0, 7, -9]), mboKey(1, [0, 7, -9])] },
        { name: "Crowd", desc: "1500 fans bouncing in place", shape: "capsule", size: [0.5, 1.7, 0.5], pivot: [0, 0, 0], color: "#c9584f",
          crowd: { count: 1500, area: [30, 18], bob: 0.28, stride: 60, lag: 0, colors: ["#c9584f", "#d08a72", "#b0705a", "#9c5a66", "#d4a35c", "#8f5a52"] },
          keys: [mboKey(0, [0, 0.85, 4]), mboKey(1, [0, 0.85, 4])] },
      ],
    },
    {
      id: "rooftop-jump",
      label: "Runner leaps a gap between two rooftops",
      about: "A runner (red) sprints across the higher rooftop on the left, leaps the gap and lands on the lower roof to the right, leaning forward on impact before running on. The camera tracks alongside at roof height, rising with the jump.",
      seconds: 5,
      camera: {
        shake: 0.05, fov: 46,
        from: [-6, 12.5, 15], to: [5, 11.5, 13], target: [-6, 12.5, 0],
        keys: [
          { t: 0, pos: [-6, 12.6, 15], target: [-6, 12.6, 0], fov: 46, ease: "inOut" },
          { t: 0.55, pos: [0, 13.6, 15.5], target: [0, 12.8, 0], fov: 46, ease: "inOut" },
          { t: 1, pos: [5, 11.6, 13], target: [5.4, 10.8, 0], fov: 46 },
        ],
      },
      objects: [
        { name: "Building A", desc: "Taller building the runner leaps from (static)", shape: "box", size: [8, 12, 8], pivot: [0, 0, 0], color: "#9d978d",
          keys: [mboKey(0, [-6, 6, 0]), mboKey(1, [-6, 6, 0])] },
        { name: "Building B", desc: "Lower building the runner lands on (static)", shape: "box", size: [8, 10, 8], pivot: [0, 0, 0], color: "#a8a297",
          keys: [mboKey(0, [6, 5, 0]), mboKey(1, [6, 5, 0])] },
        { name: "Runner", desc: "The runner (red): sprint, leap, land leaning forward, run on", shape: "capsule", size: [0.55, 1.8, 0.55], pivot: [0, 0, 0], color: "#c04a3a",
          keys: [
            mboKey(0, [-9, 12.9, 0], [0, 0, -10], "linear"),
            mboKey(0.4, [-2.4, 12.9, 0], [0, 0, -14], "out"),
            mboKey(0.55, [0, 14.2, 0], [0, 0, -4], "gravity"),
            mboKey(0.7, [2.6, 10.9, 0], [0, 0, -22], "out"),
            mboKey(0.8, [3.6, 10.9, 0], [0, 0, -12], "linear"),
            mboKey(1, [7, 10.9, 0], [0, 0, -10]),
          ] },
      ],
    },
    {
      id: "helicopter-landing",
      label: "Helicopter descends onto a helipad",
      about: "A helicopter (dark green body, tail boom and spinning rotor disc) drops from high and behind, slows, and settles onto a round helipad. Two ground crew (orange) wait at the edge. The camera is low at ground level, looking up and tracking the descent.",
      seconds: 6,
      camera: {
        shake: 0.06, fov: 50,
        from: [12, 1.5, 14], to: [9, 1.6, 11], target: [0, 4, 0],
        follow: { targetObject: "Helicopter Body", targetOffset: [0, 0.4, 0] },
        keys: [
          { t: 0, pos: [12, 1.5, 14], target: [0, 4, 0], fov: 50, ease: "inOut" },
          { t: 1, pos: [9, 1.6, 11], target: [0, 4, 0], fov: 50 },
        ],
      },
      objects: [
        { name: "Helipad", desc: "Round helipad (static)", shape: "cylinder", size: [9, 0.1, 9], pivot: [0, 0, 0], color: "#6a6a6a",
          keys: [mboKey(0, [0, 0.05, 0]), mboKey(1, [0, 0.05, 0])] },
        { name: "Helicopter Body", desc: "Helicopter cabin (dark green)", shape: "box", size: [4, 1.6, 1.8], pivot: [0, 0, 0], color: "#4d5b44",
          keys: mboRide(MBO_HELI_PATH, [0, 0, 0]) },
        { name: "Tail Boom", desc: "Tail boom, travels with the body", shape: "box", size: [4, 0.4, 0.4], pivot: [0, 0, 0], color: "#4d5b44",
          keys: mboRide(MBO_HELI_PATH, [3.8, 0.3, 0]) },
        { name: "Rotor", desc: "Main rotor disc, spinning", shape: "cylinder", size: [9, 0.06, 9], pivot: [0, 0, 0], color: "#3a3a3a",
          keys: mboRide(MBO_HELI_PATH, [0, 1.05, 0], (t) => [0, t * 2160, 0]) },
        { name: "Crew A", desc: "Ground crew (orange) waiting at the pad edge", shape: "capsule", size: [0.55, 1.75, 0.55], pivot: [0, 0, 0], color: "#d9822b",
          keys: [mboKey(0, [6.5, 0.875, 4]), mboKey(1, [6.5, 0.875, 4])] },
        { name: "Crew B", desc: "Ground crew, steps back as it lands", shape: "capsule", size: [0.55, 1.75, 0.55], pivot: [0, 0, 0], color: "#d9822b",
          keys: [mboKey(0, [-6, 0.875, 5], [0, 0, 0], "linear"), mboKey(0.6, [-6, 0.875, 5], [0, 0, 0], "inOut"), mboKey(1, [-7.5, 0.875, 6.2], [0, 30, 0])] },
      ],
    },
  ];

  // Samples are templates — stamp fresh ids so edits never alias across loads.
  // A sample may set its own sky/ground (space needs black); the rest get the grey default.
  const MBO_DEFAULT_LOOK = { bg: "#2b2b2b", groundColor: "#8a8a8a", grid: true };

  function mboLoadSample(s) {
    return {
      seconds: s.seconds,
      camera: JSON.parse(JSON.stringify(s.camera)),
      objects: s.objects.map((o) => ({ ...JSON.parse(JSON.stringify(o)), id: mboNewId() })),
      look: { ...MBO_DEFAULT_LOOK, ...(s.look || {}) },
    };
  }

  // Deterministic hash in [0,1) — crowd layouts must be identical in the preview
  // and in every export pass, so Math.random() is not an option.
  function mboHash(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }

  function mboLerp(a, b, t) { return a + (b - a) * t; }
  function mboLerp3(a, b, t) { return [mboLerp(a[0], b[0], t), mboLerp(a[1], b[1], t), mboLerp(a[2], b[2], t)]; }

  // Easing applies to the segment LEAVING a key. "gravity" is quadratic — the
  // shape of a real fall, and the difference between a body dropping and a body
  // sliding down an invisible ramp.
  function mboEase(u, kind) {
    if (kind === "in" || kind === "gravity") return u * u;
    if (kind === "out") return 1 - (1 - u) * (1 - u);
    if (kind === "inOut") return u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
    return u;
  }

  // Sample an object's keyframe track at normalized clip time t.
  function mboSampleTrack(keys, t) {
    if (!keys || !keys.length) return { pos: [0, 0, 0], rot: [0, 0, 0] };
    if (keys.length === 1 || t <= keys[0].t) return { pos: keys[0].pos, rot: keys[0].rot };
    const last = keys[keys.length - 1];
    if (t >= last.t) return { pos: last.pos, rot: last.rot };
    let i = 0;
    while (i < keys.length - 2 && keys[i + 1].t <= t) i++;
    const a = keys[i], b = keys[i + 1];
    const span = b.t - a.t;
    const u = span <= 0 ? 0 : mboEase((t - a.t) / span, a.ease);
    return { pos: mboLerp3(a.pos, b.pos, u), rot: mboLerp3(a.rot, b.rot, u) };
  }

  // World-space lowest point of an object at time t, so we can catch geometry
  // sinking through the ground. Exact for boxes, and a good bound for the rest:
  // take the object's AABB, rotate it, and project onto Y.
  //
  // Rows of the three.js Euler-XYZ rotation matrix (te[1], te[5], te[9]).
  function mboRotRowY(rotDeg) {
    const x = rotDeg[0] * Math.PI / 180, y = rotDeg[1] * Math.PI / 180, z = rotDeg[2] * Math.PI / 180;
    const a = Math.cos(x), b = Math.sin(x), c = Math.cos(y), d = Math.sin(y), e = Math.cos(z), f = Math.sin(z);
    return [a * f + b * e * d, a * e - b * f * d, -b * c];
  }

  function mboLowestY(o, t) {
    const s = mboSampleTrack(o.keys, t);
    const pv = Array.isArray(o.pivot) ? o.pivot : [0, 0, 0];
    const [sx, sy, sz] = o.size;
    const R = mboRotRowY(s.rot);
    // The group sits at the pivot; the mesh is offset by -pivot inside it.
    const groupY = s.pos[1] + pv[1];
    const centreY = R[0] * -pv[0] + R[1] * -pv[1] + R[2] * -pv[2];
    const half = 0.5 * (Math.abs(R[0]) * sx + Math.abs(R[1]) * sy + Math.abs(R[2]) * sz);
    return groupY + centreY - half;
  }

  // Sample the whole clip; returns how far the worst offender dips below y=0.
  function mboGroundDip(o, steps = 24) {
    let worst = 0;
    for (let i = 0; i <= steps; i++) worst = Math.min(worst, mboLowestY(o, i / steps));
    return worst;
  }

  // Older scenes (and sloppier model output) may still use from/to/spinY.
  function mboNormalizeObject(o) {
    if (Array.isArray(o.keys) && o.keys.length) return o;
    const from = Array.isArray(o.from) ? o.from : [0, 1, 0];
    const to = Array.isArray(o.to) ? o.to : from;
    const spin = Number.isFinite(o.spinY) ? o.spinY : 0;
    return { ...o, keys: [mboKey(0, from, [0, 0, 0]), mboKey(1, to, [0, spin, 0])] };
  }

  function mboMakeGeometry(THREE, o) {
    const [sx, sy, sz] = o.size.map((n) => Math.max(0.01, n));
    if (o.shape === "sphere") return new THREE.SphereGeometry(sx / 2, 32, 16);
    if (o.shape === "cylinder") return new THREE.CylinderGeometry(sx / 2, sx / 2, sy, 32);
    if (o.shape === "cone") return new THREE.ConeGeometry(sx / 2, sy, 32);
    if (o.shape === "capsule") return new THREE.CapsuleGeometry(sx / 2, Math.max(0.01, sy - sx), 8, 16);
    return new THREE.BoxGeometry(sx, sy, sz);
  }

  // Build the scene once per object-list change; `mboApplyTime` then just moves
  // things, so scrubbing and encoding never rebuild geometry.
  function mboBuildScene(THREE, objects, opts) {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(opts.bg || "#2b2b2b");

    const ground = new THREE.Mesh(
      // Oversized so its edge never reads as a false horizon.
      new THREE.PlaneGeometry(400, 400),
      new THREE.MeshLambertMaterial({ color: opts.groundColor || "#8a8a8a" })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    if (opts.grid) {
      const grid = new THREE.GridHelper(80, 40, 0x666666, 0x777777);
      grid.position.y = 0.01;
      scene.add(grid);
    }

    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(8, 16, -6);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    const c = key.shadow.camera;
    c.left = -40; c.right = 40; c.top = 40; c.bottom = -40; c.near = 0.5; c.far = 120;
    scene.add(key);
    scene.add(new THREE.AmbientLight(0xffffff, 0.55));

    // Each object is a pivot Group holding the mesh. Rotation is applied to the
    // group and the mesh is offset by -pivot inside it, so the object swings
    // about its anchor point (a rider's contact with the saddle, a tree's base)
    // instead of spinning around its own centre. Centre rotation is the default
    // when pivot is [0,0,0].
    const meshes = objects.map((raw) => {
      const o = mboNormalizeObject(raw);
      const group = new THREE.Group();
      const geo = mboMakeGeometry(THREE, o);
      const mat = new THREE.MeshLambertMaterial({ color: o.color || "#b4b4b4" });
      const pv = Array.isArray(o.pivot) ? o.pivot : [0, 0, 0];

      if (o.crowd && o.crowd.count > 1) {
        // Thousands of separate meshes would stall the render; one InstancedMesh
        // draws the whole formation in a single call.
        const count = Math.min(6000, Math.max(2, Math.round(o.crowd.count)));
        const inst = new THREE.InstancedMesh(geo, mat, count);
        inst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        inst.receiveShadow = true;
        // Shadow-casting thousands of instances is the single biggest cost here,
        // and at crowd scale the individual shadows aren't legible anyway.
        inst.castShadow = count <= 400;
        const area = Array.isArray(o.crowd.area) ? o.crowd.area : [20, 20];
        const offs = new Array(count);
        for (let i = 0; i < count; i++) {
          offs[i] = {
            x: (mboHash(i * 1.13) - 0.5) * area[0],
            z: (mboHash(i * 2.71 + 5) - 0.5) * area[1],
            phase: mboHash(i * 3.37 + 11) * Math.PI * 2,
            scale: 0.82 + mboHash(i * 5.19 + 3) * 0.36,
            lag: (mboHash(i * 7.77 + 17) - 0.5),
          };
        }
        // Mixed colours within one formation: real crowds aren't uniform, and the
        // variation stops a large block reading as a single flat shape.
        const palette = Array.isArray(o.crowd.colors) && o.crowd.colors.length ? o.crowd.colors : null;
        if (palette) {
          const tmp = new THREE.Color();
          for (let i = 0; i < count; i++) {
            tmp.set(palette[Math.floor(mboHash(i * 9.13 + 23) * palette.length) % palette.length]);
            inst.setColorAt(i, tmp);
          }
          if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
        }
        group.add(inst);
        group.userData.inst = inst;
        group.userData.offs = offs;
        group.userData.dummy = new THREE.Object3D();
      } else {
        const mesh = new THREE.Mesh(geo, mat);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.position.set(-pv[0], -pv[1], -pv[2]);
        group.add(mesh);
      }

      group.userData.spec = o;
      group.userData.pivot = pv;
      scene.add(group);
      return group;
    });

    return { scene, meshes, dispose() {
      scene.traverse((n) => {
        if (n.geometry) n.geometry.dispose();
        if (n.material) (Array.isArray(n.material) ? n.material : [n.material]).forEach((m) => m.dispose());
      });
    } };
  }

  // Deterministic pseudo-noise so a shaky camera renders identically every pass —
  // Math.random() here would make each export differ from its own preview.
  function mboNoise(seed, t) {
    return Math.sin(seed * 12.9898 + t * 78.233) * Math.sin(seed * 3.1415 + t * 41.7) ;
  }

  // Camera as a keyframe track too, so it can hold, whip, then settle. Falls back
  // to the simple from/to pair when no keys are present.
  function mboSampleCamera(cam, t) {
    if (Array.isArray(cam.keys) && cam.keys.length) {
      const posTrack = mboSampleTrack(cam.keys.map((k) => mboKey(k.t, k.pos, k.target, k.ease)), t);
      let fov = cam.keys[0].fov ?? cam.fov ?? 40;
      for (let i = 0; i < cam.keys.length - 1; i++) {
        const a = cam.keys[i], b = cam.keys[i + 1];
        if (t >= a.t && t <= b.t) {
          const span = b.t - a.t;
          const u = span <= 0 ? 0 : mboEase((t - a.t) / span, a.ease);
          fov = mboLerp(a.fov ?? cam.fov ?? 40, b.fov ?? cam.fov ?? 40, u);
          break;
        }
        if (t > b.t) fov = b.fov ?? cam.fov ?? 40;
      }
      // `rot` carries the look-at target through mboSampleTrack.
      return { pos: posTrack.pos, target: posTrack.rot, fov };
    }
    return { pos: mboLerp3(cam.from, cam.to, t), target: cam.target, fov: cam.fov };
  }

  // Resolve a named object's position at time t, for camera rigging.
  function mboFindObjectPos(meshes, name, t) {
    for (const g of meshes) {
      const sp = g.userData.spec;
      if (sp && sp.name === name) return mboSampleTrack(sp.keys, t).pos;
    }
    return null;
  }

  // t is normalized 0..1 across the whole clip.
  function mboApplyTime(meshes, camera, cam, t) {
    const DEG = Math.PI / 180;
    for (const group of meshes) {
      const o = group.userData.spec;
      const pv = group.userData.pivot || [0, 0, 0];
      const inst = group.userData.inst;

      if (inst) {
        // Instance transforms are absolute, so the carrier group stays at origin.
        group.position.set(0, 0, 0);
        group.rotation.set(0, 0, 0);
        const offs = group.userData.offs, d = group.userData.dummy;
        const c = o.crowd || {};
        const bob = Number.isFinite(c.bob) ? c.bob : 0.12;
        const spread = Number.isFinite(c.lag) ? c.lag : 0.06;
        const stride = Number.isFinite(c.stride) ? c.stride : 34;
        for (let i = 0; i < offs.length; i++) {
          const off = offs[i];
          // Per-instance time offset: without it the whole crowd moves in
          // lockstep and reads as one sliding sheet rather than a mass of people.
          const st = mboSampleTrack(o.keys, Math.max(0, Math.min(1, t + off.lag * spread)));
          d.position.set(
            st.pos[0] + off.x,
            st.pos[1] + Math.abs(Math.sin(t * stride + off.phase)) * bob,
            st.pos[2] + off.z
          );
          d.rotation.set(st.rot[0] * DEG, st.rot[1] * DEG, st.rot[2] * DEG);
          d.scale.setScalar(off.scale);
          d.updateMatrix();
          inst.setMatrixAt(i, d.matrix);
        }
        inst.instanceMatrix.needsUpdate = true;
        continue;
      }

      const s = mboSampleTrack(o.keys, t);
      // Place the pivot point, not the centre — the mesh already sits at -pivot.
      group.position.set(s.pos[0] + pv[0], s.pos[1] + pv[1], s.pos[2] + pv[2]);
      group.rotation.set(s.rot[0] * DEG, s.rot[1] * DEG, s.rot[2] * DEG);
    }
    const c = mboSampleCamera(cam, t);
    let cpos = c.pos, ctarget = c.target;

    // Camera rigging: ride alongside a moving subject instead of hand-keying a
    // parallel path. `offset` is added to the followed object's position, so the
    // keyed camera track becomes a relative move layered on top of the ride.
    const fol = cam.follow;
    if (fol) {
      if (fol.object) {
        const p = mboFindObjectPos(meshes, fol.object, t);
        if (p) {
          const off = Array.isArray(fol.offset) ? fol.offset : [0, 0, 0];
          // Keyed camera positions act as an additional offset when following,
          // which is what makes "drift back while riding along" expressible.
          cpos = [p[0] + off[0] + (cam.keys ? cpos[0] : 0), p[1] + off[1] + (cam.keys ? cpos[1] : 0), p[2] + off[2] + (cam.keys ? cpos[2] : 0)];
        }
      }
      if (fol.targetObject) {
        const p = mboFindObjectPos(meshes, fol.targetObject, t);
        if (p) {
          const off = Array.isArray(fol.targetOffset) ? fol.targetOffset : [0, 0, 0];
          ctarget = [p[0] + off[0], p[1] + off[1], p[2] + off[2]];
        }
      }
    }

    const amp = Number.isFinite(cam.shake) ? cam.shake : 0;
    const jx = amp ? mboNoise(1.7, t * 60) * amp : 0;
    const jy = amp ? mboNoise(4.2, t * 60) * amp : 0;
    camera.position.set(cpos[0] + jx, cpos[1] + jy, cpos[2]);
    camera.fov = c.fov;
    camera.updateProjectionMatrix();
    camera.lookAt(ctarget[0], ctarget[1], ctarget[2]);
  }

  // ── Encode ───────────────────────────────────────────────────────────────────
  // Renders every frame at full output resolution through a throwaway renderer,
  // so the on-screen preview size never affects the exported plate.
  async function mboRenderToMp4(THREE, MB, objects, cam, settings, onProgress) {
    const { Output, BufferTarget, Mp4OutputFormat, CanvasSource } = MB;
    const { width, height, fps, seconds } = settings;
    const total = Math.max(1, Math.round(seconds * fps));

    const canvas = document.createElement("canvas");
    canvas.width = width; canvas.height = height;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(1);
    renderer.setSize(width, height, false);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const built = mboBuildScene(THREE, objects, settings);
    const camera = new THREE.PerspectiveCamera(cam.fov, width / height, 0.1, 2000);

    const bitrate = Math.max(2_000_000, Math.round(width * height * fps * 0.12));
    const source = new CanvasSource(canvas, { codec: "avc", bitrate });
    const output = new Output({ format: new Mp4OutputFormat(), target: new BufferTarget() });
    output.addVideoTrack(source, { frameRate: fps });

    let poster = "";
    try {
      await output.start();
      const dur = 1 / fps;
      for (let i = 0; i < total; i++) {
        // Last frame lands exactly on t=1 so the move completes on screen.
        const t = total === 1 ? 0 : i / (total - 1);
        mboApplyTime(built.meshes, camera, cam, t);
        renderer.render(built.scene, camera);
        // First frame doubles as the start frame; read it before the
        // canvas is cleared for the next frame.
        if (i === 0) poster = canvas.toDataURL("image/jpeg", 0.85);
        // add() returns a promise under encoder backpressure — awaiting it is
        // required, otherwise frames drop and the file comes out empty.
        const p = source.add(i * dur, dur);
        if (p && typeof p.then === "function") await p;
        if (onProgress) onProgress((i + 1) / total);
      }
      await output.finalize();
      return { blob: new Blob([output.target.buffer], { type: "video/mp4" }), poster };
    } finally {
      built.dispose();
      renderer.dispose();
    }
  }

  function mboClamp3(v, fallback) {
    return Array.isArray(v) && v.length === 3 && v.every((n) => Number.isFinite(n)) ? v.map(Number) : fallback;
  }

  // The model is told to emit bare JSON, but tolerate a stray fence or preamble
  // rather than failing the whole generation on formatting.
  function mboParseScene(text) {
    const raw = (text || "").trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start < 0 || end <= start) throw new Error("Model did not return JSON.");
    const data = JSON.parse(raw.slice(start, end + 1));

    const parseKeys = (arr, fallbackPos) => {
      const keys = (Array.isArray(arr) ? arr : [])
        .map((k) => mboKey(
          Number.isFinite(k.t) ? Math.max(0, Math.min(1, Number(k.t))) : 0,
          mboClamp3(k.pos, fallbackPos),
          mboClamp3(k.rot, [0, 0, 0]),
          MBO_EASES.includes(k.ease) ? k.ease : "linear"
        ))
        .sort((a, b) => a.t - b.t);
      return keys.length ? keys : null;
    };

    const objects = (Array.isArray(data.objects) ? data.objects : []).map((o, i) => {
      const size = mboClamp3(o.size, [1, 2, 1]).map((n) => Math.max(0.01, n));
      const keys = parseKeys(o.keys, [0, size[1] / 2, 0]);
      const base = {
        id: mboNewId(),
        name: typeof o.name === "string" && o.name.trim() ? o.name.trim() : `Block ${String.fromCharCode(65 + i)}`,
        shape: MBO_SHAPES.includes(o.shape) ? o.shape : "box",
        size,
        pivot: mboClamp3(o.pivot, [0, 0, 0]),
        color: /^#[0-9a-f]{6}$/i.test(o.color || "") ? o.color : "#b4b4b4",
        ...(typeof o.desc === "string" && o.desc.trim() ? { desc: o.desc.trim() } : {}),
        ...(o.crowd && Number(o.crowd.count) > 1 ? {
          crowd: {
            count: Math.min(6000, Math.max(2, Math.round(Number(o.crowd.count)))),
            area: Array.isArray(o.crowd.area) && o.crowd.area.length === 2 && o.crowd.area.every((n) => Number.isFinite(n))
              ? o.crowd.area.map(Number) : [20, 20],
            bob: Number.isFinite(o.crowd.bob) ? Number(o.crowd.bob) : 0.14,
            stride: Number.isFinite(o.crowd.stride) ? Number(o.crowd.stride) : 38,
            lag: Number.isFinite(o.crowd.lag) ? Number(o.crowd.lag) : 0.12,
            ...(Array.isArray(o.crowd.colors) && o.crowd.colors.length
              ? { colors: o.crowd.colors.filter((c) => /^#[0-9a-f]{6}$/i.test(c || "")) } : {}),
          },
        } : {}),
      };
      // Tolerate a model that ignored the keyframe schema and sent from/to.
      return keys ? { ...base, keys } : mboNormalizeObject({ ...base, from: o.from, to: o.to, spinY: o.spinY });
    });
    if (!objects.length) throw new Error("Model returned no objects.");

    const c = data.camera || {};
    const camKeys = (Array.isArray(c.keys) ? c.keys : [])
      .map((k) => ({
        t: Number.isFinite(k.t) ? Math.max(0, Math.min(1, Number(k.t))) : 0,
        pos: mboClamp3(k.pos, MBO_DEFAULT_CAMERA.from),
        target: mboClamp3(k.target, MBO_DEFAULT_CAMERA.target),
        fov: Number.isFinite(k.fov) ? Math.max(5, Math.min(120, Number(k.fov))) : null,
        ease: MBO_EASES.includes(k.ease) ? k.ease : "linear",
      }))
      .sort((a, b) => a.t - b.t);
    const camera = {
      from: mboClamp3(c.from, MBO_DEFAULT_CAMERA.from),
      to: mboClamp3(c.to, mboClamp3(c.from, MBO_DEFAULT_CAMERA.to)),
      target: mboClamp3(c.target, MBO_DEFAULT_CAMERA.target),
      fov: Number.isFinite(c.fov) ? Math.max(5, Math.min(120, Number(c.fov))) : MBO_DEFAULT_CAMERA.fov,
      shake: Number.isFinite(c.shake) ? Math.max(0, Math.min(2, Number(c.shake))) : 0,
      ...(c.follow && (c.follow.object || c.follow.targetObject) ? {
        follow: {
          ...(typeof c.follow.object === "string" ? { object: c.follow.object } : {}),
          ...(typeof c.follow.targetObject === "string" ? { targetObject: c.follow.targetObject } : {}),
          offset: mboClamp3(c.follow.offset, [0, 0, 0]),
          targetOffset: mboClamp3(c.follow.targetOffset, [0, 0, 0]),
        },
      } : {}),
      ...(camKeys.length ? { keys: camKeys } : {}),
    };
    const seconds = Number.isFinite(data.seconds) ? Math.max(1, Math.min(30, Math.round(data.seconds))) : null;
    const about = typeof data.about === "string" && data.about.trim() ? data.about.trim() : null;
    return { objects, camera, seconds, about };
  }

  // ── Persistence ──────────────────────────────────────────────────────────────
  function mboLoadStored() {
    try {
      const s = JSON.parse(localStorage.getItem(MBO_STORE_KEY) || "null");
      if (!s || !Array.isArray(s.objects)) return null;
      // Fresh ids: stored ones would collide with ids minted later this session.
      return { ...s, objects: s.objects.map((o) => ({ ...mboNormalizeObject(o), id: mboNewId() })) };
    } catch (e) { return null; }
  }

  // ── Small controlled inputs ──────────────────────────────────────────────────
  const MBO_LBL = { fontSize: 11, color: "var(--text-secondary)", fontFamily: "var(--mono)" };
  const MBO_SMALL = { fontSize: 10, color: "var(--text-secondary)", fontFamily: "var(--mono)", lineHeight: 1.45 };
  const MBO_INPUT = { padding: "4px 6px", fontSize: 11, fontFamily: "var(--mono)", width: "auto" };
  const MBO_SWATCH = { width: 30, height: 26, padding: 0, border: "0.5px solid var(--border-2)", borderRadius: 4, background: "none", cursor: "pointer", flex: "0 0 30px" };

  // minWidth 0 + flex lets these shrink inside a narrow panel instead of forcing
  // the whole column wider than the page.
  function MboNum({ value, onChange, step = 0.1, width = 58 }) {
    return (
      <input className="select-input" type="number" step={step} value={value}
        onChange={(e) => { const n = parseFloat(e.target.value); onChange(Number.isFinite(n) ? n : 0); }}
        style={{ ...MBO_INPUT, width, minWidth: 0, flex: "1 1 0" }} />
    );
  }

  function MboVec({ label, value, onChange, step = 0.5 }) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
        <span style={{ ...MBO_LBL, width: 42, flex: "0 0 42px" }}>{label}</span>
        {[0, 1, 2].map((i) => (
          <MboNum key={i} value={value[i]} step={step}
            onChange={(n) => { const next = value.slice(); next[i] = n; onChange(next); }} />
        ))}
      </div>
    );
  }

  // Seedance prompt that goes with the plate when it is sent to Video Generation.
  function mboSeedancePrompt(about) {
    return "Use @Video1 as the motion reference: match its camera move, blocking, timing and the path of every moving element exactly. "
      + "The grey proxy shapes are placeholders only — replace them with the real subjects and setting, fully textured and lit; never show the grey blocks or the grid."
      + (about ? `\n\nWhat the blocks represent: ${about}` : "");
  }

  async function mboPost(path, body) {
    const r = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body || {}) });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
    return data;
  }

  // ── Panel ────────────────────────────────────────────────────────────────────
  function MotionBlockout() {
    const stored = useRef(mboLoadStored()).current || {};
    const [desc, setDesc] = useState(stored.desc || "");
    const [gen, setGen] = useState(false);
    const [about, setAbout] = useState(stored.about || null); // plain-English summary of the scene
    const [raw, setRaw] = useState(null);   // last model response, verbatim
    const [meta, setMeta] = useState(null); // timing for that call
    const [showRaw, setShowRaw] = useState(false);
    const [objects, setObjects] = useState(() => stored.objects || mboDefaultObjects());
    const [cam, setCam] = useState(stored.camera || MBO_DEFAULT_CAMERA);
    const [seconds, setSeconds] = useState(stored.seconds || 5);
    const [fps, setFps] = useState(stored.fps || 24);
    const [res, setRes] = useState(stored.res || "1280x720");
    const [grid, setGrid] = useState(stored.grid !== undefined ? !!stored.grid : true);
    const [bg, setBg] = useState(stored.bg || "#2b2b2b");
    const [groundColor, setGroundColor] = useState(stored.groundColor || "#8a8a8a");
    const [playing, setPlaying] = useState(true);
    const [scrub, setScrub] = useState(0);
    const [busy, setBusy] = useState(false);
    const [progress, setProgress] = useState(0);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [sending, setSending] = useState(false);
    const [name, setName] = useState(stored.name || "Untitled blockout");
    const [sampleId, setSampleId] = useState(stored.sampleId || "");
    const [ready, setReady] = useState(false);

    const hostRef = useRef(null);
    const glRef = useRef(null);       // { THREE, renderer, camera }
    const builtRef = useRef(null);    // mboBuildScene result
    const stateRef = useRef({});      // latest values for the rAF loop
    // Playhead lives in a ref, not state: the loop advances it every frame, and
    // pushing that into React 60x/s would re-render the whole control panel and
    // fight anyone typing in a number field. State is synced ~10x/s, just often
    // enough for the slider and the time readout to look live.
    const tRef = useRef(0);
    const syncRef = useRef(0);

    const [width, height] = (() => { const m = /^(\d+)x(\d+)$/.exec(res); return m ? [parseInt(m[1], 10), parseInt(m[2], 10)] : [1280, 720]; })();

    stateRef.current = { cam, seconds, playing };

    useEffect(() => {
      try {
        localStorage.setItem(MBO_STORE_KEY, JSON.stringify({ desc, about, name, sampleId, objects, camera: cam, seconds, fps, res, grid, bg, groundColor }));
      } catch (e) {}
    }, [desc, about, name, sampleId, objects, cam, seconds, fps, res, grid, bg, groundColor]);

    // The rendered plate is a blob URL; release it when the panel goes away.
    const resultRef = useRef(null);
    resultRef.current = result;
    useEffect(() => () => { if (resultRef.current?.url) URL.revokeObjectURL(resultRef.current.url); }, []);

    // Boot three.js + the preview renderer once.
    useEffect(() => {
      let alive = true;
      let raf = 0;
      (async () => {
        let THREE;
        try { THREE = await mboLoadThree(); } catch (e) { if (alive) setError("Could not load three.js. Check your network connection."); return; }
        if (!alive || !hostRef.current) return;

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        hostRef.current.appendChild(renderer.domElement);
        Object.assign(renderer.domElement.style, { width: "100%", height: "100%", display: "block", borderRadius: "6px" });

        const camera = new THREE.PerspectiveCamera(MBO_DEFAULT_CAMERA.fov, 16 / 9, 0.1, 2000);
        glRef.current = { THREE, renderer, camera };
        setReady(true);

        let last = performance.now();
        const tick = (now) => {
          raf = requestAnimationFrame(tick);
          const st = stateRef.current;
          const dt = Math.min(0.1, (now - last) / 1000);
          last = now;

          const host = hostRef.current;
          if (!host || !builtRef.current) return;
          const w = host.clientWidth, h = host.clientHeight;
          if (w > 0 && h > 0) {
            renderer.setSize(w, h, false);
            camera.aspect = w / h;
          }

          let t = tRef.current;
          if (st.playing) {
            t += dt / Math.max(0.1, st.seconds);
            if (t > 1) t -= 1;
            tRef.current = t;
            if (now - syncRef.current > 100) { syncRef.current = now; setScrub(t); }
          }
          mboApplyTime(builtRef.current.meshes, camera, st.cam, t);
          renderer.render(builtRef.current.scene, camera);
        };
        raf = requestAnimationFrame(tick);
      })();

      return () => {
        alive = false;
        cancelAnimationFrame(raf);
        if (builtRef.current) { builtRef.current.dispose(); builtRef.current = null; }
        const gl = glRef.current;
        if (gl) { gl.renderer.dispose(); gl.renderer.domElement.remove(); glRef.current = null; }
      };
    }, []);

    // Rebuild the preview scene whenever the object list or look changes.
    useEffect(() => {
      const gl = glRef.current;
      if (!gl) return;
      if (builtRef.current) builtRef.current.dispose();
      builtRef.current = mboBuildScene(gl.THREE, objects, { grid, bg, groundColor });
    }, [objects, grid, bg, groundColor, ready]);

    const clearResult = useCallback(() => {
      setResult((prev) => { if (prev?.url) URL.revokeObjectURL(prev.url); return null; });
    }, []);

    const addObject = useCallback((shape) => {
      setObjects((prev) => {
        const size = shape === "sphere" ? [2, 2, 2] : [1, 2, 1];
        return [...prev, {
          id: mboNewId(), name: `Block ${String.fromCharCode(65 + prev.length)}`, shape,
          size, pivot: [0, 0, 0], color: "#b4b4b4",
          keys: [mboKey(0, [-6, size[1] / 2, 0]), mboKey(1, [6, size[1] / 2, 0])],
        }];
      });
      clearResult();
    }, [clearResult]);

    const patchKey = useCallback((id, ki, patch) => {
      setObjects((prev) => prev.map((o) => (o.id === id
        ? { ...o, keys: (o.keys || []).map((k, i) => (i === ki ? { ...k, ...patch } : k)) }
        : o)));
      clearResult();
    }, [clearResult]);

    // New keys land at the midpoint of the gap after the last one, which is
    // usually where you want to bend a move.
    const addKey = useCallback((id) => {
      setObjects((prev) => prev.map((o) => {
        if (o.id !== id) return o;
        const keys = o.keys || [];
        const lastK = keys[keys.length - 1];
        const t = keys.length ? Math.min(1, (lastK.t + 1) / 2) : 0;
        const src = mboSampleTrack(keys, t);
        return { ...o, keys: [...keys, mboKey(t, src.pos, src.rot, "linear")].sort((a, b) => a.t - b.t) };
      }));
      clearResult();
    }, [clearResult]);

    const removeKey = useCallback((id, ki) => {
      setObjects((prev) => prev.map((o) => (o.id === id
        ? { ...o, keys: (o.keys || []).filter((_, i) => i !== ki) }
        : o)));
      clearResult();
    }, [clearResult]);

    const patchObject = useCallback((id, patch) => {
      setObjects((prev) => prev.map((o) => (o.id === id ? { ...o, ...patch } : o)));
      clearResult();
    }, [clearResult]);

    const removeObject = useCallback((id) => {
      setObjects((prev) => prev.filter((o) => o.id !== id));
      clearResult();
    }, [clearResult]);

    function applyScene(scene, aboutText, info) {
      setObjects(scene.objects);
      setCam(scene.camera);
      if (scene.seconds) setSeconds(scene.seconds);
      if (scene.look) { setBg(scene.look.bg); setGroundColor(scene.look.groundColor); setGrid(!!scene.look.grid); }
      setAbout(aboutText || null);
      setName((info && info.name) || "Untitled blockout");
      setSampleId((info && info.sampleId) || "");
      tRef.current = 0; setScrub(0);
      clearResult(); setError(null);
    }


    async function generateScene() {
      const text = desc.trim();
      if (!text) return;
      setGen(true); setError(null);
      const t0 = Date.now();
      try {
        const r = await fetch("/api/motion-blockout/generate", {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ description: text }),
        });
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
        const content = data.content || "";
        setRaw(content);
        setMeta({ model: "Seed LLM", durationMs: data.duration_ms ?? (Date.now() - t0), chars: content.length });
        // Parse after raw/meta are stored, so a schema failure still leaves the
        // response visible instead of throwing it away.
        let scene;
        try {
          scene = mboParseScene(content);
        } catch (pe) {
          setShowRaw(true);
          throw pe;
        }
        applyScene(scene, scene.about, { name: text.length > 60 ? `${text.slice(0, 57)}…` : text });
      } catch (e) {
        setError(`Scene generation failed: ${e?.message || String(e)}`);
      } finally {
        setGen(false);
      }
    }

    async function render() {
      setBusy(true); setError(null); setProgress(0);
      clearResult();
      try {
        const [THREE, MB] = await Promise.all([mboLoadThree(), mboLoadMediaBunny()]);
        const out = await mboRenderToMp4(THREE, MB, objects, cam,
          { width, height, fps, seconds, grid, bg, groundColor }, setProgress);
        if (!out.blob.size) throw new Error("Encoder produced an empty file.");
        setResult({ url: URL.createObjectURL(out.blob), bytes: out.blob.size, blob: out.blob, poster: out.poster });
      } catch (e) {
        setError(e?.message || String(e));
      } finally {
        setBusy(false);
      }
    }

    const fileName = `blockout-${width}x${height}-${seconds}s.mp4`;

    async function sendToVideo() {
      if (!result || !window.sendBlenderClipToVideo) return;
      setSending(true); setError(null);
      try {
        await window.sendBlenderClipToVideo({ videoUrl: result.url, name: fileName.replace(/\.mp4$/, ""), prompt: mboSeedancePrompt(about) });
      } catch (e) {
        setError(`Could not send to Video Generation: ${e?.message || String(e)}`);
      } finally {
        setSending(false);
      }
    }

    const fmtBytes = (n) => (n > 1e6 ? `${(n / 1e6).toFixed(1)} MB` : `${Math.round(n / 1e3)} KB`);

    return (
      <div>
        <div className="card">
          <div className="card-label">Describe the shot</div>
          <textarea className="video-input" rows={3} value={desc} onChange={(e) => setDesc(e.target.value)}
            placeholder="A car drives left to right past a tall building while the camera pushes in slowly."
            style={{ minHeight: 76, resize: "vertical" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
            <button className="btn-action btn-inline" onClick={generateScene} disabled={gen || !desc.trim()}>
              {gen ? "Laying out…" : "✦ Generate blockout"}
            </button>
            <button className="btn-action btn-inline" onClick={() => { applyScene({ objects: mboDefaultObjects(), camera: MBO_DEFAULT_CAMERA, seconds: 5, look: MBO_DEFAULT_LOOK }, null); }}>↺ Reset scene</button>
            <span className="video-hint" style={{ marginTop: 0 }}>
              Seed LLM builds the objects and camera move below — everything stays editable by hand.
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", borderTop: "0.5px solid var(--border)", paddingTop: 10, marginTop: 12 }}>
            <span style={MBO_LBL}>Or load a worked example:</span>
            <select className="select-input" value={MBO_SAMPLES.some((x) => x.id === sampleId) ? sampleId : ""} style={{ width: "auto", flex: "1 1 260px", maxWidth: 420 }}
              onChange={(e) => { const smp = MBO_SAMPLES.find((x) => x.id === e.target.value); if (smp) applyScene(mboLoadSample(smp), smp.about, { name: smp.label, sampleId: smp.id }); }}>
              <option value="">Choose one of {MBO_SAMPLES.length} examples…</option>
              {MBO_SAMPLES.map((smp) => <option key={smp.id} value={smp.id}>{smp.label}</option>)}
            </select>
          </div>

          {(raw || meta) && (
            <div style={{ borderTop: "0.5px solid var(--border)", paddingTop: 10, marginTop: 12 }}>
              <button className="btn-link" onClick={() => setShowRaw((v) => !v)}>
                {showRaw ? "▾" : "▸"} Model response
              </button>
              {showRaw && (
                <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
                  {meta && (
                    <div style={{ ...MBO_LBL, display: "flex", gap: 14, flexWrap: "wrap" }}>
                      <span>model: {meta.model}</span>
                      <span>duration: {meta.durationMs} ms</span>
                      <span>response chars: {meta.chars}</span>
                    </div>
                  )}
                  {raw && (
                    <pre style={{ maxHeight: 260, overflow: "auto", background: "var(--surface-2)", border: "0.5px solid var(--border)", borderRadius: 6, padding: 10, fontSize: 11, fontFamily: "var(--mono)", color: "var(--text-secondary)", whiteSpace: "pre-wrap", wordBreak: "break-word", margin: 0 }}>{raw}</pre>
                  )}
                  {raw && (
                    <button className="btn-action btn-inline" style={{ alignSelf: "flex-start" }}
                      onClick={() => navigator.clipboard?.writeText(raw)}>⧉ Copy raw response</button>
                  )}
                </div>
              )}
            </div>
          )}
          {error && <div className="error-box" style={{ fontFamily: "var(--mono)" }}>{error}</div>}
        </div>

        {/* minmax(0, …) on both tracks: without the 0 minimum, a grid column
            refuses to shrink below its content and the panel overflows the page. */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 360px), 1fr))", gap: 14, alignItems: "start" }}>
          {/* ── Viewport ── */}
          <div style={{ minWidth: 0 }}>
            <div className="card">
              <div className="card-label">Preview</div>
              <div ref={hostRef} style={{ width: "100%", aspectRatio: `${width} / ${height}`, maxHeight: 520, background: bg, borderRadius: 6, overflow: "hidden" }} />
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
                <button className="btn-action btn-inline" onClick={() => setPlaying((p) => !p)}>{playing ? "⏸ Pause" : "▶ Play"}</button>
                <input type="range" min={0} max={1} step={0.001} value={scrub}
                  onChange={(e) => { const v = parseFloat(e.target.value); setPlaying(false); tRef.current = v; setScrub(v); }}
                  style={{ flex: 1 }} />
                <span style={{ ...MBO_LBL, width: 54, textAlign: "right" }}>{(scrub * seconds).toFixed(2)}s</span>
              </div>
            </div>

            {/* ── Legend: what each block represents ── */}
            <div className="card">
              <div className="card-label">What you're looking at</div>
              {about && <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.55, marginBottom: 10 }}>{about}</div>}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {objects.map((o) => (
                  <div key={o.id} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 11 }}>
                    <span style={{ width: 14, height: 14, flex: "0 0 14px", marginTop: 1, borderRadius: 3, background: o.color || "#b4b4b4", border: "0.5px solid var(--border-2)" }} />
                    <span style={{ flex: "0 0 auto", fontWeight: 500 }}>{o.name}{o.crowd?.count > 1 ? ` ×${o.crowd.count}` : ""}</span>
                    <span style={{ color: "var(--text-secondary)", minWidth: 0 }}>
                      {o.desc || `${o.shape}, ${o.size.map((n) => n.toFixed(1)).join("×")}m`}
                    </span>
                  </div>
                ))}
              </div>
              <div style={{ ...MBO_SMALL, marginTop: 10 }}>
                Total figures in scene: {objects.reduce((a, o) => a + (o.crowd?.count > 1 ? o.crowd.count : 1), 0)}
              </div>
            </div>

            <div className="card">
              <div className="card-label">Export</div>
              <div className="btn-row" style={{ marginTop: 0 }}>
                <button className="btn-primary" onClick={render} disabled={busy || !objects.length || !ready}>
                  {busy ? `Rendering… ${Math.round(progress * 100)}%` : `Render MP4 (${Math.round(seconds * fps)} frames)`}
                </button>
              </div>
              {result && (
                <div style={{ marginTop: 12 }}>
                  <video src={result.url} controls loop style={{ width: "100%", borderRadius: 6, background: "#000", display: "block" }} />
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                    <button className="btn-action btn-inline" onClick={sendToVideo} disabled={sending || !window.sendBlenderClipToVideo}>
                      {sending ? "Sending…" : "Send to Video Generation"}
                    </button>
                    <a className="btn-action btn-inline" href={result.url} download data-model="Motion Blockout" data-ext="mp4">Download MP4</a>
                    <span style={MBO_LBL}>{fmtBytes(result.bytes)}</span>
                  </div>
                  <div className="video-hint">
                    Send to Video Generation attaches this plate as a reference video (@Video1) and fills an empty prompt with a matching Seedance template.
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Controls ── */}
          <div style={{ minWidth: 0 }}>
            <div className="card">
              <div className="card-label">Output</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <span style={MBO_LBL}>Seconds</span>
                  <MboNum value={seconds} step={1} onChange={(n) => { setSeconds(Math.max(1, Math.min(30, n))); clearResult(); }} />
                  <span style={MBO_LBL}>FPS</span>
                  <MboNum value={fps} step={1} onChange={(n) => { setFps(Math.max(1, Math.min(60, Math.round(n)))); clearResult(); }} />
                </div>
                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={MBO_LBL}>Size</span>
                  <select className="select-input" value={res} onChange={(e) => { setRes(e.target.value); clearResult(); }} style={MBO_INPUT}>
                    {["1920x1080", "1280x720", "1024x576", "720x1280", "1080x1080", "800x1200", "600x900"].map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                  <label style={{ ...MBO_LBL, display: "flex", alignItems: "center", gap: 6 }}>
                    <input type="checkbox" checked={grid} onChange={(e) => { setGrid(e.target.checked); clearResult(); }} />
                    Ground grid
                  </label>
                </div>
                <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                  <label style={{ ...MBO_LBL, display: "flex", alignItems: "center", gap: 6 }}>
                    Sky
                    <input type="color" value={bg} onChange={(e) => { setBg(e.target.value); clearResult(); }} style={MBO_SWATCH} />
                  </label>
                  <label style={{ ...MBO_LBL, display: "flex", alignItems: "center", gap: 6 }}>
                    Ground
                    <input type="color" value={groundColor} onChange={(e) => { setGroundColor(e.target.value); clearResult(); }} style={MBO_SWATCH} />
                  </label>
                  <button className="btn-action btn-inline" onClick={() => { setBg("#2b2b2b"); setGroundColor("#8a8a8a"); clearResult(); }}>Grey default</button>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-label">Camera</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <MboVec label="Start" value={cam.from} onChange={(v) => { setCam((c) => ({ ...c, from: v })); clearResult(); }} />
                <MboVec label="End" value={cam.to} onChange={(v) => { setCam((c) => ({ ...c, to: v })); clearResult(); }} />
                <MboVec label="Look at" value={cam.target} onChange={(v) => { setCam((c) => ({ ...c, target: v })); clearResult(); }} />
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ ...MBO_LBL, width: 42, flex: "0 0 42px" }}>FOV</span>
                  <MboNum value={cam.fov} step={1} onChange={(n) => { setCam((c) => ({ ...c, fov: Math.max(5, Math.min(120, n)) })); clearResult(); }} />
                  <span style={{ ...MBO_LBL, marginLeft: 8 }}>Shake</span>
                  <MboNum value={cam.shake || 0} step={0.05} onChange={(n) => { setCam((c) => ({ ...c, shake: Math.max(0, Math.min(2, n)) })); clearResult(); }} />
                </div>
                {Array.isArray(cam.keys) && cam.keys.length > 0 && (
                  <div style={MBO_SMALL}>
                    Using a {cam.keys.length}-key camera track from the generated scene — the Start/End fields above are ignored.{" "}
                    <button className="btn-link" style={{ fontSize: 10 }} onClick={() => { setCam((c) => { const n = { ...c }; delete n.keys; return n; }); clearResult(); }}>Drop track</button>
                  </div>
                )}
              </div>
            </div>

            <div className="card">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                <div className="card-label" style={{ margin: 0 }}>Objects ({objects.length})</div>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {MBO_SHAPES.map((s) => (
                    <button key={s} className="btn-action btn-inline" style={{ height: 26 }} onClick={() => addObject(s)} title={`Add ${s}`}>+ {s}</button>
                  ))}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12, maxHeight: 520, overflowY: "auto" }}>
                {!objects.length && <div className="video-hint" style={{ marginTop: 0 }}>No objects — add one above.</div>}
                {objects.map((o) => (
                  <div key={o.id} style={{ border: "0.5px solid var(--border-2)", borderRadius: 6, padding: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <input className="select-input" value={o.name} onChange={(e) => patchObject(o.id, { name: e.target.value })}
                        style={{ ...MBO_INPUT, flex: 1, minWidth: 0 }} />
                      <select className="select-input" value={o.shape} onChange={(e) => patchObject(o.id, { shape: e.target.value })}
                        style={{ ...MBO_INPUT, width: 86 }}>
                        {MBO_SHAPES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <input type="color" value={o.color} onChange={(e) => patchObject(o.id, { color: e.target.value })} style={MBO_SWATCH} />
                      <button className="btn-action btn-inline" style={{ height: 26 }} onClick={() => removeObject(o.id)} title="Remove">✕</button>
                    </div>
                    {(() => {
                      const dip = mboGroundDip(o);
                      return dip < -0.02 ? (
                        <div style={{ ...MBO_SMALL, color: "var(--danger)" }}>
                          ⚠ Sinks {Math.abs(dip).toFixed(2)}m through the ground. If it is airborne, set Pivot to 0,0,0 and
                          raise the landing key; if it hinges, put Pivot on the contact edge.
                        </div>
                      ) : null;
                    })()}
                    <MboVec label="Size" value={o.size} step={0.1} onChange={(v) => patchObject(o.id, { size: v })} />
                    <MboVec label="Pivot" value={o.pivot || [0, 0, 0]} step={0.1} onChange={(v) => patchObject(o.id, { pivot: v })} />
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ ...MBO_LBL, width: 42, flex: "0 0 42px" }}>Crowd</span>
                      <MboNum value={o.crowd?.count || 0} step={50}
                        onChange={(n) => patchObject(o.id, n > 1
                          ? { crowd: { ...(o.crowd || {}), count: Math.min(6000, Math.round(n)), area: o.crowd?.area || [20, 20], bob: o.crowd?.bob ?? 0.14, stride: o.crowd?.stride ?? 38, lag: o.crowd?.lag ?? 0.12 } }
                          : { crowd: null })} />
                      {o.crowd?.count > 1 && (
                        <React.Fragment>
                          <span style={MBO_SMALL}>area</span>
                          <MboNum value={o.crowd.area[0]} step={2} onChange={(n) => patchObject(o.id, { crowd: { ...o.crowd, area: [n, o.crowd.area[1]] } })} />
                          <MboNum value={o.crowd.area[1]} step={2} onChange={(n) => patchObject(o.id, { crowd: { ...o.crowd, area: [o.crowd.area[0], n] } })} />
                        </React.Fragment>
                      )}
                    </div>
                    <div style={{ ...MBO_SMALL, marginTop: -4 }}>
                      Pivot is the offset from centre to the point it rotates about — e.g. [0, {(-(o.size[1] || 2) / 2).toFixed(1)}, 0] to topple from its base.
                    </div>

                    <div style={{ borderTop: "0.5px solid var(--border)", paddingTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={MBO_LBL}>Keyframes ({(o.keys || []).length})</span>
                        <button className="btn-action btn-inline" style={{ height: 26 }} onClick={() => addKey(o.id)}>+ key</button>
                      </div>
                      {(o.keys || []).map((k, ki) => (
                        <div key={ki} style={{ display: "flex", flexDirection: "column", gap: 4, background: "var(--surface-2)", borderRadius: 4, padding: 6 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ ...MBO_SMALL, width: 42, flex: "0 0 42px" }}>t</span>
                            <MboNum value={k.t} step={0.05} width={54}
                              onChange={(n) => patchKey(o.id, ki, { t: Math.max(0, Math.min(1, n)) })} />
                            <select className="select-input" value={k.ease} onChange={(e) => patchKey(o.id, ki, { ease: e.target.value })}
                              style={{ ...MBO_INPUT, fontSize: 10, flex: 1 }}>
                              {MBO_EASES.map((e) => <option key={e} value={e}>{e}</option>)}
                            </select>
                            <button className="btn-action btn-inline" style={{ height: 24 }} onClick={() => removeKey(o.id, ki)}
                              disabled={(o.keys || []).length <= 1} title="Remove key">✕</button>
                          </div>
                          <MboVec label="pos" value={k.pos} onChange={(v) => patchKey(o.id, ki, { pos: v })} />
                          <MboVec label="rot°" value={k.rot} step={15} onChange={(v) => patchKey(o.id, ki, { rot: v })} />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  window.MotionBlockout = MotionBlockout;
})();
