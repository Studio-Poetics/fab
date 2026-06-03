export type Vec2 = [number, number];

export type EdgeType = 'f' | 'p' | 'g';

export interface EdgeSpec {
  T: EdgeType;
  B: EdgeType;
  L: EdgeType;
  R: EdgeType;
}

export interface HingeSpecial {
  type: 'hinge';
  y: number;
  hingeH: number;
  lidY: number;
  lidH: number;
}

export interface GrooveSpecial {
  type: 'groove';
  side: string;
  grooveY: number;
  grooveH: number;
  grooveDepth: number;
}

export interface SliderLidSpecial {
  type: 'sliderLid';
}

export interface DividerSlot {
  pos: number;
  w: number;
  d: number;
  from: 'top' | 'bottom';
}

export interface DividerSpecial {
  type: 'divider';
  axis: 'x' | 'y';
  slots: DividerSlot[];
}

export type PanelSpecial = HingeSpecial | GrooveSpecial | SliderLidSpecial | DividerSpecial;

export interface Panel {
  id: string;
  label: string;
  width: number;
  height: number;
  col: number;
  tint: number;
  edges: EdgeSpec;
  special?: PanelSpecial;
}

export interface PanelPlacement {
  panel: Panel;
  x: number;
  y: number;
}

export interface LayoutResult {
  placements: PanelPlacement[];
  totalW: number;
  totalH: number;
}

export interface Warning {
  level: 'warning' | 'error';
  message: string;
}
