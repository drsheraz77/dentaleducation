import { ICDAS_CODES } from '../../data/cariesStages';
import type { IcdasScore } from '../../types';

/**
 * Schematic ICDAS illustration: an occlusal view of a molar (left) and a bucco-lingual
 * section through the central fissure (right). Teaching schematics, not clinical photographs.
 */

const C = {
  enamel: '#e2e7ed',
  enamelEdge: '#9aa6b2',
  dentin: '#e8cf98',
  pulp: '#e79a9a',
  groove: '#8b8f96',
  opacity: '#ffffff',
  opacityEdge: '#6b7785',
  brown: '#8a5a2b',
  shadow: '#6f7f94',
  lesionDentin: '#b07a3c',
  lesionDeep: '#6b4220',
  cavity: '#3b2a1c',
};

function Occlusal({ code }: { code: IcdasScore }) {
  const n = Number(code);
  return (
    <g>
      {/* crown outline and cusp shading */}
      <rect x={8} y={10} width={100} height={100} rx={34} fill={C.enamel} stroke={C.enamelEdge} strokeWidth={1.5} />
      {[
        [36, 38],
        [80, 38],
        [36, 82],
        [80, 82],
      ].map(([cx, cy]) => (
        <ellipse key={`${cx}-${cy}`} cx={cx} cy={cy} rx={17} ry={15} fill="#eef2f6" />
      ))}
      {/* lesion features, drawn under the groove lines */}
      {/* ICDAS 1: faint, confined to the fissure (dashed edge: seen only after drying) */}
      {n === 1 && <path d="M32 57 Q58 53 84 57 L84 63 Q58 59 32 63 Z" fill={C.opacity} stroke={C.opacityEdge} strokeWidth={0.8} strokeDasharray="2 2" />}
      {n === 2 && <ellipse cx={58} cy={60} rx={26} ry={11} fill={C.opacity} stroke={C.opacityEdge} strokeWidth={1} />}
      {n === 3 && (
        <>
          <ellipse cx={58} cy={60} rx={26} ry={11} fill={C.opacity} stroke={C.opacityEdge} strokeWidth={1} />
          <path d="M53 57 L60 55 L64 60 L59 64 L52 62 Z" fill="#9aa3ad" stroke="#6b7480" strokeWidth={0.8} />
        </>
      )}
      {n === 4 && <ellipse cx={58} cy={60} rx={24} ry={14} fill={C.shadow} opacity={0.45} />}
      {n === 5 && (
        <>
          <ellipse cx={58} cy={60} rx={22} ry={13} fill={C.opacity} stroke={C.opacityEdge} strokeWidth={1} />
          <ellipse cx={58} cy={60} rx={14} ry={8} fill={C.lesionDentin} stroke={C.brown} strokeWidth={1.2} />
          <ellipse cx={58} cy={61} rx={7} ry={4} fill={C.lesionDeep} />
        </>
      )}
      {n === 6 && (
        <>
          <path d="M22 52 Q24 30 58 32 Q94 30 96 56 Q96 88 58 90 Q20 88 22 52 Z" fill={C.lesionDentin} stroke={C.brown} strokeWidth={1.4} />
          <ellipse cx={58} cy={62} rx={22} ry={15} fill={C.lesionDeep} />
        </>
      )}
      {/* central groove and buccal/lingual grooves */}
      {n < 6 && (
        <>
          <path d="M24 60 Q58 56 92 60" stroke={C.groove} strokeWidth={1.4} fill="none" />
          <path d="M58 24 Q56 42 58 58 Q60 78 58 96" stroke={C.groove} strokeWidth={1.1} fill="none" />
        </>
      )}
    </g>
  );
}

function Section({ code }: { code: IcdasScore }) {
  const n = Number(code);
  // Section geometry: enamel cap over dentin, pulp chamber below; fissure at x = 178.
  const fx = 178;
  return (
    <g>
      <path d="M128 112 L128 46 Q128 18 150 16 L168 20 L178 30 L188 20 L206 16 Q228 18 228 46 L228 112 Z" fill={C.dentin} stroke="#b89a5c" strokeWidth={1} />
      <path
        d="M128 50 L128 46 Q128 18 150 16 L168 20 L178 30 L188 20 L206 16 Q228 18 228 46 L228 50 L220 50 Q220 30 206 28 L190 31 L178 40 L166 31 L150 28 Q136 30 136 50 Z"
        fill={C.enamel}
        stroke={C.enamelEdge}
        strokeWidth={1}
      />
      <path d="M150 112 L150 84 Q150 70 162 72 L178 78 L194 72 Q206 70 206 84 L206 112 Z" fill={C.pulp} stroke="#c07a7a" strokeWidth={1} />
      {/* enamel lesions (white, cone with base towards the DEJ) */}
      {n === 1 && <path d={`M${fx - 2} 31 L${fx + 2} 31 L${fx + 4} 34 L${fx - 4} 34 Z`} fill={C.opacity} stroke={C.opacityEdge} strokeWidth={0.6} />}
      {n === 2 && <path d={`M${fx - 2} 31 L${fx + 2} 31 L${fx + 7} 37 L${fx - 7} 37 Z`} fill={C.opacity} stroke={C.opacityEdge} strokeWidth={0.6} />}
      {(n === 3 || n === 4) && <path d={`M${fx - 3} 31 L${fx + 3} 31 L${fx + 10} 40 L${fx - 10} 40 Z`} fill={C.opacity} stroke={C.opacityEdge} strokeWidth={0.6} />}
      {n === 3 && <path d={`M${fx - 2} 30 L${fx + 2} 30 L${fx + 1} 34 L${fx - 1} 34 Z`} fill="#9aa3ad" />}
      {/* dentin lesions spreading along the DEJ */}
      {n === 4 && <path d={`M${fx - 14} 41 Q${fx} 39 ${fx + 14} 41 Q${fx + 8} 58 ${fx} 60 Q${fx - 8} 58 ${fx - 14} 41 Z`} fill={C.lesionDentin} opacity={0.85} />}
      {n === 5 && (
        <>
          <path d={`M${fx - 16} 41 Q${fx} 39 ${fx + 16} 41 Q${fx + 10} 62 ${fx} 64 Q${fx - 10} 62 ${fx - 16} 41 Z`} fill={C.lesionDentin} />
          <path d={`M${fx - 7} 28 L${fx + 7} 28 L${fx + 6} 48 Q${fx} 52 ${fx - 6} 48 Z`} fill={C.cavity} />
        </>
      )}
      {n === 6 && (
        <>
          <path d={`M${fx - 26} 40 Q${fx} 36 ${fx + 26} 40 Q${fx + 16} 74 ${fx} 76 Q${fx - 16} 74 ${fx - 26} 40 Z`} fill={C.lesionDentin} />
          <path d={`M${fx - 16} 60 Q${fx} 72 ${fx + 16} 60 Q${fx + 10} 70 ${fx} 72 Q${fx - 10} 70 ${fx - 16} 60 Z`} fill={C.lesionDeep} opacity={0.8} />
          <path d={`M${fx - 22} 20 L${fx + 22} 20 L${fx + 18} 56 Q${fx} 64 ${fx - 18} 56 Z`} fill={C.cavity} />
        </>
      )}
    </g>
  );
}

/** `hideCode` keeps the answer out of the caption and the accessible name (assessment items). */
export function IcdasFigure({ code, caption = true, compact = false, hideCode = false }: { code: IcdasScore; caption?: boolean; compact?: boolean; hideCode?: boolean }) {
  const entry = ICDAS_CODES.find((c) => c.code === code)!;
  return (
    <figure className={`icdas-figure${compact ? ' icdas-figure--compact' : ''}`}>
      <svg
        viewBox="0 0 236 120"
        role="img"
        aria-label={
          hideCode
            ? 'Schematic of a molar lesion: occlusal view and section. Identify the ICDAS code.'
            : `Schematic of ICDAS ${code}: ${entry.description} Occlusal view and section.`
        }
      >
        <Occlusal code={code} />
        <Section code={code} />
        <text x={58} y={119} textAnchor="middle" className="icdas-figure__axis">
          occlusal view
        </text>
        <text x={178} y={119} textAnchor="middle" className="icdas-figure__axis">
          section
        </text>
      </svg>
      {caption && !hideCode && (
        <figcaption>
          <strong>ICDAS {code}</strong> · {entry.description}
        </figcaption>
      )}
    </figure>
  );
}

/** All seven codes side by side (or wrapped on narrow screens). */
export function IcdasGallery({ highlight }: { highlight?: string }) {
  return (
    <div className="icdas-gallery">
      {(['0', '1', '2', '3', '4', '5', '6'] as IcdasScore[]).map((c) => (
        <div key={c} className={highlight?.includes(c) ? 'icdas-gallery__item icdas-gallery__item--on' : 'icdas-gallery__item'}>
          <IcdasFigure code={c} compact />
        </div>
      ))}
      <p className="icdas-gallery__note">Schematic illustrations, not clinical photographs. ICDAS is scored on a clean tooth, wet and then air-dried.</p>
    </div>
  );
}
