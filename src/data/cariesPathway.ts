import type { VerificationStatus } from '../types';

/**
 * Caries decision pathway content added on 2026-11-02 (activity assessment, primary vs
 * permanent dentition, glossary). New content: awaiting qualified review.
 */

export const PATHWAY_STATUS: VerificationStatus = 'draft_pending_review';

export const PATHWAY_STEPS: { id: string; title: string; question: string }[] = [
  { id: 'detect', title: 'Lesion detection', question: 'Is there a lesion? Clean, dry and inspect under good light; use radiographs where indicated.' },
  { id: 'severity', title: 'Severity classification', question: 'How severe is it? ICDAS code (visual) and radiographic depth.' },
  { id: 'activity', title: 'Lesion activity', question: 'Is it progressing or arrested? Surface texture, lustre, plaque stagnation, location.' },
  { id: 'risk', title: 'Patient caries risk', question: 'How likely are new lesions or progression for this patient?' },
  { id: 'cavitation', title: 'Cavitation and cleansability', question: 'Is there a cavity, and can the patient keep it clean?' },
  { id: 'pulp', title: 'Pulp assessment, where indicated', question: 'For deep lesions or symptoms: history, sensibility tests, radiograph.' },
  { id: 'management', title: 'Management decision', question: 'From prevention to pulp-related care, chosen with the patient.' },
  { id: 'follow-up', title: 'Follow-up', question: 'What to review, and when.' },
];

/** Activity assessment (after Nyvad et al. 1999 and ICCMS). Colour alone never decides. */
export const ACTIVITY_FEATURES: { feature: string; active: string; inactive: string }[] = [
  {
    feature: 'Appearance (enamel)',
    active: 'Whitish or yellowish opaque, with loss of lustre (chalky)',
    inactive: 'Whitish, brownish or black, with a shiny surface',
  },
  {
    feature: 'Texture on gentle probing',
    active: 'Rough when a ball-ended probe is moved gently across the enamel; soft or leathery dentin in a cavity',
    inactive: 'Hard and smooth enamel; hard, shiny dentin in a cavity',
  },
  {
    feature: 'Plaque stagnation',
    active: 'In a plaque-stagnation area (fissure, along the gingival margin, below the contact point), often plaque-covered',
    inactive: 'Usually outside stagnation areas or not covered by thick plaque',
  },
  {
    feature: 'Gingiva next to smooth-surface lesions',
    active: 'Often inflamed (bleeding) where plaque has stagnated',
    inactive: 'Healthy',
  },
];

export const ACTIVITY_PRINCIPLES: string[] = [
  'Colour alone does not establish activity: a brown lesion can still be active, and a white lesion can be arrested (a "scar").',
  'Judge the combination of surface texture, lustre, plaque stagnation and location on a clean, dry tooth.',
  'Interpret findings in the clinical context: the patient’s caries risk, new lesions since the last visit, sugar intake and fluoride exposure.',
  'Severity (ICDAS code) and activity are separate judgements: an ICDAS 2 lesion can be active or inactive, and so can an ICDAS 5 cavity.',
];

export const PRIMARY_VS_PERMANENT: { aspect: string; primary: string; permanent: string; implication: string }[] = [
  {
    aspect: 'Enamel and dentin',
    primary: 'Thinner, with lower mineral content',
    permanent: 'Thicker',
    implication: 'Lesions reach dentin and the pulp sooner in primary teeth.',
  },
  {
    aspect: 'Pulp',
    primary: 'Relatively large pulp chamber; prominent pulp horns (especially mesial) close to the surface',
    permanent: 'Relatively smaller; recedes with age',
    implication: 'Higher risk of pulp involvement in deep lesions and preparations.',
  },
  {
    aspect: 'Proximal contacts (molars)',
    primary: 'Broad, flat contact areas',
    permanent: 'Smaller, more rounded contact points',
    implication: 'Proximal lesions are hard to see; bitewing radiographs are important.',
  },
  {
    aspect: 'Lifespan',
    primary: 'Exfoliates; time to exfoliation varies by tooth',
    permanent: 'Must last for life',
    implication: 'Weigh the expected remaining lifespan in every management decision.',
  },
  {
    aspect: 'Management options',
    primary: 'Prevention, non-restorative cavity control, silver diamine fluoride, Hall technique, restorations, pulpotomy',
    permanent: 'Prevention, sealing, resin infiltration, selective removal and restoration, pulp-related care',
    implication: 'Several options arrest caries without removing tissue; cooperation and caregiver involvement matter.',
  },
];

export const PATHWAY_REFS = ['pitts2014', 'nyvad1999', 'fejerskov2015', 'innes2016', 'nelson2020', 'crystal2017', 'innes2007'];

/** Short definitions for tooltips. */
export const GLOSSARY: Record<string, { term: string; definition: string }> = {
  icdas: {
    term: 'ICDAS',
    definition: 'International Caries Detection and Assessment System: codes 0–6 describe the visual severity of a coronal lesion on a clean tooth, wet and dry.',
  },
  activity: {
    term: 'Lesion activity',
    definition: 'Whether a lesion is progressing (active) or arrested (inactive). Judged from texture, lustre, plaque stagnation and location, not colour alone.',
  },
  cavitation: {
    term: 'Cavitation',
    definition: 'Loss of surface integrity. A cavity into dentin usually cannot be kept free of biofilm by the patient.',
  },
  cleansable: {
    term: 'Cleansable cavity',
    definition: 'An open cavity the patient can reach and clean with a toothbrush, so the lesion can arrest without a restoration.',
  },
  selective: {
    term: 'Selective removal to soft dentin',
    definition: 'Remove carious tissue to hard dentin at the periphery for a seal, but leave soft dentin over the pulp to avoid exposure. For deep lesions in vital pulps.',
  },
  nonSelective: {
    term: 'Non-selective (complete) removal',
    definition: 'Removing all carious dentin down to hard dentin everywhere. In deep lesions it raises the risk of pulp exposure and is generally not recommended.',
  },
  stepwise: {
    term: 'Stepwise removal',
    definition: 'Two-stage removal: soft dentin is left at the first visit, the cavity sealed, and re-entered later to remove more.',
  },
  ncc: {
    term: 'Non-restorative cavity control',
    definition: 'Keeping a cavity open and cleansable (sometimes widening it slightly) so brushing with fluoride toothpaste arrests the lesion.',
  },
  sdf: {
    term: 'Silver diamine fluoride (SDF)',
    definition: 'A topical agent (38%) that can arrest cavitated lesions; arrested lesions stain black.',
  },
  hall: {
    term: 'Hall technique',
    definition: 'A preformed metal crown cemented over a carious primary molar without anaesthesia, preparation or caries removal, sealing the lesion.',
  },
  infiltration: {
    term: 'Resin infiltration',
    definition: 'A micro-invasive treatment: a low-viscosity resin fills the porous enamel of a non-cavitated lesion to arrest it, without drilling.',
  },
  rdt: {
    term: 'Remaining dentin thickness',
    definition:
      'The dentin left between the deepest point of a preparation and the pulp. In this simulator it is measured on the schematic model; the colour bands are illustrative, not clinical thresholds.',
  },
  risk: {
    term: 'Caries risk',
    definition: 'A patient-level judgement of the likelihood of new lesions or progression, from history, diet, fluoride, plaque, saliva and past caries.',
  },
};
