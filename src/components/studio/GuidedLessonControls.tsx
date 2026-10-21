import { useSim } from '../../state/store';
import { LESSON_STAGES } from '../../data/studio/cariesLesson';

/**
 * Stage stepper for the guided caries lesson. Play, pause, replay, next, previous and reset
 * live in the shared timeline below the viewer; this row jumps straight to any stage.
 */
export function GuidedLessonControls() {
  const step = useSim((s) => s.step);
  const setStep = useSim((s) => s.setStep);
  return (
    <div className="control" role="group" aria-label="Lesson stages">
      Stage
      <div className="chips">
        {LESSON_STAGES.map((st, i) => (
          <button key={st.id} type="button" className="chip" aria-pressed={step === i} onClick={() => setStep(i)}>
            {i + 1}. {st.shortTitle}
          </button>
        ))}
      </div>
    </div>
  );
}
