/* ─── LEFT + RIGHT PANEL BUILDER ────────────────────────────────────────── */

/* ── helpers ───────────────────────────────────────────────────────────── */
function numField(id, label, unit, value, min, max, step = 1) {
  return `
  <div class="field">
    <div class="field-label">${label} <span class="field-unit">${unit}</span></div>
    <div class="num-input-wrap">
      <input class="num-input" id="${id}" type="number"
             value="${value}" min="${min}" max="${max}" step="${step}">
      <div class="field-stepper">
        <button class="stepper-btn" data-target="${id}" data-delta="${step}">▲</button>
        <button class="stepper-btn" data-target="${id}" data-delta="${-step}">▼</button>
      </div>
    </div>
  </div>`;
}

function segControl(id, label, options, active, cols) {
  const btns = options.map(o =>
    `<button class="seg-btn${o.value === active ? ' active' : ''}"
             data-seg="${id}" data-value="${o.value}">${o.label}</button>`
  ).join('');
  return `
  <div class="field">
    <div class="field-label">${label}</div>
    <div class="seg-control" id="${id}" data-cols="${cols}">${btns}</div>
  </div>`;
}

function sliderField(id, label, value, min, max, step = 0.05, decimals = 2) {
  return `
  <div class="field">
    <div class="field-label">${label}</div>
    <div class="slider-wrap">
      <input class="slider-track" id="${id}" type="range"
             value="${value}" min="${min}" max="${max}" step="${step}">
      <span class="slider-val" id="${id}Val">${value.toFixed(decimals)}</span>
    </div>
  </div>`;
}

function selectField(id, label, options, active) {
  const opts = options.map(o =>
    `<option value="${o.value}"${o.value === active ? ' selected' : ''}>${o.label}</option>`
  ).join('');
  return `
  <div class="field">
    <div class="field-label">${label}</div>
    <div class="select-wrap">
      <select class="precision-select" id="${id}">${opts}</select>
      <span class="select-arrow">▾</span>
    </div>
  </div>`;
}

/* ── Left panel ─────────────────────────────────────────────────────────── */
function buildLeftPanel(s) {
  const bt = s.boxType || 'closed';

  // box type grid: 2 rows × 3 cols
  const btBtns = BoxTypes.DEFS.map(def =>
    `<button class="box-type-btn${def.id === bt ? ' active' : ''}"
             data-boxtype="${def.id}">${def.label}</button>`
  ).join('');

  const isHinged = bt === 'hinged';
  const isMulti  = bt === 'multi';

  document.getElementById('leftContent').innerHTML = `

  <!-- BOX TYPE -->
  <div class="panel-section">
    <div class="section-label">BOX TYPE</div>
    <div class="box-type-grid" id="boxTypeGrid">${btBtns}</div>
  </div>

  <!-- TYPE-SPECIFIC OPTIONS -->
  <div class="panel-section" id="typeOptions" style="${(!isHinged && !isMulti) ? 'display:none' : ''}">
    <div class="section-label">TYPE OPTIONS</div>
    <div id="hingeOptions" style="${!isHinged ? 'display:none' : ''}">
      ${numField('inHingeH', 'HINGE ZONE', 'mm', s.hingeH || 20, 8, 80, 1)}
    </div>
    <div id="multiOptions" style="${!isMulti ? 'display:none' : ''}">
      ${numField('inSectionsX', 'SECTIONS X', '', s.sectionsX || 2, 1, 8, 1)}
      ${numField('inSectionsY', 'SECTIONS Y', '', s.sectionsY || 2, 1, 8, 1)}
    </div>
  </div>

  <!-- DIMENSIONS -->
  <div class="panel-section">
    <div class="section-label">DIMENSIONS <span class="section-label-tag">mm</span></div>
    ${numField('inWidth',  'WIDTH',  'mm', s.width,     10, 2000, 1)}
    ${numField('inHeight', 'HEIGHT', 'mm', s.height,    10, 2000, 1)}
    ${numField('inDepth',  'DEPTH',  'mm', s.depth,     10, 2000, 1)}
  </div>

  <!-- MATERIAL -->
  <div class="panel-section">
    <div class="section-label">MATERIAL</div>
    ${segControl('ctrlMaterial', '', [
      { label: 'PLY',    value: 'plywood'   },
      { label: 'ACRYLIC', value: 'acrylic'  },
      { label: 'CARD',   value: 'cardboard' },
    ], s.material, 3)}
    ${numField('inThickness', 'THICKNESS', 'mm', s.thickness, 0.5, 25, 0.5)}
  </div>

  <!-- KERF -->
  <div class="panel-section">
    <div class="section-label">LASER KERF</div>
    ${sliderField('inKerf', 'KERF COMPENSATION', s.kerf, 0, 1, 0.01, 2)}
  </div>

  <!-- JOINTS -->
  <div class="panel-section">
    <div class="section-label">JOINTS</div>
    ${segControl('ctrlJoint', 'JOINT TYPE', [
      { label: 'FINGER', value: 'finger' },
      { label: 'PLAIN',  value: 'plain'  },
    ], s.joint, 2)}
    <div id="fingerControls" style="${s.joint !== 'finger' ? 'display:none' : ''}">
      ${numField('inFingers', 'FINGERS PER EDGE', '', s.fingerCount, 1, 20, 1)}
    </div>
    <div class="joint-preview" id="jointPreview">
      <svg id="jointPreviewSVG" viewBox="0 0 220 60" height="60"></svg>
    </div>
  </div>

  <!-- UNIT -->
  <div class="panel-section">
    <div class="section-label">UNIT SYSTEM</div>
    ${segControl('ctrlUnit', '', [
      { label: 'mm',   value: 'mm'   },
      { label: 'inch', value: 'inch' },
    ], s.unit, 2)}
  </div>
  `;
}

/* ── Right panel ────────────────────────────────────────────────────────── */
function buildRightPanel(s, geo) {
  const area  = (geo.area.total / 100).toFixed(0);  // cm²
  const inner = geo.inner;

  document.getElementById('rightContent').innerHTML = `

  <!-- MEASUREMENTS -->
  <div class="panel-section">
    <div class="section-label">MEASUREMENTS</div>
    <div class="readout">
      <div class="readout-cell" id="rdW">
        <div class="readout-label">WIDTH</div>
        <div class="readout-value">${s.width}<span class="unit">mm</span></div>
      </div>
      <div class="readout-cell" id="rdH">
        <div class="readout-label">HEIGHT</div>
        <div class="readout-value">${s.height}<span class="unit">mm</span></div>
      </div>
      <div class="readout-cell" id="rdD">
        <div class="readout-label">DEPTH</div>
        <div class="readout-value">${s.depth}<span class="unit">mm</span></div>
      </div>
      <div class="readout-cell" id="rdT">
        <div class="readout-label">THICKNESS</div>
        <div class="readout-value">${s.thickness}<span class="unit">mm</span></div>
      </div>
    </div>

    <div class="stat-row">
      <span class="stat-key">INNER W×H×D</span>
      <span class="stat-val">${inner.w.toFixed(1)} × ${inner.h.toFixed(1)} × ${inner.d.toFixed(1)} <span class="unit">mm</span></span>
    </div>
  </div>

  <!-- STATISTICS -->
  <div class="panel-section">
    <div class="section-label">STATISTICS</div>
    <div class="stat-row">
      <span class="stat-key">PANELS</span>
      <span class="stat-val" id="statPanels">${geo.panels}</span>
    </div>
    <div class="stat-row">
      <span class="stat-key">SHEET AREA</span>
      <span class="stat-val" id="statArea">${area}<span class="unit"> cm²</span></span>
    </div>
    <div class="stat-row">
      <span class="stat-key">MATERIAL</span>
      <span class="stat-val" id="statMat">${s.material.toUpperCase()}</span>
    </div>
    <div class="stat-row">
      <span class="stat-key">EST. MASS</span>
      <span class="stat-val" id="statMass">${geo.mass}<span class="unit"> g</span></span>
    </div>
    <div class="stat-row">
      <span class="stat-key">KERF</span>
      <span class="stat-val" id="statKerf">${s.kerf.toFixed(2)}<span class="unit"> mm</span></span>
    </div>
    <div class="stat-row">
      <span class="stat-key">JOINT</span>
      <span class="stat-val" id="statJoint">${s.joint.toUpperCase()}</span>
    </div>
    <div class="stat-row">
      <span class="stat-key">BOX TYPE</span>
      <span class="stat-val" id="statBoxType">${(s.boxType||'closed').toUpperCase()}</span>
    </div>
  </div>

  <!-- WARNINGS -->
  <div class="panel-section">
    <div class="section-label">CHECKS</div>
    <div id="warningsList"></div>
  </div>

  <!-- EXPORT -->
  <div class="panel-section">
    <div class="section-label">EXPORT</div>
    <button class="export-btn-large" id="btnExportLarge">EXPORT SVG</button>
    <button class="export-btn-large export-dxf" id="btnExportDXF" style="margin-top:6px">EXPORT DXF</button>
    <div class="export-sub">1:1 SCALE · LASER-CUT READY</div>
  </div>
  `;
}

/* ── update right panel readouts only (no rebuild) ──────────────────────── */
function updateReadouts(s, geo) {
  const disp = (v) => s.unit === 'inch' ? (v / 25.4).toFixed(3) : v.toFixed(0);
  const u    = s.unit === 'inch' ? 'in' : 'mm';

  const setRd = (id, val) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.querySelector('.readout-value').innerHTML = `${val}<span class="unit">${u}</span>`;
  };
  setRd('rdW', disp(s.width));
  setRd('rdH', disp(s.height));
  setRd('rdD', disp(s.depth));
  setRd('rdT', disp(s.thickness));

  const inner = geo.inner;
  const innerRow = document.querySelector('.stat-row .stat-val');
  if (innerRow) innerRow.innerHTML =
    `${disp(inner.w)} × ${disp(inner.h)} × ${disp(inner.d)} <span class="unit">${u}</span>`;

  const setT = (id, html) => { const el = document.getElementById(id); if (el) el.innerHTML = html; };
  setT('statArea',  `${(geo.area.total/100).toFixed(0)}<span class="unit"> cm²</span>`);
  setT('statMass',  `${geo.mass}<span class="unit"> g</span>`);
  setT('statKerf',  `${s.kerf.toFixed(2)}<span class="unit"> mm</span>`);
  setT('statMat',     s.material.toUpperCase());
  setT('statJoint',   s.joint.toUpperCase());
  setT('statBoxType', (s.boxType || 'closed').toUpperCase());

  // meta bar
  const mPanels = document.getElementById('metaPanels');
  const mArea   = document.getElementById('metaArea');
  if (mPanels) mPanels.textContent = `${geo.panels} PANELS`;
  if (mArea)   mArea.textContent   = `${(geo.area.total).toFixed(0)} mm²`;

  // warnings
  const wEl = document.getElementById('warningsList');
  if (!wEl) return;
  const all = [...(s.errors || []).map(e => ({ ...e, type: 'error' })),
               ...(s.warnings || []).map(w => ({ ...w, type: 'warn' }))];
  if (!all.length) {
    wEl.innerHTML = `<div class="no-warnings">ALL CHECKS PASSED</div>`;
  } else {
    wEl.innerHTML = all.map(item => `
      <div class="warning-item">
        <span class="warning-icon${item.type === 'error' ? ' error' : ''}">${item.type === 'error' ? 'ERR' : '!'}</span>
        <span class="warning-text">${item.msg}</span>
      </div>`).join('');
  }

  // export btn state
  const expBtn  = document.getElementById('btnExport');
  const expBtnL = document.getElementById('btnExportLarge');
  const ready = s.valid;
  [expBtn, expBtnL].forEach(b => {
    if (!b) return;
    b.classList.toggle('ready', ready);
    b.classList.toggle('disabled', !ready);
    if (b.id === 'btnExportLarge') b.disabled = !ready;
  });

  // status pill
  const pill = document.getElementById('statusPill');
  const txt  = document.getElementById('statusPill')?.querySelector('.status-text');
  if (pill) {
    pill.className = 'status-pill';
    if (s.errors?.length) { pill.classList.add('error'); if (txt) txt.textContent = 'INVALID'; }
    else if (s.warnings?.length) { pill.classList.add('warning'); if (txt) txt.textContent = 'WARNING'; }
    else { pill.classList.add('ready'); if (txt) txt.textContent = 'READY'; }
  }
}

/* ── joint preview SVG ──────────────────────────────────────────────────── */
function drawJointPreview(s, geo) {
  const svg = document.getElementById('jointPreviewSVG');
  if (!svg) return;
  const { joint, thickness } = s;
  const { finger } = geo;
  const vW = 220, vH = 60;
  const t   = Math.max(6, Math.min(thickness * 2.5, 18));
  const cnt = Math.min(finger.count, 6);
  const fw  = (vW - 20) / (cnt * 2 - 1);

  if (joint === 'plain') {
    svg.innerHTML = `
      <rect x="10" y="${vH/2 - t/2}" width="${vW-20}" height="${t}"
            fill="none" stroke="var(--g300)" stroke-width="1.5"/>
      <text x="${vW/2}" y="${vH/2 + 4}" text-anchor="middle"
            font-family="var(--font-mono)" font-size="9" fill="var(--g400)">PLAIN EDGE</text>`;
    return;
  }

  // finger joint preview
  let topPath = `M 10 ${vH/2}`;
  let botPath = `M 10 ${vH/2 + t}`;
  for (let i = 0; i < cnt; i++) {
    const x = 10 + i * fw * 2;
    const up = i % 2 === 0;
    if (up) {
      topPath += ` H ${x + fw} V ${vH/2 - t} H ${x + fw*2} V ${vH/2}`;
      botPath += ` H ${x + fw*2}`;
    } else {
      topPath += ` H ${x + fw*2}`;
      botPath += ` H ${x + fw} V ${vH/2 + t*2} H ${x + fw*2} V ${vH/2 + t}`;
    }
  }
  topPath += ` H ${vW - 10}`;
  botPath += ` H ${vW - 10}`;

  svg.innerHTML = `
    <path d="${topPath} L ${vW-10} ${vH/2+t} ${botPath.replace('M','L')} Z"
          fill="var(--g50)" stroke="var(--g300)" stroke-width="1.2"/>`;
}
