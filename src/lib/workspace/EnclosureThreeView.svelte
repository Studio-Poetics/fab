<script lang="ts">
  import { onMount } from 'svelte';
  import * as THREE from 'three';
  import { encFab } from '$stores/enclosures.svelte';
  import { CUTOUT_DIMS, type Cutout, type CutoutDim } from '$modules/enclosures/types';

  let canvas: HTMLCanvasElement;
  let renderer: THREE.WebGLRenderer;
  let scene:    THREE.Scene;
  let camera:   THREE.PerspectiveCamera;
  let rafId:    number;
  let meshGroup: THREE.Group;
  let autoSpin  = true;

  let isOrbiting = $state(false);
  let azimuth    = $state(0.65);
  let elevation  = $state(0.32);
  let radius     = $state(800);
  let lastMX = 0, lastMY = 0;

  const PAL: number[] = [0xF6F5F3, 0xEDECE9, 0xE8E7E4, 0xE2E1DC, 0xDDD8CF];

  // ── Cutout hole path builder ────────────────────────────────────────────────
  // sx, sy = shape-space centre of the cutout hole
  function makeCutoutPath(c: Cutout, dim: CutoutDim, sx: number, sy: number): THREE.Path {
    const cw = c.w ?? dim.w;
    const ch = c.h ?? dim.h;
    const path = new THREE.Path();

    switch (dim.shape) {
      case 'circle': {
        const r = (c.d ?? dim.w) / 2;
        path.absarc(sx, sy, r, 0, Math.PI * 2, false);
        break;
      }
      case 'rounded_rect': {
        const r = Math.min(dim.r, cw / 2 - 0.05, ch / 2 - 0.05);
        path.moveTo(sx - cw/2 + r, sy - ch/2);
        path.lineTo(sx + cw/2 - r, sy - ch/2);
        path.absarc(sx + cw/2 - r, sy - ch/2 + r, r, -Math.PI/2, 0, false);
        path.lineTo(sx + cw/2, sy + ch/2 - r);
        path.absarc(sx + cw/2 - r, sy + ch/2 - r, r, 0, Math.PI/2, false);
        path.lineTo(sx - cw/2 + r, sy + ch/2);
        path.absarc(sx - cw/2 + r, sy + ch/2 - r, r, Math.PI/2, Math.PI, false);
        path.lineTo(sx - cw/2, sy - ch/2 + r);
        path.absarc(sx - cw/2 + r, sy - ch/2 + r, r, Math.PI, Math.PI * 3/2, false);
        path.closePath();
        break;
      }
      case 'trapezoid': {
        // wider edge at high sy (panel top, world-top after Y-flip)
        const tw = cw, bw = dim.bottomW;
        path.moveTo(sx - bw/2, sy - ch/2);
        path.lineTo(sx + bw/2, sy - ch/2);
        path.lineTo(sx + tw/2, sy + ch/2);
        path.lineTo(sx - tw/2, sy + ch/2);
        path.closePath();
        break;
      }
      case 'chamfered_rect': {
        const cs = Math.min(dim.chamfer, cw/3, ch/3);
        path.moveTo(sx - cw/2,      sy - ch/2);
        path.lineTo(sx + cw/2,      sy - ch/2);
        path.lineTo(sx + cw/2,      sy + ch/2 - cs);
        path.lineTo(sx + cw/2 - cs, sy + ch/2);
        path.lineTo(sx - cw/2 + cs, sy + ch/2);
        path.lineTo(sx - cw/2,      sy + ch/2 - cs);
        path.closePath();
        break;
      }
      default: { // 'rect'
        path.moveTo(sx - cw/2, sy - ch/2);
        path.lineTo(sx + cw/2, sy - ch/2);
        path.lineTo(sx + cw/2, sy + ch/2);
        path.lineTo(sx - cw/2, sy + ch/2);
        path.closePath();
      }
    }
    return path;
  }

  // ── Panel geometry with cutout holes via ExtrudeGeometry ───────────────────
  // shapeW/shapeH = 2D outline dimensions; depth = extrusion distance (= material t)
  // cuts: array of {sx, sy} shape-space hole centres + the Cutout object
  function makePanelGeo(
    shapeW: number, shapeH: number, depth: number,
    cuts: Array<{ c: Cutout; sx: number; sy: number }>,
  ): THREE.ExtrudeGeometry {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(shapeW, 0);
    shape.lineTo(shapeW, shapeH);
    shape.lineTo(0, shapeH);
    shape.closePath();

    for (const { c, sx, sy } of cuts) {
      // Clip holes to the panel interior; skip if centre is clearly off-panel
      if (sx < -30 || sx > shapeW + 30 || sy < -30 || sy > shapeH + 30) continue;
      const dim = CUTOUT_DIMS[c.type];
      shape.holes.push(makeCutoutPath(c, dim, sx, sy));
    }

    return new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
  }

  // ── Build / rebuild Three.js scene ─────────────────────────────────────────
  function clearGroup(g: THREE.Group) {
    while (g.children.length) {
      const child = g.children[0];
      g.remove(child);
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        (child.material as THREE.Material).dispose();
      }
      if (child instanceof THREE.LineSegments) {
        child.geometry.dispose();
        (child.material as THREE.Material).dispose();
      }
    }
  }

  function addPanel(
    geo: THREE.ExtrudeGeometry,
    color: number,
    opacity: number,
    worldPos: THREE.Vector3,
    rotX = 0, rotY = 0,
    center: THREE.Vector3,
  ) {
    if (rotX) geo.rotateX(rotX);
    if (rotY) geo.rotateY(rotY);

    const transparent = opacity < 1;
    const mat = new THREE.MeshPhongMaterial({
      color, specular: 0x222222, shininess: 8,
      transparent, opacity, depthWrite: !transparent,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(
      worldPos.x - center.x,
      worldPos.y - center.y,
      worldPos.z - center.z,
    );
    mesh.castShadow    = true;
    mesh.receiveShadow = true;

    const edgeGeo = new THREE.EdgesGeometry(geo, 10);
    const edgeMat = new THREE.LineBasicMaterial({
      color: 0x0C0C0B,
      transparent,
      opacity: transparent ? 0.2 : 1,
    });
    mesh.add(new THREE.LineSegments(edgeGeo, edgeMat));

    meshGroup.add(mesh);
  }

  function buildScene() {
    if (!meshGroup) return;
    clearGroup(meshGroup);

    const { width: W, height: H, depth: D, thickness: t, cutouts } = encFab.params;
    if (W <= 0 || H <= 0 || D <= 0 || t <= 0) return;

    const center = new THREE.Vector3(W / 2, H / 2, D / 2);
    const diag   = Math.sqrt(W * W + H * H + D * D);
    radius = diag * 2.2;

    const cutsFor = (side: string) =>
      cutouts.filter(c => c.panel === side || (side === 'front' && !c.panel));

    // ── FRONT (outer face at z=D) ───────────────────────────────────────────
    // Slab: (W-2t) × H, extruded t in +Z.  pos=(t, 0, D-t).
    // Panel editor x=0 is at the outer left face (world x=0); slab starts at x=t.
    // → shape_x = c.x - t,  shape_y = H - c.y  (Y-flip)
    {
      const sw = W - 2*t, sh = H;
      const cuts = cutsFor('front').map(c => ({
        c, sx: c.x - t, sy: H - c.y,
      }));
      const geo = makePanelGeo(sw, sh, t, cuts);
      addPanel(geo, PAL[1], 1, new THREE.Vector3(t, 0, D - t), 0, 0, center);
    }

    // ── BACK (outer face at z=0) ────────────────────────────────────────────
    // Slab: (W-2t) × H, extruded t in +Z.  pos=(t, 0, 0).
    // Outer face is the shape face (z=0); inner at z=t.
    // Same x/y mapping as front (panel editor coords share the same left-right convention).
    {
      const sw = W - 2*t, sh = H;
      const cuts = cutsFor('back').map(c => ({
        c, sx: c.x - t, sy: H - c.y,
      }));
      const geo = makePanelGeo(sw, sh, t, cuts);
      addPanel(geo, PAL[1], 1, new THREE.Vector3(t, 0, 0), 0, 0, center);
    }

    // ── LEFT (outer face at x=0) ────────────────────────────────────────────
    // Shape: D × H in XY; rotateY(+π/2) maps XY→YZ, extrusion → +X.
    // After rotation: shape u=0→z=D (front), u=D→z=0 (back); v→y.
    // pos=(0, 0, D).
    // Panel editor: x goes front→back (0=front), y goes top→bottom.
    // → shape_u = c.x,  shape_v = H - c.y
    {
      const sw = D, sh = H;
      const cuts = cutsFor('left').map(c => ({
        c, sx: c.x, sy: H - c.y,
      }));
      const geo = makePanelGeo(sw, sh, t, cuts);
      addPanel(geo, PAL[2], 1, new THREE.Vector3(0, 0, D), 0, Math.PI / 2, center);
    }

    // ── RIGHT (outer face at x=W) ───────────────────────────────────────────
    // Shape: D × H in XY; rotateY(-π/2) maps extrusion → -X.
    // After rotation: shape u=0→z=0 (back), u=D→z=D (front).
    // pos=(W, 0, 0).
    // Panel editor for right panel: x=0 is back of box (same convention as left mirrored).
    // → shape_u = c.x,  shape_v = H - c.y
    {
      const sw = D, sh = H;
      const cuts = cutsFor('right').map(c => ({
        c, sx: c.x, sy: H - c.y,
      }));
      const geo = makePanelGeo(sw, sh, t, cuts);
      addPanel(geo, PAL[2], 1, new THREE.Vector3(W, 0, 0), 0, -Math.PI / 2, center);
    }

    // ── BOTTOM (outer face at y=0) ──────────────────────────────────────────
    // Shape: (W-2t) × (D-2t) in XY; rotateX(-π/2) maps to XZ plane, extrusion → +Y.
    // After rotation: shape u→x, v→z (v=0 at front z=D-t side after translate).
    // pos=(t, 0, t).
    // Panel editor TOP has w=W, h=D. x maps to box x-axis, y maps to depth (front→back).
    // → shape_u = c.x - t,  shape_v = c.y - t
    {
      const sw = W - 2*t, sh = D - 2*t;
      const cuts = cutsFor('bottom').map(c => ({
        c, sx: c.x - t, sy: c.y - t,
      }));
      const geo = makePanelGeo(sw, sh, t, cuts);
      addPanel(geo, PAL[0], 1, new THREE.Vector3(t, 0, t), -Math.PI / 2, 0, center);
    }

    // ── TOP (outer face at y=H, ghost so interior visible) ──────────────────
    // Shape: (W-2t) × (D-2t); rotateX(+π/2) maps extrusion → -Y (outer at H).
    // pos=(t, H, t).
    // Panel editor: x→box x, y→depth (front→back).
    // → shape_u = c.x - t,  shape_v = c.y - t
    {
      const sw = W - 2*t, sh = D - 2*t;
      const cuts = cutsFor('top').map(c => ({
        c, sx: c.x - t, sy: c.y - t,
      }));
      const geo = makePanelGeo(sw, sh, t, cuts);
      addPanel(geo, PAL[0], 0.22, new THREE.Vector3(t, H, t), Math.PI / 2, 0, center);
    }

    // ── Ground plane ───────────────────────────────────────────────────────
    const floorSize = diag * 2.8;
    const floorGeo  = new THREE.PlaneGeometry(floorSize, floorSize);
    const floorMat  = new THREE.MeshPhongMaterial({ color: 0xDDD8CF });
    const floor     = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x   = -Math.PI / 2;
    floor.position.y   = -H / 2 - 1.5;
    floor.receiveShadow = true;
    meshGroup.add(floor);
  }

  // ── Camera ────────────────────────────────────────────────────────────────
  function updateCamera() {
    camera.position.set(
      radius * Math.cos(elevation) * Math.sin(azimuth),
      radius * Math.sin(elevation),
      radius * Math.cos(elevation) * Math.cos(azimuth),
    );
    camera.lookAt(0, 0, 0);
  }

  function loop() {
    rafId = requestAnimationFrame(loop);
    if (autoSpin) azimuth += 0.0022;
    updateCamera();
    renderer.render(scene, camera);
  }

  onMount(() => {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0xEDECE9);

    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0xEDECE9, 1200, 5000);

    camera = new THREE.PerspectiveCamera(28, 1, 1, 8000);

    scene.add(new THREE.AmbientLight(0xffffff, 0.75));

    const key = new THREE.DirectionalLight(0xfff8ee, 1.0);
    key.position.set(200, 400, 300);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.near = 50; key.shadow.camera.far  = 3000;
    key.shadow.camera.left = key.shadow.camera.bottom = -600;
    key.shadow.camera.right = key.shadow.camera.top   =  600;
    key.shadow.bias = -0.0005;
    scene.add(key);

    const fill = new THREE.DirectionalLight(0xd0e8ff, 0.28);
    fill.position.set(-200, 60, -300);
    scene.add(fill);

    meshGroup = new THREE.Group();
    scene.add(meshGroup);

    const ro = new ResizeObserver(() => {
      const w = canvas.clientWidth  || 1;
      const h = canvas.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    });
    ro.observe(canvas);
    renderer.setSize(canvas.clientWidth || 800, canvas.clientHeight || 600, false);
    camera.aspect = (canvas.clientWidth || 800) / (canvas.clientHeight || 600);
    camera.updateProjectionMatrix();

    buildScene();
    loop();
    return () => { cancelAnimationFrame(rafId); ro.disconnect(); renderer.dispose(); };
  });

  $effect(() => {
    const { width, height, depth, thickness, cutouts } = encFab.params;
    void width; void height; void depth; void thickness; void cutouts;
    buildScene();
  });

  // ── Interaction ────────────────────────────────────────────────────────────
  function onPD(e: PointerEvent) {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    isOrbiting = true; autoSpin = false;
    lastMX = e.clientX; lastMY = e.clientY;
  }
  function onPM(e: PointerEvent) {
    if (!isOrbiting) return;
    azimuth   -= (e.clientX - lastMX) * 0.007;
    elevation += (e.clientY - lastMY) * 0.004;
    elevation  = Math.max(-0.05, Math.min(1.3, elevation));
    lastMX = e.clientX; lastMY = e.clientY;
  }
  function onPU() { isOrbiting = false; }
  function onWheel(e: WheelEvent) {
    e.preventDefault();
    radius = Math.max(40, Math.min(5000, radius * (e.deltaY > 0 ? 1.08 : 0.93)));
  }
  function resetView() { azimuth = 0.65; elevation = 0.32; autoSpin = true; buildScene(); }

  const p = $derived(encFab.params);
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="wrap"
  onpointerdown={onPD} onpointermove={onPM} onpointerup={onPU} onpointercancel={onPU}
  onwheel={onWheel}
  style="cursor:{isOrbiting ? 'grabbing' : 'grab'}"
>
  <canvas bind:this={canvas}></canvas>

  <div class="hud-dims">
    {p.width}<span class="u">W</span>
    × {p.height}<span class="u">H</span>
    × {p.depth}<span class="u">D</span>
    <span class="sep">·</span>
    {p.thickness}<span class="u">mm</span>
    <span class="sep">·</span>
    {p.cutouts.length}<span class="u"> CUTOUTS</span>
  </div>

  <button class="btn-reset" onclick={resetView} title="Reset view">⟳</button>
  <div class="hint">DRAG TO ORBIT · SCROLL TO ZOOM</div>
</div>

<style>
  .wrap { position:absolute; inset:0; user-select:none; touch-action:none; }
  canvas { width:100%; height:100%; display:block; }

  .hud-dims {
    position:absolute; bottom:14px; left:50%; transform:translateX(-50%);
    font-family:'IBM Plex Mono',monospace; font-size:11px; letter-spacing:.06em;
    color:#5C5B57; pointer-events:none; white-space:nowrap;
  }
  .u   { font-size:8px; color:#AEADA9; margin-left:1px; }
  .sep { margin:0 6px; color:#CCCBC7; }

  .hint {
    position:absolute; top:12px; left:50%; transform:translateX(-50%);
    font-family:'IBM Plex Mono',monospace; font-size:8px; letter-spacing:.14em;
    color:#AEADA9; pointer-events:none;
  }

  .btn-reset {
    position:absolute; bottom:12px; right:14px;
    font-size:14px; color:#86857F;
    background:rgba(246,245,243,.85); border:1px solid #E2E1DE;
    border-radius:2px; width:28px; height:28px;
    display:flex; align-items:center; justify-content:center; cursor:pointer;
    transition:all .12s;
  }
  .btn-reset:hover { color:#0C0C0B; border-color:#AEADA9; }
</style>
