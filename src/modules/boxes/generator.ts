import type { Panel } from '$core/types';
import type { BoxParams, BoxType } from './types';

type Dims = { W: number; H: number; D: number; t: number };

// Edge convention for a standard finger-jointed box:
//
//   Bottom (W×D): all 'f' — tabs protrude on every side
//   Front/Back (W×H):
//     B:'g' receives Bottom.B / Bottom.T tabs (same width W ✓)
//     L:'f', R:'f' tabs go into Left/Right panels
//     T:'p' (open tray) or T:'g' (closed box, receives Top tabs)
//   Left/Right (D×H):
//     B:'g' receives Bottom.L / Bottom.R tabs (same depth D ✓)
//     R:'g' receives Front.L tabs / L:'g' receives Front.R tabs (same height H ✓)
//     L:'g' receives Back.L tabs / R:'g' receives Back.R tabs (same height H ✓)
//     T:'p' (open) or T:'g' (closed)
//
// Phase rule: both matching edges use ODD-indexed segments for their
// tab/notch, so they are always spatially aligned regardless of traversal
// direction (proven in joints.ts).

function openTray({ W, H, D }: Dims): Panel[] {
  return [
    { id:'bottom', label:'BOTTOM', width:W, height:D, col:0, tint:0,
      edges:{T:'f', B:'f', L:'f', R:'f'} },
    { id:'front',  label:'FRONT',  width:W, height:H, col:1, tint:1,
      edges:{T:'p', B:'g', L:'f', R:'f'} },
    { id:'back',   label:'BACK',   width:W, height:H, col:1, tint:1,
      edges:{T:'p', B:'g', L:'f', R:'f'} },
    { id:'left',   label:'LEFT',   width:D, height:H, col:2, tint:2,
      edges:{T:'p', B:'g', L:'g', R:'g'} },
    { id:'right',  label:'RIGHT',  width:D, height:H, col:2, tint:2,
      edges:{T:'p', B:'g', L:'g', R:'g'} },
  ];
}

function closedBox(dims: Dims): Panel[] {
  const { W, H, D } = dims;
  return [
    { id:'bottom', label:'BOTTOM', width:W, height:D, col:0, tint:0,
      edges:{T:'f', B:'f', L:'f', R:'f'} },
    { id:'front',  label:'FRONT',  width:W, height:H, col:1, tint:1,
      edges:{T:'g', B:'g', L:'f', R:'f'} },
    { id:'back',   label:'BACK',   width:W, height:H, col:1, tint:1,
      edges:{T:'g', B:'g', L:'f', R:'f'} },
    { id:'left',   label:'LEFT',   width:D, height:H, col:2, tint:2,
      edges:{T:'g', B:'g', L:'g', R:'g'} },
    { id:'right',  label:'RIGHT',  width:D, height:H, col:2, tint:2,
      edges:{T:'g', B:'g', L:'g', R:'g'} },
    { id:'top',    label:'TOP',    width:W, height:D, col:0, tint:0,
      edges:{T:'f', B:'f', L:'f', R:'f'} },
  ];
}

function hingedLid(dims: Dims, hingeH: number): Panel[] {
  const { W, H, D } = dims;
  const lidH  = D;
  const backH = H + hingeH + lidH;
  // BackHinge panel is taller than H so its L/R edges can't share finger joints
  // with the side panels (height mismatch). L/R are kept plain on back panel.
  return [
    { id:'bottom',    label:'BOTTOM',   width:W, height:D,     col:0, tint:0,
      edges:{T:'f', B:'f', L:'f', R:'f'} },
    { id:'front',     label:'FRONT',    width:W, height:H,     col:1, tint:1,
      edges:{T:'p', B:'g', L:'f', R:'f'} },
    { id:'backHinge', label:'BACK+LID', width:W, height:backH, col:1, tint:3,
      edges:{T:'p', B:'g', L:'p', R:'p'},
      special:{ type:'hinge', y:H, hingeH, lidY: H + hingeH, lidH } },
    { id:'left',  label:'LEFT',  width:D, height:H, col:2, tint:2,
      edges:{T:'p', B:'g', L:'p', R:'g'} },
    { id:'right', label:'RIGHT', width:D, height:H, col:2, tint:2,
      edges:{T:'p', B:'g', L:'g', R:'p'} },
  ];
}

function sliderLid({ W, H, D, t }: Dims): Panel[] {
  const grooveDepth = t * 0.5;
  const grooveH     = t + 0.2;
  const grooveY     = t;
  return [
    { id:'bottom', label:'BOTTOM', width:W, height:D, col:0, tint:0,
      edges:{T:'f', B:'f', L:'f', R:'f'} },
    { id:'front',  label:'FRONT',  width:W, height:H, col:1, tint:1,
      edges:{T:'p', B:'g', L:'f', R:'f'},
      special:{ type:'groove', side:'inner-top', grooveY, grooveH, grooveDepth } },
    { id:'back',   label:'BACK',   width:W, height:H, col:1, tint:1,
      edges:{T:'p', B:'g', L:'f', R:'f'},
      special:{ type:'groove', side:'inner-top', grooveY, grooveH, grooveDepth } },
    { id:'left',  label:'LEFT',  width:D, height:H, col:2, tint:2,
      edges:{T:'p', B:'g', L:'g', R:'g'} },
    { id:'right', label:'RIGHT', width:D, height:H, col:2, tint:2,
      edges:{T:'p', B:'g', L:'g', R:'g'} },
    { id:'lid',   label:'LID',   width:W - t * 2 - 0.4, height:D, col:3, tint:0,
      edges:{T:'p', B:'p', L:'p', R:'p'},
      special:{ type:'sliderLid' } },
  ];
}

function liftOffLid({ W, H, D, t }: Dims): Panel[] {
  const lidH = Math.max(t * 3, 15);
  const lidW = W + t * 2;
  const lidD = D + t * 2;
  return [
    // Main box body (open tray)
    { id:'bottom', label:'BOTTOM',    width:W,    height:D,    col:0, tint:0,
      edges:{T:'f', B:'f', L:'f', R:'f'} },
    { id:'front',  label:'FRONT',     width:W,    height:H,    col:1, tint:1,
      edges:{T:'p', B:'g', L:'f', R:'f'} },
    { id:'back',   label:'BACK',      width:W,    height:H,    col:1, tint:1,
      edges:{T:'p', B:'g', L:'f', R:'f'} },
    { id:'left',   label:'LEFT',      width:D,    height:H,    col:2, tint:2,
      edges:{T:'p', B:'g', L:'g', R:'g'} },
    { id:'right',  label:'RIGHT',     width:D,    height:H,    col:2, tint:2,
      edges:{T:'p', B:'g', L:'g', R:'g'} },
    // Lid tray (slightly larger open tray that fits over the box)
    { id:'lidTop',   label:'LID TOP',   width:lidW, height:lidD, col:3, tint:0,
      edges:{T:'f', B:'f', L:'f', R:'f'} },
    { id:'lidFront', label:'LID FRONT', width:lidW, height:lidH, col:4, tint:3,
      edges:{T:'p', B:'g', L:'f', R:'f'} },
    { id:'lidBack',  label:'LID BACK',  width:lidW, height:lidH, col:4, tint:3,
      edges:{T:'p', B:'g', L:'f', R:'f'} },
    { id:'lidLeft',  label:'LID LEFT',  width:lidD, height:lidH, col:5, tint:2,
      edges:{T:'p', B:'g', L:'g', R:'g'} },
    { id:'lidRight', label:'LID RIGHT', width:lidD, height:lidH, col:5, tint:2,
      edges:{T:'p', B:'g', L:'g', R:'g'} },
  ];
}

function multiSection(dims: Dims, sectionsX: number, sectionsY: number): Panel[] {
  const { W, H, D, t } = dims;
  const panels = closedBox(dims);

  const innerW = W - 2 * t;
  const innerH = H - 2 * t;
  const innerD = D - 2 * t;
  const nX     = sectionsX - 1;
  const nY     = sectionsY - 1;
  const slotW  = t + 0.2;
  const slotD  = innerH / 2;

  for (let i = 0; i < nX; i++) {
    const slots = [];
    for (let j = 0; j < nY; j++) {
      const pos = (innerD / sectionsY) * (j + 1) - slotW / 2;
      slots.push({ pos, w: slotW, d: slotD, from: 'bottom' as const });
    }
    panels.push({
      id: `divX${i}`, label: `DIV-X${i+1}`,
      width: innerD, height: innerH, col: 3, tint: 4,
      edges: { T:'p', B:'p', L:'p', R:'p' },
      special: { type: 'divider', axis: 'x', slots },
    });
  }

  for (let j = 0; j < nY; j++) {
    const slots = [];
    for (let i = 0; i < nX; i++) {
      const pos = (innerW / sectionsX) * (i + 1) - slotW / 2;
      slots.push({ pos, w: slotW, d: slotD, from: 'top' as const });
    }
    panels.push({
      id: `divY${j}`, label: `DIV-Y${j+1}`,
      width: innerW, height: innerH, col: 4, tint: 4,
      edges: { T:'p', B:'p', L:'p', R:'p' },
      special: { type: 'divider', axis: 'y', slots },
    });
  }

  return panels;
}

export function generate(p: BoxParams): Panel[] {
  const dims: Dims = { W: p.width, H: p.height, D: p.depth, t: p.thickness };
  const map: Record<BoxType, () => Panel[]> = {
    open:    () => openTray(dims),
    closed:  () => closedBox(dims),
    hinged:  () => hingedLid(dims, p.hingeH),
    slider:  () => sliderLid(dims),
    liftoff: () => liftOffLid(dims),
    multi:   () => multiSection(dims, p.sectionsX, p.sectionsY),
  };
  return (map[p.boxType] ?? map.closed)();
}
