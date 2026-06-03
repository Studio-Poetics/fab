/* ─── DXF R12 EXPORTER ──────────────────────────────────────────────────── */
// 1 DXF unit = 1 mm. Each panel gets its own layer.
// Format: AC1009 (R12) — universally supported by laser cutters.

const DXF = (() => {

  function export_(s) {
    const panels = BoxTypes.getPanels(s);
    const t  = s.thickness;
    const k  = s.kerf;
    const fc = s.fingerCount;
    const jt = s.joint;

    const layers  = panels.map(p => p.label.replace(/\s/g, '_'));
    const chunks  = [];

    chunks.push(_header(layers));
    chunks.push('  0\nSECTION\n  2\nENTITIES\n');

    panels.forEach((panel, idx) => {
      const layer  = layers[idx];
      const pts    = _panelPoints(panel.w, panel.h, t, k, fc, jt, panel.edges);
      chunks.push(_polyline(pts, layer, true));  // closed outline

      // special features
      if (panel.special) {
        const sp = panel.special;
        if (sp.type === 'hinge') {
          const hingePts = _hingeLines(panel.w, sp.y, sp.hingeH, t);
          hingePts.forEach(seg => chunks.push(_line(seg[0], seg[1], layer + '_HINGE')));
          // lid outline box
          const lidPts = [[0, sp.lidY],[panel.w, sp.lidY],[panel.w, sp.lidY + sp.lidH],[0, sp.lidY + sp.lidH]];
          chunks.push(_polyline(lidPts, layer + '_LID', true));
        }
        if (sp.type === 'groove') {
          const gPts = _grooveLine(panel.w, panel.h, sp);
          gPts.forEach(seg => chunks.push(_line(seg[0], seg[1], layer + '_GROOVE')));
        }
        if (sp.type === 'divider') {
          sp.slots.forEach(slot => {
            const slotPts = _dividerSlot(panel.w, panel.h, slot);
            chunks.push(_polyline(slotPts, layer + '_SLOT', false));
          });
        }
      }
    });

    chunks.push('  0\nENDSEC\n  0\nEOF\n');

    const blob = new Blob([chunks.join('')], { type: 'application/dxf' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `boxmaker_${s.width}x${s.height}x${s.depth}.dxf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /* ── DXF structure ───────────────────────────────────────────────────── */
  function _header(layers) {
    const layerDefs = layers.flatMap(l => [
      `  0\nLAYER\n  2\n${l}\n 70\n     0\n 62\n     7\n  6\nCONTINUOUS\n`,
      `  0\nLAYER\n  2\n${l}_HINGE\n 70\n     0\n 62\n     1\n  6\nCONTINUOUS\n`,
      `  0\nLAYER\n  2\n${l}_GROOVE\n 70\n     0\n 62\n     3\n  6\nCONTINUOUS\n`,
      `  0\nLAYER\n  2\n${l}_SLOT\n 70\n     0\n 62\n     4\n  6\nCONTINUOUS\n`,
    ]).join('');

    return [
      '  0\nSECTION\n  2\nHEADER\n',
      '  9\n$ACADVER\n  1\nAC1009\n',
      '  9\n$INSUNITS\n 70\n     4\n',  // 4 = millimetres
      '  0\nENDSEC\n',
      '  0\nSECTION\n  2\nTABLES\n',
      '  0\nTABLE\n  2\nLTYPE\n 70\n     1\n',
      '  0\nLTYPE\n  2\nCONTINUOUS\n 70\n     0\n  3\nSolid line\n 72\n    65\n 73\n     0\n 40\n0.0\n',
      '  0\nENDTAB\n',
      '  0\nTABLE\n  2\nLAYER\n 70\n    20\n',
      layerDefs,
      '  0\nENDTAB\n',
      '  0\nENDSEC\n',
    ].join('');
  }

  function _fmt(n) { return n.toFixed(4); }

  function _polyline(pts, layer, closed) {
    const flag  = closed ? 1 : 0;
    let out = `  0\nPOLYLINE\n  8\n${layer}\n 66\n     1\n 70\n     ${flag}\n`;
    pts.forEach(([x, y]) => {
      out += `  0\nVERTEX\n  8\n${layer}\n 10\n${_fmt(x)}\n 20\n${_fmt(y)}\n 30\n0.0\n`;
    });
    out += '  0\nSEQEND\n  8\n' + layer + '\n';
    return out;
  }

  function _line([x1, y1], [x2, y2], layer) {
    return `  0\nLINE\n  8\n${layer}\n 10\n${_fmt(x1)}\n 20\n${_fmt(y1)}\n 30\n0.0\n 11\n${_fmt(x2)}\n 21\n${_fmt(y2)}\n 31\n0.0\n`;
  }

  /* ── Point generators (shared with SVG path builder) ─────────────────── */
  function _panelPoints(W, H, t, k, fc, joint, edges) {
    if (joint === 'plain') return [[0,0],[W,0],[W,H],[0,H]];

    const fW  = W / (fc * 2 - 1);
    const fH  = H / (fc * 2 - 1);
    const dep = t;
    const pts = [];

    // TOP edge (L→R)
    if (edges.T === 'f') {
      pts.push([0, 0]);
      for (let i = 0; i < fc * 2 - 1; i++) {
        const x0 = i * fW, x1 = (i + 1) * fW;
        const y = (i % 2 === 0) ? 0 : -dep;
        pts.push([x0, y]); pts.push([x1, y]);
      }
      pts.push([W, 0]);
    } else {
      pts.push([0, 0]); pts.push([W, 0]);
    }

    // RIGHT edge (T→B)
    if (edges.R === 'f') {
      for (let i = 0; i < fc * 2 - 1; i++) {
        const y0 = i * fH, y1 = (i + 1) * fH;
        const x = (i % 2 === 0) ? W : W + dep;
        pts.push([x, y0]); pts.push([x, y1]);
      }
      pts.push([W, H]);
    } else {
      pts.push([W, H]);
    }

    // BOTTOM edge (R→L)
    if (edges.B === 'f') {
      for (let i = fc * 2 - 2; i >= 0; i--) {
        const x0 = (i + 1) * fW, x1 = i * fW;
        const y = (i % 2 === 0) ? H : H + dep;
        pts.push([x0, y]); pts.push([x1, y]);
      }
      pts.push([0, H]);
    } else {
      pts.push([0, H]);
    }

    // LEFT edge (B→T)
    if (edges.L === 'f') {
      for (let i = fc * 2 - 2; i >= 0; i--) {
        const y0 = (i + 1) * fH, y1 = i * fH;
        const x = (i % 2 === 0) ? 0 : -dep;
        pts.push([x, y0]); pts.push([x, y1]);
      }
    } else {
      pts.push([0, 0]);
    }

    return pts;
  }

  function _hingeLines(W, startY, hingeH, t) {
    const bridge  = 3;       // mm each side
    const spacing = Math.max(t, 2.5);
    const lines   = [];
    let y = startY + spacing / 2;
    let row = 0;
    while (y < startY + hingeH - spacing / 2) {
      if (row % 2 === 0) {
        lines.push([[bridge, y], [W - bridge, y]]);
      } else {
        lines.push([[0, y], [W - bridge, y]]);
        // gap on right side for alternation
      }
      y += spacing;
      row++;
    }
    return lines;
  }

  function _grooveLine(W, H, sp) {
    const y1 = sp.grooveY;
    const y2 = sp.grooveY + sp.grooveH;
    return [
      [[0, y1], [W, y1]],
      [[0, y2], [W, y2]],
    ];
  }

  function _dividerSlot(W, H, slot) {
    const { pos, w, d, from } = slot;
    if (from === 'top') {
      return [[pos, 0], [pos + w, 0], [pos + w, d], [pos, d]];
    } else {
      return [[pos, H], [pos + w, H], [pos + w, H - d], [pos, H - d]];
    }
  }

  // expose _panelPoints for fabrication.js to reuse
  return { export_, _panelPoints, _hingeLines, _grooveLine, _dividerSlot };
})();
