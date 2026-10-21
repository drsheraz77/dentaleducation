import * as THREE from 'three';
import { useEffect, useMemo } from 'react';
import type { CutSurfaceFinish, LesionVisual, MaterialId } from '../types';
import { SITE_FRAMES, type SiteFrame } from './geometry/lesion';

export const SECTION_PLANE = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0);

export { TISSUE_COLORS } from './colors';
import { TISSUE_COLORS } from './colors';

export const HIGHLIGHT = new THREE.Color('#3b82f6');

/** Uniforms shared by tissue materials to paint surface discolouration around a lesion. */
export interface LesionUniforms {
  uLesionCenter: { value: THREE.Vector3 };
  uLesionRadii: { value: THREE.Vector3 };
  uLesionColor: { value: THREE.Color };
  uLesionIntensity: { value: number };
}

export function createLesionUniforms(): LesionUniforms {
  return {
    uLesionCenter: { value: new THREE.Vector3() },
    uLesionRadii: { value: new THREE.Vector3(1, 1, 1) },
    uLesionColor: { value: new THREE.Color('#ffffff') },
    uLesionIntensity: { value: 0 },
  };
}

/** Target uniform values for a lesion state; the scene eases towards them each frame. */
export function lesionSurfaceTarget(lesion: LesionVisual | null, frame?: SiteFrame) {
  if (!lesion || lesion.surfaceTone === 'none') return { intensity: 0, center: new THREE.Vector3(), radii: new THREE.Vector3(1, 1, 1), color: new THREE.Color('#ffffff') };
  const f = frame ?? SITE_FRAMES[lesion.site];
  const s = 0.55 + 1.3 * Math.max(lesion.enamelDepth * 0.7, lesion.dentinDepth);
  const radii =
    lesion.site === 'occlusal'
      ? new THREE.Vector3(s * f.aspect[0] * 1.4, 0.9, s * f.aspect[1] * 1.1)
      : new THREE.Vector3(0.8 + s * 0.5, s * 0.9, s * 1.1);
  const color = new THREE.Color(lesion.surfaceTone === 'white' ? TISSUE_COLORS.lesionEnamelWhite : TISSUE_COLORS.lesionEnamelBrown);
  if (lesion.inactive) color.multiplyScalar(0.7);
  return { intensity: lesion.surfaceIntensity, center: f.origin.clone(), radii, color };
}

/**
 * MeshPhysicalMaterial with an injected lesion-discolouration term.
 * The colour shift is computed in world space so it works on CSG-cut geometry too.
 */
export function makeTissueMaterial(
  params: THREE.MeshPhysicalMaterialParameters,
  uniforms: LesionUniforms | null,
  /** Pushes the surface back in depth only (mm), so a coincident surface drawn over it wins. */
  depthBias = 0,
) {
  const mat = new THREE.MeshPhysicalMaterial(params);
  if (uniforms) {
    mat.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vDvWorldPos;')
        .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvDvWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      if (depthBias > 0) {
        // Depth from a point further along the view ray; x/y (and so the silhouette) are unchanged.
        shader.vertexShader = shader.vertexShader.replace(
          '#include <project_vertex>',
          `#include <project_vertex>
{
  vec4 dvBiased = projectionMatrix * vec4(mvPosition.xyz + normalize(mvPosition.xyz) * ${depthBias.toFixed(3)}, 1.0);
  gl_Position.z = dvBiased.z / dvBiased.w * gl_Position.w;
}`,
        );
      }
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
varying vec3 vDvWorldPos;
uniform vec3 uLesionCenter;
uniform vec3 uLesionRadii;
uniform vec3 uLesionColor;
uniform float uLesionIntensity;`,
        )
        .replace(
          '#include <color_fragment>',
          `#include <color_fragment>
{
  vec3 d = (vDvWorldPos - uLesionCenter) / uLesionRadii;
  float r = length(d);
  float spot = uLesionIntensity * (1.0 - smoothstep(0.45, 1.0, r));
  // mottled edge so the lesion does not look like a perfect disc
  spot *= 0.8 + 0.2 * sin(vDvWorldPos.x * 9.0) * cos(vDvWorldPos.z * 7.0);
  diffuseColor.rgb = mix(diffuseColor.rgb, uLesionColor, clamp(spot, 0.0, 1.0));
}`,
        );
    };
    mat.customProgramCacheKey = () => `dv-lesion-tissue:${depthBias}`;
  }
  return mat;
}

/** Appearance of a freshly cut surface after each clinical treatment step. */
export function cutSurfaceParams(tissue: 'enamel' | 'dentin', finish: CutSurfaceFinish): THREE.MeshPhysicalMaterialParameters {
  const base = tissue === 'enamel' ? '#d3d8de' : '#e0c082';
  switch (finish) {
    case 'etched':
      return tissue === 'enamel'
        ? { color: '#ffffff', roughness: 1, clearcoat: 0, sheen: 1, sheenColor: new THREE.Color('#ffffff') }
        : { color: '#e8cf9a', roughness: 0.55, clearcoat: 0.2 };
    case 'selectiveEtched':
      return tissue === 'enamel' ? { color: '#ffffff', roughness: 1, sheen: 1, sheenColor: new THREE.Color('#ffffff') } : { color: base, roughness: 0.7 };
    case 'conditioned':
      return { color: tissue === 'enamel' ? '#f0f2f3' : '#ead19c', roughness: 0.5, clearcoat: 0.3 };
    case 'primed':
      return { color: tissue === 'enamel' ? '#f1efe6' : '#e9cf98', roughness: 0.1, clearcoat: 1, clearcoatRoughness: 0.05 };
    case 'bonded':
      return { color: tissue === 'enamel' ? '#f3ead2' : '#e8c98c', roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.02 };
    default:
      return { color: base, roughness: 0.75 };
  }
}

export interface RestorationLook {
  color: string;
  roughness: number;
  metalness: number;
  clearcoat: number;
  opacity: number;
  emissive: string;
}

/** Material-specific look for a restoration given its setting progress. */
export function restorationLook(material: MaterialId, set: number, finished: boolean, coated: boolean, incrementIndex: number): RestorationLook {
  switch (material) {
    case 'composite': {
      const shade = incrementIndex % 2 === 0 ? '#efe4c8' : '#e9dcbc';
      const cured = set >= 1;
      return {
        color: shade,
        roughness: finished ? 0.12 : cured ? 0.45 : 0.2,
        metalness: 0,
        clearcoat: finished ? 0.9 : cured ? 0 : 0.6,
        opacity: cured ? 1 : 0.86,
        emissive: '#000000',
      };
    }
    case 'gic':
      return {
        color: '#e6dfcc',
        roughness: coated ? 0.18 : THREE.MathUtils.lerp(0.12, 0.85, set),
        metalness: 0,
        clearcoat: coated ? 0.8 : THREE.MathUtils.lerp(0.7, 0, set),
        opacity: 1,
        emissive: '#000000',
      };
    case 'rmgic':
      return {
        color: '#ece2c8',
        roughness: finished ? 0.35 : THREE.MathUtils.lerp(0.15, 0.6, set),
        metalness: 0,
        clearcoat: THREE.MathUtils.lerp(0.6, 0.1, set),
        opacity: 1,
        emissive: '#000000',
      };
    case 'amalgam':
      return {
        color: set < 0.3 ? '#d3d8de' : '#b4bac2',
        roughness: finished ? 0.22 : set < 0.3 ? 0.3 : 0.55,
        metalness: 0.95,
        clearcoat: 0,
        opacity: 1,
        emissive: '#000000',
      };
    case 'calciumSilicate':
      return {
        color: set < 1 ? '#dfe3e6' : '#fbfcfd',
        roughness: set < 1 ? 0.25 : 0.9,
        metalness: 0,
        clearcoat: set < 1 ? 0.6 : 0,
        opacity: 1,
        emissive: '#000000',
      };
  }
}

/** Create a material once and dispose it on unmount. */
export function useDisposable<T extends { dispose: () => void }>(factory: () => T, deps: unknown[]): T {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const value = useMemo(factory, deps);
  useEffect(() => () => value.dispose(), [value]);
  return value;
}
