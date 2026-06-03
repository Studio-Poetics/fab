import type { Panel, LayoutResult, PanelPlacement } from '$core/types';

const PAD = 10;

function effectiveBBox(p: Panel, t: number) {
  const proL = p.edges.L === 'f' ? t : 0;
  const proR = p.edges.R === 'f' ? t : 0;
  const proT = p.edges.T === 'f' ? t : 0;
  const proB = p.edges.B === 'f' ? t : 0;
  return {
    w:    p.width  + proL + proR,
    h:    p.height + proT + proB,
    offX: proL,
    offY: proT,
  };
}

export function layoutPanels(panels: Panel[], t: number): LayoutResult {
  const cols: Record<number, Panel[]> = {};
  for (const p of panels) {
    if (!cols[p.col]) cols[p.col] = [];
    cols[p.col].push(p);
  }

  const colKeys = Object.keys(cols).map(Number).sort((a, b) => a - b);
  const placements: PanelPlacement[] = [];

  let curX     = 0;
  let maxTotalH = 0;

  for (const colKey of colKeys) {
    const colPanels = cols[colKey];
    const effs      = colPanels.map(p => effectiveBBox(p, t));
    const colW      = Math.max(...effs.map(e => e.w));

    let curY = 0;
    for (let ci = 0; ci < colPanels.length; ci++) {
      const panel = colPanels[ci];
      const e     = effs[ci];
      const x     = curX + (colW - e.w) / 2 + e.offX;
      const y     = curY + e.offY;
      placements.push({ panel, x, y });
      curY += e.h + PAD;
    }

    maxTotalH = Math.max(maxTotalH, curY - PAD);
    curX += colW + PAD;
  }

  return { placements, totalW: curX - PAD, totalH: maxTotalH };
}
