class UnitStore {
  display = $state<'mm' | 'in'>('mm');

  toggle(): void { this.display = this.display === 'mm' ? 'in' : 'mm'; }

  /** Convert mm value to current display unit (rounded to avoid float noise). */
  toDisplay(mm: number): number {
    return this.display === 'in' ? Math.round(mm / 25.4 * 1000) / 1000 : mm;
  }

  /** Convert display-unit value back to mm. */
  fromDisplay(v: number): number {
    return this.display === 'in' ? Math.round(v * 25.4 * 100) / 100 : v;
  }

  /** Step size for main dimension inputs in current unit. */
  dimStep(): number { return this.display === 'in' ? 0.0625 : 1; }

  /** Step size for thickness inputs in current unit. */
  thickStep(): number { return this.display === 'in' ? 0.03125 : 0.5; }

  get label(): string { return this.display; }
}

export const units = new UnitStore();
