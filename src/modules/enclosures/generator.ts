import type { EdgeSpec } from '$core/types';
import { panelPoints, pointsToPath } from '$core/geometry/joints';
import type { EnclosureParams, Cutout, CutoutDim, PanelSide } from './types';
import { CUTOUT_DIMS } from './types';

export interface EnclosurePanel {
  side:    PanelSide;
  label:   string;
  w:       number;    // mm — nominal panel width
  h:       number;    // mm — nominal panel height
  edges:   EdgeSpec;  // finger-joint edge spec
  cutouts: Cutout[];
}

// Finger-joint edge specs for each face (closed-box convention)
export const ENCLOSURE_EDGES: Record<PanelSide, EdgeSpec> = {
  front:  { T: 'g', B: 'g', L: 'f', R: 'f' },
  back:   { T: 'g', B: 'g', L: 'f', R: 'f' },
  top:    { T: 'f', B: 'f', L: 'f', R: 'f' },
  bottom: { T: 'f', B: 'f', L: 'f', R: 'f' },
  left:   { T: 'g', B: 'g', L: 'g', R: 'g' },
  right:  { T: 'g', B: 'g', L: 'g', R: 'g' },
};

/** Returns panel data for each face of the enclosure. */
export function getEnclosurePanels(p: EnclosureParams): EnclosurePanel[] {
  const { width: W, height: H, depth: D, thickness: t, fingerJoints } = p;
  const byPanel = (side: PanelSide) =>
    p.cutouts.filter(c => c.panel === side || (side === 'front' && !c.panel));

  // Left/right panels fit INSIDE the four primary panels when finger-jointed,
  // otherwise they're inset by t on each side.
  const lrW = fingerJoints ? D : D - t * 2;
  const lrH = fingerJoints ? H : H - t * 2;

  return [
    { side: 'front',  label: 'FRONT',  w: W,   h: H,   edges: ENCLOSURE_EDGES.front,  cutouts: byPanel('front')  },
    { side: 'back',   label: 'BACK',   w: W,   h: H,   edges: ENCLOSURE_EDGES.back,   cutouts: byPanel('back')   },
    { side: 'top',    label: 'TOP',    w: W,   h: D,   edges: ENCLOSURE_EDGES.top,    cutouts: byPanel('top')    },
    { side: 'bottom', label: 'BOTTOM', w: W,   h: D,   edges: ENCLOSURE_EDGES.bottom, cutouts: byPanel('bottom') },
    { side: 'left',   label: 'LEFT',   w: lrW, h: lrH, edges: ENCLOSURE_EDGES.left,   cutouts: byPanel('left')   },
    { side: 'right',  label: 'RIGHT',  w: lrW, h: lrH, edges: ENCLOSURE_EDGES.right,  cutouts: byPanel('right')  },
  ];
}

/**
 * Returns an SVG path d-string for one cutout, kerf-compensated, centered at (c.x, c.y).
 * Shapes: circle → two-arc path, rounded_rect → rounded rect, trapezoid → HDMI profile,
 * chamfered_rect → D-sub profile (chamfered top corners), rect → plain rectangle.
 */
export function cutoutPath(c: Cutout, dims: CutoutDim, kerf: number): string {
  const cx = c.x, cy = c.y;
  const f = (v: number) => v.toFixed(3);

  if (dims.shape === 'circle') {
    const r = Math.max(0.1, (c.d ?? dims.w) / 2 - kerf / 2);
    // Two half-arcs (a single full arc is not renderable as one <path> command)
    return `M ${f(cx+r)},${f(cy)} A ${f(r)},${f(r)} 0 1,0 ${f(cx-r)},${f(cy)} ` +
           `A ${f(r)},${f(r)} 0 1,0 ${f(cx+r)},${f(cy)} Z`;
  }

  if (dims.shape === 'rounded_rect') {
    const w = Math.max(0.2, (c.w ?? dims.w) - kerf);
    const h = Math.max(0.2, (c.h ?? dims.h) - kerf);
    const r = Math.min(dims.r, w / 2, h / 2);
    const x1 = cx - w/2, y1 = cy - h/2, x2 = cx + w/2, y2 = cy + h/2;
    return `M ${f(x1+r)},${f(y1)} L ${f(x2-r)},${f(y1)} A ${f(r)},${f(r)} 0 0,1 ${f(x2)},${f(y1+r)} ` +
           `L ${f(x2)},${f(y2-r)} A ${f(r)},${f(r)} 0 0,1 ${f(x2-r)},${f(y2)} ` +
           `L ${f(x1+r)},${f(y2)} A ${f(r)},${f(r)} 0 0,1 ${f(x1)},${f(y2-r)} ` +
           `L ${f(x1)},${f(y1+r)} A ${f(r)},${f(r)} 0 0,1 ${f(x1+r)},${f(y1)} Z`;
  }

  if (dims.shape === 'trapezoid') {
    // Top (wider, latch side) = cy - h/2; bottom (narrower) = cy + h/2
    const tw = Math.max(0.2, (c.w ?? dims.w) - kerf);
    const bw = Math.max(0.2, dims.bottomW - kerf);
    const h  = Math.max(0.2, (c.h ?? dims.h) - kerf);
    return `M ${f(cx-tw/2)},${f(cy-h/2)} L ${f(cx+tw/2)},${f(cy-h/2)} ` +
           `L ${f(cx+bw/2)},${f(cy+h/2)} L ${f(cx-bw/2)},${f(cy+h/2)} Z`;
  }

  if (dims.shape === 'chamfered_rect') {
    // D-sub "D" profile: chamfered top-left and top-right corners, flat bottom
    const w  = Math.max(0.2, (c.w ?? dims.w) - kerf);
    const h  = Math.max(0.2, (c.h ?? dims.h) - kerf);
    const ch = Math.min(dims.chamfer, w / 3, h / 3);
    const x1 = cx - w/2, y1 = cy - h/2, x2 = cx + w/2, y2 = cy + h/2;
    return `M ${f(x1+ch)},${f(y1)} L ${f(x2-ch)},${f(y1)} L ${f(x2)},${f(y1+ch)} ` +
           `L ${f(x2)},${f(y2)} L ${f(x1)},${f(y2)} L ${f(x1)},${f(y1+ch)} Z`;
  }

  // plain rect
  const w = Math.max(0.2, (c.w ?? dims.w) - kerf);
  const h = Math.max(0.2, (c.h ?? dims.h) - kerf);
  return `M ${f(cx-w/2)},${f(cy-h/2)} h ${f(w)} v ${f(h)} h ${f(-w)} Z`;
}

/**
 * Generates SVG for a single enclosure panel.
 * Applies kerf compensation to all cutouts:
 *   holes are drawn slightly smaller so the laser removes exactly the right amount.
 * When fingerJoints=true, the panel outline uses the finger-joint profile.
 */
export function panelSVG(
  panel: EnclosurePanel,
  p: Pick<EnclosureParams, 'kerf' | 'fingerJoints' | 'fingerCount' | 'thickness'>,
  padding: number = 2,
): string {
  const { w, h, cutouts } = panel;
  const kerf = p.kerf ?? 0;
  const sw   = '0.05';
  const pad  = padding;

  // Determine the bounding box for the SVG viewport (tabs may protrude beyond w×h)
  let minX = 0, minY = 0, maxX = w, maxY = h;
  if (p.fingerJoints) {
    const t = p.thickness;
    if (panel.edges.L === 'f') minX = -t;
    if (panel.edges.R === 'f') maxX = w + t;
    if (panel.edges.T === 'f') minY = -t;
    if (panel.edges.B === 'f') maxY = h + t;
  }

  const vW = (maxX - minX) + pad * 2;
  const vH = (maxY - minY) + pad * 2;
  const tx  = pad - minX;   // translate origin so (0,0) in panel-space = correct SVG position
  const ty  = pad - minY;

  let out = `<svg xmlns="http://www.w3.org/2000/svg"`;
  out += ` width="${vW.toFixed(3)}mm" height="${vH.toFixed(3)}mm"`;
  out += ` viewBox="0 0 ${vW.toFixed(3)} ${vH.toFixed(3)}">`;
  out += `<g transform="translate(${tx.toFixed(3)},${ty.toFixed(3)})">`;

  // Panel outline
  if (p.fingerJoints) {
    const pts  = panelPoints(w, h, p.thickness, kerf, p.fingerCount, 'finger', panel.edges);
    const path = pointsToPath(pts);
    out += `<path d="${path}" fill="none" stroke="#0C0C0B" stroke-width="${sw}"/>`;
  } else {
    out += `<rect x="0" y="0" width="${w.toFixed(3)}" height="${h.toFixed(3)}" fill="none" stroke="#0C0C0B" stroke-width="${sw}"/>`;
  }

  // Cutouts with kerf compensation — exact shape per connector profile
  for (const c of cutouts) {
    const dims    = CUTOUT_DIMS[c.type];
    const d       = cutoutPath(c, dims, kerf);
    const rot     = c.rotation ?? 0;
    const rotAttr = rot !== 0 ? ` transform="rotate(${rot},${c.x.toFixed(3)},${c.y.toFixed(3)})"` : '';
    out += `<g${rotAttr}><path d="${d}" fill="none" stroke="#0C0C0B" stroke-width="${sw}"/></g>`;
    if (c.label) {
      const labelR = dims.shape === 'circle' ? (c.d ?? dims.w) / 2 : (c.h ?? dims.h) / 2;
      out += `<text x="${c.x.toFixed(3)}" y="${(c.y + labelR + 3).toFixed(3)}" text-anchor="middle" font-family="IBM Plex Mono,monospace" font-size="2.5" fill="#888">${c.label}</text>`;
    }
  }

  // Panel label
  out += `<text x="2" y="4" font-family="IBM Plex Mono,monospace" font-size="3" fill="#888" opacity="0.6">${panel.label}</text>`;
  out += `</g></svg>`;
  return out;
}
