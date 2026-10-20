import * as THREE from 'three';
import { useEffect } from 'react';
import type { CutSurfaceFinish, StructureId } from '../types';
import type { ToothGeometries } from './geometry/anatomy';
import type { CutResult } from './geometry/cavity';
import { SectionMesh } from './CrossSectionView';
import { TISSUE_COLORS, cutSurfaceParams, makeTissueMaterial, useDisposable, type LesionUniforms } from './materials';

export interface AnatomyLayerProps {
  geoms: ToothGeometries;
  enamel: CutResult;
  dentin: CutResult;
  cementumTrunk: CutResult;
  section: boolean;
  showSupport: boolean;
  recession: boolean;
  cutFinish: CutSurfaceFinish;
  pulpInflammation: number;
  highlightOf: (id: StructureId) => number;
  uniforms: LesionUniforms;
}

/** Normal tissues of the tooth and periodontium. */
export function AnatomyLayer(p: AnatomyLayerProps) {
  const { geoms, section, highlightOf, uniforms } = p;

  const enamelMat = useDisposable(
    () => makeTissueMaterial({ color: TISSUE_COLORS.enamel, roughness: 0.32, clearcoat: 0.45, clearcoatRoughness: 0.3, sheen: 0.2 }, uniforms),
    [uniforms],
  );
  const dentinMat = useDisposable(() => makeTissueMaterial({ color: TISSUE_COLORS.dentin, roughness: 0.65 }, uniforms), [uniforms]);
  const cementumMat = useDisposable(() => makeTissueMaterial({ color: TISSUE_COLORS.cementum, roughness: 0.8 }, uniforms), [uniforms]);
  const enamelCut = useDisposable(() => new THREE.MeshPhysicalMaterial(), []);
  const dentinCut = useDisposable(() => new THREE.MeshPhysicalMaterial(), []);
  const pulpMat = useDisposable(() => new THREE.MeshStandardMaterial({ color: TISSUE_COLORS.pulp, roughness: 0.6 }), []);
  const canalMat = useDisposable(() => new THREE.MeshStandardMaterial({ color: TISSUE_COLORS.rootCanal, roughness: 0.6 }), []);
  const rootMat = useDisposable(() => new THREE.MeshStandardMaterial({ color: TISSUE_COLORS.root, roughness: 0.7 }), []);
  const rootCementumMat = useDisposable(() => new THREE.MeshStandardMaterial({ color: TISSUE_COLORS.cementum, roughness: 0.85 }), []);
  const pdlMat = useDisposable(() => new THREE.MeshStandardMaterial({ color: TISSUE_COLORS.pdl, roughness: 0.8 }), []);
  const boneMat = useDisposable(() => new THREE.MeshStandardMaterial({ color: TISSUE_COLORS.bone, roughness: 0.95 }), []);
  const gingivaMat = useDisposable(
    () => new THREE.MeshPhysicalMaterial({ color: TISSUE_COLORS.gingiva, roughness: 0.45, sheen: 0.5, sheenColor: new THREE.Color('#ffd0d6') }),
    [],
  );

  useEffect(() => {
    enamelCut.setValues({ clearcoat: 0, clearcoatRoughness: 0.1, sheen: 0, ...cutSurfaceParams('enamel', p.cutFinish) });
    dentinCut.setValues({ clearcoat: 0, clearcoatRoughness: 0.1, sheen: 0, ...cutSurfaceParams('dentin', p.cutFinish) });
  }, [p.cutFinish, enamelCut, dentinCut]);

  const pulpColor = new THREE.Color(TISSUE_COLORS.pulp).lerp(new THREE.Color(TISSUE_COLORS.pulpInflamed), p.pulpInflammation);
  useEffect(() => {
    pulpMat.color.copy(pulpColor);
  });

  const enamelMaterial = p.enamel.cut ? [enamelMat, enamelCut] : enamelMat;
  const dentinMaterial = p.dentin.cut ? [dentinMat, dentinCut] : dentinMat;
  const cementumMaterial = p.cementumTrunk.cut ? [cementumMat, dentinCut] : cementumMat;

  return (
    <group>
      <SectionMesh geometry={p.enamel.geometry} material={enamelMaterial} capColor="#f4f6f8" structureId="enamel" section={section} highlight={highlightOf('enamel')} />
      <SectionMesh geometry={p.dentin.geometry} material={dentinMaterial} capColor="#efd59c" structureId="dentin" section={section} highlight={highlightOf('dentin')} />
      <SectionMesh geometry={geoms.pulp} material={pulpMat} capColor={`#${pulpColor.getHexString()}`} structureId="pulp" section={section} highlight={highlightOf('pulp')} />
      <SectionMesh geometry={geoms.rootCanal} material={canalMat} capColor="#e58e8e" structureId="rootCanal" section={section} highlight={highlightOf('rootCanal')} />
      <SectionMesh geometry={geoms.rootDentin} material={rootMat} capColor="#efd59c" structureId="root" section={section} highlight={highlightOf('root')} />
      <SectionMesh geometry={p.cementumTrunk.geometry} material={cementumMaterial} capColor="#d4b679" structureId="cementum" section={section} highlight={highlightOf('cementum')} />
      <SectionMesh geometry={geoms.rootCementum} material={rootCementumMat} capColor="#d4b679" structureId="cementum" section={section} highlight={highlightOf('cementum')} />
      {p.showSupport && (
        <>
          {!p.recession && (
            <SectionMesh geometry={geoms.pdlTrunk} material={pdlMat} capColor="#c86f7a" structureId="pdl" section={section} highlight={highlightOf('pdl')} />
          )}
          <SectionMesh geometry={geoms.rootPdl} material={pdlMat} capColor="#c86f7a" structureId="pdl" section={section} highlight={highlightOf('pdl')} />
          <SectionMesh
            geometry={p.recession ? geoms.boneRecession : geoms.bone}
            material={boneMat}
            capColor="#dcc9a6"
            structureId="bone"
            section={section}
            highlight={highlightOf('bone')}
          />
          <SectionMesh
            geometry={p.recession ? geoms.gingivaRecession : geoms.gingiva}
            material={gingivaMat}
            capColor="#e7939c"
            structureId="gingiva"
            section={section}
            highlight={highlightOf('gingiva')}
          />
        </>
      )}
    </group>
  );
}
