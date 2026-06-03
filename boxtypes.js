/* ─── BOX TYPE PANEL DEFINITIONS ────────────────────────────────────────── */
// Each type returns an array of panel descriptors.
// edges: T/B/L/R → 'f' finger  |  'p' plain  |  'g' groove
// col: layout column group (0=horizontal, 1=vertical-front, 2=vertical-side, 3=extras)
// special: null | {type:'hinge',y,h} | {type:'groove',edge,depth}

const BoxTypes = (() => {

  /* ── OPEN TRAY ────────────────────────────────────────────────────────── */
  function openTray({ width: W, height: H, depth: D, thickness: t }) {
    return [
      { id:'bottom', label:'BOTTOM', w:W, h:D, col:0, tint:0, edges:{T:'f',B:'f',L:'f',R:'f'} },
      { id:'front',  label:'FRONT',  w:W, h:H, col:1, tint:1, edges:{T:'p',B:'p',L:'f',R:'f'} },
      { id:'back',   label:'BACK',   w:W, h:H, col:1, tint:1, edges:{T:'p',B:'p',L:'f',R:'f'} },
      { id:'left',   label:'LEFT',   w:D, h:H, col:2, tint:2, edges:{T:'p',B:'p',L:'p',R:'p'} },
      { id:'right',  label:'RIGHT',  w:D, h:H, col:2, tint:2, edges:{T:'p',B:'p',L:'p',R:'p'} },
    ];
  }

  /* ── CLOSED BOX ───────────────────────────────────────────────────────── */
  function closedBox({ width: W, height: H, depth: D }) {
    return [
      ...openTray({ width: W, height: H, depth: D }),
      { id:'top', label:'TOP', w:W, h:D, col:0, tint:0, edges:{T:'f',B:'f',L:'f',R:'f'} },
    ];
  }

  /* ── HINGED LID ───────────────────────────────────────────────────────── */
  // Back panel is extended: box back + hinge zone + lid panel, all in one strip.
  // The hinge zone has a living-hinge cut pattern.
  function hingedLid({ width: W, height: H, depth: D, thickness: t, hingeH = 20 }) {
    const lidH = D;  // lid depth equals box depth
    const backH = H + hingeH + lidH;
    return [
      { id:'bottom',   label:'BOTTOM',    w:W, h:D,    col:0, tint:0, edges:{T:'f',B:'f',L:'f',R:'f'} },
      { id:'front',    label:'FRONT',     w:W, h:H,    col:1, tint:1, edges:{T:'p',B:'p',L:'f',R:'f'} },
      { id:'backHinge',label:'BACK+LID',  w:W, h:backH, col:1, tint:3,
        edges:{T:'p',B:'p',L:'p',R:'p'},
        special:{ type:'hinge', y:H, hingeH, lidY: H + hingeH, lidH } },
      { id:'left',     label:'LEFT',      w:D, h:H,    col:2, tint:2, edges:{T:'p',B:'p',L:'p',R:'p'} },
      { id:'right',    label:'RIGHT',     w:D, h:H,    col:2, tint:2, edges:{T:'p',B:'p',L:'p',R:'p'} },
    ];
  }

  /* ── SLIDER LID ───────────────────────────────────────────────────────── */
  // Front/back panels have a groove near the top that the lid slides into.
  function sliderLid({ width: W, height: H, depth: D, thickness: t }) {
    const grooveDepth = t * 0.5;
    const grooveH     = t + 0.2;  // slot height
    const grooveY     = t;        // distance from top of panel
    return [
      { id:'bottom', label:'BOTTOM', w:W, h:D, col:0, tint:0, edges:{T:'f',B:'f',L:'f',R:'f'} },
      { id:'front',  label:'FRONT',  w:W, h:H, col:1, tint:1,
        edges:{T:'p',B:'p',L:'f',R:'f'},
        special:{ type:'groove', side:'inner-top', grooveY, grooveH, grooveDepth } },
      { id:'back',   label:'BACK',   w:W, h:H, col:1, tint:1,
        edges:{T:'p',B:'p',L:'f',R:'f'},
        special:{ type:'groove', side:'inner-top', grooveY, grooveH, grooveDepth } },
      { id:'left',   label:'LEFT',   w:D, h:H, col:2, tint:2, edges:{T:'p',B:'p',L:'p',R:'p'} },
      { id:'right',  label:'RIGHT',  w:D, h:H, col:2, tint:2, edges:{T:'p',B:'p',L:'p',R:'p'} },
      { id:'lid',    label:'LID',    w:W-t*2-0.4, h:D, col:3, tint:0, edges:{T:'p',B:'p',L:'p',R:'p'},
        special:{ type:'sliderLid' } },
    ];
  }

  /* ── LIFT-OFF LID ─────────────────────────────────────────────────────── */
  // Open tray box + separate lid tray that sits on top (slightly larger).
  function liftOffLid({ width: W, height: H, depth: D, thickness: t }) {
    const lip = t;  // lid overlap
    const lidH = Math.max(t * 3, 15);  // lid rim height
    const lidW = W + t * 2;
    const lidD = D + t * 2;
    return [
      // box (open tray)
      { id:'bottom', label:'BOTTOM',    w:W,    h:D,    col:0, tint:0, edges:{T:'f',B:'f',L:'f',R:'f'} },
      { id:'front',  label:'FRONT',     w:W,    h:H,    col:1, tint:1, edges:{T:'p',B:'p',L:'f',R:'f'} },
      { id:'back',   label:'BACK',      w:W,    h:H,    col:1, tint:1, edges:{T:'p',B:'p',L:'f',R:'f'} },
      { id:'left',   label:'LEFT',      w:D,    h:H,    col:2, tint:2, edges:{T:'p',B:'p',L:'p',R:'p'} },
      { id:'right',  label:'RIGHT',     w:D,    h:H,    col:2, tint:2, edges:{T:'p',B:'p',L:'p',R:'p'} },
      // lid (separate tray)
      { id:'lidTop',   label:'LID TOP',   w:lidW,  h:lidD,  col:3, tint:0, edges:{T:'f',B:'f',L:'f',R:'f'} },
      { id:'lidFront', label:'LID FRONT', w:lidW,  h:lidH,  col:4, tint:3, edges:{T:'p',B:'p',L:'f',R:'f'} },
      { id:'lidBack',  label:'LID BACK',  w:lidW,  h:lidH,  col:4, tint:3, edges:{T:'p',B:'p',L:'f',R:'f'} },
      { id:'lidLeft',  label:'LID LEFT',  w:lidD,  h:lidH,  col:5, tint:2, edges:{T:'p',B:'p',L:'p',R:'p'} },
      { id:'lidRight', label:'LID RIGHT', w:lidD,  h:lidH,  col:5, tint:2, edges:{T:'p',B:'p',L:'p',R:'p'} },
    ];
  }

  /* ── MULTI-SECTION ────────────────────────────────────────────────────── */
  function multiSection({ width: W, height: H, depth: D, thickness: t,
                           sectionsX = 2, sectionsY = 2 }) {
    const panels = closedBox({ width: W, height: H, depth: D });

    const innerW = W - 2 * t;
    const innerH = H - 2 * t;
    const innerD = D - 2 * t;
    const nX = sectionsX - 1;  // # of vertical dividers (X-axis)
    const nY = sectionsY - 1;  // # of horizontal dividers (Y-axis)
    const slotW = t + 0.2;     // slot width (kerf adjusted)
    const slotD = innerH / 2;  // slot depth (half-lap)

    // Vertical dividers (run front-to-back, divide left↔right)
    for (let i = 0; i < nX; i++) {
      const slots = [];
      for (let j = 0; j < nY; j++) {
        const pos = (innerD / sectionsY) * (j + 1) - slotW / 2;
        slots.push({ pos, w: slotW, d: slotD, from: 'bottom' });
      }
      panels.push({
        id: `divX${i}`, label: `DIV-X${i+1}`,
        w: innerD, h: innerH, col: 3, tint: 4,
        edges: { T:'p', B:'p', L:'p', R:'p' },
        special: { type:'divider', axis:'x', slots },
      });
    }

    // Horizontal dividers (run left-to-right, divide front↔back)
    for (let j = 0; j < nY; j++) {
      const slots = [];
      for (let i = 0; i < nX; i++) {
        const pos = (innerW / sectionsX) * (i + 1) - slotW / 2;
        slots.push({ pos, w: slotW, d: slotD, from: 'top' });
      }
      panels.push({
        id: `divY${j}`, label: `DIV-Y${j+1}`,
        w: innerW, h: innerH, col: 4, tint: 4,
        edges: { T:'p', B:'p', L:'p', R:'p' },
        special: { type:'divider', axis:'y', slots },
      });
    }

    return panels;
  }

  /* ── DISPATCH ─────────────────────────────────────────────────────────── */
  function getPanels(s) {
    const args = {
      width: s.width, height: s.height, depth: s.depth,
      thickness: s.thickness, kerf: s.kerf,
      hingeH:    s.hingeH    || 20,
      sectionsX: s.sectionsX || 2,
      sectionsY: s.sectionsY || 2,
    };
    switch (s.boxType || 'closed') {
      case 'open':    return openTray(args);
      case 'closed':  return closedBox(args);
      case 'hinged':  return hingedLid(args);
      case 'slider':  return sliderLid(args);
      case 'liftoff': return liftOffLid(args);
      case 'multi':   return multiSection(args);
      default:        return closedBox(args);
    }
  }

  const DEFS = [
    { id: 'open',    label: 'OPEN TRAY'    },
    { id: 'closed',  label: 'CLOSED BOX'   },
    { id: 'hinged',  label: 'HINGED LID'   },
    { id: 'slider',  label: 'SLIDER LID'   },
    { id: 'liftoff', label: 'LIFT-OFF LID' },
    { id: 'multi',   label: 'MULTI-SECTION'},
  ];

  return { getPanels, DEFS };
})();
