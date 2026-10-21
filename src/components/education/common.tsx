import type { ReactNode } from 'react';
import { referencesFor } from '../../data/references';
import { CONTENT_REVIEW } from '../../data/review';
import { ANATOMY } from '../../data/anatomy';
import type { StructureId, VerificationStatus } from '../../types';
import { useSim } from '../../state/store';

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3>{title}</h3>
      {children}
    </section>
  );
}

export function BulletList({ items }: { items: string[] }) {
  return (
    <ul>
      {items.map((i) => (
        <li key={i}>{i}</li>
      ))}
    </ul>
  );
}

export function References({ ids, verification = 'expert-reviewed' }: { ids: string[]; verification?: VerificationStatus }) {
  const refs = referencesFor(ids);
  return (
    <Section title="References and educational notes">
      {verification === 'draft_pending_review' ? (
        <p>
          <span className="verify">Draft · requires expert verification</span>
        </p>
      ) : (
        <p>
          <span className="verify verify--ok">
            Expert-reviewed · {CONTENT_REVIEW.reviewer} · {CONTENT_REVIEW.date}
          </span>
        </p>
      )}
      <ol className="refs">
        {refs.map((r) => (
          <li key={r.id}>{r.citation}</li>
        ))}
      </ol>
    </Section>
  );
}

/** Compact card describing the structure the learner clicked in the 3D view. */
export function SelectedStructureCard({ id }: { id: StructureId }) {
  const entry = ANATOMY[id];
  const clear = useSim((s) => s.selectStructure);
  return (
    <div className="card" aria-live="polite">
      <div className="eyebrow">Selected structure</div>
      <strong>{entry.name}</strong>
      <p style={{ margin: '4px 0' }}>{entry.function}</p>
      <p style={{ margin: '4px 0', fontSize: 13 }}>
        <em>In caries:</em> {entry.cariesRelevance}
      </p>
      <button type="button" className="btn btn--ghost" style={{ padding: '2px 0', border: 0 }} onClick={() => clear(null)}>
        Clear selection
      </button>
    </div>
  );
}
