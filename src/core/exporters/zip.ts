import { strToU8, zipSync } from 'fflate';
import type { Panel } from '$core/types';
import type { BoxParams } from '$modules/boxes/types';
import { generateSVG } from './svg';
import { generateDXF } from './dxf';

export function downloadBoxZip(panels: Panel[], p: BoxParams): void {
  const svg = generateSVG(panels, p);
  const dxf = generateDXF(panels, p);
  const name = `box_${p.width}x${p.height}x${p.depth}`;

  const files: Record<string, Uint8Array> = {
    [`${name}.svg`]: strToU8(svg),
    [`${name}.dxf`]: strToU8(dxf),
  };

  const zipped = zipSync(files);
  const blob   = new Blob([zipped], { type: 'application/zip' });
  const url    = URL.createObjectURL(blob);
  const a      = document.createElement('a');
  a.href       = url;
  a.download   = `${name}.zip`;
  a.click();
  URL.revokeObjectURL(url);
}
