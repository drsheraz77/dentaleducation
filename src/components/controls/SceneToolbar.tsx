import { useSim } from '../../state/store';

/** Camera and view controls overlaid on the 3D workspace. */
export function SceneToolbar() {
  const s = useSim();
  const section = s.viewMode === 'section';
  return (
    <div className="scene-toolbar" role="toolbar" aria-label="3D view controls">
      <button type="button" className="tool" aria-pressed={section} onClick={() => s.setViewMode(section ? 'external' : 'section')}>
        ◧ <span className="tool__text">{section ? 'Cross-section on' : 'Cross-section'}</span>
      </button>
      <button type="button" className="tool" aria-pressed={s.showLabels} onClick={s.toggleLabels}>
        🏷 <span className="tool__text">Labels</span>
      </button>
      <button type="button" className="tool" aria-pressed={s.showSupport} onClick={s.toggleSupport}>
        ▤ <span className="tool__text">Gingiva &amp; bone</span>
      </button>
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
