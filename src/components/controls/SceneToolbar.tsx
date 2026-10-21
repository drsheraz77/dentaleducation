import { useSim } from '../../state/store';
import { LESSON_STAGES } from '../../data/studio/cariesLesson';

/** Camera and view controls overlaid on the 3D workspace. */
export function SceneToolbar() {
  const s = useSim();
  const section = s.viewMode === 'section';
  const studio = s.topic === 'studio';
  // The comparison stage always shows sections side by side.
  const sectionLocked = studio && LESSON_STAGES[Math.min(s.step, LESSON_STAGES.length - 1)].kind === 'compare';
  return (
    <div className="scene-toolbar" role="toolbar" aria-label="3D view controls">
      <button
        type="button"
        className="tool"
        aria-pressed={section || sectionLocked}
        disabled={sectionLocked}
        title={sectionLocked ? 'The comparison stage always shows cross-sections' : undefined}
        onClick={() => s.setViewMode(section ? 'external' : 'section')}>
        ◧ <span className="tool__text">{section ? 'Cross-section on' : 'Cross-section'}</span>
      </button>
      <button type="button" className="tool" aria-pressed={s.showLabels} onClick={s.toggleLabels}>
        🏷 <span className="tool__text">Labels</span>
      </button>
      {studio ? (
        <button type="button" className="tool" aria-pressed={s.autoRotate} onClick={s.toggleAutoRotate}>
          ⟳ <span className="tool__text">Auto-rotate</span>
        </button>
      ) : (
        <button type="button" className="tool" aria-pressed={s.showSupport} onClick={s.toggleSupport}>
          ▤ <span className="tool__text">Gingiva &amp; bone</span>
        </button>
      )}
      {s.topic === 'anatomy' && (
        <button type="button" className="tool" aria-pressed={s.pathology} onClick={s.togglePathology}>
          ✚ <span className="tool__text">{s.pathology ? 'Pathological' : 'Normal anatomy'}</span>
        </button>
      )}
      <button type="button" className="tool" onClick={s.resetCamera}>
        ⟲ <span className="tool__text">Reset camera</span>
      </button>
    </div>
  );
}
