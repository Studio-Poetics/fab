import type { Warning } from '$core/types';
import type { BoxParams } from '$modules/boxes/types';

export function validate(p: BoxParams): Warning[] {
  const warnings: Warning[] = [];
  const { width: W, height: H, depth: D, thickness: t, fingerCount: fc } = p;

  if (t >= Math.min(W, H, D) / 2) {
    warnings.push({ level: 'error', message: 'Thickness too large relative to box dimensions.' });
  }

  if (fc < 2) {
    warnings.push({ level: 'error', message: 'Finger count must be at least 2.' });
  }

  const minDim = Math.min(W, H, D);
  const minFingerSize = minDim / (fc * 2 - 1);
  if (minFingerSize < t * 0.5) {
    warnings.push({ level: 'error', message: `Finger tab ${minFingerSize.toFixed(1)}mm is less than half material thickness — joints will fail.` });
  } else if (minFingerSize < t) {
    warnings.push({ level: 'warning', message: `Finger tab ${minFingerSize.toFixed(1)}mm is narrower than ${t}mm material — reduce finger count.` });
  }

  if (p.kerf < 0) {
    warnings.push({ level: 'error', message: 'Kerf cannot be negative.' });
  }

  if (p.kerf > 0.5) {
    warnings.push({ level: 'warning', message: `Kerf ${p.kerf}mm is unusually high — verify laser settings.` });
  }

  if (p.boxType === 'multi') {
    const cellW = (p.width - (p.sectionsX + 1) * p.thickness) / p.sectionsX;
    const cellD = (p.depth  - (p.sectionsY + 1) * p.thickness) / p.sectionsY;
    if (cellW < p.thickness) {
      warnings.push({ level: 'error', message: `Multi-section: column cell ${cellW.toFixed(1)} mm < material ${p.thickness} mm — reduce columns or thickness.` });
    }
    if (cellD < p.thickness) {
      warnings.push({ level: 'error', message: `Multi-section: row cell ${cellD.toFixed(1)} mm < material ${p.thickness} mm — reduce rows or thickness.` });
    }
  }

  return warnings;
}

export function isValid(warnings: Warning[]): boolean {
  return !warnings.some(w => w.level === 'error');
}
