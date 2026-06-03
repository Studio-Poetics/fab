import type { Panel } from '$core/types';
import type { BoxParams } from '$modules/boxes/types';
import { panelPoints, pointsToPath, hingeLines, grooveLines, dividerSlotPoints } from '$core/geometry/joints';
import { layoutPanels } from '$core/geometry/layout';

const FILLS   = ['#F6F5F3','#EDECE9','#E8E7E4','#E2E1DC','#DDD8CF'];
const CUT     = '#0C0C0B';
const HINGE   = '#E85D04';
const GROOVE  = '#1A7A3F';
const MARGIN  = 24;

function svgEl(tag: string, attrs: Record<string, string | number>): string {
  const a = Object.entries(attrs).map(([k, v]) => `${k}="${v}"`).join(' ');
  return `<${tag} ${a}/>`;
}

function panelSVG(panel: Panel, p: BoxParams, _scale: number): string {
  const { thickness: t, kerf: k, fingerCount: fc, joint } = p;
  const pts = panelPoints(panel.width, panel.height, t, k, fc, joint, panel.edges);
  const d   = pointsToPath(pts);
  const fill = FILLS[panel.tint] ?? FILLS[0];
  const sw   = '0.05'; // 0.05 mm — laser-cutter standard hairline

  let out = `<g transform="translate(0,0)">`;
  out += `<path d="${d}" fill="${fill}" stroke="${CUT}" stroke-width="${sw}" stroke-linejoin="miter"/>`;

  const sp = panel.special;
  if (sp) {
    if (sp.type === 'hinge') {
      const segs = hingeLines(panel.width, sp.y, sp.hingeH, t);
      for (const [[x1,y1],[x2,y2]] of segs) {
        out += svgEl('line', { x1, y1, x2, y2, stroke: HINGE, 'stroke-width': '0.05' });
      }
      out += svgEl('rect', { x:0, y:sp.y, width:panel.width, height:sp.hingeH, fill:'none', stroke:HINGE, 'stroke-width':'0.05', 'stroke-dasharray':'2,1.5', opacity:0.5 });
      out += svgEl('rect', { x:0, y:sp.lidY, width:panel.width, height:sp.lidH, fill:'none', stroke:'#888', 'stroke-width':'0.05', 'stroke-dasharray':'2,1.5', opacity:0.5 });
    }

    if (sp.type === 'groove') {
      const segs = grooveLines(panel.width, panel.height, sp.grooveY, sp.grooveH);
      for (const [[x1,y1],[x2,y2]] of segs) {
        out += svgEl('line', { x1, y1, x2, y2, stroke: GROOVE, 'stroke-width': '0.05', 'stroke-dasharray': '1.5,1' });
      }
    }

    if (sp.type === 'divider') {
      for (const slot of sp.slots) {
        const pts2 = dividerSlotPoints(panel.width, panel.height, slot.pos, slot.w, slot.d, slot.from);
        const d2 = pointsToPath(pts2);
        out += `<path d="${d2}" fill="none" stroke="${CUT}" stroke-width="0.05"/>`;
      }
    }
  }

  // label
  out += `<text x="2" y="4" font-family="IBM Plex Mono,monospace" font-size="3" fill="#888" opacity="0.6">${panel.label}</text>`;
  out += `</g>`;
  return out;
}

export function generateSVG(panels: Panel[], p: BoxParams): string {
  const { thickness: t } = p;
  const layout = layoutPanels(panels, t);
  const vbW = layout.totalW + MARGIN * 2;
  const vbH = layout.totalH + MARGIN * 2;

  // 1 viewBox unit = 1 mm; width/height in mm tells Inkscape/LightBurn the physical size
  let svg = `<svg xmlns="http://www.w3.org/2000/svg"`;
  svg += ` viewBox="0 0 ${vbW.toFixed(3)} ${vbH.toFixed(3)}"`;
  svg += ` width="${vbW.toFixed(3)}mm" height="${vbH.toFixed(3)}mm">`;
  svg += `<rect width="${vbW.toFixed(3)}" height="${vbH.toFixed(3)}" fill="#F6F5F3"/>`;
  svg += `<g transform="translate(${MARGIN},${MARGIN})">`;

  for (const { panel, x, y } of layout.placements) {
    svg += `<g transform="translate(${x.toFixed(3)},${y.toFixed(3)})">`;
    svg += panelSVG(panel, p, 1);
    svg += `</g>`;
  }

  svg += `</g></svg>`;
  return svg;
}

export function downloadSVG(panels: Panel[], p: BoxParams): void {
  const svg  = generateSVG(panels, p);
  const blob = new Blob([svg], { type: 'image/svg+xml' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `box_${p.width}x${p.height}x${p.depth}.svg`;
  a.click();
  URL.revokeObjectURL(url);
}
