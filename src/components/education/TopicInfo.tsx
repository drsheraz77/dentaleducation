import { useSim } from '../../state/store';
import { ANATOMY, ANATOMY_TOUR } from '../../data/anatomy';
import { CARIES_STAGES, CLASSIFICATION_EXAMPLES, ICDAS_CODES } from '../../data/cariesStages';
import { BulletList, References, Section, SelectedStructureCard } from './common';
import { currentStimulus } from '../../state/selectors';
import { HYDRODYNAMIC_SUMMARY, TUBULES_REFS, TUBULES_VERIFICATION, tubuleResponse } from '../../data/dentinTubules';

function TubulesInfo() {
  const s = useSim();
  const stimulus = currentStimulus(s);
  const response = tubuleResponse(stimulus, s.dentinExposed, s.tubulesOccluded);
  return (
    <div>
      <div className="eyebrow">Dental anatomy · magnified dentin</div>
      <h2>Dentinal tubules and sensitivity</h2>
      {s.selectedStructure && <SelectedStructureCard id={s.selectedStructure} />}
      <div className="card" aria-live="polite">
        <div className="eyebrow">{stimulus.name}</div>
        <strong>{response.headline}</strong>
        <p style={{ margin: '6px 0 0' }}>{response.detail}</p>
      </div>
      <Section title="What is happening?">
        <p>
          Dentin is crossed by fluid-filled tubules running from the pulp outwards. Odontoblast processes and nerve fibres occupy their inner part.
          When dentin is exposed and the tubules are open, stimuli move the tubular fluid.
        </p>
      </Section>
      <Section title="Why does it matter? (hydrodynamic theory)">
        <BulletList items={HYDRODYNAMIC_SUMMARY} />
      </Section>
      <Section title="Try it">
        <BulletList
          items={[
            'Pick a stimulus, or press Play to step through them.',
            'Turn off gingival recession: covered tubules do not respond.',
            'Turn on "Tubules occluded" to see how occluding desensitisers reduce fluid movement.',
          ]}
        />
      </Section>
      <p className="callout">Schematic and not to scale: real tubules are about 1–3 µm wide and number tens of thousands per mm².</p>
      <References ids={TUBULES_REFS} verification={TUBULES_VERIFICATION} />
    </div>
  );
}

export function AnatomyInfo() {
  const view = useSim((s) => s.anatomyView);
  if (view === 'tubules') return <TubulesInfo />;
  return <AnatomySectionInfo />;
}

function AnatomySectionInfo() {
  const selected = useSim((s) => s.selectedStructure);
  const select = useSim((s) => s.selectStructure);
  const pathology = useSim((s) => s.pathology);
  if (!selected) {
    return (
      <div>
        <div className="eyebrow">Dental anatomy</div>
        <h2>Explore the tooth</h2>
        <p>
          Click a structure on the 3D tooth, a label, or a button below. Drag to rotate, scroll or pinch to zoom, right-drag (or two-finger drag) to
          pan. Turn on <strong>Cross-section</strong> to see enamel, dentin and pulp.
        </p>
        <div className="structure-list">
          {ANATOMY_TOUR.map((id) => (
            <button key={id} type="button" className="chip" onClick={() => select(id)}>
              {ANATOMY[id].name}
            </button>
          ))}
        </div>
        {pathology && <p className="callout callout--info">Pathological view: a dentin caries lesion is shown. Use the cross-section to see it.</p>}
        <p className="callout callout--info">
          The model is a simplified mandibular first molar (four cusps, one canal per root). It is scientifically representative, not an
          anatomically validated scan.
        </p>
        <References ids={['nelson2020', 'nanci2018']} />
      </div>
    );
  }
  const e = ANATOMY[selected];
  return (
    <div>
      <div className="eyebrow">Selected structure</div>
      <h2>{e.name}</h2>
      <Section title="Main function">
        <p>{e.function}</p>
      </Section>
      <Section title="Tissue characteristics">
        <BulletList items={e.characteristics} />
      </Section>
      <Section title="Importance in caries progression">
        <p>{e.cariesRelevance}</p>
      </Section>
      <Section title="Clinical relevance">
        <p>{e.clinicalRelevance}</p>
      </Section>
      <References ids={e.refs} verification={e.verification} />
    </div>
  );
}

export function CariesInfo() {
  const step = useSim((s) => s.step);
  const selected = useSim((s) => s.selectedStructure);
  const stage = CARIES_STAGES[step];
  return (
    <div>
      <div className="eyebrow">
        Dental caries · stage {stage.index + 1} of {CARIES_STAGES.length}
      </div>
      <h2>{stage.title}</h2>
      {selected && <SelectedStructureCard id={selected} />}
      <Section title="What is happening?">
        <p>{stage.whatIsHappening}</p>
      </Section>
      <Section title="Why does it matter?">
        <p>{stage.whyItMatters}</p>
      </Section>
      <Section title="Clinical relevance">
        <p>{stage.clinicalRelevance}</p>
      </Section>
      <Section title="Key points">
        <BulletList items={stage.keyPoints} />
      </Section>
      <p className="callout">
        Stages are conceptual snapshots of a continuous, dynamic process. Lesions can arrest or regress at any point; the order and the animation speed
        are <strong>not</strong> a time-calibrated biological model.
      </p>
      <References ids={stage.refs} verification={stage.verification} />
    </div>
  );
}

export function ClassificationInfo() {
  const step = useSim((s) => s.step);
  const selected = useSim((s) => s.selectedStructure);
  const ex = CLASSIFICATION_EXAMPLES[step];
  return (
    <div>
      <div className="eyebrow">Lesion classification · ICDAS learning mode</div>
      <h2>{ex.title}</h2>
      <p>
        <strong>{ex.icdas}</strong>
      </p>
      {selected && <SelectedStructureCard id={selected} />}
      <Section title="What is shown">
        <p>{ex.description}</p>
      </Section>
      <Section title="Visual signs to look for">
        <BulletList items={ex.visualSigns} />
      </Section>
      <Section title="Management considerations">
        <p>{ex.managementNote}</p>
      </Section>
      <Section title="ICDAS coronal codes (summary)">
        <table className="compare">
          <tbody>
            {ICDAS_CODES.map((c) => (
              <tr key={c.code} style={ex.icdasCode.includes(c.code) ? { background: 'var(--accent-soft)' } : undefined}>
                <th scope="row">
                  {c.code} · {c.label}
                </th>
                <td>{c.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p style={{ fontSize: 13, marginTop: 8 }}>
          ICDAS is applied to clean teeth, examined wet and after air drying. Root surfaces use separate criteria. Activity is assessed separately (for
          example with Nyvad criteria).
        </p>
      </Section>
      <p className="callout">
        These 3D models are simplified teaching illustrations. They are <strong>not</strong> a validated ICDAS diagnostic tool and must not be used to
        score real lesions.
      </p>
      <References ids={ex.refs} verification={ex.verification} />
    </div>
  );
}
