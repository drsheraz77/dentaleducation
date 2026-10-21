import { TOPICS } from '../../data/topics';
import { useSim } from '../../state/store';

export function NavPanel() {
  const topic = useSim((s) => s.topic);
  const setTopic = useSim((s) => s.setTopic);
  return (
    <nav className="nav" aria-label="Learning modules">
      <h2>Modules</h2>
      <ul>
        {TOPICS.map((t, i) => (
          <li key={t.id}>
            <button type="button" aria-current={topic === t.id ? 'page' : undefined} onClick={() => setTopic(t.id)}>
              <span className="nav__num" aria-hidden>
                {i + 1}
              </span>
              {t.label}
            </button>
          </li>
        ))}
      </ul>
      <p className="nav__note">
        {topic === 'studio'
          ? 'Model: CBCT-derived mandibular second molar (3Dentes, CC BY-NC 4.0). Lesions are schematic overlays; content is pending expert review.'
          : 'Model: simplified mandibular first molar. Shapes are scientifically representative, not anatomically validated.'}
      </p>
    </nav>
  );
}
