import * as THREE from 'three';
import type { LesionSite, LesionVisual } from '../../types';
import { revolve, type ProfilePoint } from './revolve';
import { TOOTH } from './anatomy';

/**
 * Lesion geometry is built in a local frame where the lesion grows along −Y from the
 * tooth surface (y = 0), then placed with a site transform. Shapes follow the classic
 * textbook schematics (fissure lesion: enamel cone with its base towards the DEJ and a
 * dentin lesion spreading along the DEJ) — they are illustrative, not histological.
 */

export interface SiteFrame {
  origin: THREE.Vector3;
  /** Direction of lesion growth (into the tooth). */
  axis: THREE.Vector3;
  enamelThickness: number;
  dentinToPulp: number;
  /** Lateral elongation [along-groove, across] of the lesion footprint. */
  aspect: [number, number];
}

export const SITE_FRAMES: Record<LesionSite, SiteFrame> = {
  occlusal: {
    origin: new THREE.Vector3(0, TOOTH.fossaSurfaceY, 0),
    axis: new THREE.Vector3(0, -1, 0),
    enamelThickness: TOOTH.fossaSurfaceY - TOOTH.dejCenterY,
    dentinToPulp: TOOTH.dejCenterY - TOOTH.pulpRoofY,
    aspect: [1.35, 0.8],
  },
  proximal: {
    // Mesial contact area, just cervical to the marginal ridge.
    origin: new THREE.Vector3(5.2, 3.0, 0),
    axis: new THREE.Vector3(-1, -0.25, 0),
    enamelThickness: 0.75,
    dentinToPulp: 2.4,
    aspect: [1.1, 1.0],
  },
  root: {
    origin: new THREE.Vector3(4.32, -1.0, 0),
    axis: new THREE.Vector3(-1, 0, 0),
    enamelThickness: 0.16,
    dentinToPulp: 1.45,
    aspect: [1.3, 1.0],
  },
};

export function siteMatrix(site: LesionSite): THREE.Matrix4 {
  const f = SITE_FRAMES[site];
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), f.axis.clone().normalize());
  return new THREE.Matrix4().compose(f.origin, q, new THREE.Vector3(1, 1, 1));
}

function lens(profile: ProfilePoint[], aspect: [number, number], site: LesionSite): THREE.BufferGeometry {
  const g = revolve({ profile, segments: 40, aspect, squareness: 2, spacing: 0.08 });
  g.applyMatrix4(siteMatrix(site));
  g.computeBoundingBox();
  g.computeBoundingSphere();
  return g;
}

export interface LesionGeometries {
  enamel: THREE.BufferGeometry | null;
  dentinOuter: THREE.BufferGeometry | null;
  dentinInner: THREE.BufferGeometry | null;
}

/**
 * Enamel lesion: subsurface cone (surface layer kept intact while non-cavitated).
 * Dentin lesion: outer "affected" zone and inner "infected" zone.
 */
export function buildLesionGeometries(lesion: LesionVisual): LesionGeometries {
  const f = SITE_FRAMES[lesion.site];
  const T = f.enamelThickness;
  const D = f.dentinToPulp;
  const surfaceLayer = lesion.cavitation > 0 ? 0.02 : 0.07;

  let enamel: THREE.BufferGeometry | null = null;
  if (lesion.enamelDepth > 0.02 && lesion.site !== 'root') {
    const depth = Math.max(0.12, lesion.enamelDepth * T + (lesion.dentinDepth > 0 ? 0.06 : 0));
    const topR = 0.18 + 0.15 * lesion.enamelDepth;
    const baseR = 0.35 + 1.0 * lesion.enamelDepth + 0.6 * lesion.dentinDepth;
    enamel = lens(
      [
        { r: 0, y: -surfaceLayer },
        { r: topR, y: -surfaceLayer, sharp: true },
        { r: baseR * 0.85, y: -depth * 0.75 },
        { r: baseR, y: -depth, sharp: true },
        { r: 0, y: -depth },
      ],
      f.aspect,
      lesion.site,
    );
  }

  let dentinOuter: THREE.BufferGeometry | null = null;
  let dentinInner: THREE.BufferGeometry | null = null;
  if (lesion.dentinDepth > 0.02) {
    const top = -T + 0.1;
    const depth = lesion.dentinDepth * D + 0.08;
    const spread = 0.7 + 1.9 * lesion.dentinDepth;
    const profile = (scale: number, depthScale: number): ProfilePoint[] => [
      { r: 0, y: top },
      { r: spread * scale, y: top, sharp: true },
      { r: spread * scale * 0.92, y: top - depth * depthScale * 0.35 },
      { r: spread * scale * 0.55, y: top - depth * depthScale * 0.8 },
      { r: 0, y: top - depth * depthScale },
    ];
    dentinOuter = lens(profile(1, 1), f.aspect, lesion.site);
    if (lesion.dentinDepth > 0.15) dentinInner = lens(profile(0.68, 0.72), f.aspect, lesion.site);
  }

  return { enamel, dentinOuter, dentinInner };
}

/** Irregular cavitation volume used as a CSG cutter. */
export function buildCavitationBrush(lesion: LesionVisual): THREE.BufferGeometry | null {
  if (lesion.cavitation <= 0.02) return null;
  const f = SITE_FRAMES[lesion.site];
  const c = lesion.cavitation;
  const geom = new THREE.IcosahedronGeometry(1, 4);
  const pos = geom.getAttribute('position');
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    // Deterministic pseudo-noise so the same stage always cuts the same shape.
    const n = 1 + 0.12 * Math.sin(v.x * 7.1 + v.z * 3.3) * Math.cos(v.y * 5.7 + v.x * 2.1);
    v.multiplyScalar(n);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  const depthIntoTooth = (f.enamelThickness + f.dentinToPulp * 0.55) * c;
  const radius = 0.35 + 1.5 * c;
  geom.scale(radius * f.aspect[0], Math.max(0.3, depthIntoTooth) + 0.6, radius * f.aspect[1]);
  geom.translate(0, 0.5, 0);
  geom.applyMatrix4(siteMatrix(lesion.site));
  geom.deleteAttribute('uv');
  // Normals are recomputed after vertices are welded (see getCutter) for smooth cut walls.
  geom.deleteAttribute('normal');
  return geom;
}
