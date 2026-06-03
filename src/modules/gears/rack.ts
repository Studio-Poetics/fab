/** Rack tooth profile generator.
 *  Origin = pitch line left edge. Y increases downward (SVG convention).
 *  Tips at y = -add, root at y = +ded, rack back at y = +ded + backH
 */
export function rackPoints(
  nTeeth: number,
  module: number,
  PADeg: number,
  backH: number,
): [number, number][] {
  const PA     = PADeg * Math.PI / 180;
  const pitch  = Math.PI * module;
  const add    = module;
  const ded    = 1.25 * module;
  const tipHW  = pitch / 4 - add  * Math.tan(PA); // half-width at tip
  const rootHW = pitch / 4 + ded  * Math.tan(PA); // half-width of tooth space at root

  const W = nTeeth * pitch;

  // Start at bottom-left, go clockwise
  const pts: [number, number][] = [[0, ded + backH]];

  // Left side up to root level
  pts.push([0, ded]);

  // Tooth profile left-to-right
  for (let i = 0; i < nTeeth; i++) {
    const cx = (i + 0.5) * pitch;
    pts.push([cx - rootHW, ded]);   // root left
    pts.push([cx - tipHW,  -add]);  // tip left
    pts.push([cx + tipHW,  -add]);  // tip right
    pts.push([cx + rootHW, ded]);   // root right
  }

  // Right side down
  pts.push([W, ded]);
  pts.push([W, ded + backH]);

  return pts;
}

/** SVG path string from rack points (closed). */
export function rackPath(
  nTeeth: number,
  module: number,
  PADeg: number,
  backH: number,
): string {
  const pts = rackPoints(nTeeth, module, PADeg, backH);
  return 'M' + pts.map(([x, y]) => `${x.toFixed(4)},${y.toFixed(4)}`).join(' ') + 'Z';
}
