import { useSim } from '../../state/store';
import { DIAGNOSIS_OPTIONS, evaluateDiagnosis } from '../../modules/diagnosis/decisionEngine';
import type { DiagnosisInput, PathwayFit } from '../../types';
import { References } from './common';

const FIT_LABEL: Record<PathwayFit, string> = {
  consider: 'Consider',
  'may-consider': 'May consider',
  'generally-not-indicated': 'Generally not indicated',
  refer: 'Assess / refer',
};

export function DiagnosisPanel() {
  const input = useSim((s) => s.diagnosis);
  const set = useSim((s) => s.setDiagnosis);
  const result = evaluateDiagnosis(input);
  const keys = Object.keys(DIAGNOSIS_OPTIONS) as (keyof DiagnosisInput)[];
  return (
    <div>
      <div className="eyebrow">Diagnosis &amp; treatment planning</div>
      <h2>Guided decision pathway</h2>
      <p className="callout">
        Educational reasoning aid only — <strong>not</strong> an autonomous diagnostic or treatment-recommendation system. Real decisions require a
        clinical examination, radiographs, patient preferences and professional judgement.
      </p>
      <div className="form-grid">
        {keys.map((k) => (
          <label key={k}>
            {DIAGNOSIS_OPTIONS[k].label}
            <select value={input[k]} onChange={(e) => set(k, e.target.value as DiagnosisInput[typeof k])}>
              {DIAGNOSIS_OPTIONS[k].options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      <h3>Summary</h3>
      <p aria-live="polite">{result.summary}</p>
      {result.alerts.map((a) => (
        <p key={a} className="callout">
          {a}
        </p>
      ))}
      <h3>Management options to discuss</h3>
      <div aria-live="polite">
        {result.pathways.map((p) => (
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
      <p style={{ fontSize: 13 }}>No single option is universally correct; several pathways are often reasonable.</p>
      <References ids={[...new Set(result.pathways.flatMap((p) => p.refs))]} />
    </div>
  );
}
