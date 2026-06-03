import * as THREE from 'three';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';
import { OBJExporter } from 'three/examples/jsm/exporters/OBJExporter.js';
import type { Gear } from '@dromney/gear-gen';

export function buildGearGeometry(
  gear: Gear,
  faceWidth: number,
  helixAngleDeg: number,
  holeD: number,
  shaftType: 'round' | 'D' = 'round',
  dFlatDepth: number = 1.5,
): THREE.BufferGeometry {
  const pts = gear.pointsLinear;

  const shape = new THREE.Shape();
  shape.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) {
    shape.lineTo(pts[i].x, pts[i].y);
  }

  const boreR = holeD / 2;
  if (boreR > 0 && boreR < gear.r) {
    const hole = new THREE.Path();
    if (shaftType === 'D' && dFlatDepth > 0 && dFlatDepth < boreR * 2) {
      const flatX      = boreR - dFlatDepth;
      const flatHalfY  = Math.sqrt(Math.max(0, boreR * boreR - flatX * flatX));
      const endAngle   = Math.atan2( flatHalfY, flatX);
      const startAngle = Math.atan2(-flatHalfY, flatX);
      hole.moveTo(flatX, flatHalfY);
      hole.absarc(0, 0, boreR, endAngle, startAngle, false);
      hole.closePath();
    } else {
      hole.absarc(0, 0, boreR, 0, Math.PI * 2, false);
    }
    shape.holes.push(hole);
  }

  // More extrude steps give smoother helix flanks
  const steps = helixAngleDeg !== 0 ? Math.max(12, Math.ceil(faceWidth * 0.8)) : 1;

  const geo = new THREE.ExtrudeGeometry(shape, {
    steps,
    depth: faceWidth,
    bevelEnabled: false,
  });

  // Center geometry on Z so mesh pivot is at gear mid-plane
  geo.translate(0, 0, -faceWidth / 2);

  if (helixAngleDeg !== 0) {
    const pitchR = gear.r;
    const totalTwist = (faceWidth / pitchR) * Math.tan(helixAngleDeg * Math.PI / 180);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i) + faceWidth / 2;
      const twistAngle = (z / faceWidth) * totalTwist;
      const cos = Math.cos(twistAngle);
      const sin = Math.sin(twistAngle);
      pos.setXYZ(i, x * cos - y * sin, x * sin + y * cos, pos.getZ(i));
    }
    pos.needsUpdate = true;
  }

  geo.computeVertexNormals();
  return geo;
}

export function downloadGearSTL(
  gear: Gear,
  faceWidth: number,
  helixAngleDeg: number,
  holeD: number,
  label: string,
  shaftType: 'round' | 'D' = 'round',
  dFlatDepth: number = 1.5,
): void {
  const geo  = buildGearGeometry(gear, faceWidth, helixAngleDeg, holeD, shaftType, dFlatDepth);
  const mesh = new THREE.Mesh(geo);
  const exporter = new STLExporter();
  const result = exporter.parse(mesh, { binary: true }) as DataView;
  const blob = new Blob([result.buffer as ArrayBuffer], { type: 'application/octet-stream' });
  const moduleStr = (gear.D / gear.N).toFixed(1);
  triggerDownload(blob, `gear_${label}_N${gear.N}_m${moduleStr}_fw${faceWidth}.stl`);
  geo.dispose();
}

export function downloadGearOBJ(
  gear: Gear,
  faceWidth: number,
  helixAngleDeg: number,
  holeD: number,
  label: string,
  shaftType: 'round' | 'D' = 'round',
  dFlatDepth: number = 1.5,
): void {
  const geo  = buildGearGeometry(gear, faceWidth, helixAngleDeg, holeD, shaftType, dFlatDepth);
  const mesh = new THREE.Mesh(geo);
  const exporter = new OBJExporter();
  const obj = exporter.parse(mesh);
  const blob = new Blob([obj], { type: 'text/plain' });
  const moduleStr = (gear.D / gear.N).toFixed(1);
  triggerDownload(blob, `gear_${label}_N${gear.N}_m${moduleStr}_fw${faceWidth}.obj`);
  geo.dispose();
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
