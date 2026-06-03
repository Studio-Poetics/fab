import { DEFAULT_KINETIC_PARAMS, type KineticParams } from '$modules/kinetic/types';

class KineticStore {
  params = $state<KineticParams>({ ...DEFAULT_KINETIC_PARAMS });

  private _history: KineticParams[] = [{ ...DEFAULT_KINETIC_PARAMS }];
  private _cursor  = 0;

  update(partial: Partial<KineticParams>): void {
    Object.assign(this.params, partial);
    this._history = this._history.slice(0, this._cursor + 1);
    this._history.push({ ...this.params });
    if (this._history.length > 50) this._history.shift();
    else this._cursor++;
  }

  undo(): void {
    if (this._cursor > 0) { this._cursor--; Object.assign(this.params, this._history[this._cursor]); }
  }

  redo(): void {
    if (this._cursor < this._history.length - 1) { this._cursor++; Object.assign(this.params, this._history[this._cursor]); }
  }

  reset(): void {
    Object.assign(this.params, DEFAULT_KINETIC_PARAMS);
    this._history = [{ ...DEFAULT_KINETIC_PARAMS }];
    this._cursor  = 0;
  }
}

export const kineticFab = new KineticStore();
