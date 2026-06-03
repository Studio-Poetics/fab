import type { Vec2, EdgeSpec } from '$core/types';

// 'f' = finger tabs protrude OUTWARD from the nominal edge
// 'g' = grooves/notches cut INWARD from the nominal edge (complementary to 'f')
// Two panels sharing an edge: one gets 'f', the other gets 'g'; tabs and notches
// are both at ODD-indexed segments so they align spatially when assembled.

export function panelPoints(
  W: number, H: number,
  t: number, _k: number, fc: number,
  joint: string, edges: EdgeSpec
): Vec2[] {
  if (joint === 'plain') return [[0,0],[W,0],[W,H],[0,H]];

  const fW  = W / (fc * 2 - 1);
  const fH  = H / (fc * 2 - 1);
  const dep = t;
  const pts: Vec2[] = [];

  // TOP edge (L→R)
  // 'f': tabs protrude UP (y = -dep at odd i)
  // 'g': notches cut DOWN into body (y = +dep at odd i)
  if (edges.T === 'f') {
    pts.push([0, 0]);
    for (let i = 0; i < fc * 2 - 1; i++) {
      const x0 = i * fW, x1 = (i + 1) * fW;
      pts.push([x0, i % 2 === 0 ? 0 : -dep]);
      pts.push([x1, i % 2 === 0 ? 0 : -dep]);
    }
    pts.push([W, 0]);
  } else if (edges.T === 'g') {
    pts.push([0, 0]);
    for (let i = 0; i < fc * 2 - 1; i++) {
      const x0 = i * fW, x1 = (i + 1) * fW;
      pts.push([x0, i % 2 === 0 ? 0 : dep]);
      pts.push([x1, i % 2 === 0 ? 0 : dep]);
    }
    pts.push([W, 0]);
  } else {
    pts.push([0, 0]);
    pts.push([W, 0]);
  }

  // RIGHT edge (T→B)
  // 'f': tabs protrude RIGHT (x = W+dep at odd i)
  // 'g': notches cut LEFT into body (x = W-dep at odd i)
  if (edges.R === 'f') {
    for (let i = 0; i < fc * 2 - 1; i++) {
      const y0 = i * fH, y1 = (i + 1) * fH;
      pts.push([i % 2 === 0 ? W : W + dep, y0]);
      pts.push([i % 2 === 0 ? W : W + dep, y1]);
    }
    pts.push([W, H]);
  } else if (edges.R === 'g') {
    for (let i = 0; i < fc * 2 - 1; i++) {
      const y0 = i * fH, y1 = (i + 1) * fH;
      pts.push([i % 2 === 0 ? W : W - dep, y0]);
      pts.push([i % 2 === 0 ? W : W - dep, y1]);
    }
    pts.push([W, H]);
  } else {
    pts.push([W, H]);
  }

  // BOTTOM edge (R→L)
  // 'f': tabs protrude DOWN (y = H+dep at odd i)
  // 'g': notches cut UP into body (y = H-dep at odd i)
  if (edges.B === 'f') {
    for (let i = fc * 2 - 2; i >= 0; i--) {
      const x0 = (i + 1) * fW, x1 = i * fW;
      pts.push([x0, i % 2 === 0 ? H : H + dep]);
      pts.push([x1, i % 2 === 0 ? H : H + dep]);
    }
    pts.push([0, H]);
  } else if (edges.B === 'g') {
    for (let i = fc * 2 - 2; i >= 0; i--) {
      const x0 = (i + 1) * fW, x1 = i * fW;
      pts.push([x0, i % 2 === 0 ? H : H - dep]);
      pts.push([x1, i % 2 === 0 ? H : H - dep]);
    }
    pts.push([0, H]);
  } else {
    pts.push([0, H]);
  }

  // LEFT edge (B→T)
  // 'f': tabs protrude LEFT (x = -dep at odd i)
  // 'g': notches cut RIGHT into body (x = +dep at odd i)
  if (edges.L === 'f') {
    for (let i = fc * 2 - 2; i >= 0; i--) {
      const y0 = (i + 1) * fH, y1 = i * fH;
      pts.push([i % 2 === 0 ? 0 : -dep, y0]);
      pts.push([i % 2 === 0 ? 0 : -dep, y1]);
    }
  } else if (edges.L === 'g') {
    for (let i = fc * 2 - 2; i >= 0; i--) {
      const y0 = (i + 1) * fH, y1 = i * fH;
      pts.push([i % 2 === 0 ? 0 : dep, y0]);
      pts.push([i % 2 === 0 ? 0 : dep, y1]);
    }
  } else {
    pts.push([0, 0]);
  }

  return pts;
}

export function pointsToPath(pts: Vec2[]): string {
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0].toFixed(3)} ${p[1].toFixed(3)}`).join(' ') + ' Z';
}

export function hingeLines(W: number, startY: number, hingeH: number, t: number): [Vec2, Vec2][] {
  const bridge  = 3;
  const spacing = Math.max(t, 2.5);
  const lines: [Vec2, Vec2][] = [];
  let y   = startY + spacing / 2;
  let row = 0;
  while (y < startY + hingeH - spacing / 2) {
    if (row % 2 === 0) {
      lines.push([[bridge, y], [W, y]]);        // bridge on left, reaches right edge
    } else {
      lines.push([[0, y], [W - bridge, y]]);    // bridge on right, starts at left edge
    }
    y += spacing;
    row++;
  }
  return lines;
}

export function grooveLines(W: number, _H: number, grooveY: number, grooveH: number): [Vec2, Vec2][] {
  return [
    [[0, grooveY],          [W, grooveY]],
    [[0, grooveY + grooveH],[W, grooveY + grooveH]],
  ];
}

export function dividerSlotPoints(W: number, H: number, pos: number, w: number, d: number, from: 'top' | 'bottom'): Vec2[] {
  if (from === 'top') {
    return [[pos, 0], [pos + w, 0], [pos + w, d], [pos, d]];
  } else {
    return [[pos, H], [pos + w, H], [pos + w, H - d], [pos, H - d]];
  }
}
