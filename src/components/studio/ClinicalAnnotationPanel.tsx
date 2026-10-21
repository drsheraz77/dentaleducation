import { useSim } from '../../state/store';
import { ANATOMY } from '../../data/anatomy';
import { LOWER_MOLAR_47 } from '../../data/studio/assets';
import { CLINICAL_CONCEPTS, LESSON_STAGES } from '../../data/studio/cariesLesson';
import { BulletList, References, Section } from '../education/common';
import { StudioKnowledgeCheck } from './StudioKnowledgeCheck';

const TIER_LABEL = { measured: 'Measured from CBCT', derived: 'Derived', schematic: 'Schematic' } as const;

/** Right-hand panel of the Caries Learning Studio: stage explanation, selection detail, provenance. */
export function ClinicalAnnotationPanel() {
  const step = useSim((s) => s.step);
  const selected = useSim((s) => s.selectedStructure);
  const clear = useSim((s) => s.selectStructure);
  const stage = LESSON_STAGES[Math.min(step, LESSON_STAGES.length - 1)];
  const asset = LOWER_MOLAR_47;
  const layer = asset.layers.find((l) => l.structureId === selected);
  const entry = selected ? ANATOMY[selected] : null;

  return (
    <div>
      <div className="eyebrow">
        Caries Learning Studio · stage {step + 1} of {LESSON_STAGES.length}
      </div>
      <h2>{stage.title}</h2>
      <p>
        <strong>Objective:</strong> {stage.objective}
      </p>

      {entry && (
        <div className="card" aria-live="polite">
          <div className="eyebrow">Selected structure</div>
          <strong>{selected === 'dentin' ? 'Dentin and root' : entry.name}</strong>
          <p style={{ margin: '4px 0' }}>{entry.function}</p>
          {selected === 'lesion' ? (
            <p className="callout" style={{ margin: '6px 0' }}>
              Educational schematic placed on the scanned tooth — not measured from a carious tooth.
            </p>
          ) : (
            layer && (
              <p style={{ fontSize: 13, margin: '4px 0' }}>
                <strong>{TIER_LABEL[layer.tier]}:</strong> {layer.tierNote}
              </p>
            )
          )}
          <button type="button" className="btn btn--ghost" style={{ padding: '2px 0', border: 0 }} onClick={() => clear(null)}>
            Clear selection
          </button>
        </div>
      )}

      {stage.kind === 'check' ? (
        <StudioKnowledgeCheck />
      ) : (
        <>
          <Section title="What you see">
            <BulletList items={stage.whatYouSee} />
          </Section>
          <Section title="Explanation">
            <p>{stage.explanation}</p>
          </Section>
        </>
      )}

      <Section title="What is from the scan, and what is illustrative">
        <table className="compare">
          <tbody>
            <tr>
              <th scope="row">From the CBCT-derived model</th>
              <td>
                <BulletList items={stage.modelBased} />
              </td>
            </tr>
            <tr>
              <th scope="row">Educational overlay (schematic)</th>
              <td>{stage.illustrative.length ? <BulletList items={stage.illustrative} /> : 'None at this stage.'}</td>
            </tr>
          </tbody>
        </table>
      </Section>

      {stage.concepts.length > 0 && (
        <Section title="Clinical reasoning steps involved">
          <ul>
            {CLINICAL_CONCEPTS.filter((c) => stage.concepts.includes(c.id)).map((c) => (
              <li key={c.id}>
                <strong>{c.term}:</strong> {c.meaning}
              </li>
            ))}
          </ul>
        </Section>
      )}

      <p className="callout">
        The stages are conceptual snapshots, not a time-calibrated model of caries progression, and this studio is not a diagnostic or competence
        assessment tool.
      </p>

      <Section title="3D model source">
        <p style={{ fontSize: 13 }}>
          {asset.title} ({asset.tooth}). {asset.source.attribution}{' '}
          <a href={asset.source.url} target="_blank" rel="noreferrer">
            Source
          </a>{' '}
          ·{' '}
          <a href={asset.source.licenceUrl} target="_blank" rel="noreferrer">
            Licence
          </a>
          . Non-commercial use only.
        </p>
      </Section>
      <References ids={stage.refs} verification={stage.verification} />
    </div>
  );
}
