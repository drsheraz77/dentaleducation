import { useSim } from '../../state/store';
import { QUIZ } from '../../data/quiz';
import { quizScore } from '../../state/selectors';
import { referencesFor } from '../../data/references';

export function QuizPanel() {
  const quiz = useSim((s) => s.quiz);
  const answerQuiz = useSim((s) => s.answerQuiz);
  const nextQuestion = useSim((s) => s.nextQuestion);
  const restart = useSim((s) => s.restartQuiz);
  const score = quizScore(quiz.answers);

  if (quiz.finished) {
    const byTopic = new Map<string, { c: number; t: number }>();
    QUIZ.forEach((q, i) => {
      const e = byTopic.get(q.topic) ?? { c: 0, t: 0 };
      e.t++;
      if (quiz.answers[i] === q.correctIndex) e.c++;
      byTopic.set(q.topic, e);
    });
    return (
      <div className="quiz">
        <div className="quiz__inner" role="region" aria-label="Quiz results">
          <div className="eyebrow">Results</div>
          <div className="score" data-testid="quiz-score">
            {score.correct} / {score.total}
          </div>
          <table className="compare" style={{ maxWidth: 420 }}>
            <tbody>
              {[...byTopic.entries()].map(([t, v]) => (
                <tr key={t}>
                  <th scope="row" style={{ textTransform: 'capitalize' }}>
                    {t}
                  </th>
                  <td>
                    {v.c} / {v.t}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="callout">
            Quiz scores are formative feedback for self-study. They are <strong>not</strong> evidence of clinical competence.
          </p>
          <button type="button" className="btn" onClick={restart}>
            Restart quiz
          </button>
        </div>
      </div>
    );
  }

  const q = QUIZ[quiz.index];
  const chosen = quiz.answers[quiz.index];
  const answered = chosen !== null;
  return (
    <div className="quiz">
      <div className="quiz__inner">
        <div className="quiz__meta">
          <span>
            Question {quiz.index + 1} of {QUIZ.length} · <span style={{ textTransform: 'capitalize' }}>{q.topic}</span>
          </span>
          <span data-testid="quiz-running-score">
            Score: {score.correct} / {score.answered}
          </span>
        </div>
        <h2>{q.prompt}</h2>
        <div className="option-list" role="group" aria-label="Answer options">
          {q.options.map((o, i) => {
            const cls = answered ? (i === q.correctIndex ? ' option--correct' : i === chosen ? ' option--wrong' : '') : '';
            return (
              <button key={o} type="button" className={`option${cls}`} disabled={answered} onClick={() => answerQuiz(i)}>
                {o}
              </button>
            );
          })}
        </div>
        {answered && (
          <div className={`callout ${chosen === q.correctIndex ? 'callout--ok' : 'callout--bad'}`} role="status">
            <strong>{chosen === q.correctIndex ? 'Correct.' : 'Not quite.'}</strong> {q.explanation}
            <div className="refs" style={{ marginTop: 6 }}>
              Source: {referencesFor(q.refs).map((r) => r.citation.split('.')[0]).join('; ')}
            </div>
          </div>
        )}
        <button type="button" className="btn" onClick={nextQuestion} disabled={!answered}>
          {quiz.index === QUIZ.length - 1 ? 'See results' : 'Next question →'}
        </button>
      </div>
    </div>
  );
}
