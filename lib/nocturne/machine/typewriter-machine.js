// The typewriter: a lit 3D model drawn with three.js around the terminal (ported from the approved
// design in docs/preview/index.html). Physically based materials, soft shadows and a dark study
// environment for the reflections.
//
// The canvas covers the whole stage, but an invisible occluder in the paper plane hides everything
// behind the sheet, so the DOM terminal shows through. Only parts in front of the paper (the bail,
// the type head) and their shadows are drawn over it, never over the text area's characters.
//
// Units are CSS pixels: x to the right, y up (stage y negated), z towards the viewer, paper at
// z = 0. The model is rebuilt when the layout or theme changes and re-rendered only when asked.
//
// Plain JavaScript because three.js ships without TypeScript types; the API is typed in types.ts.

import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

import {grainTexture, haloTexture, knurlTexture, letteringMask, paperTexture, scaleEngraving} from './textures';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

/** A cylinder lying along the x axis. */
const cylX = (radius, length, segments = 64) => {
  const geometry = new THREE.CylinderGeometry(radius, radius, length, segments, 1);
  return geometry.rotateZ(Math.PI / 2);
};

/** A shallow dome facing the viewer (screw heads). */
const domeGeometry = (radius, flatten) => {
  const geometry = new THREE.SphereGeometry(radius, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2);
  return geometry.rotateX(Math.PI / 2).scale(1, 1, flatten);
};

/** A neutral dark study, rendered once into a PMREM environment map for reflections. */
function studyEnvironment(pmrem) {
  const room = new THREE.Scene();
  const wallMaterial = new THREE.MeshBasicMaterial({color: 0x0b0907, side: THREE.BackSide});
  room.add(new THREE.Mesh(new THREE.BoxGeometry(20, 12, 20), wallMaterial));
  const panel = (w, h, color, strength, position) => {
    const material = new THREE.MeshBasicMaterial({side: THREE.DoubleSide});
    material.color = new THREE.Color(color).multiplyScalar(strength);
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material);
    plane.position.set(position[0], position[1], position[2]);
    plane.lookAt(0, position[1] < 0 ? 10 : 0, 0);
    room.add(plane);
  };
  // A warm softbox above left, a cool window on the right, a long strip for edge highlights, a
  // warm bounce from the desk and a soft panel behind the viewer for front-facing chrome.
  panel(6, 2.2, 0xffe2b8, 6, [-4, 5.8, 3]);
  panel(2.2, 7, 0xcfd8ff, 2.2, [9.8, 1, -2]);
  panel(14, 0.5, 0xffffff, 3, [0, 5.9, -6]);
  panel(10, 6, 0x3a2a1c, 1, [0, -5.9, 0]);
  panel(12, 5, 0xfff0dc, 1.15, [1, 1.5, 9.8]);
  const target = pmrem.fromScene(room, 0.02);
  room.traverse((object) => {
    if (object.geometry) {
      object.geometry.dispose();
      object.material.dispose();
    }
  });
  return target;
}

function ribbonBand(curve, offset, width, segments) {
  const positions = [];
  const normals = [];
  const index = [];
  for (let i = 0; i <= segments; i++) {
    const u = i / segments;
    const point = curve.getPoint(u);
    const tangent = curve.getTangent(u);
    const side = new THREE.Vector3(-tangent.y, tangent.x, 0).normalize();
    const centre = point.clone().addScaledVector(side, offset);
    const a = centre.clone().addScaledVector(side, width / 2);
    const b = centre.clone().addScaledVector(side, -width / 2);
    positions.push(a.x, a.y, a.z, b.x, b.y, b.z);
    normals.push(side.x * 0.3, side.y * 0.3, 0.95, -side.x * 0.3, -side.y * 0.3, 0.95);
  }
  for (let i = 0; i < segments; i++) {
    const k = i * 2;
    index.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setIndex(index);
  return geometry;
}

/**
 * Creates the typewriter renderer on a canvas, or returns null when WebGL is unavailable (the
 * terminal then simply has no machine around it). `onReady` is called when a newly built model has
 * compiled its shaders and can be drawn.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {() => void} onReady
 * @returns {import('./types').Machine | null}
 */
export function createMachine(canvas, onReady) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({canvas, antialias: true, alpha: true, powerPreference: 'high-performance'});
  } catch (error) {
    console.warn('Typewriter model disabled: WebGL is not available.', error);
    return null;
  }
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;

  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = studyEnvironment(pmrem);
  const shared = {knurl: knurlTexture(60), grain: grainTexture(6, 40), halo: haloTexture()};

  let scene = null;
  let camera = null;
  let parts = {};
  let owned = [];
  let lastSpec = null;
  let lost = false;
  let ready = false;
  let generation = 0;

  const own = (texture) => {
    owned.push(texture);
    return texture;
  };

  function part(geometry, material, {cast = true, receive = true} = {}) {
    const object = new THREE.Mesh(geometry, material);
    object.castShadow = cast;
    object.receiveShadow = receive;
    return object;
  }

  function materials(spec) {
    const env = spec.theme.environment;
    const {knurl, grain} = shared;
    return {
      chrome: new THREE.MeshStandardMaterial({color: 0xf0f0f2, metalness: 1, roughness: 0.1, envMapIntensity: 1.7}),
      steel: new THREE.MeshStandardMaterial({color: 0xb7bcc3, metalness: 1, roughness: 0.32, envMapIntensity: 1.2}),
      brass: new THREE.MeshStandardMaterial({
        color: new THREE.Color(spec.theme.trim),
        metalness: 1,
        roughness: 0.22,
        envMapIntensity: 1.4
      }),
      enamel: new THREE.MeshPhysicalMaterial({
        color: 0x0a0908,
        roughness: 0.4,
        metalness: 0,
        clearcoat: 1,
        clearcoatRoughness: 0.05,
        envMapIntensity: 1,
        roughnessMap: grain
      }),
      enamelDeep: new THREE.MeshStandardMaterial({color: 0x050404, roughness: 0.85, envMapIntensity: env * 0.4}),
      rubber: new THREE.MeshStandardMaterial({
        color: 0x171514,
        roughness: 0.78,
        envMapIntensity: env * 0.6,
        bumpMap: grain,
        bumpScale: 0.4
      }),
      knurledRubber: new THREE.MeshStandardMaterial({
        color: 0x1a1817,
        roughness: 0.62,
        envMapIntensity: env * 0.7,
        normalMap: knurl
      }),
      bakelite: new THREE.MeshPhysicalMaterial({
        color: 0x0f0c0a,
        roughness: 0.3,
        clearcoat: 0.7,
        clearcoatRoughness: 0.15,
        envMapIntensity: env,
        normalMap: knurl
      }),
      gunmetal: new THREE.MeshStandardMaterial({
        color: 0x3b3d42,
        metalness: 1,
        roughness: 0.48,
        envMapIntensity: env * 0.7
      }),
      ribbonBlack: new THREE.MeshStandardMaterial({color: 0x121110, roughness: 0.9, side: THREE.DoubleSide}),
      ribbonRed: new THREE.MeshStandardMaterial({color: 0x86251b, roughness: 0.85, side: THREE.DoubleSide}),
      fabric: new THREE.MeshStandardMaterial({color: 0x0d0b0a, roughness: 0.95, bumpMap: grain, bumpScale: 0.6}),
      paper: new THREE.MeshStandardMaterial({
        map: own(paperTexture(spec.paper.color)),
        roughness: 0.92,
        envMapIntensity: env * 0.4
      }),
      bulb: new THREE.MeshStandardMaterial({
        color: 0xfff3dc,
        emissive: new THREE.Color(spec.theme.light),
        emissiveIntensity: 3.2,
        roughness: 0.2
      }),
      nickel: new THREE.MeshPhysicalMaterial({
        color: 0xece8e0,
        metalness: 1,
        roughness: 0.14,
        clearcoat: 0.3,
        clearcoatRoughness: 0.05,
        envMapIntensity: 2.6
      }),
      satinNickel: new THREE.MeshPhysicalMaterial({
        color: 0xe2ded6,
        metalness: 0.6,
        roughness: 0.3,
        clearcoat: 0.4,
        clearcoatRoughness: 0.12,
        envMapIntensity: 1.8
      }),
      gold: new THREE.MeshPhysicalMaterial({
        color: 0xe2b45a,
        metalness: 1,
        roughness: 0.2,
        clearcoat: 0.4,
        clearcoatRoughness: 0.1,
        envMapIntensity: 1.7
      })
    };
  }

  /** Geometry shared by the builders, derived from the stage layout and the text grid. */
  function measures(spec) {
    const {layout, grid} = spec;
    const sheet = layout.sheet;
    const gridLeft = grid.left;
    const gridRight = grid.left + grid.cols * grid.cellWidth;
    // The machine is proportioned to the margin beside the narrowest sheet, so it keeps its size
    // when the sheet is made wider.
    const margin = layout.margin;
    const platenLeft = layout.platen.left;
    const platenRight = layout.platen.right;
    return {
      W: layout.width,
      H: layout.height,
      sheet,
      margin,
      platenY: layout.platenY,
      platenR: layout.platenRadius,
      bailY: layout.bailY,
      machineH: layout.machineHeight,
      gridLeft,
      gridRight,
      cols: grid.cols,
      cellW: grid.cellWidth,
      platenLeft,
      platenRight,
      platenLen: platenRight - platenLeft,
      platenCx: (platenLeft + platenRight) / 2,
      earW: clamp(margin * 0.18, 14, 30),
      knobW: clamp(margin * 0.24, 18, 40)
    };
  }

  // The occluder hides what lies behind the sheet; the catcher receives shadows on the paper.
  function buildPaperPlane(m, mat, spec) {
    const {sheet} = m;
    const centre = [sheet.x + sheet.width / 2, -(sheet.y + sheet.height / 2)];
    const occluder = new THREE.Mesh(
      new THREE.PlaneGeometry(sheet.width, sheet.height),
      new THREE.MeshBasicMaterial({colorWrite: false})
    );
    occluder.position.set(centre[0], centre[1], 0);
    occluder.renderOrder = -1;
    // Shadows only fall near the bail and the type head, so only that band of paper receives them
    // (shading the whole sheet for shadows would cost a full-screen pass on every frame).
    const catchTop = Math.max(sheet.y, m.bailY - 160);
    const catchHeight = sheet.y + sheet.height - catchTop;
    const shadow = new THREE.ShadowMaterial({opacity: spec.paper.appearance === 'light' ? 0.4 : 0.6, color: 0x1a0f05});
    const catcher = new THREE.Mesh(new THREE.PlaneGeometry(sheet.width, catchHeight), shadow);
    catcher.position.set(centre[0], -(catchTop + catchHeight / 2), 0.2);
    catcher.receiveShadow = true;
    scene.add(occluder, catcher);
    // The sheet wrapping round the platen.
    const curlGeometry = new THREE.CylinderGeometry(
      m.platenR + 1.2,
      m.platenR + 1.2,
      sheet.width,
      64,
      1,
      true,
      -Math.PI * 0.02,
      Math.PI * 0.62
    );
    const curl = part(curlGeometry.rotateZ(Math.PI / 2), mat.paper, {cast: false});
    curl.position.set(sheet.x + sheet.width / 2, -m.platenY, -m.platenR);
    curl.rotation.x = Math.PI;
    scene.add(curl);
  }

  // Platen, shaft, end caps, side frames, knobs and the carriage-return lever.
  function buildPlaten(m, mat) {
    const {platenR, platenY, earW, knobW} = m;
    const platen = part(cylX(platenR, m.platenLen, 96), mat.rubber);
    platen.position.set(m.platenCx, -platenY, -platenR);
    const shaft = part(cylX(5, m.platenLen + 140, 24), mat.chrome);
    shaft.position.copy(platen.position);
    scene.add(platen, shaft);
    parts.platen = platen;
    for (const side of [-1, 1]) {
      const endX = side < 0 ? m.platenLeft : m.platenRight;
      const cap = part(cylX(platenR * 0.92, 6, 64), mat.chrome);
      cap.position.set(endX + side * 3, -platenY, -platenR);
      const ear = part(new RoundedBoxGeometry(earW, platenR * 3.4, platenR * 2.6, 4, 6), mat.enamel);
      ear.position.set(endX + side * (earW / 2 + 6), -(platenY + platenR * 0.15), -platenR * 0.9);
      const knobX = endX + side * (earW + 6 + knobW / 2);
      const knob = part(cylX(platenR * 1.08, knobW, 96), mat.bakelite);
      knob.position.set(knobX, -platenY, -platenR);
      const hub = part(cylX(platenR * 0.42, 4, 48), mat.chrome);
      hub.position.set(knobX + side * (knobW / 2 + 1), -platenY, -platenR);
      const collar = part(cylX(platenR * 0.55, 10, 48), mat.chrome);
      collar.position.set(knobX - side * (knobW / 2 + 5), -platenY, -platenR);
      scene.add(cap, ear, knob, hub, collar);
    }
    const leverReach = clamp(m.margin * 0.45, 22, 70);
    const leverX = m.platenLeft - earW;
    const leverCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(m.platenLeft - earW / 2, -(platenY - platenR * 0.5), 6),
      new THREE.Vector3(leverX - leverReach * 0.1, -(platenY - platenR * 1.8), 22),
      new THREE.Vector3(leverX - leverReach * 0.55, -(platenY - platenR * 2.5), 30),
      new THREE.Vector3(leverX - leverReach, -(platenY - platenR * 2.6), 26)
    ]);
    const grip = part(new THREE.CapsuleGeometry(6.5, 16, 8, 16).rotateZ(Math.PI / 2), mat.bakelite);
    grip.position.copy(leverCurve.getPoint(1));
    grip.position.x -= 10;
    scene.add(part(new THREE.TubeGeometry(leverCurve, 48, 3.2, 12), mat.chrome), grip);
  }

  // The paper bail with its knurled rubber rollers, resting on the sheet below the text.
  function buildBail(m, mat) {
    const {sheet, bailY, platenY, platenR} = m;
    const bailLeft = m.platenLeft - 4;
    const bailRight = m.platenRight + 4;
    const bail = part(cylX(3.6, bailRight - bailLeft, 32), mat.chrome);
    bail.position.set((bailLeft + bailRight) / 2, -bailY, 9);
    scene.add(bail);
    for (const x of [bailLeft, bailRight]) {
      const out = x < m.platenCx ? -1 : 1;
      const arm = new THREE.CatmullRomCurve3([
        new THREE.Vector3(x, -bailY, 9),
        new THREE.Vector3(x + out * 4, -(bailY + platenR * 0.6), 2),
        new THREE.Vector3(x + out * 8, -platenY, -platenR * 0.4)
      ]);
      scene.add(part(new THREE.TubeGeometry(arm, 24, 2.6, 10), mat.chrome));
    }
    const rollerW = clamp(sheet.width * 0.055, 30, 56);
    const rollerR = clamp(m.machineH * 0.045, 9, 14);
    for (const f of [0.2, 0.8]) {
      const x = sheet.x + sheet.width * f;
      const roller = part(cylX(rollerR, rollerW, 64), mat.knurledRubber);
      roller.position.set(x, -bailY, 9 + rollerR * 0.3);
      scene.add(roller);
      for (const side of [-1, 1]) {
        const cap = part(cylX(rollerR * 0.75, 3, 32), mat.chrome);
        cap.position.set(x + side * (rollerW / 2 + 1.5), -bailY, 9 + rollerR * 0.3);
        scene.add(cap);
      }
    }
  }

  // The body: a clear-coated enamel case tilted so its deck faces the viewer, with the type-bar
  // channel and the ribbon spools on the deck.
  function buildBody(m, mat) {
    const {H, platenY, platenR, machineH} = m;
    const tilt = 0.42;
    const deckVisible = machineH * 0.16;
    const deckDepth = deckVisible / Math.sin(tilt);
    const frontScreen = H - (platenY + platenR * 1.05 + deckVisible);
    const bodyHeight = (frontScreen + 40) / Math.cos(tilt);
    const bodyW = m.platenLen + 2 * (m.earW + m.knobW * 0.6);
    const body = new THREE.Group();
    body.position.set(m.platenCx, -(platenY + platenR * 1.05 + deckVisible), 30);
    body.rotation.x = tilt;
    scene.add(body);
    // Side profile (u = depth from the front, v = height), extruded along the width.
    const shoulder = Math.min(28, deckDepth * 0.3);
    const profile = new THREE.Shape();
    profile.moveTo(deckDepth, 0);
    profile.lineTo(shoulder, 0);
    profile.absarc(shoulder, -shoulder, shoulder, Math.PI / 2, Math.PI, false);
    profile.lineTo(0, -bodyHeight * 0.55);
    profile.quadraticCurveTo(-4, -bodyHeight * 0.75, 2, -bodyHeight);
    profile.lineTo(deckDepth, -bodyHeight);
    profile.closePath();
    const shellGeometry = new THREE.ExtrudeGeometry(profile, {
      depth: bodyW,
      bevelEnabled: true,
      bevelThickness: 6,
      bevelSize: 6,
      bevelSegments: 5,
      curveSegments: 24
    });
    shellGeometry.rotateY(Math.PI / 2);
    // Pull the bevel back so it never covers the front panel's scale and lettering.
    shellGeometry.translate(-bodyW / 2, -6, -6);
    body.add(part(shellGeometry, mat.enamel));
    const trimBack = part(cylX(1.6, bodyW - 60, 24), mat.chrome);
    trimBack.position.set(0, 0.6, -deckDepth + 6);
    body.add(trimBack);
    const channelW = m.gridRight - m.gridLeft + 70;
    const channel = part(new RoundedBoxGeometry(channelW, 8, deckDepth * 0.62, 3, 3), mat.enamelDeep, {cast: false});
    channel.position.set((m.gridLeft + m.gridRight) / 2 - m.platenCx, -2.5, -deckDepth * 0.5);
    body.add(channel);
    parts.body = body;
    buildSpools(m, mat, body, deckDepth);
    buildFrontPanel(m, mat, body, {tilt, shoulder, frontScreen});
  }

  function buildSpools(m, mat, body, deckDepth) {
    const {margin, W} = m;
    const radius = clamp(Math.min(margin * 0.5, m.machineH * 0.3), 34, 84);
    parts.spools = [];
    for (const side of [-1, 1]) {
      let x = Math.min(W - margin - radius * 0.15, W - radius - 8);
      if (side < 0) {
        x = Math.max(margin + radius * 0.15, radius + 8);
      }
      const spool = new THREE.Group();
      spool.position.set(x - m.platenCx, 0, -deckDepth * 0.5);
      const flange = part(new THREE.CylinderGeometry(radius, radius, 2.5, 72), mat.gunmetal);
      flange.position.y = 1.5;
      const wound = part(new THREE.CylinderGeometry(radius * 0.84, radius * 0.84, 13, 72), mat.fabric);
      wound.position.y = 9;
      const rim = part(new THREE.TorusGeometry(radius * 0.97, 1.6, 10, 72).rotateX(Math.PI / 2), mat.chrome);
      rim.position.y = 16;
      const hub = part(new THREE.CylinderGeometry(radius * 0.16, radius * 0.16, 7, 32), mat.chrome);
      hub.position.y = 18;
      const spokes = new THREE.Group();
      spokes.position.y = 16.5;
      for (let k = 0; k < 3; k++) {
        const spoke = part(new THREE.BoxGeometry(radius * 0.62, 1.6, 3), mat.gunmetal);
        spoke.position.x = radius * 0.31;
        const holder = new THREE.Group();
        holder.rotation.y = (k * Math.PI * 2) / 3;
        holder.add(spoke);
        spokes.add(holder);
      }
      spool.add(flange, wound, rim, hub, spokes);
      body.add(spool);
      parts.spools.push({group: spool, spokes, side, radius});
    }
  }

  // Front panel: a satin-nickel paper scale engraved with one tick per column, a gilt pointer
  // riding on it with the type head, and the gold-leaf name between two fine gilt rules.
  function buildFrontPanel(m, mat, body, {tilt, shoulder, frontScreen}) {
    const cosT = Math.cos(tilt);
    const toLocal = (below) => -below / cosT;
    const barTop = shoulder * cosT + clamp(frontScreen * 0.1, 7, 14);
    const barH = clamp(frontScreen * 0.24, 18, 30);
    const scaleW = m.gridRight - m.gridLeft + 44;
    const scaleY = toLocal(barTop + barH / 2);
    const scaleGroup = new THREE.Group();
    scaleGroup.position.set((m.gridLeft + m.gridRight) / 2 - m.platenCx, scaleY, 1.6);
    // Angled up towards the viewer, as scale bars are.
    scaleGroup.rotation.x = -tilt * 0.85;
    body.add(scaleGroup);
    scaleGroup.add(part(new RoundedBoxGeometry(scaleW, barH, 3.2, 4, Math.min(3, barH * 0.2)), mat.satinNickel));
    const ticks = {cols: m.cols, cell: m.cellW, offset: 8, serif: m.serif};
    const engraving = own(scaleEngraving({...ticks, width: scaleW - 28, height: barH * 0.86}));
    const engravingMaterial = new THREE.MeshStandardMaterial({map: engraving, transparent: true, roughness: 0.6});
    const engraved = part(new THREE.PlaneGeometry(scaleW - 28, barH * 0.86), engravingMaterial, {cast: false});
    engraved.position.z = 1.65;
    scaleGroup.add(engraved);
    for (const side of [-1, 1]) {
      const x = side * (scaleW / 2 - 7);
      const screw = part(domeGeometry(2.6, 0.45), mat.nickel, {cast: false});
      screw.position.set(x, 0, 1.6);
      const slot = part(new THREE.BoxGeometry(4, 0.6, 0.4), mat.enamelDeep, {cast: false});
      slot.position.set(x, 0, 2.8);
      slot.rotation.z = 0.7 * side;
      scaleGroup.add(screw, slot);
    }
    const arrow = new THREE.Shape();
    arrow.moveTo(-4.5, 0);
    arrow.lineTo(4.5, 0);
    arrow.lineTo(0, -7.5);
    arrow.closePath();
    const arrowGeometry = new THREE.ExtrudeGeometry(arrow, {
      depth: 1.2,
      bevelEnabled: true,
      bevelThickness: 0.6,
      bevelSize: 0.5,
      bevelSegments: 3
    });
    const pointer = part(arrowGeometry, mat.gold, {cast: false});
    const barLocalH = barH / cosT;
    pointer.position.set(0, scaleY + barLocalH / 2 + 6.5, 4.2);
    body.add(pointer);
    parts.pointer = pointer;

    const space = frontScreen - barTop - barH;
    const letterH = clamp(space * 0.22, 11, 17);
    const plateY = toLocal(barTop + barH + clamp(space * 0.42, 14, 34));
    const plateW = letterH * 9.5;
    const plateH = letterH / cosT + 6;
    const mask = {text: 'NOCTURNE', width: plateW, height: plateH, serif: m.serif};
    const gilt = new THREE.MeshPhysicalMaterial({
      color: 0xffd47a,
      metalness: 1,
      roughness: 0.26,
      clearcoat: 0.6,
      clearcoatRoughness: 0.06,
      envMapIntensity: 3.2,
      emissive: 0x8a5a16,
      emissiveIntensity: 1.1,
      transparent: true,
      alphaMap: own(letteringMask({...mask, blur: 0})),
      bumpMap: own(letteringMask({...mask, blur: 0.9})),
      bumpScale: 2.2
    });
    const lettering = part(new THREE.PlaneGeometry(plateW, plateH), gilt, {cast: false});
    lettering.position.set(0, plateY, 1.4);
    body.add(lettering);
    for (const side of [-1, 1]) {
      const ruleW = clamp(plateW * 0.55, 40, 120);
      const rule = part(new THREE.BoxGeometry(ruleW, 0.7, 0.5), mat.gold, {cast: false});
      rule.position.set(side * (plateW / 2 + ruleW / 2 + 6), plateY, 1);
      const diamond = part(new THREE.BoxGeometry(3.2, 3.2, 0.8).rotateZ(Math.PI / 4), mat.gold, {cast: false});
      diamond.position.set(side * (plateW / 2 + ruleW + 9), plateY, 1);
      body.add(rule, diamond);
    }
  }

  // The type head: card holder, ribbon vibrator, type guide, paper wire and the carriage lamp. It
  // rides a guide rail on two bushings; a rack below has one tooth per text column, so the
  // escapement moves the head one tooth per keystroke. The head hangs from the rail (a pivot), so
  // it sways with inertia when it accelerates or hits the margin stop.
  function buildHead(m, mat, spec) {
    const {bailY, platenY, platenR} = m;
    const head = new THREE.Group();
    scene.add(head);
    parts.head = head;
    const strikeGroup = new THREE.Group();
    const cw = clamp(m.machineH * 0.2, 44, 64);
    const headTop = bailY + 10;
    const holderBottom = platenY + platenR;
    const holderH = holderBottom - headTop;
    buildCardHolder(mat, strikeGroup, {cw, holderH, holderBottom});

    const vibrator = new THREE.Group();
    vibrator.position.set(0, -(headTop + holderH * 0.25), 16);
    const fork = new THREE.Shape();
    fork.moveTo(-14, 6);
    fork.lineTo(-14, -9);
    fork.lineTo(14, -9);
    fork.lineTo(14, 6);
    fork.lineTo(11.5, 6);
    fork.lineTo(11.5, -6.5);
    fork.lineTo(-11.5, -6.5);
    fork.lineTo(-11.5, 6);
    fork.closePath();
    const forkGeometry = new THREE.ExtrudeGeometry(fork, {
      depth: 1.6,
      bevelEnabled: true,
      bevelThickness: 0.5,
      bevelSize: 0.5,
      bevelSegments: 2
    });
    const ribbonTop = part(new THREE.BoxGeometry(23, 3.6, 1.2), mat.ribbonBlack);
    ribbonTop.position.set(0, 0.2, 0.6);
    const ribbonBottom = part(new THREE.BoxGeometry(23, 3.4, 1.2), mat.ribbonRed);
    ribbonBottom.position.set(0, -3.3, 0.6);
    vibrator.add(part(forkGeometry, mat.chrome), ribbonTop, ribbonBottom);
    parts.vibrator = vibrator;
    parts.vibratorY = vibrator.position.y;

    const needle = part(new THREE.CylinderGeometry(0.7, 0.7, holderH * 0.55, 12), mat.brass);
    needle.position.set(0, -(headTop + holderH * 0.28), 15.5);
    const tip = part(new THREE.ConeGeometry(2.6, 7, 16), mat.brass);
    tip.position.set(0, -(headTop - 4), 15.5);
    const wire = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-cw * 0.55, -(bailY + 8), 4),
      new THREE.Vector3(-cw * 0.55, -(bailY - 6), 2.4),
      new THREE.Vector3(0, -(bailY - 9), 2),
      new THREE.Vector3(cw * 0.55, -(bailY - 6), 2.4),
      new THREE.Vector3(cw * 0.55, -(bailY + 8), 4)
    ]);
    strikeGroup.add(vibrator, needle, tip, part(new THREE.TubeGeometry(wire, 40, 0.9, 8), mat.chrome));

    const light = new THREE.Color(spec.theme.light);
    const bulb = part(new THREE.SphereGeometry(3.4, 24, 16), mat.bulb, {cast: false, receive: false});
    bulb.position.set(0, -(headTop + 2), 22);
    const lamp = new THREE.PointLight(light, 0, 0, 2);
    lamp.position.set(0, -(headTop + 2), 30);
    // The halo the eye and a lens see round a small bright source.
    const haloMaterial = new THREE.SpriteMaterial({
      map: shared.halo,
      color: light,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false
    });
    const halo = new THREE.Sprite(haloMaterial);
    halo.scale.set(90, 90, 1);
    halo.position.set(0, -(headTop + 2), 28);
    strikeGroup.add(bulb, lamp, halo);
    Object.assign(parts, {bulb, lamp, halo});

    const railY = platenY + platenR * 1.35;
    const railZ = 24;
    const rail = part(cylX(3.2, m.platenLen + 30, 32), mat.chrome);
    rail.position.set(m.platenCx, -railY, railZ);
    const rack = part(new RoundedBoxGeometry(m.gridRight - m.gridLeft + 40, 5, 4, 2, 1), mat.steel);
    rack.position.set((m.gridLeft + m.gridRight) / 2, -(railY + 9), railZ - 3);
    const toothGeometry = new THREE.BoxGeometry(Math.max(0.9, m.cellW * 0.38), 2.6, 3.2);
    const teeth = new THREE.InstancedMesh(toothGeometry, mat.steel, m.cols + 1);
    const matrix = new THREE.Matrix4();
    for (let c = 0; c <= m.cols; c++) {
      matrix.makeTranslation(m.gridLeft + c * m.cellW, -(railY + 5.4), railZ - 3);
      teeth.setMatrixAt(c, matrix);
    }
    teeth.castShadow = true;
    teeth.receiveShadow = true;
    scene.add(rail, rack, teeth);

    // The pivot sits on the rail; the carrier hangs from it and carries the striking parts.
    const swing = new THREE.Group();
    swing.position.set(0, -railY, railZ);
    const carrier = new THREE.Group();
    carrier.position.set(0, railY, -railZ);
    swing.add(carrier);
    carrier.add(strikeGroup);
    head.add(swing);
    const blockTop = holderBottom - 5;
    const blockBottom = railY + 10;
    const blockY = -(blockTop + blockBottom) / 2;
    const block = part(new RoundedBoxGeometry(cw * 1.18, blockBottom - blockTop, 17, 4, 3), mat.nickel);
    block.position.set(0, blockY, railZ - 4);
    carrier.add(block);
    for (const side of [-1, 1]) {
      const bushing = part(cylX(5.2, 9, 32), mat.nickel);
      bushing.position.set(side * cw * 0.42, -railY, railZ);
      const bolt = part(domeGeometry(2, 0.45), mat.steel, {cast: false});
      bolt.position.set(side * cw * 0.3, blockY, railZ + 4.6);
      carrier.add(bushing, bolt);
    }
    const pawl = part(new THREE.BoxGeometry(2.2, 7, 2.4), mat.steel);
    pawl.position.set(0, -(railY + 7.5), railZ - 3);
    carrier.add(pawl);
    parts.swing = swing;
    parts.strikeGroup = strikeGroup;
  }

  // Card holder: a polished nickel plate with machined bevels: chamfered base, two tapered pointer
  // fingers, a ribbon window, a crossbar engraved with alignment ticks and two domed screws.
  function buildCardHolder(mat, group, {cw, holderH, holderBottom}) {
    const fx = cw * 0.34;
    const fw = 4.2;
    const outline = [
      [-cw / 2 + 3, 0],
      [cw / 2 - 3, 0],
      [cw / 2, 3],
      [cw / 2, holderH * 0.42],
      [fx + fw + 2, holderH * 0.46],
      [fx + fw, holderH - 11],
      [fx + 0.6, holderH],
      [fx - 0.6, holderH],
      [fx - fw, holderH - 11],
      [fx - fw, holderH * 0.55],
      [-fx + fw, holderH * 0.55],
      [-fx + fw, holderH - 11],
      [-fx + 0.6, holderH],
      [-fx - 0.6, holderH],
      [-fx - fw, holderH - 11],
      [-fx - fw - 2, holderH * 0.46],
      [-cw / 2, holderH * 0.42],
      [-cw / 2, 3]
    ];
    const plateShape = new THREE.Shape(outline.map(([x, y]) => new THREE.Vector2(x, y)));
    const windowHalf = 3.2;
    const windowBottom = holderH * 0.1 + windowHalf;
    const windowTop = holderH * 0.36 - windowHalf;
    const ribbonWindow = new THREE.Path();
    ribbonWindow.moveTo(-windowHalf, windowBottom);
    ribbonWindow.absarc(0, windowBottom, windowHalf, Math.PI, 0, false);
    ribbonWindow.lineTo(windowHalf, windowTop);
    ribbonWindow.absarc(0, windowTop, windowHalf, 0, Math.PI, false);
    ribbonWindow.closePath();
    plateShape.holes.push(ribbonWindow);
    const plateGeometry = new THREE.ExtrudeGeometry(plateShape, {
      depth: 2.6,
      bevelEnabled: true,
      bevelThickness: 1.3,
      bevelSize: 1.1,
      bevelSegments: 5,
      curveSegments: 16
    });
    const plate = part(plateGeometry, mat.nickel);
    plate.position.set(0, -holderBottom, 13.5);
    group.add(plate);
    const barY = -(holderBottom - holderH * 0.72);
    const crossbar = part(new RoundedBoxGeometry(fx * 2 + fw * 2, 4.4, 2.4, 2, 1), mat.nickel);
    crossbar.position.set(0, barY, 17.2);
    group.add(crossbar);
    for (let i = -6; i <= 6; i++) {
      let length = 1.4;
      if (i === 0) {
        length = 3.4;
      } else if (i % 3 === 0) {
        length = 2.4;
      }
      const tick = part(new THREE.PlaneGeometry(0.45, length), mat.enamelDeep, {cast: false});
      tick.position.set(i * 2.2, barY + 2.2 - length / 2, 18.45);
      group.add(tick);
    }
    for (const side of [-1, 1]) {
      const screwY = -(holderBottom - holderH * 0.17);
      const screw = part(domeGeometry(3.3, 0.42), mat.nickel);
      screw.position.set(side * cw * 0.3, screwY, 17.6);
      const slot = part(new THREE.BoxGeometry(5.2, 0.8, 0.5), mat.enamelDeep, {cast: false});
      slot.position.set(side * cw * 0.3, screwY, 19.05);
      slot.rotation.z = side * 0.6;
      group.add(screw, slot);
    }
  }

  // Hemisphere fill, a shadow-casting key, a rim for chrome edges and a cool fill from the side.
  function buildLights(m, spec) {
    const {W, H} = m;
    const {theme} = spec;
    const sky = new THREE.Color(theme.room).lerp(new THREE.Color(0xffffff), 0.35);
    scene.add(new THREE.HemisphereLight(sky, 0x050403, theme.source === 'carriage' ? 0.55 : 0.4));
    const key = new THREE.DirectionalLight(0xfff2e0, 2.4);
    let direction = [-0.35, 0.8, 0.75];
    if (theme.source === 'desk-lamp') {
      direction = [0.55, 0.75, 0.6];
      key.color = new THREE.Color(theme.light).lerp(new THREE.Color(0xffffff), 0.35);
    } else if (theme.source === 'moonlight') {
      direction = [-0.6, 0.7, 0.55];
      key.color = new THREE.Color(0xc8d2ff);
    }
    key.position.set(W / 2 + direction[0] * 1500, -H * 0.7 + direction[1] * 1500, direction[2] * 1500);
    key.target.position.set(W / 2, -H * 0.75, 0);
    if (spec.quality !== 'low') {
      key.castShadow = true;
      const size = spec.quality === 'high' ? 2048 : 1024;
      key.shadow.mapSize.set(size, size);
      const box = key.shadow.camera;
      box.left = -W * 0.75;
      box.right = W * 0.75;
      box.top = H * 0.7;
      box.bottom = -H * 0.7;
      box.near = 100;
      box.far = 4000;
      key.shadow.bias = -0.0006;
      key.shadow.normalBias = 0.4;
      key.shadow.radius = 7;
      key.shadow.blurSamples = 20;
    }
    scene.add(key, key.target);
    parts.key = key;
    const rim = new THREE.DirectionalLight(0xffffff, 1.1);
    rim.position.set(W / 2, 400, -900);
    const fill = new THREE.DirectionalLight(theme.source === 'carriage' ? 0xd8e0ff : 0x9aa4c8, 0.45);
    fill.position.set(W * 1.4, -H * 0.4, 700);
    scene.add(rim, fill);
  }

  function disposeScene() {
    if (!scene) {
      return;
    }
    scene.traverse((object) => {
      if (object.geometry) {
        object.geometry.dispose();
      }
      if (object.material) {
        object.material.dispose();
      }
    });
    owned.forEach((texture) => texture.dispose());
    owned = [];
    parts = {};
    scene = null;
  }

  function build(spec) {
    lastSpec = spec;
    if (lost) {
      return;
    }
    disposeScene();
    const {layout} = spec;
    renderer.setPixelRatio(spec.quality === 'low' ? 1 : spec.pixelRatio);
    renderer.setSize(layout.width, layout.height, false);
    renderer.toneMappingExposure = spec.theme.exposure;
    renderer.shadowMap.type = spec.quality === 'high' ? THREE.VSMShadowMap : THREE.PCFSoftShadowMap;
    renderer.shadowMap.needsUpdate = true;
    scene = new THREE.Scene();
    scene.environment = environment.texture;
    camera = new THREE.OrthographicCamera(0, layout.width, 0, -layout.height, -4000, 4000);
    camera.position.set(0, 0, 1000);
    const m = {...measures(spec), serif: spec.serif};
    const mat = materials(spec);
    buildPaperPlane(m, mat, spec);
    buildPlaten(m, mat);
    buildBail(m, mat);
    buildBody(m, mat);
    buildHead(m, mat, spec);
    buildLights(m, spec);
    parts.platenCx = m.platenCx;
    const band = (material) => part(new THREE.BufferGeometry(), material);
    parts.ribbon = [band(mat.ribbonBlack), band(mat.ribbonRed)];
    scene.add(parts.ribbon[0], parts.ribbon[1]);
    parts.source = spec.theme.source;
    generation += 1;
    whenCompiled(generation);
  }

  // Shaders compile on the driver's own threads (KHR_parallel_shader_compile) while the terminal
  // keeps running; the model is drawn once they are ready. On Windows they go through Direct3D's
  // compiler, which can take seconds for physically based materials.
  function whenCompiled(current) {
    ready = false;
    const compiled = Array.from(renderer.compile(scene, camera));
    const poll = () => {
      if (current !== generation || !scene) {
        return;
      }
      const compiling = compiled.some((material) => {
        const program = renderer.properties.get(material).currentProgram;
        return program && !program.isReady();
      });
      if (compiling) {
        setTimeout(poll, 32);
        return;
      }
      ready = true;
      onReady();
    };
    poll();
  }

  // The ribbon runs from the top of the left spool up through the vibrator and down to the right.
  function ribbonPoints() {
    const [left, right] = parts.spools;
    const spoolTop = (spool) => {
      const {position} = spool.group;
      const x = position.x - spool.side * spool.radius * 0.55;
      return parts.body.localToWorld(new THREE.Vector3(x, 16, position.z - spool.radius * 0.2));
    };
    const enter = parts.vibrator.localToWorld(new THREE.Vector3(-11, -1.5, 0.6));
    const leave = parts.vibrator.localToWorld(new THREE.Vector3(11, -1.5, 0.6));
    const a = spoolTop(left);
    const b = spoolTop(right);
    const towards = (from, to) => {
      const point = from.clone().lerp(to, 0.5);
      point.z += 8;
      return point;
    };
    return [a, towards(a, enter), enter, leave, towards(b, leave), b];
  }

  function render(state) {
    if (!scene || lost || !ready) {
      return false;
    }
    parts.head.position.x = state.headX;
    parts.pointer.position.x = state.headX - parts.platenCx;
    parts.platen.rotation.x = state.platenTurn * Math.PI * 2;
    parts.vibrator.position.y = parts.vibratorY + state.vibrator * 7;
    for (const spool of parts.spools) {
      spool.spokes.rotation.y = state.spool * spool.side;
    }
    parts.swing.rotation.z = state.sway;
    parts.strikeGroup.position.z = -3.5 * clamp(state.strike, 0, 1.2);
    scene.updateMatrixWorld(true);
    const curve = new THREE.CatmullRomCurve3(ribbonPoints(), false, 'centripetal');
    parts.ribbon.forEach((band, i) => {
      band.geometry.dispose();
      band.geometry = ribbonBand(curve, i === 0 ? 1.8 : -1.8, 3.6, 160);
    });
    const lampOn = state.lamp && parts.source === 'carriage';
    parts.lamp.intensity = lampOn ? 26000 * state.intensity : 0;
    parts.bulb.visible = lampOn;
    parts.halo.visible = lampOn;
    parts.halo.material.opacity = 0.55 * Math.min(1.5, state.intensity);
    parts.key.intensity = (parts.source === 'carriage' ? 3 : 2.2) * (state.lamp ? 1 : 0.6);
    renderer.render(scene, camera);
    return true;
  }

  const onLost = (event) => {
    event.preventDefault();
    lost = true;
  };
  const onRestored = () => {
    lost = false;
    if (lastSpec) {
      build(lastSpec);
    }
  };
  canvas.addEventListener('webglcontextlost', onLost);
  canvas.addEventListener('webglcontextrestored', onRestored);

  function dispose() {
    canvas.removeEventListener('webglcontextlost', onLost);
    canvas.removeEventListener('webglcontextrestored', onRestored);
    disposeScene();
    Object.values(shared).forEach((texture) => texture.dispose());
    environment.dispose();
    pmrem.dispose();
    renderer.dispose();
  }

  return {build, render, dispose};
}
