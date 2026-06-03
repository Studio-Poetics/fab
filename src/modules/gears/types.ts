export type GearMode       = 'spur' | 'planetary' | 'rack';
export type PlanetaryFixed = 'ring' | 'carrier';
export type ShaftType      = 'round' | 'D';
export type GearSubtype    = 'spur' | 'helical' | 'bevel' | 'cycloid';
export type PositionType   = 'std' | 'backlash';

export interface GearParams {
  // Mode
  gearMode:       GearMode;

  // Spur train
  N1:         number;
  N2:         number;
  N3:         number | null;
  internalG2: boolean;        // g2 is a ring/internal gear

  // Planetary
  Nsun:           number;
  Nplanet:        number;
  Nplanets:       number;     // 2–6 planet gears
  planetaryFixed: PlanetaryFixed;

  // Rack & pinion
  Npinion:   number;          // pinion tooth count
  rackTeeth: number;          // visible rack teeth

  // Tooth form (shared)
  module:     number;
  PADeg:      number;
  holeD:      number;
  thickness:  number;
  faceWidth:  number;
  helixAngle: number;

  // Spur placement
  angle2:     number;
  angle3:     number;

  // Shaft bore
  shaftType:  ShaftType;
  dFlatDepth: number;         // D-shaft: depth of flat from bore edge (mm)

  // Gear subtype
  gearSubtype:    GearSubtype;

  // Profile modifications
  profileShiftX1: number;     // addendum modification coeff for G1/sun/pinion
  profileShiftX2: number;     // addendum modification coeff for G2/planet/ring
  rootFilletFactor: number;   // fillet radius = rootFilletFactor × module (typ. 0.38)

  // Position & alignment
  positionType:   PositionType;
  backlash:       number;     // circumferential backlash (mm)

  // Animation
  inputRPM:   number;         // input shaft RPM (sun for planetary, Z1 for spur, pinion for rack)
}

export const DEFAULT_GEAR_PARAMS: GearParams = {
  gearMode:       'spur',
  N1:         20,
  N2:         12,
  N3:         null,
  internalG2: false,
  Nsun:           16,
  Nplanet:        8,
  Nplanets:       3,
  planetaryFixed: 'ring',
  Npinion:    12,
  rackTeeth:  10,
  module:     3,
  PADeg:      20,
  holeD:      6,
  shaftType:  'round',
  dFlatDepth: 1.5,
  thickness:  3,
  faceWidth:  10,
  helixAngle: 0,
  angle2:     0,
  angle3:     0,
  gearSubtype:      'spur',
  profileShiftX1:   0,
  profileShiftX2:   0,
  rootFilletFactor: 0.38,
  positionType:     'std',
  backlash:         0,
  inputRPM:   10,
};
