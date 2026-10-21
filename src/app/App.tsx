import { Suspense, lazy, useEffect, useMemo } from 'react';
import { Header } from '../components/layout/Header';
import { NavPanel } from '../components/layout/NavPanel';
import { InfoPanel } from '../components/layout/InfoPanel';
import { ModuleControls } from '../components/controls/ModuleControls';
import { SceneToolbar } from '../components/controls/SceneToolbar';
import { Timeline } from '../components/controls/Timeline';
import { QuizPanel } from '../components/assessment/QuizPanel';
import { useSim } from '../state/store';
import { deriveScene, getTimeline, isTextbookView, isTubulesView } from '../state/selectors';
import { TubulesView } from '../modules/anatomy/TubulesView';
import { TISSUE_COLORS } from '../three/colors';

// three.js, React Three Fiber and the CSG engine are loaded on demand so the UI shell appears immediately.
const ToothScene = lazy(() => import('../three/ToothScene').then((m) => ({ default: m.ToothScene })));

function SceneLoading() {
  return (
    <div className="scene-message" role="status" aria-live="polite">
      <div className="spinner" aria-hidden />
      <p>Loading the 3D engine…</p>
    </div>
  );
}

/** In guided mode, steps that define a camera also choose the most informative view. */
function useGuidedViewSync() {
  const state = useSim();
  const setViewMode = useSim((s) => s.setViewMode);
  const camera = useMemo(() => deriveScene(state).teeth[0]?.visual.camera, [state]);
  useEffect(() => {
    if (state.mode !== 'guided' || !camera) return;
    setViewMode(camera === 'section' ? 'section' : 'external');
  }, [state.mode, state.topic, state.step, camera, setViewMode]);
}

function GuidedBanner() {
  const state = useSim();
  if (state.mode !== 'guided') return null;
  const steps = getTimeline(state);
  if (steps.length === 0) return null;
  const step = steps[Math.min(state.step, steps.length - 1)];
  return (
    <div className="guided-banner" aria-live="polite">
      <strong>
        Guided · step {state.step + 1} of {steps.length}
      </strong>
      {step.title} — press <em>Play</em> to advance automatically, or use the step buttons.
    </div>
  );
}

function Legend() {
  const section = useSim((s) => s.viewMode === 'section');
  const textbook = useSim(isTextbookView);
  // The textbook view names every tissue with callouts, so the colour key is redundant there.
  if (!section || textbook) return null;
  const items: [string, string][] = [
    ['Enamel', TISSUE_COLORS.enamel],
    ['Dentin', TISSUE_COLORS.dentin],
    ['Pulp', TISSUE_COLORS.pulp],
    ['Cementum', TISSUE_COLORS.cementum],
    ['PDL', TISSUE_COLORS.pdl],
    ['Bone', TISSUE_COLORS.bone],
    ['Lesion', TISSUE_COLORS.lesionDentinOuter],
  ];
  return (
    <div className="legend" aria-label="Colour legend">
      {items.map(([l, c]) => (
        <span key={l}>
          <i style={{ background: c }} />
          {l}
        </span>
      ))}
    </div>
  );
}

function Notice() {
  const state = useSim();
  const notice = deriveScene(state).notice;
  if (!notice) return null;
  return (
    <div className={`scene-notice scene-notice--${notice.tone}`} role={notice.tone === 'warning' ? 'alert' : 'status'}>
      {notice.text}
    </div>
  );
}

export default function App() {
  const topic = useSim((s) => s.topic);
  const textbook = useSim(isTextbookView);
  const tubules = useSim(isTubulesView);
  useGuidedViewSync();
  const show3D = topic !== 'quiz';
  return (
    <div className="app">
      <Header />
      <div className="layout">
        <NavPanel />
        <main className="workspace" aria-label="Workspace">
          <ModuleControls />
          {show3D ? (
            <div className={textbook || tubules ? 'viewport viewport--textbook' : 'viewport'}>
              {tubules ? (
                <TubulesView />
              ) : (
                <>
                  <Suspense fallback={<SceneLoading />}>
                    <ToothScene />
                  </Suspense>
                  <SceneToolbar />
                  <Notice />
                  <Legend />
                </>
              )}
              <GuidedBanner />
            </div>
          ) : (
            <QuizPanel />
          )}
          {show3D && <Timeline />}
        </main>
        <InfoPanel />
      </div>
    </div>
  );
}
