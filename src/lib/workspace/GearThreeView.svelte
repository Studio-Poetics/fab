<script lang="ts">
  import { onMount } from 'svelte';
  import * as THREE from 'three';
  import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
  import { gearFab } from '$stores/gears.svelte';
  import { buildGearGeometry } from '$modules/gears/threeD';

  let container: HTMLDivElement;

  onMount(() => {
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xF6F5F3);
    scene.fog = new THREE.Fog(0xF6F5F3, 600, 1200);

    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 2000);
    camera.position.set(0, -150, 180);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.minDistance = 20;
    controls.maxDistance = 800;

    // Lights
    const ambient = new THREE.AmbientLight(0xF6F5F3, 0.6);
    scene.add(ambient);

    const key = new THREE.DirectionalLight(0xffffff, 2.0);
    key.position.set(120, 80, 200);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 800;
    key.shadow.camera.left = -200;
    key.shadow.camera.right = 200;
    key.shadow.camera.top = 200;
    key.shadow.camera.bottom = -200;
    key.shadow.bias = -0.0005;
    scene.add(key);

    const fill = new THREE.DirectionalLight(0xE8E7E4, 0.4);
    fill.position.set(-80, -60, 80);
    scene.add(fill);

    const back = new THREE.DirectionalLight(0xffffff, 0.2);
    back.position.set(0, -100, -80);
    scene.add(back);

    // Shadow ground plane
    const groundGeo = new THREE.PlaneGeometry(600, 600);
    const groundMat = new THREE.ShadowMaterial({ opacity: 0.08 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -60;
    ground.receiveShadow = true;
    scene.add(ground);

    // Gear materials
    const COLORS = [0xDDD8CF, 0xCCCBC7, 0xBEBDB8];
    const mats = COLORS.map(c => new THREE.MeshStandardMaterial({
      color: c,
      roughness: 0.55,
      metalness: 0.05,
    }));

    // State
    let gearMeshes: THREE.Mesh[] = [];
    let animAngle = 0;
    let lastKey = '';

    function rebuildGears() {
      for (const m of gearMeshes) {
        scene.remove(m);
        (m.geometry as THREE.BufferGeometry).dispose();
      }
      gearMeshes = [];

      const p  = gearFab.params;
      const gs = gearFab.gears;
      const glist = gs.g3 ? [gs.g1, gs.g2, gs.g3] : [gs.g1, gs.g2];

      for (let i = 0; i < glist.length; i++) {
        const g = glist[i];
        const geo = buildGearGeometry(g, p.faceWidth, p.helixAngle, p.holeD, p.shaftType, p.dFlatDepth);
        const mesh = new THREE.Mesh(geo, mats[i % mats.length]);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        // SVG uses Y-down; Three.js is Y-up — flip Y
        mesh.position.set(g.x, -g.y, 0);
        gearMeshes.push(mesh);
        scene.add(mesh);
      }

      fitCamera();
    }

    function fitCamera() {
      if (gearMeshes.length === 0) return;
      const bbox = new THREE.Box3();
      for (const m of gearMeshes) bbox.expandByObject(m);

      const size   = new THREE.Vector3();
      const center = new THREE.Vector3();
      bbox.getSize(size);
      bbox.getCenter(center);

      const maxDim = Math.max(size.x, size.y, size.z);
      const fov    = camera.fov * (Math.PI / 180);
      const dist   = (maxDim / 2 / Math.tan(fov / 2)) * 2.0;

      camera.position.set(center.x + dist * 0.1, center.y - dist * 0.35, dist * 0.85);
      controls.target.copy(center);
      controls.update();
    }

    // Resize
    const ro = new ResizeObserver(() => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    });
    ro.observe(container);
    {
      const w = container.clientWidth;
      const h = container.clientHeight;
      renderer.setSize(w || 800, h || 600);
      camera.aspect = (w || 800) / (h || 600);
      camera.updateProjectionMatrix();
    }

    rebuildGears();

    let raf: number;
    const tick = () => {
      raf = requestAnimationFrame(tick);

      const p  = gearFab.params;
      const gs = gearFab.gears;

      // Detect parameter changes and rebuild
      const key = `${p.N1},${p.N2},${p.N3},${p.internalG2},${p.module},${p.PADeg},${p.holeD},${p.shaftType},${p.dFlatDepth},${p.faceWidth},${p.helixAngle},${p.angle2},${p.angle3}`;
      if (key !== lastKey) {
        lastKey = key;
        rebuildGears();
      }

      // Animate — match 2D view rate
      animAngle += p.inputRPM / 10;
      gs.g1.getRot(animAngle);
      gs.g2.getRot(animAngle);
      gs.g3?.getRot(animAngle);

      const glist = gs.g3 ? [gs.g1, gs.g2, gs.g3] : [gs.g1, gs.g2];
      for (let i = 0; i < gearMeshes.length; i++) {
        if (glist[i]) {
          // rot + baseAngle (library phase fix); negate for Three.js CCW convention
          gearMeshes[i].rotation.z = -(glist[i].rot + glist[i].baseAngle) * (Math.PI / 180);
        }
      }

      controls.update();
      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      for (const m of gearMeshes) (m.geometry as THREE.BufferGeometry).dispose();
      for (const m of mats) m.dispose();
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  });
</script>

<div class="gear-three-view" bind:this={container}></div>

<style>
  .gear-three-view {
    position: absolute;
    inset: 0;
    overflow: hidden;
  }
  .gear-three-view :global(canvas) {
    display: block;
    width: 100% !important;
    height: 100% !important;
  }
</style>
