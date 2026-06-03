import type { Panel } from '$core/types';
import type { BoxParams } from '$modules/boxes/types';
import { panelPoints, hingeLines, grooveLines, dividerSlotPoints } from '$core/geometry/joints';

function fmt(n: number): string { return n.toFixed(4); }

function polyline(pts: [number,number][], layer: string, closed: boolean): string {
  const flag = closed ? 1 : 0;
  let out = `  0\nPOLYLINE\n  8\n${layer}\n 66\n     1\n 70\n     ${flag}\n`;
  for (const [x, y] of pts) {
    out += `  0\nVERTEX\n  8\n${layer}\n 10\n${fmt(x)}\n 20\n${fmt(y)}\n 30\n0.0\n`;
  }
  out += `  0\nSEQEND\n  8\n${layer}\n`;
  return out;
}

function line([x1,y1]: [number,number], [x2,y2]: [number,number], layer: string): string {
  return `  0\nLINE\n  8\n${layer}\n 10\n${fmt(x1)}\n 20\n${fmt(y1)}\n 30\n0.0\n 11\n${fmt(x2)}\n 21\n${fmt(y2)}\n 31\n0.0\n`;
}

function header(layers: string[]): string {
  const layerDefs = layers.flatMap(l => [
    `  0\nLAYER\n  2\n${l}\n 70\n     0\n 62\n     7\n  6\nCONTINUOUS\n`,
    `  0\nLAYER\n  2\n${l}_HINGE\n 70\n     0\n 62\n     1\n  6\nCONTINUOUS\n`,
    `  0\nLAYER\n  2\n${l}_GROOVE\n 70\n     0\n 62\n     3\n  6\nCONTINUOUS\n`,
    `  0\nLAYER\n  2\n${l}_SLOT\n 70\n     0\n 62\n     4\n  6\nCONTINUOUS\n`,
  ]).join('');

  return [
    '  0\nSECTION\n  2\nHEADER\n',
    '  9\n$ACADVER\n  1\nAC1009\n',
    '  9\n$INSUNITS\n 70\n     4\n',
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

export function generateDXF(panels: Panel[], p: BoxParams): string {
  const { thickness: t, kerf: k, fingerCount: fc, joint } = p;
  const layerNames = panels.map(panel => panel.label.replace(/\s/g, '_'));
  const chunks: string[] = [];

  chunks.push(header(layerNames));
  chunks.push('  0\nSECTION\n  2\nENTITIES\n');

  panels.forEach((panel, idx) => {
    const layer = layerNames[idx];
    const pts   = panelPoints(panel.width, panel.height, t, k, fc, joint, panel.edges);
    chunks.push(polyline(pts as [number,number][], layer, true));

    const sp = panel.special;
    if (sp) {
      if (sp.type === 'hinge') {
        const segs = hingeLines(panel.width, sp.y, sp.hingeH, t);
        for (const seg of segs) chunks.push(line(seg[0], seg[1], layer + '_HINGE'));
        const lidPts: [number,number][] = [[0,sp.lidY],[panel.width,sp.lidY],[panel.width,sp.lidY+sp.lidH],[0,sp.lidY+sp.lidH]];
        chunks.push(polyline(lidPts, layer + '_LID', true));
      }
      if (sp.type === 'groove') {
        const segs = grooveLines(panel.width, panel.height, sp.grooveY, sp.grooveH);
        for (const seg of segs) chunks.push(line(seg[0], seg[1], layer + '_GROOVE'));
      }
      if (sp.type === 'divider') {
        for (const slot of sp.slots) {
          const slotPts = dividerSlotPoints(panel.width, panel.height, slot.pos, slot.w, slot.d, slot.from);
          chunks.push(polyline(slotPts as [number,number][], layer + '_SLOT', false));
        }
      }
    }
  });

  chunks.push('  0\nENDSEC\n  0\nEOF\n');
  return chunks.join('');
}

export function downloadDXF(panels: Panel[], p: BoxParams): void {
  const dxf  = generateDXF(panels, p);
  const blob = new Blob([dxf], { type: 'application/dxf' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `box_${p.width}x${p.height}x${p.depth}.dxf`;
  a.click();
  URL.revokeObjectURL(url);
}
