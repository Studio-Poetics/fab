import { Gear } from '@dromney/gear-gen';
import { DEFAULT_GEAR_PARAMS, type GearParams } from '$modules/gears/types';

export type UndercutInfo = { N: number; Nmin: number; undercut: boolean };

export type SpurSet = {
  g1: Gear; g2: Gear; g3: Gear | null;
  // Profile-shift derived stats (for G1)
  modOD1: number;       // modified outer diameter G1
  modOD2: number;       // modified outer diameter G2
  modCD:  number;       // modified centre distance
  // Undercut detection
  undercutG1: UndercutInfo;
  undercutG2: UndercutInfo;
  undercutG3: UndercutInfo | null;
};

export type PlanetarySet = {
  gSun:    Gear;
  gPlanet: Gear;
  gRing:   Gear;
  Nr:      number;
  Csp:     number;        // orbit radius (pitch radii sum)
  spacingValid: boolean;
  // angular velocity ratios (1 unit = input shaft)
  omegaCarrier:    number;
  omegaRing:       number;
  omegaPlanetAbs:  number;
  ratio:           number; // output/input (carrier for ring-fixed, ring for carrier-fixed)
};

class GearStore {
  params = $state<GearParams>({ ...DEFAULT_GEAR_PARAMS });

  // scale:1 → all coordinates in mm
  spur = $derived.by<SpurSet>(() => {
    const p  = this.params;
    const D1 = p.N1 * p.module;
    const g1 = new Gear({ N: p.N1, D: D1, PADeg: p.PADeg, scale: 1, jointAngleDeg: 0 });
    const g2 = new Gear({ N: p.N2, parent: g1, jointAngleDeg: p.angle2, internal: p.internalG2 });
    const g3 = p.N3 !== null
      ? new Gear({ N: p.N3, parent: g2, jointAngleDeg: p.angle3 })
      : null;

    // Undercut threshold: Nmin = ceil(2 / sin²(PA))
    const sinPA = Math.sin(p.PADeg * Math.PI / 180);
    const Nmin  = Math.ceil(2 / (sinPA * sinPA));
    const undercutInfo = (N: number): UndercutInfo => ({ N, Nmin, undercut: N < Nmin });

    // Profile-shift modified outer diameters: OD = m*(N + 2 + 2x)
    const modOD1 = p.module * (p.N1 + 2 + 2 * p.profileShiftX1);
    const modOD2 = p.module * (p.N2 + 2 + 2 * p.profileShiftX2);
    // Modified centre distance: CD_std*(1 + (x1+x2)/N_avg * correction) — simplified
    const cdStd  = p.internalG2 ? (p.N2 - p.N1) * p.module / 2 : (p.N1 + p.N2) * p.module / 2;
    const modCD  = cdStd + (p.profileShiftX1 + p.profileShiftX2) * p.module;

    return {
      g1, g2, g3,
      modOD1, modOD2, modCD,
      undercutG1: undercutInfo(p.N1),
      undercutG2: undercutInfo(p.N2),
      undercutG3: p.N3 !== null ? undercutInfo(p.N3) : null,
    };
  });

  planetary = $derived.by<PlanetarySet>(() => {
    const p     = this.params;
    const Ns    = Math.max(6, p.Nsun);
    const Np    = Math.max(4, p.Nplanet);
    const Nr    = Ns + 2 * Np;          // Willis: Nring = Nsun + 2*Nplanet
    const Csp   = (Ns + Np) * p.module / 2;

    const gSun    = new Gear({ N: Ns, D: Ns * p.module, PADeg: p.PADeg, scale: 1 });
    const gPlanet = new Gear({ N: Np, D: Np * p.module, PADeg: p.PADeg, scale: 1 });
    const gRing   = new Gear({ N: Nr, D: Nr * p.module, PADeg: p.PADeg, scale: 1, internal: true });

    const spacingValid = ((Ns + Nr) % p.Nplanets) === 0;

    // Kinematics — input = sun shaft, ratios relative to sun (1 unit)
    let omegaCarrier: number;
    let omegaRing:    number;
    let omegaPlanetAbs: number;
    let ratio: number;

    if (p.planetaryFixed === 'ring') {
      // Ring fixed: ω_carrier = Ns/(Ns+Nr), output is carrier
      // Planet spins CCW relative to carrier: ω_p = ω_c × (1 - Nr/Np)
      omegaCarrier   = Ns / (Ns + Nr);
      omegaRing      = 0;
      omegaPlanetAbs = omegaCarrier * (1 - Nr / Np);   // negative — CCW in global frame
      ratio          = Ns / (Ns + Nr);
    } else {
      // Carrier fixed: ω_ring = -Ns/Nr, output is ring
      // Planet: ω_p = -Ns/Np (CCW, from sun-planet external mesh)
      omegaCarrier   = 0;
      omegaRing      = -(Ns / Nr);
      omegaPlanetAbs = -(Ns / Np);                     // negative — CCW
      ratio          = -(Ns / Nr);
    }

    return { gSun, gPlanet, gRing, Nr, Csp, spacingValid, omegaCarrier, omegaRing, omegaPlanetAbs, ratio };
  });

  // Convenience: unified gears accessor for spur mode (legacy API compat)
  get gears() { return this.spur; }

  private _history: GearParams[] = [{ ...DEFAULT_GEAR_PARAMS }];
  private _cursor  = 0;

  update(partial: Partial<GearParams>): void {
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
    Object.assign(this.params, DEFAULT_GEAR_PARAMS);
    this._history = [{ ...DEFAULT_GEAR_PARAMS }];
    this._cursor  = 0;
  }
}

export const gearFab = new GearStore();
