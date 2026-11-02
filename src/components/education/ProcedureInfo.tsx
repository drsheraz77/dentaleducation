import { useSim } from '../../state/store';
import { PROCEDURE_BY_ID } from '../../data/procedures';
import { INSTRUMENTS } from '../../data/instruments';
import { ADHESIVE_PROTOCOLS, COMPARISON_LABELS, MATERIAL_BY_ID, PROTOCOL_BY_ID } from '../../data/materials';
import { chosenInstrument, instrumentFeedback, materialSteps, materialSupport } from '../../state/selectors';
import type { ComparisonKey } from '../../types';
import { BulletList, References, Section, SelectedStructureCard } from './common';
import { CHECKPOINTS, CHECKPOINT_STATUS, CRITERION_LABEL, checkpointKey } from '../../data/procedureCheckpoints';
import { reviewProcedure, type ReviewStatus } from '../../modules/procedures/review';

function CheckpointCard() {
  const s = useSim();
  const proc = PROCEDURE_BY_ID[s.procedureId];
  const step = proc.steps[s.step];
  const cp = CHECKPOINTS[s.procedureId].find((c) => c.stepId === step.id);
  if (!cp) return null;
  const key = checkpointKey(s.procedureId, cp.stepId);
  const chosen = s.checkpointAnswers[key];
  const done = chosen !== undefined;
  return (
    <section className="card checkpoint" aria-label="Reasoning checkpoint">
      <div className="eyebrow">Reasoning checkpoint · {CRITERION_LABEL[cp.criterion]}</div>
      <strong>{cp.prompt}</strong>
      <div className="option-list" role="group" aria-label={cp.prompt}>
        {cp.options.map((o, i) => {
          const cls = done ? (o.verdict === 'good' ? ' option--correct' : i === chosen ? ' option--wrong' : '') : '';
          return (
            <button key={o.text} type="button" className={`option${cls}`} disabled={done} onClick={() => s.answerCheckpoint(key, i)}>
              {o.text}
            </button>
          );
        })}
      </div>
      {done && (
        <p className={`callout ${cp.options[chosen].verdict === 'good' ? 'callout--ok' : 'callout--bad'}`} role="status">
          <strong>{cp.options[chosen].verdict === 'good' ? 'Sound decision.' : 'This would be an error.'}</strong> {cp.options[chosen].feedback}
        </p>
      )}
    </section>
  );
}

const STATUS_TEXT: Record<ReviewStatus, string> = {
  met: 'Done well',
  partly: 'Partly',
  'needs-work': 'Needs improvement',
  'not-assessed': 'Not yet assessed',
};

function CompletionReview() {
  const s = useSim();
  const proc = PROCEDURE_BY_ID[s.procedureId];
  const review = reviewProcedure(s, s.procedureId);
  const atEnd = s.step === proc.steps.length - 1;
  return (
    <section className={`card review${atEnd ? ' review--final' : ''}`} aria-label="Completion review" data-testid="procedure-review">
      <div className="eyebrow">{atEnd ? 'Completion summary' : 'Review so far'}</div>
      <p style={{ marginTop: 0 }}>
        Checkpoints answered: {review.answered} of {review.checkpoints}.{' '}
        {review.answered < review.checkpoints && 'Answer every checkpoint for a complete review.'}
      </p>
      <table className="compare review__table">
        <tbody>
          {review.rows.map((r) => (
            <tr key={r.criterion}>
              <th scope="row">{r.label}</th>
              <td>
                <span className={`review__status review__status--${r.status}`}>{STATUS_TEXT[r.status]}</span>
                {r.notes.length > 0 && (
                  <ul>
                    {r.notes.map((n) => (
                      <li key={n}>{n}</li>
                    ))}
                  </ul>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {review.strengths.length > 0 && (
        <p>
          <strong>Done well:</strong> {review.strengths.join(', ')}.
        </p>
      )}
      {review.improvements.length > 0 && (
        <p>
          <strong>To improve:</strong> {review.improvements.join(', ')}.
        </p>
      )}
      <p className="callout">
        This review is formative feedback on simulated decisions. It is <strong>not</strong> a competency assessment: the simulator has no tactile
        feedback, tissue hardness or cutting physics, so it cannot judge manual skill.
      </p>
      <button type="button" className="btn btn--ghost" onClick={s.restartProcedure}>
        Restart this procedure
      </button>
    </section>
  );
}

export function PreparationInfo() {
  const s = useSim();
  const proc = PROCEDURE_BY_ID[s.procedureId];
  const step = proc.steps[s.step];
  const inst = chosenInstrument(s, s.procedureId, step);
  const fb = instrumentFeedback(s, s.procedureId, step);
  const removalIndex = proc.steps.findIndex((st) => st.id === 'removal');
  const removalCp = CHECKPOINTS[s.procedureId].find((c) => c.stepId === 'removal');
  const removalAnswer = s.checkpointAnswers[checkpointKey(s.procedureId, 'removal')];
  const nonSelectiveChosen = s.step >= removalIndex && removalAnswer !== undefined && removalCp?.options[removalAnswer]?.cavityShape === 'nonSelective';
  return (
    <div>
      <div className="eyebrow">Cavity preparation · educational simulation</div>
      <h2>{proc.name}</h2>
      <p>{proc.summary}</p>
      <details className="objectives" open={s.step === 0}>
        <summary>Learning objectives and prerequisites</summary>
        <h3>Learning objectives</h3>
        <BulletList items={proc.learningObjectives} />
        <h3>Prerequisites</h3>
        <BulletList items={proc.prerequisites} />
      </details>
      {s.selectedStructure && <SelectedStructureCard id={s.selectedStructure} />}
      <div className="card">
        <div className="eyebrow">
          Step {s.step + 1} of {proc.steps.length}
        </div>
        <strong>{step.title}</strong>
        <h3>What is happening?</h3>
        <p>{step.description}</p>
        <h3>Why does it matter?</h3>
        <p>{step.rationale}</p>
        {nonSelectiveChosen && (
          <p className="callout callout--bad">
            You chose non-selective removal at the checkpoint, so the 3D view shows the cavity taken to hard dentin everywhere — compare its
            distance from the pulp with the selective endpoint described above.
          </p>
        )}
        {inst && (
          <>
            <h3>Instrument</h3>
            <p>
              <strong>{INSTRUMENTS[inst].name}</strong> — {INSTRUMENTS[inst].description}
            </p>
            {fb && <p className={`callout ${fb.suitable ? 'callout--ok' : 'callout--bad'}`}>{fb.note}</p>}
          </>
        )}
      </div>
      <CheckpointCard />
      <Section title="Step-by-step">
        <ol className="steps-list">
          {proc.steps.map((st, i) => (
            <li key={st.id} aria-current={i === s.step ? 'step' : undefined} onClick={() => s.setStep(i)}>
              {st.title}
              {CHECKPOINTS[s.procedureId].some((c) => c.stepId === st.id) && <span className="steps-list__tag"> · checkpoint</span>}
            </li>
          ))}
        </ol>
      </Section>
      <CompletionReview />
      <Section title="Safety and clinical limitations">
        <BulletList items={proc.safetyLimitations} />
      </Section>
      <p className="callout">
        Educational simulation — not a validated clinical skills trainer. Tissue removal is shown with simplified constructive solid geometry; there is no
        tactile feedback, tissue hardness or cutting physics.
      </p>
      <References ids={proc.refs} verification={proc.verification} />
      <References ids={['schwendicke2016', 'innes2016', 'banerjee2015']} verification={CHECKPOINT_STATUS} />
    </div>
  );
}

export function MaterialsInfo() {
  const s = useSim();
  if (s.materialsTab === 'compare') return <MaterialCompare />;
  const m = MATERIAL_BY_ID[s.materialId];
  const support = materialSupport(s.materialId, s.materialPreparation);
  const steps = materialSteps(s, s.materialId, s.materialPreparation);
  const step = steps[s.step];
  return (
    <div>
      <div className="eyebrow">Restorative materials laboratory</div>
      <h2>{m.name}</h2>
      {!support.supported ? (
        <p className="callout callout--bad" role="alert">
          <strong>Combination not supported.</strong> {support.note}
        </p>
      ) : (
        <p className="callout callout--ok">{support.note}</p>
      )}
      {s.selectedStructure && <SelectedStructureCard id={s.selectedStructure} />}
      {step && (
        <div className="card">
          <div className="eyebrow">
            Step {s.step + 1} of {steps.length}
          </div>
          <strong>{step.title}</strong>
          <h3>What is happening?</h3>
          <p>{step.description}</p>
          <h3>Why does it matter?</h3>
          <p>{step.rationale}</p>
        </div>
      )}
      {s.materialId === 'composite' && (
        <Section title={`Adhesive protocol: ${PROTOCOL_BY_ID[s.adhesiveProtocol].name}`}>
          <p>{PROTOCOL_BY_ID[s.adhesiveProtocol].description}</p>
          <p style={{ fontSize: 13 }}>
            Protocols vary with the adhesive system — always follow the manufacturer’s instructions. Available here:{' '}
            {ADHESIVE_PROTOCOLS.map((p) => p.name).join(', ')}.
          </p>
        </Section>
      )}
      {steps.length > 0 && (
        <Section title="Step-by-step">
          <ol className="steps-list">
            {steps.map((st, i) => (
              <li key={st.id} aria-current={i === s.step ? 'step' : undefined} onClick={() => s.setStep(i)}>
                {st.title}
              </li>
            ))}
          </ol>
        </Section>
      )}
      <Section title="Composition">
        <BulletList items={m.composition} />
      </Section>
      <Section title="Indications">
        <BulletList items={m.indications} />
      </Section>
      <Section title="Advantages">
        <BulletList items={m.advantages} />
      </Section>
      <Section title="Limitations">
        <BulletList items={m.limitations} />
      </Section>
      <Section title="Adhesion / retention">
        <p>{m.adhesion}</p>
      </Section>
      <Section title="Moisture control">
        <p>{m.moisture}</p>
      </Section>
      <Section title="Placement technique">
        <p>{m.placement}</p>
      </Section>
      <Section title="Setting / polymerisation">
        <p>{m.setting}</p>
      </Section>
      <Section title="Clinical considerations">
        <BulletList items={m.clinicalConsiderations} />
      </Section>
      <p className="callout">Material behaviour in the 3D view is a simplified, clinically representative illustration — not a physical simulation.</p>
      <References ids={m.refs} verification={m.verification} />
    </div>
  );
}

function MaterialCompare() {
  const s = useSim();
  const a = MATERIAL_BY_ID[s.compareA];
  const b = MATERIAL_BY_ID[s.compareB];
  const keys = Object.keys(COMPARISON_LABELS) as ComparisonKey[];
  return (
    <div>
      <div className="eyebrow">Material comparison</div>
      <h2>
        {a.shortName} vs {b.shortName}
      </h2>
      {s.compareA === s.compareB && <p className="callout callout--info">Both slots show the same material — choose a different Material B to compare.</p>}
      <table className="compare" aria-label="Material comparison">
        <thead>
          <tr>
            <th />
            <th scope="col">{a.shortName}</th>
            <th scope="col">{b.shortName}</th>
          </tr>
        </thead>
        <tbody>
          {keys.map((k) => (
            <tr key={k}>
              <th scope="row">{COMPARISON_LABELS[k]}</th>
              <td>{a.comparison[k]}</td>
              <td>{b.comparison[k]}</td>
            </tr>
          ))}
          <tr>
            <th scope="row">Adhesion / retention</th>
            <td>{a.adhesion}</td>
            <td>{b.adhesion}</td>
          </tr>
          <tr>
            <th scope="row">Setting</th>
            <td>{a.setting}</td>
            <td>{b.setting}</td>
          </tr>
        </tbody>
      </table>
      <p style={{ fontSize: 13, marginTop: 10 }}>
        The 3D view shows each material’s final restoration in its own supported preparation. Values are qualitative educational summaries, not product
        data.
      </p>
      <References ids={[...a.refs, ...b.refs]} verification="expert-reviewed" />
    </div>
  );
}
