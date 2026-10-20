import type { Instrument, InstrumentId } from '../types';

const DRAFT = 'draft-needs-expert-review' as const;
const R = ['sturdevant2019', 'banerjee2015'];

const list: Instrument[] = [
  { id: 'mirror', name: 'Mouth mirror', category: 'diagnostic', motion: 'none', color: '#c9d2dc', description: 'Indirect vision, retraction and illumination.', use: 'Inspection and retraction.', refs: R, verification: DRAFT },
  { id: 'explorer', name: 'Explorer / ball-ended probe', category: 'diagnostic', motion: 'probe', color: '#b8c2cc', description: 'Used gently to assess surface texture and remove biofilm for visual inspection. A ball-ended (WHO-type) probe is preferred for caries assessment.', use: 'Gentle tactile assessment — never forceful probing into lesions.', refs: ['fejerskov2015', ...R], verification: DRAFT },
  { id: 'roundBur', name: 'Round bur (high speed)', category: 'rotary', motion: 'rotate', color: '#d9c27a', description: 'Spherical cutting head; useful for initial entry through enamel into the lesion.', use: 'Access through enamel.', refs: R, verification: DRAFT },
  { id: 'pearBur', name: 'Pear-shaped bur (high speed)', category: 'rotary', motion: 'rotate', color: '#d9c27a', description: 'Pear/inverted-cone profile producing rounded internal line angles; widely used for conservative preparations.', use: 'Access and outline for conservative and Class I/II preparations.', refs: R, verification: DRAFT },
  { id: 'fissureBur', name: 'Straight fissure bur (high speed)', category: 'rotary', motion: 'rotate', color: '#d9c27a', description: 'Cylindrical head producing straight walls; used for conventional outline form and proximal boxes.', use: 'Outline form, extending along grooves, proximal box.', refs: R, verification: DRAFT },
  { id: 'slowRoundBur', name: 'Round bur (low speed)', category: 'rotary', motion: 'rotate', color: '#a7b0b9', description: 'Large round steel or tungsten-carbide bur at low speed; offers tactile control when removing soft carious dentin.', use: 'Removal of carious dentin.', refs: R, verification: DRAFT },
  { id: 'spoonExcavator', name: 'Spoon excavator', category: 'hand', motion: 'scrape', color: '#b8c2cc', description: 'Hand instrument with a spoon-shaped blade for lifting soft carious dentin. Cannot cut sound enamel.', use: 'Selective removal of soft dentin, especially near the pulp.', refs: ['schwendicke2016', ...R], verification: DRAFT },
  { id: 'enamelHatchet', name: 'Enamel hatchet / gingival margin trimmer', category: 'hand', motion: 'scrape', color: '#b8c2cc', description: 'Hand cutting instruments for planing enamel walls and removing unsupported enamel at proximal margins.', use: 'Refining proximal walls and margins.', refs: R, verification: DRAFT },
  { id: 'matrixBand', name: 'Matrix band and wedge', category: 'restorative', motion: 'none', color: '#cfd5da', description: 'Provides a temporary proximal wall so the material can be shaped to a contact; the wedge seals the gingival margin and separates teeth slightly.', use: 'Class II restorations.', refs: R, verification: DRAFT },
  { id: 'etchSyringe', name: 'Phosphoric acid etchant', category: 'restorative', motion: 'apply', color: '#3b82f6', description: 'Gel (commonly 30–40% phosphoric acid) used in etch-and-rinse and selective-enamel-etch protocols.', use: 'Etching enamel (and dentin in etch-and-rinse).', refs: ['vanmeerbeek2020'], verification: DRAFT },
  { id: 'microbrush', name: 'Microbrush applicator', category: 'restorative', motion: 'apply', color: '#f97316', description: 'Applies primers, adhesives and conditioners.', use: 'Adhesive and conditioner application.', refs: ['vanmeerbeek2020'], verification: DRAFT },
  { id: 'compositeInstrument', name: 'Composite placement instrument', category: 'restorative', motion: 'apply', color: '#94a3b8', description: 'Non-stick plastic or coated instrument for placing and sculpting composite increments.', use: 'Placement and shaping.', refs: R, verification: DRAFT },
  { id: 'curingLight', name: 'LED light-curing unit', category: 'device', motion: 'cure', color: '#2563eb', description: 'Emits blue light to activate photoinitiators. Output, tip distance and exposure time affect the degree of cure.', use: 'Polymerising composite, resin adhesives and RMGIC.', refs: ['ferracane2011', 'craig2019'], verification: DRAFT },
  { id: 'capsuleApplier', name: 'Capsule applier', category: 'restorative', motion: 'apply', color: '#e2e8f0', description: 'Extrudes encapsulated GIC/RMGIC directly into the preparation after activation and mixing.', use: 'Placement of encapsulated cements.', refs: ['sidhu2016'], verification: DRAFT },
  { id: 'amalgamCarrier', name: 'Amalgam carrier', category: 'restorative', motion: 'apply', color: '#cbd5e1', description: 'Carries triturated amalgam to the preparation.', use: 'Amalgam delivery.', refs: ['craig2019'], verification: DRAFT },
  { id: 'condenser', name: 'Amalgam condenser', category: 'restorative', motion: 'condense', color: '#94a3b8', description: 'Flat-ended instrument for compacting amalgam increments against walls and floor.', use: 'Condensation.', refs: ['craig2019', 'sturdevant2019'], verification: DRAFT },
  { id: 'carver', name: 'Carver / burnisher', category: 'restorative', motion: 'scrape', color: '#94a3b8', description: 'Shapes anatomy and smooths the surface of amalgam before it sets.', use: 'Carving and burnishing.', refs: ['sturdevant2019'], verification: DRAFT },
  { id: 'finishingBur', name: 'Finishing bur', category: 'rotary', motion: 'rotate', color: '#e5e7eb', description: 'Fine-fluted carbide or fine diamond for contouring and removing excess.', use: 'Finishing.', refs: R, verification: DRAFT },
  { id: 'polishingDisc', name: 'Polishing system', category: 'rotary', motion: 'rotate', color: '#fbbf24', description: 'Abrasive cups, points or discs used in sequence to smooth the surface.', use: 'Polishing.', refs: R, verification: DRAFT },
];

export const INSTRUMENTS: Record<InstrumentId, Instrument> = Object.fromEntries(list.map((i) => [i.id, i])) as Record<
  InstrumentId,
  Instrument
>;
