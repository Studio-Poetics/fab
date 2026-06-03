import type { BoxParams } from '$modules/boxes/types';
import type { GearParams } from '$modules/gears/types';
import type { KineticParams } from '$modules/kinetic/types';
import type { EnclosureParams } from '$modules/enclosures/types';
import type { HingeParams } from '$modules/hinges/types';

interface AppState {
  module:      string;
  view?:       string;
  box:         BoxParams;
  gears:       GearParams;
  kinetic:     KineticParams;
  enclosures?: EnclosureParams;
  hinges?:     HingeParams;
}

const VERSION = 'v1';

export function encodeState(state: AppState): string {
  try {
    return '#' + VERSION + '/' + btoa(JSON.stringify(state));
  } catch {
    return '';
  }
}

export function decodeState(hash: string): AppState | null {
  try {
    const body = hash.startsWith('#' + VERSION + '/') ? hash.slice(VERSION.length + 2) : null;
    if (!body) return null;
    return JSON.parse(atob(body)) as AppState;
  } catch {
    return null;
  }
}
