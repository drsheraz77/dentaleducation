import { useSim } from '../../state/store';
import type { LearningMode } from '../../types';

const MODES: { id: LearningMode; label: string }[] = [
  { id: 'guided', label: 'Guided learning' },
  { id: 'explore', label: 'Free exploration' },
  { id: 'case', label: 'Clinical case' },
];

export function Header() {
  const mode = useSim((s) => s.mode);
  const setMode = useSim((s) => s.setMode);
  return (
    <header className="header">
      <div className="brand">
        <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden>
          <path
            d="M9 3c-3.5 0-6 2.8-6 7 0 3.5 1.4 5.6 2.3 8.6.8 2.9 1 9.4 3.4 9.4 2.3 0 2.2-6.4 4.3-6.4h2c2.1 0 2 6.4 4.3 6.4 2.4 0 2.6-6.5 3.4-9.4.9-3 2.3-5.1 2.3-8.6 0-4.2-2.5-7-6-7-2.6 0-3.5 1.4-5 1.4S11.6 3 9 3z"
            fill="#e8eef6"
            stroke="#2563eb"
            strokeWidth="1.6"
          />
        </svg>
        <div>
          DentalVerse 3D
          <small>Interactive dental education simulator</small>
        </div>
      </div>
      <div className="segmented" role="group" aria-label="Learning mode">
        {MODES.map((m) => (
          <button key={m.id} type="button" aria-pressed={mode === m.id} onClick={() => setMode(m.id)}>
            {m.label}
          </button>
        ))}
      </div>
      <div className="header__spacer" />
      <span className="badge" title="Content is an educational draft and must be verified by qualified dental educators.">
        Educational simulation · not for clinical diagnosis
      </span>
    </header>
  );
}
