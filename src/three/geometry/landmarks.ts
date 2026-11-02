import type { LesionSite } from '../../types';

/**
 * Landmarks of the procedural tooth, kept free of three.js so that UI code (e.g. the
 * pulp-proximity gauge) can use them without loading the 3D engine.
 */

export const TOOTH = {
  aspect: [1.06, 0.94] as [number, number],
  squareness: 2.6,
  segments: 72,
  /** Approximate landmark heights at the central fossa, used to place lesions/cavities. */
  fossaSurfaceY: 5.2,
  dejCenterY: 4.06,
  pulpRoofY: 1.3,
  boneCrestY: -2.0,
  mesialRootX: 2.4,
  distalRootX: -2.4,
  rootTilt: 0.08,
} as const;

export interface SiteFrameData {
  origin: [number, number, number];
  /** Direction of lesion growth (into the tooth); not necessarily unit length. */
  axis: [number, number, number];
  enamelThickness: number;
  dentinToPulp: number;
  /** Lateral elongation [along-groove, across] of the lesion footprint. */
  aspect: [number, number];
}

export const SITE_FRAME_DATA: Record<LesionSite, SiteFrameData> = {
  occlusal: {
    origin: [0, TOOTH.fossaSurfaceY, 0],
    axis: [0, -1, 0],
    enamelThickness: TOOTH.fossaSurfaceY - TOOTH.dejCenterY,
    dentinToPulp: TOOTH.dejCenterY - TOOTH.pulpRoofY,
    aspect: [1.35, 0.8],
  },
  proximal: {
    // Mesial contact area, just cervical to the marginal ridge.
    origin: [5.2, 3.0, 0],
    axis: [-1, -0.25, 0],
    enamelThickness: 0.75,
    dentinToPulp: 2.4,
    aspect: [1.1, 1.0],
  },
  root: {
    origin: [4.32, -1.0, 0],
    axis: [-1, 0, 0],
    enamelThickness: 0.16,
    dentinToPulp: 1.45,
    aspect: [1.3, 1.0],
  },
};
