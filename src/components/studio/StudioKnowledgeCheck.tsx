import { useSim } from '../../state/store';
import { KNOWLEDGE_CHECK, studioScore } from '../../data/studio/cariesLesson';

/** Formative questions about the features shown on the model (lettered markers A–C). */
export function StudioKnowledgeCheck() {
  const answers = useSim((s) => s.studioAnswers);
  const answer = useSim((s) => s.answerStudio);
  const reset = useSim((s) => s.resetStudioAnswers);
  const score = studioScore(answers);
  return (
    <div>
      <p data-testid="studio-score" aria-live="polite">
        Score: {score.correct} / {score.answered} answered ({score.total} questions)
      </p>
      {KNOWLEDGE_CHECK.map((q, n) => {
        const chosen = answers[q.id];
        const done = chosen !== undefined;
        return (
          <section key={q.id} className="card" aria-label={`Question ${n + 1}`}>
            <strong>
              {n + 1}. {q.marker && <span className="marker-chip">{q.marker}</span>} {q.prompt}
            </strong>
            <div className="option-list">
              {q.options.map((o, i) => {
                const cls = done ? (i === q.correctIndex ? ' option--correct' : i === chosen ? ' option--wrong' : '') : '';
                return (
                  <button key={o} type="button" className={`option${cls}`} disabled={done} onClick={() => answer(q.id, i)}>
                    {o}
                  </button>
                );
              })}
            </div>
            {done && (
              <p className={`callout ${chosen === q.correctIndex ? 'callout--ok' : 'callout--bad'}`} role="status">
                <strong>{chosen === q.correctIndex ? 'Correct.' : 'Not quite.'}</strong> {q.explanation}
              </p>
            )}
          </section>
        );
      })}
      {score.answered === score.total && (
        <p className="callout callout--info">
          Finished: {score.correct} of {score.total}. This score is formative feedback only and not evidence of clinical competence.{' '}
          <button type="button" className="btn btn--ghost" style={{ border: 0, padding: 0 }} onClick={reset}>
            Try again
          </button>
        </p>
      )}
    </div>
  );
}
