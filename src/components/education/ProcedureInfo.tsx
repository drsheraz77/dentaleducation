import { useSim } from '../../state/store';
import { PROCEDURE_BY_ID } from '../../data/procedures';
import { INSTRUMENTS } from '../../data/instruments';
import { ADHESIVE_PROTOCOLS, COMPARISON_LABELS, MATERIAL_BY_ID, PROTOCOL_BY_ID } from '../../data/materials';
import { chosenInstrument, instrumentFeedback, materialSteps, materialSupport } from '../../state/selectors';
import type { ComparisonKey } from '../../types';
import { BulletList, References, Section, SelectedStructureCard } from './common';

export function PreparationInfo() {
  const s = useSim();
  const proc = PROCEDURE_BY_ID[s.procedureId];
  const step = proc.steps[s.step];
  const inst = chosenInstrument(s, s.procedureId, step);
  const fb = instrumentFeedback(s, s.procedureId, step);
  return (
    <div>
      <div className="eyebrow">Cavity preparation · educational simulation</div>
      <h2>{proc.name}</h2>
      <p>{proc.summary}</p>
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
      <Section title="Step-by-step">
        <ol className="steps-list">
          {proc.steps.map((st, i) => (
            <li key={st.id} aria-current={i === s.step ? 'step' : undefined} onClick={() => s.setStep(i)}>
              {st.title}
            </li>
          ))}
        </ol>
      </Section>
      <Section title="Learning objectives">
        <BulletList items={proc.learningObjectives} />
      </Section>
      <Section title="Prerequisites">
        <BulletList items={proc.prerequisites} />
      </Section>
      <Section title="Safety and clinical limitations">
        <BulletList items={proc.safetyLimitations} />
      </Section>
      <p className="callout">
        Educational simulation — not a validated clinical procedural trainer. Tissue removal is shown with simplified constructive solid geometry, not a
        physical cutting model.
      </p>
      <References ids={proc.refs} verification={proc.verification} />
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
      <References ids={[...a.refs, ...b.refs]} verification="draft-needs-expert-review" />
    </div>
  );
}
