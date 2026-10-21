import * as THREE from 'three';
import { useEffect } from 'react';
import type { CutSurfaceFinish, StructureId } from '../types';
import type { ToothGeometries } from './geometry/anatomy';
import type { CutResult } from './geometry/cavity';
import { SectionMesh } from './CrossSectionView';
import { getBoneTexture, getNeurovascular } from './geometry/toothSingleton';
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
  const pulpCapColor = new THREE.Color(CAP.pulp).lerp(new THREE.Color(TISSUE_COLORS.pulpInflamed), p.pulpInflammation);
  useEffect(() => {
    pulpMat.color.copy(pulpColor);
  });
  const boneTexture = getBoneTexture();

  const enamelMaterial = p.enamel.cut ? [enamelMat, enamelCut] : enamelMat;
  const dentinMaterial = p.dentin.cut ? [dentinMat, dentinCut] : dentinMat;
  const cementumMaterial = p.cementumTrunk.cut ? [cementumMat, dentinCut] : cementumMat;

  return (
    <group>
      <SectionMesh geometry={p.enamel.geometry} material={enamelMaterial} capColor={CAP.enamel} structureId="enamel" section={section} highlight={highlightOf('enamel')} />
      <SectionMesh geometry={p.dentin.geometry} material={dentinMaterial} capColor={CAP.dentin} structureId="dentin" section={section} highlight={highlightOf('dentin')} />
      <SectionMesh geometry={geoms.pulp} material={pulpMat} capColor={`#${pulpCapColor.getHexString()}`} structureId="pulp" section={section} highlight={highlightOf('pulp')} />
      <SectionMesh geometry={geoms.rootCanal} material={canalMat} capColor={`#${pulpCapColor.getHexString()}`} structureId="rootCanal" section={section} highlight={highlightOf('rootCanal')} />
      <SectionMesh geometry={geoms.rootDentin} material={rootMat} capColor={CAP.dentin} structureId="root" section={section} highlight={highlightOf('root')} />
      <SectionMesh geometry={p.cementumTrunk.geometry} material={cementumMaterial} capColor={CAP.cementum} structureId="cementum" section={section} highlight={highlightOf('cementum')} />
      <SectionMesh geometry={geoms.rootCementum} material={rootCementumMat} capColor={CAP.cementum} structureId="cementum" section={section} highlight={highlightOf('cementum')} />
      {p.showSupport && (
        <>
          {!p.recession && (
            <SectionMesh geometry={geoms.pdlTrunk} material={pdlMat} capColor={CAP.pdl} structureId="pdl" section={section} highlight={highlightOf('pdl')} />
          )}
          <SectionMesh geometry={geoms.rootPdl} material={pdlMat} capColor={CAP.pdl} structureId="pdl" section={section} highlight={highlightOf('pdl')} />
          <SectionMesh
            geometry={p.recession ? geoms.boneRecession : geoms.bone}
            material={boneMat}
            capColor={boneTexture ? '#ffffff' : CAP.bone}
            capMap={boneTexture}
            structureId="bone"
            section={section}
            highlight={highlightOf('bone')}
          />
          <SectionMesh
            geometry={p.recession ? geoms.gingivaRecession : geoms.gingiva}
            material={gingivaMat}
            capColor={CAP.gingiva}
            structureId="gingiva"
            section={section}
            highlight={highlightOf('gingiva')}
          />
        </>
      )}
      {section && <Neurovascular highlight={highlightOf('neurovascular')} />}
    </group>
  );
}

/** Cut-face colours in the warm palette of textbook section illustrations. */
const CAP = {
  enamel: '#f2f3f5',
  dentin: '#f6c9a0',
  pulp: '#f0a487',
  cementum: '#e8bf8c',
  pdl: '#f3aeb4',
  bone: '#efd2b0',
  gingiva: '#ea8d99',
};

/** Arteries (red), veins (blue) and nerve (yellow) entering at the apices; shown on the section only. */
function Neurovascular({ highlight }: { highlight: number }) {
  const g = getNeurovascular();
  const artery = useDisposable(() => new THREE.MeshStandardMaterial({ color: '#d7262b', roughness: 0.45 }), []);
  const vein = useDisposable(() => new THREE.MeshStandardMaterial({ color: '#2f5fc4', roughness: 0.45 }), []);
  const nerve = useDisposable(() => new THREE.MeshStandardMaterial({ color: '#f2c84b', roughness: 0.5 }), []);
  useEffect(() => {
    for (const m of [artery, vein, nerve]) {
      m.emissive.set('#3b82f6');
      m.emissiveIntensity = highlight * 0.5;
    }
  }, [highlight, artery, vein, nerve]);
  const userData = { structureId: 'neurovascular' };
  return (
    <group>
      <mesh geometry={g.nerve} material={nerve} userData={userData} dispose={null} />
      <mesh geometry={g.vein} material={vein} userData={userData} dispose={null} />
      <mesh geometry={g.artery} material={artery} userData={userData} dispose={null} />
    </group>
  );
}
