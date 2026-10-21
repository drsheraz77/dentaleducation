import type { VerificationStatus } from '../types';

/**
 * Record of the scientific content review. All content in src/data was approved
 * section by section in the "DentalVerse 3D — Scientific Content Review" document.
 * Content changed after this date must be re-reviewed: set its `verification`
 * back to 'draft-needs-expert-review' until it is approved again.
 */
export const CONTENT_REVIEW = {
  status: 'expert-reviewed' as VerificationStatus,
  reviewer: 'Sheraz Ahmed',
  date: '2026-10-21',
  record: 'https://claude.ai/code/artifact/331c4126-3852-45b5-b183-9ab6804bde9c',
  /** Content added after the main review and approved later (same reviewer). */
  addenda: [
    {
      date: '2026-10-21',
      items: [
        'Anatomy: Nerve and blood supply (neurovascular)',
        'Anatomy: Dentinal tubules',
        'Dentin tubules view: stimuli, response model and hydrodynamic summary (src/data/dentinTubules.ts)',
      ],
    },
  ],
};
