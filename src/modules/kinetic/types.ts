export type MechanismType = 'crank-slider' | 'scotch-yoke' | 'four-bar';

export interface KineticParams {
  mechanism:  MechanismType;
  crankR:     number;  // mm — crank throw (radius)
  rodLength:  number;  // mm — connecting rod length (crank-slider only)
  crankHoleD: number;  // mm — centre bearing bore
  pinHoleD:   number;  // mm — crank pin bore
  thickness:  number;  // mm — material thickness
  animSpeed:  number;  // deg/frame

  // Four-bar linkage link lengths (mm)
  fb_crank:    number; // link AB (driving crank, rotates)
  fb_coupler:  number; // link BC
  fb_follower: number; // link CD (output crank)
  fb_ground:   number; // link AD (fixed frame)

  // Four-bar branch and coupler point
  fb_branch:     'open' | 'crossed'; // assembly branch
  fb_coupler_p:  number;             // mm along coupler from B
  fb_coupler_q:  number;             // mm perpendicular offset
}

export const DEFAULT_KINETIC_PARAMS: KineticParams = {
  mechanism:  'crank-slider',
  crankR:     25,
  rodLength:  80,
  crankHoleD: 8,
  pinHoleD:   5,
  thickness:  3,
  animSpeed:  0.5,
  fb_crank:    30,
  fb_coupler:  80,
  fb_follower: 60,
  fb_ground:   90,
  fb_branch:     'open',
  fb_coupler_p:  40,
  fb_coupler_q:  0,
};

export const MECHANISM_LABELS: Record<MechanismType, string> = {
  'crank-slider': 'CRANK SLIDER',
  'scotch-yoke':  'SCOTCH YOKE',
  'four-bar':     'FOUR-BAR',
};
