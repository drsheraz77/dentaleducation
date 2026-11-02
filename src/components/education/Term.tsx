import { useId, useState, type ReactNode } from 'react';
import { GLOSSARY } from '../../data/cariesPathway';

/**
 * A glossary term with an accessible tooltip: shown on hover and keyboard focus,
 * announced through aria-describedby, and toggled by tap on touch screens.
 * With `icon`, the trigger is a small info button (for use beside a form label).
 */
export function Term({ id, children, icon = false }: { id: keyof typeof GLOSSARY; children?: ReactNode; icon?: boolean }) {
  const entry = GLOSSARY[id];
  const tipId = useId();
  const [open, setOpen] = useState(false);
  return (
    <span className="term">
      <button
        type="button"
        className={icon ? 'term__trigger term__trigger--icon' : 'term__trigger'}
        aria-label={icon ? `About: ${entry.term}` : undefined}
        aria-describedby={tipId}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
      >
        {icon ? 'i' : (children ?? entry.term)}
      </button>
      <span role="tooltip" id={tipId} className={open ? 'term__tip term__tip--open' : 'term__tip'}>
        <strong>{entry.term}.</strong> {entry.definition}
      </span>
    </span>
  );
}
