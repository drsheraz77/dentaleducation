import { useSim } from '../../state/store';
import { currentStimulus } from '../../state/selectors';
import { tubuleResponse, type StimulusId } from '../../data/dentinTubules';

/**
 * Magnified longitudinal view of cervical dentin (after classic textbook figures):
 * enamel and the cervical root surface on the left, tubules crossing the dentin,
 * odontoblasts and nerve fibres at the pulp on the right. The chosen stimulus
 * animates dentinal fluid and nerve firing according to the hydrodynamic model.
 * Schematic only — not to scale.
 */

const SURFACE_X = 112;
const PULP_X = 628;
/** Rows of tubules; `zone` decides what covers their outer end. */
const ROWS: { y: number; zone: 'enamel' | 'cervical' | 'root' }[] = [
  { y: 78, zone: 'enamel' },
  { y: 128, zone: 'enamel' },
  { y: 178, zone: 'enamel' },
  { y: 238, zone: 'cervical' },
  { y: 290, zone: 'cervical' },
  { y: 342, zone: 'cervical' },
  { y: 410, zone: 'root' },
];
const ENAMEL_BOTTOM = 205;
const CERVICAL_BOTTOM = 372;

const tubulePath = (y: number) =>
  `M${SURFACE_X} ${y} C ${SURFACE_X + 170} ${y - 16}, ${PULP_X - 190} ${y + 16}, ${PULP_X} ${y}`;

function StimulusGlyph({ id, active }: { id: StimulusId; active: boolean }) {
  if (id === 'none') return null;
  const y = 290;
  const cls = active ? 'tv-stimulus tv-stimulus--active' : 'tv-stimulus';
  switch (id) {
    case 'cold':
      return (
        <g className={cls}>
          <text x="46" y={y + 10} textAnchor="middle" fontSize="34">❄</text>
          <text x="46" y={y + 40} textAnchor="middle" className="tv-small">cold</text>
        </g>
      );
    case 'air':
      return (
        <g className={cls}>
          {[-18, 0, 18].map((d) => (
            <path key={d} d={`M14 ${y + d}h52`} className="tv-air" markerEnd="url(#tv-arrow)" />
          ))}
          <text x="40" y={y + 46} textAnchor="middle" className="tv-small">air</text>
        </g>
      );
    case 'sweet':
      return (
        <g className={cls}>
          {[[34, y - 12], [56, y + 2], [38, y + 16], [60, y - 22]].map(([x, yy]) => (
            <rect key={`${x}-${yy}`} x={x} y={yy} width="9" height="9" transform={`rotate(45 ${x + 4.5} ${yy + 4.5})`} className="tv-sugar" />
          ))}
          <text x="46" y={y + 46} textAnchor="middle" className="tv-small">sugar</text>
        </g>
      );
    case 'probe':
      return (
        <g className={cls}>
          <path d={`M10 ${y - 40} L74 ${y - 4} L${SURFACE_X - 6} ${y}`} className="tv-probe" />
          <text x="40" y={y + 34} textAnchor="middle" className="tv-small">probe</text>
        </g>
      );
    case 'heat':
      return (
        <g className={cls}>
          <text x="46" y={y + 10} textAnchor="middle" fontSize="32">♨</text>
          <text x="46" y={y + 40} textAnchor="middle" className="tv-small">heat</text>
        </g>
      );
  }
}

export function TubulesView() {
  const s = useSim();
  const stimulus = currentStimulus(s);
  const exposed = s.dentinExposed;
  const occluded = s.tubulesOccluded;
  const response = tubuleResponse(stimulus, exposed, occluded);
  const gumTop = exposed ? CERVICAL_BOTTOM : ENAMEL_BOTTOM + 6;
  const select = s.selectStructure;

  const flowClass = response.flow ? `tv-fluid tv-fluid--${response.flow}` : 'tv-fluid';
  const reached = (zone: 'enamel' | 'cervical' | 'root') => zone === 'cervical' && exposed;

  return (
    <div className="tubules-view">
      <svg viewBox="0 0 800 500" role="img" aria-label={`Dentinal tubules, magnified. ${response.headline}.`} className="tubules-svg">
        <defs>
          <marker id="tv-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M0 0L10 5L0 10z" fill="#4b5563" />
          </marker>
          <linearGradient id="tv-dentin" x1="0" x2="1">
            <stop offset="0" stopColor="#f6d6ae" />
            <stop offset="1" stopColor="#f0c393" />
          </linearGradient>
        </defs>

        {/* Pulp with nerve plexus */}
        <g className="tv-click" onClick={() => select('pulp')}>
          <rect x={PULP_X + 12} y="30" width={800 - PULP_X - 12} height="450" fill="#f2b3a6" />
          <path d={`M${PULP_X + 60} 30 C ${PULP_X + 40} 160, ${PULP_X + 80} 300, ${PULP_X + 55} 480`} className="tv-nerve-trunk" />
          <path d={`M${PULP_X + 120} 30 C ${PULP_X + 140} 180, ${PULP_X + 100} 320, ${PULP_X + 130} 480`} className="tv-vessel" />
        </g>

        {/* Dentin block with faint texture lines */}
        <g className="tv-click" onClick={() => select('dentin')}>
          <rect x={SURFACE_X} y="30" width={PULP_X - SURFACE_X} height="450" fill="url(#tv-dentin)" />
          {Array.from({ length: 22 }, (_, i) => 52 + i * 19).map((y) => (
            <path key={y} d={tubulePath(y)} className="tv-texture" />
          ))}
        </g>

        {/* Enamel cap over the crown part */}
        <g className="tv-click" onClick={() => select('enamel')}>
          <path d={`M30 30 H${SURFACE_X} V${ENAMEL_BOTTOM} L${SURFACE_X - 4} ${ENAMEL_BOTTOM} C 70 ${ENAMEL_BOTTOM - 10}, 40 ${ENAMEL_BOTTOM - 70}, 30 30 Z`} fill="#fafbfc" stroke="#94a3b8" strokeWidth="1.5" />
        </g>

        {/* Cementum on the root surface (worn away over the exposed cervical dentin) */}
        <g className="tv-click" onClick={() => select('cementum')}>
          <rect x={SURFACE_X - 8} y={exposed ? CERVICAL_BOTTOM : ENAMEL_BOTTOM} width="8" height={480 - (exposed ? CERVICAL_BOTTOM : ENAMEL_BOTTOM)} fill="#e5bd8a" />
        </g>

        {/* Gingiva: covers the cervical area unless it has receded */}
        <g className="tv-click" onClick={() => select('gingiva')}>
          <path d={`M0 ${gumTop + 26} C 40 ${gumTop - 4}, 80 ${gumTop - 4}, ${SURFACE_X - 8} ${gumTop} V480 H0 Z`} fill="#ec96a1" stroke="#d26f7d" />
        </g>

        {/* Tubules */}
        {ROWS.map((r) => {
          const open = reached(r.zone);
          return (
            <g key={r.y} className="tv-click" onClick={() => select('tubules')}>
              <path d={tubulePath(r.y)} className="tv-tubule" />
              <path
                d={tubulePath(r.y)}
                className={open && response.fluidMoves ? flowClass : 'tv-fluid'}
              />
              {/* odontoblast process (inner part) and nerve fibre entering the tubule */}
              <path d={`M${PULP_X} ${r.y} C ${PULP_X - 50} ${r.y + 4}, ${PULP_X - 100} ${r.y + 8}, ${PULP_X - 150} ${r.y + 9}`} className="tv-process" />
              <path d={`M${PULP_X + 60} ${r.y + 12} C ${PULP_X + 30} ${r.y + 10}, ${PULP_X + 8} ${r.y + 4}, ${PULP_X - 40} ${r.y + 2}`} className={open && response.nerveFires ? 'tv-fibre tv-fibre--firing' : 'tv-fibre'} />
              {open && response.nerveFires && <circle cx={PULP_X - 40} cy={r.y + 2} r="5" className="tv-impulse" />}
              {/* odontoblast cell body */}
              <ellipse cx={PULP_X + 6} cy={r.y} rx="15" ry="11" className="tv-odontoblast" />
              <circle cx={PULP_X + 10} cy={r.y} r="4" className="tv-nucleus" />
              {open && <circle cx={SURFACE_X} cy={r.y} r="6" className="tv-opening" />}
              {open && occluded && <circle cx={SURFACE_X + 2} cy={r.y} r="7" className="tv-plug" />}
            </g>
          );
        })}

        <StimulusGlyph id={stimulus.id} active={response.fluidMoves || stimulus.id !== 'none'} />

        {/* Labels */}
        <g className="tv-labels">
          <text x="150" y="22">Enamel</text>
          <path d="M150 26 L95 60" />
          <text x="360" y="22">Dentin</text>
          <text x="380" y="270" className="tv-label-strong">Tubules</text>
          <path d="M400 276 L410 284" />
          <text x={PULP_X + 24} y="22">Pulp</text>
          <text x={PULP_X - 120} y="494">Odontoblasts</text>
          <path d={`M${PULP_X - 50} 482 L${PULP_X + 2} 418`} />
          <text x={PULP_X + 70} y="494">Nerve fibres</text>
          <path d={`M${PULP_X + 100} 482 L${PULP_X + 62} 440`} />
          {exposed ? (
            <>
              <text x="130" y="390" className="tv-label-strong">Exposed dentin</text>
              <path d={`M130 384 L${SURFACE_X + 4} 350`} />
            </>
          ) : (
            <>
              <text x="130" y="230">Cementum</text>
              <path d={`M130 226 L${SURFACE_X - 4} 236`} />
            </>
          )}
          <text x="10" y="470">Gingiva</text>
        </g>
      </svg>
      <div className={`tubules-banner${response.nerveFires ? ' tubules-banner--pain' : ''}`} role="status" aria-live="polite">
        <strong>{stimulus.name}:</strong> {response.headline}
      </div>
    </div>
  );
}
