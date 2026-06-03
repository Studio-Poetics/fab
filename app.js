/* ─── MAIN APPLICATION ──────────────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {

  /* ── references ────────────────────────────────────────────────────────── */
  const svgEl      = document.getElementById('fabricationSVG');
  const canvasEl   = document.getElementById('assemblyCanvas');
  const placeholder= document.getElementById('canvasPlaceholder');

  let   _assemblyReady = false;
  let   _currentView   = 'fabrication';

  /* ── initial render ────────────────────────────────────────────────────── */
  const s0  = State.get();
  const geo0 = State.computeGeometry();
  buildLeftPanel(s0);
  buildRightPanel(s0, geo0);
  updateReadouts(s0, geo0);
  drawJointPreview(s0, geo0);

  // bind controls after DOM is ready
  bindLeftControls();
  bindRightControls();

  // init fabrication view — defer one frame so SVG has layout dimensions
  Fabrication.init(svgEl);
  placeholder.classList.add('hidden');
  svgEl.classList.remove('hidden');
  requestAnimationFrame(_renderCurrent);

  /* ── state subscription ─────────────────────────────────────────────────── */
  State.subscribe((s, prev) => {
    const geo = State.computeGeometry();
    updateReadouts(s, geo);
    drawJointPreview(s, geo);
    _renderCurrent();

    // show/hide finger controls
    const fc = document.getElementById('fingerControls');
    if (fc) fc.style.display = s.joint !== 'finger' ? 'none' : '';

    // update stepper/slider values if programmatic
    _syncInputs(s);
  });

  /* ── render dispatcher ──────────────────────────────────────────────────── */
  function _renderCurrent() {
    const s   = State.get();
    const geo = State.computeGeometry();
    const data = { s, geo };

    if (_currentView === 'fabrication') {
      Fabrication.render(data);
    } else if (_currentView === 'assembly' && _assemblyReady) {
      Assembly.render(data);
    }
  }

  /* ── view toggle ────────────────────────────────────────────────────────── */
  document.getElementById('viewToggle').addEventListener('click', async (e) => {
    const btn = e.target.closest('.view-btn');
    if (!btn) return;
    const v = btn.dataset.view;
    if (v === _currentView) return;
    _switchView(v);
  });

  async function _switchView(v) {
    _currentView = v;
    const toggle = document.getElementById('viewToggle');
    toggle.querySelectorAll('.view-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.view === v);
    });
    toggle.classList.toggle('assembly', v === 'assembly');

    const label = document.getElementById('workspaceLabel');
    if (label) label.textContent = v === 'fabrication' ? 'FABRICATION VIEW' : 'ASSEMBLY VIEW';

    if (v === 'fabrication') {
      svgEl.classList.remove('hidden');
      canvasEl.classList.add('hidden');
      _renderCurrent();
    } else {
      svgEl.classList.add('hidden');
      canvasEl.classList.remove('hidden');
      if (!_assemblyReady) {
        await Assembly.init(canvasEl);
        _assemblyReady = true;
      }
      _renderCurrent();
    }
  }

  /* ── bind left panel controls ──────────────────────────────────────────── */
  function bindLeftControls() {
    // Number inputs
    _bindNumInput('inWidth',     v => State.set({ width:      +v }));
    _bindNumInput('inHeight',    v => State.set({ height:     +v }));
    _bindNumInput('inDepth',     v => State.set({ depth:      +v }));
    _bindNumInput('inThickness', v => State.set({ thickness:  +v }));
    _bindNumInput('inFingers',   v => State.set({ fingerCount: Math.max(1, Math.round(+v)) }));
    _bindNumInput('inHingeH',    v => State.set({ hingeH:     Math.max(8, +v) }));
    _bindNumInput('inSectionsX', v => State.set({ sectionsX:  Math.max(1, Math.round(+v)) }));
    _bindNumInput('inSectionsY', v => State.set({ sectionsY:  Math.max(1, Math.round(+v)) }));

    // Kerf slider
    const kerfSlider = document.getElementById('inKerf');
    if (kerfSlider) {
      kerfSlider.addEventListener('input', () => {
        const v = +kerfSlider.value;
        State.set({ kerf: v });
        const kVal = document.getElementById('inKerfVal');
        if (kVal) kVal.textContent = v.toFixed(2);
      });
    }

    // Stepper buttons (delegated — only bind once)
    if (!document._stepperBound) {
      document._stepperBound = true;
      document.addEventListener('click', e => {
        const btn = e.target.closest('.stepper-btn');
        if (!btn) return;
        const target = btn.dataset.target;
        const delta  = +btn.dataset.delta;
        const input  = document.getElementById(target);
        if (!input) return;
        const next = Math.max(+input.min || 0, Math.min(+input.max || 99999, (+input.value) + delta));
        input.value = next;
        input.dispatchEvent(new Event('change'));
      });
    }

    // Segmented controls (delegated — only bind once)
    if (!document._segBound) {
      document._segBound = true;
      document.addEventListener('click', e => {
        const btn = e.target.closest('.seg-btn');
        if (!btn) return;
        const seg  = btn.dataset.seg;
        const val  = btn.dataset.value;
        const wrap = document.getElementById(seg);
        if (!wrap) return;
        wrap.querySelectorAll('.seg-btn').forEach(b => b.classList.toggle('active', b === btn));
        switch (seg) {
          case 'ctrlMaterial': State.set({ material: val }); break;
          case 'ctrlJoint':    State.set({ joint:    val }); break;
          case 'ctrlUnit':     State.set({ unit:     val }); break;
        }
      });
    }

    // Box type buttons (delegated — only bind once)
    if (!document._boxTypeBound) {
      document._boxTypeBound = true;
      document.addEventListener('click', e => {
        const btn = e.target.closest('.box-type-btn');
        if (!btn) return;
        const bt = btn.dataset.boxtype;
        // update active state
        document.querySelectorAll('.box-type-btn').forEach(b =>
          b.classList.toggle('active', b === btn));
        State.set({ boxType: bt });

        // show/hide type-specific options
        const typeOpts   = document.getElementById('typeOptions');
        const hingeOpts  = document.getElementById('hingeOptions');
        const multiOpts  = document.getElementById('multiOptions');
        if (typeOpts)  typeOpts.style.display  = (bt === 'hinged' || bt === 'multi') ? '' : 'none';
        if (hingeOpts) hingeOpts.style.display  = bt === 'hinged' ? '' : 'none';
        if (multiOpts) multiOpts.style.display  = bt === 'multi'  ? '' : 'none';
      });
    }
  }

  /* ── bind right panel controls ─────────────────────────────────────────── */
  function bindRightControls() {
    if (!document._rightBound) {
      document._rightBound = true;
      document.addEventListener('click', e => {
        // SVG export
        if (e.target.closest('#btnExportLarge') || e.target.closest('#btnExport')) {
          const s = State.get();
          if (!s.valid) return;
          Fabrication.exportSVG(s);
        }
        // DXF export
        if (e.target.closest('#btnExportDXF')) {
          const s = State.get();
          if (!s.valid) return;
          DXF.export_(s);
        }
        // Reset
        if (e.target.closest('#btnReset')) {
          State.reset();
          const s2  = State.get();
          const g2  = State.computeGeometry();
          buildLeftPanel(s2);
          buildRightPanel(s2, g2);
          updateReadouts(s2, g2);
          drawJointPreview(s2, g2);
          _renderCurrent();
        }
      });
    }
  }

  /* ── helpers ────────────────────────────────────────────────────────────── */
  function _bindNumInput(id, handler) {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('change', () => handler(el.value));
    el.addEventListener('keydown', e => { if (e.key === 'Enter') handler(el.value); });
  }

  function _syncInputs(s) {
    const map = {
      inWidth: s.width, inHeight: s.height, inDepth: s.depth,
      inThickness: s.thickness, inFingers: s.fingerCount, inKerf: s.kerf,
    };
    Object.entries(map).forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (el && document.activeElement !== el) el.value = val;
    });
    const kVal = document.getElementById('inKerfVal');
    if (kVal) kVal.textContent = s.kerf.toFixed(2);
  }

  /* ── keyboard shortcuts ─────────────────────────────────────────────────── */
  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
    if (e.key === 'f' || e.key === 'F') _switchView('fabrication');
    if (e.key === 'a' || e.key === 'A') _switchView('assembly');
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault();
      if (State.get().valid) Fabrication.exportSVG(State.get());
    }
  });

});
