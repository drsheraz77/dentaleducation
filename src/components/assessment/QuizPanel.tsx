import { useSim } from '../../state/store';
import { QUIZ, QUIZ_TOPIC_LABEL } from '../../data/quiz';
import { quizScore } from '../../state/selectors';
import { referencesFor } from '../../data/references';
import { IcdasFigure } from '../education/IcdasFigure';
import type { QuizTopic, TopicId } from '../../types';

const TOPIC_LABEL = QUIZ_TOPIC_LABEL;

/** Where to revise each topic. */
const TOPIC_MODULE: Record<QuizTopic, TopicId> = {
  anatomy: 'anatomy',
  caries: 'caries',
  classification: 'classification',
  activity: 'classification',
  treatment: 'diagnosis',
  'deep-caries': 'diagnosis',
  primary: 'classification',
  materials: 'materials',
  procedures: 'preparation',
};

export function QuizPanel() {
  const quiz = useSim((s) => s.quiz);
  const answerQuiz = useSim((s) => s.answerQuiz);
  const nextQuestion = useSim((s) => s.nextQuestion);
  const restart = useSim((s) => s.restartQuiz);
  const setTopic = useSim((s) => s.setTopic);
  const score = quizScore(quiz.answers);

  if (quiz.finished) {
    const byTopic = new Map<QuizTopic, { c: number; t: number }>();
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
          <table className="compare" style={{ maxWidth: 480 }}>
            <tbody>
              {[...byTopic.entries()].map(([t, v]) => (
                <tr key={t}>
                  <th scope="row">{TOPIC_LABEL[t]}</th>
                  <td>
                    {v.c} / {v.t}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(() => {
            const pct = (v: { c: number; t: number }) => v.c / v.t;
            const strengths = [...byTopic.entries()].filter(([, v]) => pct(v) >= 0.8).map(([t]) => t);
            const weak = [...byTopic.entries()].filter(([, v]) => pct(v) < 0.6).map(([t]) => t);
            return (
              <div data-testid="quiz-summary">
                <h3>Strengths</h3>
                <p>{strengths.length ? strengths.map((t) => TOPIC_LABEL[t]).join(', ') : 'No topic reached 80% yet — keep practising.'}</p>
                <h3>Areas for improvement</h3>
                {weak.length ? (
                  <ul>
                    {weak.map((t) => (
                      <li key={t}>
                        {TOPIC_LABEL[t]} —{' '}
                        <button type="button" className="btn btn--ghost btn--inline" onClick={() => setTopic(TOPIC_MODULE[t])}>
                          revise this topic
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>No topic below 60%.</p>
                )}
              </div>
            );
          })()}
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
            Question {quiz.index + 1} of {QUIZ.length} · {TOPIC_LABEL[q.topic]}
            {q.verification === 'draft_pending_review' && <span className="verify"> · Draft · requires expert verification</span>}
          </span>
          <span data-testid="quiz-running-score">
            Score: {score.correct} / {score.answered}
          </span>
        </div>
        <h2>{q.prompt}</h2>
        {q.figure && <IcdasFigure code={q.figure} hideCode />}
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
