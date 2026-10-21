import { useSim } from '../../state/store';
import { LOWER_MOLAR_47 } from '../../data/studio/assets';
import { COMPARABLE_STAGES, LESSON_STAGES } from '../../data/studio/cariesLesson';

/** Show/hide each anatomical layer of the scanned tooth, plus the schematic lesion overlay. */
export function AnatomyLayerControls() {
  const layers = useSim((s) => s.studioLayers);
  const toggle = useSim((s) => s.toggleStudioLayer);
  const lesion = useSim((s) => s.showLesionOverlay);
  const toggleLesion = useSim((s) => s.toggleLesionOverlay);
  return (
    <div className="control" role="group" aria-label="Layers">
      Layers
      <div className="chips">
        {LOWER_MOLAR_47.layers.map((l) => (
          <button key={l.id} type="button" className="chip" aria-pressed={layers[l.id]} onClick={() => toggle(l.id)}>
            {layers[l.id] ? '☑' : '☐'} {l.label}
          </button>
        ))}
        <button type="button" className="chip" aria-pressed={lesion} onClick={toggleLesion}>
          {lesion ? '☑' : '☐'} Lesion overlay (schematic)
        </button>
      </div>
    </div>
  );
}

/** Pick which stages appear side by side in the comparison stage (two to four). */
export function CompareStageControls() {
  const chosen = useSim((s) => s.studioCompare);
  const toggle = useSim((s) => s.toggleCompareStage);
  return (
    <div className="control" role="group" aria-label="Stages to compare">
      Compare
      <div className="chips">
        {COMPARABLE_STAGES.map((id) => {
          const on = chosen.includes(id);
          return (
            <button
              key={id}
              type="button"
              className="chip"
              aria-pressed={on}
              disabled={on && chosen.length <= 2}
              title={on && chosen.length <= 2 ? 'At least two stages are compared' : undefined}
              onClick={() => toggle(id)}
            >
              {LESSON_STAGES.find((s) => s.id === id)!.shortTitle}
            </button>
          );
        })}
      </div>
    </div>
  );
}
