import { useEffect } from 'react';
import { useSim } from '../../state/store';
import { getTimeline } from '../../state/selectors';

/** Base duration of one step during playback, before the speed multiplier. */
export const STEP_MS = 3600;
export const SPEEDS = [0.5, 1, 1.5, 2];

const EMPTY_REASON: Record<string, string> = {
  diagnosis: 'The decision pathway updates the 3D lesion directly — use the variables in the right-hand panel.',
  cases: 'Clinical cases are answered in the right-hand panel; the 3D view shows the case presentation.',
  materialsCompare: 'Comparison view: choose two materials above. Switch to "Workflow" for a step-by-step animation.',
  materialsUnsupported:
    'This material and preparation combination is not supported, so there is no sequence to play. Choose a supported preparation.',
};

function emptyReason(topic: string, materialsTab: string): string {
  if (topic === 'materials') return materialsTab === 'compare' ? EMPTY_REASON.materialsCompare : EMPTY_REASON.materialsUnsupported;
  return EMPTY_REASON[topic] ?? 'There is no animation sequence for this view.';
}

export function Timeline() {
  const state = useSim();
  const { step, playing, speed, topic, play, pause, reset, nextStep, prevStep, setSpeed, setStep } = state;
  const steps = getTimeline(state);
  const n = steps.length;

  // Playback: advance one step per STEP_MS / speed.
  useEffect(() => {
    if (!playing || n === 0) return;
    const id = window.setTimeout(() => nextStep(), STEP_MS / speed);
    return () => window.clearTimeout(id);
  }, [playing, step, speed, n, nextStep]);

  if (n === 0) {
    return (
      <div className="timeline" aria-label="Animation timeline">
        <p className="timeline__empty">{emptyReason(topic, state.materialsTab)}</p>
      </div>
    );
  }

  const current = steps[Math.min(step, n - 1)];
  return (
    <div className="timeline" aria-label="Animation timeline">
      <div className="timeline__row">
        <button type="button" className="icon-btn" onClick={prevStep} disabled={step === 0} aria-label="Previous step" title="Previous step">
          ◀◀
        </button>
        {playing ? (
          <button type="button" className="icon-btn icon-btn--primary" onClick={pause} aria-label="Pause">
            ❚❚ Pause
          </button>
        ) : (
          <button type="button" className="icon-btn icon-btn--primary" onClick={play} aria-label={step >= n - 1 ? 'Replay' : 'Play'}>
            ▶ {step >= n - 1 ? 'Replay' : 'Play'}
          </button>
        )}
        <button type="button" className="icon-btn" onClick={nextStep} disabled={step >= n - 1} aria-label="Next step" title="Next step">
          ▶▶
        </button>
        <button type="button" className="icon-btn" onClick={reset} aria-label="Reset to first step" title="Reset">
          ↺ Reset
        </button>
        <div className="timeline__title" aria-live="polite">
          <small>
            Step {Math.min(step, n - 1) + 1}/{n}
          </small>
          {current.title}
        </div>
        <label className="control">
          Speed
          <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))} aria-label="Animation speed">
            {SPEEDS.map((s) => (
              <option key={s} value={s}>
                {s}×
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="progress" role="group" aria-label="Progress">
        {steps.map((s, i) => (
          <button
            type="button"
            key={s.id}
            className={`progress__seg${i < step ? ' progress__seg--done' : ''}${i === step ? ' progress__seg--current' : ''}`}
            onClick={() => setStep(i)}
            aria-label={`Go to step ${i + 1}: ${s.title}`}
            aria-current={i === step ? 'step' : undefined}
            title={s.title}
          >
            {i === step && playing && i < n - 1 && (
              <span key={`${step}-${speed}`} className="progress__fill" style={{ animationDuration: `${STEP_MS / speed}ms` }} />
            )}
            {i === step && (!playing || i === n - 1) && <span className="progress__fill" style={{ animationDuration: '0ms' }} />}
          </button>
        ))}
      </div>
    </div>
  );
}
