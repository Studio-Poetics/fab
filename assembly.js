/* ─── THREE.JS ASSEMBLY VIEW ────────────────────────────────────────────── */

const Assembly = (() => {
  let renderer, scene, camera, controls;
  let _canvas   = null;
  let _meshes   = [];
  let _frame    = null;
  let _ready    = false;

  const MATERIALS = {
    plywood:   { color: 0xD4B483, roughness: 0.85 },
    acrylic:   { color: 0xC8E6F5, roughness: 0.1, transparent: true, opacity: 0.78 },
    cardboard: { color: 0xC8A96A, roughness: 0.95 },
  };

  async function init(canvasEl) {
    _canvas = canvasEl;

    // Load Three.js from CDN
    if (!window.THREE) {
      await _loadScript('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js');
    }
    const THREE = window.THREE;

    const w = _canvas.clientWidth  || 800;
    const h = _canvas.clientHeight || 600;

    renderer = new THREE.WebGLRenderer({ canvas: _canvas, antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0xF0EFED, 1);
    renderer.shadowMap.enabled = false;

    scene  = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 10000);
    camera.position.set(400, 300, 500);
    camera.lookAt(0, 0, 0);

    // Lighting — soft, industrial
    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambient);
    const dir1 = new THREE.DirectionalLight(0xffffff, 0.6);
    dir1.position.set(1, 2, 1.5);
    scene.add(dir1);
    const dir2 = new THREE.DirectionalLight(0xffffff, 0.2);
    dir2.position.set(-1, 0.5, -1);
    scene.add(dir2);

    // Orbit controls (minimal inline implementation)
    _initOrbit(THREE);

    // resize handler
    window.addEventListener('resize', _onResize);

    _ready = true;
    _loop();
  }

  function _loop() {
    _frame = requestAnimationFrame(_loop);
    if (!renderer || !scene || !camera) return;
    if (_orbitState.changed) { _applyOrbit(); _orbitState.changed = false; }
    renderer.render(scene, camera);
  }

  function render(data) {
    if (!_ready) return;
    const { s, geo } = data;
    _rebuildPanels(s, geo);
  }

  function _rebuildPanels(s, geo) {
    const THREE = window.THREE;
    // remove old meshes
    _meshes.forEach(m => scene.remove(m));
    _meshes = [];

    const { width: W, height: H, depth: D, thickness: t, material } = s;
    const mat   = MATERIALS[material] || MATERIALS.plywood;
    const mOpts = { color: mat.color, roughness: mat.roughness };
    if (mat.transparent) { mOpts.transparent = true; mOpts.opacity = mat.opacity; }

    const mkMat = () => new THREE.MeshLambertMaterial(mOpts);

    // 6 panels as flat boxes
    const panels = [
      // bottom
      { size: [W, t, D], pos: [0, -H/2 + t/2, 0] },
      // top
      { size: [W, t, D], pos: [0,  H/2 - t/2, 0] },
      // front
      { size: [W, H - 2*t, t], pos: [0, 0,  D/2 - t/2] },
      // back
      { size: [W, H - 2*t, t], pos: [0, 0, -D/2 + t/2] },
      // left
      { size: [t, H - 2*t, D - 2*t], pos: [-W/2 + t/2, 0, 0] },
      // right
      { size: [t, H - 2*t, D - 2*t], pos: [ W/2 - t/2, 0, 0] },
    ];

    // edge lines for crispness
    const edgeMat = new THREE.LineBasicMaterial({ color: 0x0C0C0B, linewidth: 1 });

    panels.forEach(p => {
      const geo3  = new THREE.BoxGeometry(...p.size);
      const mesh  = new THREE.Mesh(geo3, mkMat());
      mesh.position.set(...p.pos);
      scene.add(mesh);
      _meshes.push(mesh);

      const edges = new THREE.EdgesGeometry(geo3);
      const lines = new THREE.LineSegments(edges, edgeMat);
      lines.position.set(...p.pos);
      scene.add(lines);
      _meshes.push(lines);
    });

    // reframe camera
    const maxDim = Math.max(W, H, D);
    camera.position.set(maxDim * 1.2, maxDim * 0.8, maxDim * 1.4);
    camera.lookAt(0, 0, 0);
    _orbitTarget.set(0, 0, 0);
  }

  /* ── minimal orbit controls ──────────────────────────────────────────── */
  const _orbitState  = { phi: 1.0, theta: 0.6, radius: 700, changed: true };
  const _orbitDrag   = { active: false, lastX: 0, lastY: 0 };
  const _orbitTarget = { x: 0, y: 0, z: 0, set(x,y,z){ this.x=x;this.y=y;this.z=z; } };

  function _initOrbit(THREE) {
    _canvas.addEventListener('mousedown', e => {
      _orbitDrag.active = true;
      _orbitDrag.lastX  = e.clientX;
      _orbitDrag.lastY  = e.clientY;
    });
    window.addEventListener('mouseup', () => { _orbitDrag.active = false; });
    window.addEventListener('mousemove', e => {
      if (!_orbitDrag.active) return;
      const dx = e.clientX - _orbitDrag.lastX;
      const dy = e.clientY - _orbitDrag.lastY;
      _orbitState.theta -= dx * 0.008;
      _orbitState.phi   -= dy * 0.008;
      _orbitState.phi    = Math.max(0.15, Math.min(Math.PI - 0.15, _orbitState.phi));
      _orbitState.changed = true;
      _orbitDrag.lastX   = e.clientX;
      _orbitDrag.lastY   = e.clientY;
    });
    _canvas.addEventListener('wheel', e => {
      e.preventDefault();
      _orbitState.radius *= (1 + e.deltaY * 0.001);
      _orbitState.radius  = Math.max(50, Math.min(5000, _orbitState.radius));
      _orbitState.changed = true;
    }, { passive: false });

    // touch
    let _lastTouch = null;
    _canvas.addEventListener('touchstart', e => {
      if (e.touches.length === 1) {
        _orbitDrag.active = true;
        _orbitDrag.lastX  = e.touches[0].clientX;
        _orbitDrag.lastY  = e.touches[0].clientY;
      }
    });
    _canvas.addEventListener('touchend', () => { _orbitDrag.active = false; });
    _canvas.addEventListener('touchmove', e => {
      if (e.touches.length === 1 && _orbitDrag.active) {
        const dx = e.touches[0].clientX - _orbitDrag.lastX;
        const dy = e.touches[0].clientY - _orbitDrag.lastY;
        _orbitState.theta -= dx * 0.008;
        _orbitState.phi   -= dy * 0.008;
        _orbitState.phi    = Math.max(0.15, Math.min(Math.PI - 0.15, _orbitState.phi));
        _orbitState.changed = true;
        _orbitDrag.lastX   = e.touches[0].clientX;
        _orbitDrag.lastY   = e.touches[0].clientY;
      }
    });
  }

  function _applyOrbit() {
    const { phi, theta, radius } = _orbitState;
    camera.position.x = _orbitTarget.x + radius * Math.sin(phi) * Math.sin(theta);
    camera.position.y = _orbitTarget.y + radius * Math.cos(phi);
    camera.position.z = _orbitTarget.z + radius * Math.sin(phi) * Math.cos(theta);
    camera.lookAt(_orbitTarget.x, _orbitTarget.y, _orbitTarget.z);
  }

  function _onResize() {
    if (!renderer || !_canvas) return;
    const w = _canvas.clientWidth;
    const h = _canvas.clientHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  function _loadScript(src) {
    return new Promise((resolve, reject) => {
      const s   = document.createElement('script');
      s.src     = src;
      s.onload  = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  function destroy() {
    if (_frame) cancelAnimationFrame(_frame);
    window.removeEventListener('resize', _onResize);
    renderer?.dispose();
  }

  return { init, render, destroy };
})();
