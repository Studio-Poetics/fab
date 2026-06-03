export type HingePattern = 'kerf' | 'wave' | 'cross';

export interface HingeParams {
  pattern:    HingePattern;
  width:      number;  // mm — flex zone width (horizontal)
  height:     number;  // mm — flex zone height (length of hinge)
  thickness:  number;  // mm — material thickness
  rowSpacing: number;  // mm — distance between cut rows
  bridge:     number;  // mm — uncut bridge at each row end
  amplitude:  number;  // mm — wave amplitude (wave pattern only)
  cutLength:  number;  // mm — individual cut length (cross pattern)
  cutGap:     number;  // mm — gap between cuts in a row (cross pattern)
}

export const DEFAULT_HINGE_PARAMS: HingeParams = {
  pattern:    'kerf',
  width:      60,
  height:     40,
  thickness:  3,
  rowSpacing: 3,
  bridge:     4,
  amplitude:  1.5,
  cutLength:  20,
  cutGap:     4,
};

export const PATTERN_LABELS: Record<HingePattern, string> = {
  kerf:  'KERF',
  wave:  'WAVE',
  cross: 'CROSS',
};
