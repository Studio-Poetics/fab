/* ─── APPLICATION STATE ─────────────────────────────────────────────────── */
const State = (() => {
  const defaults = {
    width:     200,   // mm
    height:    150,   // mm
    depth:     100,   // mm
    thickness:   3,   // mm
    kerf:      0.1,   // mm
    material:  'plywood',
    joint:     'finger',
    fingerCount: 5,
    unit:      'mm',
    view:      'fabrication',
    boxType:   'closed',
    sectionsX:  2,
    sectionsY:  2,
    hingeH:    20,
  };

  let _state = { ...defaults };
  const _listeners = new Set();

  function get(key) { return key ? _state[key] : { ..._state }; }

  function set(updates) {
    const prev = { ..._state };
    _state = { ..._state, ...updates };
    _validate();
    _listeners.forEach(fn => fn(_state, prev));
  }

  function reset() { set({ ...defaults }); }

  function subscribe(fn) {
    _listeners.add(fn);
    return () => _listeners.delete(fn);
  }

  function _validate() {
    const { width, height, depth, thickness, kerf, fingerCount } = _state;
    const warnings = [];
    const errors = [];

    const minDim = thickness * (fingerCount * 2 + 1);
    if (width  < minDim) errors.push({ id: 'w', msg: `WIDTH too small for ${fingerCount} fingers` });
    if (height < minDim) errors.push({ id: 'h', msg: `HEIGHT too small for ${fingerCount} fingers` });
    if (depth  < minDim) errors.push({ id: 'd', msg: `DEPTH too small for ${fingerCount} fingers` });
    if (kerf   > thickness * 0.5) warnings.push({ id: 'k', msg: 'KERF is unusually large relative to material thickness' });
    if (thickness > Math.min(width, height, depth) * 0.4) warnings.push({ id: 't', msg: 'THICKNESS may be too large for these dimensions' });

    _state.warnings = warnings;
    _state.errors   = errors;
    _state.valid    = errors.length === 0;
  }

  // derived geometry ─────────────────────────────────────────────────────────
  function computeGeometry() {
    const { width, height, depth, thickness, kerf, fingerCount, joint, material } = _state;
    const t   = thickness;
    const k   = kerf;
    const adj = t - k;   // adjusted thickness accounting for kerf

    // inner dimensions
    const iW = width  - 2 * t;
    const iH = height - 2 * t;
    const iD = depth  - 2 * t;

    // finger geometry
    const fingerW = (width  - 2 * t) / (fingerCount * 2 - 1);
    const fingerH = (height - 2 * t) / (fingerCount * 2 - 1);
    const fingerD = (depth  - 2 * t) / (fingerCount * 2 - 1);

    // surface areas (mm²)
    const aTop    = width * depth;
    const aBottom = width * depth;
    const aFront  = width * height;
    const aBack   = width * height;
    const aLeft   = depth * height;
    const aRight  = depth * height;
    const totalArea = aTop + aBottom + aFront + aBack + aLeft + aRight;

    // panel count (dynamic based on box type)
    const panels = (typeof BoxTypes !== 'undefined')
      ? BoxTypes.getPanels(_state).length
      : 6;

    const materialDensity = { plywood: 0.55, acrylic: 1.19, cardboard: 0.10 };
    const density = materialDensity[material] ?? 0.55;
    const volume  = totalArea * t * 1e-3; // cm³ approx
    const mass    = (volume * density).toFixed(1);

    return {
      inner: { w: iW, h: iH, d: iD },
      outer: { w: width, h: height, d: depth },
      finger: { fw: fingerW, fh: fingerH, fd: fingerD, count: fingerCount },
      area: { total: totalArea, top: aTop, front: aFront, side: aLeft },
      panels, mass,
      adj, t, k,
    };
  }

  return { get, set, reset, subscribe, computeGeometry };
})();
