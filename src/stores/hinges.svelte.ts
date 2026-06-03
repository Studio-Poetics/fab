import { DEFAULT_HINGE_PARAMS, type HingeParams } from '$modules/hinges/types';
import { generateHingePaths, type HingePaths } from '$modules/hinges/patterns';

const HISTORY_LIMIT = 50;

class HingeStore {
  params = $state<HingeParams>({ ...DEFAULT_HINGE_PARAMS });
  paths  = $derived<HingePaths>(generateHingePaths(this.params));

  private _history: HingeParams[] = [{ ...DEFAULT_HINGE_PARAMS }];
  private _cursor = 0;

  private _push(): void {
    this._history = this._history.slice(0, this._cursor + 1);
    this._history.push({ ...this.params });
    if (this._history.length > HISTORY_LIMIT) this._history.shift();
    else this._cursor++;
  }

  update(partial: Partial<HingeParams>): void {
    Object.assign(this.params, partial);
    this._push();
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
    Object.assign(this.params, DEFAULT_HINGE_PARAMS);
    this._history = [{ ...DEFAULT_HINGE_PARAMS }];
    this._cursor = 0;
  }
}

export const hingeFab = new HingeStore();
