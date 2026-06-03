import type { KineticParams } from './types';

export interface CrankSliderState {
  crankPinX: number;  // mm from pivot
  crankPinY: number;
  sliderX:   number;  // mm from pivot along guide
  rodAngle:  number;  // degrees
  valid:     boolean;
}

export interface ScotchYokeState {
  crankPinX: number;
  crankPinY: number;
  yokeX:     number;  // yoke centre x (= crankPinX)
}

/** Computes crank-slider state. Returns valid=false if rod too short for current angle. */
export function crankSliderState(angleDeg: number, r: number, L: number): CrankSliderState {
  const θ = angleDeg * Math.PI / 180;
  const pinX = r * Math.cos(θ);
  const pinY = r * Math.sin(θ);
  const disc = L * L - pinY * pinY;
  if (disc < 0) return { crankPinX: pinX, crankPinY: pinY, sliderX: 0, rodAngle: 0, valid: false };
  const sliderX = pinX + Math.sqrt(disc);
  const rodAngle = Math.atan2(-pinY, sliderX - pinX) * 180 / Math.PI;
  return { crankPinX: pinX, crankPinY: pinY, sliderX, rodAngle, valid: true };
}

export function scotchYokeState(angleDeg: number, r: number): ScotchYokeState {
  const θ = angleDeg * Math.PI / 180;
  return {
    crankPinX: r * Math.cos(θ),
    crankPinY: r * Math.sin(θ),
    yokeX: r * Math.cos(θ),
  };
}

// ── Cut-part SVG profiles ────────────────────────────────────────────────────

/** Crank disc: outer circle + centre hole + offset pin hole */
export function crankDiscSVG(p: KineticParams): string {
  const outerR = p.crankR + p.pinHoleD + 6;
  const cHoleR = p.crankHoleD / 2;
  const pHoleR = p.pinHoleD / 2;
  const circle  = (r: number, cx = 0, cy = 0) =>
    `M ${(cx + r).toFixed(3)},${cy.toFixed(3)} A ${r},${r} 0 1,0 ${(cx - r).toFixed(3)},${cy.toFixed(3)} A ${r},${r} 0 1,0 ${(cx + r).toFixed(3)},${cy.toFixed(3)} Z`;

  const d = [
    circle(outerR),              // outer edge
    circle(cHoleR),              // centre bore (evenodd cuts out)
    circle(pHoleR, p.crankR, 0), // pin hole at crank radius
  ].join(' ');

  const s = outerR + 4;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${s * 2}mm" height="${s * 2}mm"`,
    `     viewBox="${-s} ${-s} ${s * 2} ${s * 2}">`,
    `<path d="${d}" fill="none" stroke="#000" stroke-width="0.05" fill-rule="evenodd"/>`,
    `</svg>`,
  ].join('\n');
}

/** Connecting rod: capsule shape with pin holes at each end */
export function connectingRodSVG(p: KineticParams): string {
  const L   = p.rodLength;
  const pR  = p.pinHoleD / 2;
  const hw  = Math.max(pR * 2.2, 7);  // half-width of rod body
  const circle = (r: number, cx = 0) =>
    `M ${(cx + r).toFixed(3)},0 A ${r},${r} 0 1,0 ${(cx - r).toFixed(3)},0 A ${r},${r} 0 1,0 ${(cx + r).toFixed(3)},0 Z`;

  // Capsule outline
  const outline = `M 0,${-hw} L ${L},${-hw} A ${hw},${hw} 0 0,1 ${L},${hw} L 0,${hw} A ${hw},${hw} 0 0,1 0,${-hw} Z`;
  const d = [
    outline,
    circle(pR, 0),   // left pin hole
    circle(pR, L),   // right pin hole
  ].join(' ');

  const padX = hw + 4;
  const padY = hw + 4;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${L + padX * 2}mm" height="${hw * 2 + padY * 2}mm"`,
    `     viewBox="${-padX} ${-(hw + padY)} ${L + padX * 2} ${(hw + padY) * 2}">`,
    `<path d="${d}" fill="none" stroke="#000" stroke-width="0.05" fill-rule="evenodd"/>`,
    `</svg>`,
  ].join('\n');
}

// ── Four-bar linkage ────────────────────────────────────────────────────────

export type GrashofClass = 'crank-rocker' | 'double-crank' | 'double-rocker' | 'rocker-crank';

export interface GrashofResult {
  grashofClass:  GrashofClass;
  satisfied:     boolean;
  crankRotates:  boolean;
}

/**
 * Determines the Grashof classification of a four-bar linkage.
 * a=crank, b=coupler, c=follower, d=ground
 */
export function grashofClass(a: number, b: number, c: number, d: number): GrashofResult {
  const links = [a, b, c, d];
  const s = Math.min(...links);
  const l = Math.max(...links);
  const pq = a + b + c + d - s - l;
  const satisfied = s + l <= pq;

  if (!satisfied) {
    return { grashofClass: 'double-rocker', satisfied: false, crankRotates: false };
  }

  // Identify which link is the shortest
  if (s === d) return { grashofClass: 'double-crank',   satisfied: true, crankRotates: true  };
  if (s === a) return { grashofClass: 'crank-rocker',   satisfied: true, crankRotates: true  };
  if (s === c) return { grashofClass: 'rocker-crank',   satisfied: true, crankRotates: false };
  // s === b (coupler is shortest)
  return   { grashofClass: 'double-rocker',  satisfied: true, crankRotates: false };
}

export interface FourBarState {
  Ax: number; Ay: number;    // ground pivot A (0,0)
  Bx: number; By: number;    // crank pin B
  Cx: number; Cy: number;    // coupler-follower joint C
  Dx: number; Dy: number;    // ground pivot D (ground, 0)
  Px: number; Py: number;    // coupler point P
  theta2: number;            // crank angle (deg)
  theta3: number;            // coupler angle (deg)
  theta4: number;            // follower angle (deg)
  omega3: number;            // ω₃/ω₂ (normalized velocity ratio)
  omega4: number;            // ω₄/ω₂ (normalized velocity ratio)
  transmAngle: number;       // transmission angle at C (deg)
  valid:  boolean;
  branch: 'open' | 'crossed';
}

/**
 * Solves four-bar linkage via triangle construction.
 * Links: a=crank(AB), b=coupler(BC), c=follower(CD), d=ground(AD)
 * A at origin, D at (d, 0).
 * coupler_p: distance along coupler from B; coupler_q: perpendicular offset
 */
export function fourBarState(
  theta2Deg: number,
  a: number,
  b: number,
  c: number,
  d: number,
  branch: 'open' | 'crossed' = 'open',
  coupler_p: number = 0,
  coupler_q: number = 0,
): FourBarState {
  const θ2 = theta2Deg * Math.PI / 180;
  const Ax = 0, Ay = 0;
  const Dx = d, Dy = 0;
  const Bx = a * Math.cos(θ2);
  const By = a * Math.sin(θ2);

  const BDx = Dx - Bx;
  const BDy = Dy - By;
  const BD  = Math.hypot(BDx, BDy);

  const invalid: FourBarState = {
    Ax, Ay, Bx, By, Cx: Bx, Cy: By, Dx, Dy,
    Px: Bx, Py: By,
    theta2: theta2Deg, theta3: 0, theta4: 0,
    omega3: 0, omega4: 0, transmAngle: 90,
    valid: false, branch,
  };

  if (BD > b + c || BD < Math.abs(b - c) || BD < 1e-9) return invalid;

  const cosAngle = (b * b + BD * BD - c * c) / (2 * b * BD);
  const halfAngle = Math.acos(Math.max(-1, Math.min(1, cosAngle)));
  const bdAngle = Math.atan2(BDy, BDx);

  const θ3 = branch === 'open' ? bdAngle + halfAngle : bdAngle - halfAngle;
  const Cx = Bx + b * Math.cos(θ3);
  const Cy = By + b * Math.sin(θ3);
  const θ4 = Math.atan2(Cy - Dy, Cx - Dx);

  // Coupler point P
  const Px = Bx + coupler_p * Math.cos(θ3) - coupler_q * Math.sin(θ3);
  const Py = By + coupler_p * Math.sin(θ3) + coupler_q * Math.cos(θ3);

  // Velocity ratios (ω₂ = 1 normalized)
  const sinDiff34 = Math.sin(θ3 - θ4);
  const omega3 = Math.abs(sinDiff34) < 1e-9
    ? 0
    : (a * Math.sin(θ4 - θ2)) / (b * sinDiff34);
  const omega4 = Math.abs(sinDiff34) < 1e-9
    ? 0
    : (a * Math.sin(θ2 - θ3)) / (c * (-sinDiff34));

  // Transmission angle: angle at C between CB and CD vectors
  const CBx = Bx - Cx, CBy = By - Cy;
  const CDx = Dx - Cx, CDy = Dy - Cy;
  const cbLen = Math.hypot(CBx, CBy);
  const cdLen = Math.hypot(CDx, CDy);
  let transmAngle = 90;
  if (cbLen > 1e-9 && cdLen > 1e-9) {
    const dot = (CBx * CDx + CBy * CDy) / (cbLen * cdLen);
    transmAngle = Math.acos(Math.max(-1, Math.min(1, dot))) * 180 / Math.PI;
  }

  return {
    Ax, Ay, Bx, By, Cx, Cy, Dx, Dy, Px, Py,
    theta2: theta2Deg,
    theta3: θ3 * 180 / Math.PI,
    theta4: θ4 * 180 / Math.PI,
    omega3, omega4, transmAngle,
    valid: true, branch,
  };
}

/**
 * Returns an SVG string for a single link (capsule shape with pin holes).
 * length = center-to-center distance, units in mm.
 */
export function fourBarLinkSVG(length: number, pinHoleD: number, thickness: number): string {
  const hw  = thickness / 2 + 2;
  const pR  = pinHoleD / 2;
  const pad = hw + 4;

  const circle = (cx: number) =>
    `M ${(cx + pR).toFixed(3)},0 A ${pR},${pR} 0 1,0 ${(cx - pR).toFixed(3)},0 A ${pR},${pR} 0 1,0 ${(cx + pR).toFixed(3)},0 Z`;

  const outline =
    `M 0,${-hw} L ${length},${-hw} A ${hw},${hw} 0 0,1 ${length},${hw} ` +
    `L 0,${hw} A ${hw},${hw} 0 0,1 0,${-hw} Z`;

  const d = [outline, circle(0), circle(length)].join(' ');
  const vbW = length + pad * 2;
  const vbH = (hw + pad) * 2;

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${vbW}mm" height="${vbH}mm"`,
    `     viewBox="${-pad} ${-(hw + pad)} ${vbW} ${vbH}">`,
    `<path d="${d}" fill="none" stroke="#000" stroke-width="0.05" fill-rule="evenodd"/>`,
    `</svg>`,
  ].join('\n');
}

/**
 * Generates an SVG sheet with all four links of a four-bar linkage,
 * stacked vertically with labels. Each link is a capsule with bore holes.
 * Includes the ground link as a mounting plate.
 */
export function fourBarAssemblySVG(
  a: number, b: number, c: number, d: number,
  pinHoleD: number, thickness: number,
): string {
  const hw   = thickness / 2 + 2;  // link half-width
  const pR   = pinHoleD / 2;
  const padX = hw + 6;
  const padY = 6;
  const labelH = 8;
  const rowGap = 6;
  const rowH   = hw * 2 + labelH + rowGap;

  const links = [
    { label: 'GROUND  AD', sub: `pivot spacing · ${d} mm`, len: d },
    { label: 'CRANK   AB', sub: `link AB · ${a} mm c-c`,   len: a },
    { label: 'COUPLER BC', sub: `link BC · ${b} mm c-c`,   len: b },
    { label: 'FOLLOWER CD', sub: `link CD · ${c} mm c-c`,  len: c },
  ];

  const maxLen = Math.max(a, b, c, d);
  const sheetW = maxLen + padX * 2;
  const sheetH = rowH * links.length + padY * 2;

  const arc2 = (cx: number, cy: number, r: number) =>
    `M ${(cx+r).toFixed(3)},${cy.toFixed(3)} ` +
    `A ${r.toFixed(3)},${r.toFixed(3)} 0 1,0 ${(cx-r).toFixed(3)},${cy.toFixed(3)} ` +
    `A ${r.toFixed(3)},${r.toFixed(3)} 0 1,0 ${(cx+r).toFixed(3)},${cy.toFixed(3)} Z`;

  const parts: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg"`,
    ` width="${sheetW.toFixed(1)}mm" height="${sheetH.toFixed(1)}mm"`,
    ` viewBox="0 0 ${sheetW.toFixed(1)} ${sheetH.toFixed(1)}">`,
  ];

  links.forEach(({ label, sub, len }, i) => {
    const cy = padY + i * rowH + hw;
    const x0 = padX;
    const x1 = padX + len;
    const f  = (v: number) => v.toFixed(3);
    const outline = `M ${f(x0)},${f(cy-hw)} L ${f(x1)},${f(cy-hw)} ` +
      `A ${f(hw)},${f(hw)} 0 0,1 ${f(x1)},${f(cy+hw)} ` +
      `L ${f(x0)},${f(cy+hw)} A ${f(hw)},${f(hw)} 0 0,1 ${f(x0)},${f(cy-hw)} Z`;
    const path = `${outline} ${arc2(x0, cy, pR)} ${arc2(x1, cy, pR)}`;
    parts.push(`<path d="${path}" fill="none" stroke="#0C0C0B" stroke-width="0.05" fill-rule="evenodd"/>`);
    parts.push(`<text x="${f(padX)}" y="${f(cy + hw + 4.5)}" font-family="IBM Plex Mono,monospace" font-size="3" fill="#555">${label}</text>`);
    parts.push(`<text x="${f(padX + len / 2)}" y="${f(cy + hw + 4.5)}" text-anchor="middle" font-family="IBM Plex Mono,monospace" font-size="2.5" fill="#AEADA9">${sub}</text>`);
  });

  parts.push('</svg>');
  return parts.join('\n');
}

export function downloadSVGPart(svgContent: string, name: string): void {
  const blob = new Blob([svgContent], { type: 'image/svg+xml' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
