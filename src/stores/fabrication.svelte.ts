import type { Panel, Warning, LayoutResult } from '$core/types';
import { DEFAULT_PARAMS, type BoxParams } from '$modules/boxes/types';
import { generate } from '$modules/boxes/generator';
import { validate, isValid } from '$core/fabrication/validation';
import { layoutPanels } from '$core/geometry/layout';

const HISTORY_LIMIT = 50;

class FabStore {
  params   = $state<BoxParams>({ ...DEFAULT_PARAMS });
  panels   = $derived<Panel[]>(generate(this.params));
  layout   = $derived<LayoutResult>(layoutPanels(this.panels, this.params.thickness));
  warnings = $derived<Warning[]>(validate(this.params));
  valid    = $derived<boolean>(isValid(this.warnings));

  private _history: BoxParams[] = [{ ...DEFAULT_PARAMS }];
  private _cursor  = 0;

  update(partial: Partial<BoxParams>): void {
    Object.assign(this.params, partial);
    this._history = this._history.slice(0, this._cursor + 1);
    this._history.push({ ...this.params });
    if (this._history.length > HISTORY_LIMIT) this._history.shift();
    else this._cursor++;
  }

  undo(): void {
    if (this._cursor > 0) {
      this._cursor--;
      Object.assign(this.params, this._history[this._cursor]);
    }
  }

  redo(): void {
    if (this._cursor < this._history.length - 1) {
      this._cursor++;
      Object.assign(this.params, this._history[this._cursor]);
    }
  }

  reset(): void {
    Object.assign(this.params, DEFAULT_PARAMS);
    this._history = [{ ...DEFAULT_PARAMS }];
    this._cursor  = 0;
  }

  restore(saved: Partial<BoxParams>): void {
    Object.assign(this.params, saved);
    this._history = [{ ...this.params }];
    this._cursor  = 0;
  }
}

export const fab = new FabStore();
