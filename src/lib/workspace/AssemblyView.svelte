<script lang="ts">
  import { onMount } from 'svelte';
  import * as THREE from 'three';
  import type { BoxParams } from '$modules/boxes/types';
  import type { Panel } from '$core/types';

  interface Props { panels: Panel[]; params: BoxParams; }
  let { params }: Props = $props();

  let canvas: HTMLCanvasElement;
  let renderer: THREE.WebGLRenderer;
  let scene:    THREE.Scene;
  let camera:   THREE.PerspectiveCamera;
  let rafId:    number;
  let meshGroup: THREE.Group;
  let autoSpin  = true;

  let isOrbiting = $state(false);
  let azimuth    = $state(0.55);
  let elevation  = $state(0.35);
  let radius     = $state(800);
  let lastMX = 0, lastMY = 0;

  // matches flat-view fills
  const PAL: number[] = [0xF6F5F3, 0xEDECE9, 0xE8E7E4, 0xE2E1DC, 0xDDD8CF];
  const HINGE_CLR = 0xE85D04;

  // ── slab spec: corner position + size + colour ────────────────────────────
  interface Slab {
    x:number; y:number; z:number;
    sx:number; sy:number; sz:number;
    color: number;
    opacity?: number;
  }

  // ── compute non-overlapping panel positions by box type ───────────────────
  function buildSpecs(p: BoxParams): Slab[] {
    const { width:W, height:H, depth:D, thickness:t,
            hingeH, sectionsX, sectionsY, boxType } = p;
    const s: Slab[] = [];

    const add = (sx:number, sy:number, sz:number,
                 x:number,  y:number,  z:number,
                 tint:number, opacity = 1) => {
      // skip degenerate panels (can happen when t is too large)
      if (sx > 0 && sy > 0 && sz > 0)
        s.push({ sx, sy, sz, x, y, z, color: PAL[tint] ?? PAL[0], opacity });
    };
    const addHinge = (sx:number, sy:number, sz:number,
                      x:number,  y:number,  z:number) =>
      s.push({ sx, sy, sz, x, y, z, color: HINGE_CLR });

    // ── primary panels: left/right span full H×D ──────────────────────────
    const addLR = () => {
      add(t, H, D, 0,   0, 0, 2);   // left
      add(t, H, D, W-t, 0, 0, 2);   // right
    };
    // ── secondary: front/back fit between L/R (width W-2t) ───────────────
    const addFB = () => {
      add(W-2*t, H, t, t, 0, 0,   1);   // back
      add(W-2*t, H, t, t, 0, D-t, 1);   // front
    };
    // ── tertiary: bottom/top fit inside all four walls ────────────────────
    const addBottom = () => add(W-2*t, t, D-2*t, t, 0,   t, 0);
    const addTop    = () => add(W-2*t, t, D-2*t, t, H-t, t, 0);

    switch (boxType) {
      case 'open':
        addLR(); addFB(); addBottom();
        break;

      case 'closed':
        addLR(); addFB(); addBottom(); addTop();
        break;

      case 'hinged': {
        addLR(); addFB(); addBottom();
        // back panel is part of the hinge strip — redraw as back+hinge+lid
        // overwrite the back face (last FB was front, second-to-last was back)
        // remove last two entries and re-add
        s.splice(s.length - 2, 2);      // remove FB
        // back panel portion
        add(W-2*t, H, t, t, 0, 0, 3);
        // hinge zone
        addHinge(W-2*t, hingeH, t, t, H, 0);
        // lid panel open at ~90° (lying behind the box)
        add(W-2*t, t, D, t, H+hingeH, -D, 3);
        break;
      }

      case 'slider': {
        const lidW = Math.max(1, W - 2*t - 0.4);
        addLR(); addFB(); addBottom();
        // lid partially slid out from the front (40% emerged)
        add(lidW, t, D, t, H-t, D * 0.4, 0);
        break;
      }

      case 'liftoff': {
        const lidH  = Math.max(t * 3, 15);
        const gap   = t * 2;
        const ly    = H + gap;            // lid base y
        // box (open tray)
        addLR(); addFB(); addBottom();
        // lid tray — same non-overlapping logic but for lidW×lidH×lidD
        //   lid L/R are primary (span full lidD=D+2t)
        add(t, lidH, D+2*t, -t,  ly, -t, 3);   // lid-left
        add(t, lidH, D+2*t,  W,  ly, -t, 3);   // lid-right
        //   lid F/B fit between lid L/R
        add(W, lidH, t,  0, ly, -t,  3);        // lid-back
        add(W, lidH, t,  0, ly,  D,  3);        // lid-front
        //   lid top fits inside all four lid walls
        add(W, t, D,  0, ly+lidH-t, 0, 0);      // lid-top
        break;
      }

      case 'multi': {
        addLR(); addFB(); addBottom();
        const iW = W-2*t, iH = H-2*t, iD = D-2*t;
        // Tiny inset prevents z-fighting with top/bottom panel faces
        const ep = 0.12;
        // Equal section dims: account for divider thickness so all cells are the same size
        const sW = Math.max(1, (iW - (sectionsX - 1) * t) / sectionsX);
        const sD = Math.max(1, (iD - (sectionsY - 1) * t) / sectionsY);

        // Semi-transparent top so internal dividers are visible
        add(W-2*t, t, D-2*t, t, H-t, t, 0, 0.25);

        // X-dividers: placed at i*(sW+t) so all sections are exactly sW wide
        for (let i = 1; i < sectionsX; i++) {
          const xp = i * (sW + t);
          add(t, iH - ep, iD, xp, t + ep/2, t, 4);
        }

        // Z-dividers: segmented between X-dividers; each segment is exactly sW wide
        for (let j = 1; j < sectionsY; j++) {
          const zp = j * (sD + t);
          let prevX = t;
          for (let xi = 1; xi <= sectionsX; xi++) {
            const nextX = xi < sectionsX ? xi * (sW + t) : W - t;
            const segW  = nextX - prevX;
            if (segW > 0.1) add(segW, iH - ep, t, prevX, t + ep/2, zp, 4);
            prevX = nextX + t;
          }
        }
        break;
      }
    }

    return s;
  }

  // ── dispose all children of a group ──────────────────────────────────────
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

  // ── build/rebuild Three.js scene from params ──────────────────────────────
  function buildScene() {
    if (!meshGroup) return;
    clearGroup(meshGroup);

    const specs = buildSpecs(params);
    if (!specs.length) return;

    // bounding box centre for camera target
    let x0=Infinity, y0=Infinity, z0=Infinity;
    let x1=-Infinity, y1=-Infinity, z1=-Infinity;
    for (const s of specs) {
      x0=Math.min(x0,s.x); x1=Math.max(x1,s.x+s.sx);
      y0=Math.min(y0,s.y); y1=Math.max(y1,s.y+s.sy);
      z0=Math.min(z0,s.z); z1=Math.max(z1,s.z+s.sz);
    }
    const cx=(x0+x1)/2, cy=(y0+y1)/2, cz=(z0+z1)/2;
    const diag = Math.sqrt((x1-x0)**2+(y1-y0)**2+(z1-z0)**2);
    radius = diag * 1.8;

    for (const sp of specs) {
      const geo = new THREE.BoxGeometry(sp.sx, sp.sy, sp.sz);
      const transparent = (sp.opacity ?? 1) < 1;
      const mat = new THREE.MeshPhongMaterial({
        color:       sp.color,
        specular:    0x333333,
        shininess:   10,
        transparent,
        opacity:     sp.opacity ?? 1,
        depthWrite:  !transparent,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(sp.x + sp.sx/2 - cx,
                        sp.y + sp.sy/2 - cy,
                        sp.z + sp.sz/2 - cz);
      mesh.castShadow    = true;
      mesh.receiveShadow = true;

      // crisp black outlines
      const edgeGeo = new THREE.EdgesGeometry(geo, 10);
      const edgeMat = new THREE.LineBasicMaterial({ color: 0x0C0C0B, linewidth: 1 });
      mesh.add(new THREE.LineSegments(edgeGeo, edgeMat));

      meshGroup.add(mesh);
    }

    // ground plane
    const floorSize = diag * 2.5;
    const floorGeo  = new THREE.PlaneGeometry(floorSize, floorSize);
    const floorMat  = new THREE.MeshPhongMaterial({ color: 0xDDD8CF });
    const floor     = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x  = -Math.PI / 2;
    floor.position.y  = y0 - cy - 2;
    floor.receiveShadow = true;
    meshGroup.add(floor);
  }

  // ── camera update ─────────────────────────────────────────────────────────
  function updateCamera() {
    camera.position.set(
      radius * Math.cos(elevation) * Math.sin(azimuth),
      radius * Math.sin(elevation),
      radius * Math.cos(elevation) * Math.cos(azimuth)
    );
    camera.lookAt(0, 0, 0);
  }

  function loop() {
    rafId = requestAnimationFrame(loop);
    if (autoSpin) azimuth += 0.0025;
    updateCamera();
    renderer.render(scene, camera);
  }

  // ── mount ─────────────────────────────────────────────────────────────────
  onMount(() => {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0xEDECE9);

    scene  = new THREE.Scene();
    scene.fog = new THREE.Fog(0xEDECE9, 1000, 4000);

    camera = new THREE.PerspectiveCamera(28, 1, 1, 8000);

    // ambient
    scene.add(new THREE.AmbientLight(0xffffff, 0.7));

    // key light + shadow
    const key = new THREE.DirectionalLight(0xfff8ee, 1.0);
    key.position.set(200, 400, 150);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.near = 50;
    key.shadow.camera.far  = 3000;
    key.shadow.camera.left = key.shadow.camera.bottom = -600;
    key.shadow.camera.right = key.shadow.camera.top   =  600;
    key.shadow.bias = -0.0005;
    scene.add(key);

    // cool fill
    const fill = new THREE.DirectionalLight(0xd0e0ff, 0.3);
    fill.position.set(-150, 80, -200);
    scene.add(fill);

    meshGroup = new THREE.Group();
    scene.add(meshGroup);

    // resize observer
    const ro = new ResizeObserver(() => {
      const w = canvas.clientWidth || 1;
      const h = canvas.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    });
    ro.observe(canvas);
    // initial size
    renderer.setSize(canvas.clientWidth || 800, canvas.clientHeight || 600, false);
    camera.aspect = (canvas.clientWidth || 800) / (canvas.clientHeight || 600);
    camera.updateProjectionMatrix();

    buildScene();
    loop();
    return () => { cancelAnimationFrame(rafId); ro.disconnect(); renderer.dispose(); };
  });

  // rebuild whenever any relevant param changes
  $effect(() => {
    const { width,height,depth,thickness,boxType,hingeH,sectionsX,sectionsY } = params;
    void width; void height; void depth; void thickness;
    void boxType; void hingeH; void sectionsX; void sectionsY;
    buildScene();
  });

  // ── interaction ───────────────────────────────────────────────────────────
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
    radius = Math.max(60, Math.min(4000, radius * (e.deltaY > 0 ? 1.08 : 0.93)));
  }
  function resetView() {
    azimuth = 0.55; elevation = 0.35; autoSpin = true; buildScene();
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="wrap"
  onpointerdown={onPD} onpointermove={onPM} onpointerup={onPU} onpointercancel={onPU}
  onwheel={onWheel}
  style="cursor:{isOrbiting?'grabbing':'grab'}"
>
  <canvas bind:this={canvas}></canvas>

  <div class="hud-dims">
    {params.width}<span class="u">W</span>
    × {params.height}<span class="u">H</span>
    × {params.depth}<span class="u">D</span>
    <span class="sep">·</span>
    {params.thickness}<span class="u">mm</span>
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
