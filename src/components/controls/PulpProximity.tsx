import { useSim } from '../../state/store';
import { deriveScene } from '../../state/selectors';
import { remainingDentinOverPulp } from '../../three/geometry/prepPlan';
import { pulpBand } from '../../modules/procedures/review';
import { Term } from '../education/Term';

/** Full scale of the gauge (mm of remaining dentin in the model). */
const SCALE = 3;

/**
 * Remaining dentin between the deepest point of the simulated preparation and the pulp,
 * measured on the schematic model. Shown during cavity preparation.
 */
export function PulpProximity() {
  const state = useSim();
  if (state.topic !== 'preparation') return null;
  const teeth = deriveScene(state).teeth;
  const readings = teeth
    .map((t) => ({ caption: t.caption, mm: remainingDentinOverPulp(t.visual.cavity, t.visual.lesion) }))
    .filter((r): r is { caption: string | undefined; mm: number } => r.mm !== null);
  if (readings.length === 0) return null;
  return (
    <div className="pulp-gauge" role="status" aria-live="polite" data-testid="pulp-proximity">
      <div className="pulp-gauge__title">
        Pulp proximity <Term id="rdt" icon />
      </div>
      {readings.map((r) => {
        const band = pulpBand(r.mm);
        return (
          <div key={r.caption ?? 'single'} className="pulp-gauge__row">
            {r.caption && <span className="pulp-gauge__caption">{r.caption}</span>}
            <div className="pulp-gauge__bar" aria-hidden>
              <i className={`pulp-gauge__fill pulp-gauge__fill--${band.tone}`} style={{ width: `${Math.min(100, (r.mm / SCALE) * 100)}%` }} />
            </div>
            <span className={`pulp-gauge__value pulp-gauge__value--${band.tone}`}>
              ≈ {r.mm.toFixed(1)} mm · {band.label}
            </span>
          </div>
        );
      })}
      {/* In the side-by-side comparison the note would cover the captions; the tooltip carries it. */}
      {readings.length === 1 && (
        <div className="pulp-gauge__note">Remaining dentin measured on the schematic model; bands are illustrative, not clinical thresholds.</div>
      )}
    </div>
  );
}
