/* ─── SVG FABRICATION VIEW ──────────────────────────────────────────────── */

const Fabrication = (() => {
  const MARGIN  = 24;
  const PAD     = 10;   // gap between panel effective bboxes
  const CUT     = '#0C0C0B';
  const ENGRAVE = '#888';
  const HINGE   = '#E85D04';
  const GROOVE  = '#1A7A3F';
  const FILLS   = ['#F6F5F3','#EDECE9','#E8E7E4','#E2E1DC','#DDD8CF'];

  let _svgEl  = null;
  let _bounds = { w: 800, h: 600 };
  let _current = null;

  function init(svgEl) {
    _svgEl = svgEl;
    window.addEventListener('resize', () => { if (_current) render(_current); });
  }

  function render(data) {
    _current = data;
    if (!_svgEl) return;
    const { s } = data;
    _bounds = { w: _svgEl.clientWidth || 800, h: _svgEl.clientHeight || 600 };

    const panels  = BoxTypes.getPanels(s);
    const t       = s.thickness;
    const k       = s.kerf;
    const fc      = s.fingerCount;
    const jt      = s.joint;
    const layout  = _layout(panels, t);
    const scale   = _fitScale(layout.totalW, layout.totalH);

    _svgEl.innerHTML = '';
    _svgEl.setAttribute('viewBox', `0 0 ${_bounds.w} ${_bounds.h}`);

    const root = _el('g');
    const ox   = (_bounds.w - layout.totalW * scale) / 2;
    const oy   = (_bounds.h - layout.totalH * scale) / 2;
    root.setAttribute('transform', `translate(${ox},${oy}) scale(${scale})`);
    _svgEl.appendChild(root);

    _drawGrid(root, layout.totalW, layout.totalH, scale);

    layout.placements.forEach((pl, i) => {
      const panel = panels[i];
      const g = _el('g');
      g.setAttribute('transform', `translate(${pl.x},${pl.y})`);
      root.appendChild(g);

      // main outline
      const pts = DXF._panelPoints(panel.w, panel.h, t, k, fc, jt, panel.edges);
      const d   = _pts2path(pts);
      const path = _el('path');
      path.setAttribute('d', d);
      path.setAttribute('fill', FILLS[panel.tint] ?? FILLS[0]);
      path.setAttribute('stroke', CUT);
      path.setAttribute('stroke-width', `${0.8 / scale}`);
      path.setAttribute('stroke-linejoin', 'miter');
      g.appendChild(path);

      // special features
      if (panel.special) _renderSpecial(g, panel, t, scale);

      // labels
      _addLabel(g, panel.w, panel.h, panel.label, scale);
    });
  }

  /* ── special feature renderers ───────────────────────────────────────── */
  function _renderSpecial(g, panel, t, scale) {
    const sp = panel.special;
    const sw = `${0.6 / scale}`;

    if (sp.type === 'hinge') {
      // living hinge lines
      const segs = DXF._hingeLines(panel.w, sp.y, sp.hingeH, t);
      segs.forEach(([[x1,y1],[x2,y2]]) => {
        const l = _el('line');
        l.setAttribute('x1', x1); l.setAttribute('y1', y1);
        l.setAttribute('x2', x2); l.setAttribute('y2', y2);
        l.setAttribute('stroke', HINGE);
        l.setAttribute('stroke-width', `${0.5 / scale}`);
        g.appendChild(l);
      });
      // hinge zone boundary
      _dashRect(g, 0, sp.y, panel.w, sp.hingeH, HINGE, scale);
      // lid zone boundary
      _dashRect(g, 0, sp.lidY, panel.w, sp.lidH, '#888', scale);
      _addSmallLabel(g, panel.w / 2, sp.y + sp.hingeH / 2, 'HINGE', HINGE, scale);
      _addSmallLabel(g, panel.w / 2, sp.lidY + sp.lidH / 2, 'LID', '#888', scale);
    }

    if (sp.type === 'groove') {
      // two lines across panel top indicating groove position
      const segs = DXF._grooveLine(panel.w, panel.h, sp);
      segs.forEach(([[x1,y1],[x2,y2]]) => {
        const l = _el('line');
        l.setAttribute('x1', x1); l.setAttribute('y1', y1);
        l.setAttribute('x2', x2); l.setAttribute('y2', y2);
        l.setAttribute('stroke', GROOVE);
        l.setAttribute('stroke-width', sw);
        l.setAttribute('stroke-dasharray', `${3/scale},${2/scale}`);
        g.appendChild(l);
      });
      _addSmallLabel(g, panel.w / 2, sp.grooveY + sp.grooveH / 2, 'GROOVE', GROOVE, scale);
    }

    if (sp.type === 'sliderLid') {
      // label it
      _addSmallLabel(g, panel.w / 2, panel.h / 2, 'SLIDER LID', '#888', scale);
    }

    if (sp.type === 'divider') {
      sp.slots.forEach(slot => {
        const pts2 = DXF._dividerSlot(panel.w, panel.h, slot);
        const d2 = _pts2path(pts2) + ' Z';
        const r = _el('path');
        r.setAttribute('d', d2);
        r.setAttribute('fill', 'none');
        r.setAttribute('stroke', CUT);
        r.setAttribute('stroke-width', `${0.8 / scale}`);
        g.appendChild(r);
      });
    }
  }

  function _dashRect(g, x, y, w, h, color, scale) {
    const r = _el('rect');
    r.setAttribute('x', x); r.setAttribute('y', y);
    r.setAttribute('width', w); r.setAttribute('height', h);
    r.setAttribute('fill', 'none');
    r.setAttribute('stroke', color);
    r.setAttribute('stroke-width', `${0.5 / scale}`);
    r.setAttribute('stroke-dasharray', `${4/scale},${3/scale}`);
    r.setAttribute('opacity', '0.5');
    g.appendChild(r);
  }

  /* ── layout engine ───────────────────────────────────────────────────── */
  function _layout(panels, t) {
    // Group panels by col
    const cols = {};
    panels.forEach(p => {
      if (!cols[p.col]) cols[p.col] = [];
      cols[p.col].push(p);
    });

    // For each panel, compute effective bbox (includes finger protrusions)
    function eff(p) {
      const proL = p.edges.L === 'f' ? t : 0;
      const proR = p.edges.R === 'f' ? t : 0;
      const proT = p.edges.T === 'f' ? t : 0;
      const proB = p.edges.B === 'f' ? t : 0;
      return { w: p.w + proL + proR, h: p.h + proT + proB, offX: proL, offY: proT };
    }

    // Lay out each column: stack panels vertically
    let curX = 0;
    const placements = new Array(panels.length);

    const colKeys = Object.keys(cols).map(Number).sort((a, b) => a - b);
    let maxTotalH = 0;

    colKeys.forEach(colKey => {
      const colPanels = cols[colKey];
      const colEffs   = colPanels.map(eff);
      const colW      = Math.max(...colEffs.map(e => e.w));

      let curY = 0;
      colPanels.forEach((panel, ci) => {
        const e = colEffs[ci];
        const idx = panels.indexOf(panel);
        // Centre panel horizontally within column
        const cx = curX + (colW - e.w) / 2 + e.offX;
        const cy = curY + e.offY;
        placements[idx] = { x: cx, y: cy };
        curY += e.h + PAD;
      });

      maxTotalH = Math.max(maxTotalH, curY - PAD);
      curX += colW + PAD;
    });

    return { placements, totalW: curX - PAD, totalH: maxTotalH };
  }

  function _fitScale(tw, th) {
    const avW = _bounds.w - MARGIN * 2;
    const avH = _bounds.h - MARGIN * 2;
    return Math.min(avW / tw, avH / th, 3);
  }

  /* ── label helpers ───────────────────────────────────────────────────── */
  function _addLabel(g, w, h, label, scale) {
    const fs = Math.max(5.5, Math.min(9 / scale, 9));
    const tx = _el('text');
    tx.setAttribute('x', `${4 / scale}`);
    tx.setAttribute('y', `${(fs + 3) / scale}`);
    tx.setAttribute('font-family', 'IBM Plex Mono, monospace');
    tx.setAttribute('font-size', `${fs / scale}`);
    tx.setAttribute('fill', ENGRAVE); tx.setAttribute('opacity', '0.6');
    tx.textContent = label;
    g.appendChild(tx);

    const td = _el('text');
    td.setAttribute('x', `${w / 2}`);
    td.setAttribute('y', `${h + 12 / scale}`);
    td.setAttribute('text-anchor', 'middle');
    td.setAttribute('font-family', 'IBM Plex Mono, monospace');
    td.setAttribute('font-size', `${fs * 0.8 / scale}`);
    td.setAttribute('fill', ENGRAVE); td.setAttribute('opacity', '0.4');
    td.textContent = `${w.toFixed(0)}×${h.toFixed(0)}`;
    g.appendChild(td);
  }

  function _addSmallLabel(g, x, y, text, color, scale) {
    const fs = Math.max(5, Math.min(7 / scale, 8));
    const tx = _el('text');
    tx.setAttribute('x', `${x}`); tx.setAttribute('y', `${y}`);
    tx.setAttribute('text-anchor', 'middle'); tx.setAttribute('dominant-baseline', 'middle');
    tx.setAttribute('font-family', 'IBM Plex Mono, monospace');
    tx.setAttribute('font-size', `${fs / scale}`);
    tx.setAttribute('fill', color); tx.setAttribute('opacity', '0.7');
    tx.textContent = text;
    g.appendChild(tx);
  }

  /* ── subtle grid ─────────────────────────────────────────────────────── */
  function _drawGrid(root, tw, th, scale) {
    const g = _el('g');
    g.setAttribute('opacity', '0.05');
    for (let x = 0; x <= tw; x += 50) {
      const l = _el('line');
      l.setAttribute('x1',x); l.setAttribute('y1',0);
      l.setAttribute('x2',x); l.setAttribute('y2',th);
      l.setAttribute('stroke','#000'); l.setAttribute('stroke-width',`${0.5/scale}`);
      g.appendChild(l);
    }
    for (let y = 0; y <= th; y += 50) {
      const l = _el('line');
      l.setAttribute('x1',0);  l.setAttribute('y1',y);
      l.setAttribute('x2',tw); l.setAttribute('y2',y);
      l.setAttribute('stroke','#000'); l.setAttribute('stroke-width',`${0.5/scale}`);
      g.appendChild(l);
    }
    root.insertBefore(g, root.firstChild);
  }

  /* ── SVG export ──────────────────────────────────────────────────────── */
  function exportSVG(s) {
    if (!_svgEl || !s.valid) return;
    const clone = _svgEl.cloneNode(true);
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    const blob = new Blob([clone.outerHTML], { type: 'image/svg+xml' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `boxmaker_${s.width}x${s.height}x${s.depth}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /* ── utilities ───────────────────────────────────────────────────────── */
  function _pts2path(pts) {
    return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0].toFixed(3)} ${p[1].toFixed(3)}`).join(' ') + ' Z';
  }
  function _el(tag) { return document.createElementNS('http://www.w3.org/2000/svg', tag); }

  return { init, render, exportSVG };
})();
