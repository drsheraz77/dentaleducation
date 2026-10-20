import { useSim } from '../../state/store';
import { CASES } from '../../data/cases';
import { BulletList, References, Section } from '../education/common';

const VERDICT = { best: 'Most appropriate', acceptable: 'Acceptable, with caveats', 'not-appropriate': 'Not appropriate' } as const;

export function CasePanel() {
  const index = useSim((s) => s.caseIndex);
  const answers = useSim((s) => s.caseAnswers);
  const answer = useSim((s) => s.answerCase);
  const setCase = useSim((s) => s.setCase);
  const c = CASES[index];
  const done = c.questions.every((q) => `${c.id}:${q.id}` in answers);
  return (
    <div>
      <div className="eyebrow">
        Clinical case {index + 1} of {CASES.length} · simulated
      </div>
      <h2>{c.title}</h2>
      <p>{c.patient}</p>
      <Section title="History">
        <BulletList items={c.history} />
      </Section>
      <Section title="Findings">
        <BulletList items={c.findings} />
      </Section>
      <p style={{ fontSize: 13 }}>Inspect the lesion in the 3D view (try the cross-section) before answering.</p>
      {c.questions.map((q) => {
        const key = `${c.id}:${q.id}`;
        const chosen = answers[key];
        return (
          <Section key={key} title={q.prompt}>
            <div className="option-list">
              {q.options.map((o, i) => {
                const reveal = chosen !== undefined;
                const cls = reveal && (i === chosen || o.appropriate === 'best') ? ` option--${o.appropriate}` : '';
                return (
                  <button key={o.text} type="button" className={`option${cls}`} disabled={reveal} onClick={() => answer(key, i)}>
                    {o.text}
                    {reveal && (i === chosen || o.appropriate === 'best') && (
                      <div style={{ fontSize: 13, marginTop: 4 }}>
                        <strong>{VERDICT[o.appropriate]}.</strong> {o.feedback}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </Section>
        );
      })}
      {done && (
        <>
          <p className="callout callout--info">
            <strong>Take-away:</strong> {c.takeaway}
          </p>
          {index < CASES.length - 1 && (
            <button type="button" className="btn" onClick={() => setCase(index + 1)}>
              Next case →
            </button>
          )}
        </>
      )}
      <References ids={c.refs} verification={c.verification} />
    </div>
  );
}
