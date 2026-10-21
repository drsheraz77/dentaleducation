import type { StructureId, VerificationStatus } from '../../types';

/**
 * Registry of downloadable 3D dental assets used by the Caries Learning Studio.
 * Provenance, licence and per-layer evidence tier are data, so the UI can show them
 * next to the structure a student selects. See public/models/dental/ASSET_CATALOG.md.
 */

export type LayerId = 'enamel' | 'tooth' | 'pulp' | 'pdl' | 'lamina';
/** How a layer's geometry was obtained (terminology from the 3Dentes source). */
export type EvidenceTier = 'measured' | 'derived' | 'schematic';

export interface AssetLayer {
  id: LayerId;
  /** glTF node name. */
  node: string;
  label: string;
  structureId: StructureId;
  tier: EvidenceTier;
  tierNote: string;
  color: string;
  capColor: string;
  defaultVisible: boolean;
}

export interface DentalAsset {
  id: string;
  /** Path under the site's base URL. */
  path: string;
  bytes: number;
  title: string;
  tooth: string;
  source: {
    project: string;
    url: string;
    author: string;
    licence: string;
    licenceUrl: string;
    attribution: string;
    accessed: string;
    commercialUse: false | true;
  };
  modifications: string[];
  layers: AssetLayer[];
  verification: VerificationStatus;
}

export const LOWER_MOLAR_47: DentalAsset = {
  id: 'lower-molar-47',
  path: 'models/dental/lower-molar-47.glb',
  bytes: 142180,
  title: 'Mandibular right second molar (CBCT-derived)',
  tooth: 'Universal #31 · FDI 47',
  source: {
    project: '3Dentes',
    url: 'https://github.com/NateSaindon/3Dentes',
    author: 'Nate Saindon',
    licence: 'CC BY-NC 4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by-nc/4.0/',
    attribution: 'Anatomy from 3Dentes by Nate Saindon, CC BY-NC 4.0.',
    accessed: '2026-10-21',
    commercialUse: false,
  },
  modifications: [
    'Selected one tooth (FMA55706) and its enamel, pulp, PDL and lamina dura meshes from assets/cbct/stl.',
    'Welded duplicate vertices and computed smooth normals (STL stores flat facet normals).',
    'One rigid transform into the app frame (no scaling, no reshaping).',
    'Quantised and meshopt-compressed GLB (tools/assets/build-dental-assets.mjs).',
  ],
  layers: [
    {
      id: 'enamel',
      node: 'enamel',
      label: 'Enamel',
      structureId: 'enamel',
      tier: 'derived',
      tierNote: 'Extent measured from the CBCT; thickness from the literature (3Dentes: "depth-limited shell").',
      color: '#eef1f4',
      capColor: '#dfe5ec',
      defaultVisible: true,
    },
    {
      id: 'tooth',
      node: 'tooth',
      label: 'Dentin and root',
      structureId: 'dentin',
      tier: 'measured',
      tierNote: 'Outer tooth surface segmented from a 0.16 mm CBCT. Dentin is the tooth volume outside the pulp and under the enamel; cementum is too thin to segment and is not shown separately.',
      color: '#e8cf98',
      capColor: '#f6c9a0',
      defaultVisible: true,
    },
    {
      id: 'pulp',
      node: 'pulp',
      label: 'Pulp and root canals',
      structureId: 'pulp',
      tier: 'measured',
      tierNote: 'Traced by hand on the CBCT slices (3Dentes); canals narrower than ~0.5 mm are below the scan resolution.',
      color: '#e79a9a',
      capColor: '#f0a487',
      defaultVisible: true,
    },
    {
      id: 'pdl',
      node: 'pdl',
      label: 'Periodontal ligament',
      structureId: 'pdl',
      tier: 'derived',
      tierNote: 'Measured in position but drawn thicker than reality (the ligament is about one voxel wide).',
      color: '#c9707a',
      capColor: '#f3aeb4',
      defaultVisible: false,
    },
    {
      id: 'lamina',
      node: 'lamina',
      label: 'Lamina dura',
      structureId: 'lamina',
      tier: 'derived',
      tierNote: 'Measured in position, drawn thicker than reality and continuous around the socket.',
      color: '#d8c6a8',
      capColor: '#e9d3b0',
      defaultVisible: false,
    },
  ],
  verification: 'draft_pending_review',
};

export const STUDIO_ASSETS: DentalAsset[] = [LOWER_MOLAR_47];
