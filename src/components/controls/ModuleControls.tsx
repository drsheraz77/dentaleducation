import { useSim } from '../../state/store';
import { ANATOMY, ANATOMY_TOUR } from '../../data/anatomy';
import { CARIES_STAGES, CLASSIFICATION_EXAMPLES } from '../../data/cariesStages';
import { PROCEDURES, PROCEDURE_BY_ID } from '../../data/procedures';
import { INSTRUMENTS } from '../../data/instruments';
import { ADHESIVE_PROTOCOLS, MATERIALS, MATERIAL_BY_ID } from '../../data/materials';
import { CASES } from '../../data/cases';
import { chosenInstrument, instrumentKey } from '../../state/selectors';
import type { AdhesiveProtocolId, MaterialId, ProcedureId } from '../../types';

/** Topic-specific selectors shown above the 3D workspace. Every control changes the simulation state. */
export function ModuleControls() {
  const s = useSim();

  switch (s.topic) {
    case 'anatomy':
      return (
        <div className="module-controls" aria-label="Anatomy controls">
          <span className="control">Select structure</span>
          <div className="chips">
            {ANATOMY_TOUR.map((id) => (
              <button key={id} type="button" className="chip" aria-pressed={s.selectedStructure === id} onClick={() => s.selectStructure(id)}>
                {ANATOMY[id].name.replace(' (coronal pulp chamber)', '').replace(' (radicular pulp)', '')}
              </button>
            ))}
          </div>
        </div>
      );
    case 'caries':
      return (
        <div className="module-controls" aria-label="Caries stage selector">
          <span className="control">Stage</span>
          <div className="chips" role="group" aria-label="Caries stages">
            {CARIES_STAGES.map((c) => (
              <button key={c.id} type="button" className="chip" aria-pressed={s.step === c.index} onClick={() => s.setStep(c.index)}>
                {c.index + 1}. {c.shortTitle}
              </button>
            ))}
          </div>
        </div>
      );
    case 'classification':
      return (
        <div className="module-controls" aria-label="Lesion classification examples">
          <span className="control">Example</span>
          <div className="chips">
            {CLASSIFICATION_EXAMPLES.map((c, i) => (
              <button key={c.id} type="button" className="chip" aria-pressed={s.step === i} onClick={() => s.setStep(i)}>
                {c.title}
              </button>
            ))}
          </div>
        </div>
      );
    case 'diagnosis':
      return (
        <div className="module-controls">
          <span className="control">Set the lesion and patient variables in the right-hand panel — the 3D lesion and the pathways update together.</span>
        </div>
      );
    case 'preparation': {
      const proc = PROCEDURE_BY_ID[s.procedureId];
      const step = proc.steps[s.step];
      const chosen = step ? chosenInstrument(s, s.procedureId, step) : null;
      return (
        <div className="module-controls" aria-label="Cavity preparation controls">
          <label className="control">
            Procedure
            <select value={s.procedureId} onChange={(e) => s.setProcedure(e.target.value as ProcedureId)}>
              {PROCEDURES.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          {step?.instrumentOptions?.length ? (
            <div className="control" role="group" aria-label="Instrument">
              Instrument
              <div className="chips">
                {step.instrumentOptions.map((id) => {
                  const rule = step.instrumentRules?.[id];
                  return (
                    <button
                      key={id}
                      type="button"
                      className={`chip${rule && !rule.suitable ? ' chip--warn' : ''}`}
                      aria-pressed={chosen === id}
                      onClick={() => s.chooseInstrument(instrumentKey(s.procedureId, step.id), id)}
                    >
                      {INSTRUMENTS[id].name}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <span className="control">No instrument choice at this step</span>
          )}
          <button
            type="button"
            className="chip"
            aria-pressed={s.compareBeforeAfter}
            onClick={() => s.setCompareBeforeAfter(!s.compareBeforeAfter)}
          >
            Compare before / after
          </button>
        </div>
      );
    }
    case 'materials': {
      const material = MATERIAL_BY_ID[s.materialId];
      return (
        <div className="module-controls" aria-label="Restorative materials controls">
          <div className="segmented" role="tablist" aria-label="Materials view">
            <button type="button" role="tab" aria-selected={s.materialsTab === 'workflow'} onClick={() => s.setMaterialsTab('workflow')}>
              Workflow
            </button>
            <button type="button" role="tab" aria-selected={s.materialsTab === 'compare'} onClick={() => s.setMaterialsTab('compare')}>
              Compare
            </button>
          </div>
          {s.materialsTab === 'workflow' ? (
            <>
              <label className="control">
                Material
                <select value={s.materialId} onChange={(e) => s.setMaterial(e.target.value as MaterialId)}>
                  {MATERIALS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="control">
                Preparation
                <select value={s.materialPreparation} onChange={(e) => s.setMaterialPreparation(e.target.value as ProcedureId)}>
                  {material.preparations.map((p) => (
                    <option key={p.procedure} value={p.procedure}>
                      {PROCEDURE_BY_ID[p.procedure].name}
                      {p.supported ? '' : ' (not supported)'}
                    </option>
                  ))}
                </select>
              </label>
              {s.materialId === 'composite' && (
                <label className="control">
                  Adhesive protocol
                  <select value={s.adhesiveProtocol} onChange={(e) => s.setAdhesiveProtocol(e.target.value as AdhesiveProtocolId)}>
                    {ADHESIVE_PROTOCOLS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </>
          ) : (
            <>
              <label className="control">
                Material A
                <select value={s.compareA} onChange={(e) => s.setCompare('A', e.target.value as MaterialId)} aria-label="Material A">
                  {MATERIALS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.shortName}
                    </option>
                  ))}
                </select>
              </label>
              <label className="control">
                Material B
                <select value={s.compareB} onChange={(e) => s.setCompare('B', e.target.value as MaterialId)} aria-label="Material B">
                  {MATERIALS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.shortName}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}
        </div>
      );
    }
    case 'cases':
      return (
        <div className="module-controls" aria-label="Clinical case selector">
          <span className="control">Case</span>
          <div className="chips">
            {CASES.map((c, i) => (
              <button key={c.id} type="button" className="chip" aria-pressed={s.caseIndex === i} onClick={() => s.setCase(i)}>
                {i + 1}. {c.title}
              </button>
            ))}
          </div>
        </div>
      );
    default:
      return null;
  }
}
