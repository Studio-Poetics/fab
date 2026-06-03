export type BoxType = 'open' | 'closed' | 'hinged' | 'slider' | 'liftoff' | 'multi';

export interface BoxParams {
  boxType:      BoxType;
  width:        number;
  height:       number;
  depth:        number;
  thickness:    number;
  kerf:         number;
  fingerCount:  number;
  joint:        'finger' | 'plain';
  material:     string;
  hingeH:       number;
  sectionsX:    number;
  sectionsY:    number;
  unit:         'mm';
}

export const DEFAULT_PARAMS: BoxParams = {
  boxType:      'closed',
  width:        200,
  height:       150,
  depth:        100,
  thickness:    3,
  kerf:         0.1,
  fingerCount:  5,
  joint:        'finger',
  material:     'plywood',
  hingeH:       20,
  sectionsX:    2,
  sectionsY:    2,
  unit:         'mm',
};

export interface BoxTypeDef {
  id: BoxType;
  label: string;
  description: string;
}

export const BOX_TYPE_DEFS: BoxTypeDef[] = [
  { id: 'open',    label: 'OPEN TRAY',     description: 'Open top, 5 panels' },
  { id: 'closed',  label: 'CLOSED BOX',    description: 'Fully enclosed, 6 panels' },
  { id: 'hinged',  label: 'HINGED LID',    description: 'Living hinge back panel' },
  { id: 'slider',  label: 'SLIDER LID',    description: 'Groove-guided sliding lid' },
  { id: 'liftoff', label: 'LIFT-OFF LID',  description: 'Separate lid tray, 10 panels' },
  { id: 'multi',   label: 'MULTI-SECTION', description: 'Internal grid dividers' },
];
