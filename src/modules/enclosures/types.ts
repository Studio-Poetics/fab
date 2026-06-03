export type CutoutType =
  | 'circle' | 'rect'
  | 'usbc' | 'hdmi_a' | 'hdmi_mini' | 'hdmi_micro'
  | 'dsub9' | 'dsub15' | 'dsub25'
  | 'xlr' | 'jack635' | 'pot6' | 'switch12'
  | 'm2' | 'm2_5' | 'm3' | 'm4' | 'm5';

export type AnchorRef  = 'left' | 'center' | 'right';
export type AnchorRefY = 'top'  | 'center' | 'bottom';

export interface CutoutAnchor {
  refX: AnchorRef;   // horizontal reference edge
  refY: AnchorRefY;  // vertical reference edge
  dx:   number;      // mm offset from refX (positive = toward panel interior)
  dy:   number;      // mm offset from refY (positive = toward panel interior)
}

export interface Cutout {
  id:        string;
  type:      CutoutType;
  x:         number;         // mm from left edge of panel
  y:         number;         // mm from top edge of panel
  w?:        number;         // override width (rect only)
  h?:        number;         // override height (rect only)
  d?:        number;         // override diameter (circle only)
  rotation?: number;         // degrees clockwise, default 0
  label:     string;
  panel?:    PanelSide;      // which face this belongs to; undefined = front
  anchor?:   CutoutAnchor;   // when set, x/y are recomputed from anchor on panel resize
}

// Discriminated union for exact geometric shape of each cutout type
export type CutoutDim =
  | { shape: 'circle';         w: number; h: number }
  | { shape: 'rect';           w: number; h: number }
  | { shape: 'rounded_rect';   w: number; h: number; r: number }
  | { shape: 'trapezoid';      w: number; h: number; bottomW: number }
  | { shape: 'chamfered_rect'; w: number; h: number; chamfer: number };

// Standard panel-cutout dimensions (mm) — cut dimensions with ≈0.3 mm assembly tolerance.
// Shapes match actual connector profiles: USB-C is rounded_rect, HDMI is trapezoid, D-sub
// has chamfered top corners, audio/controls are circles.
export const CUTOUT_DIMS: Record<CutoutType, CutoutDim> = {
  circle:     { shape: 'circle',         w: 10,    h: 10    },
  rect:       { shape: 'rect',           w: 20,    h: 10    },
  // USB-C: IEC 62680-1-3 — 8.34×2.56 mm opening, rounded rectangle, r≈1.5 mm
  usbc:       { shape: 'rounded_rect',   w: 9.0,   h: 3.2,  r: 1.5  },
  // HDMI — trapezoidal (wider top/latch side, chamfered bottom corners)
  // Type A: 13.9×4.45 mm plug face + tol; bottomW ≈ top – 2×1.1 mm chamfer
  hdmi_a:     { shape: 'trapezoid',      w: 15.0,  h: 5.5,  bottomW: 12.8 },
  // Type C (Mini): 10.42×2.42 mm + tol
  hdmi_mini:  { shape: 'trapezoid',      w: 11.5,  h: 3.5,  bottomW:  9.8 },
  // Type D (Micro): 5.83×2.20 mm + tol
  hdmi_micro: { shape: 'trapezoid',      w: 7.5,   h: 3.0,  bottomW:  6.2 },
  // D-sub: rectangle with chamfered top corners (the characteristic "D" profile)
  // Dimensions per MIL-DTL-24308 / DIN 41652 face opening
  dsub9:      { shape: 'chamfered_rect', w: 24.99, h: 9.3,  chamfer: 2.5  },
  dsub15:     { shape: 'chamfered_rect', w: 33.34, h: 9.3,  chamfer: 2.5  },
  dsub25:     { shape: 'chamfered_rect', w: 47.04, h: 9.3,  chamfer: 2.5  },
  // Audio / controls — all circular
  xlr:        { shape: 'circle',         w: 24,    h: 24    }, // Neutrik D-series: Ø24 mm
  jack635:    { shape: 'circle',         w: 6.35,  h: 6.35  },
  pot6:       { shape: 'circle',         w: 7,     h: 7     },
  switch12:   { shape: 'circle',         w: 12,    h: 12    },
  // ISO clearance holes (medium fit, ISO 286) — actual cut diameter includes +0.1 tolerance
  m2:         { shape: 'circle',         w: 2.4,   h: 2.4   },
  m2_5:       { shape: 'circle',         w: 2.9,   h: 2.9   },
  m3:         { shape: 'circle',         w: 3.4,   h: 3.4   },
  m4:         { shape: 'circle',         w: 4.5,   h: 4.5   },
  m5:         { shape: 'circle',         w: 5.5,   h: 5.5   },
};

export const CUTOUT_LABELS: Record<CutoutType, string> = {
  circle:     'CIRCLE',
  rect:       'RECTANGLE',
  usbc:       'USB-C',
  hdmi_a:     'HDMI (TYPE A)',
  hdmi_mini:  'HDMI MINI',
  hdmi_micro: 'HDMI MICRO',
  dsub9:      'DB-9',
  dsub15:     'DB-15',
  dsub25:     'DB-25',
  xlr:        'XLR',
  jack635:    '6.35mm JACK',
  pot6:       '6mm POT',
  switch12:   '12mm SWITCH',
  m2:         'M2',
  m2_5:       'M2.5',
  m3:         'M3',
  m4:         'M4',
  m5:         'M5',
};

export type PanelSide = 'front' | 'back' | 'top' | 'bottom' | 'left' | 'right';

export interface EnclosureParams {
  width:        number;   // mm — internal width
  height:       number;   // mm — internal height
  depth:        number;   // mm — internal depth
  thickness:    number;   // mm — material thickness
  kerf:         number;   // mm — laser kerf (half removed from each cutout edge)
  fingerJoints: boolean;  // enable finger joints on all panel edges
  fingerCount:  number;   // finger count (same for all panels)
  cutouts:      Cutout[];
  editPanel:    PanelSide;
  unit:         'mm';
}

export const DEFAULT_ENCLOSURE_PARAMS: EnclosureParams = {
  width:        120,
  height:        40,
  depth:         80,
  thickness:      3,
  kerf:         0.1,
  fingerJoints: false,
  fingerCount:    5,
  cutouts: [
    { id: 'c1', type: 'jack635', x: 20, y: 20, label: 'INPUT',  panel: 'front' },
    { id: 'c2', type: 'jack635', x: 40, y: 20, label: 'OUTPUT', panel: 'front' },
    { id: 'c3', type: 'pot6',    x: 70, y: 20, label: 'LEVEL',  panel: 'front' },
    { id: 'c4', type: 'switch12',x: 95, y: 20, label: 'PWR',    panel: 'front' },
  ],
  editPanel: 'front',
  unit: 'mm',
};
