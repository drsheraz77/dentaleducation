import { useId, type ReactNode } from 'react';
import { useSim } from '../../state/store';
import { CATEGORY_LABEL, CATEGORY_ORDER, DIAGNOSIS_OPTIONS, evaluateDiagnosis } from '../../modules/diagnosis/decisionEngine';
import { ACTIVITY_PRINCIPLES, GLOSSARY, PATHWAY_STATUS, PATHWAY_STEPS } from '../../data/cariesPathway';
import type { DiagnosisInput, PathwayFit } from '../../types';
import { References } from './common';
import { IcdasFigure } from './IcdasFigure';
import { Term } from './Term';

const FIT_LABEL: Record<PathwayFit, string> = {
  consider: 'Consider',
  'may-consider': 'May consider',
  'generally-not-indicated': 'Generally not indicated',
  refer: 'Assess / refer',
};

function Field<K extends keyof DiagnosisInput>({ k, term, disabled }: { k: K; term?: keyof typeof GLOSSARY; disabled?: boolean }) {
  const value = useSim((s) => s.diagnosis[k]);
  const set = useSim((s) => s.setDiagnosis);
  const labelId = useId();
  // The tooltip button sits beside the label text, not inside it, so the select keeps a clean name.
  return (
    <div className="field">
      <span className="field__label">
        <span id={labelId}>{DIAGNOSIS_OPTIONS[k].label}</span>
        {term && <Term id={term} icon />}
      </span>
      <select aria-labelledby={labelId} value={value} disabled={disabled} onChange={(e) => set(k, e.target.value as DiagnosisInput[K])}>
        {DIAGNOSIS_OPTIONS[k].options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function Step({ n, children }: { n: number; children: ReactNode }) {
  const step = PATHWAY_STEPS[n - 1];
  return (
    <section className="pathway-step" aria-labelledby={`pathway-step-${n}`}>
      <h3 id={`pathway-step-${n}`}>
        <span className="pathway-step__n" aria-hidden>
          {n}
        </span>
        {step.title}
      </h3>
      <p className="pathway-step__q">{step.question}</p>
      {children}
    </section>
  );
}

export function DiagnosisPanel() {
  const input = useSim((s) => s.diagnosis);
  const result = evaluateDiagnosis(input);
  const sound = input.icdas === '0';
  const cavitated = input.cavitation === 'cavitated';
  const cavitationText =
    input.cavitation === 'cavitated' ? 'Cavitated into dentin' : input.cavitation === 'microcavity' ? 'Localised enamel breakdown (micro-cavity)' : 'Non-cavitated';
  return (
    <div>
      <div className="eyebrow">Diagnosis &amp; treatment planning</div>
      <h2>Caries decision pathway</h2>
      <p className="callout">
        Educational scenario builder — <strong>not</strong> a diagnosis or a treatment recommendation. Real decisions need a clinical examination,
        radiographs, the patient’s preferences and supervised professional judgement.
      </p>
      <ol className="pathway-overview" aria-label="Pathway steps">
        {PATHWAY_STEPS.map((s, i) => (
          <li key={s.id}>
            <a href={`#pathway-step-${i + 1}`}>{s.title}</a>
          </li>
        ))}
      </ol>

      <Step n={1}>
        <div className="form-grid">
          <Field k="dentition" />
          <Field k="surface" />
        </div>
      </Step>

      <Step n={2}>
        <div className="form-grid">
          <Field k="icdas" term="icdas" />
          <Field k="depth" />
        </div>
        <IcdasFigure code={input.icdas} />
      </Step>

      <Step n={3}>
        <div className="form-grid">
          <Field k="activity" term="activity" disabled={sound} />
        </div>
        <p className="pathway-step__note">{ACTIVITY_PRINCIPLES[0]} See Lesion classification for the full criteria.</p>
      </Step>

      <Step n={4}>
        <div className="form-grid">
          <Field k="risk" term="risk" />
        </div>
      </Step>

      <Step n={5}>
        <p>
          <Term id="cavitation">Cavitation</Term> (from the ICDAS code): <strong data-testid="derived-cavitation">{sound ? 'No lesion' : cavitationText}</strong>
        </p>
        <div className="form-grid">
          <Field k="cleansability" term="cleansable" disabled={!cavitated} />
        </div>
        {!cavitated && <p className="pathway-step__note">Cleansability applies once there is a cavity into dentin (ICDAS 5–6).</p>}
      </Step>

      <Step n={6}>
        <div className="form-grid">
          <Field k="symptoms" />
          <Field k="pulp" />
          <Field k="restorability" />
        </div>
      </Step>

      <Step n={7}>
        <p aria-live="polite">
          <strong>Summary:</strong> {result.summary}
        </p>
        {result.alerts.map((a) => (
          <p key={a} className="callout">
            {a}
          </p>
        ))}
        <div aria-live="polite">
          {CATEGORY_ORDER.filter((c) => result.pathways.some((p) => p.category === c)).map((c) => (
            <div key={c} className="pathway-group">
              <h4 className="pathway-group__title">{CATEGORY_LABEL[c]}</h4>
              {result.pathways
                .filter((p) => p.category === c)
                .map((p) => (
                  <div key={p.id} className={`pathway pathway--${p.fit}`} data-testid={`pathway-${p.id}`}>
                    <div className="pathway__fit">{FIT_LABEL[p.fit]}</div>
                    <h4>{p.title}</h4>
                    <ul>
                      {p.reasoning.map((r) => (
                        <li key={r}>{r}</li>
                      ))}
                    </ul>
                  </div>
                ))}
            </div>
          ))}
        </div>
        <p style={{ fontSize: 13 }}>No single option is universally correct; several pathways are often reasonable and are chosen with the patient.</p>
      </Step>

      <Step n={8}>
        <ul data-testid="follow-up">
          {result.followUp.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      </Step>
      <References ids={[...new Set(result.pathways.flatMap((p) => p.refs))]} verification={PATHWAY_STATUS} />
    </div>
  );
}
