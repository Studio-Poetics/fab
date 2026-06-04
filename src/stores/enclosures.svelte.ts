import {
  DEFAULT_ENCLOSURE_PARAMS,
  type EnclosureParams, type Cutout, type CutoutType, type PanelSide,
  type CutoutAnchor, type AnchorRef, type AnchorRefY,
} from '$modules/enclosures/types';
import { getEnclosurePanels, type EnclosurePanel } from '$modules/enclosures/generator';
import { CUTOUT_DIMS } from '$modules/enclosures/types';

let _nextId = 1;
function uid() { return `c${Date.now()}_${_nextId++}`; }

const HISTORY_LIMIT = 50;

// Compute absolute x,y from an anchor definition and panel size.
function resolveAnchor(a: CutoutAnchor, w: number, h: number): { x: number; y: number } {
  const x = a.refX === 'left' ? a.dx : a.refX === 'right' ? w - a.dx : w / 2 + a.dx;
  const y = a.refY === 'top'  ? a.dy : a.refY === 'bottom' ? h - a.dy : h / 2 + a.dy;
  return { x, y };
}

function snapParams(p: EnclosureParams): EnclosureParams {
  return {
    ...p,
    cutouts: p.cutouts.map(c => ({
      ...c,
      anchor: c.anchor ? { ...c.anchor } : undefined,
    })),
  };
}

class EnclosureStore {
  params = $state<EnclosureParams>({ ...DEFAULT_ENCLOSURE_PARAMS, cutouts: DEFAULT_ENCLOSURE_PARAMS.cutouts.map(c => ({ ...c })) });

  panels = $derived<EnclosurePanel[]>(getEnclosurePanels(this.params));

  valid = $derived(
    this.params.width > 0 &&
    this.params.height > 0 &&
    this.params.depth > 0 &&
    this.params.thickness > 0 &&
    this.params.thickness * 2 < Math.min(this.params.width, this.params.height, this.params.depth)
  );

  currentPanel = $derived<EnclosurePanel>(
    this.panels.find(p => p.side === this.params.editPanel) ?? this.panels[0]
  );

  private _history: EnclosureParams[] = [snapParams({ ...DEFAULT_ENCLOSURE_PARAMS, cutouts: DEFAULT_ENCLOSURE_PARAMS.cutouts.map(c => ({ ...c })) })];
  private _cursor = 0;

  private _push(): void {
    this._history = this._history.slice(0, this._cursor + 1);
    this._history.push(snapParams(this.params));
    if (this._history.length > HISTORY_LIMIT) this._history.shift();
    else this._cursor++;
  }

  update(partial: Partial<EnclosureParams>): void {
    // When dimensions change (but not when cutouts themselves are replaced),
    // recompute anchored cutout positions against the new panel sizes.
    const dimChange =
      ('width' in partial || 'height' in partial || 'depth' in partial || 'thickness' in partial)
      && !('cutouts' in partial);

    if (dimChange) {
      const prevPanels = getEnclosurePanels(this.params);
      Object.assign(this.params, partial);
      const newPanels = getEnclosurePanels(this.params);
      this.params.cutouts = this.params.cutouts.map(c => {
        if (!c.anchor) return c;
        const prev = prevPanels.find(pl => pl.side === (c.panel ?? 'front'));
        const next = newPanels.find(pl => pl.side === (c.panel ?? 'front'));
        if (!prev || !next || (prev.w === next.w && prev.h === next.h)) return c;
        return { ...c, ...resolveAnchor(c.anchor, next.w, next.h) };
      });
    } else {
      Object.assign(this.params, partial);
    }
    this._push();
  }

  addCutout(type: CutoutType): void {
    const dims = CUTOUT_DIMS[type];
    const panel = this.params.editPanel;
    const cp = this.panels.find(p => p.side === panel);
    const cx = cp ? cp.w / 2 : 30;
    const cy = cp ? cp.h / 2 : 20;
    const c: Cutout & { panel: PanelSide } = { id: uid(), type, x: cx, y: cy, label: type.toUpperCase(), panel };
    this.params.cutouts = [...this.params.cutouts, c as Cutout];
    this._push();
  }

  addCutouts(items: Array<Omit<Cutout, 'id'>>): void {
    const newCutouts = items.map(item => ({ id: uid(), ...item } as Cutout));
    this.params.cutouts = [...this.params.cutouts, ...newCutouts];
    this._push();
  }

  updateCutout(id: string, partial: Partial<Cutout>): void {
    this.params.cutouts = this.params.cutouts.map(c => {
      if (c.id !== id) return c;
      const updated = { ...c, ...partial };
      // Auto-sync anchor offsets when position changes and no explicit anchor provided.
      // This keeps the anchor semantically correct after manual drag/input.
      if (('x' in partial || 'y' in partial) && !('anchor' in partial) && updated.anchor) {
        const panel = this.panels.find(pl => pl.side === (updated.panel ?? 'front'));
        if (panel) {
          const { w, h } = panel;
          const a = updated.anchor;
          updated.anchor = {
            ...a,
            dx: a.refX === 'left' ? updated.x : a.refX === 'right' ? w - updated.x : updated.x - w / 2,
            dy: a.refY === 'top'  ? updated.y : a.refY === 'bottom' ? h - updated.y : updated.y - h / 2,
          };
        }
      }
      return updated;
    });
    this._push();
  }

  removeCutout(id: string): void {
    this.params.cutouts = this.params.cutouts.filter(c => c.id !== id);
    this._push();
  }

  undo(): void {
    if (this._cursor > 0) {
      this._cursor--;
      const snap = this._history[this._cursor];
      Object.assign(this.params, snapParams(snap));
    }
  }

  redo(): void {
    if (this._cursor < this._history.length - 1) {
      this._cursor++;
      const snap = this._history[this._cursor];
      Object.assign(this.params, snapParams(snap));
    }
  }

  reset(): void {
    Object.assign(this.params, DEFAULT_ENCLOSURE_PARAMS);
    this.params.cutouts = DEFAULT_ENCLOSURE_PARAMS.cutouts.map(c => ({ ...c }));
    this._history = [snapParams(this.params)];
    this._cursor = 0;
  }

  restore(saved: Partial<EnclosureParams>): void {
    const restored = saved.cutouts
      ? { ...saved, cutouts: (saved.cutouts as Cutout[]).map(c => ({ ...c })) }
      : { ...saved };
    Object.assign(this.params, restored);
    this._history = [snapParams(this.params)];
    this._cursor = 0;
  }
}

export const encFab = new EnclosureStore();
